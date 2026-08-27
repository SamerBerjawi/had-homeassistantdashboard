import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';

interface DetailsRightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  darkMode?: boolean;
}

export default function DetailsRightDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footerActions,
  darkMode = true
}: DetailsRightDrawerProps) {
  // Prevent body scrolling when open without layout shifts
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const content = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-9999 overflow-hidden isolate" style={{ contain: 'paint' }}>
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Slide-over Right Sidebar Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-8 pointer-events-none z-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
              className={`pointer-events-auto w-screen max-w-md sm:max-w-lg lg:max-w-xl h-full backdrop-blur-2xl border-l shadow-2xl flex flex-col overflow-hidden transition-colors ${
                darkMode
                  ? 'bg-[#0B0F19]/95 border-white/10 text-white shadow-black/80'
                  : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
              }`}
            >
              {/* Top Accent Gradient Line */}
              <div className="h-1.5 w-full bg-linear-to-r from-sky-500 via-indigo-500 to-purple-500 shrink-0" />

              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  {icon && (
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 flex items-center justify-center shrink-0 shadow-xs">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                  title="Close sidebar"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Scrollable Sidebar Body */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 touch-scroll-container">
                {children}
              </div>

              {/* Optional Footer */}
              {footerActions && (
                <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-sm shrink-0">
                  {footerActions}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
