/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaretRight, Drop } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function LeakTile({ s, is2x }: TileProps) {
  const {
    activeLeaks,
    darkMode,
    leakSensors,
    tileBaseClass
  } = s;

  if (is2x) {
    return (
      <div
        className={tileBaseClass(
          activeLeaks.length > 0,
          darkMode ? 'bg-rose-500/20 text-white border-rose-500/30' : 'bg-rose-500/20 text-rose-950 border-rose-300/60',
          activeLeaks.length > 0,
          true
        )}
      >
        {/* Top Row: Icon + Title on left, Status Badge + Chevron on right */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              activeLeaks.length > 0
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Drop size={18} weight="duotone" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              Water Leaks
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              activeLeaks.length > 0
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            }`}>
              {activeLeaks.length > 0 ? 'Hazard' : 'Dry'}
            </span>
            <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all ml-0.5" />
          </div>
        </div>

        <div className="relative z-10 my-0.5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-black font-mono ${activeLeaks.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
              {activeLeaks.length}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              {leakSensors.length > 0 ? `/ ${leakSensors.length} Probes` : 'Probes'}
            </span>
          </div>
          <span className={`text-xs font-bold truncate max-w-[150px] ${activeLeaks.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {activeLeaks.length > 0 ? 'Moisture detected!' : 'All zones sealed & dry'}
          </span>
        </div>

        <div className="relative z-10 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
          {activeLeaks.length > 0 ? 'Moisture detected!' : 'All zones dry'}
        </div>
      </div>
    );
  }

  // 1x Layout
  return (
    <div
      className={tileBaseClass(
        activeLeaks.length > 0,
        darkMode ? 'bg-rose-500/20 text-white border-rose-500/30' : 'bg-rose-500/20 text-rose-950 border-rose-300/60',
        activeLeaks.length > 0,
        false
      )}
    >
      {/* Top Row: Icon badge on left, Status badge on right */}
      <div className="flex items-center justify-between relative z-10 shrink-0">
        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all shadow-xs shrink-0 ${
          activeLeaks.length > 0
            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
        }`}>
          <Drop size={19} weight="duotone" />
        </div>

        <span className={`text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-2xs border ${
          activeLeaks.length > 0
            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        }`}>
          {activeLeaks.length > 0 ? 'Hazard' : 'Dry'}
        </span>
      </div>

      {/* Middle: Count */}
      <div className="relative z-10 my-auto py-0.5 flex items-baseline gap-1.5">
        <span className={`text-xl sm:text-2xl font-black font-mono ${activeLeaks.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
          {activeLeaks.length}
        </span>
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
          {leakSensors.length > 0 ? `/ ${leakSensors.length} Probes` : 'Probes'}
        </span>
      </div>

      {/* Bottom: Title & Subtitle with Chevron */}
      <div className="relative z-10 shrink-0">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Water Leaks
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span className="truncate">
            {activeLeaks.length > 0 ? 'Moisture detected!' : 'All zones dry'}
          </span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
