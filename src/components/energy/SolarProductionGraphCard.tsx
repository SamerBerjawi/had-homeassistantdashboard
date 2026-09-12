/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Sun } from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

interface SolarProductionGraphCardProps {
  buckets: TransformedEnergyBucket[];
  totalSolar: number;
  forecastTotal?: number | null;
  darkMode?: boolean;
  className?: string;
}

interface HourlySlot {
  hour: number;
  label: string;
  timeRange: string;
  solar: number;
  solarForecast: number | null;
  startMs: number;
}

// Generate smooth cubic bezier SVG path from a series of points with clamping
function getSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    // Catmull-Rom to Cubic Bezier
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = Math.max(0, Math.min(100, p1.y + (p2.y - p0.y) / 6));
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = Math.max(0, Math.min(100, p2.y - (p3.y - p1.y) / 6));

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function SolarProductionGraphCard({
  buckets = [],
  totalSolar = 0,
  forecastTotal,
  darkMode = true,
  className = ''
}: SolarProductionGraphCardProps) {
  const [hoveredSlot, setHoveredSlot] = useState<HourlySlot | null>(null);

  // Always build 24 hourly slots from 00:00 to 24:00
  const daySlots = useMemo<HourlySlot[]>(() => {
    const refDate = buckets.length > 0 && buckets[0].startMs
      ? new Date(buckets[0].startMs)
      : new Date();

    return Array.from({ length: 24 }, (_, hour) => {
      const slotDate = new Date(refDate);
      slotDate.setHours(hour, 0, 0, 0);
      const timeMs = slotDate.getTime();
      const label = `${String(hour).padStart(2, '0')}:00`;
      const nextHour = hour + 1;
      const timeRange = `${label} - ${String(nextHour === 24 ? 24 : nextHour).padStart(2, '0')}:00`;

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

      return {
        hour,
        label,
        timeRange,
        solar: match?.solar ?? 0,
        solarForecast: match?.solarForecast ?? null,
        startMs: timeMs
      };
    });
  }, [buckets]);

  const hasForecast = useMemo(() => {
    return (
      (forecastTotal !== null && forecastTotal !== undefined && forecastTotal > 0) ||
      daySlots.some((s) => s.solarForecast !== null && s.solarForecast > 0) ||
      buckets.some((b) => b.solarForecast !== null && b.solarForecast > 0)
    );
  }, [daySlots, buckets, forecastTotal]);

  const maxSolar = useMemo(() => {
    const vals = daySlots.map((s) => Math.max(s.solar || 0, s.solarForecast || 0));
    return Math.max(0.1, ...vals);
  }, [daySlots]);

  // Continuous SVG path for the forecast line across the 24 hours (00:00 to 24:00)
  const forecastPath = useMemo(() => {
    if (!hasForecast) return '';

    // Points spanning from x=0 (00:00) to x=1000 (24:00)
    // Center of hour i is at x = (i + 0.5) / 24 * 1000
    const pts: { x: number; y: number }[] = [];

    // Start point at 00:00 (left edge)
    const startY = (1 - Math.min(1, Math.max(0, (daySlots[0].solarForecast || 0) / maxSolar))) * 100;
    pts.push({ x: 0, y: startY });

    for (let i = 0; i < 24; i++) {
      const slot = daySlots[i];
      const forecast = slot.solarForecast ?? 0;
      const x = ((i + 0.5) / 24) * 1000;
      const y = (1 - Math.min(1, Math.max(0, forecast / maxSolar))) * 100;
      pts.push({ x, y });
    }

    // End point at 24:00 (right edge)
    const endY = (1 - Math.min(1, Math.max(0, (daySlots[23].solarForecast || 0) / maxSolar))) * 100;
    pts.push({ x: 1000, y: endY });

    return getSmoothPath(pts);
  }, [daySlots, maxSolar, hasForecast]);

  const formatNumber = (num: number) =>
    num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 7 Major X-Axis Ticks spanning from 00:00 to 24:00
  const xTicks = [
    { hour: 0, label: '00:00', pos: 'left-0 text-left' },
    { hour: 4, label: '04:00', pos: 'left-[16.67%] -translate-x-1/2 text-center' },
    { hour: 8, label: '08:00', pos: 'left-[33.33%] -translate-x-1/2 text-center' },
    { hour: 12, label: '12:00', pos: 'left-[50%] -translate-x-1/2 text-center' },
    { hour: 16, label: '16:00', pos: 'left-[66.67%] -translate-x-1/2 text-center' },
    { hour: 20, label: '20:00', pos: 'left-[83.33%] -translate-x-1/2 text-center' },
    { hour: 24, label: '24:00', pos: 'right-0 text-right' }
  ];

  return (
    <div
      className={`w-full h-full rounded-3xl p-5 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
      } ${className}`}
    >
      {/* Header with Title and Total Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${
              darkMode ? 'bg-amber-500/15 text-amber-500' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Sun size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Solar Production
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasForecast ? 'Solar yield vs continuous forecast' : '24-hour solar PV generation'}
            </p>
          </div>
        </div>

        {/* Total Solar Yield Chip Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Yield:</span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${
              darkMode
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
            <svg className="w-4 h-2 flex-shrink-0" viewBox="0 0 16 4" fill="none">
              <line
                x1="0"
                y1="2"
                x2="16"
                y2="2"
                stroke={darkMode ? '#94a3b8' : '#64748b'}
                strokeWidth="2"
                strokeDasharray="4 2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Solar Forecast</span>
          </div>
        </div>
      )}

      {/* Bar Chart Area with Y-Axis and 24-Hour X-Axis */}
      <div className="relative w-full flex-1 min-h-[210px] sm:min-h-[240px] pt-1 pb-1 flex flex-col justify-between">
        <div className="w-full flex-1 flex gap-2 relative">
          {/* Left Y-Axis Scale */}
          <div className="w-10 sm:w-12 flex-shrink-0 flex flex-col justify-between select-none relative pointer-events-none pb-7">
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

          {/* Main Chart Area with Bars, Grid Lines, and Continuous Forecast Line */}
          <div className="flex-1 h-full flex flex-col justify-between relative pb-7">
            {/* Drawing Area (Bars + SVG line) */}
            <div className="w-full flex-1 relative">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                <div className={`w-full border-t border-dashed ${darkMode ? 'border-white/5' : 'border-slate-200'}`} />
                <div className={`w-full h-px ${darkMode ? 'bg-white/20' : 'bg-slate-300'} z-10`} />
              </div>

              {/* 24 Hourly Bars */}
              <div className="w-full h-full flex items-end justify-between gap-0.5 sm:gap-1 relative z-10">
                {daySlots.map((slot) => {
                  const solar = slot.solar || 0;
                  const barHeightPct = Math.min(100, Math.max(solar > 0 ? 3 : 0, (solar / maxSolar) * 100));

                  return (
                    <div
                      key={slot.hour}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                      onMouseEnter={() => setHoveredSlot(slot)}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {/* Solar Production Bar */}
                      <div
                        className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300 group-hover:brightness-125 shadow-xs"
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Continuous Striped SVG Forecast Line (Reduced contrast) */}
              {hasForecast && forecastPath && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                  viewBox="0 0 1000 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d={forecastPath}
                    fill="none"
                    stroke={darkMode ? '#94a3b8' : '#64748b'}
                    strokeWidth="2.2"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Active hover indicator on forecast line */}
                  {hoveredSlot !== null && (
                    <circle
                      cx={((hoveredSlot.hour + 0.5) / 24) * 1000}
                      cy={(1 - Math.min(1, Math.max(0, (hoveredSlot.solarForecast || 0) / maxSolar))) * 100}
                      r="4"
                      fill={darkMode ? '#94a3b8' : '#64748b'}
                      stroke={darkMode ? '#0f172a' : '#ffffff'}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
              )}
            </div>

            {/* 24-Hour X-Axis Labels from 00:00 to 24:00 */}
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
          </div>
        </div>

        {/* X-Axis Footer Title */}
        <div className={`w-full text-center text-[10px] font-bold uppercase tracking-wider select-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Time (24 Hours)
        </div>
      </div>

      {/* Dynamic Hover Tooltip Card */}
      {hoveredSlot && (
        <div
          className={`absolute top-16 right-6 p-3.5 rounded-2xl border shadow-2xl z-30 backdrop-blur-md pointer-events-none transition-all text-xs ${
            darkMode
              ? 'bg-slate-950/95 border-amber-500/40 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}
        >
          <div
            className={`font-bold font-mono mb-1 border-b pb-1 ${
              darkMode ? 'text-amber-400 border-white/10' : 'text-amber-600 border-slate-200'
            }`}
          >
            {hoveredSlot.timeRange}
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between gap-3 text-amber-500 font-bold">
              <span>Production:</span>
              <span>{(hoveredSlot.solar || 0).toFixed(2)} kWh</span>
            </div>
            {hoveredSlot.solarForecast !== null && (
              <div className={`flex justify-between gap-3 font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Forecast:</span>
                <span>{hoveredSlot.solarForecast.toFixed(2)} kWh</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
