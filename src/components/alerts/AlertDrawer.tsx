/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Alert & Event Center Slide-Over Drawer
 * Displays active events, alerts, and Home Assistant persistent notifications.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  Trash,
  CheckCircle,
  Flame,
  Warning,
  ShieldCheck,
  Funnel,
  Sparkle
} from '@phosphor-icons/react';
import { useAlertStore, AlertItem as AlertItemType, AlertSeverity } from '../../store/useAlertStore';
import AlertItem from './AlertItem';

interface AlertDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'critical' | 'warning' | 'persistent_notification';

export const AlertDrawer: React.FC<AlertDrawerProps> = ({ isOpen, onClose }) => {
  const { alerts, dismissAlert, clearAllAlerts, markAllAsRead } = useAlertStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Filter alerts by active category tab
  const filteredAlerts = useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return alerts.filter((a) => a.severity === 'critical');
      case 'warning':
        return alerts.filter((a) => a.severity === 'warning');
      case 'persistent_notification':
        return alerts.filter((a) => a.category === 'persistent_notification');
      case 'all':
      default:
        return alerts;
    }
  }, [alerts, activeTab]);

  const counts = useMemo(() => {
    return {
      all: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      persistent: alerts.filter((a) => a.category === 'persistent_notification').length
    };
  }, [alerts]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md h-full bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden text-white"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Bell size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Event & Alert Center
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {alerts.length} active notification{alerts.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearAllAlerts()}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                    title="Clear and dismiss all alerts from dashboard & Home Assistant"
                  >
                    <Trash size={14} weight="bold" />
                    <span className="hidden sm:inline">Clear All</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                  title="Close Alert Center"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  activeTab === 'all'
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                All ({counts.all})
              </button>

              {counts.critical > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('critical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-1 ${
                    activeTab === 'critical'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                >
                  <Flame size={13} weight="fill" />
                  <span>Critical ({counts.critical})</span>
                </button>
              )}

              {counts.warning > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('warning')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-1 ${
                    activeTab === 'warning'
                      ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <Warning size={13} weight="fill" />
                  <span>Warnings ({counts.warning})</span>
                </button>
              )}

              {counts.persistent > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('persistent_notification')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    activeTab === 'persistent_notification'
                      ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  HA Persistent ({counts.persistent})
                </button>
              )}
            </div>

            {/* Alert List View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredAlerts.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-emerald-400">
                    <ShieldCheck size={40} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">All Clear</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      No active alerts or notifications right now. Everything is running smoothly.
                    </p>
                  </div>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={(id, haId) => dismissAlert(id, haId)}
                  />
                ))
              )}
            </div>

            {/* Footer Status */}
            <div className="p-4 border-t border-white/10 bg-slate-900/40 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Dismissing persistent alerts syncs directly to Home Assistant
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AlertDrawer;
