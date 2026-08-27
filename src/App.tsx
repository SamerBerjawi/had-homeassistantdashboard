import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { HAEntity, Room, LogMessage, ToastNotification } from './types';
import { useAutoLayoutStore } from './store/useAutoLayoutStore';
import { resolvedEntityToHAEntity } from './services/graphResolution';


import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';
import NotificationBell from './components/notifications/NotificationBell';
import NotificationDrawer from './components/notifications/NotificationDrawer';

import { 
  Armchair,
  Lightning, 
  ShieldCheck, 
  MusicNotes, 
  HardDrives, 
  ShareNetwork,
  Car,
  Heartbeat,
  Broom,
  GitFork, 
  GearSix,
  SquaresFour
} from '@phosphor-icons/react';

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

  // Tab State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isWeatherDrawerOpen, setIsWeatherDrawerOpen] = useState<boolean>(false);

  // Auto-Layout Graph Store
  const {
    init: initAutoLayout,
    resolvedEntities,
    isLiveMode
  } = useAutoLayoutStore(useShallow(s => ({
    init: s.init,
    resolvedEntities: s.resolvedEntities,
    isLiveMode: s.isLiveMode
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

  const PAGE_CONFIG: Record<string, { title: string; subtitle: string; icon: React.ComponentType<any>; color: string }> = {
    overview: {
      title: `${getTimeGreeting()}, ${userName}`,
      subtitle: '',
      icon: SquaresFour,
      color: 'text-amber-400'
    },
    rooms: {
      title: 'Rooms & Areas',
      subtitle: 'Explore live telemetry, lighting controls, climate targets, and appliances organized room by room.',
      icon: Armchair,
      color: 'text-indigo-400'
    },
    energy: {
      title: 'Energy & Power',
      subtitle: 'Monitor whole-home power draw, solar generation, battery storage, and historical grid energy.',
      icon: Lightning,
      color: 'text-amber-400'
    },
    security: {
      title: 'Security & Safety',
      subtitle: 'Keep your home safe with entry alarms, perimeter locks, motion zones, and surveillance feeds.',
      icon: ShieldCheck,
      color: 'text-emerald-400'
    },
    media: {
      title: 'Media & Audio',
      subtitle: 'Control whole-home audio playback, smart TV devices, streaming apps, and Apple TV remotes.',
      icon: MusicNotes,
      color: 'text-purple-400'
    },
    system: {
      title: 'System & Diagnostics',
      subtitle: 'Inspect Home Assistant server health, hardware resource usage, integration latency, and telemetry logs.',
      icon: HardDrives,
      color: 'text-cyan-400'
    },
    network: {
      title: 'Network & Connectivity',
      subtitle: 'Track connected IoT devices, gateway connectivity, signal strengths, and bandwidth distribution.',
      icon: ShareNetwork,
      color: 'text-sky-400'
    },
    mobility: {
      title: 'Mobility & Vehicles',
      subtitle: 'Monitor vehicle battery levels, charging status, location tracking, and transit routes.',
      icon: Car,
      color: 'text-emerald-400'
    },
    health: {
      title: 'Health & Environment',
      subtitle: 'Track indoor air quality, humidity levels, temperature comfort indices, and environmental wellness.',
      icon: Heartbeat,
      color: 'text-rose-400'
    },
    vacuums: {
      title: 'Vacuums & Cleaning',
      subtitle: 'Manage robotic vacuum routines, dock station controls, cleaning zones, and cordless stick batteries.',
      icon: Broom,
      color: 'text-cyan-400'
    },
    automations: {
      title: 'Automations & Scenes',
      subtitle: 'Manage home automations, custom routines, scene triggers, and smart execution schedules.',
      icon: GitFork,
      color: 'text-violet-400'
    },
    settings: {
      title: 'Settings & Setup',
      subtitle: 'Customize dashboard preferences, room layouts, entity mappings, and theme modes.',
      icon: GearSix,
      color: 'text-slate-400'
    }
  };

  const currentPage = PAGE_CONFIG[activeTab] || PAGE_CONFIG['overview'];
  const PageIcon = currentPage.icon;

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans select-none ${
      darkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 transform-gpu transition-colors duration-1000 ${
          darkMode ? 'bg-indigo-600' : 'bg-indigo-300'
        }`} />
        <div className={`absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 transform-gpu transition-colors duration-1000 ${
          darkMode ? 'bg-sky-600' : 'bg-sky-300'
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden touch-scroll-container p-4 sm:p-6 lg:p-8 flex flex-col">
          {/* Header Bar - Title with Animated Wave / Page Icon & Subtitle */}
          <header className="mb-6 flex flex-row items-start justify-between gap-3.5 pb-1">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 sm:gap-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {activeTab !== 'overview' && (
                    <PageIcon size={30} weight="duotone" className={`${currentPage.color} shrink-0`} />
                  )}
                  <span>{currentPage.title}</span>
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
                ) : (
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                    {currentPage.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Notification Bell firmly pinned to top-right corner */}
            <div className="shrink-0 pt-0.5 sm:pt-1">
              <NotificationBell
                darkMode={darkMode}
                onClick={() => setIsNotificationDrawerOpen(true)}
              />
            </div>
          </header>

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


    </div>
  );
}
