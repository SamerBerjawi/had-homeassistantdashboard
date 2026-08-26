/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Home, 
  Sofa,
  LayoutGrid, 
  Workflow, 
  Zap, 
  ShieldCheck, 
  Music, 
  Server, 
  Sparkles, 
  Terminal, 
  X, 
  User,
  Power,
  Moon,
  Sun,
  BatteryLow,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  Radio,
  Sliders
} from 'lucide-react';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  activeLightsCount: number;
  criticalBatteryCount?: number;
  maintenanceDueCount?: number;
  darkMode: boolean;
  toggleDarkMode: (next?: boolean) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  showTerminal, 
  setShowTerminal, 
  activeLightsCount,
  criticalBatteryCount = 0,
  darkMode,
  toggleDarkMode
}: SidebarProps) {
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // The 8 Core Pages Requested by User
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'rooms', label: 'Rooms & Zones', icon: Sofa },
    { id: 'devices', label: 'Device Fleet', icon: LayoutGrid, count: 6, batteryAlertBadge: criticalBatteryCount },
    { id: 'automations', label: 'Automations', icon: Workflow },
    { id: 'energy', label: 'Energy & Solar', icon: Zap },
    { id: 'security', label: 'Security & Alarm', icon: ShieldCheck, badge: 1 },
    { id: 'media', label: 'Music & Media', icon: Music },
    { id: 'system', label: 'System & Node', icon: Server }
  ];

  // Mobile Primary 4 Items (Home, Rooms, Devices, Security) - 5th item is "More"
  const mobilePrimaryItems = [
    menuItems.find(m => m.id === 'home')!,
    menuItems.find(m => m.id === 'rooms')!,
    menuItems.find(m => m.id === 'devices')!,
    menuItems.find(m => m.id === 'security')!
  ];

  // Secondary items shown in the "More" Drawer
  const secondaryTabs = ['automations', 'energy', 'media', 'system'];
  const isMoreTabActive = secondaryTabs.includes(activeTab);

  return (
    <>
      {/* DESKTOP SIDEBAR - Left side vertical navbar */}
      <nav 
        id="sidebar-desktop" 
        className={`hidden md:flex flex-col items-center w-20 lg:w-24 h-screen py-6 transition-all duration-300 shrink-0 sticky top-0 left-0 bottom-0 z-40 border-r ${
          darkMode 
            ? 'glassmorphic-sidebar-dark border-white/[0.1]' 
            : 'glassmorphic-sidebar border-black/[0.06] bg-white/70 backdrop-blur-xl'
        }`}
      >
        {/* Rounded Premium Homz Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex w-11 h-11 bg-indigo-600 hover:bg-indigo-500 rounded-xl items-center justify-center mb-6 shadow-md shadow-indigo-600/30 transition-all cursor-pointer group"
          title="Homz Dashboard"
        >
          <Sparkles className="text-white group-hover:scale-110 transition-transform" size={20} />
        </div>
        
        {/* All 8 Navigation Actions */}
        <div className="flex flex-col items-center justify-center w-full gap-2.5 overflow-y-auto touch-scroll-container py-1 px-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`btn-nav-desktop-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`p-3 min-w-[44px] min-h-[44px] rounded-xl relative transition-all group duration-300 cursor-pointer flex items-center justify-center ${
                  isActive 
                    ? 'bg-[#7B61FF] text-white shadow-lg shadow-[#7B61FF]/40 scale-105' 
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                }`}
              >
                <Icon size={20} className="transition-transform duration-300 group-hover:scale-110" />
                
                {/* Visual Glow indicators */}
                {isActive && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#7B61FF] rounded-r-full shadow-xs shadow-[#7B61FF]" />
                )}
                
                {/* Notification/Status badges */}
                {item.id === 'devices' && (item as any).batteryAlertBadge > 0 ? (
                  <span 
                    title={`${(item as any).batteryAlertBadge} device(s) have low battery`}
                    className="absolute -top-1 -right-1.5 bg-rose-600 text-[8.5px] font-black text-white px-1.5 py-0.5 rounded-full border border-white shadow-md shadow-rose-600/50 animate-bounce flex items-center gap-0.5 z-20"
                  >
                    <BatteryLow size={9} />
                    <span>{(item as any).batteryAlertBadge}</span>
                  </span>
                ) : item.id === 'devices' && activeLightsCount > 0 ? (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full border border-white shadow-xs">
                    {activeLightsCount}
                  </span>
                ) : null}

                {item.id === 'security' && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                
                {/* Hover Label */}
                <span className="absolute left-full ml-4 px-2.5 py-1 text-[10px] bg-slate-900 text-white font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-slate-700/50 whitespace-nowrap transform translate-x-1 group-hover:translate-x-0 duration-200">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Options Container */}
        <div className="mt-auto pt-4 flex flex-col gap-3 items-center">
          {/* Global Dark Mode Toggle with Magic UI Animated View Transition */}
          <AnimatedThemeToggler 
            id="btn-toggle-darkmode-desktop"
            theme={darkMode ? "dark" : "light"}
            onThemeChange={(newTheme) => toggleDarkMode(newTheme === "dark")}
            title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            className={`p-3 min-w-[44px] min-h-[44px] rounded-xl relative transition-all duration-300 cursor-pointer border flex items-center justify-center ${
              darkMode 
                ? 'bg-slate-800/80 border-white/[0.1] text-amber-400 hover:bg-slate-700/80 shadow-md' 
                : 'text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white border-black/[0.06] shadow-xs'
            }`}
          />

          {/* WebSocket Live Console Toggle */}
          <button 
            id="btn-toggle-terminal-desktop"
            onClick={() => setShowTerminal(!showTerminal)}
            title="Inspect Home Assistant WebSocket Logs"
            className={`p-3 rounded-2xl relative transition-all duration-300 cursor-pointer ${
              showTerminal 
                ? 'bg-amber-500/20 text-amber-400 font-bold rotate-6 border border-amber-500/40 shadow-md' 
                : darkMode
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Terminal size={18} />
            <span className="absolute -bottom-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500" />
          </button>
          
          {/* Profile Picture Trigger */}
          <div className="relative">
            <button 
              id="btn-profile-desktop"
              onClick={() => setShowProfileCard(!showProfileCard)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80 hover:border-[#7B61FF] shadow-md cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" 
                alt="Profile avatar" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </button>
            
            {showProfileCard && (
              <div 
                id="profile-dropdown-desktop"
                className={`absolute bottom-2 left-14 w-64 p-4 rounded-3xl border shadow-2xl z-50 transform origin-bottom-left transition-all ${
                  darkMode 
                    ? 'bg-[#0d1428]/95 backdrop-blur-2xl border-slate-700/70 text-slate-100' 
                    : 'bg-white/95 backdrop-blur-xl border-slate-100 text-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-sm">Sarah Jenkins</h4>
                    <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Resident Admin</p>
                  </div>
                  <button 
                    onClick={() => setShowProfileCard(false)}
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className={`p-2.5 rounded-2xl mb-3 flex items-center justify-between ${
                  darkMode ? 'bg-slate-900/80 border border-white/[0.1]' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{darkMode ? 'Dark Theme' : 'Light Theme'}</span>
                  </div>
                  <AnimatedThemeToggler 
                    id="btn-toggle-darkmode-dropdown"
                    theme={darkMode ? "dark" : "light"}
                    onThemeChange={(newTheme) => toggleDarkMode(newTheme === "dark")}
                    className={`w-9 h-9 rounded-xl relative transition-all cursor-pointer border flex items-center justify-center ${
                      darkMode 
                        ? 'bg-slate-800 border-white/[0.1] text-amber-400' 
                        : 'bg-white border-slate-200 text-slate-700 shadow-xs'
                    }`}
                  />
                </div>

                <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>HA Node: <code className={`text-[10px] px-1 py-0.5 rounded ${darkMode ? 'bg-slate-900 text-indigo-400' : 'bg-slate-100 text-slate-700'}`}>hass.homz.internal</code></p>
                <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status: <span className="text-emerald-500 font-semibold">Online (1.8ms)</span></p>
                
                <button 
                  id="btn-profile-to-system-desktop"
                  onClick={() => {
                    setActiveTab('system');
                    setShowProfileCard(false);
                  }}
                  className={`w-full flex items-center justify-between text-left text-xs p-2 rounded-xl transition-colors cursor-pointer mb-2 ${
                    darkMode ? 'hover:bg-slate-800 text-indigo-300' : 'hover:bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <Server size={13} />
                    <span>System & Core</span>
                  </span>
                  <span className="text-[10px]">Open &gt;</span>
                </button>

                <div className={`h-px my-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
                <button className="w-full flex items-center justify-between text-left text-xs text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-colors cursor-pointer">
                  <span>Disconnect Node</span>
                  <Power size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION - Exactly 5 items: Home, Rooms, Devices, Security, More */}
      <nav 
        id="sidebar-mobile" 
        className={`md:hidden fixed bottom-0 left-0 right-0 h-16 sm:h-18 flex justify-around items-center px-3 sm:px-6 shadow-2xl z-50 transition-all border-t ${
          darkMode 
            ? 'bg-[#090D1A]/95 backdrop-blur-3xl border-white/10 text-slate-100' 
            : 'bg-white/95 backdrop-blur-3xl border-slate-200/80 text-slate-800'
        }`}
      >
        {/* 1-4. Primary 4 Navigation Buttons */}
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`btn-nav-mobile-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                setShowMoreMenu(false);
                setShowProfileCard(false);
              }}
              className={`p-2.5 sm:p-3 rounded-2xl relative transition-all duration-200 cursor-pointer flex flex-col items-center gap-0.5 ${
                isActive 
                  ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-105' 
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={19} />
              
              {/* Notification & Alert badges */}
              {item.id === 'devices' && (item as any).batteryAlertBadge > 0 ? (
                <span 
                  title={`${(item as any).batteryAlertBadge} device(s) have low battery`}
                  className="absolute -top-1 -right-1.5 bg-rose-600 text-[7.5px] font-black text-white px-1 py-0.2 rounded-full flex items-center justify-center border border-white shadow-xs animate-bounce"
                >
                  !{(item as any).batteryAlertBadge}
                </span>
              ) : item.id === 'devices' && activeLightsCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-[8px] font-black text-white w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {activeLightsCount}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* 5. "More" 3 Vertical Dots Button */}
        <button 
          id="btn-nav-mobile-more"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          title="More views and options"
          className={`p-2.5 sm:p-3 rounded-2xl relative transition-all duration-200 cursor-pointer flex flex-col items-center gap-0.5 ${
            isMoreTabActive || showMoreMenu
              ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-105' 
              : darkMode 
                ? 'text-slate-400 hover:text-slate-200' 
                : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MoreVertical size={19} />
          
          {isMoreTabActive && !showMoreMenu && (
            <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>
          )}
        </button>

        {/* MORE MENU BOTTOM SHEET / POPUP DRAWER */}
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
                  ? 'bg-[#0B1124]/95 backdrop-blur-3xl border-slate-700/80 text-slate-100 shadow-black/80' 
                  : 'bg-white/95 backdrop-blur-2xl border-slate-200/90 text-slate-800 shadow-slate-400/40'
              }`}
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/40 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600/20 text-indigo-500 flex items-center justify-center">
                    <MoreVertical size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight leading-none">More Pages & Controls</h3>
                    <span className="text-[10px] text-slate-400 font-medium">Quick navigation hubs</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMoreMenu(false)}
                  className={`p-1.5 rounded-full hover:bg-slate-500/10 cursor-pointer ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Secondary Navigation Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                {/* Automations */}
                <button
                  id="btn-more-automations"
                  onClick={() => {
                    setActiveTab('automations');
                    setShowMoreMenu(false);
                  }}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                    activeTab === 'automations'
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm'
                      : darkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                        : 'bg-slate-50 border-slate-200/70 hover:bg-indigo-50/50 text-slate-700'
                  }`}
                >
                  <Workflow size={17} className={activeTab === 'automations' ? 'text-white' : 'text-indigo-400'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Automations</div>
                    <div className="text-[9px] opacity-70 truncate">Smart routines</div>
                  </div>
                </button>

                {/* Energy */}
                <button
                  id="btn-more-energy"
                  onClick={() => {
                    setActiveTab('energy');
                    setShowMoreMenu(false);
                  }}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                    activeTab === 'energy'
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm'
                      : darkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                        : 'bg-slate-50 border-slate-200/70 hover:bg-indigo-50/50 text-slate-700'
                  }`}
                >
                  <Zap size={17} className={activeTab === 'energy' ? 'text-white' : 'text-indigo-400'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Energy & Solar</div>
                    <div className="text-[9px] opacity-70 truncate">Power flow grid</div>
                  </div>
                </button>

                {/* Music & Media */}
                <button
                  id="btn-more-media"
                  onClick={() => {
                    setActiveTab('media');
                    setShowMoreMenu(false);
                  }}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                    activeTab === 'media'
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm'
                      : darkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                        : 'bg-slate-50 border-slate-200/70 hover:bg-indigo-50/50 text-slate-700'
                  }`}
                >
                  <Music size={17} className={activeTab === 'media' ? 'text-white' : 'text-indigo-400'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Music & Media</div>
                    <div className="text-[9px] opacity-70 truncate">Multi-room audio</div>
                  </div>
                </button>

                {/* System */}
                <button
                  id="btn-more-system"
                  onClick={() => {
                    setActiveTab('system');
                    setShowMoreMenu(false);
                  }}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                    activeTab === 'system'
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm'
                      : darkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                        : 'bg-slate-50 border-slate-200/70 hover:bg-indigo-50/50 text-slate-700'
                  }`}
                >
                  <Server size={17} className={activeTab === 'system' ? 'text-white' : 'text-indigo-400'} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">System & Core</div>
                    <div className="text-[9px] opacity-70 truncate">Node telemetry</div>
                  </div>
                </button>
              </div>

              {/* Utility Toggles Bar: Theme & Terminal */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-800 mb-3">
                <AnimatedThemeToggler
                  id="btn-more-toggle-darkmode"
                  theme={darkMode ? "dark" : "light"}
                  onThemeChange={(newTheme) => toggleDarkMode(newTheme === "dark")}
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold border transition-colors cursor-pointer w-full ${
                    darkMode 
                      ? 'bg-slate-800/90 border-white/[0.1] text-slate-100 hover:bg-slate-700/90' 
                      : 'bg-white/90 border-black/[0.06] text-slate-800 hover:bg-white shadow-xs'
                  }`}
                />

                <button
                  id="btn-more-toggle-terminal"
                  onClick={() => {
                    setShowTerminal(!showTerminal);
                    setShowMoreMenu(false);
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold border transition-colors cursor-pointer ${
                    showTerminal 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                      : darkMode 
                        ? 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800' 
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Terminal size={14} />
                    <span>WS Console</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80">{showTerminal ? 'OPEN' : 'HIDE'}</span>
                </button>
              </div>

              {/* User Account / Hass Node Status */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-xs shrink-0">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" 
                      alt="Sarah" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Sarah Jenkins</div>
                    <div className="text-[9.5px] text-emerald-500 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>hass.homz.internal</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowMoreMenu(false);
                    setActiveTab('system');
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 cursor-pointer"
                >
                  System &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
