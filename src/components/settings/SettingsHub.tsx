/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Settings Hub (Page 1)
 * Features dual layout:
 * 1. Dedicated Native Mobile Inset List View (block md:hidden)
 * 2. Spacious Desktop Grid Cards (hidden md:grid)
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  User,
  Palette,
  SlidersHorizontal,
  DownloadSimple,
  WifiHigh,
  ArrowRight,
  CaretRight,
  CheckCircle,
  Warning,
  DeviceMobile,
  Moon,
  Sun,
  ShieldCheck,
  HardDrives
} from '@phosphor-icons/react';

export type SettingsSection = 
  | 'user_profile' 
  | 'theme_customization' 
  | 'devices_rooms' 
  | 'backup_restore' 
  | 'connection_websocket';

interface SettingsHubProps {
  darkMode: boolean;
  themeMode?: 'auto' | 'dark' | 'light';
  onSelectCategory: (section: SettingsSection) => void;
  isLiveMode: boolean;
  connectionStatus: string;
  serverUrl?: string;
  profileData: {
    displayName: string;
    email: string;
    role: string;
    avatarInitials: string;
  };
  hasPin: boolean;
  backgroundStyle?: 'glow' | 'flat';
  tempUnit?: 'C' | 'F';
  clockFormat?: '24h' | '12h';
  currencySymbol: string;
  energyTariff: number;
  totalEntitiesCount: number;
  visibleEntitiesCount: number;
  hiddenEntitiesCount: number;
  floorsCount: number;
  areasCount: number;
  devicesCount: number;
  snapshotsCount: number;
  logsCount: number;
  go2rtcSuccess?: boolean;
  go2rtcStreamsCount?: number;
  authType: 'oauth' | 'llat' | 'demo';
}

