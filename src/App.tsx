import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { HAEntity, Room, LogMessage, ToastNotification } from './types';
import { useAutoLayoutStore } from './store/useAutoLayoutStore';
import { resolvedEntityToHAEntity } from './services/graphResolution';


import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';
import NotificationBell from './components/notifications/NotificationBell';
import NotificationDrawer from './components/notifications/NotificationDrawer';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { UpdateToast } from './components/pwa/UpdateToast';
import AuthModal from './components/auth/AuthModal';
import EntityDetailModal from './components/modals/EntityDetailModal';
import DemoBanner from './components/auth/DemoBanner';
import { Key, SignIn, ArrowLeft, Lightbulb, Lock, LockOpen, Power, ArrowsClockwise, SlidersHorizontal, Palette, User, WifiHigh, DownloadSimple, GearSix, Warning, PencilSimpleLine, CheckCircle } from '@phosphor-icons/react';
import { useUserConfig } from './contexts/ConfigContext';
import { useAuth } from './contexts/AuthContext';
import { useEditMode } from './contexts/EditModeContext';
import FullScreenLoadingPage from './components/ui/FullScreenLoadingPage';
import { hasConfiguredHACredentials } from './store/useAutoLayoutStore';

import { PAGE_THEMES } from './config/pageThemes';
import DynamicPhosphorIcon from './components/ui/DynamicPhosphorIcon';
import { useRoomsData } from './hooks/useRoomsData';
import { haWebSocketService } from './services/haWebSocket';
import { alertService } from './services/alertService';
import { useAlertStore } from './store/useAlertStore';
import ToastContainer from './components/alerts/ToastContainer';
import CriticalAlertModal from './components/alerts/CriticalAlertModal';

const SETTINGS_SECTIONS_META: Record<string, { title: string; subtitle: string; icon: React.ComponentType<any>; color: string }> = {
  devices_rooms: {
    title: 'Devices & Entity Visibility',
    subtitle: 'Manage device visibility, room assignments, and entity hierarchy.',
    icon: SlidersHorizontal,
    color: 'text-emerald-400'
  },
  theme_customization: {
    title: 'Theme & Customization',
    subtitle: 'Visual theme mode, background glow ambiance, and weather simulation.',
    icon: Palette,
    color: 'text-purple-400'
  },
  user_profile: {
    title: 'User Profile & Security',
    subtitle: 'Account details, permissions, and wall display Kiosk PIN.',
    icon: User,
    color: 'text-sky-400'
  },
  connection_websocket: {
    title: 'Connection & Home Assistant',
    subtitle: 'WebSocket server credentials, connection status, and go2rtc streams.',
    icon: WifiHigh,
    color: 'text-indigo-400'
  },
  backup_restore: {
    title: 'Backup & Restore',
    subtitle: 'Configuration export, snapshots, and recovery options.',
    icon: DownloadSimple,
    color: 'text-amber-400'
  }
};

// Eagerly-loaded views (always visible)
import OverviewView from './components/views/OverviewView';

// Lazy-loaded views (deferred until first navigation)
const RoomsView = lazy(() => import('./components/views/RoomsView'));
const EnergyView = lazy(() => import('./components/views/EnergyView'));
const SecurityView = lazy(() => import('./components/views/SecurityView'));
const MediaView = lazy(() => import('./components/views/MediaView'));
const SystemView = lazy(() => import('./components/views/SystemView'));
const NetworkView = lazy(() => import('./components/views/NetworkView'));
const MobilityView = lazy(() => import('./components/views/MobilityView'));
const HealthView = lazy(() => import('./components/views/HealthView'));
const VacuumsView = lazy(() => import('./components/views/VacuumsView'));
const AutomationsView = lazy(() => import('./components/views/AutomationsView'));
const SettingsView = lazy(() => import('./components/SettingsView'));


import WeatherHeaderSentence from './components/weather/WeatherHeaderSentence';
import WeatherOverviewDrawer from './components/weather/WeatherOverviewDrawer';
import RoomsHeaderSentence from './components/rooms/RoomsHeaderSentence';
import MediaHeaderSentence from './components/media/MediaHeaderSentence';
import VacuumsHeaderSentence from './components/vacuums/VacuumsHeaderSentence';

const VALID_TABS = [
  'overview',
  'rooms',
  'energy',
  'security',
  'media',
  'system',
  'network',
  'mobility',
  'health',
  'vacuums',
  'automations',
  'settings'
] as const;

