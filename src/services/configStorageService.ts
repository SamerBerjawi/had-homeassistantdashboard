/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unified Pluggable Configuration & Asset Storage Driver Service
 * Automatically switches between Remote (HA WebSocket + NAS REST) and LocalStorage (Browser Demo / Dev)
 */

import {
  UserDashboardConfig,
  IConfigStorageDriver,
  StorageDriverType,
  DEFAULT_USER_CONFIG
} from '../types/userConfig';
import { AuthState } from '../types/auth';
import { haWebSocketService } from './haWebSocket';

const STORAGE_KEY_CONFIG = 'had_dashboard_config';
const HA_USER_DATA_KEY = 'had_dashboard_config';

/**
 * Deep merge utility for configuration objects
 */
export function mergeConfig(
  base: UserDashboardConfig,
  partial?: Partial<UserDashboardConfig> | null
): UserDashboardConfig {
  if (!partial) return { ...base };

  return {
    ...base,
    ...partial,
    version: partial.version || base.version,
    updatedAt: partial.updatedAt || new Date().toISOString(),
    theme: {
      ...base.theme,
      ...(partial.theme || {})
    },
    mobility: {
      car: {
        ...base.mobility.car,
        ...(partial.mobility?.car || {})
      },
      bike: {
        ...base.mobility.bike,
        ...(partial.mobility?.bike || {})
      }
    },
    rooms: {
      hiddenAreas: Array.isArray(partial.rooms?.hiddenAreas)
        ? partial.rooms.hiddenAreas
        : base.rooms.hiddenAreas,
      favoriteAreas: Array.isArray(partial.rooms?.favoriteAreas)
        ? partial.rooms.favoriteAreas
        : base.rooms.favoriteAreas,
      areaSortOrder: Array.isArray(partial.rooms?.areaSortOrder)
        ? partial.rooms.areaSortOrder
        : base.rooms.areaSortOrder
    },
    network: {
      ...base.network,
      ...(partial.network || {})
    },
    energy: {
      ...base.energy,
      ...(partial.energy || {})
    }
  };
}

/**
 * Helper to read a File as a base64 DataURL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * 1. Local Storage Driver
 * Used for Demo Mode and Isolated Development Sandbox
 */
export class LocalStorageDriver implements IConfigStorageDriver {
  public async loadConfig(): Promise<UserDashboardConfig> {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_USER_CONFIG };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        return mergeConfig(DEFAULT_USER_CONFIG, parsed);
      }
    } catch (err) {
      console.warn('[LocalStorageDriver] Failed to parse stored config; resetting to defaults:', err);
    }

    // Save default if not present
    this.saveConfig(DEFAULT_USER_CONFIG).catch(() => {});
    return { ...DEFAULT_USER_CONFIG };
  }

  public async saveConfig(partial: Partial<UserDashboardConfig>): Promise<UserDashboardConfig> {
    if (typeof window === 'undefined') {
      return mergeConfig(DEFAULT_USER_CONFIG, partial);
    }

    const current = await this.loadConfig();
    const updated = mergeConfig(current, {
      ...partial,
      updatedAt: new Date().toISOString()
    });

    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } catch (err) {
      console.error('[LocalStorageDriver] Failed to save config to localStorage:', err);
    }

    return updated;
  }

  public async uploadAsset(file: File, key: string): Promise<string> {
    const dataUrl = await readFileAsDataUrl(file);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`had_asset_${key}`, dataUrl);
      } catch (e) {
        console.warn('[LocalStorageDriver] Could not cache asset in localStorage:', e);
      }
    }
    return dataUrl;
  }
}

/**
 * 2. Remote Storage Driver
 * Used for Production / Authenticated Live Sessions (Home Assistant WebSocket & NAS REST backend)
 */
export class RemoteStorageDriver implements IConfigStorageDriver {
  private localFallback = new LocalStorageDriver();

