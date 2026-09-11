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
            className={`fixed inset-0 backdrop-blur-sm transition-opacity cursor-pointer ${
              darkMode ? 'bg-black/50' : 'bg-slate-950/20'
            }`}
          />

          {/* Slide-over Container: Full width on mobile, right-aligned on tablet/desktop */}
          <div className="fixed inset-y-0 right-0 flex max-w-full w-full sm:w-auto pointer-events-none z-10 pl-0 sm:pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
              className={`pointer-events-auto w-screen max-w-full sm:w-[480px] lg:w-[540px] xl:w-[580px] h-full flex flex-col justify-between overflow-hidden backdrop-blur-2xl transition-all relative ${
                darkMode
                  ? 'bg-black/35 text-slate-100 border-l border-white/10 shadow-2xl shadow-black/50'
                  : 'bg-white/95 text-slate-900 border-l border-slate-200/80 shadow-2xl'
              }`}
            >
              {/* Top Mobile Grab Handle */}
              <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0" aria-hidden="true">
                <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-white/20' : 'bg-slate-300'}`} />
              </div>

              {/* Ambient Top Gradient Glow (matching EntityDetailModal) */}
              <div
                className="absolute top-0 left-0 right-0 h-40 pointer-events-none -z-1 opacity-50"
                style={{
                  background: darkMode
                    ? 'linear-gradient(to bottom, rgba(56, 189, 248, 0.12), transparent)'
                    : 'linear-gradient(to bottom, rgba(56, 189, 248, 0.08), transparent)'
                }}
              />

              {/* Sidebar Header (Translucent Glassmorphic) */}
              <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-sky-500/5 to-transparent shrink-0 backdrop-blur-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Mobile Back button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden p-1.5 -ml-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all"
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>

                  {icon && (
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border ${
                      darkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}>
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
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
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${
                    darkMode
                      ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Close"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Scrollable Body: pb-32 on mobile for bottom bar clearance */}
              <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto space-y-4 pb-32 sm:pb-6 touch-scroll-container">
                {children}
              </div>

              {/* Optional Footer */}
              {footerActions && (
                <div className="p-4 sm:p-5 flex justify-end gap-3 border-t border-slate-200/80 dark:border-white/5 bg-slate-50/90 dark:bg-black/20 backdrop-blur-md shrink-0">
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
