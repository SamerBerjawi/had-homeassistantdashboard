/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Bell, ShieldWarning, ArrowUpRight } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { extractHANotifications } from '../../services/notificationsService';

interface NotificationBellProps {
  darkMode?: boolean;
  onClick: () => void;
  className?: string;
  variant?: 'icon-button' | 'pill-badge';
}

export default function NotificationBell({
  darkMode = true,
  onClick,
  className = '',
  variant = 'icon-button'
}: NotificationBellProps) {
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
  } = useAutoLayoutStore();

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

  const totalCount = notifications.length;

  const hasCritical = notifications.some(n => n.severity === 'critical');
  const hasWarning = notifications.some(n => n.severity === 'warning' || n.severity === 'error');
  const hasUpdates = notifications.some(n => n.category === 'update' && !n.skippedVersion);
  const updatesCount = notifications.filter(n => n.category === 'update' && !n.skippedVersion).length;

  // Highest severity color determination
  const badgeColorClass = hasCritical
    ? 'bg-rose-500 text-white animate-bounce ring-rose-400/50'
    : hasWarning
      ? 'bg-amber-500 text-white animate-pulse ring-amber-400/50'
      : hasUpdates
        ? 'bg-sky-500 text-white ring-sky-400/50'
        : 'bg-indigo-500 text-white ring-indigo-400/50';

  if (variant === 'pill-badge') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
          totalCount > 0
            ? hasCritical
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/50 shadow-xs'
              : hasWarning
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs'
                : hasUpdates
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40 shadow-xs'
                  : darkMode
                    ? 'bg-white/10 hover:bg-white/15 text-white border-white/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            : darkMode
              ? 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
        } ${className}`}
        title={`${totalCount} Notifications & Updates`}
      >
        <div className="relative flex items-center justify-center">
          {hasCritical ? (
            <ShieldWarning size={16} weight="duotone" className="text-rose-500 animate-pulse" />
          ) : (
            <Bell size={16} weight={totalCount > 0 ? 'duotone' : 'regular'} className={totalCount > 0 ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'} />
          )}
          {totalCount > 0 && (
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${badgeColorClass}`} />
          )}
        </div>
        <span>
          {totalCount > 0 
            ? hasUpdates 
              ? `${updatesCount} Update${updatesCount === 1 ? '' : 's'}` 
              : `${totalCount} Alert${totalCount === 1 ? '' : 's'}`
            : 'Alerts (0)'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications and Alerts: ${totalCount} items`}
      className={`relative w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-200 cursor-pointer group shadow-sm hover:scale-105 active:scale-95 ${
        totalCount > 0
          ? hasCritical
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 shadow-rose-500/20 animate-pulse'
            : hasWarning
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 shadow-amber-500/20'
              : hasUpdates
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-500 dark:text-sky-400 shadow-sky-500/20'
                : darkMode
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          : darkMode
            ? 'bg-slate-900/60 hover:bg-slate-900 border-white/10 hover:border-white/20 text-slate-400 hover:text-white'
            : 'bg-white/80 hover:bg-white border-slate-200 text-slate-600 hover:text-slate-900'
      } ${className}`}
      title={totalCount > 0 ? `${totalCount} Notifications, Updates & Alerts` : 'Notifications (All Clear)'}
    >
      <Bell
        size={20}
        weight={totalCount > 0 ? 'duotone' : 'regular'}
        className={`transition-transform duration-300 ${totalCount > 0 ? 'group-hover:rotate-12' : ''}`}
      />

      {totalCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ring-2 ${
            darkMode ? 'ring-slate-950' : 'ring-white'
          } ${badgeColorClass}`}
        >
          {totalCount > 99 ? '99+' : totalCount}
        </span>
      )}
    </button>
  );
}
