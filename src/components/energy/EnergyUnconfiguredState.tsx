/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LightningSlash, GearSix, ArrowsClockwise } from '@phosphor-icons/react';

interface EnergyUnconfiguredStateProps {
  onRefresh?: () => void;
  darkMode?: boolean;
}

export default function EnergyUnconfiguredState({
  onRefresh,
  darkMode = true
}: EnergyUnconfiguredStateProps) {
  return (
    <div
      className={`w-full rounded-3xl p-8 sm:p-12 border backdrop-blur-xl text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-12 transition-all shadow-2xl ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white'
          : 'bg-white/90 border-slate-200 text-slate-900'
      }`}
    >
      <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10 animate-pulse">
        <LightningSlash size={32} weight="duotone" />
      </div>

      <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
        No Energy Sources Configured
      </h2>

      <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
        This dashboard reads directly from Home Assistant's built-in energy configuration.
        To monitor your power, grid import/export, solar, battery, gas, or water usage, configure your sources in Home Assistant under:
      </p>

      <div
        className={`px-4 py-2.5 rounded-2xl border font-mono text-xs font-bold text-amber-400 mb-8 select-all ${
          darkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}
      >
        Settings → Dashboards → Energy
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
          >
            <ArrowsClockwise size={16} weight="bold" />
            <span>Check Again / Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
}
