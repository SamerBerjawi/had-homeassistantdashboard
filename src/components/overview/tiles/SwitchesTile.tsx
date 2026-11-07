/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ToggleRight, Power, CaretRight } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function SwitchesTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    handleToggleSwitchBatch,
    onSwitches,
    switchEntities,
    tileBaseClass
  } = s;

  return (
    <div
      className={tileBaseClass(
        onSwitches.length > 0,
        darkMode ? 'bg-emerald-500/20 text-white border-emerald-500/30' : 'bg-emerald-500/20 text-slate-900 border-emerald-300/60',
        false,
        is2x
      )}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
          onSwitches.length > 0
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
        }`}>
          <ToggleRight size={19} weight="duotone" />
        </div>

        <div className="flex items-center gap-2">
          {is2x && onSwitches.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hidden sm:inline truncate max-w-[120px]">
              {onSwitches[0].name.replace(/switch/gi, '').trim()}
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleSwitchBatch}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              onSwitches.length > 0
                ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/40'
                : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
            }`}
            title={onSwitches.length > 0 ? 'Turn all switches off' : 'Turn switches on'}
          >
            <Power size={13} weight="bold" />
          </button>
        </div>
      </div>

      <div className="relative z-10 my-0.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{onSwitches.length}</span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {switchEntities.length} Active</span>
        </div>
        {is2x && onSwitches.length > 0 && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300 truncate ml-2">
            {onSwitches.length === 1 ? '1 active switch' : `${onSwitches.length} active switches`}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Switches
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span>{onSwitches.length > 0 ? `${onSwitches.length} active` : 'All switches off'}</span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
