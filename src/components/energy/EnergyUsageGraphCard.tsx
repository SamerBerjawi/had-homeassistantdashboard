/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChartBar } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface EnergyUsageGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalConsumption: number;
  hasSolar: boolean;
  hasBattery: boolean;
  hasGrid: boolean;
  darkMode?: boolean;
  className?: string;
}

export default function EnergyUsageGraphCard({
  buckets = [],
  totalConsumption = 0,
  hasSolar,
  hasBattery,
  hasGrid,
  darkMode = true,
  className = ''
}: EnergyUsageGraphCardProps) {
  const [hoveredBucket, setHoveredBucket] = useState<TransformedEnergyBucket | null>(null);

  // Check if viewing hourly data (e.g. Day view)
  const isHourly = useMemo(() => {
    if (buckets.length === 0) return true;
    return buckets.every((b) => !b.label || b.label.includes(':'));
  }, [buckets]);

  // When viewing hourly data, build all 24 slots (00:00 to 24:00) so the chart spans the full day,
  // matching SolarProductionGraphCard
  const displayBuckets = useMemo<TransformedEnergyBucket[]>(() => {
    if (!isHourly) return buckets;

    const refDate = buckets.length > 0 && buckets[0].startMs
      ? new Date(buckets[0].startMs)
      : new Date();

    return Array.from({ length: 24 }, (_, hour) => {
      const slotDate = new Date(refDate);
      slotDate.setHours(hour, 0, 0, 0);
      const timeMs = slotDate.getTime();
      const label = `${String(hour).padStart(2, '0')}:00`;

      // Find matching bucket from props
      const match = buckets.find((b) => {
        if (b.startMs) {
          const bd = new Date(b.startMs);
          return bd.getHours() === hour;
        }
        if (b.label) {
          const hourPart = parseInt(b.label.split(':')[0], 10);
          return hourPart === hour;
        }
        return false;
      });

      if (match) return match;

      return {
        startMs: timeMs,
        endMs: timeMs + 3600000,
        label,
        isoDate: slotDate.toISOString(),
        solar: 0,
        gridImport: 0,
        gridExport: 0,
        batteryCharge: 0,
        batteryDischarge: 0,
        solarToHome: 0,
        solarToGrid: 0,
        solarToBattery: 0,
        gridToHome: 0,
        gridToBattery: 0,
        batteryToHome: 0,
        batteryToGrid: 0,
        homeConsumption: 0,
        gasUsage: 0,
        waterUsage: 0
      };
    });
  }, [buckets, isHourly]);

  // Maximum positive and negative stack heights across all displayBuckets for balanced zero baseline
  const maxPositive = Math.max(
    0.1,
    ...displayBuckets.map((b) => {
      const solarPart = b.solarToHome || 0;
      const batteryPart = b.batteryToHome || 0;
      const gridPart = b.gridToHome || 0;
      const total = solarPart + batteryPart + gridPart;
      return total === 0 && (b.homeConsumption || 0) > 0 ? b.homeConsumption : total;
    })
  );

  const maxNegative = Math.max(
    0.05,
    ...displayBuckets.map((b) => (b.gridExport || 0) + (b.batteryCharge || 0))
  );

  const totalRange = maxPositive + maxNegative;
  const positiveRatio = (maxPositive / totalRange) * 100;
  const negativeRatio = (maxNegative / totalRange) * 100;

  // 7 Major X-Axis Ticks spanning from 00:00 to 24:00 (matching SolarProductionGraphCard)
  const xTicks = [
    { hour: 0, label: '00:00', pos: 'left-0 text-left' },
    { hour: 4, label: '04:00', pos: 'left-[16.67%] -translate-x-1/2 text-center' },
    { hour: 8, label: '08:00', pos: 'left-[33.33%] -translate-x-1/2 text-center' },
    { hour: 12, label: '12:00', pos: 'left-[50%] -translate-x-1/2 text-center' },
    { hour: 16, label: '16:00', pos: 'left-[66.67%] -translate-x-1/2 text-center' },
    { hour: 20, label: '20:00', pos: 'left-[83.33%] -translate-x-1/2 text-center' },
    { hour: 24, label: '24:00', pos: 'right-0 text-right' }
  ];

  const formatNumber = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className={`w-full h-full rounded-3xl p-5 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${darkMode
        ? 'bg-black/20 text-white'
        : 'bg-white/20 text-slate-900'
        } ${className}`}
    >
      {/* Header with Title and Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${darkMode
              ? 'bg-purple-500/15 text-purple-400'
              : 'bg-purple-50 text-purple-600'
              }`}
          >
            <ChartBar size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Energy Usage & Return
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Positive home consumption and negative grid return / battery storage
            </p>
          </div>
        </div>

        {/* Total Usage Chip Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Home Total:
          </span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${darkMode
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
              : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
          >
            {formatNumber(totalConsumption)} kWh
          </div>
        </div>
      </div>

      {/* Legend with Positive and Negative indicators */}
      <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold mb-4">
        {hasSolar && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Solar Consumed (+)</span>
          </div>
        )}
        {hasBattery && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Battery Discharged (+)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs" />
          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Grid Import (+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-xs" />
          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Grid Export (-)</span>
        </div>
        {hasBattery && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-xs" />
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Battery Charged (-)</span>
          </div>
        )}
      </div>

      {/* Stacked Bar Chart with Zero Baseline, Y-Axis, and X-Axis */}
      <div className="relative w-full flex-1 min-h-[200px] sm:min-h-[230px] pt-1 pb-2 flex flex-col justify-between">
        {buckets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No energy statistics recorded for this period
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
                  {/* Positive Section Ticks */}
                  <div className="w-full relative flex flex-col justify-between" style={{ height: `${positiveRatio}%` }}>
                    <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      +{maxPositive >= 10 ? maxPositive.toFixed(0) : maxPositive.toFixed(1)}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      +{(maxPositive * 0.5) >= 10 ? (maxPositive * 0.5).toFixed(0) : (maxPositive * 0.5).toFixed(1)}
                    </span>
                  </div>

                  {/* Baseline Zero */}
                  <div className="relative w-full flex items-center justify-end">
                    <span className={`text-[9px] sm:text-[10px] font-mono font-bold text-right pr-1 leading-none -translate-y-1/2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      0.0
                    </span>
                  </div>

                  {/* Negative Section Ticks */}
                  <div className="w-full relative flex flex-col justify-between" style={{ height: `${negativeRatio}%` }}>
                    <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      -{(maxNegative * 0.5) >= 10 ? (maxNegative * 0.5).toFixed(0) : (maxNegative * 0.5).toFixed(1)}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-mono font-medium text-right pr-1 leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      -{maxNegative >= 10 ? maxNegative.toFixed(0) : maxNegative.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Chart Area with Bars and Horizontal Grid Lines */}
              <div className="flex-1 h-full flex flex-col relative pb-5">
                {/* Horizontal Grid lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col pb-5">
                  <div className="w-full flex flex-col justify-between" style={{ height: `${positiveRatio}%` }}>
                    <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                    <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                  </div>
                  <div className={`w-full h-px ${darkMode ? 'bg-white/20' : 'bg-slate-300'} z-10`} />
                  <div className="w-full flex flex-col justify-between" style={{ height: `${negativeRatio}%` }}>
                    <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                    <div className={`w-full border-b border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                  </div>
                </div>

                {/* Upper Positive Section (Home Consumption) */}
                <div
                  className="w-full flex items-end justify-between gap-1 sm:gap-1.5 relative z-10"
                  style={{ height: `${positiveRatio}%` }}
                >
                  {displayBuckets.map((bucket, idx) => {
                    let solarPart = bucket.solarToHome || 0;
                    let batteryPart = bucket.batteryToHome || 0;
                    let gridPart = bucket.gridToHome || 0;
                    let bucketPositive = solarPart + batteryPart + gridPart;
                    if (bucketPositive === 0 && (bucket.homeConsumption || 0) > 0) {
                      bucketPositive = bucket.homeConsumption;
                      gridPart = bucket.homeConsumption;
                    }
                    const heightPct = Math.min(100, Math.max(bucketPositive > 0 ? 3 : 0, (bucketPositive / maxPositive) * 100));

                    return (
                      <div
                        key={`pos-${bucket.startMs || idx}`}
                        className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                        onMouseEnter={() => setHoveredBucket(bucket)}
                        onMouseLeave={() => setHoveredBucket(null)}
                      >
                        <div
                          className="w-full max-w-[24px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:brightness-125 shadow-xs"
                          style={{ height: `${heightPct}%` }}
                        >
                          {solarPart > 0 && (
                            <div
                              className="w-full bg-amber-500"
                              style={{ height: `${(solarPart / (bucketPositive || 1)) * 100}%` }}
                            />
                          )}
                          {batteryPart > 0 && (
                            <div
                              className="w-full bg-emerald-500"
                              style={{ height: `${(batteryPart / (bucketPositive || 1)) * 100}%` }}
                            />
                          )}
                          {gridPart > 0 && (
                            <div
                              className="w-full bg-sky-400"
                              style={{ height: `${(gridPart / (bucketPositive || 1)) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Zero Baseline Axis Divider */}
                <div className={`w-full h-px ${darkMode ? 'bg-white/20' : 'bg-slate-300'} z-10`} />

                {/* Lower Negative Section (Grid Export & Battery Charging) */}
                <div
                  className="w-full flex items-start justify-between gap-1 sm:gap-1.5 relative z-10"
                  style={{ height: `${negativeRatio}%` }}
                >
                  {displayBuckets.map((bucket, idx) => {
                    const exportPart = bucket.gridExport || 0;
                    const chargePart = bucket.batteryCharge || 0;
                    const bucketNegative = exportPart + chargePart;
                    const heightPct = Math.min(100, Math.max(bucketNegative > 0 ? 3 : 0, (bucketNegative / maxNegative) * 100));

                    return (
                      <div
                        key={`neg-${bucket.startMs || idx}`}
                        className="flex-1 h-full flex flex-col justify-start items-center group cursor-pointer relative"
                        onMouseEnter={() => setHoveredBucket(bucket)}
                        onMouseLeave={() => setHoveredBucket(null)}
                      >
                        <div
                          className="w-full max-w-[24px] rounded-b-md overflow-hidden flex flex-col transition-all duration-300 group-hover:brightness-125 shadow-xs"
                          style={{ height: `${heightPct}%` }}
                        >
                          {exportPart > 0 && (
                            <div
                              className="w-full bg-indigo-400"
                              style={{ height: `${(exportPart / (bucketNegative || 1)) * 100}%` }}
                            />
                          )}
                          {chargePart > 0 && (
                            <div
                              className="w-full bg-teal-400"
                              style={{ height: `${(chargePart / (bucketNegative || 1)) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-Axis Labels */}
            {isHourly ? (
              <div className="w-full relative h-5 select-none pt-1">
                {xTicks.map((tick) => (
                  <span
                    key={tick.label}
                    className={`absolute top-1 text-[9px] sm:text-[10px] font-mono font-bold whitespace-nowrap ${
                      tick.pos
                    } ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="w-full relative h-5 select-none pt-1 flex justify-between">
                {displayBuckets.map((bucket, idx) => {
                  const show = displayBuckets.length <= 12 || idx % Math.ceil(displayBuckets.length / 10) === 0;
                  if (!show) return <span key={idx} className="flex-1" />;
                  return (
                    <span
                      key={idx}
                      className={`text-[9px] sm:text-[10px] font-mono font-bold whitespace-nowrap text-center flex-1 ${
                        darkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {bucket.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* X-Axis Label */}
            <div className={`w-full text-center text-[10px] font-bold uppercase tracking-wider select-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isHourly ? 'Time (24 Hours)' : 'Time'}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Hover Tooltip Card */}
      {hoveredBucket && (
        <div
          className={`absolute top-16 right-6 p-3.5 rounded-2xl border shadow-2xl z-30 backdrop-blur-md pointer-events-none transition-all text-xs ${darkMode
            ? 'bg-slate-950/95 border-purple-500/40 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
            }`}
        >
          <div
            className={`font-bold font-mono mb-1.5 border-b pb-1 ${darkMode ? 'text-purple-400 border-white/10' : 'text-purple-600 border-slate-200'
              }`}
          >
            {hoveredBucket.label}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {hasSolar && (hoveredBucket.solarToHome || 0) > 0 && (
              <div className="flex justify-between gap-4 text-amber-500 font-bold">
                <span>Solar to Home:</span>
                <span>+{(hoveredBucket.solarToHome || 0).toFixed(2)} kWh</span>
              </div>
            )}
            {hasBattery && (hoveredBucket.batteryToHome || 0) > 0 && (
              <div className="flex justify-between gap-4 text-emerald-500 font-bold">
                <span>Battery Discharged:</span>
                <span>+{(hoveredBucket.batteryToHome || 0).toFixed(2)} kWh</span>
              </div>
            )}
            {(hoveredBucket.gridToHome || 0) > 0 && (
              <div className="flex justify-between gap-4 text-sky-500 font-bold">
                <span>Grid Imported:</span>
                <span>+{(hoveredBucket.gridToHome || 0).toFixed(2)} kWh</span>
              </div>
            )}
            {(hoveredBucket.gridExport || 0) > 0 && (
              <div className="flex justify-between gap-4 text-indigo-500 font-bold">
                <span>Grid Exported:</span>
                <span>-{(hoveredBucket.gridExport || 0).toFixed(2)} kWh</span>
              </div>
            )}
            {hasBattery && (hoveredBucket.batteryCharge || 0) > 0 && (
              <div className="flex justify-between gap-4 text-teal-500 font-bold">
                <span>Battery Charged:</span>
                <span>-{(hoveredBucket.batteryCharge || 0).toFixed(2)} kWh</span>
              </div>
            )}
            <div
              className={`flex justify-between gap-4 font-black pt-1 border-t ${darkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
                }`}
            >
              <span>Net Home Load:</span>
              <span>{(hoveredBucket.homeConsumption || 0).toFixed(2)} kWh</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
