/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Glassmorphic Transient Toast Notifications Container
 * Features Framer Motion slide-in animations, severity-based glass styling,
 * countdown timers, and interactive action triggers.
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Warning,
  Flame,
  Drop,
  Info,
  ShieldWarning,
  Bell,
  CheckCircle,
  Lock,
  LockOpen
} from '@phosphor-icons/react';
import { useAlertStore, AlertToast, AlertSeverity } from '../../store/useAlertStore';

interface ToastItemProps {
  toast: AlertToast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(toast.durationMs || 5000);
  const animFrameRef = useRef<number | null>(null);

  const duration = toast.durationMs || 5000;
  const isInfinite = duration <= 0;

  useEffect(() => {
    if (isInfinite) return;

    let lastTick = Date.now();

    const tick = () => {
      if (!isPaused) {
        const now = Date.now();
        const delta = now - lastTick;
        remainingTimeRef.current -= delta;
        lastTick = now;

        const nextProgress = Math.max(0, (remainingTimeRef.current / duration) * 100);
        setProgress(nextProgress);

        if (remainingTimeRef.current <= 0) {
          onDismiss(toast.id);
          return;
        }
      } else {
        lastTick = Date.now();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [toast.id, duration, isPaused, isInfinite, onDismiss]);

  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'border-rose-500/70 ring-2 ring-rose-500/30 bg-rose-950/60 text-rose-100 shadow-[0_8px_32px_rgba(244,63,94,0.3)]',
          badge: 'bg-rose-500/25 border-rose-500/50 text-rose-300',
          bar: 'bg-rose-500',
          icon: <Flame size={18} weight="fill" className="text-rose-400 animate-pulse shrink-0" />
        };
      case 'warning':
        return {
          container: 'border-amber-500/60 bg-slate-900/90 dark:bg-black/90 text-amber-100 shadow-[0_8px_28px_rgba(245,158,11,0.2)]',
          badge: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          bar: 'bg-amber-500',
          icon: <Warning size={18} weight="fill" className="text-amber-400 shrink-0" />
        };
      case 'info':
      default:
        return {
          container: 'border-sky-500/40 bg-slate-900/90 dark:bg-black/90 text-slate-100 shadow-[0_8px_24px_rgba(14,165,233,0.15)]',
          badge: 'bg-sky-500/20 border-sky-500/30 text-sky-300',
          bar: 'bg-sky-500',
          icon: <Bell size={18} weight="duotone" className="text-sky-400 shrink-0" />
        };
    }
  };

  const styles = getSeverityStyles(toast.severity);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full rounded-2xl border backdrop-blur-2xl p-3.5 flex flex-col gap-2 overflow-hidden select-none transition-all hover:scale-[1.01] ${styles.container}`}
    >
      {/* Top Header: Icon + Title + Close Button */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {styles.icon}
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate leading-snug">{toast.title}</h4>
            {toast.areaName && (
              <span className="text-[10px] font-semibold text-slate-400 block truncate">
                {toast.areaName}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title="Dismiss notification"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Message Body */}
      {toast.message && (
        <p className="text-xs text-slate-300/90 leading-relaxed break-words pl-6">
          {toast.message}
        </p>
      )}

      {/* Optional Quick Action */}
      {toast.action && (
        <div className="pl-6 pt-1">
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            {toast.action.label}
          </button>
        </div>
      )}

      {/* Countdown Progress Bar */}
      {!isInfinite && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div
            className={`h-full transition-all duration-75 ${styles.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAlertStore();

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
