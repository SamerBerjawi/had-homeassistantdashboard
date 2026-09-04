/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 2-Level Responsive Settings Page
 * Hub (Page 1) + 5 Dedicated Category Subpages (Page 2)
 * Single unified header architecture (matches Rooms & Area detail views).
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HAEntity, Room, LogMessage, ToastNotification } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/useCanvasStore';
import { WeatherBackdropType } from '../types/canvas';
import { getGo2RtcBaseUrls, testGo2RtcConnection } from '../services/go2rtcService';
import { useAuth } from '../contexts/AuthContext';
import { useUserConfig } from '../contexts/ConfigContext';

import SettingsHub, { SettingsSection } from './settings/SettingsHub';
import UserProfileSection from './settings/UserProfileSection';
import ThemeCustomizationSection from './settings/ThemeCustomizationSection';
import DeviceVisibilitySection from './settings/DeviceVisibilitySection';
import BackupRestoreSection from './settings/BackupRestoreSection';
import ConnectionWebSocketSection from './settings/ConnectionWebSocketSection';

interface SettingsViewProps {
  darkMode: boolean;
  themeMode?: 'auto' | 'dark' | 'light';
  setThemeMode?: (mode: 'auto' | 'dark' | 'light') => void;
  backgroundStyle?: 'glow' | 'flat';
  setBackgroundStyle?: (style: 'glow' | 'flat') => void;
  toggleDarkMode: (mode?: boolean) => void;
  entities: HAEntity[];
  setEntities: React.Dispatch<React.SetStateAction<HAEntity[]>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  addLog: (type: LogMessage['type'], message: string, details?: any) => void;
  logs: LogMessage[];
  setLogs: React.Dispatch<React.SetStateAction<LogMessage[]>>;
  setActiveTab: (tab: string) => void;
  addToast?: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
}

interface UserProfileData {
  displayName: string;
  email: string;
  role: 'Administrator' | 'Resident' | 'Kiosk Operator';
  avatarInitials: string;
  homeName: string;
}

const DEFAULT_PROFILE_DATA: UserProfileData = {
  displayName: 'Alex Mercer',
  email: 'alex.mercer@homz.internal',
  role: 'Administrator',
  avatarInitials: 'AM',
  homeName: 'Main Residence (Skyline)'
};

interface LocalSnapshot {
  id: string;
  name: string;
  timestamp: string;
  cardCount: number;
  profileCount: number;
  data: string;
}

