/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, CaretRight, CloudSun, Lightning, Sun } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function SolarProductionTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    energyRealtime,
    energyTotals,
    tileBaseClass
  } = s;

  const solarYield = energyTotals?.solar || 0;
  const solarPowerKW = energyRealtime?.solarPowerKW || 0;
  const forecastTotal = energyTotals?.solarForecastTotal;
  const forecastPct = forecastTotal && forecastTotal > 0
    ? Math.min(150, Math.round((solarYield / forecastTotal) * 100))
    : null;

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
              <Sun size={19} weight="fill" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Solar Production & Forecast
              </div>
              <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {forecastTotal ? `${forecastTotal.toFixed(1)} kWh daily target` : 'Solar PV generation'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {forecastPct ? `${forecastPct}% Target` : `${solarYield.toFixed(1)} kWh Yield`}
            </span>
            <CaretRight
              size={14}
              weight="bold"
              className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
            />
          </div>
        </div>

        {/* Middle: 3 Metric Cards with Vertical Stack (High Contrast Light Mode) */}
        <div className="grid grid-cols-3 gap-2.5 my-auto relative z-10">
          {/* Current Power */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Lightning size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Current Power
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-amber-500 dark:text-amber-400 whitespace-nowrap">
              {solarPowerKW.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>

          {/* Today's Yield */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Sun size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Today's Yield
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {solarYield.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
            </div>
          </div>

          {/* Forecast Target */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                <CloudSun size={12} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Forecast Target
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {forecastTotal ? `${forecastTotal.toFixed(2)}` : 'N/A'} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">{forecastTotal ? 'kWh' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1x Layout
  return (
    <div className={tileBaseClass(false, '', false, false)}>
      {/* Top Row: Icon on left, Forecast target pill on right */}
      <div className="flex items-center justify-between relative z-10 shrink-0">
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
          <Sun size={19} weight="fill" />
        </div>

        <span className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
          darkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {forecastPct ? `${forecastPct}% Target` : 'Solar PV'}
        </span>
      </div>

      {/* Middle: 2 Telemetry Badges (Zero overflow, no inner borders) */}
      <div className="grid grid-cols-2 gap-1 my-auto relative z-10">
        <div className={`p-1.5 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5">
            <Lightning size={11} weight="fill" className="text-amber-500 shrink-0" /> Live Power
          </div>
          <div className="font-mono text-xs font-black text-amber-500 dark:text-amber-400 truncate">
            {solarPowerKW.toFixed(2)} <span className="text-[11px] font-medium text-slate-400">kW</span>
          </div>
        </div>

        <div className={`p-1.5 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5">
            <Sun size={11} weight="fill" className="text-amber-500 shrink-0" /> Today's Yield
          </div>
          <div className="font-mono text-xs font-black text-slate-900 dark:text-white truncate">
            {solarYield.toFixed(1)} <span className="text-[11px] font-medium text-slate-400">kWh</span>
          </div>
        </div>
      </div>

      {/* Bottom: Title aligned with Chevron */}
      <div className="relative z-10 shrink-0 flex items-center justify-between">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Solar Production & Forecast
        </div>
        <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
      </div>
    </div>
  );
}
