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
import { getStoredHAAuth } from './haAuth';

const STORAGE_KEY_CONFIG = 'had_dashboard_config';
const STORAGE_KEY_SERVER_VERSION = 'had_last_server_version';
const HA_USER_DATA_KEY = 'had_dashboard_config';

/**
 * Build Authorization headers for NAS REST requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (typeof window !== 'undefined') {
    const auth = getStoredHAAuth();
    if (auth?.access_token) {
      headers['Authorization'] = `Bearer ${auth.access_token}`;
    }
    if (auth?.server_url) {
      headers['X-HA-URL'] = auth.server_url;
    }
  }
  return headers;
}

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
        ? [...partial.rooms.hiddenAreas]
        : base.rooms.hiddenAreas,
      favoriteAreas: Array.isArray(partial.rooms?.favoriteAreas)
        ? [...partial.rooms.favoriteAreas]
        : base.rooms.favoriteAreas,
      areaSortOrder: Array.isArray(partial.rooms?.areaSortOrder)
        ? [...partial.rooms.areaSortOrder]
        : base.rooms.areaSortOrder
    },
    network: {
      ...base.network,
      ...(partial.network || {})
    },
    energy: {
      ...base.energy,
      ...(partial.energy || {})
    },
    preferences: {
      ...(base.preferences || {}),
      ...(partial.preferences || {})
    },
    profile: {
      ...(base.profile || {}),
      ...(partial.profile || {})
    },
    areas: {
      ...(base.areas || {}),
      ...(partial.areas || {})
    },
    floors: {
      ...(base.floors || {}),
      ...(partial.floors || {})
    },
    entities: {
      ...(base.entities || {}),
      ...(partial.entities || {})
    },
    canvas: {
      ...(base.canvas || {}),
      ...(partial.canvas || {})
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
 * Used for Zero-Setup Demo Mode and Local Sandbox Isolation
 */
export class LocalStorageDriver implements IConfigStorageDriver {
  public async loadConfig(): Promise<UserDashboardConfig> {
    if (typeof window === 'undefined') return DEFAULT_USER_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (!raw) return DEFAULT_USER_CONFIG;
      const parsed = JSON.parse(raw);
      return mergeConfig(DEFAULT_USER_CONFIG, parsed);
    } catch {
      return DEFAULT_USER_CONFIG;
    }
  }

  public async saveConfig(partial: Partial<UserDashboardConfig>): Promise<UserDashboardConfig> {
    const current = await this.loadConfig();
    const updated = mergeConfig(current, {
      ...partial,
      updatedAt: new Date().toISOString()
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('had_config_updated', { detail: updated }));
      } catch {}
    }
    return updated;
  }

  public async uploadAsset(fileOrDataUrl: File | string): Promise<string> {
    if (typeof fileOrDataUrl === 'string') {
      return fileOrDataUrl;
    }
    return readFileAsDataUrl(fileOrDataUrl);
  }
}

/**
 * 2. Remote Storage Driver
 * Used for Production / Authenticated Live Sessions (Home Assistant WebSocket & NAS REST backend)
 */