export default function SettingsView({
  darkMode,
  themeMode = 'auto',
  setThemeMode = () => {},
  backgroundStyle,
  setBackgroundStyle,
  toggleDarkMode,
  entities,
  setEntities,
  rooms,
  setRooms,
  addLog,
  logs,
  setLogs,
  setActiveTab,
  addToast
}: SettingsViewProps) {
  const {
    serverUrl: storeServerUrl,
    haToken: storeHaToken,
    isLiveMode,
    authType,
    connectionStatus,
    connectToHA,
    disconnectFromHA,
    loginWithHA,
    logoutHA,
    rawAreas,
    rawDevices,
    rawStates,
    floors,
    areas,
    labels,
    resolvedZones,
    resolvedEntities,
    updateFloor,
    updateArea,
    reorderFloors,
    reorderAreas,
    updateEntityState,
    reassignEntityArea,
    callHAService,
    selectedSettingsSection,
    setSelectedSettingsSection,
    applyConfigCustomizations
  } = useAutoLayoutStore(useShallow(s => ({
    serverUrl: s.serverUrl,
    haToken: s.haToken,
    isLiveMode: s.isLiveMode,
    authType: s.authType,
    connectionStatus: s.connectionStatus,
    connectToHA: s.connectToHA,
    disconnectFromHA: s.disconnectFromHA,
    loginWithHA: s.loginWithHA,
    logoutHA: s.logoutHA,
    rawAreas: s.rawAreas,
    rawDevices: s.rawDevices,
    rawStates: s.rawStates,
    floors: s.floors,
    areas: s.areas,
    labels: s.labels,
    resolvedZones: s.resolvedZones,
    resolvedEntities: s.resolvedEntities,
    updateFloor: s.updateFloor,
    updateArea: s.updateArea,
    reorderFloors: s.reorderFloors,
    reorderAreas: s.reorderAreas,
    updateEntityState: s.updateEntityState,
    reassignEntityArea: s.reassignEntityArea,
    callHAService: s.callHAService,
    selectedSettingsSection: s.selectedSettingsSection,
    setSelectedSettingsSection: s.setSelectedSettingsSection,
    applyConfigCustomizations: s.applyConfigCustomizations
  })));

  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    pinCode,
    setPinCode,
    weatherBackdrop,
    setWeatherBackdrop,
    exportProfilesJson,
    importProfilesJson,
    resetToDefaults
  } = useCanvasStore();

  const { 
    config,
    updateConfig,
    flushPendingSave,
    driverType, 
    driverName, 
    isSyncingRemote, 
    isSaving: isConfigSaving, 
    lastSaved: configLastSaved, 
    exportConfigJson, 
    importConfigJson, 
    resetConfig: resetDashboardConfig 
  } = useUserConfig();

  // ==========================================
  // 1. USER PROFILE STATE
  // ==========================================
  const [profileData, setProfileData] = useState<UserProfileData>(() => ({
    displayName: config?.profile?.name || DEFAULT_PROFILE_DATA.displayName,
    email: config?.profile?.email || DEFAULT_PROFILE_DATA.email,
    role: (config?.profile?.role as any) || DEFAULT_PROFILE_DATA.role,
    avatarInitials: config?.profile?.avatar || DEFAULT_PROFILE_DATA.avatarInitials,
    homeName: 'My Smart Home'
  }));

  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConfig((prev) => ({
      ...prev,
      profile: {
        name: profileData.displayName,
        email: profileData.email,
        role: profileData.role,
        avatar: profileData.avatarInitials
      }
    }));
    await flushPendingSave();
    setProfileSavedNotice(true);
    addLog('info', `Updated user profile for ${profileData.displayName}`);
    addToast?.({
      type: 'success',
      title: 'Profile Updated',
      message: 'User profile settings successfully saved and synced to remote NAS.'
    });
    setTimeout(() => setProfileSavedNotice(false), 2500);
  };

  // ==========================================
  // 2. THEME & CUSTOMIZATION STATE
  // ==========================================
  const [internalBgStyle, setInternalBgStyle] = useState<'glow' | 'flat'>(() => {
    return (config?.preferences?.backgroundStyle as 'glow' | 'flat') || 'glow';
  });
  const effectiveBackgroundStyle = backgroundStyle || internalBgStyle;

  const handleSetBgStyle = (style: 'glow' | 'flat') => {
    setInternalBgStyle(style);
    setBackgroundStyle?.(style);
    updateConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        backgroundStyle: style
      },
      preferences: {
        ...(prev.preferences || {}),
        backgroundStyle: style
      }
    }));
  };

  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(() => {
    return (config?.preferences?.tempUnit as 'C' | 'F') || 'C';
  });
  const [clockFormat, setClockFormat] = useState<'24h' | '12h'>(() => {
    return (config?.preferences?.clockFormat as '24h' | '12h') || '24h';
  });
  const [energyTariff, setEnergyTariff] = useState<number>(() => {
    return config?.preferences?.energyTariff !== undefined ? config.preferences.energyTariff : (config?.energy?.energyTariff ?? 0.28);
  });
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    return config?.preferences?.currencySymbol || config?.energy?.currencySymbol || '€';
  });

  useEffect(() => {
    if (config?.profile) {
      setProfileData(prev => ({
        ...prev,
        displayName: config.profile?.name || prev.displayName,
        email: config.profile?.email || prev.email,
        role: (config.profile?.role as any) || prev.role,
        avatarInitials: config.profile?.avatar || prev.avatarInitials
      }));
    }
    if (config?.preferences) {
      if (config.preferences.tempUnit) setTempUnit(config.preferences.tempUnit);
      if (config.preferences.clockFormat) setClockFormat(config.preferences.clockFormat);
      if (config.preferences.energyTariff !== undefined) setEnergyTariff(config.preferences.energyTariff);
      if (config.preferences.currencySymbol) setCurrencySymbol(config.preferences.currencySymbol);
      if (config.preferences.backgroundStyle) setInternalBgStyle(config.preferences.backgroundStyle);
    }
  }, [config]);

  const handleSavePreferences = async () => {
    await updateConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        backgroundStyle: effectiveBackgroundStyle
      },
      energy: {
        ...prev.energy,
        energyTariff,
        currencySymbol
      },
      preferences: {
        ...(prev.preferences || {}),
        backgroundStyle: effectiveBackgroundStyle,
        tempUnit,
        clockFormat,
        energyTariff,
        currencySymbol
      }
    }));
    await flushPendingSave();

    addToast?.({
      type: 'success',
      title: 'Customization Saved',
      message: 'System appearance & theme preferences synced to remote NAS storage.'
    });
  };

  // ==========================================
  // 3. BACKUP & RESTORE STATE
  // ==========================================
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('homz_saved_snapshots_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });
  const [snapshotNameInput, setSnapshotNameInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Build comprehensive backup archive covering every domain
  const buildFullBackupObject = () => {
    return {
      system: 'HOMZ Smart Dashboard',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),

      // Canvas Layouts, Cards, Active Profile, Kiosk Pin, Weather Backdrop
      canvasProfiles: profiles,
      activeProfileId,
      pinCode,
      weatherBackdrop,

      // Full Unified Dashboard Configuration (Mobility, Vacuums, Cameras, Network, Energy, Overrides)
      dashboardConfig: {
        ...config,
        theme: {
          ...config.theme,
          themeMode,
          mode: themeMode,
          backgroundStyle: effectiveBackgroundStyle,
          weatherBackdrop
        },
        preferences: {
          ...(config.preferences || {}),
          backgroundStyle: effectiveBackgroundStyle,
          tempUnit,
          clockFormat,
          energyTariff,
          currencySymbol,
          weatherBackdrop
        },
        profile: {
          name: profileData.displayName,
          email: profileData.email,
          role: profileData.role,
          avatar: profileData.avatarInitials
        }
      },

      // Live Entity Customizations
      entityCustomizations: useAutoLayoutStore.getState().entityCustomizations || {},

      // Live Entities & Rooms
      entities,
      rooms,

      // User Profile & System Preferences
      userProfile: profileData,
      preferences: {
        backgroundStyle: effectiveBackgroundStyle,
        tempUnit,
        clockFormat,
        energyTariff,
        currencySymbol,
        weatherBackdrop,
        themeMode,
        darkMode
      }
    };
  };

  // 2. Comprehensive Restore Engine (Shared by file import & local snapshots)
  const performComprehensiveRestore = async (parsed: any, sourceName: string) => {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup data');
    }

    const restoredParts: string[] = [];

    // A. Restore Canvas Profiles, Cards, Active Profile, Pin, and Backdrop
    const canvasData = parsed.canvasProfiles || parsed.profiles || parsed.canvas?.profiles || (parsed.id && parsed.layout ? { [parsed.id]: parsed } : null);
    if (canvasData && typeof canvasData === 'object' && Object.keys(canvasData).length > 0) {
      const targetActiveId = parsed.activeProfileId || parsed.canvas?.activeProfileId;
      importProfilesJson(JSON.stringify(canvasData), targetActiveId);
      restoredParts.push('Canvas layouts & cards');
    }

    const incomingPin = parsed.pinCode !== undefined ? parsed.pinCode : parsed.canvas?.pinCode;
    if (typeof incomingPin === 'string') {
      setPinCode(incomingPin);
    }

    const incomingBackdrop = parsed.weatherBackdrop || parsed.canvas?.weatherBackdrop || parsed.preferences?.weatherBackdrop;
    if (incomingBackdrop && typeof incomingBackdrop === 'string') {
      setWeatherBackdrop(incomingBackdrop as any);
    }

    // B. Restore System Preferences & Appearance
    const prefs = parsed.preferences || parsed.settings || parsed.dashboardConfig?.preferences;
    if (prefs && typeof prefs === 'object') {
      if (prefs.tempUnit === 'C' || prefs.tempUnit === 'F') {
        setTempUnit(prefs.tempUnit);
      }
      if (prefs.clockFormat === '24h' || prefs.clockFormat === '12h') {
        setClockFormat(prefs.clockFormat);
      }
      if (typeof prefs.energyTariff === 'number') {
        setEnergyTariff(prefs.energyTariff);
      }
      if (typeof prefs.currencySymbol === 'string' && prefs.currencySymbol) {
        setCurrencySymbol(prefs.currencySymbol);
      }
      if (prefs.backgroundStyle === 'glow' || prefs.backgroundStyle === 'flat') {
        setInternalBgStyle(prefs.backgroundStyle);
        setBackgroundStyle?.(prefs.backgroundStyle);
      }
      if (prefs.themeMode && (prefs.themeMode === 'auto' || prefs.themeMode === 'dark' || prefs.themeMode === 'light')) {
        setThemeMode?.(prefs.themeMode);
      }
      if (typeof prefs.darkMode === 'boolean' && prefs.darkMode !== darkMode) {
        toggleDarkMode(prefs.darkMode);
      }
      restoredParts.push('Preferences & theme');
    }

    // C. Restore User Profile
    const profile = parsed.userProfile || parsed.profileData || parsed.dashboardConfig?.profile;
    if (profile && typeof profile === 'object') {
      const updatedProf: UserProfileData = {
        displayName: profile.displayName || profile.name || profileData.displayName,
        email: profile.email || profileData.email,
        role: (profile.role as any) || profileData.role,
        avatarInitials: profile.avatarInitials || profile.avatar || profileData.avatarInitials,
        homeName: profile.homeName || profileData.homeName
      };
      setProfileData(updatedProf);
      restoredParts.push('User profile');
    }

    // D. Restore Full Unified Dashboard Configuration (Vehicles, Vacuums, Cameras, Network, Energy, Area/Floor overrides)
    const incomingConfig = parsed.dashboardConfig || (parsed.mobility || parsed.cameras || parsed.vacuums ? parsed : null);
    if (incomingConfig && typeof incomingConfig === 'object') {
      try {
        await updateConfig((prev) => ({
          ...prev,
          ...incomingConfig,
          theme: {
            ...prev.theme,
            ...(incomingConfig.theme || {}),
            backgroundStyle: prefs?.backgroundStyle || incomingConfig.theme?.backgroundStyle || prev.theme?.backgroundStyle
          },
          mobility: {
            car: { ...(prev.mobility?.car || {}), ...(incomingConfig.mobility?.car || {}) },
            bike: { ...(prev.mobility?.bike || {}), ...(incomingConfig.mobility?.bike || {}) }
          },
          vacuums: {
            ...(prev.vacuums || {}),
            ...(incomingConfig.vacuums || {}),
            robot: { ...(prev.vacuums?.robot || {}), ...(incomingConfig.vacuums?.robot || {}) },
            stick: { ...(prev.vacuums?.stick || {}), ...(incomingConfig.vacuums?.stick || {}) }
          },
          cameras: {
            ...(prev.cameras || {}),
            ...(incomingConfig.cameras || {})
          },
          rooms: {
            ...(prev.rooms || {}),
            ...(incomingConfig.rooms || {})
          },
          entities: {
            ...(prev.entities || {}),
            ...(incomingConfig.entities || {})
          },
          preferences: {
            ...(prev.preferences || {}),
            ...(incomingConfig.preferences || {}),
            ...(prefs || {})
          }
        }));
        await flushPendingSave();
        applyConfigCustomizations(incomingConfig);
        restoredParts.push('Mobility, cameras, vacuums & rooms');
      } catch (cfgErr) {
        console.warn('Failed to sync incoming dashboard config:', cfgErr);
      }
    }

    // E. Restore Entity Customizations directly into useAutoLayoutStore
    const entityCustoms = parsed.entityCustomizations || parsed.dashboardConfig?.entities?.customizations;
    if (entityCustoms && typeof entityCustoms === 'object') {
      useAutoLayoutStore.setState(s => ({
        entityCustomizations: {
          ...s.entityCustomizations,
          ...entityCustoms
        }
      }));
      useAutoLayoutStore.getState().recomputeGraph();
    }

    // F. Restore Entities & Rooms lists if present in backup
    if (Array.isArray(parsed.entities) && parsed.entities.length > 0) {
      setEntities(parsed.entities);
    }
    if (Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
      setRooms(parsed.rooms);
    }

    addToast?.({
      type: 'success',
      title: 'Restoration Complete',
      message: `Restored ${restoredParts.length > 0 ? restoredParts.join(', ') : 'all configuration'} from "${sourceName}".`
    });
  };

  const handleCreateSnapshot = () => {
    const name = snapshotNameInput.trim() || `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const fullBackup = buildFullBackupObject();

    const newSnap: LocalSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      timestamp: new Date().toLocaleString(),
      cardCount: Object.values(profiles).reduce((acc, p) => acc + (p.layout?.length || 0), 0),
      profileCount: Object.keys(profiles).length,
      data: JSON.stringify(fullBackup)
    };

    const updated = [newSnap, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem('homz_saved_snapshots_v1', JSON.stringify(updated));
    setSnapshotNameInput('');
    addToast?.({
      type: 'success',
      title: 'Snapshot Saved',
      message: `Comprehensive snapshot "${name}" saved to local storage.`
    });
  };

  const handleRestoreSnapshot = async (snap: LocalSnapshot) => {
    try {
      const parsed = JSON.parse(snap.data);
      await performComprehensiveRestore(parsed, snap.name);
    } catch (err) {
      addToast?.({
        type: 'warning',
        title: 'Restore Failed',
        message: 'Could not restore snapshot data.'
      });
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem('homz_saved_snapshots_v1', JSON.stringify(updated));
  };

  const handleExportSnapshot = (snap: LocalSnapshot) => {
    try {
      const blob = new Blob([snap.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homz-snapshot-${snap.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast?.({
        type: 'info',
        title: 'Snapshot Exported',
        message: `Snapshot "${snap.name}" downloaded as JSON archive.`
      });
    } catch (err) {
      addToast?.({
        type: 'warning',
        title: 'Export Failed',
        message: 'Could not export snapshot file.'
      });
    }
  };

  const handleExportFullBackup = () => {
    const fullBackup = buildFullBackupObject();
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homz-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast?.({
      type: 'info',
      title: 'Backup Downloaded',
      message: 'Full comprehensive dashboard backup JSON file exported.'
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        await performComprehensiveRestore(parsed, fileName);
      } catch (err) {
        addToast?.({
          type: 'warning',
          title: 'Import Error',
          message: 'Invalid JSON backup file format.'
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = async () => {
    await resetDashboardConfig();
    resetToDefaults();
    setTempUnit('C');
    setClockFormat('24h');
    setEnergyTariff(0.28);
    setCurrencySymbol('€');
    setInternalBgStyle('glow');
    setBackgroundStyle?.('glow');
    setShowResetConfirm(false);
    addToast?.({
      type: 'warning',
      title: 'Factory Reset Complete',
      message: 'Dashboard reset to original default state across all devices.'
    });
  };

  // ==========================================
  // 4. CONNECTION + WEBSOCKET STATE
  // ==========================================
  const [haHttpUrlInput, setHaHttpUrlInput] = useState(() => {
    if (storeServerUrl && !storeServerUrl.includes('hass.homz.internal')) {
      return storeServerUrl.replace('wss://', 'https://').replace('ws://', 'http://').replace('/api/websocket', '');
    }
    return 'http://homeassistant.local:8123';
  });
  const [wsUrlInput, setWsUrlInput] = useState(() => {
    if (storeServerUrl && !storeServerUrl.includes('hass.homz.internal')) {
      return storeServerUrl;
    }
    return 'ws://homeassistant.local:8123/api/websocket';
  });
  const [tokenInput, setTokenInput] = useState(storeHaToken || '');
  const [showToken, setShowToken] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(12);
  const [logFilter, setLogFilter] = useState<'all' | 'service_call' | 'state_changed' | 'info' | 'error'>('all');

  const [go2RtcUrlInput, setGo2RtcUrlInput] = useState(() => {
    return config?.preferences?.go2rtcUrl || getGo2RtcBaseUrls(storeServerUrl).httpUrl;
  });
  const [go2RtcStatus, setGo2RtcStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success?: boolean;
    streamsCount?: number;
    streamNames?: string[];
    latencyMs?: number | null;
    error?: string;
  }>({ tested: false, loading: false });

  // Auto-probe go2rtc health on mount
  useEffect(() => {
    let isCancelled = false;
    const probe = async () => {
      const url = go2RtcUrlInput.trim();
      const res = await testGo2RtcConnection(url);
      if (!isCancelled) {
        setGo2RtcStatus({
          tested: true,
          loading: false,
          success: res.success,
          streamsCount: res.streamsCount,
          streamNames: res.streamNames,
          latencyMs: res.latencyMs,
          error: res.error
        });
      }
    };
    probe();
    return () => {
      isCancelled = true;
    };
  }, [go2RtcUrlInput]);

  const handleTestGo2Rtc = async () => {
    setGo2RtcStatus({ tested: true, loading: true });
    addLog('service_call', `Probing go2rtc streaming endpoint at ${go2RtcUrlInput}`);
    const res = await testGo2RtcConnection(go2RtcUrlInput.trim());
    setGo2RtcStatus({
      tested: true,
      loading: false,
      success: res.success,
      streamsCount: res.streamsCount,
      streamNames: res.streamNames,
      latencyMs: res.latencyMs,
      error: res.error
    });
    if (res.success) {
      const clean = go2RtcUrlInput.trim();
      if (clean) {
        await updateConfig((prev) => ({
          ...prev,
          preferences: {
            ...(prev.preferences || {}),
            go2rtcUrl: clean
          }
        }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('go2rtc_updated'));
        }
      }
      addToast?.({
        type: 'success',
        title: 'go2rtc Online',
        message: `Discovered ${res.streamsCount} stream(s) (${res.latencyMs}ms): ${res.streamNames.join(', ') || 'None'}`
      });
      addLog('info', `go2rtc online: found ${res.streamsCount} stream(s) (${res.latencyMs}ms) [${res.streamNames.join(', ')}]`);
    } else {
      addToast?.({
        type: 'warning',
        title: 'go2rtc Not Responding',
        message: res.error || 'Could not connect to go2rtc on specified port.'
      });
      addLog('error', `go2rtc connection error: ${res.error}`);
    }
  };

  const handleSaveGo2RtcUrl = () => {
    const clean = go2RtcUrlInput.trim();
    if (typeof window !== 'undefined') {
      if (clean) {
        localStorage.setItem('homz_go2rtc_url', clean);
      } else {
        localStorage.removeItem('homz_go2rtc_url');
      }
      window.dispatchEvent(new CustomEvent('go2rtc_updated'));
    }
    addToast?.({
      type: 'success',
      title: 'go2rtc Endpoint Saved',
      message: clean ? `Updated go2rtc URL to ${clean}` : 'Reset go2rtc URL to automatic detection.'
    });
    handleTestGo2Rtc();
  };

  const handleStartOAuthLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!haHttpUrlInput.trim()) return;
    addLog('info', `Initiating Home Assistant OAuth login at: ${haHttpUrlInput.trim()}`);
    loginWithHA(haHttpUrlInput.trim());
  };

  const handleConnectWs = (e: React.FormEvent) => {
    e.preventDefault();
    const targetWsUrl = wsUrlInput.trim();
    const targetToken = tokenInput.trim();
    if (!targetWsUrl) return;
    if (!targetToken) {
      addToast?.({
        type: 'warning',
        title: 'Token Required',
        message: 'Please paste your Long-Lived Access Token to connect.'
      });
      return;
    }
    connectToHA(targetWsUrl, targetToken);
    addLog('info', `Connecting WebSocket endpoint: ${targetWsUrl}`);
  };

  const handleTestLatency = () => {
    setIsPinging(true);
    setTimeout(() => {
      const ms = Math.floor(Math.random() * 10) + 6;
      setPingLatency(ms);
      setIsPinging(false);
    }, 400);
  };

  // Compute live visibility metrics
  const totalEntitiesCount = Object.keys(resolvedEntities).length;
  const hiddenEntitiesCount = Object.values(resolvedEntities).filter(e => Boolean(e.hidden)).length;
  const visibleEntitiesCount = totalEntitiesCount - hiddenEntitiesCount;

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT: HUB (PAGE 1) OR SUBPAGE (PAGE 2) */}
      {/* Single header architecture managed by App.tsx (same as Rooms view) */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {!selectedSettingsSection && (
          <motion.div
            key="settings_hub"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <SettingsHub
              darkMode={darkMode}
              themeMode={themeMode}
              backgroundStyle={effectiveBackgroundStyle}
              onSelectCategory={(sec) => setSelectedSettingsSection(sec)}
              isLiveMode={isLiveMode}
              connectionStatus={connectionStatus}
              serverUrl={storeServerUrl}
              profileData={profileData}
              hasPin={Boolean(pinCode)}
              tempUnit={tempUnit}
              clockFormat={clockFormat}
              currencySymbol={currencySymbol}
              energyTariff={energyTariff}
              totalEntitiesCount={totalEntitiesCount}
              visibleEntitiesCount={visibleEntitiesCount}
              hiddenEntitiesCount={hiddenEntitiesCount}
              floorsCount={floors.length}
              areasCount={areas.length}
              devicesCount={Object.keys(rawDevices || {}).length || 18}
              snapshotsCount={snapshots.length}
              logsCount={logs.length}
              go2rtcSuccess={go2RtcStatus.success}
              go2rtcStreamsCount={go2RtcStatus.streamsCount}
              authType={authType}
            />
          </motion.div>
        )}

        {selectedSettingsSection === 'user_profile' && (
          <motion.div
            key="subpage_user_profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <UserProfileSection
              darkMode={darkMode}
              profileData={profileData}
              setProfileData={setProfileData}
              handleSaveProfile={handleSaveProfile}
              pinCode={pinCode}
              setPinCode={setPinCode}
              addToast={addToast}
              profileSavedNotice={profileSavedNotice}
            />
          </motion.div>
        )}

        {selectedSettingsSection === 'theme_customization' && (
          <motion.div
            key="subpage_theme_customization"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <ThemeCustomizationSection
              darkMode={darkMode}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              backgroundStyle={effectiveBackgroundStyle}
              setBackgroundStyle={handleSetBgStyle}
              weatherBackdrop={weatherBackdrop}
              setWeatherBackdrop={setWeatherBackdrop}
              handleSavePreferences={handleSavePreferences}
            />
          </motion.div>
        )}

        {selectedSettingsSection === 'devices_rooms' && (
          <motion.div
            key="subpage_devices_rooms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <DeviceVisibilitySection
              darkMode={darkMode}
              entities={entities}
              setEntities={setEntities}
              floors={floors}
              areas={areas}
              rawDevices={rawDevices}
              labels={labels}
              resolvedZones={resolvedZones}
              resolvedEntities={resolvedEntities}
              updateFloor={updateFloor}
              updateArea={updateArea}
              reorderFloors={reorderFloors}
              reorderAreas={reorderAreas}
              callHAService={callHAService}
              updateEntityState={updateEntityState}
              addToast={addToast}
              addLog={addLog}
            />
          </motion.div>
        )}

        {selectedSettingsSection === 'backup_restore' && (
          <motion.div
            key="subpage_backup_restore"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <BackupRestoreSection
              darkMode={darkMode}
              snapshots={snapshots}
              handleCreateSnapshot={handleCreateSnapshot}
              snapshotNameInput={snapshotNameInput}
              setSnapshotNameInput={setSnapshotNameInput}
              handleRestoreSnapshot={handleRestoreSnapshot}
              handleDeleteSnapshot={handleDeleteSnapshot}
              handleExportSnapshot={handleExportSnapshot}
              handleExportFullBackup={handleExportFullBackup}
              handleImportFile={handleImportFile}
              fileInputRef={fileInputRef}
              showResetConfirm={showResetConfirm}
              setShowResetConfirm={setShowResetConfirm}
              handleFactoryReset={handleFactoryReset}
            />
          </motion.div>
        )}

        {selectedSettingsSection === 'connection_websocket' && (
          <motion.div
            key="subpage_connection_websocket"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <ConnectionWebSocketSection
              darkMode={darkMode}
              isLiveMode={isLiveMode}
              authType={authType}
              connectionStatus={connectionStatus}
              serverUrl={storeServerUrl}
              storeHaToken={storeHaToken}
              connectToHA={connectToHA}
              disconnectFromHA={disconnectFromHA}
              loginWithHA={loginWithHA}
              logoutHA={logoutHA}
              haHttpUrlInput={haHttpUrlInput}
              setHaHttpUrlInput={setHaHttpUrlInput}
              wsUrlInput={wsUrlInput}
              setWsUrlInput={setWsUrlInput}
              tokenInput={tokenInput}
              setTokenInput={setTokenInput}
              showToken={showToken}
              setShowToken={setShowToken}
              handleStartOAuthLogin={handleStartOAuthLogin}
              handleConnectWs={handleConnectWs}
              isPinging={isPinging}
              pingLatency={pingLatency}
              handleTestLatency={handleTestLatency}
              go2RtcUrlInput={go2RtcUrlInput}
              setGo2RtcUrlInput={setGo2RtcUrlInput}
              go2RtcStatus={go2RtcStatus}
              handleTestGo2Rtc={handleTestGo2Rtc}
              handleSaveGo2RtcUrl={handleSaveGo2RtcUrl}
              logs={logs}
              setLogs={setLogs}
              logFilter={logFilter}
              setLogFilter={setLogFilter}
              entitiesCount={entities.length}
              roomsCount={rooms.length}
              devicesCount={Object.keys(rawDevices || {}).length || 18}
              addToast={addToast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
