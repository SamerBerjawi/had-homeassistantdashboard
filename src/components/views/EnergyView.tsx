/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  Lightning, 
  Sun, 
  BatteryCharging, 
  Plug, 
  House, 
  ShieldCheck, 
  Sparkle, 
  ArrowUpRight, 
  ArrowDownRight,
  ArrowsClockwise,
  Leaf,
  PiggyBank
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateEnergyState } from '../energy/energyCalculator';
import FusionSolarHouseFlow from '../energy/FusionSolarHouseFlow';
import PowerSourcesChart from '../energy/PowerSourcesChart';
import EnergySankeyChart from '../energy/EnergySankeyChart';
import EnergyGauges from '../energy/EnergyGauges';
import EnvironmentalStatsCard from '../energy/EnvironmentalStatsCard';
import FinancialCostCard from '../energy/FinancialCostCard';

interface EnergyViewProps {
  darkMode?: boolean;
}

export default function EnergyView({ darkMode = true }: EnergyViewProps) {
  const states = useAutoLayoutStore(useShallow(s => s.states));
  
  // Custom tariff preference (from localStorage or default)
  const [importTariff] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('homz_energy_tariff');
      return saved ? parseFloat(saved) : 0.28;
    }
    return 0.28;
  });

  const exportTariff = 0.09; // Feed-in tariff €0.09/kWh
  const currencySymbol = '€';

  // Compute live energy telemetry state
  const energyState = useMemo(() => {
    return calculateEnergyState(states, importTariff, exportTariff, currencySymbol);
  }, [states, importTariff, exportTariff, currencySymbol]);

  const {
    realtime,
    dailyTotals,
    financials,
    environmental,
    deviceConsumers,
    timeseries,
    weeklyTimeseries,
    monthlyTimeseries
  } = energyState;

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 sm:space-y-6 pb-12">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP LIVE TELEMETRY STAT STRIP                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* STAT 1: SOLAR LIVE */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-amber-500/30 text-white shadow-amber-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-amber-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Solar PV
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Sun size={18} weight="duotone" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {realtime.solarPower.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/10">
            <span>Today:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{dailyTotals.solarProductionKWh} kWh</span>
          </div>
        </div>

        {/* STAT 2: HOME CONSUMPTION */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-purple-500/30 text-white shadow-purple-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-purple-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Home Demand
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-500 flex items-center justify-center">
              <House size={18} weight="duotone" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {realtime.homeConsumption.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/10">
            <span>Today:</span>
            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{dailyTotals.totalConsumptionKWh} kWh</span>
          </div>
        </div>

        {/* STAT 3: BATTERY STORAGE */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-emerald-500/30 text-white shadow-emerald-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-emerald-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Battery Bank
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {realtime.batterySoC}%
            </span>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {Math.abs(realtime.batteryPower).toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/10">
            <span>Flow:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {realtime.batteryPower < 0 ? 'Charging' : realtime.batteryPower > 0 ? 'Discharging' : 'Idle'}
            </span>
          </div>
        </div>

        {/* STAT 4: GRID CONNECTION */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-sky-500/30 text-white shadow-sky-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-sky-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Grid Flow
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-500 flex items-center justify-center">
              <Plug size={18} weight="duotone" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {Math.abs(realtime.gridPower).toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/10">
            <span>Status:</span>
            <span className="font-bold text-sky-600 dark:text-sky-400">
              {realtime.gridPower < 0 ? 'Exporting' : realtime.gridPower > 0 ? 'Importing' : 'Balanced'}
            </span>
          </div>
        </div>

        {/* STAT 5: AUTARKY RATE */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-white/10 text-white' 
            : 'bg-white/70 hover:bg-white/90 border-slate-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Autarky Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <ShieldCheck size={18} weight="duotone" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {dailyTotals.autarkyRate}%
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/10">
            <span>Self-sufficiency:</span>
            <span className="font-bold text-slate-900 dark:text-white">High</span>
          </div>
        </div>

        {/* STAT 6: SELF-CONSUMPTION */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-white/10 text-white' 
            : 'bg-white/70 hover:bg-white/90 border-slate-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Self-Consumption
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Sparkle size={18} weight="duotone" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {dailyTotals.selfConsumptionRate}%
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-white/10">
            <span>PV Utilized:</span>
            <span className="font-bold text-slate-900 dark:text-white">{dailyTotals.solarConsumedKWh} kWh</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 1: 2.5D ISOMETRIC POWER FLOW & DUAL DONUT GAUGES           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Huawei FusionSolar 2.5D Isometric Flow */}
        <div className="lg:col-span-7 flex flex-col">
          <FusionSolarHouseFlow
            realtime={realtime}
            dailyTotals={dailyTotals}
            darkMode={darkMode}
          />
        </div>

        {/* Dual Donut Circular Gauges */}
        <div className="lg:col-span-5 flex flex-col">
          <EnergyGauges
            dailyTotals={dailyTotals}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 2: STACKED AREA POWER SOURCES TIME-SERIES CHART           */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full">
        <PowerSourcesChart
          timeseries24h={timeseries}
          timeseries7d={weeklyTimeseries}
          timeseriesMonth={monthlyTimeseries}
          darkMode={darkMode}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 3: SANKEY CIRCUIT DIAGRAM & ENVIRONMENTAL / COST STATS    */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Device-Level Energy Sankey Diagram */}
        <div className="lg:col-span-7 flex flex-col">
          <EnergySankeyChart
            dailyTotals={dailyTotals}
            deviceConsumers={deviceConsumers}
            darkMode={darkMode}
          />
        </div>

        {/* Environmental Impact Stats & Financial Overview */}
        <div className="lg:col-span-5 flex flex-col space-y-5 sm:space-y-6">
          <EnvironmentalStatsCard
            environmental={environmental}
            darkMode={darkMode}
          />

          <FinancialCostCard
            financials={financials}
            dailyTotals={dailyTotals}
            darkMode={darkMode}
          />
        </div>
      </div>

    </div>
  );
}
