/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HAFloor,
  HALabel,
  HAState,
  HAConnectionStatus,
  HANativePersistentNotification,
  HANativeRepairIssue
} from '../types';
import { MOCK_AREAS, MOCK_DEVICES, MOCK_ENTITY_REGISTRY, MOCK_FLOORS, MOCK_STATES } from '../data/mockRegistries';

export type { HAConnectionStatus };

export interface HAWebSocketCallbacks {
  onStatusChange: (status: HAConnectionStatus, errorMsg?: string) => void;
  onRegistriesLoaded: (payload: {
    areas: HAArea[];
    devices: HADevice[];
    entityRegistry: HAEntityRegistryEntry[];
    floors: HAFloor[];
    labels?: HALabel[];
    states: Record<string, HAState>;
    nativeNotifications?: HANativePersistentNotification[];
    nativeRepairs?: HANativeRepairIssue[];
  }) => void;
  onNativeNotificationsLoaded?: (notifications: HANativePersistentNotification[], repairs: HANativeRepairIssue[]) => void;
  onStateChanged: (entityId: string, newState: HAState) => void;
  onStatesBatchUpdated?: (statesList: HAState[]) => void;
  onLogMessage: (type: 'info' | 'service_call' | 'state_changed' | 'warning' | 'error', msg: string, details?: any) => void;
}



export function normalizeHAWebSocketUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Auto-convert HTTP(S) to WS(S)
  if (url.startsWith('http://')) {
    url = 'ws://' + url.slice(7);
  } else if (url.startsWith('https://')) {
    url = 'wss://' + url.slice(8);
  } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    url = 'ws://' + url;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure /api/websocket suffix
  if (!url.endsWith('/api/websocket')) {
    url = url + '/api/websocket';
  }

  return url;
}

class HAWebSocketClient {
  private socket: WebSocket | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();
  private callbacks: HAWebSocketCallbacks | null = null;
  private status: HAConnectionStatus = 'disconnected';
  private currentUrl = '';
  private currentToken = '';
  private isDemoMode = true;
  private isExplicitDisconnect = false;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;

