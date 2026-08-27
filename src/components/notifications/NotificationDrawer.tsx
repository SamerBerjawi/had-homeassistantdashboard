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
  HouseLine
} from '@phosphor-icons/react';
import DetailsRightDrawer from '../overview/DetailsRightDrawer';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { extractHANotifications, formatTimeAgo } from '../../services/notificationsService';
import { HANotificationItem, NotificationCategory } from '../../types/notifications';
import { haWebSocketService } from '../../services/haWebSocket';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

type TabType = 'all' | 'updates' | 'repairs' | 'notifications' | 'sensors';

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
      clearSkippedUpdate
    });
  }, [domainGroups, states, nativeNotifications, nativeRepairs, dismissedNotificationIds, callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate]);



  // Counts by category
  const counts = useMemo(() => {
    return {
      all: allNotifications.length,
      updates: allNotifications.filter(n => n.category === 'update').length,
      repairs: allNotifications.filter(n => n.category === 'repair').length,
      notifications: allNotifications.filter(n => n.category === 'persistent_notification').length,
      sensors: allNotifications.filter(n => n.category === 'hazard' || n.category === 'battery' || n.category === 'security').length
    };
  }, [allNotifications]);

  // Filtered display list
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(item => {
      // Tab filter
      if (activeTab === 'updates' && item.category !== 'update') return false;
      if (activeTab === 'repairs' && item.category !== 'repair') return false;
      if (activeTab === 'notifications' && item.category !== 'persistent_notification') return false;
      if (activeTab === 'sensors' && item.category !== 'hazard' && item.category !== 'battery' && item.category !== 'security') return false;

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

  // Batch Dismiss All
  const handleDismissAll = async () => {
    const dismissableIds = allNotifications
      .filter(n => n.dismissable)
      .map(n => n.id);
    
    // Call dismiss services for persistent notifications & issues
    for (const notif of allNotifications) {
      if (notif.category === 'persistent_notification' && notif.entity_id) {
        await callHAService('persistent_notification', 'dismiss', { notification_id: notif.id }).catch(() => {});
        if (updateEntityState) updateEntityState(notif.entity_id, 'dismissed');
      } else if (notif.category === 'repair' && notif.issueId) {
        await callHAService('repairs', 'ignore_issue', { issue_id: notif.issueId }).catch(() => {});
        if (updateEntityState) updateEntityState(notif.entity_id || '', 'ignored');
      }
    }

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
            await callHAService('update', 'install', {}, { entity_id: item.entity_id }).catch(() => {});
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
          icon: <DownloadSimple size={20} weight="duotone" className="text-sky-500" />,
          badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
          label: 'Software Update'
        };
      case 'repair':
        return {
          icon: <Warning size={20} weight="duotone" className="text-amber-500" />,
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'System Repair'
        };
      case 'hazard':
        if (item.sensorType === 'leak') {
          return {
            icon: <Drop size={20} weight="duotone" className="text-rose-500 animate-pulse" />,
            badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
            label: 'Water Leak'
          };
        }
        return {
          icon: <Flame size={20} weight="duotone" className="text-rose-500 animate-pulse" />,
          badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
          label: 'Smoke/Fire Hazard'
        };
      case 'battery':
        return {
          icon: <BatteryLow size={20} weight="duotone" className="text-amber-500" />,
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'Low Battery'
        };
      case 'persistent_notification':
      default:
        return {
          icon: <Info size={20} weight="duotone" className="text-indigo-500" />,
          badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
          label: 'Notification'
        };
    }
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications & Alerts"
      subtitle={`${counts.all} active item${counts.all === 1 ? '' : 's'} from Home Assistant`}
      icon={<Bell size={22} weight="duotone" className="text-sky-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-5 pb-6">
        
        {/* Top Summary Bento Grid (Issues -> Messages -> Updates -> Sensors) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div 
            onClick={() => setActiveTab('repairs')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'repairs'
                ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30'
                : darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Issues</span>
              <Warning size={15} weight="duotone" className="text-amber-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {counts.repairs}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('notifications')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/30'
                : darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Messages</span>
              <Info size={15} weight="duotone" className="text-indigo-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {counts.notifications}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('updates')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-sky-500/15 border-sky-500/40 ring-1 ring-sky-500/30'
                : darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Updates</span>
              <DownloadSimple size={15} weight="duotone" className="text-sky-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {counts.updates}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('sensors')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'sensors'
                ? 'bg-rose-500/15 border-rose-500/40 ring-1 ring-rose-500/30'
                : darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Sensors</span>
              <ShieldWarning size={15} weight="duotone" className="text-rose-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {counts.sensors}
            </div>
          </div>
        </div>

        {/* Action Bar (Refresh + Search + Clear All) */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications, updates..."
              className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs border transition-all focus:outline-hidden ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-sky-500/50 focus:bg-white/10'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {counts.updates > 0 && (
              <button
                type="button"
                onClick={handleUpdateAll}
                disabled={isUpdatingAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white border border-sky-400 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trigger all pending updates in Home Assistant"
              >
                <DownloadSimple size={15} weight="bold" className={isUpdatingAll ? 'animate-bounce' : ''} />
                <span>{isUpdatingAll ? 'Updating...' : `Update All (${counts.updates})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Refresh States & Notifications"
            >
              <ArrowsClockwise size={16} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
            </button>

            {counts.all > 0 && (
              <button
                type="button"
                onClick={handleDismissAll}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-rose-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-rose-700'
                }`}
                title="Dismiss all dismissable notifications"
              >
                <Trash size={15} />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-container">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'repairs', label: 'Issues', count: counts.repairs },
            { id: 'notifications', label: 'Messages', count: counts.notifications },
            { id: 'updates', label: 'Updates', count: counts.updates },
            { id: 'sensors', label: 'Sensors', count: counts.sensors }
          ].map((tab) => {

            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-xs'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="space-y-3.5">
          {filteredNotifications.length === 0 ? (
            /* Empty State */
            <div className={`p-8 rounded-3xl border text-center flex flex-col items-center justify-center gap-3 ${
              darkMode ? 'bg-white/2 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-xs">
                <CheckCircle size={32} weight="duotone" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  All Systems Clear
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                  {searchQuery
                    ? 'No notifications matching your search filter.'
                    : activeTab === 'all'
                      ? 'No active updates, alerts, or notifications. Your home assistant is fully up-to-date and running smoothly.'
                      : `No items found under ${activeTab}.`}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const visuals = getCategoryVisuals(item);
              const isProgress = item.inProgress;

              return (
                <div
                  key={item.id}
                  className={`p-4.5 rounded-3xl border backdrop-blur-xl transition-all duration-200 shadow-sm flex flex-col justify-between gap-3 group hover:border-sky-500/40 ${
                    item.severity === 'critical'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : item.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : item.category === 'update'
                          ? darkMode ? 'bg-sky-950/25 border-sky-500/25' : 'bg-sky-50/70 border-sky-200'
                          : darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Card Header: Icon + Category Badge + Time Ago + Dismiss */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/10 dark:bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {visuals.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${visuals.badgeBg}`}>
                            {visuals.label}
                          </span>

                          {item.areaName && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              <HouseLine size={12} />
                              {item.areaName}
                            </span>
                          )}

                          {item.createdAt && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {formatTimeAgo(item.createdAt)}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {/* Single Dismiss Button */}
                    {item.dismissable && item.onDismiss && (
                      <button
                        type="button"
                        onClick={() => item.onDismiss && item.onDismiss()}
                        className="text-slate-400 hover:text-slate-200 dark:hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                        title="Dismiss"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Message / Description Body */}
                  {item.message ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-11.5">
                      {item.message}
                    </p>
                  ) : null}


                  {/* Software Update Version Badge */}
                  {item.category === 'update' && (
                    <div className="pl-11.5 flex items-center gap-2 flex-wrap text-xs font-semibold">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <span className="text-slate-400">Current:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{item.installedVersion || 'Installed'}</span>
                      </div>

                      <span className="text-slate-400">➔</span>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300">
                        <span>Latest:</span>
                        <span className="font-mono font-bold">{item.latestVersion || 'New'}</span>
                      </div>

                      {item.skippedVersion && (
                        <span className="text-[10px] text-amber-500 font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          Skipped
                        </span>
                      )}
                    </div>
                  )}

                  {/* Update In Progress Visual Bar */}
                  {isProgress && (
                    <div className="pl-11.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-sky-500">
                        <span className="flex items-center gap-1.5">
                          <ArrowsClockwise size={13} className="animate-spin" />
                          Installing update...
                        </span>
                        <span>{item.updatePercentage ? `${item.updatePercentage}%` : 'In Progress'}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-sky-500/20 overflow-hidden">
                        <div 
                          className="h-full bg-sky-500 rounded-full animate-pulse transition-all duration-300"
                          style={{ width: item.updatePercentage ? `${item.updatePercentage}%` : '70%' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions Footer Bar */}
                  {item.actions && item.actions.length > 0 && (
                    <div className="pl-11.5 flex items-center gap-2 flex-wrap pt-1">
                      {item.actions.map((act) => {
                        const isLoading = actionLoadingIds[act.id];
                        const isPrimary = act.variant === 'primary';
                        const isDanger = act.variant === 'danger';

                        return (
                          <button
                            key={act.id}
                            type="button"
                            disabled={isLoading || isProgress}
                            onClick={() => runAction(act.id, act.onClick)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              isPrimary
                                ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-xs active:scale-95'
                                : isDanger
                                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-xs active:scale-95'
                                  : darkMode
                                    ? 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 active:scale-95'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 active:scale-95'
                            }`}
                          >
                            {isLoading ? (
                              <ArrowsClockwise size={13} className="animate-spin" />
                            ) : act.id === 'install' ? (
                              <DownloadSimple size={13} weight="bold" />
                            ) : act.id === 'skip' ? (
                              <SkipForward size={13} weight="bold" />
                            ) : act.id === 'release_notes' || act.id === 'learn_more' ? (
                              <ArrowSquareOut size={13} weight="bold" />
                            ) : null}
                            <span>{act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </DetailsRightDrawer>
  );
}
