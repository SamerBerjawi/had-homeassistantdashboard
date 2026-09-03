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
  DeepPartial,
  ConfigContextType, 
  StorageDriverType, 
  DEFAULT_USER_CONFIG,
  IConfigStorageDriver 
} from '../types/userConfig';
import { 
  createConfigStorageDriver, 
  mergeConfig, 
  LocalStorageDriver,
  readFileAsDataUrl
} from '../services/configStorageService';
import { configSyncService, SyncConnectionState } from '../services/configSyncService';
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline_fallback' | 'error'>('synced');
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);

  const activeDriverRef = useRef<IConfigStorageDriver>(new LocalStorageDriver());
  const pendingSaveTimeoutRef = useRef<any>(null);
  const latestConfigRef = useRef<UserDashboardConfig>(DEFAULT_USER_CONFIG);

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
      setSyncStatus('syncing');
      try {
        const loaded = await driver.loadConfig();
        if (isMounted && loaded) {
          latestConfigRef.current = loaded;
          setConfig(loaded);
          setLastSaved(loaded.updatedAt);
          applyToSubsystems(loaded);
          setSyncStatus('synced');
          setLastSuccessfulSync(new Date().toISOString());
        }
      } catch (err) {
        console.error('[ConfigProvider] Error loading user configuration:', err);
        setSyncStatus('offline_fallback');
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

    // 2. Listen to custom sync status change events dispatched by storage driver
    const handleSyncStatus = (e: any) => {
      if (e?.detail?.status && isMounted) {
        setSyncStatus(e.detail.status);
        if (e.detail.lastSync) {
          setLastSuccessfulSync(e.detail.lastSync);
        }
      }
    };
    window.addEventListener('had_sync_status_changed' as any, handleSyncStatus);

    // 3. Listen to local/cross-tab broadcast updates
    const handleLocalUpdated = (e: any) => {
      if (e?.detail && isMounted) {
        latestConfigRef.current = e.detail;
        setConfig(e.detail);
        setLastSaved(e.detail.updatedAt);
        applyToSubsystems(e.detail);
      }
    };
    window.addEventListener('had_config_updated' as any, handleLocalUpdated);

    // 4. Global / Manual Refresh Event Listener
    const handleGlobalRefresh = () => {
      if (authState.isAuthenticated && !authState.isDemo && isMounted) {
        loadData(true);
      }
    };
    window.addEventListener('had_manual_refresh', handleGlobalRefresh);

    // 5. Start Resilient SSE Sync Service for cross-device live updates
    let unsubscribeSync: (() => void) | null = null;
    if (authState.isAuthenticated && !authState.isDemo) {
      configSyncService.start();
      unsubscribeSync = configSyncService.subscribe({
        onConfigChanged: () => {
          if (isMounted) {
            loadData(true);
          }
        },
        onReconcileNeeded: () => {
          if (isMounted) {
            loadData(true);
          }
        },
        onStatusChanged: (status: SyncConnectionState) => {
          if (status === 'connected') {
            setSyncStatus('synced');
          } else if (status === 'reconnecting') {
            setSyncStatus('syncing');
          }
        }
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('ha_connection_status' as any, handleConnectionStatus);
      window.removeEventListener('had_sync_status_changed' as any, handleSyncStatus);
      window.removeEventListener('had_config_updated' as any, handleLocalUpdated);
      window.removeEventListener('had_manual_refresh', handleGlobalRefresh);
      if (unsubscribeSync) unsubscribeSync();
      configSyncService.stop();
    };
  }, [authState, isInitializing, isProduction]);

  const pendingDeltaRef = useRef<Partial<UserDashboardConfig>>({});

  // Update Config (Debounced Remote Persistence)
  const updateConfig = useCallback(async (
    partialOrUpdater:
      | DeepPartial<UserDashboardConfig>
      | Partial<UserDashboardConfig>
      | ((prev: UserDashboardConfig) => DeepPartial<UserDashboardConfig> | Partial<UserDashboardConfig>)
  ): Promise<UserDashboardConfig> => {
    const currentBase = latestConfigRef.current;
    let nextPartial: any;

    if (typeof partialOrUpdater === 'function') {
      nextPartial = partialOrUpdater(currentBase);
    } else {
      nextPartial = partialOrUpdater;
    }

    const merged = mergeConfig(currentBase, nextPartial);
    latestConfigRef.current = merged;
    // Optimistic UI state update
    setConfig(merged);
    try {
      useAutoLayoutStore.getState().applyConfigCustomizations(merged);
    } catch {}
    setIsSaving(true);

    // Accumulate granular delta for debounced save
    pendingDeltaRef.current = mergeConfig(pendingDeltaRef.current, nextPartial);

    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }

    return new Promise((resolve) => {
      pendingSaveTimeoutRef.current = setTimeout(async () => {
        const deltaToSave = { ...pendingDeltaRef.current };
        pendingDeltaRef.current = {};
        try {
          // Pass the delta to saveConfig so optimistic locking & remote persistence succeed
          const saved = await activeDriverRef.current.saveConfig(deltaToSave);
          latestConfigRef.current = saved;
          setConfig(saved);
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
  }, []);

  // Immediate Force Flush of Any Pending Debounced Config Save
  const flushPendingSave = useCallback(async (): Promise<UserDashboardConfig> => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    const deltaToSave = { ...pendingDeltaRef.current };
    pendingDeltaRef.current = {};

    const targetPayload = Object.keys(deltaToSave).length > 0 ? deltaToSave : latestConfigRef.current;
    setIsSaving(true);
    try {
      const saved = await activeDriverRef.current.saveConfig(targetPayload);
      latestConfigRef.current = saved;
      setConfig(saved);
      setLastSaved(saved.updatedAt);
      setIsSaving(false);
      return saved;
    } catch (err) {
      console.error('[ConfigProvider] Failed to flush save config:', err);
      setIsSaving(false);
      return latestConfigRef.current;
    }
  }, []);

  // Upload Custom Vehicle PNGs or Brand Logos
  const uploadVehicleAsset = useCallback(async (fileOrDataUrl: File | string, key: string): Promise<string> => {
    setIsSaving(true);
    try {
      let assetUrl = '';
      if (activeDriverRef.current.uploadAsset) {
        assetUrl = await activeDriverRef.current.uploadAsset(fileOrDataUrl, key);
      } else {
        if (typeof fileOrDataUrl === 'string') {
          assetUrl = fileOrDataUrl;
        } else {
          assetUrl = await readFileAsDataUrl(fileOrDataUrl);
        }
      }

      // Auto-save asset URL into configuration schema based on key using updater pattern
      if (key === 'car_image') {
        await updateConfig((prev) => ({
          mobility: {
            ...(prev.mobility || {}),
            car: { ...(prev.mobility?.car || {}), vehicleImageUrl: assetUrl }
          }
        }));
      } else if (key === 'car_logo') {
        await updateConfig((prev) => ({
          mobility: {
            ...(prev.mobility || {}),
            car: { ...(prev.mobility?.car || {}), brandLogoUrl: assetUrl }
          }
        }));
      } else if (key === 'bike_image') {
        await updateConfig((prev) => ({
          mobility: {
            ...(prev.mobility || {}),
            bike: { ...(prev.mobility?.bike || {}), bikeImageUrl: assetUrl }
          }
        }));
      } else if (key === 'bike_logo') {
        await updateConfig((prev) => ({
          mobility: {
            ...(prev.mobility || {}),
            bike: { ...(prev.mobility?.bike || {}), brandLogoUrl: assetUrl }
          }
        }));
      }

      setIsSaving(false);
      return assetUrl;
    } catch (err) {
      console.error('[ConfigProvider] Failed to upload vehicle asset:', err);
      setIsSaving(false);
      throw err;
    }
  }, [updateConfig]);

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
    syncStatus,
    lastSuccessfulSync,
    updateConfig,
    flushPendingSave,
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
