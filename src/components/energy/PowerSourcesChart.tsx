/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import {
  Lightning,
  Sun,
  Plug,
  BatteryCharging,
  House,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';
import { InstantaneousPowerTelemetry } from '../../utils/energyMath';

export interface PowerSourcesChartProps {
  buckets: TransformedEnergyBucket[];
  realtime?: InstantaneousPowerTelemetry;
  hasSolar?: boolean;
  hasGrid?: boolean;
  hasBattery?: boolean;
  darkMode?: boolean;
  className?: string;
}

interface PowerDataPoint {
  date: Date;
  minuteOfDay: number;
  timeFormatted: string;
  solar: number;
  gridImport: number;
  batteryDischarge: number;
  batteryChargeNegative: number;
  gridExportNegative: number;
  homeConsumption: number;
  netGrid: number;
  netBattery: number;
}

export default function PowerSourcesChart({
  buckets = [],
  realtime,
  hasSolar = true,
  hasGrid = true,
  hasBattery = true,
  darkMode = true,
  className = ''
}: PowerSourcesChartProps) {
  // Visibility toggles for each flow series
  const [showSolar, setShowSolar] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showHome, setShowHome] = useState(true);

  // Transform 5-minute / period buckets into continuous power streams (kW)
  // Stack positive flows above baseline, negative flows below baseline, with dashed consumption overlay
  const { chartData, currentMinuteOfDay, isViewingToday } = useMemo(() => {
    if (buckets.length === 0) {
      return { chartData: [], currentMinuteOfDay: 0, isViewingToday: false };
    }

    const now = new Date();
    const todayStr = now.toDateString();
    const isToday = buckets.some((b) => new Date(b.startMs).toDateString() === todayStr);
    const nowMinute = now.getHours() * 60 + now.getMinutes();

    // Strictly cut series at the current timestamp when viewing today (no future 0 padding)
    const nowMs = now.getTime();
    const activeBuckets = isToday
      ? buckets.filter((b) => b.startMs <= nowMs)
      : buckets;

    if (activeBuckets.length === 0) {
      return { chartData: [], currentMinuteOfDay: nowMinute, isViewingToday: isToday };
    }

    const n = activeBuckets.length;
    const firstDurationMs = activeBuckets[0].endMs - activeBuckets[0].startMs;
    const is5Min = firstDurationMs < 600000; // < 10 minutes = 5-minute resolution

    // Helper: Convert bucket energy (kWh) to true continuous power (kW) with Gaussian smoothing
    // Matches Home Assistant's smooth cubic spline chart and eliminates raw pulse discretization
    const computePowerSeries = (accessor: (b: TransformedEnergyBucket) => number) => {
      const rawKw = activeBuckets.map((b) => {
        const durHours = (b.endMs - b.startMs) / 3600000;
        const val = accessor(b);
        return durHours > 0 ? val / durHours : val * 12;
      });

      if (!is5Min || n < 3) {
        return rawKw.map((kw) => Number(kw.toFixed(2)));
      }

      // 5-point Gaussian weighted smoothing kernel [0.06, 0.24, 0.40, 0.24, 0.06]
      const weights = [0.06, 0.24, 0.40, 0.24, 0.06];
      const offsets = [-2, -1, 0, 1, 2];
      const result: number[] = new Array(n);

      for (let i = 0; i < n; i++) {
        let weightedSum = 0;
        let totalWeight = 0;

        for (let k = 0; k < offsets.length; k++) {
          const idx = i + offsets[k];
          if (idx >= 0 && idx < n) {
            weightedSum += rawKw[idx] * weights[k];
            totalWeight += weights[k];
          }
        }

        const kw = totalWeight > 0 ? weightedSum / totalWeight : rawKw[i];
        result[i] = Number(kw.toFixed(2));
      }
      return result;
    };

    const solars = computePowerSeries((b) => b.solar || 0);
    const gridImports = computePowerSeries((b) => b.gridImport || 0);
    const gridExports = computePowerSeries((b) => b.gridExport || 0);
    const batteryDischarges = computePowerSeries((b) => b.batteryDischarge || 0);
    const batteryCharges = computePowerSeries((b) => b.batteryCharge || 0);

    const points: PowerDataPoint[] = activeBuckets.map((b, i) => {
      const d = new Date(b.startMs);
      const minuteOfDay = d.getHours() * 60 + d.getMinutes();
      const timeFormatted = d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const solar = Math.max(0, solars[i]);
      const gridImport = Math.max(0, gridImports[i]);
      const gridExport = Math.max(0, gridExports[i]);
      const batteryDischarge = Math.max(0, batteryDischarges[i]);
      const batteryCharge = Math.max(0, batteryCharges[i]);

      // Polarity: Export & Charge are negative in the stacked area architecture
      const gridExportNegative = Number((-1 * gridExport).toFixed(2));
      const batteryChargeNegative = Number((-1 * batteryCharge).toFixed(2));

      // Instantaneous Home Consumption (Dashed Line):
      // Consumption = max(0, Solar + Grid Import + Battery Discharge - |Grid Export| - |Battery Charge|)
      const homeConsumption = Number(
        Math.max(
          0,
          solar + gridImport + batteryDischarge - gridExport - batteryCharge
        ).toFixed(2)
      );

      const netGrid = Number((gridImport - gridExport).toFixed(2));
      const netBattery = Number((batteryDischarge - batteryCharge).toFixed(2));

      return {
        date: d,
        minuteOfDay,
        timeFormatted,
        solar,
        gridImport,
        batteryDischarge,
        batteryChargeNegative,
        gridExportNegative,
        homeConsumption,
        netGrid,
        netBattery
      };
    });

    return {
      chartData: points,
      currentMinuteOfDay: nowMinute,
      isViewingToday: isToday
    };
  }, [buckets]);

  // Dynamically calculate Y-axis domain and nice step ticks based on active flow series
  // Eliminates hardcoded clamp/bounds (e.g. fixed -2kW to 6kW) and cleanly hugs real telemetry
  const { yDomain, yTicks } = useMemo(() => {
    if (chartData.length === 0) {
      return { yDomain: [0, 2] as [number, number], yTicks: [0, 1, 2] };
    }

    let maxPositive = 0;
    let minNegative = 0;

    for (const p of chartData) {
      const posStack =
        (hasSolar && showSolar ? p.solar : 0) +
        (hasGrid && showGrid ? p.gridImport : 0) +
        (hasBattery && showBattery ? p.batteryDischarge : 0);
      const posVal = Math.max(posStack, showHome ? p.homeConsumption : 0);
      if (posVal > maxPositive) maxPositive = posVal;

      const negStack =
        (hasBattery && showBattery ? p.batteryChargeNegative : 0) +
        (hasGrid && showGrid ? p.gridExportNegative : 0);
      if (negStack < minNegative) minNegative = negStack;
    }

    // Include realtime telemetry if visible
    if (realtime) {
      if (hasSolar && showSolar && realtime.solarPowerKW > maxPositive) {
        maxPositive = realtime.solarPowerKW;
      }
      if (showHome && realtime.homeConsumptionKW > maxPositive) {
        maxPositive = realtime.homeConsumptionKW;
      }
      const liveGridExport = realtime.gridExportPowerKW > 0 ? -realtime.gridExportPowerKW : 0;
      const liveBatteryCharge = realtime.batteryChargePowerKW > 0 ? -realtime.batteryChargePowerKW : 0;
      const liveNeg =
        (hasGrid && showGrid ? liveGridExport : 0) +
        (hasBattery && showBattery ? liveBatteryCharge : 0);
      if (liveNeg < minNegative) {
        minNegative = liveNeg;
      }
    }

    const hasNegative = minNegative < -0.05;
    // Add 10% headroom
    const rawMax = Math.max(0.5, maxPositive * 1.1);
    const rawMin = hasNegative ? minNegative * 1.1 : 0;

    const span = rawMax - rawMin;

    // Pick nice step based on data span
    let step = 1;
    if (span <= 0.8) step = 0.2;
    else if (span <= 1.5) step = 0.25;
    else if (span <= 3) step = 0.5;
    else if (span <= 7) step = 1;
    else if (span <= 14) step = 2;
    else step = Math.ceil(span / 6 / 5) * 5;

    const yMax = Number((Math.ceil(rawMax / step) * step).toFixed(2));
    const yMin = hasNegative ? Number((Math.floor(rawMin / step) * step).toFixed(2)) : 0;

    const count = Math.max(1, Math.round((yMax - yMin) / step));
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Number((yMin + i * step).toFixed(2)));
    }

    return {
      yDomain: [yMin, yMax] as [number, number],
      yTicks: ticks
    };
  }, [chartData, hasSolar, showSolar, hasGrid, showGrid, hasBattery, showBattery, showHome, realtime]);

  // Real-time instantaneous badge calculations
  const liveGrid = realtime
    ? Number((realtime.gridImportPowerKW - realtime.gridExportPowerKW).toFixed(2))
    : 0;
  const liveBattery = realtime
    ? Number((realtime.batteryDischargePowerKW - realtime.batteryChargePowerKW).toFixed(2))
    : 0;

  // Custom Home Assistant Style Tooltip
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const data: PowerDataPoint = payload[0].payload;
    if (!data) return null;

    return (
      <div
        className={`px-3.5 py-2.5 rounded-2xl shadow-2xl border text-xs font-sans backdrop-blur-xl ${
          darkMode
            ? 'bg-slate-950/90 border-white/15 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
        style={{ minWidth: 175 }}
      >
        <div className="font-bold text-[11px] mb-2 pb-1 border-b border-white/10 text-slate-400">
          {data.timeFormatted}
        </div>
        <div className="space-y-1.5 font-medium">
          {hasSolar && (
            <div className="flex items-center justify-between gap-3 text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                Solar:
              </span>
              <span className="font-mono font-bold">{data.solar.toFixed(2)} kW</span>
            </div>
          )}

          {hasBattery && (
            <div className="flex items-center justify-between gap-3 text-teal-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-400" />
                Battery:
              </span>
              <span className="font-mono font-bold">
                {data.netBattery >= 0 ? `+${data.netBattery.toFixed(2)}` : data.netBattery.toFixed(2)} kW
              </span>
            </div>
          )}

          {hasGrid && (
            <div className="flex items-center justify-between gap-3 text-sky-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
                Grid:
              </span>
              <span className="font-mono font-bold">
                {data.netGrid >= 0 ? `+${data.netGrid.toFixed(2)}` : data.netGrid.toFixed(2)} kW
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-slate-200 pt-1 border-t border-white/10">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full border border-slate-300 bg-transparent" />
              Consumption:
            </span>
            <span className="font-mono font-bold">{data.homeConsumption.toFixed(2)} kW</span>
          </div>
        </div>
      </div>
    );
  };

  // Format 24-hour XAxis markers
  const formatXAxisTick = (minute: number) => {
    if (minute === 0) return '12:00 AM';
    if (minute === 240) return '4:00 AM';
    if (minute === 480) return '8:00 AM';
    if (minute === 720) return '12:00 PM';
    if (minute === 960) return '4:00 PM';
    if (minute === 1200) return '8:00 PM';
    if (minute === 1440) return '11:59 PM';
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div
      className={`w-full h-full rounded-3xl p-5 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode
          ? 'bg-black/20 text-white'
          : 'bg-white/20 text-slate-900'
      } ${className}`}
    >
      {/* Dynamic Multi-Color Ambient Background Glows with strict containment */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />
      </div>

      {/* Header with Title and Live Instantaneous Power Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${
              darkMode
                ? 'bg-purple-500/15 text-purple-400'
                : 'bg-purple-50 text-purple-600'
            }`}
          >
            <Lightning size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Power Sources & Instantaneous Flow (kW)
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Continuous dynamic stacked power distribution curve
            </p>
          </div>
        </div>

        {/* Live Power Instantaneous Badges */}
        {realtime && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
            {hasSolar && (
              <div
                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                  darkMode
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                <Sun size={14} weight="fill" />
                <span>{realtime.solarPowerKW.toFixed(2)} kW</span>
              </div>
            )}

            {hasGrid && (
              <div
                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                  darkMode
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                    : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
              >
                <Plug size={14} weight="fill" />
                <span>{liveGrid >= 0 ? `+${liveGrid.toFixed(2)}` : liveGrid.toFixed(2)} kW</span>
              </div>
            )}

            {hasBattery && (
              <div
                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                  darkMode
                    ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                    : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}
              >
                <BatteryCharging size={14} weight="fill" />
                <span>{liveBattery >= 0 ? `+${liveBattery.toFixed(2)}` : liveBattery.toFixed(2)} kW</span>
              </div>
            )}

            <div
              className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                darkMode
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <House size={14} weight="fill" />
              <span>{realtime.homeConsumptionKW.toFixed(2)} kW</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend & Series Filter Toggles */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold mb-4 z-10">
        {/* Home Load (Dashed Line) */}
        <button
          type="button"
          onClick={() => setShowHome(!showHome)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            showHome
              ? darkMode
                ? 'bg-white/15 border-white/30 text-white'
                : 'bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
              : darkMode
                ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
                : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
          }`}
        >
          <span className="w-2.5 h-0.5 border-b-2 border-dashed border-white/70" />
          <span>Home Load</span>
          {showHome ? <Eye size={13} /> : <EyeSlash size={13} />}
        </button>

        {/* Solar */}
        {hasSolar && (
          <button
            type="button"
            onClick={() => setShowSolar(!showSolar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showSolar
                ? darkMode
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span>Solar</span>
            {showSolar ? <Eye size={13} /> : <EyeSlash size={13} />}
          </button>
        )}

        {/* Grid (Import / Export) */}
        {hasGrid && (
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showGrid
                ? darkMode
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-xs" />
            <span>Grid (Import + / Export -)</span>
            {showGrid ? <Eye size={13} /> : <EyeSlash size={13} />}
          </button>
        )}

        {/* Battery (Discharge / Charge) */}
        {hasBattery && (
          <button
            type="button"
            onClick={() => setShowBattery(!showBattery)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              showBattery
                ? darkMode
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-teal-50 border-teal-300 text-teal-700 shadow-xs'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-xs" />
            <span>Battery (Discharge + / Charge -)</span>
            {showBattery ? <Eye size={13} /> : <EyeSlash size={13} />}
          </button>
        )}
      </div>

      {/* Main Recharts Composed Stacked Chart Area - Flexibly fills full card height */}
      <div className="w-full flex-1 min-h-[340px] relative z-10">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No telemetry recorded for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 18, right: 16, bottom: 8, left: 4 }}
            >
              <defs>
                {/* Solar Linear Gradient */}
                <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.88} />
                  <stop offset="60%" stopColor="#d97706" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.08} />
                </linearGradient>

                {/* Grid Import Linear Gradient */}
                <linearGradient id="gridImportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.88} />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.08} />
                </linearGradient>

                {/* Battery Discharge Linear Gradient */}
                <linearGradient id="batteryDischargeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.88} />
                  <stop offset="60%" stopColor="#0d9488" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity={0.08} />
                </linearGradient>

                {/* Battery Charge Linear Gradient (Negative Stack) */}
                <linearGradient id="batteryChargeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.08} />
                  <stop offset="60%" stopColor="#0d9488" stopOpacity={0.50} />
                  <stop offset="100%" stopColor="#042f2e" stopOpacity={0.82} />
                </linearGradient>

                {/* Grid Export Linear Gradient (Negative Stack) */}
                <linearGradient id="gridExportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.08} />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity={0.50} />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.82} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                vertical={false}
                strokeDasharray="3 3"
              />

              {/* Zero baseline reference line */}
              <ReferenceLine
                y={0}
                stroke={darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                strokeWidth={1.5}
              />

              {/* Current time horizon vertical reference line */}
              {isViewingToday && (
                <ReferenceLine
                  x={currentMinuteOfDay}
                  stroke="#38bdf8"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              <XAxis
                type="number"
                dataKey="minuteOfDay"
                domain={[0, 1440]}
                ticks={[0, 240, 480, 720, 960, 1200, 1440]}
                tickFormatter={formatXAxisTick}
                tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                axisLine={{ stroke: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                tickLine={false}
              />

              <YAxis
                unit=" kW"
                domain={yDomain}
                ticks={yTicks}
                tickFormatter={(val: number) => (val % 1 === 0 ? val.toString() : val.toFixed(1))}
                tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />

              <Tooltip content={renderTooltip} />

              {/* ───────────────────────────────────────────────────────────── */}
              {/* POSITIVE STACK (stackId="positive")                          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {hasSolar && showSolar && (
                <Area
                  type="natural"
                  dataKey="solar"
                  stackId="positive"
                  fill="url(#solarGradient)"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              )}

              {hasGrid && showGrid && (
                <Area
                  type="natural"
                  dataKey="gridImport"
                  stackId="positive"
                  fill="url(#gridImportGradient)"
                  stroke="#3b82f6"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              )}

              {hasBattery && showBattery && (
                <Area
                  type="natural"
                  dataKey="batteryDischarge"
                  stackId="positive"
                  fill="url(#batteryDischargeGradient)"
                  stroke="#14b8a6"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* NEGATIVE STACK (stackId="negative")                          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {hasBattery && showBattery && (
                <Area
                  type="natural"
                  dataKey="batteryChargeNegative"
                  stackId="negative"
                  fill="url(#batteryChargeGradient)"
                  stroke="#14b8a6"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              )}

              {hasGrid && showGrid && (
                <Area
                  type="natural"
                  dataKey="gridExportNegative"
                  stackId="negative"
                  fill="url(#gridExportGradient)"
                  stroke="#3b82f6"
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* HOME CONSUMPTION OVERLAY LINE (Unstacked, Subtle Dashed)     */}
              {/* ───────────────────────────────────────────────────────────── */}
              {showHome && (
                <Line
                  type="natural"
                  dataKey="homeConsumption"
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