  public async loadConfig(): Promise<UserDashboardConfig> {
    let haConfig: any = null;
    let nasConfig: any = null;

    // 1. Try Home Assistant WebSocket user data storage
    if (!haWebSocketService.isDemo()) {
      if (haWebSocketService.getStatus() !== 'connected') {
        // Wait up to 4s for socket authentication if currently connecting
        await haWebSocketService.waitForConnection(4000);
      }

      if (haWebSocketService.getStatus() === 'connected') {
        try {
          const res = await haWebSocketService.sendRequest<any>('frontend/get_user_data', {
            key: HA_USER_DATA_KEY
          });
          if (res && res.value !== undefined && res.value !== null) {
            haConfig = typeof res.value === 'string' ? JSON.parse(res.value) : res.value;
          }
        } catch (wsErr) {
          console.warn('[RemoteStorageDriver] HA WebSocket frontend/get_user_data notice:', wsErr);
        }
      }
    }

    // 2. Try NAS REST backend (/api/config)
    if (typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/config', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.config) {
            nasConfig = data.config;
          }
        }
      } catch {
        // NAS REST offline or not reachable
      }
    }

    // Choose the freshest config between HA WebSocket and NAS REST
    let bestRemote = haConfig;
    if (nasConfig && typeof nasConfig === 'object') {
      if (!bestRemote || (nasConfig.updatedAt && (!bestRemote.updatedAt || nasConfig.updatedAt >= bestRemote.updatedAt))) {
        bestRemote = nasConfig;
      }
    }

    // 3. If remote found, merge and cache in local storage as reliable backup
    if (bestRemote && typeof bestRemote === 'object') {
      const merged = mergeConfig(DEFAULT_USER_CONFIG, bestRemote);
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
      } catch {}
      return merged;
    }

    // 4. Fallback to cached local copy so offline/bootstrapping always works
    return this.localFallback.loadConfig();
  }

  public async saveConfig(partial: Partial<UserDashboardConfig>): Promise<UserDashboardConfig> {
    const current = await this.loadConfig();
    const updated = mergeConfig(current, {
      ...partial,
      updatedAt: new Date().toISOString()
    });

    // 1. Persist to Home Assistant WebSocket user storage
    if (!haWebSocketService.isDemo()) {
      if (haWebSocketService.getStatus() !== 'connected') {
        await haWebSocketService.waitForConnection(3000);
      }

      if (haWebSocketService.getStatus() === 'connected') {
        try {
          await haWebSocketService.sendRequest('frontend/set_user_data', {
            key: HA_USER_DATA_KEY,
            value: updated
          });
        } catch (wsErr) {
          console.warn('[RemoteStorageDriver] Could not save config via HA WebSocket user_data:', wsErr);
        }
      }
    }

    // 2. Persist to NAS REST backend (/api/config)
    if (typeof fetch !== 'undefined') {
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
          signal: AbortSignal.timeout(4000)
        });
      } catch (restErr) {
        console.warn('[RemoteStorageDriver] Could not save config to /api/config:', restErr);
      }
    }

    // 3. Always keep local backup up to date
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } catch {}

    // 4. Dispatch cross-tab sync message
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('had_config_channel');
          bc.postMessage({ type: 'config_saved', config: updated });
          bc.close();
        }
        window.dispatchEvent(new CustomEvent('had_config_updated', { detail: updated }));
      } catch {}
    }

    return updated;
  }

  public async uploadAsset(file: File, key: string): Promise<string> {
    const dataUrl = await readFileAsDataUrl(file);

    // Try posting to NAS persistent volume storage (/api/assets)
    if (typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            key,
            filename: file.name
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (response.ok) {
          const res = await response.json();
          if (res && res.success && res.url) {
            return res.url;
          }
        }
      } catch (err) {
        console.warn('[RemoteStorageDriver] Asset upload to /api/assets failed; falling back to local base64:', err);
      }
    }

    // Fallback: return encoded base64 string
    return dataUrl;
  }
}

/**
 * Driver Factory: instantiates appropriate driver based on environment and auth state
 */
export function createConfigStorageDriver(
  auth: AuthState,
  isProduction: boolean
): {
  driver: IConfigStorageDriver;
  driverType: StorageDriverType;
  driverName: string;
} {
  // If user is authenticated and live, prioritize remote storage
  if (auth.isAuthenticated && !auth.isDemo) {
    return {
      driver: new RemoteStorageDriver(),
      driverType: 'remote_ha',
      driverName: 'Home Assistant & NAS Storage'
    };
  }

  // Otherwise in Demo mode or Development
  return {
    driver: new LocalStorageDriver(),
    driverType: 'local_storage',
    driverName: 'Isolated LocalStorage'
  };
}
