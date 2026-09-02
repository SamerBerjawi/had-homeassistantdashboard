/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Full-Screen Loading Page
 * Displays a prominent animated circular progress ring, live loading status,
 * and a small textnote to enter demo mode without rendering any demo environment.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AnimatedCircularProgressBar } from './animated-circular-progress-bar';
import { ArrowsClockwise, HouseLine, Sparkle, WifiHigh, WarningCircle } from '@phosphor-icons/react';

interface FullScreenLoadingPageProps {
  progress: number;
  serverUrl?: string;
  connectionStatus?: string;
  connectionError?: string | null;
  onEnterDemoMode: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function FullScreenLoadingPage({
  progress,
  serverUrl,
  connectionStatus = 'connecting',
  connectionError,
  onEnterDemoMode,
  onRetry,
  isRetrying = false
}: FullScreenLoadingPageProps) {
  const [showDelayedHint, setShowDelayedHint] = useState(false);

  // If connection takes longer than 5 seconds, show a helpful status hint & retry button
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDelayedHint(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Format clean display server URL
  const cleanServerUrl = serverUrl
    ? serverUrl.replace(/^wss?:\/\//, '').replace(/^https?:\/\//, '').replace(/\/api\/websocket$/, '')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden bg-slate-950 text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full bg-sky-500/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />

      {/* Top Branding Header */}
      <div className="w-full flex items-center justify-center pt-2 relative z-10">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xs">
          <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <HouseLine size={18} weight="duotone" />
          </div>
          <span className="text-sm font-black tracking-widest text-slate-200 uppercase">
            HOMZ
          </span>
          <span className="text-slate-600 font-bold">•</span>
          <span className="text-xs font-semibold text-slate-400">
            Smart Home Dashboard
          </span>
        </div>
      </div>

      {/* Center Section: Progress Ring & Loading Note */}
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center px-4 relative z-10 -mt-6 sm:-mt-8">
        {/* Glowing Container around Progress Ring */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Subtle pulsating halo */}
          <div className="absolute inset-0 m-auto size-36 sm:size-44 rounded-full bg-sky-500/20 blur-xl animate-pulse pointer-events-none" />

          <AnimatedCircularProgressBar
            max={100}
            min={0}
            value={progress}
            gaugePrimaryColor="#0ea5e9"
            gaugeSecondaryColor="rgba(14, 165, 233, 0.15)"
            className="size-32 sm:size-40 text-2xl sm:text-3xl font-black text-sky-400 drop-shadow-[0_0_12px_rgba(14,165,233,0.4)]"
          />
        </div>

        {/* Note that the app is loading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2.5"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Loading Home Assistant
            </h2>
          </div>

          <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            Connecting to your smart home environment and synchronizing live entity states...
          </p>

          {/* Connection Target Server Badge */}
          {cleanServerUrl && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px] mt-1 shadow-2xs">
              <WifiHigh size={14} weight="bold" className="text-sky-400 animate-pulse" />
              <span className="truncate max-w-[220px] sm:max-w-[280px]">{cleanServerUrl}</span>
            </div>
          )}

          {/* Error notice if connection error occurred */}
          {connectionError && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium pt-1">
              <WarningCircle size={15} weight="fill" />
              <span className="truncate max-w-xs">{connectionError}</span>
            </div>
          )}

          {/* Delayed Hint & Retry Action if taking longer */}
          {showDelayedHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pt-3 flex flex-col items-center gap-2"
            >
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <ArrowsClockwise size={14} weight="bold" className={isRetrying ? 'animate-spin text-sky-400' : ''} />
                  <span>{isRetrying ? 'Reconnecting...' : 'Retry Connection'}</span>
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom Section: Small Textnote to Enter Demo Mode */}
      <div className="w-full flex flex-col items-center justify-center pb-2 relative z-10">
        <p className="text-xs sm:text-sm text-slate-400 text-center flex items-center gap-1.5 flex-wrap justify-center">
          <span>Exploring without a live server?</span>
          <button
            type="button"
            onClick={onEnterDemoMode}
            className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-4 hover:decoration-amber-300 transition-colors cursor-pointer inline-flex items-center gap-1 active:scale-95"
          >
            <Sparkle size={14} weight="fill" />
            <span>Enter Demo Mode</span>
          </button>
        </p>
      </div>
    </div>
  );
}
