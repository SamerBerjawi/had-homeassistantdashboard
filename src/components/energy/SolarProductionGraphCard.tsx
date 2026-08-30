/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, CloudSun } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface SolarProductionGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalSolar: number;
  forecastTotal?: number | null;
  darkMode?: boolean;
}

export default function SolarProductionGraphCard({
  buckets = [],
  totalSolar = 0,
  forecastTotal,
  darkMode = true
}: SolarProductionGraphCardProps) {
  const [hoveredBucket, setHoveredBucket] = useState<TransformedEnergyBucket | null>(null);

  const maxSolar = Math.max(
    0.1,
    ...buckets.map((b) => Math.max(b.solar || 0, b.solarForecast || 0))
  );

  const hasForecast = buckets.some((b) => b.solarForecast !== null);
  const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white shadow-2xl'
          : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-xl'
      }`}
    >
      {/* Header with Title and Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Sun size={18} weight="fill" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Solar Production</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {hasForecast ? 'Solar yield vs forecast' : 'Solar PV generation over time'}
            </p>
          </div>
        </div>

        {/* Total Solar Yield Chip Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Yield:</span>
          <div className="px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-black text-xs">
            {formatNumber(totalSolar)} kWh
          </div>
        </div>
      </div>

      {/* Legend if forecast available */}
      {hasForecast && (
        <div className="flex items-center gap-4 text-xs font-bold mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-400">Actual Production</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-300" />
            <span className="text-slate-400">Solar Forecast</span>
          </div>
        </div>
      )}

      {/* Bar Chart Area */}
      <div className="relative w-full h-56 sm:h-64 pt-4 pb-6 flex items-end">
        {buckets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No solar production recorded for this period
          </div>
        ) : (
          <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-1.5">
            {buckets.map((bucket, idx) => {
              const solar = bucket.solar || 0;
              const forecast = bucket.solarForecast || 0;
              const barHeightPct = Math.min(100, Math.max(solar > 0 ? 3 : 0, (solar / maxSolar) * 100));
              const forecastHeightPct = Math.min(100, Math.max(forecast > 0 ? 3 : 0, (forecast / maxSolar) * 100));

              return (
                <div
                  key={bucket.startMs || idx}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBucket(bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                >
                  {/* Forecast Line Marker */}
                  {hasForecast && forecast > 0 && (
                    <div
                      className="absolute w-full max-w-[32px] border-t-2 border-dashed border-amber-300/80 z-10"
                      style={{ bottom: `${forecastHeightPct}%` }}
                    />
                  )}

                  {/* Solar Production Bar */}
                  <div
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300 group-hover:brightness-125 shadow-xs"
                    style={{ height: `${barHeightPct}%` }}
                  />

                  {/* X-Axis Tick Label */}
                  {(buckets.length <= 12 || idx % Math.ceil(buckets.length / 10) === 0) && (
                    <span className="absolute -bottom-5 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {bucket.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Hover Tooltip Card */}
      {hoveredBucket && (
        <div
          className={`absolute top-16 right-6 p-3 rounded-2xl border shadow-xl z-20 backdrop-blur-md pointer-events-none transition-all text-xs ${
            darkMode
              ? 'bg-slate-950/95 border-amber-500/40 text-white'
              : 'bg-white/95 border-amber-300 text-slate-900'
          }`}
        >
          <div className="font-bold font-mono text-amber-400 mb-1 border-b border-white/10 pb-1">
            {hoveredBucket.label}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between gap-3 text-amber-400">
              <span>Production:</span>
              <span>{(hoveredBucket.solar || 0).toFixed(2)} kWh</span>
            </div>
            {hoveredBucket.solarForecast !== null && (
              <div className="flex justify-between gap-3 text-amber-200">
                <span>Forecast:</span>
                <span>{hoveredBucket.solarForecast.toFixed(2)} kWh</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
