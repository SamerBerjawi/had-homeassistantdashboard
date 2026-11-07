/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaretRight, ArrowArcLeft, ChartBar, House } from '@phosphor-icons/react';
import { MinimalistEnergyUsageChart } from '../EnergySparklineCharts';
import type { TileProps } from './types';

export default function EnergyUsageChartTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    energyData,
    energyTotals,
    tileBaseClass
  } = s;

  const homeConsumption = energyTotals?.homeConsumption || 0;
  const gridImport = energyTotals?.gridImport || 0;
  const gridExport = energyTotals?.gridExport || 0;
  const solarConsumed = energyTotals?.solarToHome || 0;
  const batteryDischarged = energyTotals?.batteryToHome || 0;
  const solarOffset = homeConsumption > 0 
    ? Math.min(100, Math.round(((solarConsumed + batteryDischarged) / homeConsumption) * 100)) 
    : 0;
  const chartBuckets = energyData.buckets || [];

  const netGrid = gridImport - gridExport;

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        <div className="grid grid-cols-2 gap-3 h-full items-center">
          {/* Left Side: Identity & Primary Telemetry */}
          <div className="flex flex-col justify-between h-full min-w-0 pr-1 py-0.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shadow-xs shrink-0">
                  <ChartBar size={18} weight="fill" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    Energy Usage & Return
                  </div>
                  <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Today's Energy Balance
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
                  <House size={11} weight="fill" className="text-purple-500 shrink-0" /> Total Use
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                  {homeConsumption.toFixed(2)} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
                </div>
              </div>

              <div className={`p-1.5 rounded-xl transition-all ${
                darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
              }`}>
                <div className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <ArrowArcLeft size={11} weight="bold" className="text-indigo-500 shrink-0" /> Grid Return
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                  {gridExport.toFixed(2)} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
                </div>
              </div>
            </div>

            {/* Subtitle / summary (Non-redundant) */}
            <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 shrink-0">
              <span>Import: {gridImport.toFixed(1)} kWh</span>
              <span>•</span>
              <span>Solar: {solarConsumed.toFixed(1)} kWh</span>
            </div>
          </div>

          {/* Right Side: Full-Height Minimalist Chart */}
          <div className="relative h-full min-w-0 pl-3 border-l border-slate-200/60 dark:border-white/5 flex items-center">
            <div className="absolute top-0 right-0 z-20 pointer-events-none">
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Full-height minimalist bar chart container (positive up, negative down) */}
            <div className="w-full h-full relative">
              <MinimalistEnergyUsageChart
                buckets={chartBuckets}
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
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shadow-xs shrink-0">
          <ChartBar size={19} weight="fill" />
        </div>
      </div>

      {/* Middle: Minimalistic Chart (Dynamic height, zero grids, zero axes, zero labels) */}
      <div className="w-full flex-1 min-h-0 my-auto py-0 relative z-10">
        <MinimalistEnergyUsageChart
          buckets={chartBuckets}
          darkMode={darkMode}
        />
      </div>

      {/* Bottom: Title aligned with Chevron */}
      <div className="relative z-10 shrink-0 flex items-center justify-between">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Energy Usage & Return
        </div>
        <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
      </div>
    </div>
  );
}
