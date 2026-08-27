import React, { useEffect } from 'react';
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
}

export default function DetailsRightDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footerActions
}: DetailsRightDrawerProps) {
  // Close on Escape key press
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
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Right Sidebar Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="pointer-events-auto w-screen max-w-md sm:max-w-lg lg:max-w-xl h-full bg-[#0B0F19]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl text-white flex flex-col z-50 overflow-hidden"
            >
              {/* Top Accent Gradient Border */}
              <div className="h-1 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0" />

              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/2 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  {icon && (
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-sm">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-white tracking-tight truncate">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                  title="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Sidebar Body */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 touch-scroll-container">
                {children}
              </div>

              {/* Optional Footer */}
              {footerActions && (
                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-slate-950/60 backdrop-blur-sm shrink-0">
                  {footerActions}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
