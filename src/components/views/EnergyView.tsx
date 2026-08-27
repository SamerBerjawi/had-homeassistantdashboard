/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
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
  PiggyBank,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateEnergyState, EnergyEntityMappingConfig } from '../energy/energyCalculator';
import FusionSolarHouseFlow from '../energy/FusionSolarHouseFlow';
import PowerSourcesChart from '../energy/PowerSourcesChart';
import EnergySankeyChart from '../energy/EnergySankeyChart';
import EnergyGauges from '../energy/EnergyGauges';
import EnvironmentalStatsCard from '../energy/EnvironmentalStatsCard';
import FinancialCostCard from '../energy/FinancialCostCard';
import EnergyEntitySettingsModal from '../energy/EnergyEntitySettingsModal';

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

  // Entity overrides configuration state
  const [entityOverrides, setEntityOverrides] = useState<EnergyEntityMappingConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('homz_energy_entity_mapping');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleSaveOverrides = (newOverrides: EnergyEntityMappingConfig) => {
    setEntityOverrides(newOverrides);
    if (typeof window !== 'undefined') {
      localStorage.setItem('homz_energy_entity_mapping', JSON.stringify(newOverrides));
    }
  };

  const handleResetToAutoDetect = () => {
    setEntityOverrides({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('homz_energy_entity_mapping');
    }
  };

  // Compute live energy telemetry state
  const energyState = useMemo(() => {
    return calculateEnergyState(states, importTariff, exportTariff, currencySymbol, entityOverrides);
  }, [states, importTariff, exportTariff, currencySymbol, entityOverrides]);

  const {
    realtime,
    dailyTotals,
    financials,
    environmental,
    deviceConsumers,
    timeseries,
    weeklyTimeseries,
    monthlyTimeseries,
    boundEntities
  } = energyState;

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 sm:space-y-6 pb-12">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & ENTITY CONFIGURATION BAR                         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
            <Lightning size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Energy & Power System
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Live HA Stream
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Real-time solar generation, home consumption, battery state, and grid exchange
            </p>
          </div>
        </div>

        {/* Configure Entity Mapping Button */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
            darkMode 
              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal size={16} weight="duotone" className="text-amber-500" />
          <span>Configure Entities</span>
        </button>
      </div>

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
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Sun size={18} weight="duotone" />
              <span>Solar PV</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
              Active
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-slate-900 dark:text-white">
              {realtime.solarPower.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Yield Today:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{dailyTotals.solarProductionKWh.toFixed(2)} kWh</span>
          </div>
        </div>

        {/* STAT 2: BATTERY STORAGE */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-emerald-500/30 text-white shadow-emerald-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-emerald-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <BatteryCharging size={18} weight="duotone" />
              <span>Battery</span>
            </div>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
              {realtime.batterySoC}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-slate-900 dark:text-white">
              {Math.abs(realtime.batteryPower).toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Flow:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {realtime.batteryPower > 0.05 ? 'Discharging' : realtime.batteryPower < -0.05 ? 'Charging' : 'Idle'}
            </span>
          </div>
        </div>

        {/* STAT 3: HOME CONSUMPTION */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-purple-500/30 text-white shadow-purple-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-purple-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
              <House size={18} weight="duotone" />
              <span>Home Load</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
              Demand
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-slate-900 dark:text-white">
              {realtime.homeConsumption.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Used Today:</span>
            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{dailyTotals.totalConsumptionKWh.toFixed(2)} kWh</span>
          </div>
        </div>

        {/* STAT 4: GRID EXCHANGE */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-sky-500/30 text-white shadow-sky-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-sky-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
              <Plug size={18} weight="duotone" />
              <span>Grid Exchange</span>
            </div>
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
              realtime.gridPower < 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-sky-500/20 text-sky-400'
            }`}>
              {realtime.gridPower < 0 ? 'Exporting' : 'Importing'}
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-slate-900 dark:text-white">
              {Math.abs(realtime.gridPower).toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kW</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Fed to Grid:</span>
            <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{dailyTotals.solarFedToGridKWh.toFixed(2)} kWh</span>
          </div>
        </div>

        {/* STAT 5: AUTARKY (SELF-SUFFICIENCY) */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-emerald-500/30 text-white shadow-emerald-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-emerald-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <ShieldCheck size={18} weight="duotone" />
              <span>Autarky</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Grid-Free
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-slate-900 dark:text-white">
              {dailyTotals.autarkyRate.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Self-Sufficiency</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{dailyTotals.autarkyRate.toFixed(2)}%</span>
          </div>
        </div>

        {/* STAT 6: SELF CONSUMPTION RATE */}
        <div className={`p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
          darkMode 
            ? 'bg-black/60 hover:bg-black/80 border-cyan-500/30 text-white shadow-cyan-500/5' 
            : 'bg-white/70 hover:bg-white/90 border-cyan-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
              <Sparkle size={18} weight="duotone" />
              <span>Self-Consumed</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              Solar Rate
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-slate-900 dark:text-white">
              {dailyTotals.selfConsumptionRate.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Used on-site:</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{dailyTotals.solarConsumedKWh.toFixed(2)} kWh</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* ROW 1: 3D LOW-POLY HOUSE FLOW & DUAL DONUT GAUGES             */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* 3D Low-Poly House Flow Visualizer */}
        <div className="lg:col-span-7 flex flex-col">
          <FusionSolarHouseFlow
            realtime={realtime}
            dailyTotals={dailyTotals}
            darkMode={darkMode}
          />
        </div>

        {/* Dual Donut Energy Gauges */}
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

      {/* ------------------------------------------------------------- */}
      {/* ENTITY SETTINGS & CONFIGURATION MODAL                         */}
      {/* ------------------------------------------------------------- */}
      <EnergyEntitySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        states={states}
        boundEntities={boundEntities}
        entityOverrides={entityOverrides}
        onSaveOverrides={handleSaveOverrides}
        onResetToAutoDetect={handleResetToAutoDetect}
        darkMode={darkMode}
      />

    </div>
  );
}
