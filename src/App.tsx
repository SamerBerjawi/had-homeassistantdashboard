import React, { useState, useEffect } from 'react';

import { HAEntity, Room, LogMessage, ToastNotification } from './types';
import { useAutoLayoutStore } from './store/useAutoLayoutStore';
import { resolvedEntityToHAEntity } from './services/graphResolution';


import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';
import NotificationBell from './components/notifications/NotificationBell';
import NotificationDrawer from './components/notifications/NotificationDrawer';

// 10 Blank Views
import OverviewView from './components/views/OverviewView';
import RoomsView from './components/views/RoomsView';
import EnergyView from './components/views/EnergyView';
import SecurityView from './components/views/SecurityView';
import MediaView from './components/views/MediaView';
import SystemView from './components/views/SystemView';
import NetworkView from './components/views/NetworkView';
import MobilityView from './components/views/MobilityView';
import HealthView from './components/views/HealthView';
import AutomationsView from './components/views/AutomationsView';

// Existing Settings View (Retained)
import SettingsView from './components/SettingsView';

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

  // Auto-Layout Graph Store
  const {
    init: initAutoLayout,
    resolvedEntities,
    isLiveMode
  } = useAutoLayoutStore();

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
        return [];
      }
    }
    return [];
  });


  useEffect(() => {
    localStorage.setItem('homz_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Logs State
  const [logs, setLogs] = useState<LogMessage[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'HAD Dashboard Initialized'
    }
  ]);

  const addLog = (type: LogMessage['type'], message: string, details?: any) => {
    setLogs(prev => [
      ...prev.slice(-150),
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        details
      }
    ]);
  };

  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const newToast: ToastNotification = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setToasts(prev => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateEntityState = (entityId: string, newState: string, newAttributes?: any) => {
    setEntities(prev => prev.map(ent => {
      if (ent.entity_id === entityId) {
        return {
          ...ent,
          state: newState,
          attributes: { ...ent.attributes, ...(newAttributes || {}) },
          last_updated: new Date().toISOString()
        };
      }
      return ent;
    }));

    addLog('service_call', `Service called on ${entityId} -> ${newState}`, {
      domain: entityId.split('.')[0],
      service: newState === 'on' ? 'turn_on' : newState === 'off' ? 'turn_off' : 'set_state',
      service_data: { entity_id: entityId, ...(newAttributes || {}) }
    });
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

  // Helper getters for view titles
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return `${getTimeGreeting()}, ${userName}`;
      case 'rooms': return 'Rooms';
      case 'energy': return 'Energy';
      case 'security': return 'Security';
      case 'media': return 'Media';
      case 'system': return 'System';
      case 'network': return 'Network';
      case 'mobility': return 'Mobility';
      case 'health': return 'Health';
      case 'automations': return 'Automations';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <div className={`w-full h-screen min-h-screen font-sans flex flex-col md:flex-row relative overflow-hidden select-none transition-colors duration-500 ${
      darkMode 
        ? 'bg-linear-to-b from-[#050811] via-[#080D1A] to-[#0B0F19] text-white' 
        : 'bg-[#F8FAFC] text-slate-900 light-mesh-bg'
    }`}>
      {/* Background ambient lighting glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-25 transition-all duration-1000 ${
          darkMode ? 'bg-sky-500/20' : 'bg-indigo-300/40'
        }`} />
        <div className={`absolute top-1/2 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
          darkMode ? 'bg-indigo-600/20' : 'bg-sky-200/50'
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
          {/* Header Bar - Title & Quick Notifications Bell */}
          <header className="mb-6 flex items-center justify-between gap-4">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {getTabTitle(activeTab)}
            </h1>

            <div className="flex items-center gap-2.5 shrink-0">
              <NotificationBell
                darkMode={darkMode}
                onClick={() => setIsNotificationDrawerOpen(true)}
              />
            </div>
          </header>

          {/* PAGE ROUTING (Blank views ready to build + Settings) */}
          <div className="flex-1 flex flex-col">
            {activeTab === 'overview' && <OverviewView darkMode={darkMode} />}
            {activeTab === 'rooms' && <RoomsView darkMode={darkMode} />}
            {activeTab === 'energy' && <EnergyView darkMode={darkMode} />}
            {activeTab === 'security' && <SecurityView darkMode={darkMode} />}
            {activeTab === 'media' && <MediaView darkMode={darkMode} />}
            {activeTab === 'system' && <SystemView darkMode={darkMode} />}
            {activeTab === 'network' && <NetworkView darkMode={darkMode} />}
            {activeTab === 'mobility' && <MobilityView darkMode={darkMode} />}
            {activeTab === 'health' && <HealthView darkMode={darkMode} />}
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
          </div>
        </main>
      </div>

      {/* Global Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
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
