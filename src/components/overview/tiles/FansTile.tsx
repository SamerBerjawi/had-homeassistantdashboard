/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Fan, Power, CaretRight } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function FansTile({ s, is2x }: TileProps) {
  const {
    activeFans,
    darkMode,
    fanEntities,
    handleToggleFanBatch,
    tileBaseClass
  } = s;

  return (
    <div
      className={tileBaseClass(
        activeFans.length > 0,
        darkMode ? 'bg-cyan-500/20 text-white border-cyan-500/30' : 'bg-cyan-500/20 text-slate-900 border-cyan-300/60',
        false,
        is2x
      )}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
          activeFans.length > 0
            ? 'bg-cyan-500 text-slate-950 shadow-xs'
            : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
        }`}>
          <Fan size={19} weight="duotone" className={activeFans.length > 0 ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
        </div>

        <button
          type="button"
          onClick={handleToggleFanBatch}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            activeFans.length > 0
              ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/40'
              : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
          }`}
          title={activeFans.length > 0 ? 'Turn all off' : 'Turn fans on'}
        >
          <Power size={13} weight="bold" />
        </button>
      </div>

      <div className="relative z-10 my-0.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeFans.length}</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {fanEntities.length} Running</span>
        </div>
        {is2x && activeFans.length > 0 && (
          <span className="text-xs font-medium text-cyan-600 dark:text-cyan-300 truncate ml-2">
            Circulating fresh air
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Fans & Airflow
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span>{activeFans.length > 0 ? 'Circulating air' : 'All fans idle'}</span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
