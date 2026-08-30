/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DetailsRightDrawer:
 * Clean, borderless sidebar drawer / mobile bottom sheet modal.
 * - Desktop/Tablet: Graceful slide-in from right (max-w-lg lg:max-w-xl)
 * - Mobile: Native full-width sheet with top drag handle, safe-area insets, and bottom nav clearance (pb-32)
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, CaretLeft } from '@phosphor-icons/react';

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
        <div className="fixed inset-0 z-9999 overflow-hidden">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Slide-over Container: Full width on mobile, right-aligned on tablet/desktop */}
          <div className="fixed inset-y-0 right-0 flex max-w-full w-full sm:w-auto pointer-events-none z-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.8 }}
              className={`pointer-events-auto w-full sm:w-[480px] lg:w-[540px] xl:w-[580px] h-full backdrop-blur-3xl shadow-2xl flex flex-col overflow-hidden transition-colors ${
                darkMode
                  ? 'bg-slate-950/95 text-white shadow-black/90'
                  : 'bg-white/95 text-slate-900 shadow-2xl'
              }`}
            >
              {/* Top Mobile Grab Handle */}
              <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-slate-400/30 dark:bg-white/20" />
              </div>

              {/* Sidebar Header (Clean & Borderless) */}
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden p-1.5 -ml-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>

                  {icon && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center shrink-0 shadow-xs">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/15 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                  title="Close"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Scrollable Body: pb-32 on mobile for bottom bar clearance */}
              <div className="flex-1 px-4 py-3 sm:px-6 sm:py-5 overflow-y-auto space-y-4 pb-32 sm:pb-6 touch-scroll-container">
                {children}
              </div>

              {/* Optional Footer */}
              {footerActions && (
                <div className="p-4 flex justify-end gap-3 bg-white/40 dark:bg-black/40 backdrop-blur-xs shrink-0">
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
