/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistent Demo Mode Banner
 * Informs the user of browser-only isolation and allows instant 1-tap live HA connection
 */

import React from 'react';
import { Sparkle, SignIn, ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';

export default function DemoBanner() {
  const { authState, openAuthModal } = useAuth();

  if (!authState.isDemo) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-orange-500/15 border-b border-amber-500/30 px-3.5 py-1.5 backdrop-blur-md text-amber-200 text-xs flex items-center justify-between gap-2 shadow-sm z-30 shrink-0 select-none">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="font-semibold text-amber-300 flex items-center gap-1 shrink-0">
          <Sparkle size={14} weight="fill" className="text-amber-400" />
          Demo Mode Active
        </span>
        <span className="text-amber-200/80 truncate hidden sm:inline">
          — Sandboxed simulation with browser localStorage only.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={openAuthModal}
          className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/40 text-amber-100 font-bold text-[11px] transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
        >
          <SignIn size={13} weight="bold" />
          <span>Connect Live HA</span>
        </button>
      </div>
    </div>
  );
}
