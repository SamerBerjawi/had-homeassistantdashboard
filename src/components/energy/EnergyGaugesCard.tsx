/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck } from '@phosphor-icons/react';

interface EnergyGaugesCardProps {
  selfSufficiencyPercentage: number;
  selfConsumptionPercentage: number;
  hasSolar: boolean;
  hasBattery: boolean;
  solarYieldKWh: number;
  solarConsumedKWh: number;
  darkMode?: boolean;
}

export default function EnergyGaugesCard({
  selfSufficiencyPercentage = 0,
  selfConsumptionPercentage = 0,
  hasSolar,
  hasBattery,
  solarYieldKWh = 0,
  solarConsumedKWh = 0,
  darkMode = true
}: EnergyGaugesCardProps) {
  const autarky = Math.min(100, Math.max(0, selfSufficiencyPercentage));
  const selfCons = Math.min(100, Math.max(0, selfConsumptionPercentage));

  const CIRCLE_RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  const autarkyOffset = CIRCUMFERENCE - (autarky / 100) * CIRCUMFERENCE;
  const selfConsOffset = CIRCUMFERENCE - (selfCons / 100) * CIRCUMFERENCE;

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 backdrop-blur-md transition-all duration-300 relative overflow-hidden isolate flex flex-col justify-between shadow-xs ${
        darkMode
          ? 'bg-slate-900/60 text-white'
          : 'bg-white/60 text-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className={`p-2 rounded-2xl ${
            darkMode
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          <ShieldCheck size={18} weight="fill" />
        </div>
        <div>
          <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Energy Autarky & Efficiency
          </h3>
          <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Self-sufficiency and on-site solar consumption rates
          </p>
        </div>
      </div>

      {/* Dual Circular Gauge Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto py-2">
        {/* GAUGE 1: SELF-SUFFICIENCY (AUTARKY) */}
        <div
          className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Circular Progress Ring */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={CIRCLE_RADIUS}
                className={darkMode ? 'stroke-slate-800' : 'stroke-slate-200'}
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="45"
                cy="45"
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

          <div className="flex flex-col">
            <span className={`text-xs font-extrabold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Self-Sufficiency
            </span>
            <span className={`text-[11px] font-medium mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Home energy provided without the grid
            </span>
          </div>
        </div>

        {/* GAUGE 2: SOLAR SELF-CONSUMPTION */}
        <div
          className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Circular Progress Ring */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={CIRCLE_RADIUS}
                className={darkMode ? 'stroke-slate-800' : 'stroke-slate-200'}
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="45"
                cy="45"
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

          <div className="flex flex-col">
            <span className={`text-xs font-extrabold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Self-Consumption
            </span>
            <span className={`text-[11px] font-medium mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasSolar
                ? `${solarConsumedKWh.toFixed(1)} of ${solarYieldKWh.toFixed(1)} kWh used locally`
                : 'Requires solar source configured'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
