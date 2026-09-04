/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy Autarky & Efficiency Gauges Card
 * Clean circular progress rings showing self-sufficiency and solar consumption percentages,
 * with robust responsive layout preventing gauge/text overlap.
 */

import React from 'react';
import { ShieldCheck } from '@phosphor-icons/react';

interface EnergyGaugesCardProps {
  selfSufficiencyPercentage: number;
  selfConsumptionPercentage: number;
  hasSolar: boolean;
  hasBattery?: boolean;
  solarYieldKWh?: number;
  solarConsumedKWh?: number;
  darkMode?: boolean;
}

export default function EnergyGaugesCard({
  selfSufficiencyPercentage = 0,
  selfConsumptionPercentage = 0,
  hasSolar,
  solarYieldKWh = 0,
  solarConsumedKWh = 0,
  darkMode = true
}: EnergyGaugesCardProps) {
  const autarky = Math.min(100, Math.max(0, selfSufficiencyPercentage));
  const selfCons = Math.min(100, Math.max(0, selfConsumptionPercentage));

  const CIRCLE_RADIUS = 32;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  const autarkyOffset = CIRCUMFERENCE - (autarky / 100) * CIRCUMFERENCE;
  const selfConsOffset = CIRCUMFERENCE - (selfCons / 100) * CIRCUMFERENCE;

  return (
    <div
      className={`w-full h-full rounded-3xl p-5 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-col justify-between ${
        darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className={`p-2 rounded-2xl ${
            darkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          <ShieldCheck size={18} weight="fill" />
        </div>
        <h3 className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Autarky & Self-Consumption
        </h3>
      </div>

      {/* Dual Circular Gauge Display */}
      <div className="grid grid-cols-1 gap-3.5 my-auto py-1">
        {/* GAUGE 1: SELF-SUFFICIENCY (AUTARKY) */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-col min-w-0">
            <span className={`text-xs font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Self-Sufficiency
            </span>
            <span className={`text-[11px] font-mono mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Off-Grid Independence
            </span>
          </div>

          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={CIRCLE_RADIUS}
                className={darkMode ? 'stroke-slate-800' : 'stroke-slate-200'}
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r={CIRCLE_RADIUS}
                className="stroke-emerald-500 transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={autarkyOffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-xs font-black font-mono leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {autarky.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* GAUGE 2: SOLAR SELF-CONSUMPTION */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-col min-w-0">
            <span className={`text-xs font-black ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Self-Consumption
            </span>
            <span className={`text-[11px] font-mono mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasSolar ? `${solarConsumedKWh.toFixed(1)} / ${solarYieldKWh.toFixed(1)} kWh` : 'No Solar'}
            </span>
          </div>

          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={CIRCLE_RADIUS}
                className={darkMode ? 'stroke-slate-800' : 'stroke-slate-200'}
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r={CIRCLE_RADIUS}
                className="stroke-amber-500 transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={hasSolar ? selfConsOffset : CIRCUMFERENCE}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-xs font-black font-mono leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {hasSolar ? `${selfCons.toFixed(0)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