export class RemoteStorageDriver implements IConfigStorageDriver {
  private localFallback = new LocalStorageDriver();
  private lastKnownServerVersion: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVer = localStorage.getItem(STORAGE_KEY_SERVER_VERSION);
        if (savedVer) {
          this.lastKnownServerVersion = Number(savedVer);
        }
      } catch {}
    }
  }

  public async loadConfig(): Promise<UserDashboardConfig> {
    let haConfig: any = null;
    let nasConfig: any = null;
    let nasServerVersion: number | undefined = undefined;

    // Concurrently query NAS REST backend and Home Assistant WebSocket storage
    const nasFetchPromise = (async () => {
      if (typeof fetch !== 'undefined') {
        try {
          const response = await fetch('/api/config', {
            method: 'GET',
            headers: getAuthHeaders(),
            signal: AbortSignal.timeout(2500)
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.success && data.config) {
              return {
                config: data.config,
                serverVersion: data.serverVersion !== undefined ? Number(data.serverVersion) : undefined
              };
            }
          }
        } catch {
          // NAS REST offline or not reachable
        }
      }
      return null;
    })();

    const haFetchPromise = (async () => {
      if (!haWebSocketService.isDemo()) {
        if (haWebSocketService.getStatus() !== 'connected') {
          // Wait briefly (up to 1.5s) for socket authentication if currently connecting
          await haWebSocketService.waitForConnection(1500);
        }

        if (haWebSocketService.getStatus() === 'connected') {
          try {
            const res = await haWebSocketService.sendRequest<any>('frontend/get_user_data', {
              key: HA_USER_DATA_KEY
            });
            if (res && res.value !== undefined && res.value !== null) {
              return typeof res.value === 'string' ? JSON.parse(res.value) : res.value;
            }
          } catch (wsErr) {
            console.warn('[RemoteStorageDriver] HA WebSocket frontend/get_user_data notice:', wsErr);
          }
        }
      }
      return null;
    })();

    const [nasResult, haResult] = await Promise.all([nasFetchPromise, haFetchPromise]);

    if (nasResult) {
      nasConfig = nasResult.config;
      nasServerVersion = nasResult.serverVersion;
      if (nasServerVersion !== undefined) {
        this.lastKnownServerVersion = nasServerVersion;
        try {
          localStorage.setItem(STORAGE_KEY_SERVER_VERSION, String(nasServerVersion));
        } catch {}
      }
    }

    if (haResult) {
      haConfig = haResult;
    }

    // Authoritative Versioning: Prefer NAS config if it carries a serverVersion
    let bestRemote = haConfig;
    if (nasConfig && typeof nasConfig === 'object') {
      if (nasServerVersion !== undefined) {
        // NAS has authoritative server-assigned version
        bestRemote = nasConfig;
      } else if (!bestRemote || (nasConfig.updatedAt && (!bestRemote.updatedAt || nasConfig.updatedAt >= bestRemote.updatedAt))) {
        // Fallback to timestamp comparison if neither has serverVersion
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
    let updated = mergeConfig(current, {
      ...partial,
      updatedAt: new Date().toISOString()
    });

    // 1. Persist to NAS REST backend (/api/config) with optimistic concurrency version check
    if (typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            config: updated,
            expectedVersion: this.lastKnownServerVersion ?? undefined
          }),
          signal: AbortSignal.timeout(4000)
        });

        if (response.status === 200) {
          const resData = await response.json();
          if (resData && resData.serverVersion !== undefined) {
            this.lastKnownServerVersion = Number(resData.serverVersion);
            try {
              localStorage.setItem(STORAGE_KEY_SERVER_VERSION, String(this.lastKnownServerVersion));
            } catch {}
          }
        } else if (response.status === 409) {
          // Conflict detected! Another device saved in between
          const errData = await response.json();
          const serverVersion = Number(errData.serverVersion) || 1;
          const serverConfig = errData.config || current;

          console.warn(
            `[RemoteStorageDriver] Conflict detected (expected v${this.lastKnownServerVersion}, server is v${serverVersion}). Merging changes and retrying once...`
          );

          // Re-apply client's pending partial changes on top of fresh server config
          const reMerged = mergeConfig(serverConfig, {
            ...partial,
            updatedAt: new Date().toISOString()
          });

          // Retry once with the latest known server version
          try {
            const retryRes = await fetch('/api/config', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                config: reMerged,
                expectedVersion: serverVersion
              }),
              signal: AbortSignal.timeout(4000)
            });

            if (retryRes.status === 200) {
              const retryData = await retryRes.json();
              if (retryData && retryData.serverVersion !== undefined) {
                this.lastKnownServerVersion = Number(retryData.serverVersion);
                try {
                  localStorage.setItem(STORAGE_KEY_SERVER_VERSION, String(this.lastKnownServerVersion));
                } catch {}
              }
              updated = reMerged;
            } else {
              console.warn(
                '[RemoteStorageDriver] Retry save also encountered a conflict. Accepting server configuration to prevent infinite loop.'
              );
              this.lastKnownServerVersion = serverVersion;
              try {
                localStorage.setItem(STORAGE_KEY_SERVER_VERSION, String(serverVersion));
              } catch {}
              updated = serverConfig;
            }
          } catch (retryErr) {
            console.warn('[RemoteStorageDriver] Retry request failed:', retryErr);
            updated = reMerged;
          }
        }
      } catch (restErr) {
        console.warn('[RemoteStorageDriver] Could not save config to /api/config:', restErr);
      }
    }

    // 2. Persist to Home Assistant WebSocket user storage
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

  public async uploadAsset(fileOrDataUrl: File | string, key: string): Promise<string> {
    const dataUrl = typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await readFileAsDataUrl(fileOrDataUrl);
    const filename = typeof fileOrDataUrl === 'object' && 'name' in fileOrDataUrl ? fileOrDataUrl.name : `${key}.png`;

    // Try posting to NAS persistent volume storage (/api/assets)
    if (typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            dataUrl,
            key,
            filename
          }),
          signal: AbortSignal.timeout(12000)
        });

        if (response.ok) {
          const res = await response.json();
          if (res && res.success && res.url) {
            return res.url;
          }
        } else {
          console.warn('[RemoteStorageDriver] /api/assets responded with status:', response.status);
        }
      } catch (err) {
        console.warn('[RemoteStorageDriver] Asset upload to /api/assets failed; falling back to dataUrl:', err);
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
