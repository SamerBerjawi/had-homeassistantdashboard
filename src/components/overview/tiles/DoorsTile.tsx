/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Door, DoorOpen, CaretRight } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function DoorsTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    doorSensors,
    openDoors,
    tileBaseClass
  } = s;

  if (is2x) {
    return (
      <div
        className={tileBaseClass(
          openDoors.length > 0,
          darkMode ? 'bg-amber-500/20 text-white border-amber-500/30' : 'bg-amber-500/20 text-slate-900 border-amber-300/60',
          false,
          true
        )}
      >
        {/* Top Row: Icon + Title on left, Status Badge + Chevron on right */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              openDoors.length > 0
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              {openDoors.length > 0 ? <DoorOpen size={18} weight="duotone" /> : <Door size={18} weight="duotone" />}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              Entry Doors
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              openDoors.length > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            }`}>
              {openDoors.length > 0 ? `${openDoors.length} Open` : 'Secure'}
            </span>
            <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all ml-0.5" />
          </div>
        </div>

        <div className="relative z-10 my-0.5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              {openDoors.length}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {doorSensors.length} Doors</span>
          </div>
          {openDoors.length > 0 && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-300 truncate max-w-[140px]">
              {openDoors.map(d => d.name).slice(0, 2).join(', ')}
            </span>
          )}
        </div>

        <div className="relative z-10 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
          {openDoors.length > 0 ? `${openDoors.length} open` : 'All doors closed'}
        </div>
      </div>
    );
  }

  // 1x Layout
  return (
    <div
      className={tileBaseClass(
        openDoors.length > 0,
        darkMode ? 'bg-amber-500/20 text-white border-amber-500/30' : 'bg-amber-500/20 text-slate-900 border-amber-300/60',
        false,
        false
      )}
    >
      {/* Top Row: Icon badge on left, Status badge on right */}
      <div className="flex items-center justify-between relative z-10 shrink-0">
        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all shadow-xs shrink-0 ${
          openDoors.length > 0
            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
        }`}>
          {openDoors.length > 0 ? <DoorOpen size={19} weight="duotone" /> : <Door size={19} weight="duotone" />}
        </div>

        <span className={`text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-2xs border ${
          openDoors.length > 0
            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        }`}>
          {openDoors.length > 0 ? `${openDoors.length} Open` : 'Secure'}
        </span>
      </div>

      {/* Middle: Count */}
      <div className="relative z-10 my-auto py-0.5 flex items-baseline gap-1.5">
        <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
          {openDoors.length}
        </span>
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
          {doorSensors.length > 0 ? `/ ${doorSensors.length} Doors` : 'Doors'}
        </span>
      </div>

      {/* Bottom: Title & Subtitle with Chevron */}
      <div className="relative z-10 shrink-0">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Entry Doors
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span className="truncate">
            {openDoors.length > 0 ? openDoors.map(d => d.name).slice(0, 2).join(', ') : 'All doors closed'}
          </span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
