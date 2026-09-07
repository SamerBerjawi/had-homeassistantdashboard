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
import { ArrowsClockwise, Sparkle, WifiHigh, WarningCircle, Sun, Moon } from '@phosphor-icons/react';

interface FullScreenLoadingPageProps {
  progress: number;
  serverUrl?: string;
  connectionStatus?: string;
  connectionError?: string | null;
  onEnterDemoMode: () => void;
  onContinue?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
  darkMode?: boolean;
  onToggleTheme?: () => void;
}

export default function FullScreenLoadingPage({
  progress,
  serverUrl,
  connectionStatus = 'connecting',
  connectionError,
  onEnterDemoMode,
  onContinue,
  onRetry,
  isRetrying = false,
  darkMode,
  onToggleTheme
}: FullScreenLoadingPageProps) {
  const [showDelayedHint, setShowDelayedHint] = useState(false);

  // Local fallback for dark mode if not explicitly provided as prop
  const [localDarkMode, setLocalDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_mode');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const isDark = darkMode !== undefined ? darkMode : localDarkMode;

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = !isDark;
      setLocalDarkMode(next);
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme_mode', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme_mode', 'light');
      }
    }
  };

  // If connection takes longer than 3 seconds, show a helpful status hint & action buttons
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDelayedHint(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Format clean display server URL
  const cleanServerUrl = serverUrl
    ? serverUrl.replace(/^wss?:\/\//, '').replace(/^https?:\/\//, '').replace(/\/api\/websocket$/, '')
    : null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Ambient background glows */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full blur-[140px] pointer-events-none transition-all duration-300 ${
        isDark ? 'bg-sky-500/15' : 'bg-sky-400/20'
      }`} />
      <div className={`absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[130px] pointer-events-none transition-all duration-300 ${
        isDark ? 'bg-cyan-500/10' : 'bg-cyan-400/20'
      }`} />

      {/* Top Header: Branding + Theme Toggle */}
      <div className="w-full flex items-center justify-between pt-2 relative z-10 max-w-4xl">
        <div className="w-10 sm:w-12" /> {/* Left spacer for symmetrical balance */}

        {/* Center Branding Pill */}
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-xs transition-colors duration-300 ${
          isDark
            ? 'bg-white/5 border-white/10'
            : 'bg-white/80 border-slate-200/80 shadow-sm'
        }`}>
          <img src="/app-icon.png" alt="HAD" className="w-7 h-7 rounded-lg object-contain shadow-xs" />
          <span className={`text-sm font-black tracking-widest uppercase ${
            isDark ? 'text-slate-200' : 'text-slate-900'
          }`}>
            HAD
          </span>
          <span className={`font-bold ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <span className={`text-xs font-semibold ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Home Assistant Dashboard
          </span>
        </div>

        {/* Right Action: Light / Dark Mode Toggle */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs ${
            isDark
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-300'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-amber-500 shadow-sm'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme mode"
        >
          {isDark ? (
            <Sun size={20} weight="duotone" />
          ) : (
            <Moon size={20} weight="duotone" />
          )}
        </button>
      </div>

      {/* Center Section: Progress Ring & Loading Note */}
      <div className="flex flex-col items-center justify-center max-w-md w-full text-center px-4 relative z-10 -mt-6 sm:-mt-8">
        {/* Glowing Container around Progress Ring */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Subtle pulsating halo */}
          <div className={`absolute inset-0 m-auto size-36 sm:size-44 rounded-full blur-xl animate-pulse pointer-events-none transition-colors duration-300 ${
            isDark ? 'bg-sky-500/20' : 'bg-sky-400/25'
          }`} />

          <AnimatedCircularProgressBar
            max={100}
            min={0}
            value={progress}
            gaugePrimaryColor={isDark ? '#0ea5e9' : '#0284c7'}
            gaugeSecondaryColor={isDark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(2, 132, 199, 0.12)'}
            className={`size-32 sm:size-40 text-2xl sm:text-3xl font-black ${
              isDark
                ? 'text-sky-400 drop-shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                : 'text-sky-600 drop-shadow-[0_2px_8px_rgba(2,132,199,0.25)]'
            }`}
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
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDark ? 'bg-sky-500' : 'bg-sky-600'}`}></span>
            </span>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Loading Home Assistant
            </h2>
          </div>

          <p className={`text-xs sm:text-sm font-medium max-w-xs sm:max-w-sm mx-auto leading-relaxed ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Connecting to your smart home environment and synchronizing live entity states...
          </p>

          {/* Connection Target Server Badge */}
          {cleanServerUrl && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border font-mono text-[11px] mt-1 shadow-2xs ${
              isDark
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}>
              <WifiHigh size={14} weight="bold" className={`${isDark ? 'text-sky-400' : 'text-sky-600'} animate-pulse`} />
              <span className="truncate max-w-[220px] sm:max-w-[280px]">{cleanServerUrl}</span>
            </div>
          )}

          {/* Error notice if connection error occurred */}
          {connectionError && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-semibold pt-1">
              <WarningCircle size={15} weight="fill" />
              <span className="truncate max-w-xs">{connectionError}</span>
            </div>
          )}

          {/* Delayed Hint & Retry / Continue Actions if taking longer */}
          {showDelayedHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pt-3 flex flex-wrap items-center justify-center gap-2.5"
            >
              {onContinue && (
                <button
                  type="button"
                  onClick={onContinue}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                    isDark
                      ? 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/40 text-sky-200'
                      : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800'
                  }`}
                >
                  <span>Continue to Dashboard</span>
                </button>
              )}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <ArrowsClockwise size={14} weight="bold" className={isRetrying ? `animate-spin ${isDark ? 'text-sky-400' : 'text-sky-600'}` : ''} />
                  <span>{isRetrying ? 'Reconnecting...' : 'Retry Connection'}</span>
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom Section: Small Textnote to Enter Demo Mode */}
      <div className="w-full flex flex-col items-center justify-center pb-2 relative z-10">
        <p className={`text-xs sm:text-sm text-center flex items-center gap-1.5 flex-wrap justify-center ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <span>Exploring without a live server?</span>
          <button
            type="button"
            onClick={onEnterDemoMode}
            className={`font-bold underline underline-offset-4 transition-colors cursor-pointer inline-flex items-center gap-1 active:scale-95 ${
              isDark
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            <Sparkle size={14} weight="fill" />
            <span>Enter Demo Mode</span>
          </button>
        </p>
      </div>
    </div>
  );
}
