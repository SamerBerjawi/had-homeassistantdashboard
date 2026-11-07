/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaretRight, ArrowArcLeft, Sun, ChartBar, Plug, House } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function EnergyUsageTile({ s, is2x }: TileProps) {
  const {
    darkMode,
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
  const netGrid = gridImport - gridExport;

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shadow-xs shrink-0">
              <ChartBar size={19} weight="fill" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Energy Usage & Return
              </div>
              <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Today's consumption • {gridExport > 0 ? `${gridExport.toFixed(1)} kWh returned` : 'No grid return'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
              netGrid <= 0
                ? darkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                : darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-900 border-purple-300'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {netGrid <= 0 ? `Net -${Math.abs(netGrid).toFixed(1)} kWh` : `Net +${netGrid.toFixed(1)} kWh`}
            </span>
            <CaretRight
              size={14}
              weight="bold"
              className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
            />
          </div>
        </div>

        {/* Middle: 4 Metric Cards with Vertical Stack (High Contrast Light Mode) */}
        <div className="grid grid-cols-4 gap-2 my-auto relative z-10">
          {/* Total Usage */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <House size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Total Use
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {homeConsumption.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
            </div>
          </div>

          {/* Grid Import */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                <Plug size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Grid Import
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {gridImport.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
            </div>
          </div>

          {/* Grid Return */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                <ArrowArcLeft size={12} weight="bold" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Grid Return
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {gridExport.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kWh</span>
            </div>
          </div>

          {/* Solar Offset */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Sun size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Solar Offset
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {solarOffset}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1x Layout
  return (
    <div className={tileBaseClass(false, '', false, false)}>
      {/* Top Row: Icon on left, Percentage Offset Badge on right */}
      <div className="flex items-center justify-between relative z-10 shrink-0">
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shadow-xs shrink-0">
          <ChartBar size={19} weight="fill" />
        </div>

        <span className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
          solarOffset >= 100
            ? darkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
            : solarOffset > 0
            ? darkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-900 border-purple-300'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {solarOffset}% Offset
        </span>
      </div>

      {/* Middle: 2x2 Telemetry Badges (Zero overflow, no inner borders) */}
      <div className="grid grid-cols-2 gap-1 my-auto relative z-10">
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <House size={11} weight="fill" className="text-purple-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">{homeConsumption.toFixed(1)} kWh</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <Plug size={11} weight="fill" className="text-sky-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">{gridImport.toFixed(1)} kWh</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <ArrowArcLeft size={11} weight="bold" className="text-indigo-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">{gridExport.toFixed(1)} kWh</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <Sun size={11} weight="fill" className="text-amber-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">{solarOffset}%</span>
        </div>
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
