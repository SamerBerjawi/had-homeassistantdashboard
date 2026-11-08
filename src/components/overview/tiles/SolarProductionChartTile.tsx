/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, CaretRight, Lightning, Sun } from '@phosphor-icons/react';
import { MinimalistSolarProductionChart } from '../EnergySparklineCharts';
import type { TileProps } from './types';

export default function SolarProductionChartTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    energyData,
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
  const chartBuckets = energyData.buckets || [];

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        <div className="grid grid-cols-2 gap-3 h-full items-center">
          {/* Left Side: Info & Metrics */}
          <div className="flex flex-col justify-between h-full min-w-0 pr-1 py-0.5 relative z-10">
            {/* Header with Title (No pill) */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
                  <Sun size={18} weight="fill" />
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
            </div>

            {/* Telemetry chips with zero inner borders */}
            <div className="grid grid-cols-2 gap-1.5 my-auto py-1">
              <div className={`p-1.5 rounded-xl transition-all ${
                darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
              }`}>
                <div className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Lightning size={11} weight="fill" className="text-amber-500 shrink-0" /> Live Power
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-amber-500 dark:text-amber-400 truncate">
                  {solarPowerKW.toFixed(2)} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
                </div>
              </div>

              <div className={`p-1.5 rounded-xl transition-all ${
                darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
              }`}>
                <div className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Sun size={11} weight="fill" className="text-amber-500 shrink-0" /> Today's Yield
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                  {solarYield.toFixed(2)} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
                </div>
              </div>
            </div>

            {/* Subtitle / summary (Non-redundant, kWh generated removed) */}
            <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 shrink-0">
              <span>Peak: {solarPowerKW.toFixed(2)} kW</span>
              {forecastPct !== null && (
                <>
                  <span>•</span>
                  <span>{forecastPct}% of daily target</span>
                </>
              )}
            </div>
          </div>

          {/* Right Side: Full-Height Minimalist Chart (Legend removed for max height) */}
          <div className="relative h-full min-w-0 pl-3 border-l border-slate-200/60 dark:border-white/5 flex items-center">
            <div className="absolute top-0 right-0 z-20 pointer-events-none">
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Full-height minimalist chart container */}
            <div className="w-full h-full relative">
              <MinimalistSolarProductionChart
                buckets={chartBuckets}
                forecastTotal={forecastTotal}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1x Layout: Chart in Middle (No pill)
  return (
    <div className={tileBaseClass(false, '', false, false)}>
      {/* Top Row: Icon on left (No pill) */}
      <div className="flex items-center justify-between relative z-10 shrink-0">
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
          <Sun size={19} weight="fill" />
        </div>
      </div>

      {/* Middle: Minimalistic Chart (Dynamic height, zero grids, zero axes, zero labels) */}
      <div className="w-full flex-1 min-h-0 my-auto py-0 relative z-10">
        <MinimalistSolarProductionChart
          buckets={chartBuckets}
          forecastTotal={forecastTotal}
          darkMode={darkMode}
        />
      </div>

      {/* Bottom: Title aligned with Chevron (redundant kWh generated removed) */}
      <div className="relative z-10 shrink-0 flex items-center justify-between">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Solar Production & Forecast
        </div>
        <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
      </div>
    </div>
  );
}