type TabKey = typeof VALID_TABS[number];

function getTabFromUrl(): TabKey {
  if (typeof window === 'undefined') return 'overview';
  const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (VALID_TABS.includes(rawPath as TabKey)) {
    return rawPath as TabKey;
  }
  return 'overview';
}

export default function App() {
  const { config, updateConfig, flushPendingSave, isLoading: isConfigLoading, syncStatus, lastSuccessfulSync } = useUserConfig();
  const { isEditMode, setEditMode, toggleEditMode } = useEditMode();

  // Theme Mode State: 'auto' (system OS) | 'dark' (OLED) | 'light' (Daylight)
  const [themeMode, setThemeMode] = useState<'auto' | 'dark' | 'light'>(() => {
    if (config?.theme?.mode) return config.theme.mode;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_mode');
      if (saved === 'auto' || saved === 'dark' || saved === 'light') return saved;
      const oldTheme = localStorage.getItem('theme');
      if (oldTheme === 'dark') return 'dark';
      if (oldTheme === 'light') return 'light';
    }
    return 'auto';
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = config?.theme?.mode || config?.theme?.themeMode || localStorage.getItem('theme_mode');
      if (savedMode === 'dark') return true;
      if (savedMode === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync theme with config when remote config changes
  useEffect(() => {
    const currentConfigMode = config?.theme?.mode || config?.theme?.themeMode;
    if (currentConfigMode && currentConfigMode !== themeMode) {
      setThemeMode(currentConfigMode);
    }
  }, [config?.theme?.mode, config?.theme?.themeMode]);

  const handleToggleDarkMode = (next?: boolean) => {
    const nextDark = next !== undefined ? next : !darkMode;
    const nextMode = nextDark ? 'dark' : 'light';
    setThemeMode(nextMode);
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        mode: nextMode,
        themeMode: nextMode
      }
    }));
  };

  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (themeMode === 'auto') {
        applyTheme();
      }
    };
    mql.addEventListener('change', handleSystemChange);
    return () => mql.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  // Background Style State: 'glow' (Ambient Blobs) | 'flat' (Minimalist Solid)
  const [backgroundStyle, setBackgroundStyle] = useState<'glow' | 'flat'>(() => {
    if (config?.theme?.backgroundStyle) return config.theme.backgroundStyle;
    if (config?.preferences?.backgroundStyle) return config.preferences.backgroundStyle;
    return 'glow';
  });

  useEffect(() => {
    const style = config?.theme?.backgroundStyle || config?.preferences?.backgroundStyle;
    if (style && style !== backgroundStyle) {
      setBackgroundStyle(style);
    }
  }, [config?.theme?.backgroundStyle, config?.preferences?.backgroundStyle]);

  const handleSetBackgroundStyle = (style: 'glow' | 'flat') => {
    setBackgroundStyle(style);
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

  // Tab State with URL Path Synchronization
  const [activeTab, setActiveTabState] = useState<string>(getTabFromUrl);

  const setActiveTab = (tab: string) => {
    if (tab === 'rooms') {
      useAutoLayoutStore.getState().setSelectedAreaId(null);
    }
    if (tab === 'settings') {
      useAutoLayoutStore.getState().setSelectedSettingsSection(null);
    }
    const validTab = VALID_TABS.includes(tab as TabKey) ? tab : 'overview';
    setActiveTabState(validTab);
    const targetPath = `/${validTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: validTab }, '', targetPath);
    }
  };

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentTab = getTabFromUrl();
      if (currentTab === 'rooms') {
        useAutoLayoutStore.getState().setSelectedAreaId(null);
      }
      if (currentTab === 'settings') {
        useAutoLayoutStore.getState().setSelectedSettingsSection(null);
      }
      setActiveTabState(currentTab);
    };

    window.addEventListener('popstate', handlePopState);

    // Ensure root '/' or malformed path cleanly normalizes in the address bar while preserving query params (e.g. ?code=...&state=...)
    const initialTab = getTabFromUrl();
    const expectedPath = `/${initialTab}`;
    if (window.location.pathname !== expectedPath) {
      const search = window.location.search || '';
      window.history.replaceState({ tab: initialTab }, '', `${expectedPath}${search}`);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update browser tab title to match the active view
  useEffect(() => {
    const theme = PAGE_THEMES[activeTab];
    const label = theme?.title || (activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
    document.title = `HOMZ • ${label}`;
  }, [activeTab]);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isWeatherDrawerOpen, setIsWeatherDrawerOpen] = useState<boolean>(false);
  const { isDrawerOpen: isAlertDrawerOpen, setDrawerOpen: setAlertDrawerOpen } = useAlertStore();

  const isNotificationOpen = isNotificationDrawerOpen || isAlertDrawerOpen;
  const handleOpenNotifications = () => {
    setIsNotificationDrawerOpen(true);
    setAlertDrawerOpen(true);
  };
  const handleCloseNotifications = () => {
    setIsNotificationDrawerOpen(false);
    setAlertDrawerOpen(false);
  };

  // Authentication Context
  const { authState, enterDemoMode, isInitializing: isAuthInitializing } = useAuth();

  // Auto-Layout Graph Store
  const {
    init: initAutoLayout,
    resolvedEntities,
    isLiveMode,
    connectionStatus,
    connectionError,
    serverUrl
  } = useAutoLayoutStore(useShallow(s => ({
    init: s.init,
    resolvedEntities: s.resolvedEntities,
    isLiveMode: s.isLiveMode,
    connectionStatus: s.connectionStatus,
    connectionError: s.connectionError,
    serverUrl: s.serverUrl
  })));

  useEffect(() => {
    initAutoLayout();
    alertService.initialize();
  }, [initAutoLayout]);

  // Entity & Room State
  const [entities, setEntities] = useState<HAEntity[]>(() => {
    return Object.values(resolvedEntities).map(resolvedEntityToHAEntity);
  });

  useEffect(() => {
    const arr = Object.values(resolvedEntities).map(resolvedEntityToHAEntity);
    if (arr.length > 0) {
      setEntities(arr);
    }
  }, [resolvedEntities]);

  const [rooms, setRooms] = useState<Room[]>([]);

  // Diagnostics Logs
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const addLog = (type: LogMessage['type'], message: string, details?: any) => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Toast System
  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: new Date().toLocaleTimeString()
    };
    setToasts(prev => [...prev.slice(-4), newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Primary User & Dynamic Greeting
  const domainGroups = useAutoLayoutStore(s => s.domainGroups);
  const personEntities = domainGroups['person'] || [];
  const primaryPerson = personEntities[0];
  const userName = primaryPerson?.name?.split(' ')[0] || 'Samer';

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const selectedAreaId = useAutoLayoutStore((s) => s.selectedAreaId);
  const setSelectedAreaId = useAutoLayoutStore((s) => s.setSelectedAreaId);
  const selectedSettingsSection = useAutoLayoutStore((s) => s.selectedSettingsSection);
  const setSelectedSettingsSection = useAutoLayoutStore((s) => s.setSelectedSettingsSection);
  const rawAreas = useAutoLayoutStore((s) => s.rawAreas);
  const currentSelectedArea = (activeTab === 'rooms' && selectedAreaId) ? rawAreas.find((a) => a.area_id === selectedAreaId) : null;
  const currentSettingsMeta = (activeTab === 'settings' && selectedSettingsSection) ? SETTINGS_SECTIONS_META[selectedSettingsSection] : null;

  const { areasDataList, toggleAreaLights, toggleAreaLocks, turnOffAllAreaEntities } = useRoomsData();
  const activeRoomData = (activeTab === 'rooms' && selectedAreaId) ? areasDataList.find((a) => a.areaId === selectedAreaId) : null;

  const currentTheme = PAGE_THEMES[activeTab] || PAGE_THEMES['overview'];
  const PageIcon = currentTheme.icon;
  const pageTitle = activeTab === 'overview'
    ? `${getTimeGreeting()}, ${userName}`
    : currentSelectedArea
      ? currentSelectedArea.name
      : currentSettingsMeta
        ? currentSettingsMeta.title
        : currentTheme.title;

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'connected' && Object.keys(resolvedEntities).length > 0) {
      setHasInitialLoaded(true);
    }
  }, [connectionStatus, resolvedEntities]);

  const isConnectingToHA = (isLiveMode || hasConfiguredHACredentials()) && connectionStatus !== 'connected' && connectionStatus !== 'auth_failed';
  const isInitialSyncPending = isLiveMode && !hasInitialLoaded && connectionStatus !== 'auth_failed';
  const isAppLoading = !authState.isDemo && (isConnectingToHA || isInitialSyncPending || (isAuthInitializing && hasConfiguredHACredentials()));

  const [loadingProgress, setLoadingProgress] = useState<number>(15);

  useEffect(() => {
    if (!isAppLoading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(15);
    const t1 = setTimeout(() => setLoadingProgress(35), 400);
    const t2 = setTimeout(() => setLoadingProgress(65), 1000);
    const t3 = setTimeout(() => setLoadingProgress(82), 2000);

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return 92;
        return prev + 1;
      });
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [isAppLoading]);

  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      if (haWebSocketService && !haWebSocketService.isDemo()) {
        await haWebSocketService.refreshStates();
      }
      window.dispatchEvent(new CustomEvent('had_manual_refresh'));
      addToast({
        title: 'Dashboard Refreshed',
        message: 'All entities, sensors, and telemetry have been updated.',
        type: 'info'
      });
    } catch (err: any) {
      console.warn('[App] Manual refresh error:', err);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Full-Screen Loading Page — Prevents rendering the demo environment while connecting
  if (isAppLoading) {
    return (
      <FullScreenLoadingPage
        progress={loadingProgress}
        serverUrl={serverUrl || authState.haUrl}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        onEnterDemoMode={() => {
          enterDemoMode();
          useAutoLayoutStore.getState().reloadDemoData();
        }}
        onRetry={handleManualRefresh}
        isRetrying={isManualRefreshing}
      />
    );
  }

  return (
    <div className={`fixed inset-0 flex h-full w-full overflow-hidden font-sans select-none ${darkMode ? 'bg-slate-950 text-white dark' : 'bg-[#f8fafc] text-slate-900'
      }`}>
      {/* Ambient background decoration with distinct page accent glows */}
      {backgroundStyle === 'glow' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-700 ease-in-out">
          {/* Primary Top-Right Accent Bloom */}
          <div className={`absolute -top-24 right-0 sm:right-1/6 w-[450px] sm:w-[620px] h-[450px] sm:h-[620px] rounded-full blur-[100px] sm:blur-[140px] opacity-16 dark:opacity-28 transform-gpu transition-all duration-1000 ${currentTheme.glow1
            }`} />
          {/* Secondary Bottom-Left Accent Bloom */}
          <div className={`absolute -bottom-24 left-0 sm:left-1/6 w-[400px] sm:w-[550px] h-[400px] sm:h-[550px] rounded-full blur-[100px] sm:blur-[140px] opacity-14 dark:opacity-24 transform-gpu transition-all duration-1000 ${currentTheme.glow2
            }`} />
          {/* Tertiary Center Accent Radiance */}
          <div className={`absolute top-1/3 left-1/3 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] rounded-full blur-[90px] sm:blur-[120px] opacity-10 dark:opacity-18 transform-gpu transition-all duration-1000 ${currentTheme.glow3 || currentTheme.glow1
            }`} />
        </div>
      )}

      {/* Modern Glassmorphic Nav Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        toggleDarkMode={handleToggleDarkMode}
        onOpenNotifications={handleOpenNotifications}
      />


      {/* Main Dynamic Viewport Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Persistent Demo Mode Status Banner */}
        <DemoBanner />

        <main className="flex-1 overflow-y-auto overflow-x-hidden touch-scroll-container p-4 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:p-6 sm:pb-8 lg:p-8 lg:pb-8 flex flex-col">
          {/* Header Bar - Title & Actions Top Row, 100% Full-Width Sentence Below */}
          <header className="mb-6 flex flex-col gap-3 pb-1 w-full">
            {/* Top Row: Title on Left, Global Action Controls on Right */}
            <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
                {/* Back Button when viewing room detail or settings subpage */}
                {((activeTab === 'rooms' && selectedAreaId) || (activeTab === 'settings' && selectedSettingsSection)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'rooms') setSelectedAreaId(null);
                      if (activeTab === 'settings') setSelectedSettingsSection(null);
                    }}
                    className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-90 mr-0.5"
                    title={activeTab === 'rooms' ? 'Back to Rooms' : 'Back to Settings'}
                  >
                    <ArrowLeft size={24} weight="bold" />
                  </button>
                )}

                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 sm:gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {activeTab !== 'overview' && (
                    currentSelectedArea ? (
                      <DynamicPhosphorIcon
                        name={currentSelectedArea.icon || 'HouseLine'}
                        size={30}
                        weight="duotone"
                        style={{ color: currentSelectedArea.color || undefined }}
                        className={`shrink-0 ${currentSelectedArea.color ? '' : currentTheme.color}`}
                      />
                    ) : currentSettingsMeta ? (
                      React.createElement(currentSettingsMeta.icon, {
                        size: 30,
                        weight: 'duotone',
                        className: `${currentSettingsMeta.color} shrink-0`
                      })
                    ) : (
                      <PageIcon size={30} weight="duotone" className={`${currentTheme.color} shrink-0`} />
                    )
                  )}
                  <span>{pageTitle}</span>
                  {activeTab === 'overview' && (
                    <span className="inline-block animate-wave cursor-default select-none text-2xl sm:text-3xl" title="Welcome!">👋</span>
                  )}
                </h1>
              </div>

              {/* Global Header Action Controls (Sync, Offline Fallback Pill, Manual Refresh, Notifications) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Offline Fallback Cache Indicator */}
                {syncStatus === 'offline_fallback' && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold backdrop-blur-sm animate-pulse"
                    title={`NAS storage currently unreachable. Displaying cached settings mirror (last synced: ${lastSuccessfulSync || 'recent'}).`}
                  >
                    <Warning size={14} weight="fill" className="text-amber-500 shrink-0" />
                    <span className="hidden sm:inline">Offline (Cached)</span>
                  </div>
                )}

                {/* Subtle Boot & Background Sync Indicator */}
                {isConfigLoading && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-semibold backdrop-blur-sm animate-pulse"
                    title="Synchronizing configuration across devices..."
                  >
                    <ArrowsClockwise size={14} className="animate-spin text-sky-500 dark:text-sky-400" />
                    <span className="hidden sm:inline">Syncing…</span>
                  </div>
                )}

                {/* Edit Mode Toggle (Only visible on Settings page) */}
                {activeTab === 'settings' && (
                  <button
                    type="button"
                    onClick={toggleEditMode}
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 sm:gap-2 text-xs font-bold shadow-xs ${
                      isEditMode
                        ? 'bg-sky-500 border-sky-400 text-white shadow-sky-500/25 ring-2 ring-sky-500/20'
                        : darkMode
                          ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                    title={isEditMode ? 'Exit Edit Mode' : 'Enable Edit Mode'}
                    aria-pressed={isEditMode}
                  >
                    <PencilSimpleLine
                      size={16}
                      weight={isEditMode ? 'fill' : 'bold'}
                      className={isEditMode ? 'animate-pulse text-white' : 'text-sky-400'}
                    />
                    <span>Edit Mode</span>
                    <span
                      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        isEditMode ? 'bg-white/30' : darkMode ? 'bg-white/20' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          isEditMode ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                )}

                {/* Manual Refresh Button */}
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isManualRefreshing}
                  className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center ${isManualRefreshing
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                      : darkMode
                        ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                    }`}
                  title="Refresh Dashboard"
                >
                  <ArrowsClockwise
                    size={18}
                    weight="bold"
                    className={`${isManualRefreshing ? 'animate-spin text-sky-400' : ''}`}
                  />
                </button>

                {/* Notification Center Trigger */}
                <NotificationBell
                  darkMode={darkMode}
                  onClick={handleOpenNotifications}
                />
              </div>
            </div>

            {/* Dynamic Weather / Area Telemetry Sentence (100% Full Width across Page) */}
            <div className="w-full pt-0.5">
              {activeTab === 'overview' ? (
                <WeatherHeaderSentence
                  darkMode={darkMode}
                  onOpenWeatherModal={() => setIsWeatherDrawerOpen(true)}
                />
              ) : activeTab === 'rooms' ? (
                <RoomsHeaderSentence
                  darkMode={darkMode}
                />
              ) : activeTab === 'media' ? (
                <MediaHeaderSentence
                  darkMode={darkMode}
                />
              ) : activeTab === 'vacuums' ? (
                <VacuumsHeaderSentence
                  darkMode={darkMode}
                />
              ) : activeTab === 'mobility' || (!currentSettingsMeta && !currentTheme.subtitle) ? null : (
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 max-w-full leading-relaxed">
                  {currentSettingsMeta ? currentSettingsMeta.subtitle : currentTheme.subtitle}
                </p>
              )}
            </div>
          </header>


          {/* Session Expired / Re-authentication Prompt Banner */}
          {connectionStatus === 'auth_failed' && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-500/5 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <Key size={22} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Home Assistant Session Expired
                  </h4>
                  <p className="text-xs text-rose-600 dark:text-rose-300/90 mt-0.5">
                    {connectionError || 'Authentication token expired or rejected. Please sign in again to restore live controls.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <SignIn size={15} weight="bold" />
                  <span>Sign In Again</span>
                </button>
              </div>
            </div>
          )}

          {/* PAGE ROUTING (Views lazy-loaded on first visit) */}
          <div className="flex-1 flex flex-col">
            {activeTab === 'overview' && <OverviewView darkMode={darkMode} />}
            <Suspense fallback={<div className="flex-1 flex items-center justify-center opacity-40 text-sm">Loading...</div>}>
              {activeTab === 'rooms' && <RoomsView darkMode={darkMode} />}
              {activeTab === 'energy' && <EnergyView darkMode={darkMode} />}
              {activeTab === 'security' && <SecurityView darkMode={darkMode} />}
              {activeTab === 'media' && <MediaView darkMode={darkMode} />}
              {activeTab === 'system' && <SystemView darkMode={darkMode} />}
              {activeTab === 'network' && <NetworkView darkMode={darkMode} />}
              {activeTab === 'mobility' && <MobilityView darkMode={darkMode} />}
              {activeTab === 'health' && <HealthView darkMode={darkMode} />}
              {activeTab === 'vacuums' && <VacuumsView darkMode={darkMode} />}
              {activeTab === 'automations' && <AutomationsView darkMode={darkMode} />}
              {activeTab === 'settings' && (
                <SettingsView
                  darkMode={darkMode}
                  themeMode={themeMode}
                  setThemeMode={setThemeMode}
                  backgroundStyle={backgroundStyle}
                  setBackgroundStyle={handleSetBackgroundStyle}
                  toggleDarkMode={handleToggleDarkMode}
                  entities={entities}
                  setEntities={setEntities}
                  rooms={rooms}
                  setRooms={setRooms}
                  addLog={addLog}
                  logs={logs}
                  setLogs={setLogs}
                  setActiveTab={setActiveTab}
                  addToast={addToast}
                />
              )}
            </Suspense>
          </div>

        </main>
      </div>

      {/* Global Notification & Alert Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={handleCloseNotifications}
        darkMode={darkMode}
      />

      {/* Global Weather Overview Drawer */}
      <WeatherOverviewDrawer
        isOpen={isWeatherDrawerOpen}
        onClose={() => setIsWeatherDrawerOpen(false)}
        darkMode={darkMode}
      />

      {/* Real-Time Glassmorphic Toast Alerts */}
      <ToastContainer />

      {/* High-Visibility Emergency Hazard Critical Modal */}
      <CriticalAlertModal
        onNavigateArea={(areaId) => {
          setActiveTab('rooms');
          setSelectedAreaId(areaId);
        }}
      />

      {/* Global Notifications */}
      <NotificationToast
        toasts={toasts}
        onDismiss={dismissToast}
        darkMode={darkMode}
      />

      {/* In-App PWA Install Prompt (Chromium / iOS) */}
      <InstallPrompt />

      {/* In-App PWA Service Worker Update Notice */}
      <UpdateToast />

      {/* Security Auth Gatekeeper Modal */}
      <AuthModal darkMode={darkMode} />

      {/* Global Entity Detail Modal & Bottom Sheet Drawer */}
      <EntityDetailModal />

      {/* Global Floating "Exit Edit Mode" Banner / FAB */}
      {isEditMode && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-black/90 border border-sky-500/50 shadow-2xl shadow-sky-500/30 backdrop-blur-xl ring-4 ring-sky-500/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30 shrink-0 animate-pulse">
                <PencilSimpleLine size={18} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white tracking-wide uppercase">
                    Edit Mode Active
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[11px] text-slate-300 dark:text-slate-400 hidden sm:block">
                  Drag tiles to reorder • Tap Eye to toggle • Tap size to resize
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setEditMode(false);
                await flushPendingSave();
                setToasts((prev) => [
                  ...prev,
                  {
                    id: String(Date.now()),
                    title: 'Layout Saved',
                    message: 'Dashboard layout saved to NAS and synced across devices',
                    type: 'success',
                    duration: 3000
                  }
                ]);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-black text-xs shadow-md shadow-sky-500/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
              title="Save & Exit Dashboard Edit Mode"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Done Editing</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
