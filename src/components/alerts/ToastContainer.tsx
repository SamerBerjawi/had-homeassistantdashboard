/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Translucent Glassmorphic Real-Time Toast Alerts
 * Powered by MagicUI AnimatedList, smooth GPU scaleX countdown animations,
 * and high-contrast Phosphor Icons.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Warning,
  Flame,
  Drop,
  Bell,
  CheckCircle,
  LockKey,
  LockKeyOpen,
  Door,
  DoorOpen,
  Garage,
  WashingMachine,
  Siren
} from '@phosphor-icons/react';
import { useAlertStore, AlertToast, AlertSeverity } from '../../store/useAlertStore';
import { AnimatedList } from '../ui/animated-list';

/**
 * Custom 4-pane Window icon styled to perfectly match Phosphor's 256x256 duotone icons.
 */
function WindowIcon({ size = 18, weight = 'duotone', className = '' }: { size?: number; weight?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      className={className}
    >
      <rect
        x="36"
        y="40"
        width="184"
        height="176"
        rx="16"
        fill="currentColor"
        opacity={weight === 'duotone' ? 0.22 : 0}
      />
      <rect
        x="36"
        y="40"
        width="184"
        height="176"
        rx="16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="128"
        y1="40"
        x2="128"
        y2="216"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <line
        x1="36"
        y1="128"
        x2="220"
        y2="128"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </svg>
  );
}

/**
 * Strips emoji characters from titles so only clean typography is displayed.
 */
function cleanAlertTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu, '')
    .trim();
}

/**
 * Resolves the appropriate Phosphor Icon based on iconType, category, or title keywords.
 */
function resolvePhosphorIcon(toast: AlertToast) {
  const iconType = toast.iconType;
  const lowerTitle = toast.title.toLowerCase();

  if (iconType === 'window' || lowerTitle.includes('window')) {
    return <WindowIcon size={19} weight="duotone" className="text-sky-500 dark:text-sky-400" />;
  }
  if (iconType === 'door' || (lowerTitle.includes('door') && !lowerTitle.includes('garage') && !lowerTitle.includes('lock'))) {
    if (lowerTitle.includes('open')) {
      return <DoorOpen size={19} weight="duotone" className="text-amber-500 dark:text-amber-400" />;
    }
    return <Door size={19} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />;
  }
  if (iconType === 'lock_open' || (lowerTitle.includes('lock') && lowerTitle.includes('unlock'))) {
    return <LockKeyOpen size={19} weight="duotone" className="text-amber-500 dark:text-amber-400" />;
  }
  if (iconType === 'lock' || lowerTitle.includes('lock')) {
    return <LockKey size={19} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />;
  }
  if (iconType === 'garage' || lowerTitle.includes('garage')) {
    return <Garage size={19} weight="duotone" className="text-amber-500 dark:text-amber-400" />;
  }
  if (iconType === 'appliance' || lowerTitle.includes('wash') || lowerTitle.includes('dryer') || lowerTitle.includes('laundry')) {
    return <WashingMachine size={19} weight="duotone" className="text-sky-500 dark:text-sky-400" />;
  }
  if (iconType === 'smoke' || lowerTitle.includes('smoke')) {
    return <Flame size={19} weight="fill" className="text-rose-500 animate-pulse" />;
  }
  if (iconType === 'moisture' || lowerTitle.includes('water') || lowerTitle.includes('leak')) {
    return <Drop size={19} weight="fill" className="text-sky-500" />;
  }
  if (iconType === 'alarm' || lowerTitle.includes('alarm') || lowerTitle.includes('intrusion')) {
    return <Siren size={19} weight="duotone" className="text-rose-500 animate-pulse" />;
  }
  if (toast.severity === 'critical') {
    return <Flame size={19} weight="fill" className="text-rose-500 animate-pulse" />;
  }
  if (toast.severity === 'warning') {
    return <Warning size={19} weight="fill" className="text-amber-500" />;
  }
  return <Bell size={19} weight="duotone" className="text-sky-500 dark:text-sky-400" />;
}

interface ToastItemProps {
  toast: AlertToast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const duration = toast.durationMs || 5000;
  const isInfinite = duration <= 0;

