import React, { useState } from 'react';
import { 
  LayoutDashboard,
  Sofa,
  Zap, 
  ShieldCheck, 
  Music, 
  Server, 
  Network,
  Car,
  Activity,
  Workflow, 
  Settings,
  Sparkles, 
  X, 
  MoreVertical
} from 'lucide-react';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  toggleDarkMode: (next?: boolean) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  darkMode,
  toggleDarkMode
}: SidebarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Exact 11 Requested Navigation Items
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms', icon: Sofa },
    { id: 'energy', label: 'Energy', icon: Zap },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'media', label: 'Media', icon: Music },
    { id: 'system', label: 'System', icon: Server },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'mobility', label: 'Mobility', icon: Car },
    { id: 'health', label: 'Health', icon: Activity },
    { id: 'automations', label: 'Automations', icon: Workflow },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Mobile Primary Items (Overview, Rooms, Security, Energy) - 5th item is "More"
  const mobilePrimaryItems = menuItems.slice(0, 4);

  // Secondary items shown in the "More" Drawer
  const secondaryTabs = menuItems.slice(4).map(m => m.id);
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
          onClick={() => setActiveTab('overview')}
          className="flex w-11 h-11 bg-indigo-600 hover:bg-indigo-500 rounded-xl items-center justify-center mb-6 shadow-md shadow-indigo-600/30 transition-all cursor-pointer group"
          title="Homz Dashboard"
        >
          <Sparkles className="text-white group-hover:scale-110 transition-transform" size={20} />
        </div>
        
        {/* Navigation Items */}
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
                
                {/* Visual Glow indicator */}
                {isActive && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#7B61FF] rounded-r-full shadow-xs shadow-[#7B61FF]" />
                )}
                
                {/* Hover Tooltip Label */}
                <span className="absolute left-full ml-4 px-2.5 py-1 text-[10px] bg-slate-900 text-white font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl border border-slate-700/50 whitespace-nowrap transform translate-x-1 group-hover:translate-x-0 duration-200">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Container: Dark Mode Toggle */}
        <div className="mt-auto pt-4 flex flex-col gap-3 items-center">
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
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav 
        id="sidebar-mobile" 
        className={`md:hidden fixed bottom-0 left-0 right-0 h-16 sm:h-18 flex justify-around items-center px-3 sm:px-6 shadow-2xl z-50 transition-all border-t ${
          darkMode 
            ? 'bg-[#090D1A]/95 backdrop-blur-3xl border-white/10 text-slate-100' 
            : 'bg-white/95 backdrop-blur-3xl border-slate-200/80 text-slate-800'
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
              className={`p-2.5 sm:p-3 rounded-2xl relative transition-all duration-200 cursor-pointer flex flex-col items-center gap-0.5 ${
                isActive 
                  ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-105' 
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={19} />
            </button>
          );
        })}

        {/* 5. "More" Button */}
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
                    <h3 className="font-extrabold text-sm tracking-tight leading-none">Navigation Hub</h3>
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
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm'
                          : darkMode
                            ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                            : 'bg-slate-50 border-slate-200/70 hover:bg-indigo-50/50 text-slate-700'
                      }`}
                    >
                      <ItemIcon size={17} className={isActive ? 'text-white' : 'text-indigo-400'} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{item.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Theme Toggle Bar */}
              <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800">
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
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
