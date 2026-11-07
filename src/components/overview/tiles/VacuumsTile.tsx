/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaretRight, Broom, MapPin, BatteryCharging } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function VacuumsTile({ s, is2x }: TileProps) {
  const {
    activeVacuumDevice,
    darkMode,
    firstVacuum,
    isVacuumCharging,
    isVacuumCleaning,
    tileBaseClass,
    vacuumBattery
  } = s;

  const isCleaning = activeVacuumDevice?.state === 'cleaning' || isVacuumCleaning;
  const isReturning = activeVacuumDevice?.state === 'returning';
  const isPaused = activeVacuumDevice?.state === 'paused';
  const isError = activeVacuumDevice?.state === 'error';
  const displayStatus = activeVacuumDevice?.statusText || (isCleaning ? 'Cleaning' : (isReturning ? 'Returning' : (isPaused ? 'Paused' : 'Docked')));
  const activeRoom = activeVacuumDevice?.currentRoom || (isCleaning ? activeVacuumDevice?.areaName : undefined);

  return (
    <div
      className={tileBaseClass(
        isCleaning,
        darkMode ? 'bg-teal-500/20 text-white border-teal-500/30' : 'bg-teal-500/20 text-slate-900 border-teal-300/60',
        false,
        is2x
      )}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
          isCleaning
            ? 'bg-teal-500 text-slate-950 shadow-xs'
            : isError
            ? 'bg-rose-500 text-white shadow-xs'
            : isPaused
            ? 'bg-amber-500 text-slate-950 shadow-xs'
            : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
        }`}>
          <Broom size={19} weight={isCleaning ? 'fill' : 'duotone'} className={isCleaning ? 'animate-mop-swing' : ''} />
        </div>

        {activeRoom && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs truncate max-w-[140px] sm:max-w-[160px] ${
              isCleaning
                ? darkMode
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  : 'bg-teal-100 text-teal-800 border-teal-300'
                : darkMode
                ? 'bg-white/10 text-slate-300 border-white/10'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <MapPin size={11} weight="bold" className={isCleaning ? 'text-teal-400 shrink-0' : 'text-slate-400 shrink-0'} />
            <span className="truncate">{activeRoom}</span>
          </span>
        )}
      </div>

      <div className="relative z-10 my-0.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate capitalize">
            {displayStatus}
          </span>
          {vacuumBattery !== undefined && (
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-0.5 shrink-0">
              {isVacuumCharging ? <BatteryCharging size={13} weight="fill" className="text-teal-500" /> : null}
              {Math.round(vacuumBattery)}%
            </span>
          )}
        </div>
        {is2x && (
          <span className="text-xs font-semibold text-teal-600 dark:text-teal-300 truncate ml-2">
            {isCleaning ? 'Cleaning in progress' : (isReturning ? 'Returning' : (isPaused ? 'Paused' : 'Ready'))}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Vacuums
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span className="truncate">
            {activeVacuumDevice?.name || firstVacuum?.name || 'Robotic Cleaner'}
          </span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
