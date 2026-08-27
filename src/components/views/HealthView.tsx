import React from 'react';
import { Heartbeat, Wind, Drop, Thermometer, Sparkle, ShieldCheck, Tree } from '@phosphor-icons/react';

interface ViewProps {
  darkMode?: boolean;
}

export default function HealthView({ darkMode = true }: ViewProps) {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* 4-column mobile grid / adaptive desktop grid container */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
        <div className="col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 p-8 sm:p-12 rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[360px] bg-slate-900/40 dark:bg-slate-900/40 border-white/10 dark:border-white/10">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 mb-4">
            <Heartbeat size={32} weight="duotone" />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
            Health & Environment
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            Track indoor air quality index (AQI), carbon dioxide (CO2) concentrations, volatile organic compounds, humidity, and comfort indices.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <Wind size={15} weight="duotone" className="text-rose-400" />
              <span>Air Quality Index</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <Drop size={15} weight="duotone" className="text-sky-400" />
              <span>Humidity Comfort</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <Tree size={15} weight="duotone" className="text-emerald-400" />
              <span>CO2 & VOCs</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <Thermometer size={15} weight="duotone" className="text-amber-400" />
              <span>Thermal Wellness</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
