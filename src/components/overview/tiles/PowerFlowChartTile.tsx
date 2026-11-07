/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, CaretRight, Lightning, Sun, House } from '@phosphor-icons/react';
import { MinimalistPowerFlowChart } from '../EnergySparklineCharts';
import type { TileProps } from './types';

export default function PowerFlowChartTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    energyData,
    energyHasBattery,
    energyHasGrid,
    energyHasSolar,
    energyModel,
    energyRealtime,
    tileBaseClass
  } = s;

  const solarKW = energyRealtime?.solarPowerKW || 0;
  const homeKW = energyRealtime?.homeConsumptionKW || 0;
  const gridImportKW = energyRealtime?.gridImportPowerKW || 0;
  const gridExportKW = energyRealtime?.gridExportPowerKW || 0;
  const batteryDischargeKW = energyRealtime?.batteryDischargePowerKW || 0;
  const batterySoc = energyRealtime?.batterySoC;
  const isExporting = gridExportKW > 0.05;
  const rawPowerBuckets = (energyModel.powerBuckets && energyModel.powerBuckets.length > 0)
    ? energyModel.powerBuckets
    : (energyData.buckets || []);

  // Filter Power Sources flow to only show the last 12 hours instead of full day
  const nowMs = Date.now();
  const twelveHoursAgoMs = nowMs - 12 * 60 * 60 * 1000;
  const hasTimestamps = rawPowerBuckets.some((b) => (b.startMs || 0) > 0 || (b.endMs || 0) > 0);
  const chartBuckets = hasTimestamps
    ? rawPowerBuckets.filter((b) => {
        const end = b.endMs || b.startMs || 0;
        return end >= twelveHoursAgoMs && (b.startMs || 0) <= nowMs + 5 * 60 * 1000;
      })
    : (rawPowerBuckets.length > 12
        ? rawPowerBuckets.slice(-Math.round(rawPowerBuckets.length / 2))
        : rawPowerBuckets);

  const selfSufficiencyPct = homeKW > 0 
    ? Math.min(100, Math.round(((solarKW + batteryDischargeKW) / homeKW) * 100))
    : 100;

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
                  <Lightning size={18} weight="fill" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    Power Sources Flow
                  </div>
                  <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Home • Solar • Grid • Battery
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
                  <Sun size={11} weight="fill" className="text-amber-500 shrink-0" /> Solar
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                  {solarKW.toFixed(2)} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
                </div>
              </div>

              <div className={`p-1.5 rounded-xl transition-all ${
                darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
              }`}>
                <div className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <House size={11} weight="fill" className="text-purple-500 shrink-0" /> Home Load
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                  {homeKW.toFixed(2)} <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
                </div>
              </div>
            </div>

            {/* Subtitle / summary */}
            <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 shrink-0">
              <span>Grid: {isExporting ? `-${gridExportKW.toFixed(1)} kW` : `+${gridImportKW.toFixed(1)} kW`}</span>
              {typeof batterySoc === 'number' && (
                <>
                  <span>•</span>
                  <span>Bat: {batterySoc}%</span>
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
              <MinimalistPowerFlowChart
                buckets={chartBuckets}
                darkMode={darkMode}
                hasSolar={energyHasSolar}
                hasGrid={energyHasGrid}
                hasBattery={energyHasBattery}
                lastHours={12}
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
          <Lightning size={19} weight="fill" />
        </div>
      </div>

      {/* Middle: Minimalistic Chart (Dynamic height, zero grids, zero axes, zero labels) */}
      <div className="w-full flex-1 min-h-0 my-auto py-0 relative z-10">
        <MinimalistPowerFlowChart
          buckets={chartBuckets}
          darkMode={darkMode}
          hasSolar={energyHasSolar}
          hasGrid={energyHasGrid}
          hasBattery={energyHasBattery}
          lastHours={12}
        />
      </div>

      {/* Bottom: Title aligned with Chevron */}
      <div className="relative z-10 shrink-0 flex items-center justify-between">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Power Sources Flow
        </div>
        <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
      </div>
    </div>
  );
}
