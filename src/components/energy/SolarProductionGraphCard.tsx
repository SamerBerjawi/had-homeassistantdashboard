/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface SolarProductionGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalSolar: number;
  forecastTotal?: number | null;
  darkMode?: boolean;
  className?: string;
}

export default function SolarProductionGraphCard({
  buckets = [],
  totalSolar = 0,
  forecastTotal,
  darkMode = true,
  className = ''
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
      className={`w-full h-full rounded-3xl p-5 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${darkMode
        ? 'bg-black/20 text-white'
        : 'bg-white/20 text-slate-900'
        } ${className}`}
    >
      {/* Header with Title and Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${darkMode
              ? 'bg-amber-500/15 text-amber-500'
              : 'bg-amber-50 text-amber-600'
              }`}
          >
            <Sun size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Solar Production
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasForecast ? 'Solar yield vs forecast comparison' : 'Solar PV generation over time'}
            </p>
          </div>
        </div>

        {/* Total Solar Yield Chip Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Yield:</span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${darkMode
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
          >
            {formatNumber(totalSolar)} kWh
          </div>
        </div>
      </div>

      {/* Legend if forecast available */}
      {hasForecast && (
        <div className="flex items-center gap-4 text-xs font-bold mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Actual Production</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400" />
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Solar Forecast</span>
          </div>
        </div>
      )}

      {/* Bar Chart Area with Y-Axis and X-Axis */}
      <div className="relative w-full flex-1 min-h-[200px] sm:min-h-[230px] pt-1 pb-2 flex flex-col justify-between">
        {buckets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No solar production recorded for this period
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="w-full flex-1 flex gap-2 relative">
              {/* Left Y-Axis Scale */}
              <div className="w-10 sm:w-12 flex-shrink-0 flex flex-col justify-between select-none relative pointer-events-none pb-5">
                {/* Y-Axis Label / Unit */}
                <div className={`text-[10px] font-bold uppercase tracking-wider text-right pr-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  kWh
                </div>

                {/* Y-Axis Ticks */}
                <div className="flex-1 relative flex flex-col justify-between">
                  <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {maxSolar >= 10 ? maxSolar.toFixed(0) : maxSolar.toFixed(1)}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {(maxSolar * 0.5) >= 10 ? (maxSolar * 0.5).toFixed(0) : (maxSolar * 0.5).toFixed(1)}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-mono font-bold text-right pr-1 leading-none ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    0.0
                  </span>
                </div>
              </div>

              {/* Main Chart Area with Bars and Grid Lines */}
              <div className="flex-1 h-full flex flex-col justify-end relative pb-5">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pb-5">
                  <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                  <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                  <div className={`w-full h-px ${darkMode ? 'bg-white/20' : 'bg-slate-300'} z-10`} />
                </div>

                {/* Bars */}
                <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-1.5 relative z-10">
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
                            className="absolute w-full max-w-[32px] border-t-2 border-dashed border-amber-400 z-10"
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
                          <span
                            className={`absolute -bottom-5 text-[9px] font-mono font-bold whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}
                          >
                            {bucket.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-Axis Label */}
            <div className={`w-full text-center text-[10px] font-bold uppercase tracking-wider select-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Time
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Hover Tooltip Card */}
      {hoveredBucket && (
        <div
          className={`absolute top-16 right-6 p-3.5 rounded-2xl border shadow-2xl z-30 backdrop-blur-md pointer-events-none transition-all text-xs ${darkMode
            ? 'bg-slate-950/95 border-amber-500/40 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
            }`}
        >
          <div
            className={`font-bold font-mono mb-1 border-b pb-1 ${darkMode ? 'text-amber-400 border-white/10' : 'text-amber-600 border-slate-200'
              }`}
          >
            {hoveredBucket.label}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between gap-3 text-amber-500 font-bold">
              <span>Production:</span>
              <span>{(hoveredBucket.solar || 0).toFixed(2)} kWh</span>
            </div>
            {hoveredBucket.solarForecast !== null && (
              <div className={`flex justify-between gap-3 font-medium ${darkMode ? 'text-amber-200' : 'text-amber-700'}`}>
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
