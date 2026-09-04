/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Bell,
  ArrowsClockwise,
  Trash,
  ArrowSquareOut,
  CheckCircle,
  Warning,
  ShieldWarning,
  Drop,
  Flame,
  BatteryLow,
  DownloadSimple,
  SkipForward,
  Sparkle,
  Info,
  X,
  MagnifyingGlass,
  Check,
  HouseLine,
  ArrowUUpLeft,
  Broom
} from '@phosphor-icons/react';
import DetailsRightDrawer from '../overview/DetailsRightDrawer';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { extractHANotifications, formatTimeAgo } from '../../services/notificationsService';
import { HANotificationItem, NotificationCategory, HANotificationAction } from '../../types/notifications';
import { haWebSocketService } from '../../services/haWebSocket';
import { useAlertStore } from '../../store/useAlertStore';
import NotificationRichContent from './NotificationRichContent';
import { AnimatedList } from '../ui/animated-list';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

type TabType = 'all' | 'updates' | 'restarts' | 'repairs' | 'notifications' | 'alerts';

export default function NotificationDrawer({
  isOpen,
  onClose,
  darkMode = true
}: NotificationDrawerProps) {
  const {
    domainGroups,
    states,
    nativeNotifications,
    nativeRepairs,
    dismissedNotificationIds,
    callHAService,
    dismissNotification,
    clearAllNotifications,
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
    clearAllNotifications: s.clearAllNotifications,
    updateEntityState: s.updateEntityState,
    installUpdate: s.installUpdate,
    skipUpdate: s.skipUpdate,
    clearSkippedUpdate: s.clearSkippedUpdate
  })));

  const alertStoreAlerts = useAlertStore(s => s.alerts);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract all consolidated notifications
  const allNotifications = useMemo(() => {
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
      clearSkippedUpdate,
      storeAlerts: alertStoreAlerts
    });
  }, [domainGroups, states, nativeNotifications, nativeRepairs, dismissedNotificationIds, callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, alertStoreAlerts]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: allNotifications.length,
      updates: allNotifications.filter(n => n.category === 'update').length,
      restarts: allNotifications.filter(n => n.category === 'restart').length,
      repairs: allNotifications.filter(n => n.category === 'repair').length,
      notifications: allNotifications.filter(n => n.category === 'persistent_notification').length,
      alerts: allNotifications.filter(n => n.category === 'alert' || n.category === 'security' || n.category === 'appliance' || n.category === 'hazard' || n.category === 'battery').length
    };
  }, [allNotifications]);

  // Filtered display list
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(item => {
      // Tab filter
      if (activeTab === 'updates' && item.category !== 'update') return false;
      if (activeTab === 'restarts' && item.category !== 'restart') return false;
      if (activeTab === 'repairs' && item.category !== 'repair') return false;
      if (activeTab === 'notifications' && item.category !== 'persistent_notification') return false;
      if (activeTab === 'alerts' && (item.category === 'update' || item.category === 'restart' || item.category === 'repair' || item.category === 'persistent_notification')) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMessage = item.message.toLowerCase().includes(q);
        const matchesEntity = item.entity_id?.toLowerCase().includes(q);
        const matchesArea = item.areaName?.toLowerCase().includes(q);
        return matchesTitle || matchesMessage || matchesEntity || matchesArea;
      }

      return true;
    });
  }, [allNotifications, activeTab, searchQuery]);

  // Skipped updates
  const skippedUpdates = useMemo(() => {
    return allNotifications.filter(n => n.category === 'update' && n.skippedVersion);
  }, [allNotifications]);

  // Clean only skipped updates
  const handleDismissSkippedUpdates = () => {
    const skippedIds = skippedUpdates.map(n => n.id);
    clearAllNotifications(skippedIds);
  };

  // Batch Dismiss All
  const handleDismissAll = async () => {
    // Dismiss all dismissable items (including skipped updates and alerts)
    const dismissableIds = allNotifications
      .filter(n => n.dismissable)
      .map(n => n.id);

    // Call dismiss services for persistent notifications, issues & alerts
    for (const notif of allNotifications) {
      if (notif.category === 'persistent_notification' && notif.entity_id) {
        await callHAService('persistent_notification', 'dismiss', { notification_id: notif.id }).catch(() => { });
        if (updateEntityState) updateEntityState(notif.entity_id, 'dismissed');
      } else if (notif.category === 'repair' && notif.issueId) {
        await callHAService('repairs', 'ignore_issue', { issue_id: notif.issueId }).catch(() => { });
        if (updateEntityState) updateEntityState(notif.entity_id || '', 'ignored');
      } else if (notif.category === 'alert' && notif.entity_id) {
        await callHAService('alert', 'acknowledge', { entity_id: notif.entity_id }).catch(() => { });
      }
    }

    await useAlertStore.getState().clearAllAlerts().catch(() => { });
    clearAllNotifications(dismissableIds);
  };

  // Batch Install All Updates
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const handleUpdateAll = async () => {
    setIsUpdatingAll(true);
    const updateItems = allNotifications.filter(n => n.category === 'update');
    try {
      for (const item of updateItems) {
        if (item.entity_id) {
          if (installUpdate) {
            installUpdate(item.entity_id);
          } else {
            await callHAService('update', 'install', {}, { entity_id: item.entity_id }).catch(() => { });
          }
          if (updateEntityState) {
            updateEntityState(item.entity_id, 'installing');
          }
          dismissNotification(item.id);
        }
      }
    } finally {
      setTimeout(() => setIsUpdatingAll(false), 800);
    }
  };

  // Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await haWebSocketService.refreshStates();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Safe Action Runner with Loading State
  const runAction = async (actionId: string, fn: () => Promise<void> | void) => {
    setActionLoadingIds(prev => ({ ...prev, [actionId]: true }));
    try {
      await fn();
    } finally {
      setActionLoadingIds(prev => ({ ...prev, [actionId]: false }));
    }
  };

  // Category Icon & Color Resolver
  const getCategoryVisuals = (item: HANotificationItem) => {
    switch (item.category) {
      case 'update':
        return {
          icon: <DownloadSimple size={16} weight="duotone" className="text-sky-500" />,
          badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
          label: 'Update'
        };
      case 'repair':
        return {
          icon: <Warning size={16} weight="duotone" className="text-amber-500" />,
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'Repair'
        };
      case 'hazard':
        if (item.sensorType === 'leak') {
          return {
            icon: <Drop size={16} weight="duotone" className="text-rose-500 animate-pulse" />,
            badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
            label: 'Leak'
          };
        }
        return {
          icon: <Flame size={16} weight="duotone" className="text-rose-500 animate-pulse" />,
          badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
          label: 'Hazard'
        };
      case 'restart':
        return {
          icon: <ArrowsClockwise size={16} weight="bold" className="text-amber-500 dark:text-amber-400" />,
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'Restart'
        };
      case 'battery':
        return {
          icon: <BatteryLow size={16} weight="duotone" className="text-amber-500" />,
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'Battery'
        };
      case 'alert':
        return {
          icon: <Warning size={16} weight="duotone" className="text-amber-500" />,
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'Alert'
        };
      case 'security':
        return {
          icon: <ShieldWarning size={16} weight="duotone" className="text-indigo-500" />,
          badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
          label: 'Security'
        };
      case 'appliance':
        return {
          icon: <Sparkle size={16} weight="duotone" className="text-emerald-500" />,
          badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          label: 'Appliance'
        };
      case 'persistent_notification':
      default:
        return {
          icon: <Info size={16} weight="duotone" className="text-indigo-500" />,
          badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
          label: 'Message'
        };
    }
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle={`${counts.all} active item${counts.all === 1 ? '' : 's'}`}
      icon={<Bell size={20} weight="duotone" className="text-sky-400" />}
      darkMode={darkMode}
    >
      <div className="space-y-3.5 pb-24 sm:pb-6">

        {/* Streamlined Controls Bar: Dynamic Filter Tabs + Quick Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Filter Pills with Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 touch-scroll-container">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'updates', label: 'Updates', count: counts.updates },
              { id: 'alerts', label: 'Alerts', count: counts.alerts },
              ...(counts.restarts > 0 ? [{ id: 'restarts', label: 'Restarts', count: counts.restarts }] : []),
              ...(counts.repairs > 0 ? [{ id: 'repairs', label: 'Issues', count: counts.repairs }] : []),
              ...(counts.notifications > 0 ? [{ id: 'notifications', label: 'Messages', count: counts.notifications }] : [])
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${isActive
                      ? 'bg-sky-500 text-white shadow-xs'
                      : darkMode
                        ? 'bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions (Clean Skipped, Update All, Refresh, Clear All) */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {skippedUpdates.length > 0 && (
              <button
                type="button"
                onClick={handleDismissSkippedUpdates}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${darkMode
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                title="Clean all skipped updates from notifications"
              >
                <Broom size={13} weight="bold" />
                <span>Clean Skipped ({skippedUpdates.length})</span>
              </button>
            )}

            {counts.updates > 0 && (
              <button
                type="button"
                onClick={handleUpdateAll}
                disabled={isUpdatingAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                title="Install all updates"
              >
                <DownloadSimple size={13} weight="bold" className={isUpdatingAll ? 'animate-bounce' : ''} />
                <span>{isUpdatingAll ? 'Updating...' : `Update (${counts.updates})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${darkMode
                  ? 'bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white border-transparent'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
                }`}
              title="Refresh States & Notifications"
            >
              <ArrowsClockwise size={15} className={isRefreshing ? 'animate-spin text-sky-400' : ''} />
            </button>

            {counts.all > 0 && (
              <button
                type="button"
                onClick={handleDismissAll}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${darkMode
                    ? 'bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-rose-400 border-transparent'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-rose-600 border-slate-200/80'
                  }`}
                title="Dismiss all notifications"
              >
                <Trash size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Search Bar (Shown if more than 2 items or search active) */}
        {(counts.all > 2 || searchQuery.length > 0) && (
          <div className="relative w-full">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className={`w-full pl-8.5 pr-8 py-1.5 rounded-xl text-xs transition-all focus:outline-hidden ${darkMode
                  ? 'bg-white/[0.04] text-white placeholder-slate-500 focus:bg-white/[0.07]'
                  : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-slate-200/70'
                }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Notifications List (Clean, Borderless Grouped Items) */}
        <div className="space-y-2.5">
          {filteredNotifications.length === 0 ? (
            /* Empty State */
            <div className={`p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-3 ${darkMode ? 'bg-white/[0.02]' : 'bg-slate-50'
              }`}>
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle size={30} weight="duotone" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  All Systems Clear
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                  {searchQuery
                    ? 'No notifications matching your search filter.'
                    : activeTab === 'updates'
                      ? 'All software and integrations are fully up to date.'
                      : activeTab === 'alerts'
                        ? 'No active hazard, security, or system alerts.'
                        : activeTab === 'all'
                          ? 'No active updates, alerts, or notifications. Your home assistant is fully up-to-date and running smoothly.'
                          : `No items found under ${activeTab}.`}
                </p>
              </div>
            </div>
          ) : (
            <AnimatedList delay={50} className="w-full gap-2">
              {filteredNotifications.map((item) => {
                const visuals = getCategoryVisuals(item);
                const isProgress = item.inProgress;

                // Split actions into primary (header action) and secondary (footer actions)
                const primaryAction = item.actions?.find(a =>
                  a.variant === 'primary' ||
                  a.id === 'install' ||
                  a.id.startsWith('restart_') ||
                  a.id.startsWith('ack_') ||
                  a.id === 'unskip'
                );
                const secondaryActions = (item.actions || []).filter(a => a !== primaryAction);

                const renderActionButton = (act: HANotificationAction, isPrimaryInHeader: boolean) => {
                  const isLoading = actionLoadingIds[act.id];
                  const isUnskip = act.id === 'unskip';
                  const isRestartAction = act.id.startsWith('restart_');
                  const isPrimary = act.variant === 'primary' || act.id === 'install' || isRestartAction || act.id.startsWith('ack_');
                  const isDanger = act.variant === 'danger';

                  return (
                    <button
                      key={act.id}
                      type="button"
                      disabled={isLoading || isProgress}
                      onClick={() => runAction(act.id, act.onClick)}
                      className={`flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isPrimaryInHeader
                          ? isRestartAction
                            ? 'px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs active:scale-95'
                            : isUnskip
                              ? darkMode
                                ? 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 shadow-xs active:scale-95'
                                : 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 shadow-xs active:scale-95'
                              : isPrimary
                                ? 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-xs active:scale-95'
                                : darkMode
                                  ? 'px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 active:scale-95'
                                  : 'px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 active:scale-95'
                          : isDanger
                            ? darkMode
                              ? 'px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-95'
                              : 'px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 active:scale-95'
                            : darkMode
                              ? 'px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 active:scale-95'
                              : 'px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 active:scale-95'
                        }`}
                    >
                      {isLoading ? (
                        <ArrowsClockwise size={11} className="animate-spin" />
                      ) : isRestartAction ? (
                        <ArrowsClockwise size={11} weight="bold" />
                      ) : act.id === 'install' ? (
                        <DownloadSimple size={11} weight="bold" />
                      ) : act.id === 'skip' ? (
                        <SkipForward size={11} weight="bold" />
                      ) : isUnskip ? (
                        <ArrowUUpLeft size={11} weight="bold" />
                      ) : act.id.startsWith('ack_') ? (
                        <Check size={11} weight="bold" />
                      ) : act.id === 'release_notes' || act.id === 'learn_more' ? (
                        <ArrowSquareOut size={11} weight="bold" />
                      ) : null}
                      <span>{act.label}</span>
                    </button>
                  );
                };

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl transition-all duration-200 flex flex-col justify-between gap-1.5 group ${darkMode
                        ? 'bg-white/[0.03] hover:bg-white/[0.055] text-white border border-white/[0.04]'
                        : 'bg-white hover:bg-slate-50/90 text-slate-900 border border-slate-200 shadow-xs'
                      }`}
                  >
                    {/* Row 1: Icon + Title + Category Badge + Primary Action + Time + Dismiss */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-transparent flex items-center justify-center shrink-0">
                          {visuals.icon}
                        </div>

                        <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h4>

                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${visuals.badgeBg.replace(/border[^\s]*/g, '')}`}>
                            {visuals.label}
                          </span>

                          {item.areaName && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              <HouseLine size={10} />
                              {item.areaName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Primary Action + Time Ago + Dismiss */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {primaryAction && renderActionButton(primaryAction, true)}

                        {item.createdAt && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:inline">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        )}

                        {item.dismissable && item.onDismiss && (
                          <button
                            type="button"
                            onClick={() => item.onDismiss && item.onDismiss()}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                            title="Dismiss notification"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Details / Message / Versions + Secondary Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                      {/* Left: Message or Version tags */}
                      <div className="min-w-0 flex-1">
                        {/* Software Update Version Badge */}
                        {item.category === 'update' && (
                          <div className="flex items-center gap-1.5 flex-wrap font-semibold">
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                              <span>{item.installedVersion || 'Current'}</span>
                              <span className="text-slate-400">➔</span>
                              <span className="font-bold text-sky-700 dark:text-sky-400">{item.latestVersion || 'New'}</span>
                            </div>

                            {item.skippedVersion && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-300/80 dark:border-amber-500/20">
                                Skipped
                              </span>
                            )}

                            {item.createdAt && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 sm:hidden">
                                • {formatTimeAgo(item.createdAt)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message / Description Body */}
                        {item.message ? (
                          <div className={item.category === 'update' ? 'pt-1' : ''}>
                            <NotificationRichContent
                              content={item.message}
                              imageUrl={item.image}
                              darkMode={darkMode}
                              compact={true}
                            />
                          </div>
                        ) : null}

                        {/* In Progress Visual Bar */}
                        {isProgress && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-sky-500">
                              <span className="flex items-center gap-1">
                                <ArrowsClockwise size={11} className="animate-spin" />
                                Installing update...
                              </span>
                              <span>{item.updatePercentage ? `${item.updatePercentage}%` : 'In Progress'}</span>
                            </div>
                            <div className="w-full h-1 rounded-full bg-sky-500/20 overflow-hidden">
                              <div
                                className="h-full bg-sky-500 rounded-full animate-pulse transition-all duration-300"
                                style={{ width: item.updatePercentage ? `${item.updatePercentage}%` : '70%' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Secondary Actions (Skip, Release Notes, etc.) */}
                      {secondaryActions.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto pt-0.5">
                          {secondaryActions.map(act => renderActionButton(act, false))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </AnimatedList>
          )}
        </div>

      </div>
    </DetailsRightDrawer>
  );
}
