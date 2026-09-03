/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Resilient Remote Configuration Synchronization & SSE Stream Service
 * Features:
 *  - Dead connection detection with a 30s heartbeat watchdog
 *  - Exponential backoff reconnection (1s -> 2s -> 5s -> 10s -> max 30s)
 *  - Kiosk sleep recovery (reconciles on visibilitychange, online, focus)
 *  - Cross-tab BroadcastChannel and custom event dispatching
 */

import { getStoredHAAuth, getActiveHAToken } from './haAuth';
import { getStoredAuthConfig } from './authStorage';

export type SyncConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface ConfigSyncEventListener {
  onConfigChanged?: (data?: any) => void;
  onReconcileNeeded?: () => void;
  onStatusChanged?: (status: SyncConnectionState) => void;
}

const BACKOFF_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
const HEARTBEAT_TIMEOUT_MS = 30000;
const WATCHDOG_INTERVAL_MS = 5000;

class ConfigSyncService {
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<ConfigSyncEventListener> = new Set();

  private status: SyncConnectionState = 'disconnected';
  private retryCount = 0;
  private reconnectTimer: any = null;
  private watchdogTimer: any = null;
  private lastActivityTimestamp = 0;
  private isEnabled = false;

  constructor() {
    this.initLifecycleListeners();
    this.initBroadcastChannel();
  }

  /**
   * Initializes browser window lifecycle listeners for kiosk sleep recovery
   */
  private initLifecycleListeners() {
    if (typeof window === 'undefined') return;

    // 1. Tablet screen wake / tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleWakeOrOnline('visibilitychange');
      }
    });

    // 2. Network connection restored
    window.addEventListener('online', () => {
      this.handleWakeOrOnline('online');
    });

    // 3. Window focus
    window.addEventListener('focus', () => {
      this.handleWakeOrOnline('focus');
    });
  }

  /**
   * Handles tablet wake-up, screen unlock, or network recovery
   */
  private handleWakeOrOnline(reason: string) {
    if (!this.isEnabled) return;

    console.debug(`[ConfigSyncService] Lifecycle trigger (${reason}): reconciling state and verifying stream...`);

    // Notify listeners to immediately fetch latest authoritative config out-of-band
    this.notifyReconcileNeeded();

    // Check if the SSE connection is alive
    const now = Date.now();
    const isDead = now - this.lastActivityTimestamp > HEARTBEAT_TIMEOUT_MS;
    if (isDead || this.status === 'disconnected' || this.status === 'reconnecting') {
      this.reconnect(true);
    }
  }

  /**
   * Initializes cross-tab communication
   */
  private initBroadcastChannel() {
    if (typeof window === 'undefined') return;

    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('had_config_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'config_saved' || event.data?.type === 'config_updated') {
            this.notifyConfigChanged(event.data.config);
          }
        };
      }
    } catch (e) {
      console.warn('[ConfigSyncService] BroadcastChannel not available:', e);
    }
  }

  /**
   * Starts real-time synchronization
   */
  public start() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.retryCount = 0;
    this.connect();
    this.startWatchdog();
  }

  /**
   * Stops real-time synchronization
   */
  public stop() {
    this.isEnabled = false;
    this.stopWatchdog();
    this.clearReconnectTimer();
    this.closeEventSource();
    this.setStatus('disconnected');
  }

  /**
   * Opens the SSE EventSource connection
   */
  private connect() {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;
    if (!this.isEnabled) return;

    this.closeEventSource();
    this.setStatus(this.retryCount === 0 ? 'connecting' : 'reconnecting');

    try {
      const token = getActiveHAToken();
      const auth = getStoredHAAuth();
      const storedConfig = getStoredAuthConfig();
      const serverUrl = auth?.server_url || storedConfig?.httpUrl || storedConfig?.serverUrl;
      const params = new URLSearchParams();
      if (token) {
        params.set('token', token);
      }
      if (serverUrl) {
        params.set('haUrl', serverUrl);
      }

      const streamUrl = `/api/config/stream${params.toString() ? `?${params.toString()}` : ''}`;
      const es = new EventSource(streamUrl);
      this.eventSource = es;
      this.lastActivityTimestamp = Date.now();

      es.onopen = () => {
        this.retryCount = 0;
        this.lastActivityTimestamp = Date.now();
        this.setStatus('connected');
      };

      // Configuration update event
      es.addEventListener('config_updated', (event: MessageEvent) => {
        this.lastActivityTimestamp = Date.now();
        let payload: any = null;
        try {
          payload = event.data ? JSON.parse(event.data) : null;
        } catch {}
        this.notifyConfigChanged(payload);
      });

      // Server heartbeat ping event
      es.addEventListener('ping', () => {
        this.lastActivityTimestamp = Date.now();
      });

      // Generic message event
      es.onmessage = () => {
        this.lastActivityTimestamp = Date.now();
      };

      es.onerror = (err) => {
        console.warn('[ConfigSyncService] SSE stream error:', err);
        this.lastActivityTimestamp = 0;
        this.closeEventSource();
        this.scheduleReconnect();
      };
    } catch (err) {
      console.warn('[ConfigSyncService] Error initializing EventSource:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Heartbeat Watchdog: kills dead connections if no ping received within 30s
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (!this.isEnabled) return;

      const now = Date.now();
      if (this.status === 'connected' && this.lastActivityTimestamp > 0) {
        const elapsed = now - this.lastActivityTimestamp;
        if (elapsed > HEARTBEAT_TIMEOUT_MS) {
          console.warn(`[ConfigSyncService] Watchdog: No heartbeat received in ${Math.round(elapsed / 1000)}s. Resetting stream.`);
          this.reconnect(true);
        }
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Schedules reconnect with exponential backoff
   */
  private scheduleReconnect() {
    if (!this.isEnabled) return;
    this.clearReconnectTimer();

    const delayIndex = Math.min(this.retryCount, BACKOFF_DELAYS_MS.length - 1);
    const baseDelay = BACKOFF_DELAYS_MS[delayIndex];
    // Add ±20% jitter
    const jitter = baseDelay * (Math.random() * 0.4 - 0.2);
    const delay = Math.max(500, Math.round(baseDelay + jitter));

    this.retryCount++;
    this.setStatus('reconnecting');
    console.debug(`[ConfigSyncService] Scheduling reconnect in ${delay}ms (attempt #${this.retryCount})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Reconnects immediately
   */
  public reconnect(forceImmediate = false) {
    this.clearReconnectTimer();
    if (forceImmediate) {
      this.retryCount = 0;
    }
    this.connect();
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeEventSource() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
  }

  private setStatus(nextStatus: SyncConnectionState) {
    if (this.status !== nextStatus) {
      this.status = nextStatus;
      for (const listener of this.listeners) {
        listener.onStatusChanged?.(nextStatus);
      }
    }
  }

  public getStatus(): SyncConnectionState {
    return this.status;
  }

  public broadcastLocalChange(config: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'config_saved', config });
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('had_config_updated', { detail: config }));
    }
  }

  private notifyConfigChanged(data?: any) {
    for (const listener of this.listeners) {
      listener.onConfigChanged?.(data);
    }
  }

  private notifyReconcileNeeded() {
    for (const listener of this.listeners) {
      listener.onReconcileNeeded?.();
    }
  }

  public subscribe(listener: ConfigSyncEventListener): () => void {
    this.listeners.add(listener);
    listener.onStatusChanged?.(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const configSyncService = new ConfigSyncService();
