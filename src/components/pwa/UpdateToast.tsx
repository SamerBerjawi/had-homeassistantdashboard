/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * In-App PWA Update Toast
 * Notifies the user when a new Service Worker build is installed in the background.
 * Allows instant refresh to swap in the new version without stale cache issues.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowsClockwise, Sparkle, X } from '@phosphor-icons/react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const UpdateToast: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('[PWA] Service worker registered successfully.');
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration error:', error);
    },
  });

  const handleRefresh = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto"
      >
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur-md border border-sky-500/30 text-white shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30 shadow-xs">
              <Sparkle size={16} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">
                Dashboard Update Ready
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                Tap to refresh and apply latest features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/30 transition-all cursor-pointer active:scale-95"
            >
              <ArrowsClockwise size={13} weight="bold" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Later"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateToast;
