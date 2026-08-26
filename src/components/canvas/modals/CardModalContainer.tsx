/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';

interface CardModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  footerActions?: React.ReactNode;
}

export default function CardModalContainer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-xl',
  footerActions
}: CardModalContainerProps) {
  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Scrim / Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidth} rounded-3xl overflow-hidden bg-slate-900/80 backdrop-blur-md backdrop-saturate-150 border border-white/15 shadow-2xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15)] text-white z-10 my-auto`}
          >
            {/* Top Refractive Highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="shrink-0 flex items-center justify-center">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-white tracking-tight truncate">{title}</h3>
                  {subtitle && (
                    <p className="text-xs text-slate-400 font-medium truncate">{subtitle}</p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Close"
              >
                <X size={18} weight="duotone" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto touch-scroll-container">
              {children}
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-slate-950/40 backdrop-blur-sm">
              {footerActions ? (
                footerActions
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
