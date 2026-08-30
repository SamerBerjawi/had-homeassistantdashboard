/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Plant, 
  Tree, 
  Factory, 
  Fire, 
  GlobeHemisphereWest,
  Info
} from '@phosphor-icons/react';
import { EnvironmentalEnergy } from './energyCalculator';

interface EnvironmentalStatsCardProps {
  environmental: EnvironmentalEnergy;
  darkMode?: boolean;
}

export default function EnvironmentalStatsCard({
  environmental,
  darkMode = true
}: EnvironmentalStatsCardProps) {
  const {
    co2AvoidedKg,
    coalSavedKg,
    treesPlantedEquivalent,
    gasOffsetM3,
    isCo2Estimated,
    carbonIntensitySource,
    carbonIntensityKgPerKWh
  } = environmental;

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-xs">
            <Plant size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Environmental Carbon Offsets
              </h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isCo2Estimated
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              }`}>
                {isCo2Estimated ? 'Estimated Offsets' : 'Live Regional Metrics'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Carbon emissions avoided and fossil fuel savings from rooftop solar generation
            </p>
          </div>
        </div>
      </div>

      {/* METRIC TILES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4">
        
        {/* CARD 1: CO2 Avoided */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:scale-[1.02] ${
          darkMode ? 'bg-emerald-500/10 border-emerald-500/25 text-white' : 'bg-emerald-50/80 border-emerald-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                CO₂ Avoided
              </span>
              {isCo2Estimated && (
                <span className="text-[10px] font-medium text-slate-400 font-mono">
                  (est.)
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center">
              <GlobeHemisphereWest size={18} weight="duotone" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {isCo2Estimated ? '~' : ''}{co2AvoidedKg.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kg</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
              {isCo2Estimated
                ? '~0.475 kg/kWh global average — configure a grid carbon-intensity sensor in Home Assistant for an accurate regional figure'
                : `Measured via ${carbonIntensitySource} (${carbonIntensityKgPerKWh ? carbonIntensityKgPerKWh.toFixed(3) : '0.475'} kg CO₂/kWh)`}
            </p>
          </div>

          {/* Progress bar toward 1 ton milestone */}
          <div className="pt-2 border-t border-emerald-500/20">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              <span>Goal: 1,000 kg</span>
              <span>{((co2AvoidedKg / 1000) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-emerald-500/20 overflow-hidden">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, (co2AvoidedKg / 1000) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: Coal Saved */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:scale-[1.02] ${
          darkMode ? 'bg-amber-500/10 border-amber-500/25 text-white' : 'bg-amber-50/80 border-amber-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Coal Saved
              </span>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                (est.)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center">
              <Factory size={18} weight="duotone" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight">
              ~{coalSavedKg.toFixed(2)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">kg</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
              Rough estimate (~0.400 kg standard coal saved per kWh solar generation)
            </p>
          </div>

          {/* Progress bar toward milestone */}
          <div className="pt-2 border-t border-amber-500/20">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">
              <span>Goal: 500 kg</span>
              <span>{((coalSavedKg / 500) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-amber-500/20 overflow-hidden">
              <div 
                className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, (coalSavedKg / 500) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: Equivalent Trees Planted */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between hover:scale-[1.02] ${
          darkMode ? 'bg-teal-500/10 border-teal-500/25 text-white' : 'bg-teal-50/80 border-teal-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Trees Equivalent
              </span>
              <span className="text-[10px] font-medium text-slate-400 font-mono">
                (est.)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-500 flex items-center justify-center">
              <Tree size={18} weight="duotone" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-teal-600 dark:text-teal-400 tracking-tight">
              ~{(treesPlantedEquivalent as number).toFixed(0)} <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">Trees/yr</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
              Rough approximation (1 mature tree absorbs ~20 kg CO₂ annually)
            </p>
          </div>

          {/* Progress bar toward forest milestone */}
          <div className="pt-2 border-t border-teal-500/20">
            <div className="flex items-center justify-between text-[10px] font-bold text-teal-600 dark:text-teal-400 mb-1">
              <span>Goal: 100 Trees</span>
              <span>{Math.min(100, (treesPlantedEquivalent as number)).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-teal-500/20 overflow-hidden">
              <div 
                className="h-full rounded-full bg-teal-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, treesPlantedEquivalent as number)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-medium ${
        darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <Fire size={15} weight="duotone" className="text-amber-500" />
          <span>Natural Gas Displaced (est.): <strong className="text-slate-900 dark:text-white font-mono font-bold">~{gasOffsetM3.toFixed(2)} m³</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info size={14} />
          <span>Environmental equivalents are rough estimates. Grid carbon intensity varies by regional mix and time.</span>
        </div>
      </div>
    </div>
  );
}
