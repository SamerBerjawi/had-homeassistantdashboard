/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Fire } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface GasUsageGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalGas: number;
  gasUnit?: string;
  darkMode?: boolean;
}

export default function GasUsageGraphCard({
  buckets = [],
  totalGas = 0,
  gasUnit = 'm³',
  darkMode = true
}: GasUsageGraphCardProps) {
  const [hoveredBucket, setHoveredBucket] = useState<TransformedEnergyBucket | null>(null);

  const maxGas = Math.max(0.1, ...buckets.map((b) => b.gasUsage || 0));
  const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between shadow-2xl ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/80'
      }`}
    >
      {/* Header with Title and Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl border ${
              darkMode
                ? 'bg-orange-500/15 text-orange-500 border-orange-500/30'
                : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}
          >
            <Fire size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Gas Usage
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Gas consumption over time
            </p>
          </div>
        </div>

        {/* Total Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total:</span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${
              darkMode
                ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                : 'bg-orange-50 border-orange-200 text-orange-700'
            }`}
          >
            {formatNumber(totalGas)} {gasUnit}
          </div>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative w-full h-56 sm:h-64 pt-4 pb-6 flex items-end">
        {buckets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No gas usage recorded for this period
          </div>
        ) : (
          <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-1.5">
            {buckets.map((bucket, idx) => {
              const gas = bucket.gasUsage || 0;
              const barHeightPct = Math.min(100, Math.max(gas > 0 ? 3 : 0, (gas / maxGas) * 100));

              return (
                <div
                  key={bucket.startMs || idx}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBucket(bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                >
                  {/* Gas Bar */}
                  <div
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-orange-600 to-orange-400 transition-all duration-300 group-hover:brightness-125 shadow-xs"
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
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredBucket && (
        <div
          className={`absolute top-16 right-6 p-3.5 rounded-2xl border shadow-2xl z-30 backdrop-blur-md pointer-events-none transition-all text-xs ${
            darkMode
              ? 'bg-slate-950/95 border-orange-500/40 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}
        >
          <div
            className={`font-bold font-mono mb-1 border-b pb-1 ${
              darkMode ? 'text-orange-400 border-white/10' : 'text-orange-600 border-slate-200'
            }`}
          >
            {hoveredBucket.label}
          </div>
          <div className="font-mono text-[11px] font-bold text-orange-500">
            Usage: {(hoveredBucket.gasUsage || 0).toFixed(2)} {gasUnit}
          </div>
        </div>
      )}
    </div>
  );
}