export default function SettingsHub({
  darkMode,
  themeMode = 'auto',
  onSelectCategory,
  isLiveMode,
  connectionStatus,
  profileData,
  hasPin,
  backgroundStyle = 'glow',
  tempUnit,
  clockFormat,
  totalEntitiesCount,
  visibleEntitiesCount,
  hiddenEntitiesCount,
  floorsCount,
  areasCount,
  devicesCount,
  snapshotsCount,
  logsCount,
  go2rtcSuccess,
  go2rtcStreamsCount,
  authType
}: SettingsHubProps) {


  const CATEGORIES = [
    {
      id: 'devices_rooms' as SettingsSection,
      title: 'Devices & Entity Visibility',
      icon: SlidersHorizontal,
      gradient: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/5',
      accentColor: 'text-emerald-500 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      borderColor: 'hover:border-emerald-500/40',
      badge: `${visibleEntitiesCount} / ${totalEntitiesCount} Visible`,
      badgeType: hiddenEntitiesCount > 0 ? 'warning' : 'success',
      metrics: [
        { label: 'Visible', value: `${visibleEntitiesCount}` },
        { label: 'Hidden', value: `${hiddenEntitiesCount}` },
        { label: 'Rooms', value: `${areasCount}` }
      ]
    },
    {
      id: 'theme_customization' as SettingsSection,
      title: 'Theme & Customization',
      icon: Palette,
      gradient: 'from-purple-500/15 via-pink-500/10 to-indigo-500/5',
      accentColor: 'text-purple-500 dark:text-purple-400',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      borderColor: 'hover:border-purple-500/40',
      badge: themeMode === 'auto' ? 'Auto System' : darkMode ? 'Dark OLED' : 'Daylight',
      badgeType: 'info',
      metrics: [
        { label: 'Theme', value: themeMode === 'auto' ? 'System' : darkMode ? 'Dark' : 'Light' },
        { label: 'Background', value: backgroundStyle === 'flat' ? 'Flat' : 'Glow' },
        { label: 'Style', value: backgroundStyle === 'flat' ? 'Solid' : 'Ambient' }
      ]
    },
    {
      id: 'user_profile' as SettingsSection,
      title: 'User Profile & Security PIN',
      icon: User,
      gradient: 'from-sky-500/15 via-blue-500/10 to-indigo-500/5',
      accentColor: 'text-sky-500 dark:text-sky-400',
      iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      borderColor: 'hover:border-sky-500/40',
      badge: hasPin ? 'PIN Active' : 'PIN Unset',
      badgeType: hasPin ? 'success' : 'neutral',
      metrics: [
        { label: 'User', value: profileData.displayName || 'Owner' },
        { label: 'Role', value: profileData.role || 'Admin' },
        { label: 'Kiosk PIN', value: hasPin ? 'Active' : 'Off' }
      ]
    },
    {
      id: 'connection_websocket' as SettingsSection,
      title: 'Connection & Home Assistant',
      icon: WifiHigh,
      gradient: 'from-indigo-500/15 via-sky-500/10 to-blue-500/5',
      accentColor: 'text-indigo-500 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      borderColor: 'hover:border-indigo-500/40',
      badge: isLiveMode ? 'Live WebSocket' : 'Demo Mode',
      badgeType: isLiveMode ? 'success' : 'warning',
      metrics: [
        { label: 'Status', value: isLiveMode ? 'Connected' : 'Demo' },
        { label: 'Auth', value: authType === 'oauth' ? 'OAuth' : authType === 'llat' ? 'Token' : 'Demo' },
        { label: 'Cameras', value: go2rtcSuccess ? `${go2rtcStreamsCount || 0}` : 'Auto' }
      ]
    },
    {
      id: 'backup_restore' as SettingsSection,
      title: 'Backup & Restore',
      icon: DownloadSimple,
      gradient: 'from-amber-500/15 via-orange-500/10 to-yellow-500/5',
      accentColor: 'text-amber-500 dark:text-amber-400',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      borderColor: 'hover:border-amber-500/40',
      badge: `${snapshotsCount} Saved`,
      badgeType: 'neutral',
      metrics: [
        { label: 'Snapshots', value: `${snapshotsCount}` },
        { label: 'Export', value: 'JSON' },
        { label: 'Reset', value: 'Factory' }
      ]
    }
  ];

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. DEDICATED MOBILE VIEW (block md:hidden) - iOS Native Inset Grouped Style */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4 pb-8">
        {/* Mobile Profile Card */}
        <div 
          onClick={() => onSelectCategory('user_profile')}
          className="p-4 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-sky-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              {profileData.avatarInitials || 'AM'}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {profileData.displayName || 'Alex Mercer'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {profileData.role || 'Administrator'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className={`text-[11px] font-bold ${hasPin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {hasPin ? 'PIN Active' : 'No PIN'}
                </span>
              </div>
            </div>
          </div>
          <CaretRight size={20} weight="bold" className="text-slate-400 shrink-0 ml-2" />
        </div>


        {/* Section 1: Dashboard Setup & Visibility */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3">
            Dashboard & Living Space
          </div>
          <div className="rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden divide-y divide-slate-900/[0.05] dark:divide-white/5">
            {/* Device Visibility Row */}
            <div
              onClick={() => onSelectCategory('devices_rooms')}
              className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Devices & Entity Visibility
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {visibleEntitiesCount} of {totalEntitiesCount} entities active
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  hiddenEntitiesCount > 0 
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' 
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {hiddenEntitiesCount > 0 ? `${hiddenEntitiesCount} Hidden` : 'All Visible'}
                </span>
                <CaretRight size={18} weight="bold" className="text-slate-400" />
              </div>
            </div>

            {/* Theme & Customization Row */}
            <div
              onClick={() => onSelectCategory('theme_customization')}
              className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Palette size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Theme & Customization
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Theme ({themeMode === 'auto' ? 'Auto' : darkMode ? 'Dark' : 'Light'}), BG ({backgroundStyle === 'flat' ? 'Flat' : 'Glow'})
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {themeMode === 'auto' ? 'Auto' : darkMode ? 'Dark' : 'Light'}
                </span>
                <CaretRight size={18} weight="bold" className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Connection & Cloud */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3">
            Connectivity & Core Server
          </div>
          <div className="rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden divide-y divide-slate-900/[0.05] dark:divide-white/5">
            {/* Connection Status Row */}
            <div
              onClick={() => onSelectCategory('connection_websocket')}
              className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <WifiHigh size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Home Assistant WebSocket
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {authType === 'oauth' ? 'OAuth2 Authentication' : authType === 'llat' ? 'Token Session' : 'Demo Session'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isLiveMode 
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                }`}>
                  {isLiveMode ? 'Online' : 'Demo'}
                </span>
                <CaretRight size={18} weight="bold" className="text-slate-400" />
              </div>
            </div>

            {/* Backup & Restore Row */}
            <div
              onClick={() => onSelectCategory('backup_restore')}
              className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <DownloadSimple size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Backup, Snapshots & Reset
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Export JSON backups & rollbacks
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {snapshotsCount} Saved
                </span>
                <CaretRight size={18} weight="bold" className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP CARDS VIEW (hidden md:grid) */}
      {/* ========================================================================= */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">


        {CATEGORIES.map((cat, idx) => {
          const Icon = cat.icon;
          const isHighlight = idx === 0;

          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectCategory(cat.id)}
              className={`group relative rounded-3xl backdrop-blur-sm p-5 sm:p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
                darkMode
                  ? 'bg-black/20 hover:bg-black/30 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-slate-900'
              } ${isHighlight ? 'md:col-span-2 lg:col-span-1' : ''}`}
            >
              {/* Subtle Ambient Accent */}
              <div
                className={`absolute inset-0 rounded-3xl bg-linear-to-br ${cat.gradient} opacity-30 group-hover:opacity-70 transition-opacity pointer-events-none`}
              />

              <div className="relative space-y-4">
                {/* Header Row: Icon & Status Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${
                      darkMode ? 'bg-white/5' : 'bg-slate-900/[0.04]'
                    }`}
                  >
                    <Icon size={26} weight="duotone" className={cat.accentColor} />
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-tight flex items-center gap-1.5 shadow-2xs ${
                      cat.badgeType === 'success'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : cat.badgeType === 'warning'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          : cat.badgeType === 'info'
                            ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
                            : 'bg-slate-900/[0.04] dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.badgeType === 'success' && <CheckCircle size={13} weight="bold" />}
                    {cat.badgeType === 'warning' && <Warning size={13} weight="bold" />}
                    {cat.badge}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                    {cat.title}
                  </h3>
                </div>

                {/* Key Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {cat.metrics.map((m, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.04] text-center min-w-0"
                    >
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">
                        {m.label}
                      </div>
                      <div className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white truncate mt-0.5">
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action Row */}
              <div className="relative pt-4 mt-3 border-t border-slate-900/[0.05] dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  Configure
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 group-hover:translate-x-1 ${
                    darkMode
                      ? 'bg-white/5 text-white group-hover:bg-sky-500'
                      : 'bg-slate-900/[0.04] text-slate-800 group-hover:bg-sky-500 group-hover:text-white'
                  }`}
                >
                  <ArrowRight size={13} weight="bold" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
