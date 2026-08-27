/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldWarning, 
  Lock, 
  LockOpen, 
  Robot, 
  Sparkle, 
  CheckCircle, 
  Warning, 
  Info, 
  Sun, 
  Thermometer, 
  X
} from '@phosphor-icons/react';
import { ToastNotification } from '../types';
import NotificationRichContent from './notifications/NotificationRichContent';

interface NotificationToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  darkMode: boolean;
}

export default function NotificationToast({ toasts, onDismiss, darkMode }: NotificationToastProps) {
  return (
    <aside 
      id="toast-notification-container"
      aria-label="System Notifications"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-100 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onDismiss={onDismiss} 
            darkMode={darkMode} 
          />
        ))}
      </AnimatePresence>
    </aside>
  );
}

interface ToastItemProps {
  key?: string;
  toast: ToastNotification;
  onDismiss: (id: string) => void;
  darkMode: boolean;
}

function ToastItem({ toast, onDismiss, darkMode }: ToastItemProps) {
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  // Determine icon, accent color, and progress based on type or content
  const getIconAndStyle = () => {
    switch (toast.type) {
      case 'lock': {
        const isLocked = toast.title.toLowerCase().includes('locked');
        return {
          icon: isLocked ? Lock : LockOpen,
          iconColor: isLocked ? 'text-emerald-400' : 'text-amber-400',
          progressColor: isLocked ? 'bg-emerald-500' : 'bg-amber-500'
        };
      }
      case 'vacuum':
        return {
          icon: Robot,
          iconColor: 'text-brand-purple',
          progressColor: 'bg-brand-purple'
        };
      case 'scene':
        return {
          icon: Sparkle,
          iconColor: 'text-purple-400',
          progressColor: 'bg-purple-500'
        };
      case 'light':
        return {
          icon: Sun,
          iconColor: 'text-amber-400',
          progressColor: 'bg-amber-500'
        };
      case 'climate':
        return {
          icon: Thermometer,
          iconColor: 'text-cyan-400',
          progressColor: 'bg-cyan-500'
        };
      case 'security':
        return {
          icon: ShieldWarning,
          iconColor: 'text-rose-400',
          progressColor: 'bg-rose-500'
        };
      case 'warning':
        return {
          icon: Warning,
          iconColor: 'text-amber-400',
          progressColor: 'bg-amber-500'
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-emerald-400',
          progressColor: 'bg-emerald-500'
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-brand-purple',
          progressColor: 'bg-brand-purple'
        };
    }
  };

  const { icon: Icon, iconColor, progressColor } = getIconAndStyle();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.92, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -12, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-2xl transition-colors select-none ${
        darkMode 
          ? 'bg-slate-900/85 border-white/15 text-slate-100 shadow-black/50' 
          : 'bg-white/90 border-white/80 text-slate-800 shadow-slate-300/60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Direct Icon Rendering */}
        <Icon 
          size={24} 
          weight="duotone" 
          className={`${iconColor} shrink-0 mt-0.5`}
        />

        {/* Text Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-xs font-black tracking-tight leading-none ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {toast.title}
            </h4>
            {toast.timestamp && (
              <span className="text-[9px] text-slate-400 font-mono shrink-0">
                {toast.timestamp}
              </span>
            )}
          </div>

          {toast.message && (
            <div className="mt-1">
              <NotificationRichContent
                content={toast.message}
                imageUrl={toast.image}
                darkMode={darkMode}
                compact={true}
              />
            </div>
          )}

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 text-[10px] font-black uppercase tracking-wider text-brand-purple hover:underline cursor-pointer"
            >
              {toast.action.label} &rarr;
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          id={`btn-close-toast-${toast.id}`}
          onClick={() => onDismiss(toast.id)}
          className={`w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            darkMode 
              ? 'text-slate-400 hover:text-white hover:bg-white/15' 
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Dismiss notification"
        >
          <X size={14} weight="duotone" />
        </button>
      </div>

      {/* Auto-Dismiss Progress Shrink Bar */}
      {duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left ${progressColor}`}
        />
      )}
    </motion.div>
  );
}
