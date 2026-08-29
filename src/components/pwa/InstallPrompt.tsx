/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * In-App PWA Install Prompt
 * Handles Chromium (native beforeinstallprompt) and iOS Safari (Share -> Add to Home Screen instructions)
 * Strictly hides when already running in standalone PWA mode.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DownloadSimple, 
  Export, 
  X, 
  Sparkle, 
  DeviceMobile, 
  Desktop 
} from '@phosphor-icons/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      return isStandaloneMedia || isIosStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);
    if (standalone) return;

    // 2. Check dismissal state from localStorage (expire after 7 days so user can reconsider)
    const dismissedAt = localStorage.getItem('homz_pwa_install_dismissed');
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (days < 7) {
        setIsDismissed(true);
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    setIsIos(isIosDevice && isSafari);

    // 4. Listen for Chromium beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for display mode changes (e.g. if installed mid-session)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const dismissPrompt = () => {
    setIsDismissed(true);
    setShowIosGuide(false);
    localStorage.setItem('homz_pwa_install_dismissed', Date.now().toString());
  };

  // Do not render if installed as standalone, dismissed, or unsupported
  if (isStandalone || isDismissed) {
    return null;
  }

  // Chromium Install Prompt (Desktop & Android)
  if (deferredPrompt) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 sm:left-auto sm:right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto"
        >
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 dark:bg-black/85 backdrop-blur-xl border border-sky-500/30 dark:border-white/15 text-white shadow-2xl shadow-sky-500/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-sky-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkle size={20} weight="fill" className="text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                  <span>Install HOMZ App</span>
                  <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 text-[9px] font-mono font-bold">PWA</span>
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Standalone dock & home screen experience
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/30 transition-all cursor-pointer active:scale-95"
              >
                <DownloadSimple size={14} weight="bold" />
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={dismissPrompt}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // iOS Safari Install Guidance Banner
  if (isIos) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm mx-auto sm:mx-0"
        >
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/95 dark:bg-black/90 backdrop-blur-xl border border-sky-500/30 dark:border-white/15 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-sky-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Sparkle size={18} weight="fill" className="text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight text-white">
                    Add HOMZ to Home Screen
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Fast native launch without Safari bars
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissPrompt}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                Tap <Export size={15} weight="bold" className="text-sky-400 inline mx-0.5" /> then <strong className="text-white font-semibold">"Add to Home Screen"</strong>
              </span>
              <button
                type="button"
                onClick={dismissPrompt}
                className="text-xs text-sky-400 font-bold hover:underline cursor-pointer ml-2"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
};

export default InstallPrompt;
