/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modern Glassmorphic Authentication Gatekeeper Modal
 * Supports Home Assistant OAuth2, Long-Lived Access Token (LLAT), and Sandboxed Demo Mode
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, 
  SignIn, 
  ShieldCheck, 
  Eye, 
  EyeSlash, 
  HouseLine, 
  Sparkle, 
  ArrowRight, 
  WarningCircle, 
  CircleNotch,
  LockKey,
  Devices,
  CaretDown,
  CaretUp,
  X
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  darkMode?: boolean;
}

export default function AuthModal({ darkMode = true }: AuthModalProps) {
  const {
    authState,
    isAuthModalOpen,
    closeAuthModal,
    loginOAuth,
    loginLLAT,
    enterDemoMode,
    error,
    clearError
  } = useAuth();

  const [haUrl, setHaUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('ha_server_url') ||
        localStorage.getItem('had_last_ha_url') ||
        'http://homeassistant.local:8123'
      );
    }
    return 'http://homeassistant.local:8123';
  });

  const [llatToken, setLlatToken] = useState<string>('');
  const [showLlatToken, setShowLlatToken] = useState<boolean>(false);
  const [showLlatSection, setShowLlatSection] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [llatError, setLlatError] = useState<string | null>(null);

  // Modal is strictly un-dismissible if user has neither authenticated nor entered demo mode
  const canClose = authState.isAuthenticated || authState.isDemo;

  if (!isAuthModalOpen) return null;

  const handleOAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    loginOAuth(haUrl);
  };

  const handleLLATSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLlatError(null);
    clearError();

    if (!llatToken.trim()) {
      setLlatError('Please enter your Long-Lived Access Token');
      return;
    }

    setIsSubmitting(true);
    const result = await loginLLAT(haUrl, llatToken);
    setIsSubmitting(false);

    if (!result.success && result.error) {
      setLlatError(result.error);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden backdrop-blur-2xl bg-slate-950/80 transition-all duration-300">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-sky-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-cyan-500/15 blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-slate-900/90 dark:bg-slate-900/95 text-white shadow-2xl shadow-cyan-950/40 p-6 sm:p-8 backdrop-blur-xl overflow-hidden"
        >
          {/* Close button if allowed */}
          {canClose && (
            <button
              type="button"
              onClick={closeAuthModal}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          )}

          {/* Header Brand */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/30 text-white shrink-0">
              <HouseLine size={28} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  HOMZ Security Gate
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Auth Subsystem
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Authenticate with Home Assistant to load your live entities and cross-device sync.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {(error || llatError) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {error || llatError}
              </div>
            </motion.div>
          )}

          {/* HA Host URL Input */}
          <div className="space-y-1.5 mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Home Assistant Instance URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={haUrl}
                onChange={(e) => setHaUrl(e.target.value)}
                placeholder="http://homeassistant.local:8123 or https://your-nabu-casa.ui.nabu.casa"
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Use LAN address (e.g. <code className="text-sky-300">http://192.168.1.100:8123</code>) or Nabu Casa cloud URL.
            </p>
          </div>

          {/* OPTION A: Primary OAuth2 Sign In */}
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={handleOAuthSubmit}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 group"
            >
              <SignIn size={20} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
              <span>Sign In with Home Assistant (OAuth2)</span>
              <ArrowRight size={18} weight="bold" className="opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-full border-t border-white/10" />
            <span className="absolute px-3 bg-slate-900 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              or connect via token
            </span>
          </div>

          {/* OPTION B: Long-Lived Access Token (LLAT) Accordion */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowLlatSection(!showLlatSection)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Devices size={18} weight="duotone" className="text-cyan-400" />
                <span>Wall Kiosk / Long-Lived Access Token (LLAT)</span>
              </div>
              {showLlatSection ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </button>

            {showLlatSection && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleLLATSubmit}
                className="p-4 pt-2 border-t border-white/10 space-y-3.5"
              >
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Long-Lived Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showLlatToken ? 'text' : 'password'}
                      value={llatToken}
                      onChange={(e) => setLlatToken(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLlatToken(!showLlatToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                    >
                      {showLlatToken ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Generate this token in HA: <em>Profile → Security → Long-Lived Access Tokens → Create Token</em>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <CircleNotch size={16} className="animate-spin" />
                      <span>Verifying & Connecting...</span>
                    </>
                  ) : (
                    <>
                      <LockKey size={16} weight="bold" />
                      <span>Connect via LLAT</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </div>

          {/* OPTION C: Sandboxed Demo Mode */}
          <div className="pt-2">
            <button
              type="button"
              onClick={enterDemoMode}
              className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group"
            >
              <Sparkle size={16} weight="fill" className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Explore Demo Dashboard (Isolated Sandbox)</span>
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-2">
              Demo mode simulates real Home Assistant entity telemetry using browser storage only.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
