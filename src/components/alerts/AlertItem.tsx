/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Individual Alert Item for Notification Drawer and Event Center
 */

import React from 'react';
import {
  Flame,
  Warning,
  Bell,
  Check,
  X,
  ShieldWarning,
  Clock,
  MapPin
} from '@phosphor-icons/react';
import { AlertItem as AlertItemType, AlertSeverity } from '../../store/useAlertStore';

interface AlertItemProps {
  alert: AlertItemType;
  onDismiss: (id: string, haNotificationId?: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const AlertItem: React.FC<AlertItemProps> = ({ alert, onDismiss }) => {
  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <Flame size={16} weight="fill" className="text-rose-400 animate-pulse" />,
          cardBg: 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
        };
      case 'warning':
        return {
          icon: <Warning size={16} weight="fill" className="text-amber-400" />,
          cardBg: 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
      case 'info':
      default:
        return {
          icon: <Bell size={16} weight="duotone" className="text-sky-400" />,
          cardBg: 'bg-slate-800/30 dark:bg-white/3 border-slate-700/50 dark:border-white/10 hover:border-white/20',
          badge: 'bg-sky-500/15 text-sky-300 border-sky-500/25'
        };
    }
  };

  const styles = getSeverityBadge(alert.severity);

  return (
    <div
      className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-200 flex flex-col gap-2.5 ${styles.cardBg}`}
    >
      {/* Top Meta Header: Severity Icon + Title + Time + Dismiss Action */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-slate-900/60 dark:bg-black/50 border border-white/10 shrink-0">
            {styles.icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate leading-snug">
              {alert.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={12} weight="regular" />
                <span>{formatRelativeTime(alert.timestamp)}</span>
              </span>
              {alert.areaName && (
                <span className="flex items-center gap-1 text-slate-400">
                  <span>•</span>
                  <MapPin size={12} weight="fill" className="text-indigo-400" />
                  <span className="truncate max-w-[120px]">{alert.areaName}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(alert.id, alert.haNotificationId)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0"
          title="Dismiss from dashboard and Home Assistant"
        >
          <X size={15} weight="bold" />
        </button>
      </div>

      {/* Message Body */}
      {alert.message && (
        <p className="text-xs text-slate-300 leading-relaxed break-words pl-11">
          {alert.message}
        </p>
      )}

      {/* Category / Source Tag */}
      <div className="pl-11 flex items-center justify-between pt-1">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${styles.badge}`}
        >
          {alert.category.replace('_', ' ')}
        </span>

        {alert.haNotificationId && (
          <span className="text-[10px] font-mono text-slate-500">
            HA: {alert.haNotificationId}
          </span>
        )}
      </div>
    </div>
  );
};

export default AlertItem;
