/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Drop } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface WaterUsageGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalWater: number;
  waterUnit?: string;
  darkMode?: boolean;
}

export default function WaterUsageGraphCard({
  buckets = [],
  totalWater = 0,
  waterUnit = 'L',
  darkMode = true
}: WaterUsageGraphCardProps) {
  const [hoveredBucket, setHoveredBucket] = useState<TransformedEnergyBucket | null>(null);

  const maxWater = Math.max(0.1, ...buckets.map((b) => b.waterUsage || 0));
  const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 backdrop-blur-sm transition-all duration-300 relative flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode
          ? 'bg-black/20 text-white'
          : 'bg-white/20 text-slate-900'
      }`}
    >
      {/* Header with Title and Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${
              darkMode
                ? 'bg-cyan-500/15 text-cyan-400'
                : 'bg-cyan-50 text-cyan-600'
            }`}
          >
            <Drop size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Water Usage
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Water consumption over time
            </p>
          </div>
        </div>

        {/* Total Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total:</span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${
              darkMode
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-cyan-50 border-cyan-200 text-cyan-700'
            }`}
          >
            {formatNumber(totalWater)} {waterUnit}
          </div>
        </div>
      </div>

      {/* Bar Chart Area with Y-Axis and X-Axis */}
      <div className="relative w-full h-56 sm:h-64 pt-1 pb-2 flex flex-col justify-between">
        {buckets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No water usage recorded for this period
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="w-full flex-1 flex gap-2 relative">
              {/* Left Y-Axis Scale */}
              <div className="w-10 sm:w-12 flex-shrink-0 flex flex-col justify-between select-none relative pointer-events-none pb-5">
                {/* Y-Axis Label / Unit */}
                <div className={`text-[10px] font-bold uppercase tracking-wider text-right pr-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {waterUnit}
                </div>

                {/* Y-Axis Ticks */}
                <div className="flex-1 relative flex flex-col justify-between">
                  <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {maxWater >= 10 ? maxWater.toFixed(0) : maxWater.toFixed(1)}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {(maxWater * 0.5) >= 10 ? (maxWater * 0.5).toFixed(0) : (maxWater * 0.5).toFixed(1)}
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
                    const water = bucket.waterUsage || 0;
                    const barHeightPct = Math.min(100, Math.max(water > 0 ? 3 : 0, (water / maxWater) * 100));

                    return (
                      <div
                        key={bucket.startMs || idx}
                        className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                        onMouseEnter={() => setHoveredBucket(bucket)}
                        onMouseLeave={() => setHoveredBucket(null)}
                      >
                        {/* Water Bar */}
                        <div
                          className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-300 group-hover:brightness-125 shadow-xs"
                          style={{ height: `${barHeightPct}%` }}
                        />

                        {/* X-Axis Tick Label */}
                        {(buckets.length <= 12 || idx % Math.ceil(buckets.length / 10) === 0) && (
                          <span
                            className={`absolute -bottom-5 text-[9px] font-mono font-bold whitespace-nowrap ${
                              darkMode ? 'text-slate-400' : 'text-slate-600'
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

      {/* Hover Tooltip */}
      {hoveredBucket && (
        <div
          className={`absolute top-16 right-6 p-3.5 rounded-2xl border shadow-2xl z-30 backdrop-blur-md pointer-events-none transition-all text-xs ${
            darkMode
              ? 'bg-slate-950/95 border-cyan-500/40 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}
        >
          <div
            className={`font-bold font-mono mb-1 border-b pb-1 ${
              darkMode ? 'text-cyan-400 border-white/10' : 'text-cyan-600 border-slate-200'
            }`}
          >
            {hoveredBucket.label}
          </div>
          <div className="font-mono text-[11px] font-bold text-cyan-500">
            Usage: {(hoveredBucket.waterUsage || 0).toFixed(1)} {waterUnit}
          </div>
        </div>
      )}
    </div>
  );
}
