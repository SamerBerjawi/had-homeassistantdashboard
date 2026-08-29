/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sun, 
  House, 
  ShieldCheck, 
  Sparkle, 
  Gauge,
  ArrowUpRight,
  ArrowDownRight
} from '@phosphor-icons/react';
import { DailyTotalsEnergy } from './energyCalculator';
import { PieChart } from '../charts/pie-chart';
import { PieSlice } from '../charts/pie-slice';
import { PieCenter } from '../charts/pie-center';

interface EnergyGaugesProps {
  dailyTotals: DailyTotalsEnergy;
  darkMode?: boolean;
}

export default function EnergyGauges({
  dailyTotals,
  darkMode = true
}: EnergyGaugesProps) {
  const {
    solarProductionKWh,
    solarConsumedKWh,
    solarFedToGridKWh,
    gridImportKWh,
    totalConsumptionKWh,
    selfConsumptionRate,
    autarkyRate
  } = dailyTotals;

  // 1. Data for Production Donut
  const productionData = [
    {
      label: 'Self-Consumed',
      value: Math.max(0.01, solarConsumedKWh),
      color: '#10B981' // Emerald
    },
    {
      label: 'Fed to Grid',
      value: Math.max(0.01, solarFedToGridKWh),
      color: '#06B6D4' // Cyan / Teal
    }
  ];

  // 2. Data for Consumption Donut
  const fromSolarKWh = Math.max(0, totalConsumptionKWh - gridImportKWh);
  const consumptionData = [
    {
      label: 'From Solar PV',
      value: Math.max(0.01, fromSolarKWh),
      color: '#F59E0B' // Amber / Orange
    },
    {
      label: 'From Grid',
      value: Math.max(0.01, gridImportKWh),
      color: '#0284C7' // Sky Blue
    }
  ];

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
            <Gauge size={22} weight="duotone" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Production & Consumption Balance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              bklit dual donut telemetry & self-sufficiency KPI metrics
            </p>
          </div>
        </div>

        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          Daily Cumulative
        </span>
      </div>

      {/* DUAL BKLIT DONUT GAUGES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
        
        {/* ========================================================= */}
        {/* DONUT 1: SOLAR PRODUCTION                                  */}
        {/* ========================================================= */}
        <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col items-center justify-between transition-all ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50/80 border-slate-200 shadow-xs'
        }`}>
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sun size={18} weight="duotone" className="text-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Solar Production
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Yield: 100.00%
            </span>
          </div>

          {/* bklit PieChart Donut */}
          <div className="relative w-[180px] h-[180px] my-2 flex items-center justify-center">
            <PieChart
              data={productionData}
              innerRadius={54}
              padAngle={0.04}
              cornerRadius={6}
              size={180}
              className="w-full h-full"
            >
              {productionData.map((_, i) => (
                <PieSlice key={i} index={i} />
              ))}
              <PieCenter defaultLabel="Yield" suffix=" kWh" formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}>
                {({ value, isHovered, data }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'Total Yield'}
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                      {(isHovered ? value : solarProductionKWh).toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-amber-500">kWh</span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          {/* Donut Stats Legend */}
          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Consumed
              </span>
              <span className="text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {solarConsumedKWh.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-500">
                ({selfConsumptionRate.toFixed(2)}%)
              </span>
            </div>

            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col">
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> Fed to grid
              </span>
              <span className="text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {solarFedToGridKWh.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
              </span>
              <span className="text-[10px] font-semibold text-cyan-500">
                ({(100 - selfConsumptionRate).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DONUT 2: TOTAL CONSUMPTION                                */}
        {/* ========================================================= */}
        <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col items-center justify-between transition-all ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50/80 border-slate-200 shadow-xs'
        }`}>
          <div className="w-full flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <House size={18} weight="duotone" className="text-purple-500" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Home Consumption
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              Demand: 100.00%
            </span>
          </div>

          {/* bklit PieChart Donut */}
          <div className="relative w-[180px] h-[180px] my-2 flex items-center justify-center">
            <PieChart
              data={consumptionData}
              innerRadius={54}
              padAngle={0.04}
              cornerRadius={6}
              size={180}
              className="w-full h-full"
            >
              {consumptionData.map((_, i) => (
                <PieSlice key={i} index={i} />
              ))}
              <PieCenter defaultLabel="Total" suffix=" kWh" formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}>
                {({ value, isHovered, data }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'Total Used'}
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                      {(isHovered ? value : totalConsumptionKWh).toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-purple-500">kWh</span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          {/* Donut Stats Legend */}
          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> From PV
              </span>
              <span className="text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {fromSolarKWh.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
              </span>
              <span className="text-[10px] font-semibold text-amber-500">
                ({autarkyRate.toFixed(2)}%)
              </span>
            </div>

            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> From grid
              </span>
              <span className="text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {gridImportKWh.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kWh</span>
              </span>
              <span className="text-[10px] font-semibold text-sky-500">
                ({(100 - autarkyRate).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI PROGRESS BARS (Autarky & Self-Consumption) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <ShieldCheck size={16} className="text-emerald-500" />
              Autarky / Self-Sufficiency
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{autarkyRate.toFixed(2)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
              style={{ width: `${autarkyRate}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Sun size={16} className="text-amber-500" />
              Self-Consumption Rate
            </span>
            <span className="font-mono text-amber-600 dark:text-amber-400">{selfConsumptionRate.toFixed(2)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full bg-linear-to-r from-amber-500 to-yellow-400 transition-all duration-1000"
              style={{ width: `${selfConsumptionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
