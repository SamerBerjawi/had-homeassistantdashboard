/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Dashboard Header Component
 * Sticky responsive header featuring dynamic page icon/title, navigation controls,
 * synchronization status, manual refresh trigger, and the Event & Alert Center Notification Bell.
 */

import React from 'react';
import {
  ArrowLeft,
  ArrowsClockwise,
  Bell,
  Flame,
  Warning
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import { useAlertStore } from '../../store/useAlertStore';

interface HeaderProps {
  pageTitle: string;
  activeTab: string;
  darkMode?: boolean;
  selectedAreaId?: string | null;
  selectedSettingsSection?: string | null;
  currentSelectedArea?: any;
  currentSettingsMeta?: any;
  currentTheme?: any;
  PageIcon?: any;
  syncStatus?: 'synced' | 'syncing' | 'offline_fallback' | 'error';
  isManualRefreshing?: boolean;
  onBack?: () => void;
  onManualRefresh?: () => void;
  onOpenAlerts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  activeTab,
  darkMode = true,
  selectedAreaId,
  selectedSettingsSection,
  currentSelectedArea,
  currentSettingsMeta,
  currentTheme = { color: 'text-sky-400' },
  PageIcon,
  syncStatus = 'synced',
  isManualRefreshing = false,
  onBack,
  onManualRefresh,
  onOpenAlerts
}) => {
  const { alerts, toggleDrawer } = useAlertStore();

  const handleBellClick = () => {
    if (onOpenAlerts) {
      onOpenAlerts();
    } else {
      toggleDrawer();
    }
  };

  // Compute unread alert counts
  const totalAlerts = alerts.length;
  const hasCritical = alerts.some((a) => a.severity === 'critical');
  const hasWarning = alerts.some((a) => a.severity === 'warning');

  // Badge styling based on highest severity
  const bellBadgeStyle = hasCritical
    ? 'bg-rose-500 text-white animate-bounce ring-2 ring-rose-400/60 shadow-rose-500/50'
    : hasWarning
    ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-400/60 shadow-amber-500/40'
    : 'bg-sky-500 text-white ring-2 ring-sky-400/60 shadow-sky-500/40';

  return (
    <header className="mb-6 flex flex-col gap-3 pb-1 w-full select-none">
      {/* Top Row: Title on Left, Global Action Controls on Right */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Left: Back Button + Dynamic Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
          {/* Back Button when viewing room detail or settings subpage */}
          {((activeTab === 'rooms' && selectedAreaId) || (activeTab === 'settings' && selectedSettingsSection)) && onBack && (
            <button
              type="button"
              onClick={onBack}
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
              ) : PageIcon ? (
                <PageIcon size={30} weight="duotone" className={`${currentTheme.color} shrink-0`} />
              ) : null
            )}
            <span>{pageTitle}</span>
            {activeTab === 'overview' && (
              <span className="inline-block animate-wave cursor-default select-none text-2xl sm:text-3xl" title="Welcome!">👋</span>
            )}
          </h1>
        </div>

        {/* Right: Global Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Offline Fallback Cache Indicator */}
          {syncStatus === 'offline_fallback' && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold backdrop-blur-sm animate-pulse"
              title="Dashboard working offline using local storage cache."
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="hidden sm:inline">Offline Cache</span>
            </div>
          )}

          {/* Syncing Indicator */}
          {syncStatus === 'syncing' && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-semibold backdrop-blur-sm animate-pulse"
              title="Synchronizing configuration across devices..."
            >
              <ArrowsClockwise size={14} className="animate-spin text-sky-500 dark:text-sky-400" />
              <span className="hidden sm:inline">Syncing…</span>
            </div>
          )}

          {/* Manual Refresh Button */}
          {onManualRefresh && (
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isManualRefreshing}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center ${
                isManualRefreshing
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
          )}

          {/* Notification Bell with Dynamic Unread Counter Badge */}
          <button
            type="button"
            onClick={handleBellClick}
            className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center ${
              totalAlerts > 0
                ? hasCritical
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/20'
                  : hasWarning
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/20'
                  : 'bg-sky-500/15 border-sky-500/40 text-sky-400 shadow-sm shadow-sky-500/20'
                : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-400 hover:text-slate-200 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
            }`}
            title={`${totalAlerts} Active Notification${totalAlerts === 1 ? '' : 's'}`}
          >
            {hasCritical ? (
              <Flame size={18} weight="fill" className="text-rose-400 animate-pulse" />
            ) : hasWarning ? (
              <Warning size={18} weight="fill" className="text-amber-400" />
            ) : (
              <Bell size={18} weight={totalAlerts > 0 ? 'duotone' : 'regular'} />
            )}

            {/* Live Count Pill Badge */}
            {totalAlerts > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-md ${bellBadgeStyle}`}
              >
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
