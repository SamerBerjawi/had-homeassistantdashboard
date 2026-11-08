/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, CaretRight, BatteryCharging, Lightning, Sun, Plug, House } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function PowerFlowTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    energyHasBattery,
    energyRealtime,
    tileBaseClass
  } = s;

  const solarKW = energyRealtime?.solarPowerKW || 0;
  const gridImportKW = energyRealtime?.gridImportPowerKW || 0;
  const gridExportKW = energyRealtime?.gridExportPowerKW || 0;
  const batteryDischargeKW = energyRealtime?.batteryDischargePowerKW || 0;
  const batteryChargeKW = energyRealtime?.batteryChargePowerKW || 0;
  const batterySoc = energyRealtime?.batterySoC;
  const homeKW = energyRealtime?.homeConsumptionKW || 0;
  const isExporting = gridExportKW > 0.05;
  const isImporting = gridImportKW > 0.05;
  const isSolarActive = solarKW > 0.05;
  const selfSufficiencyPct = homeKW > 0 
    ? Math.min(100, Math.max(0, Math.round(((solarKW + batteryDischargeKW) / homeKW) * 100))) 
    : 100;

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
              <Lightning size={19} weight="fill" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Power Sources Flow
              </div>
              <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Instantaneous continuous flow • {selfSufficiencyPct}% self-powered
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-2xs ${
              isExporting
                ? 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/20'
                : isSolarActive
                ? 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20'
                : 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/20'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {homeKW.toFixed(2)} kW Load
            </span>
            <CaretRight
              size={14}
              weight="bold"
              className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
            />
          </div>
        </div>

        {/* Middle: 4 Flow Cards with Vertical Stack (No Truncation) */}
        <div className={`grid ${energyHasBattery ? 'grid-cols-4' : 'grid-cols-3'} gap-2 my-auto relative z-10`}>
          {/* Solar */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Sun size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Solar
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {solarKW.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>

          {/* Grid */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                isExporting ? 'bg-indigo-500/15 text-indigo-500' : 'bg-sky-500/15 text-sky-500'
              }`}>
                <Plug size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {isExporting ? 'Export' : 'Grid'}
              </span>
            </div>
            <div className={`text-xs sm:text-sm font-black font-mono whitespace-nowrap ${
              isExporting ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
            }`}>
              {isExporting ? `-${gridExportKW.toFixed(2)}` : `+${gridImportKW.toFixed(2)}`} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>

          {/* Battery (if available) */}
          {energyHasBattery && (
            <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
              darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <BatteryCharging size={12} weight="fill" />
                </div>
                <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Battery {typeof batterySoc === 'number' ? `(${batterySoc}%)` : ''}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
                {batteryDischargeKW > 0.05 ? `+${batteryDischargeKW.toFixed(2)}` : batteryChargeKW > 0.05 ? `-${batteryChargeKW.toFixed(2)}` : '0.00'} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
              </div>
            </div>
          )}

          {/* Home Load */}
          <div className={`p-2 sm:p-2.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-center ${
            darkMode ? 'bg-white/5' : 'bg-white/80 shadow-2xs'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <House size={12} weight="fill" />
              </div>
              <span className="text-[11px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Home Load
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white whitespace-nowrap">
              {homeKW.toFixed(2)} <span className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1x Layout
  return (
    <div className={tileBaseClass(false, '', false, false)}>
      {/* Top Row: Icon on left, Percentage Self-Powered Badge on right */}
      <div className="flex items-center justify-between relative z-10 shrink-0">
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
          <Lightning size={19} weight="fill" />
        </div>

        <span className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
          selfSufficiencyPct >= 100
            ? darkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
            : selfSufficiencyPct > 50
            ? darkMode ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-sky-100 text-sky-900 border-sky-300'
            : darkMode ? 'bg-slate-500/20 text-slate-300 border-slate-500/30' : 'bg-slate-200 text-slate-900 border-slate-300'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {selfSufficiencyPct}% Self-Powered
        </span>
      </div>

      {/* Middle: 2x2 compact telemetry badges with zero inner borders */}
      <div className="grid grid-cols-2 gap-1 my-auto relative z-10">
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <Sun size={11} weight="fill" className="text-amber-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">{solarKW.toFixed(1)} kW</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <House size={11} weight="fill" className="text-purple-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">{homeKW.toFixed(1)} kW</span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <Plug size={11} weight="fill" className="text-sky-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">
            {isExporting ? `-${gridExportKW.toFixed(1)}` : `+${gridImportKW.toFixed(1)}`}
          </span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl min-w-0 ${
          darkMode ? 'bg-white/5 text-slate-200' : 'bg-white/80 text-slate-900 shadow-2xs'
        }`}>
          <BatteryCharging size={11} weight="fill" className="text-emerald-500 shrink-0" />
          <span className="font-mono text-[11px] font-bold truncate">
            {typeof batterySoc === 'number' ? `${batterySoc}%` : `${batteryDischargeKW.toFixed(1)} kW`}
          </span>
        </div>
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