  const [remainingTime, setRemainingTime] = useState<number>(duration);
  const startTimeRef = useRef<number>(Date.now());

  // Handle countdown with pause-on-hover support
  useEffect(() => {
    if (isInfinite || isPaused) return;

    const start = Date.now();
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingTime);

    return () => {
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      setRemainingTime((prev) => Math.max(0, prev - elapsed));
    };
  }, [toast.id, remainingTime, isPaused, isInfinite, onDismiss]);

  const styles = useMemo(() => {
    switch (toast.severity) {
      case 'critical':
        return {
          container:
            'border-rose-500/40 dark:border-rose-500/50 bg-white/80 dark:bg-slate-950/65 shadow-[0_8px_32px_rgba(244,63,94,0.18)] dark:shadow-[0_12px_40px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30',
          badgeBg: 'bg-rose-500/15 dark:bg-rose-500/25 border-rose-500/30 text-rose-600 dark:text-rose-300',
          bar: 'bg-gradient-to-r from-rose-500 to-red-500',
          title: 'text-rose-950 dark:text-rose-100',
          subtitle: 'text-rose-700 dark:text-rose-300/80',
          body: 'text-rose-900/90 dark:text-rose-200/90'
        };
      case 'warning':
        return {
          container:
            'border-amber-500/35 dark:border-amber-500/35 bg-white/75 dark:bg-slate-950/60 shadow-[0_8px_32px_rgba(245,158,11,0.15)] dark:shadow-[0_12px_40px_rgba(245,158,11,0.25)]',
          badgeBg: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400',
          bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
          title: 'text-slate-900 dark:text-white',
          subtitle: 'text-slate-500 dark:text-slate-400',
          body: 'text-slate-600 dark:text-slate-300'
        };
      case 'info':
      default:
        return {
          container:
            'border-sky-500/30 dark:border-white/10 bg-white/75 dark:bg-slate-950/60 shadow-[0_8px_32px_rgba(14,165,233,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
          badgeBg: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30 text-sky-600 dark:text-sky-400',
          bar: 'bg-gradient-to-r from-sky-500 to-blue-500',
          title: 'text-slate-900 dark:text-white',
          subtitle: 'text-slate-500 dark:text-slate-400',
          body: 'text-slate-600 dark:text-slate-300'
        };
    }
  }, [toast.severity]);

  const title = cleanAlertTitle(toast.title);
  const icon = resolvePhosphorIcon(toast);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full rounded-2xl border backdrop-blur-2xl p-3 sm:p-3.5 flex flex-col gap-2 overflow-hidden select-none transition-all duration-200 hover:scale-[1.01] ${styles.container}`}
    >
      {/* Top Header: Icon Badge + Title / Area + Close Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${styles.badgeBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className={`text-sm font-bold truncate leading-snug tracking-tight ${styles.title}`}>
              {title}
            </h4>
            {toast.areaName && (
              <span className={`text-[11px] font-semibold block truncate ${styles.subtitle}`}>
                {toast.areaName}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title="Dismiss notification"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Message Body */}
      {toast.message && (
        <p className={`text-xs leading-relaxed break-words pl-11 ${styles.body}`}>
          {toast.message}
        </p>
      )}

      {/* Optional Action Button */}
      {toast.action && (
        <div className="pl-11 pt-0.5">
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="px-3 py-1 rounded-xl bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900/20 dark:hover:bg-white/20 active:scale-95 text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer"
          >
            {toast.action.label}
          </button>
        </div>
      )}

      {/* Silky-Smooth GPU Composited ScaleX Progress Bar */}
      {!isInfinite && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/[0.04] dark:bg-white/[0.08] overflow-hidden">
          <motion.div
            className={`h-full w-full origin-left ${styles.bar}`}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: isPaused ? undefined : 0 }}
            transition={{
              duration: remainingTime / 1000,
              ease: 'linear'
            }}
            style={{
              transformOrigin: '0% 50%'
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAlertStore();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Alerts"
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
    >
      <AnimatedList delay={80}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatedList>
    </aside>
  );
};

export default ToastContainer;
