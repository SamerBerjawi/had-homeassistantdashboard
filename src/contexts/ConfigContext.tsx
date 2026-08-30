/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Reactive Dashboard Configuration Context Provider
 * Wires to active AuthState and persists remotely (HA/NAS) or locally (LocalStorage)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserDashboardConfig, 
  ConfigContextType, 
  StorageDriverType, 
  DEFAULT_USER_CONFIG,
  IConfigStorageDriver 
} from '../types/userConfig';
import { 
  createConfigStorageDriver, 
  mergeConfig, 
  LocalStorageDriver 
} from '../services/configStorageService';
import { useAuth } from './AuthContext';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState, isInitializing } = useAuth();
  const isProduction = process.env.NODE_ENV === 'production';

  const [config, setConfig] = useState<UserDashboardConfig>(DEFAULT_USER_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [driverType, setDriverType] = useState<StorageDriverType>('local_storage');
  const [driverName, setDriverName] = useState<string>('Isolated LocalStorage');

  const activeDriverRef = useRef<IConfigStorageDriver>(new LocalStorageDriver());
  const pendingSaveTimeoutRef = useRef<any>(null);

  // Initialize and load configuration when AuthState changes or initializes
  useEffect(() => {
    if (isInitializing) return;

    let isMounted = true;
    const { driver, driverType: dtype, driverName: dname } = createConfigStorageDriver(authState, isProduction);
    activeDriverRef.current = driver;
    setDriverType(dtype);
    setDriverName(dname);

    const applyToSubsystems = (nextConfig: UserDashboardConfig) => {
      try {
        useAutoLayoutStore.getState().applyConfigCustomizations(nextConfig);
      } catch {}
    };

    const loadData = async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const loaded = await driver.loadConfig();
        if (isMounted && loaded) {
          setConfig(loaded);
          setLastSaved(loaded.updatedAt);
          applyToSubsystems(loaded);
        }
      } catch (err) {
        console.error('[ConfigProvider] Error loading user configuration:', err);
      } finally {
        if (isMounted && !silent) {
          setIsLoading(false);
        }
      }
    };

    // Initial load
    loadData();

    // 1. Re-sync when WebSocket connection status transitions to 'connected'
    const handleConnectionStatus = (e: any) => {
      if (e?.detail?.status === 'connected') {
        loadData(true);
      }
    };
    window.addEventListener('ha_connection_status' as any, handleConnectionStatus);

    // 2. Re-sync on window focus / visibility change (e.g. tablet screen on / tab switched)
    const handleFocus = () => {
      if (document.visibilityState === 'visible' && authState.isAuthenticated && !authState.isDemo) {
        loadData(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Listen to local/cross-tab broadcast updates
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('had_config_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'config_saved' && event.data.config && isMounted) {
          setConfig(event.data.config);
          setLastSaved(event.data.config.updatedAt);
          applyToSubsystems(event.data.config);
        }
      };
    }

    const handleLocalUpdated = (e: any) => {
      if (e?.detail && isMounted) {
        setConfig(e.detail);
        setLastSaved(e.detail.updatedAt);
        applyToSubsystems(e.detail);
      }
    };
    window.addEventListener('had_config_updated' as any, handleLocalUpdated);

    // 4. Background Polling Fallback Safety Net (every 20 seconds)
    // NOTE: Keep this fallback active as a resilience safety net in case the SSE push stream drops or is blocked by a proxy.
    const syncInterval = setInterval(() => {
      if (authState.isAuthenticated && !authState.isDemo && document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 20000);

    // 5. Real-Time Push Stream (SSE) for instant cross-device synchronization (~1s)
    let eventSource: EventSource | null = null;
    if (typeof window !== 'undefined' && 'EventSource' in window && authState.isAuthenticated && !authState.isDemo) {
      try {
        const auth = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('had_ha_auth_tokens') || '{}') : {};
        const params = new URLSearchParams();
        if (auth?.access_token) {
          params.set('token', auth.access_token);
        }
        if (auth?.server_url) {
          params.set('haUrl', auth.server_url);
        }
        const streamUrl = `/api/config/stream${params.toString() ? `?${params.toString()}` : ''}`;
        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('config_updated', (event: MessageEvent) => {
          if (isMounted) {
            loadData(true);
          }
        });

        eventSource.onerror = (err) => {
          // EventSource automatically retries connection natively; log for observability
          console.warn('[ConfigProvider] Config push stream encountered an issue (native auto-reconnect active):', err);
        };
      } catch (err) {
        console.warn('[ConfigProvider] Could not initialize EventSource stream:', err);
      }
    }

    return () => {
      isMounted = false;
      window.removeEventListener('ha_connection_status' as any, handleConnectionStatus);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('had_config_updated' as any, handleLocalUpdated);
      if (bc) bc.close();
      if (eventSource) eventSource.close();
      clearInterval(syncInterval);
    };
  }, [authState, isInitializing, isProduction]);

  const pendingDeltaRef = useRef<Partial<UserDashboardConfig>>({});

  // Update Config (Debounced Remote Persistence)
  const updateConfig = useCallback(async (
    partialOrUpdater:
      | Partial<UserDashboardConfig>
      | ((prev: UserDashboardConfig) => Partial<UserDashboardConfig>)
  ): Promise<UserDashboardConfig> => {
    let nextPartial: Partial<UserDashboardConfig>;

    if (typeof partialOrUpdater === 'function') {
      nextPartial = partialOrUpdater(config);
    } else {
      nextPartial = partialOrUpdater;
    }

    const merged = mergeConfig(config, nextPartial);
    // Optimistic UI state update
    setConfig(merged);
    setIsSaving(true);

    // Accumulate granular delta for debounced save
    pendingDeltaRef.current = mergeConfig(pendingDeltaRef.current as any, nextPartial);

    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }

    return new Promise((resolve) => {
      pendingSaveTimeoutRef.current = setTimeout(async () => {
        const deltaToSave = { ...pendingDeltaRef.current };
        pendingDeltaRef.current = {};
        try {
          // Pass the true delta to saveConfig so conflict resolution merges field-by-field
          const saved = await activeDriverRef.current.saveConfig(deltaToSave);
          setLastSaved(saved.updatedAt);
          setIsSaving(false);
          resolve(saved);
        } catch (err) {
          console.error('[ConfigProvider] Failed to save config:', err);
          setIsSaving(false);
          resolve(merged);
        }
      }, 300);
    });
  }, [config]);

  // Upload Custom Vehicle PNGs or Brand Logos
  const uploadVehicleAsset = useCallback(async (file: File, key: string): Promise<string> => {
    setIsSaving(true);
    try {
      let assetUrl = '';
      if (activeDriverRef.current.uploadAsset) {
        assetUrl = await activeDriverRef.current.uploadAsset(file, key);
      } else {
        const reader = new FileReader();
        assetUrl = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
      }

      // Auto-save asset URL into configuration schema based on key
      if (key === 'car_image') {
        await updateConfig({ mobility: { ...config.mobility, car: { ...config.mobility.car, vehicleImageUrl: assetUrl } } });
      } else if (key === 'car_logo') {
        await updateConfig({ mobility: { ...config.mobility, car: { ...config.mobility.car, brandLogoUrl: assetUrl } } });
      } else if (key === 'bike_image') {
        await updateConfig({ mobility: { ...config.mobility, bike: { ...config.mobility.bike, bikeImageUrl: assetUrl } } });
      } else if (key === 'bike_logo') {
        await updateConfig({ mobility: { ...config.mobility, bike: { ...config.mobility.bike, brandLogoUrl: assetUrl } } });
      }

      setIsSaving(false);
      return assetUrl;
    } catch (err) {
      console.error('[ConfigProvider] Failed to upload vehicle asset:', err);
      setIsSaving(false);
      throw err;
    }
  }, [config, updateConfig]);

  // Reset to Default Configuration
  const resetConfig = useCallback(async (): Promise<UserDashboardConfig> => {
    setIsSaving(true);
    try {
      const reset = await activeDriverRef.current.saveConfig(DEFAULT_USER_CONFIG);
      setConfig(reset);
      setLastSaved(reset.updatedAt);
      setIsSaving(false);
      return reset;
    } catch (err) {
      console.error('[ConfigProvider] Reset failed:', err);
      setIsSaving(false);
      return DEFAULT_USER_CONFIG;
    }
  }, []);

  // Export JSON Backup
  const exportConfigJson = useCallback((): string => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  // Import JSON Backup
  const importConfigJson = useCallback(async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') return false;
      const merged = mergeConfig(DEFAULT_USER_CONFIG, parsed);
      await activeDriverRef.current.saveConfig(merged);
      setConfig(merged);
      setLastSaved(merged.updatedAt);
      return true;
    } catch (err) {
      console.error('[ConfigProvider] Import JSON failed:', err);
      return false;
    }
  }, []);

  const isSyncingRemote = driverType === 'remote_ha' || driverType === 'remote_nas';

  const contextValue: ConfigContextType = {
    config,
    isLoading,
    isSaving,
    lastSaved,
    driverType,
    driverName,
    isSyncingRemote,
    updateConfig,
    uploadVehicleAsset,
    resetConfig,
    exportConfigJson,
    importConfigJson
  };

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useUserConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useUserConfig must be used within a ConfigProvider');
  }
  return context;
};
