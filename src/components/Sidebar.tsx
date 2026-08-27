import React, { useState, useEffect, useMemo } from 'react';

import { 
  SquaresFour,
  Armchair,
  Lightning, 
  ShieldCheck, 
  MusicNotes, 
  HardDrives, 
  ShareNetwork,
  Car,
  Heartbeat,
  GitFork, 
  GearSix,
  Sparkle, 
  X, 
  DotsThreeVertical,
  SidebarSimple,
  CaretLeft,
  CaretRight,
  Bell
} from '@phosphor-icons/react';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { extractHANotifications } from '../services/notificationsService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  toggleDarkMode: (next?: boolean) => void;
  onOpenNotifications?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  darkMode,
  toggleDarkMode,
  onOpenNotifications
}: SidebarProps) {
  const {
    domainGroups,
    states,
    nativeNotifications,
    nativeRepairs,
    dismissedNotificationIds,
    callHAService,
    dismissNotification,
    updateEntityState,
    installUpdate,
    skipUpdate,
    clearSkippedUpdate
  } = useAutoLayoutStore(useShallow(s => ({
    domainGroups: s.domainGroups,
    states: s.states,
    nativeNotifications: s.nativeNotifications,
    nativeRepairs: s.nativeRepairs,
    dismissedNotificationIds: s.dismissedNotificationIds,
    callHAService: s.callHAService,
    dismissNotification: s.dismissNotification,
    updateEntityState: s.updateEntityState,
    installUpdate: s.installUpdate,
    skipUpdate: s.skipUpdate,
    clearSkippedUpdate: s.clearSkippedUpdate
  })));

  const notifications = useMemo(() => {
    return extractHANotifications({
      domainGroups,
      states,
      nativeNotifications,
      nativeRepairs,
      dismissedNotificationIds,
      callHAService,
      dismissNotification,
      updateEntityState,
      installUpdate,
      skipUpdate,
      clearSkippedUpdate
    });
  }, [domainGroups, states, nativeNotifications, nativeRepairs, dismissedNotificationIds, callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate]);

  const totalNotifications = notifications.length;


  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  // Exact 11 Requested Navigation Items
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    { id: 'rooms', label: 'Rooms', icon: Armchair },
    { id: 'energy', label: 'Energy', icon: Lightning },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'media', label: 'Media', icon: MusicNotes },
    { id: 'system', label: 'System', icon: HardDrives },
    { id: 'network', label: 'Network', icon: ShareNetwork },
    { id: 'mobility', label: 'Mobility', icon: Car },
    { id: 'health', label: 'Health', icon: Heartbeat },
    { id: 'automations', label: 'Automations', icon: GitFork },
    { id: 'settings', label: 'Settings', icon: GearSix }
  ];

  // Mobile Primary Items (Overview, Rooms, Security, Energy) - 5th item is "More"
  const mobilePrimaryItems = menuItems.slice(0, 4);

  // Secondary items shown in the "More" Drawer
  const secondaryTabs = menuItems.slice(4).map(m => m.id);
  const isMoreTabActive = secondaryTabs.includes(activeTab);

  return (
    <>
      {/* DESKTOP SIDEBAR - Collapsible Left Vertical Navbar */}
      <nav 
        id="sidebar-desktop" 
        className={`hidden md:flex flex-col h-screen py-5 px-3 transition-all duration-300 shrink-0 sticky top-0 left-0 bottom-0 z-40 border-r ${
          isCollapsed ? 'w-20 items-center' : 'w-64'
        } ${
          darkMode 
            ? 'bg-slate-950/40 backdrop-blur-md backdrop-saturate-150 border-white/10 text-white' 
            : 'bg-white/80 backdrop-blur-md backdrop-saturate-150 border-black/8 text-slate-900'
        }`}
      >
        {/* Header Branding & Collapse Toggle */}
        <div className={`flex items-center mb-6 px-1 ${isCollapsed ? 'justify-center w-full' : 'justify-between w-full'}`}>
          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 cursor-pointer group"
            title="Homz Dashboard"
          >
            <div className={`w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center shadow-md transition-all shrink-0 group-hover:scale-105 ${
              darkMode ? 'bg-white/10 border border-white/15 text-sky-400' : 'bg-sky-500/10 border border-sky-500/20 text-sky-600'
            }`}>
              <Sparkle size={22} weight="duotone" className="group-hover:rotate-12 transition-transform" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className={`text-sm font-black tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>HOMZ</h2>
                <p className={`text-[10px] font-semibold tracking-wider uppercase mt-0.5 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>Automated Living</p>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5'
            } ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>
        
        {/* Navigation Items List */}
        <div className="flex flex-col w-full gap-1.5 overflow-y-auto touch-scroll-container py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`btn-nav-desktop-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative transition-all duration-200 cursor-pointer flex items-center gap-3.5 rounded-xl group ${
                  isCollapsed
                    ? 'w-11 h-11 justify-center mx-auto'
                    : 'w-full px-3.5 py-2.5 text-left'
                } ${
                  isActive 
                    ? darkMode
                      ? 'bg-linear-to-r from-sky-500/15 to-indigo-500/10 text-white font-medium border border-sky-400/20 shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)]' 
                      : 'bg-linear-to-r from-sky-500/15 to-indigo-500/10 text-sky-950 font-bold border border-sky-500/30 shadow-[0_0_15px_-3px_rgba(56,189,248,0.25)]'
                    : darkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
                }`}
              >
                <Icon 
                  size={20} 
                  weight="duotone" 
                  className={`shrink-0 transition-transform duration-200 ${
                    isActive 
                      ? darkMode ? 'text-sky-400' : 'text-sky-600' 
                      : darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'
                  }`} 
                />

                {!isCollapsed && (
                  <span className="text-xs font-semibold truncate tracking-tight">{item.label}</span>
                )}
                
                {/* Active Indicator Bar */}
                {isActive && !isCollapsed && (
                  <span className={`ml-auto w-1.5 h-3.5 rounded-full ${
                    darkMode ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                  }`} />
                )}
                
                {/* Hover Tooltip Label (Only when collapsed) */}
                {isCollapsed && (
                  <span className={`absolute left-full ml-3 px-2.5 py-1 text-[11px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap ${
                    darkMode 
                      ? 'bg-slate-900/95 backdrop-blur-md text-white border border-white/10' 
                      : 'bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200 shadow-slate-300/50'
                  }`}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pinned Footer Section: Notifications, Telemetry, Theme Toggler & Collapse */}
        <div className={`mt-auto pt-3 border-t w-full flex flex-col gap-2 ${darkMode ? 'border-white/10' : 'border-slate-200/80'}`}>
          {/* Native Home Assistant Notifications Row (Matching Native HA Sidebar) */}
          <button
            type="button"
            onClick={onOpenNotifications}
            id="btn-sidebar-notifications"
            title={isCollapsed ? `Notifications (${totalNotifications})` : undefined}
            className={`relative transition-all duration-200 cursor-pointer flex items-center gap-3 rounded-xl group ${
              isCollapsed ? 'w-11 h-11 justify-center mx-auto' : 'w-full px-3 py-2 text-left'
            } ${
              totalNotifications > 0
                ? darkMode
                  ? 'hover:bg-white/10 text-slate-200'
                  : 'hover:bg-slate-200 text-slate-800'
                : darkMode
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Bell
                size={20}
                weight={totalNotifications > 0 ? 'fill' : 'regular'}
                className={`${totalNotifications > 0 ? (darkMode ? 'text-amber-400' : 'text-amber-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
              />
              {isCollapsed && totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-slate-950">
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </span>
              )}
            </div>

            {!isCollapsed && (
              <>
                <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">Notifications</span>
                {totalNotifications > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </span>
                )}
              </>
            )}

            {isCollapsed && (
              <span className={`absolute left-full ml-3 px-2.5 py-1 text-[11px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap ${
                darkMode 
                  ? 'bg-slate-900/95 backdrop-blur-md text-white border border-white/10' 
                  : 'bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200 shadow-slate-300/50'
              }`}>
                Notifications {totalNotifications > 0 ? `(${totalNotifications})` : ''}
              </span>
            )}
          </button>

          {/* Telemetry Status Bar */}
          {!isCollapsed ? (

            <div className={`px-2.5 py-2 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-white/3 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className={`text-[11px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>HA Core Live</span>
              </div>
              <span className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>v2026.8</span>
            </div>
          ) : (
            <div className="flex justify-center" title="Home Assistant Online">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          )}

          {/* Theme Toggler */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
            {!isCollapsed && (
              <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Appearance</span>
            )}
            <AnimatedThemeToggler 
              id="btn-toggle-darkmode-desktop"
              theme={darkMode ? "dark" : "light"}
              onThemeChange={(newTheme) => toggleDarkMode(newTheme === "dark")}
              title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
              className={`w-9 h-9 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5'
              }`}
            />
          </div>

          {/* Expand Button at bottom if collapsed */}
          {isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer mx-auto ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5'
              }`}
              title="Expand Sidebar"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          )}
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav 
        id="sidebar-mobile" 
        className={`md:hidden fixed bottom-0 left-0 right-0 h-16 sm:h-18 flex justify-around items-center px-3 sm:px-6 shadow-2xl z-50 transition-all border-t ${
          darkMode 
            ? 'bg-slate-950/90 backdrop-blur-2xl border-white/10 text-white' 
            : 'bg-white/90 backdrop-blur-2xl border-slate-200 text-slate-900'
        }`}
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`btn-nav-mobile-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`w-11 h-11 rounded-2xl relative transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isActive 
                  ? darkMode
                    ? 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 text-sky-400 border border-sky-400/30 shadow-md shadow-sky-500/20 scale-105' 
                    : 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 text-sky-600 border border-sky-500/30 shadow-md shadow-sky-500/10 scale-105'
                  : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={22} weight="duotone" />
            </button>
          );
        })}

        {/* 5. "More" Button */}
        <button 
          id="btn-nav-mobile-more"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          title="More views and options"
          className={`w-11 h-11 rounded-2xl relative transition-all duration-200 cursor-pointer flex items-center justify-center ${
            isMoreTabActive || showMoreMenu
              ? darkMode
                ? 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 text-sky-400 border border-sky-400/30 shadow-md shadow-sky-500/20 scale-105' 
                : 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 text-sky-600 border border-sky-500/30 shadow-md shadow-sky-500/10 scale-105'
              : darkMode 
                ? 'text-slate-400 hover:text-white' 
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DotsThreeVertical size={22} weight="duotone" />
          {isMoreTabActive && !showMoreMenu && (
            <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
          )}
        </button>

        {/* MORE MENU BOTTOM SHEET */}
        {showMoreMenu && (
          <>
            {/* Backdrop to dismiss */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40"
              onClick={() => setShowMoreMenu(false)}
            />

            <div 
              id="mobile-more-sheet"
              className={`fixed bottom-20 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto p-5 rounded-[28px] border shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 ${
                darkMode 
                  ? 'bg-slate-950/95 backdrop-blur-3xl border-white/10 text-white shadow-black/80' 
                  : 'bg-white/95 backdrop-blur-2xl border-slate-200 text-slate-900 shadow-slate-400/40'
              }`}
            >
              {/* Sheet Header */}
              <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                darkMode ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <DotsThreeVertical size={20} weight="duotone" className={darkMode ? 'text-sky-400' : 'text-sky-600'} />
                  <div>
                    <h3 className={`font-extrabold text-sm tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Navigation Hub</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMoreMenu(false)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    darkMode ? 'bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <X size={16} weight="duotone" />
                </button>
              </div>

              {/* Secondary Navigation Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-3.5 max-h-64 overflow-y-auto touch-scroll-container">
                {menuItems.slice(4).map(item => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`btn-more-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMoreMenu(false);
                      }}
                      className={`p-3 rounded-2xl flex items-center gap-3 text-left transition-all border cursor-pointer ${
                        isActive
                          ? darkMode
                            ? 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 text-white border-sky-400/30 shadow-md font-bold'
                            : 'bg-linear-to-r from-sky-500/15 to-indigo-500/10 text-sky-950 border-sky-500/30 shadow-sm font-bold'
                          : darkMode
                            ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                            : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <ItemIcon 
                        size={20} 
                        weight="duotone" 
                        className={isActive ? (darkMode ? 'text-sky-400' : 'text-sky-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')} 
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{item.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Notifications Button in Mobile More Menu */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  if (onOpenNotifications) onOpenNotifications();
                }}
                className={`w-full mb-3 p-3 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                  totalNotifications > 0
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                    : darkMode
                      ? 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell size={20} weight={totalNotifications > 0 ? 'fill' : 'duotone'} className={totalNotifications > 0 ? 'text-amber-500' : ''} />
                  <span className="text-xs font-bold">Notifications & Alerts</span>
                </div>
                {totalNotifications > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                    {totalNotifications}
                  </span>
                )}
              </button>

              {/* Theme Toggle Bar */}
              <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800">

                <AnimatedThemeToggler
                  id="btn-more-toggle-darkmode"
                  theme={darkMode ? "dark" : "light"}
                  onThemeChange={(newTheme) => toggleDarkMode(newTheme === "dark")}
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold border transition-colors cursor-pointer w-full ${
                    darkMode 
                      ? 'bg-slate-800/90 border-white/10 text-slate-100 hover:bg-slate-700/90' 
                      : 'bg-white/90 border-black/6 text-slate-800 hover:bg-white shadow-xs'
                  }`}
                />
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}


