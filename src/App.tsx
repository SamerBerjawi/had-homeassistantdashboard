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
import DemoBanner from './components/auth/DemoBanner';
import { Key, SignIn, ArrowLeft, Lightbulb, Lock, LockOpen, Power, ArrowsClockwise } from '@phosphor-icons/react';
import { useUserConfig } from './contexts/ConfigContext';

import { PAGE_THEMES } from './config/pageThemes';
import DynamicPhosphorIcon from './components/ui/DynamicPhosphorIcon';
import { useRoomsData } from './hooks/useRoomsData';

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
  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Tab State with URL Path Synchronization
  const [activeTab, setActiveTabState] = useState<string>(getTabFromUrl);
  const { isLoading: isConfigLoading } = useUserConfig();

  const setActiveTab = (tab: string) => {
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

  // Auto-Layout Graph Store
  const {
    init: initAutoLayout,
    resolvedEntities,
    isLiveMode,
    connectionStatus,
    connectionError
  } = useAutoLayoutStore(useShallow(s => ({
    init: s.init,
    resolvedEntities: s.resolvedEntities,
    isLiveMode: s.isLiveMode,
    connectionStatus: s.connectionStatus,
    connectionError: s.connectionError
  })));

  useEffect(() => {
    initAutoLayout();
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

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('homz_rooms');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved rooms:', e);
      }
    }
    return [];
  });


  useEffect(() => {
    localStorage.setItem('homz_rooms', JSON.stringify(rooms));
  }, [rooms]);

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
  const rawAreas = useAutoLayoutStore((s) => s.rawAreas);
  const currentSelectedArea = (activeTab === 'rooms' && selectedAreaId) ? rawAreas.find((a) => a.area_id === selectedAreaId) : null;

  const { areasDataList, toggleAreaLights, toggleAreaLocks, turnOffAllAreaEntities } = useRoomsData();
  const activeRoomData = (activeTab === 'rooms' && selectedAreaId) ? areasDataList.find((a) => a.areaId === selectedAreaId) : null;

  const currentTheme = PAGE_THEMES[activeTab] || PAGE_THEMES['overview'];
  const PageIcon = currentTheme.icon;
  const pageTitle = activeTab === 'overview'
    ? `${getTimeGreeting()}, ${userName}`
    : currentSelectedArea
    ? currentSelectedArea.name
    : currentTheme.title;

  return (
    <div className={`flex h-screen h-[100dvh] w-screen overflow-hidden font-sans select-none pwa-safe-container ${
      darkMode ? 'bg-slate-950 text-white dark' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Ambient background decoration with distinct page accent glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Primary Top-Right Accent Bloom */}
        <div className={`absolute -top-24 right-0 sm:right-1/6 w-[450px] sm:w-[620px] h-[450px] sm:h-[620px] rounded-full blur-[100px] sm:blur-[140px] opacity-16 dark:opacity-28 transform-gpu transition-all duration-1000 ${
          currentTheme.glow1
        }`} />
        {/* Secondary Bottom-Left Accent Bloom */}
        <div className={`absolute -bottom-24 left-0 sm:left-1/6 w-[400px] sm:w-[550px] h-[400px] sm:h-[550px] rounded-full blur-[100px] sm:blur-[140px] opacity-14 dark:opacity-24 transform-gpu transition-all duration-1000 ${
          currentTheme.glow2
        }`} />
        {/* Tertiary Center Accent Radiance */}
        <div className={`absolute top-1/3 left-1/3 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] rounded-full blur-[90px] sm:blur-[120px] opacity-10 dark:opacity-18 transform-gpu transition-all duration-1000 ${
          currentTheme.glow3 || currentTheme.glow1
        }`} />
      </div>

      {/* Modern Glassmorphic Nav Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        darkMode={darkMode}
        toggleDarkMode={(next) => setDarkMode(next !== undefined ? next : !darkMode)}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
      />


      {/* Main Dynamic Viewport Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Persistent Demo Mode Status Banner */}
        <DemoBanner />

        <main className="flex-1 overflow-y-auto overflow-x-hidden touch-scroll-container p-4 sm:p-6 lg:p-8 flex flex-col">
          {/* Header Bar - Title with Animated Wave / Page Icon & Subtitle */}
          <header className="mb-6 flex flex-row items-start justify-between gap-3.5 pb-1">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Back Button when viewing room detail */}
                {activeTab === 'rooms' && selectedAreaId && (
                  <button
                    type="button"
                    onClick={() => setSelectedAreaId(null)}
                    className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-90 mr-0.5"
                    title="Back to Rooms"
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

              {/* Dynamic Weather Sentence on Overview, or Page Description Sentence on other tabs */}
              <div className="pt-0.5">
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
                ) : (
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                    {currentTheme.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Header Right Actions: Room Quick Actions & Notification Bell */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-1">
              {activeTab === 'rooms' && activeRoomData && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Turn On/Off Lights Toggle */}
                  {activeRoomData.totalLightsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleAreaLights(activeRoomData.areaId, activeRoomData.activeLightsCount === 0)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                        activeRoomData.activeLightsCount > 0
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                          : darkMode
                          ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Lightbulb
                        size={15}
                        weight={activeRoomData.activeLightsCount > 0 ? 'fill' : 'duotone'}
                        className={activeRoomData.activeLightsCount > 0 ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]' : ''}
                      />
                      <span className="hidden sm:inline">{activeRoomData.activeLightsCount > 0 ? 'Turn Off Lights' : 'Turn On Lights'}</span>
                      <span className="sm:hidden">{activeRoomData.activeLightsCount > 0 ? 'Off' : 'On'}</span>
                    </button>
                  )}

                  {/* Lock / Unlock All Doors Toggle */}
                  {activeRoomData.totalLocksCount > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleAreaLocks(activeRoomData.areaId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                        activeRoomData.unlockedLocksCount > 0
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/35 text-emerald-300'
                      }`}
                    >
                      {activeRoomData.unlockedLocksCount > 0 ? (
                        <>
                          <LockOpen size={15} weight="bold" className="animate-pulse" />
                          <span className="hidden sm:inline">Lock All</span>
                        </>
                      ) : (
                        <>
                          <Lock size={15} weight="fill" className="text-emerald-400" />
                          <span className="hidden sm:inline">Locked</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* All Off Button */}
                  <button
                    type="button"
                    onClick={() => turnOffAllAreaEntities(activeRoomData.areaId)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Power size={15} weight="bold" />
                    <span>All Off</span>
                  </button>
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

              <NotificationBell
                darkMode={darkMode}
                onClick={() => setIsNotificationDrawerOpen(true)}
              />
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
                  toggleDarkMode={() => setDarkMode(!darkMode)}
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

      {/* Global Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        darkMode={darkMode}
      />

      {/* Global Weather Overview Drawer */}
      <WeatherOverviewDrawer
        isOpen={isWeatherDrawerOpen}
        onClose={() => setIsWeatherDrawerOpen(false)}
        darkMode={darkMode}
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
    </div>
  );
}