  public init(callbacks: HAWebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public setDemoMode(demo: boolean) {
    this.isDemoMode = demo;
    if (demo) {
      this.disconnect();
      this.loadDemoRegistries();
    }
  }

  public getStatus(): HAConnectionStatus {
    return this.status;
  }

  public isDemo(): boolean {
    return this.isDemoMode;
  }

  public loadDemoRegistries() {
    this.status = 'connected';
    this.callbacks?.onStatusChange('connected');
    this.callbacks?.onLogMessage('info', 'Loaded Home Assistant Registries from Auto-Layout Graph Ingestion Engine (Demo/Simulated Mode)');
    this.callbacks?.onRegistriesLoaded({
      areas: [...MOCK_AREAS],
      devices: [...MOCK_DEVICES],
      entityRegistry: [...MOCK_ENTITY_REGISTRY],
      floors: [...MOCK_FLOORS],
      states: { ...MOCK_STATES },
      nativeNotifications: [
        {
          notification_id: 'apple_tv_disc_1',
          title: 'New Device Discovered',
          message: 'Apple TV 4K in Living Room has been discovered and is ready for 1-tap HomeKit integration.',
          created_at: '2026-08-27T10:15:00Z',
          status: 'unread'
        },
        {
          notification_id: 'backup_ok_1',
          title: 'Automated Snapshot Backup',
          message: 'Nightly cloud backup completed successfully (1.42 GB encrypted archive stored).',
          created_at: '2026-08-27T04:00:00Z',
          status: 'unread'
        }
      ],
      nativeRepairs: [
        {
          issue_id: 'restart_required_core_update',
          domain: 'homeassistant',
          title: 'Restart Required',
          message: 'A system restart is required to finish installing Home Assistant Core 2026.8.4 update.',
          severity: 'warning',
          learn_more_url: 'https://www.home-assistant.io/latest-blogs/',
          is_fixable: true
        },
        {
          issue_id: 'mqtt_yaml_dep_1',
          domain: 'mqtt',
          title: 'Legacy MQTT YAML Config Detected',
          message: 'Legacy YAML configuration for MQTT sensors is deprecated. Please migrate to UI config flow.',
          severity: 'warning',
          learn_more_url: 'https://www.home-assistant.io/integrations/mqtt/',
          is_fixable: true
        }
      ]
    });

  }

  private scheduleReconnect() {
    if (this.isDemoMode || this.isExplicitDisconnect || !this.currentUrl || !this.currentToken) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts++;
    const delay = Math.min(30000, 2000 * Math.pow(1.4, Math.min(this.reconnectAttempts, 8))) + Math.floor(Math.random() * 1000);
    this.callbacks?.onLogMessage('warning', `Live connection dropped. Auto-reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isDemoMode && !this.isExplicitDisconnect) {
        this.connect(this.currentUrl, this.currentToken);
      }
    }, delay);
  }

  public connect(url: string, token: string) {
    if (this.isDemoMode) {
      this.loadDemoRegistries();
      return;
    }

    const normalizedUrl = normalizeHAWebSocketUrl(url);
    this.currentUrl = normalizedUrl;
    this.currentToken = token;
    this.isExplicitDisconnect = false;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.status = 'connecting';
    this.callbacks?.onStatusChange('connecting');
    this.callbacks?.onLogMessage('info', `Connecting to WebSocket: ${normalizedUrl}`);

    try {
      this.socket = new WebSocket(normalizedUrl);

      this.socket.onopen = () => {
        this.callbacks?.onLogMessage('info', 'WebSocket TCP connection opened. Awaiting auth challenge...');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e: any) {
          this.callbacks?.onLogMessage('error', `Failed to parse WS frame: ${e.message}`);
        }
      };

      this.socket.onerror = (err) => {
        this.status = 'error';
        this.callbacks?.onStatusChange('error', 'WebSocket connection error');
        this.callbacks?.onLogMessage('error', 'WebSocket connection error occurred', err);
      };

      this.socket.onclose = () => {
        if (this.status !== 'disconnected') {
          this.status = 'disconnected';
          this.callbacks?.onStatusChange('disconnected');
          this.callbacks?.onLogMessage('warning', 'WebSocket connection closed');
          if (!this.isExplicitDisconnect) {
            this.scheduleReconnect();
          }
        }
      };
    } catch (err: any) {
      this.status = 'error';
      this.callbacks?.onStatusChange('error', err.message);
      this.callbacks?.onLogMessage('error', `Failed to initialize WebSocket: ${err.message}`);
      if (!this.isExplicitDisconnect) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.status = 'disconnected';
    this.callbacks?.onStatusChange('disconnected');
  }

  private handleIncomingMessage(msg: any) {
    if (msg.type === 'auth_required') {
      this.callbacks?.onLogMessage('info', 'Received auth_required challenge. Sending bearer token...');
      this.socket?.send(JSON.stringify({
        type: 'auth',
        access_token: this.currentToken
      }));
      return;
    }

    if (msg.type === 'auth_ok') {
      this.status = 'connected';
      this.reconnectAttempts = 0;
      this.callbacks?.onStatusChange('connected');
      this.callbacks?.onLogMessage('info', `Authentication successful! Home Assistant version: ${msg.ha_version || '2026.x'}`);
      this.fetchAllRegistries();
      return;
    }

    if (msg.type === 'auth_invalid') {
      this.status = 'auth_failed';
      this.isExplicitDisconnect = true;
      this.callbacks?.onStatusChange('auth_failed', msg.message || 'Invalid Access Token');
      this.callbacks?.onLogMessage('error', `Authentication failed: ${msg.message}`);
      return;
    }


    if (msg.type === 'result') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.success) {
          pending.resolve(msg.result);
        } else {
          pending.reject(msg.error);
        }
      }
      return;
    }

    if (msg.type === 'event') {
      const data = msg.event?.data || msg.data;
      const entityId = data?.entity_id || msg.event?.entity_id;
      const newState = data?.new_state || data?.state || msg.event?.new_state;

      if (entityId && newState) {
        this.callbacks?.onStateChanged(entityId, newState);
        this.callbacks?.onLogMessage('state_changed', `State updated: ${entityId} -> ${newState.state}`, newState.attributes);
      }
    }
  }

  private pollTimer: any = null;
  private visibilityHandler: (() => void) | null = null;

  private startStatePolling() {
    this.stopStatePolling();
    this.pollTimer = setInterval(() => {
      this.refreshStates();
    }, 20000);

    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          this.refreshStates();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  private stopStatePolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  public async refreshStates(): Promise<void> {
    if (this.isDemoMode || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      const [statesList, nativeNotifications, repairsRes] = await Promise.all([
        this.sendRequest<HAState[]>('get_states').catch(() => []),
        this.sendRequest<HANativePersistentNotification[]>('persistent_notification/get').catch(() => []),
        this.sendRequest<{ issues?: HANativeRepairIssue[] }>('repairs/list_issues').catch(() => ({ issues: [] }))
      ]);

      if (Array.isArray(statesList) && statesList.length > 0) {
        if (this.callbacks?.onStatesBatchUpdated) {
          this.callbacks.onStatesBatchUpdated(statesList);
        } else {
          for (const s of statesList) {
            if (s?.entity_id) {
              this.callbacks?.onStateChanged(s.entity_id, s);
            }
          }
        }
      }

      if (this.callbacks?.onNativeNotificationsLoaded) {
        this.callbacks.onNativeNotificationsLoaded(
          Array.isArray(nativeNotifications) ? nativeNotifications : [],
          Array.isArray(repairsRes?.issues) ? repairsRes.issues : []
        );
      }
    } catch {
      // ignore
    }
  }


  private async fetchAllRegistries() {
    try {
      this.callbacks?.onLogMessage('info', 'Querying Home Assistant Area, Device, Entity, Floor, Label registries, native persistent notifications, and repairs...');
      
      const [areas, devices, entityRegistry, floors, labels, statesList, nativeNotifications, repairsRes] = await Promise.all([
        this.sendRequest<HAArea[]>('config/area_registry/list').catch(() => []),
        this.sendRequest<HADevice[]>('config/device_registry/list').catch(() => []),
        this.sendRequest<HAEntityRegistryEntry[]>('config/entity_registry/list').catch(() => []),
        this.sendRequest<HAFloor[]>('config/floor_registry/list').catch(() => []),
        this.sendRequest<HALabel[]>('config/label_registry/list').catch(() => []),
        this.sendRequest<HAState[]>('get_states').catch(() => []),
        this.sendRequest<HANativePersistentNotification[]>('persistent_notification/get').catch(() => []),
        this.sendRequest<{ issues?: HANativeRepairIssue[] }>('repairs/list_issues').catch(() => ({ issues: [] }))
      ]);

      const statesMap: Record<string, HAState> = {};
      for (const s of statesList) {
        statesMap[s.entity_id] = s;
      }

      const nativeRepairs = Array.isArray(repairsRes?.issues) ? repairsRes.issues : [];

      this.callbacks?.onRegistriesLoaded({
        areas,
        devices,
        entityRegistry,
        floors,
        labels,
        states: statesMap,
        nativeNotifications: Array.isArray(nativeNotifications) ? nativeNotifications : [],
        nativeRepairs
      });

      // Subscribe to live events
      this.sendRequest('subscribe_events', { event_type: 'state_changed' });
      this.startStatePolling();

      // Ingest live forecasts for weather entities
      const weatherEntities = statesList.filter(s => s?.entity_id?.startsWith('weather.'));
      for (const w of weatherEntities) {
        this.fetchWeatherForecast(w.entity_id);
      }

      this.callbacks?.onLogMessage('info', `Ingested ${areas.length} areas, ${devices.length} devices, ${entityRegistry.length} entities, ${labels?.length || 0} labels, ${nativeNotifications?.length || 0} notifications, and ${statesList.length} live states.`);
    } catch (e: any) {
      this.callbacks?.onLogMessage('error', `Failed to fetch HA registries: ${e.message}`);
    }
  }


  public async fetchWeatherForecast(entityId: string): Promise<void> {
    if (this.isDemoMode || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      // 1. Try Home Assistant 2023.9+ get_forecasts service call
      const res = await this.sendRequest('call_service', {
        domain: 'weather',
        service: 'get_forecasts',
        service_data: { type: 'daily' },
        target: { entity_id: entityId },
        return_response: true
      });

      const forecastList = res?.response?.[entityId]?.forecast;
      if (Array.isArray(forecastList) && forecastList.length > 0) {
        const statesList = await this.sendRequest<HAState[]>('get_states').catch(() => []);
        const stateObj = Array.isArray(statesList) ? statesList.find(s => s?.entity_id === entityId) : null;
        if (stateObj) {
          this.callbacks?.onStateChanged(entityId, {
            ...stateObj,
            attributes: {
              ...stateObj.attributes,
              forecast: forecastList
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }

  public sendRequest<T = any>(type: string, extra: Record<string, any> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.isDemoMode) {
        // Handle mock responses in demo mode
        resolve(null as any);
        return;
      }

      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const id = this.messageId++;
      const payload = { id, type, ...extra };
      this.pendingRequests.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  public async callService(
    domain: string,
    service: string,
    serviceData: Record<string, any> = {},
    target: { entity_id?: string | string[]; area_id?: string | string[]; device_id?: string | string[] } = {}
  ): Promise<any> {
    this.callbacks?.onLogMessage('service_call', `call_service -> ${domain}.${service}`, { serviceData, target });

    if (this.isDemoMode) {
      // In demo mode, we simulate service call response immediately
      return Promise.resolve({ success: true });
    }

    return this.sendRequest('call_service', {
      domain,
      service,
      service_data: serviceData,
      target
    });
  }
}

export const haWebSocketService = new HAWebSocketClient();
