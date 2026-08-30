/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChartBar, Info } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface EnergyUsageGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalConsumption: number;
  hasSolar: boolean;
  hasBattery: boolean;
  hasGrid: boolean;
  darkMode?: boolean;
}

export default function EnergyUsageGraphCard({
  buckets = [],
  totalConsumption = 0,
  hasSolar,
  hasBattery,
  hasGrid,
  darkMode = true
}: EnergyUsageGraphCardProps) {
  const [hoveredBucket, setHoveredBucket] = useState<TransformedEnergyBucket | null>(null);

  // Compute maximum stack height across all buckets for Y-scale
  const maxConsumption = Math.max(
    0.1,
    ...buckets.map((b) => (b.solarToHome || 0) + (b.batteryToHome || 0) + (b.gridToHome || 0))
  );

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
          <div className="p-2 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <ChartBar size={18} weight="fill" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Energy Usage</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Stacked consumption by source
            </p>
          </div>
        </div>

        {/* Total Usage Chip Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total:</span>
          <div className="px-3 py-1.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-mono font-black text-xs">
            {formatNumber(totalConsumption)} kWh
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold mb-4">
        {hasSolar && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className="text-slate-400">Solar Consumed</span>
          </div>
        )}
        {hasBattery && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className="text-slate-400">Battery Discharged</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs" />
          <span className="text-slate-400">Grid Import</span>
        </div>
      </div>

      {/* Stacked Bar Chart Area */}
      <div className="relative w-full h-56 sm:h-64 pt-4 pb-6 flex items-end">
        {buckets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No energy statistics recorded for this period
          </div>
        ) : (
          <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-1.5">
            {buckets.map((bucket, idx) => {
              const solarPart = bucket.solarToHome || 0;
              const batteryPart = bucket.batteryToHome || 0;
              const gridPart = bucket.gridToHome || 0;
              const bucketTotal = solarPart + batteryPart + gridPart;

              const solarHeightPct = (solarPart / maxConsumption) * 100;
              const batteryHeightPct = (batteryPart / maxConsumption) * 100;
              const gridHeightPct = (gridPart / maxConsumption) * 100;
              const totalHeightPct = Math.min(100, Math.max(2, (bucketTotal / maxConsumption) * 100));

              return (
                <div
                  key={bucket.startMs || idx}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBucket(bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                >
                  {/* The Stacked Bar Column */}
                  <div
                    className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:brightness-125"
                    style={{ height: `${bucketTotal > 0 ? totalHeightPct : 1}%` }}
                  >
                    {/* Solar Segment (Bottom) */}
                    {solarPart > 0 && (
                      <div
                        className="w-full bg-amber-500 transition-all duration-300"
                        style={{ height: `${(solarPart / (bucketTotal || 1)) * 100}%` }}
                      />
                    )}
                    {/* Battery Segment (Middle) */}
                    {batteryPart > 0 && (
                      <div
                        className="w-full bg-emerald-500 transition-all duration-300"
                        style={{ height: `${(batteryPart / (bucketTotal || 1)) * 100}%` }}
                      />
                    )}
                    {/* Grid Segment (Top) */}
                    {gridPart > 0 && (
                      <div
                        className="w-full bg-sky-400 transition-all duration-300"
                        style={{ height: `${(gridPart / (bucketTotal || 1)) * 100}%` }}
                      />
                    )}
                    {bucketTotal === 0 && (
                      <div className="w-full h-full bg-slate-700/20" />
                    )}
                  </div>

                  {/* X-Axis Tick Label (Show selectively to prevent crowding) */}
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
              ? 'bg-slate-950/95 border-purple-500/40 text-white'
              : 'bg-white/95 border-purple-300 text-slate-900'
          }`}
        >
          <div className="font-bold font-mono text-purple-400 mb-1 border-b border-white/10 pb-1">
            {hoveredBucket.label}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {hasSolar && (
              <div className="flex justify-between gap-3 text-amber-400">
                <span>Solar:</span>
                <span>{(hoveredBucket.solarToHome || 0).toFixed(2)} kWh</span>
              </div>
            )}
            {hasBattery && (
              <div className="flex justify-between gap-3 text-emerald-400">
                <span>Battery:</span>
                <span>{(hoveredBucket.batteryToHome || 0).toFixed(2)} kWh</span>
              </div>
            )}
            <div className="flex justify-between gap-3 text-sky-400">
              <span>Grid:</span>
              <span>{(hoveredBucket.gridToHome || 0).toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between gap-3 font-bold text-white pt-1 border-t border-white/10">
              <span>Total:</span>
              <span>{(hoveredBucket.homeConsumption || 0).toFixed(2)} kWh</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
