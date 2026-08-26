/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Sun, 
  Thermometer, 
  X, 
  Camera, 
  Bell, 
  Zap,
  Sliders
} from 'lucide-react';
import { ToastNotification } from '../types';

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
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
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

  // Determine icon, accent color, and badge based on type or content
  const getIconAndStyle = () => {
    switch (toast.type) {
      case 'lock': {
        const isLocked = toast.title.toLowerCase().includes('locked');
        return {
          icon: isLocked ? Lock : Unlock,
          iconColor: isLocked ? 'text-emerald-400' : 'text-amber-400',
          badgeBg: isLocked 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
            : 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          progressColor: isLocked ? 'bg-emerald-500' : 'bg-amber-500'
        };
      }
      case 'vacuum':
        return {
          icon: Bot,
          iconColor: 'text-[#9D8BFF]',
          badgeBg: 'bg-[#7B61FF]/15 border-[#7B61FF]/30 text-[#9D8BFF]',
          progressColor: 'bg-[#7B61FF]'
        };
      case 'scene':
        return {
          icon: Sparkles,
          iconColor: 'text-purple-400',
          badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
          progressColor: 'bg-purple-500'
        };
      case 'light':
        return {
          icon: Sun,
          iconColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          progressColor: 'bg-amber-500'
        };
      case 'climate':
        return {
          icon: Thermometer,
          iconColor: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
          progressColor: 'bg-cyan-500'
        };
      case 'security':
        return {
          icon: ShieldAlert,
          iconColor: 'text-rose-400',
          badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          progressColor: 'bg-rose-500'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          progressColor: 'bg-amber-500'
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          progressColor: 'bg-emerald-500'
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600',
          badgeBg: darkMode 
            ? 'bg-indigo-500/15 border-indigo-500/30 text-[#9D8BFF]' 
            : 'bg-indigo-50 border-indigo-100 text-indigo-700',
          progressColor: 'bg-[#7B61FF]'
        };
    }
  };

  const { icon: Icon, iconColor, badgeBg, progressColor } = getIconAndStyle();

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
        {/* Type Icon container */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
          <Icon size={18} className={iconColor} />
        </div>

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
            <p className="text-[11px] text-slate-400 mt-1 leading-snug break-words">
              {toast.message}
            </p>
          )}

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="mt-2 text-[10px] font-black uppercase tracking-wider text-[#7B61FF] hover:underline cursor-pointer"
            >
              {toast.action.label} &rarr;
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          id={`btn-close-toast-${toast.id}`}
          onClick={() => onDismiss(toast.id)}
          className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
            darkMode 
              ? 'text-slate-400 hover:text-white hover:bg-white/10' 
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Dismiss notification"
        >
          <X size={14} />
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
