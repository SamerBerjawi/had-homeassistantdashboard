/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy Hero Cards
 * High-density compact hero metric cards displaying:
 * 1. Redesigned Autarky (Self-Sufficiency) Gauge
 * 2. Redesigned Self-Consumption Gauge
 * 3. Lifetime CO2 Emission Reduction (Huawei FusionSolar)
 * 4. Equivalent Trees Planted (Huawei FusionSolar)
 * 5. Standard Coal Saved (Huawei FusionSolar)
 */

import React, { useMemo } from 'react';
import { Tree, CloudCheck, Flame, ShieldCheck, Lightning } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

interface EnergyHeroCardsProps {
  selfSufficiencyPercentage: number;
  selfConsumptionPercentage: number;
  hasSolar: boolean;
  hasBattery?: boolean;
  solarYieldKWh?: number;
  solarConsumedKWh?: number;
  darkMode?: boolean;
}

export default function EnergyHeroCards({
  selfSufficiencyPercentage = 0,
  selfConsumptionPercentage = 0,
  hasSolar = true,
  solarYieldKWh = 0,
  solarConsumedKWh = 0,
  darkMode = true
}: EnergyHeroCardsProps) {
  const states = useAutoLayoutStore((s) => s.states);

  // Huawei Fusion Solar Sensor Entities
  const treeEntity = states['sensor.energy_information_lifetime_equivalent_tree_planted'];
  const co2Entity = states['sensor.energy_information_lifetime_co2_emission_reduction'];
  const coalEntity = states['sensor.energy_information_lifetime_standard_coal_saved'];

  // Gauges Data
  const autarky = Math.min(100, Math.max(0, selfSufficiencyPercentage));
  const selfCons = Math.min(100, Math.max(0, selfConsumptionPercentage));

  const GAUGE_RADIUS = 18;
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

  const autarkyOffset = GAUGE_CIRCUMFERENCE - (autarky / 100) * GAUGE_CIRCUMFERENCE;
  const selfConsOffset = GAUGE_CIRCUMFERENCE - (selfCons / 100) * GAUGE_CIRCUMFERENCE;

  // Format Trees Planted
  const treeData = useMemo(() => {
    const raw = parseFloat(treeEntity?.state || '');
    const value = !isNaN(raw) ? raw : 48.2;
    const formattedVal = value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1);
    const unit = treeEntity?.attributes?.unit_of_measurement || 'Trees';

    return {
      value: formattedVal,
      unit,
      sublabel: 'Lifetime Forest'
    };
  }, [treeEntity]);

  // Format CO2 Emission Reduction
  const co2Data = useMemo(() => {
    const raw = parseFloat(co2Entity?.state || '');
    const value = !isNaN(raw) ? raw : 1428.6;
    const unitRaw = (co2Entity?.attributes?.unit_of_measurement || 'kg').toLowerCase();

    let displayVal = '';
    let displayUnit = 'kg';

    if (unitRaw === 't' || unitRaw === 'ton' || unitRaw === 'tons') {
      displayVal = value.toFixed(2);
      displayUnit = 't';
    } else if (value >= 1000) {
      displayVal = (value / 1000).toFixed(2);
      displayUnit = 't';
    } else {
      displayVal = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
      displayUnit = 'kg';
    }

    return {
      value: displayVal,
      unit: displayUnit,
      sublabel: 'CO₂ Avoided'
    };
  }, [co2Entity]);

  // Format Standard Coal Saved
  const coalData = useMemo(() => {
    const raw = parseFloat(coalEntity?.state || '');
    const value = !isNaN(raw) ? raw : 573.4;
    const unitRaw = (coalEntity?.attributes?.unit_of_measurement || 'kg').toLowerCase();

    let displayVal = '';
    let displayUnit = 'kg';

    if (unitRaw === 't' || unitRaw === 'ton' || unitRaw === 'tons') {
      displayVal = value.toFixed(2);
      displayUnit = 't';
    } else if (value >= 1000) {
      displayVal = (value / 1000).toFixed(2);
      displayUnit = 't';
    } else {
      displayVal = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
      displayUnit = 'kg';
    }

    return {
      value: displayVal,
      unit: displayUnit,
      sublabel: 'Coal Saved'
    };
  }, [coalEntity]);

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
      {/* 1. AUTARKY / SELF-SUFFICIENCY (REDESIGNED) */}
      <div
        className={`p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center gap-3 ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 46 46">
            <defs>
              <linearGradient id="heroAutarkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle
              cx="23"
              cy="23"
              r={GAUGE_RADIUS}
              className={darkMode ? 'stroke-white/10' : 'stroke-slate-200'}
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="23"
              cy="23"
              r={GAUGE_RADIUS}
              stroke="url(#heroAutarkyGrad)"
              strokeWidth="4"
              strokeDasharray={GAUGE_CIRCUMFERENCE}
              strokeDashoffset={autarkyOffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck size={14} weight="fill" className="text-emerald-400" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-tight">
              {autarky.toFixed(0)}%
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-white truncate leading-tight">
            Self-Sufficiency
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            Off-Grid Autarky
          </span>
        </div>
      </div>

      {/* 2. SELF-CONSUMPTION (REDESIGNED) */}
      <div
        className={`p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center gap-3 ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 46 46">
            <defs>
              <linearGradient id="heroSelfConsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <circle
              cx="23"
              cy="23"
              r={GAUGE_RADIUS}
              className={darkMode ? 'stroke-white/10' : 'stroke-slate-200'}
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="23"
              cy="23"
              r={GAUGE_RADIUS}
              stroke="url(#heroSelfConsGrad)"
              strokeWidth="4"
              strokeDasharray={GAUGE_CIRCUMFERENCE}
              strokeDashoffset={selfConsOffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Lightning size={14} weight="fill" className="text-amber-400" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-tight">
              {selfCons.toFixed(0)}%
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-white truncate leading-tight">
            Self-Consumption
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {hasSolar ? `${solarConsumedKWh.toFixed(1)} / ${solarYieldKWh.toFixed(1)} kWh` : 'Solar Utilized'}
          </span>
        </div>
      </div>

      {/* 3. CO2 EMISSION REDUCTION (HUAWEI FUSION SOLAR) */}
      <div
        className={`p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center gap-3 ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <CloudCheck size={20} weight="duotone" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-tight">
              {co2Data.value}
            </span>
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
              {co2Data.unit}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-white truncate leading-tight">
            CO₂ Avoided
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {co2Data.sublabel}
          </span>
        </div>
      </div>

      {/* 4. TREES PLANTED EQUIVALENT (HUAWEI FUSION SOLAR) */}
      <div
        className={`p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center gap-3 ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Tree size={20} weight="duotone" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-tight">
              {treeData.value}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Trees
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-white truncate leading-tight">
            Trees Planted
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {treeData.sublabel}
          </span>
        </div>
      </div>

      {/* 5. STANDARD COAL SAVED (HUAWEI FUSION SOLAR) */}
      <div
        className={`p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center gap-3 col-span-2 sm:col-span-1 ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Flame size={20} weight="duotone" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-tight">
              {coalData.value}
            </span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              {coalData.unit}
            </span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-white truncate leading-tight">
            Coal Conserved
          </span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {coalData.sublabel}
          </span>
        </div>
      </div>
    </div>
  );
}
