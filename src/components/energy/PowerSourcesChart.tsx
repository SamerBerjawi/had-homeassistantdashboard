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
  Scales,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';
import { InstantaneousPowerTelemetry } from '../../utils/energyMath';
import { EnergyHistoryPeriod } from '../../services/haEnergyStatistics';
import { EnergyPreferences, ExtractedEnergyStatisticIds } from '../../services/haEnergyPreferences';
import { useEnergyComparison } from '../../hooks/useEnergyComparison';

export interface PowerSourcesChartProps {
  buckets: TransformedEnergyBucket[];
  realtime?: InstantaneousPowerTelemetry;
  hasSolar?: boolean;
  hasGrid?: boolean;
  hasBattery?: boolean;
  darkMode?: boolean;
  className?: string;

  // Comparison context
  period?: EnergyHistoryPeriod;
  targetDate?: Date;
  customRange?: { start: Date; end: Date } | null;
  resolvedEntityIds?: ExtractedEnergyStatisticIds | null;
  preferences?: EnergyPreferences | null;
  currency?: string;
}

interface PowerDataPoint {
  date: Date;
  minuteOfDay: number;
  xAxisLabel: string;
  timeFormatted: string;
  solar: number;
  gridImport: number;
  batteryDischarge: number;
  batteryChargeNegative: number;
  gridExportNegative: number;
  homeConsumption: number;
  netGrid: number;
  netBattery: number;
  // Contour strokes for individual series (only non-null where active to prevent overwriting other lines)
  solarLine: number | null;
  gridImportLine: number | null;
  batteryDischargeLine: number | null;
  batteryChargeLine: number | null;
  gridExportLine: number | null;

  // Comparison series (when Compare Mode is active)
  compareSolar?: number | null;
  compareHome?: number | null;
  compareGridImport?: number | null;
  compareBatteryDischarge?: number | null;
}

export default function PowerSourcesChart({
  buckets = [],
  realtime,
  hasSolar = true,
  hasGrid = true,
  hasBattery = true,
  darkMode = true,
  className = '',
  period,
  targetDate,
  customRange,
  resolvedEntityIds,
  preferences,
  currency
}: PowerSourcesChartProps) {
  // Year-over-Year comparison data hook
  const comparison = useEnergyComparison({
    period: period || 'day',
    targetDate: targetDate || new Date(),
    customRange,
    resolvedEntityIds,
    preferences,
    currency
  });
  // Visibility toggles for each flow series
  const [showSolar, setShowSolar] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showHome, setShowHome] = useState(true);

  // Transform 5-minute / period buckets into continuous power streams (kW) or energy flows (kWh)
  // Stack positive flows above baseline, negative flows below baseline, with dashed consumption overlay
  const { chartData, currentMinuteOfDay, isViewingToday, isSingleDay } = useMemo(() => {
    if (buckets.length === 0) {
      return { chartData: [], currentMinuteOfDay: 0, isViewingToday: false, isSingleDay: true };
    }

    // 0. Detect timeline mode: Single Day (<= 28h) vs Multi-Day (Week, Month, Year, Custom)
    const totalDurationMs = buckets.length > 0
      ? Math.max(
          buckets[buckets.length - 1].endMs - buckets[0].startMs,
          buckets[0].endMs - buckets[0].startMs
        )
      : 0;
    const isSingleDayView = totalDurationMs > 0 && totalDurationMs <= 28 * 3600 * 1000;

    const now = new Date();
    const todayStr = now.toDateString();
    const isToday = isSingleDayView && buckets.some((b) => new Date(b.startMs).toDateString() === todayStr);
    const nowMinute = now.getHours() * 60 + now.getMinutes();

    let activeBuckets: TransformedEnergyBucket[];
    let dayStartMs = 0;
    let dayEndMs = 0;

    if (isSingleDayView) {
      // 1. Establish reference day for single-day 24h view:
      const firstDate = new Date(buckets[0].startMs);
      dayStartMs = isToday
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
        : new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), 0, 0, 0, 0).getTime();
      dayEndMs = dayStartMs + 24 * 3600 * 1000;

      // Strictly cut series at current timestamp when viewing today, or within 24h for historic days
      const nowMs = now.getTime();
      activeBuckets = isToday
        ? buckets.filter((b) => b.startMs >= dayStartMs && b.startMs <= nowMs)
        : buckets.filter((b) => b.startMs >= dayStartMs && b.startMs < dayEndMs);
    } else {
      // Multi-Day view (Week, Month, Year, Custom): Keep all period buckets
      activeBuckets = buckets;
    }

    if (activeBuckets.length === 0) {
      return { chartData: [], currentMinuteOfDay: nowMinute, isViewingToday: isToday, isSingleDay: isSingleDayView };
    }

    const n = activeBuckets.length;

    // Helper: Convert bucket values to power (kW) or energy (kWh)
    // Single Day: converts energy change to average power rate (kW)
    // Multi-Day: preserves daily/monthly energy totals in kWh
    const computeSeries = (accessor: (b: TransformedEnergyBucket) => number) => {
      return activeBuckets.map((b) => {
        const val = accessor(b) || 0;
        if (isSingleDayView) {
          const durHours = (b.endMs - b.startMs) / 3600000;
          const kw = durHours > 0 ? val / durHours : val * 12;
          return Number(kw.toFixed(2));
        } else {
          return Number(val.toFixed(2));
        }
      });
    };

    const solars = computeSeries((b) => b.solar || 0);
    const gridImports = computeSeries((b) => b.gridImport || 0);
    const gridExports = computeSeries((b) => b.gridExport || 0);
    const batteryDischarges = computeSeries((b) => b.batteryDischarge || 0);
    const batteryCharges = computeSeries((b) => b.batteryCharge || 0);
    const homeConsumptions = computeSeries((b) => b.homeConsumption || 0);

    // Helper to generate clean, connected contour strokes anchored to baseline/underlying series
    const computeAnchoredContour = (
      series: number[],
      baseSeries?: number[],
      threshold = 0.08,
      polarity: 1 | -1 = 1
    ): (number | null)[] => {
      const contour: (number | null)[] = new Array(n).fill(null);
      const isActive = series.map((v) => v > threshold);

      for (let i = 0; i < n; i++) {
        if (isActive[i]) {
          const base = baseSeries ? baseSeries[i] : 0;
          contour[i] = Number((polarity * (base + series[i])).toFixed(2));

          // Anchor left edge if transition from inactive
          if (i > 0 && !isActive[i - 1]) {
            const prevBase = baseSeries ? baseSeries[i - 1] : 0;
            contour[i - 1] = Number((polarity * prevBase).toFixed(2));
          }
          // Anchor right edge if transition to inactive
          if (i < n - 1 && !isActive[i + 1]) {
            const nextBase = baseSeries ? baseSeries[i + 1] : 0;
            contour[i + 1] = Number((polarity * nextBase).toFixed(2));
          }
        }
      }
      return contour;
    };

    const solarLines = computeAnchoredContour(
      hasSolar && showSolar ? solars : new Array(n).fill(0),
      undefined,
      0.02,
      1
    );

    const gridBaseForImport = hasSolar && showSolar ? solars : undefined;
    const gridImportLines = computeAnchoredContour(
      hasGrid && showGrid ? gridImports : new Array(n).fill(0),
      gridBaseForImport,
      0.08,
      1
    );

    const battBaseForDischarge = activeBuckets.map((_, i) =>
      (hasSolar && showSolar ? solars[i] : 0) + (hasGrid && showGrid ? gridImports[i] : 0)
    );
    const batteryDischargeLines = computeAnchoredContour(
      hasBattery && showBattery ? batteryDischarges : new Array(n).fill(0),
      battBaseForDischarge,
      0.08,
      1
    );

    const batteryChargeLines = computeAnchoredContour(
      hasBattery && showBattery ? batteryCharges : new Array(n).fill(0),
      undefined,
      0.08,
      -1
    );

    const gridBaseForExport = hasBattery && showBattery ? batteryCharges : undefined;
    const gridExportLines = computeAnchoredContour(
      hasGrid && showGrid ? gridExports : new Array(n).fill(0),
      gridBaseForExport,
      0.08,
      -1
    );

    const points: PowerDataPoint[] = activeBuckets.map((b, i) => {
      const d = new Date(b.startMs);
      let minuteOfDay = 0;
      let timeFormatted = '';
      let xAxisLabel = '';

      if (isSingleDayView) {
        // Monotonic minute of day relative to dayStartMs:
        // Strictly ranges from 0 (00:00) to 1435 (23:55)
        const rawMinute = Math.round((b.startMs - dayStartMs) / 60000);
        minuteOfDay = Math.min(1440, Math.max(0, rawMinute));
        timeFormatted = d.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        xAxisLabel = timeFormatted;
      } else {
        minuteOfDay = i;
        const bucketDurMs = b.endMs - b.startMs;
        const isMonthlyBucket = bucketDurMs > 25 * 24 * 3600 * 1000;

        if (isMonthlyBucket) {
          xAxisLabel = d.toLocaleDateString(undefined, { month: 'short' });
          timeFormatted = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        } else if (activeBuckets.length <= 8) {
          xAxisLabel = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
          timeFormatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        } else {
          xAxisLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          timeFormatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
      }

      const solar = Math.max(0, solars[i]);
      const gridImport = Math.max(0, gridImports[i]);
      const gridExport = Math.max(0, gridExports[i]);
      const batteryDischarge = Math.max(0, batteryDischarges[i]);
      const batteryCharge = Math.max(0, batteryCharges[i]);

      // Polarity: Export & Charge are negative in the stacked area architecture
      const gridExportNegative = Number((-1 * gridExport).toFixed(2));
      const batteryChargeNegative = Number((-1 * batteryCharge).toFixed(2));

      // Instantaneous Home Consumption (Dashed Line)
      const homeConsumption = Number(Math.max(0, homeConsumptions[i]).toFixed(2));

      const netGrid = Number((gridImport - gridExport).toFixed(2));
      const netBattery = Number((batteryDischarge - batteryCharge).toFixed(2));

      return {
        date: d,
        minuteOfDay,
        xAxisLabel,
        timeFormatted,
        solar,
        gridImport,
        batteryDischarge,
        batteryChargeNegative,
        gridExportNegative,
        homeConsumption,
        netGrid,
        netBattery,
        solarLine: solarLines[i],
        gridImportLine: gridImportLines[i],
        batteryDischargeLine: batteryDischargeLines[i],
        batteryChargeLine: batteryChargeLines[i],
        gridExportLine: gridExportLines[i]
      };
    });

    // For historic single days, extend cleanly to the 24:00 (1440) right border
    if (isSingleDayView && !isToday && points.length > 0) {
      const lastPoint = points[points.length - 1];
      if (lastPoint.minuteOfDay < 1440 && lastPoint.minuteOfDay >= 1430) {
        points.push({
          ...lastPoint,
          date: new Date(dayEndMs),
          minuteOfDay: 1440,
          xAxisLabel: '12:00 AM',
          timeFormatted: '12:00 AM'
        });
      }
    }

    // Map comparison series into points if Compare Mode is enabled
    if (comparison.isCompareEnabled && comparison.compareBuckets.length > 0) {
      if (isSingleDayView) {
        const compFirstDate = new Date(comparison.compareBuckets[0].startMs);
        const compDayStartMs = new Date(
          compFirstDate.getFullYear(),
          compFirstDate.getMonth(),
          compFirstDate.getDate(),
          0,
          0,
          0,
          0
        ).getTime();

        const compMap = new Map<number, { solar: number; home: number; gridImport: number; batteryDischarge: number }>();
        for (const cb of comparison.compareBuckets) {
          const rawMin = Math.round((cb.startMs - compDayStartMs) / 60000);
          const durHours = (cb.endMs - cb.startMs) / 3600000;
          const toKw = (v: number) => Number((durHours > 0 ? v / durHours : v * 12).toFixed(2));
          compMap.set(rawMin, {
            solar: toKw(cb.solar || 0),
            home: toKw(cb.homeConsumption || 0),
            gridImport: toKw(cb.gridImport || 0),
            batteryDischarge: toKw(cb.batteryDischarge || 0)
          });
        }

        for (const pt of points) {
          let comp = compMap.get(pt.minuteOfDay);
          if (!comp) {
            for (let offset = 5; offset <= 30; offset += 5) {
              if (compMap.has(pt.minuteOfDay - offset)) {
                comp = compMap.get(pt.minuteOfDay - offset);
                break;
              }
              if (compMap.has(pt.minuteOfDay + offset)) {
                comp = compMap.get(pt.minuteOfDay + offset);
                break;
              }
            }
          }
          if (comp) {
            pt.compareSolar = comp.solar;
            pt.compareHome = comp.home;
            pt.compareGridImport = comp.gridImport;
            pt.compareBatteryDischarge = comp.batteryDischarge;
          }
        }
      } else {
        const compLen = comparison.compareBuckets.length;
        points.forEach((pt, i) => {
          let cb: TransformedEnergyBucket | undefined;
          if (compLen === points.length) {
            cb = comparison.compareBuckets[i];
          } else {
            const ptDate = pt.date;
            cb =
              comparison.compareBuckets.find((b) => {
                const bDate = new Date(b.startMs);
                return bDate.getDate() === ptDate.getDate() || bDate.getMonth() === ptDate.getMonth();
              }) || comparison.compareBuckets[Math.min(i, compLen - 1)];
          }

          if (cb) {
            pt.compareSolar = Number((cb.solar || 0).toFixed(2));
            pt.compareHome = Number((cb.homeConsumption || 0).toFixed(2));
            pt.compareGridImport = Number((cb.gridImport || 0).toFixed(2));
            pt.compareBatteryDischarge = Number((cb.batteryDischarge || 0).toFixed(2));
          }
        });
      }
    }

    return {
      chartData: points,
      currentMinuteOfDay: nowMinute,
      isViewingToday: isToday,
      isSingleDay: isSingleDayView
    };
  }, [
    buckets,
    hasSolar,
    showSolar,
    hasGrid,
    showGrid,
    hasBattery,
    showBattery,
    showHome,
    comparison.isCompareEnabled,
    comparison.compareBuckets
  ]);

  // Aggregate period totals for toggle pills in multi-day views
  const periodTotals = useMemo(() => {
    if (isSingleDay || chartData.length === 0) return null;
    let home = 0;
    let solar = 0;
    let gridImport = 0;
    let gridExport = 0;
    let batteryCharge = 0;
    let batteryDischarge = 0;

    for (const p of chartData) {
      home += p.homeConsumption;
      solar += p.solar;
      gridImport += p.gridImport;
      gridExport += Math.abs(p.gridExportNegative);
      batteryCharge += Math.abs(p.batteryChargeNegative);
      batteryDischarge += p.batteryDischarge;
    }

    return {
      home: Number(home.toFixed(2)),
      solar: Number(solar.toFixed(2)),
      netGrid: Number((gridImport - gridExport).toFixed(2)),
      netBattery: Number((batteryDischarge - batteryCharge).toFixed(2))
    };
  }, [chartData, isSingleDay]);

  // Summary energy totals for current period vs comparison period
  const comparisonSummary = useMemo(() => {
    if (!comparison.isCompareEnabled) return null;

    let currentSolar = 0;
    let currentHome = 0;
    let currentGrid = 0;
    let currentBattery = 0;

    for (const b of buckets) {
      currentSolar += b.solar || 0;
      currentHome += b.homeConsumption || 0;
      currentGrid += b.gridImport || 0;
      currentBattery += b.batteryDischarge || 0;
    }

    let compSolar = 0;
    let compHome = 0;
    let compGrid = 0;
    let compBattery = 0;

    for (const cb of comparison.compareBuckets) {
      compSolar += cb.solar || 0;
      compHome += cb.homeConsumption || 0;
      compGrid += cb.gridImport || 0;
      compBattery += cb.batteryDischarge || 0;
    }

    const calcDelta = (curr: number, prev: number) => {
      if (prev <= 0.001) {
        return curr > 0.001 ? 100 : 0;
      }
      return ((curr - prev) / prev) * 100;
    };

    return {
      current: {
        solar: Number(currentSolar.toFixed(2)),
        home: Number(currentHome.toFixed(2)),
        grid: Number(currentGrid.toFixed(2)),
        battery: Number(currentBattery.toFixed(2))
      },
      compare: {
        solar: Number(compSolar.toFixed(2)),
        home: Number(compHome.toFixed(2)),
        grid: Number(compGrid.toFixed(2)),
        battery: Number(compBattery.toFixed(2))
      },
      deltas: {
        solar: calcDelta(currentSolar, compSolar),
        home: calcDelta(currentHome, compHome),
        grid: calcDelta(currentGrid, compGrid),
        battery: calcDelta(currentBattery, compBattery)
      }
    };
  }, [comparison.isCompareEnabled, buckets, comparison.compareBuckets]);

  // Dynamically calculate Y-axis domain and nice step ticks based on active flow series
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
      let posVal = Math.max(posStack, showHome ? p.homeConsumption : 0);

      // Expand headroom if comparison curves are visible
      if (comparison.isCompareEnabled) {
        if (hasSolar && showSolar && (p.compareSolar || 0) > posVal) {
          posVal = p.compareSolar || 0;
        }
        if (showHome && (p.compareHome || 0) > posVal) {
          posVal = p.compareHome || 0;
        }
        if (hasGrid && showGrid && (p.compareGridImport || 0) > posVal) {
          posVal = p.compareGridImport || 0;
        }
        if (hasBattery && showBattery && (p.compareBatteryDischarge || 0) > posVal) {
          posVal = p.compareBatteryDischarge || 0;
        }
      }

      if (posVal > maxPositive) maxPositive = posVal;

      const negStack =
        (hasBattery && showBattery ? p.batteryChargeNegative : 0) +
        (hasGrid && showGrid ? p.gridExportNegative : 0);
      if (negStack < minNegative) minNegative = negStack;
    }

    // Include realtime telemetry if visible (only in single-day view)
    if (isSingleDay && realtime) {
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
    else if (span <= 30) step = 5;
    else if (span <= 70) step = 10;
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
  }, [
    chartData,
    hasSolar,
    showSolar,
    hasGrid,
    showGrid,
    hasBattery,
    showBattery,
    showHome,
    realtime,
    isSingleDay,
    comparison.isCompareEnabled
  ]);

  // Real-time instantaneous badge calculations
  const liveGrid = realtime
    ? Number((realtime.gridImportPowerKW - realtime.gridExportPowerKW).toFixed(2))
    : 0;
  const liveBattery = realtime
    ? Number((realtime.batteryDischargePowerKW - realtime.batteryChargePowerKW).toFixed(2))
    : 0;

  // Adaptive X-axis tick interval for multi-day views
  const xAxisInterval = useMemo(() => {
    if (isSingleDay) return 0;
    const len = chartData.length;
    if (len <= 8) return 0; // Week: show every day
    if (len <= 14) return 1; // 2 weeks: show every 2nd day
    if (len <= 31) return 3; // Month: show every 4th day
    return 'preserveStartEnd'; // Year or long custom range
  }, [isSingleDay, chartData.length]);

  // Helper for percentage difference rendering in comparison tooltip
  const renderDiffBadge = (curr: number, prev: number | null | undefined) => {
    if (prev === null || prev === undefined || Math.abs(prev) < 0.005) {
      if (Math.abs(curr) < 0.005) return <span className="text-slate-500 font-mono">0%</span>;
      return <span className="text-emerald-400 font-mono font-bold">+100%</span>;
    }
    const pct = ((curr - prev) / prev) * 100;
    if (Math.abs(pct) < 0.5) return <span className="text-slate-400 font-mono">0%</span>;
    const isPos = pct > 0;
    return (
      <span className={`font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPos ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`}
      </span>
    );
  };

  // Custom Home Assistant Style Tooltip (Dual-mode: Single Period vs YoY Comparison)
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const data: PowerDataPoint = payload[0].payload;
    if (!data) return null;

    const unit = isSingleDay ? ' kW' : ' kWh';

    if (comparison.isCompareEnabled) {
      return (
        <div
          className={`px-3.5 py-2.5 rounded-2xl shadow-2xl border text-xs font-sans backdrop-blur-xl ${
            darkMode
              ? 'bg-slate-950/95 border-white/15 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
          style={{ minWidth: 260 }}
        >
          <div className="flex items-center justify-between font-bold text-[11px] mb-2 pb-1 border-b border-white/10 text-slate-400">
            <span>{data.timeFormatted}</span>
            <span className="font-mono text-amber-500 dark:text-amber-400 font-extrabold">
              {comparison.currentYear} vs {comparison.compareYear}
            </span>
          </div>

          <table className="w-full text-left font-medium text-xs">
            <thead>
              <tr className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <th className="pb-1 font-semibold">Flow</th>
                <th className="pb-1 font-semibold text-right">{comparison.currentYear}</th>
                <th className="pb-1 font-semibold text-right">{comparison.compareYear}</th>
                <th className="pb-1 font-semibold text-right">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {hasSolar && showSolar && (
                <tr>
                  <td className="py-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                    <Sun size={12} weight="duotone" /> Solar
                  </td>
                  <td className="py-1 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                    {data.solar.toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right font-mono text-slate-400">
                    {(data.compareSolar ?? 0).toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right">
                    {renderDiffBadge(data.solar, data.compareSolar)}
                  </td>
                </tr>
              )}
              {showHome && (
                <tr>
                  <td className="py-1 flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                    <House size={12} weight="duotone" /> Home
                  </td>
                  <td className="py-1 text-right font-mono font-bold">
                    {data.homeConsumption.toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right font-mono text-slate-400">
                    {(data.compareHome ?? 0).toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right">
                    {renderDiffBadge(data.homeConsumption, data.compareHome)}
                  </td>
                </tr>
              )}
              {hasGrid && showGrid && (
                <tr>
                  <td className="py-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
                    <Plug size={12} weight="duotone" /> Grid
                  </td>
                  <td className="py-1 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                    {data.gridImport.toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right font-mono text-slate-400">
                    {(data.compareGridImport ?? 0).toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right">
                    {renderDiffBadge(data.gridImport, data.compareGridImport)}
                  </td>
                </tr>
              )}
              {hasBattery && showBattery && (
                <tr>
                  <td className="py-1 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    <BatteryCharging size={12} weight="duotone" /> Battery
                  </td>
                  <td className="py-1 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400">
                    {data.batteryDischarge.toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right font-mono text-slate-400">
                    {(data.compareBatteryDischarge ?? 0).toFixed(2)}{unit}
                  </td>
                  <td className="py-1 text-right">
                    {renderDiffBadge(data.batteryDischarge, data.compareBatteryDischarge)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

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
            <div className="flex items-center justify-between gap-3 text-amber-500 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Solar:
              </span>
              <span className="font-mono font-bold">{data.solar.toFixed(2)}{unit}</span>
            </div>
          )}

          {hasBattery && (
            <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                {data.netBattery >= 0 ? 'Battery Discharge:' : 'Battery Charge:'}
              </span>
              <span className="font-mono font-bold">
                {data.netBattery >= 0 ? `+${data.netBattery.toFixed(2)}` : data.netBattery.toFixed(2)}{unit}
              </span>
            </div>
          )}

          {hasGrid && (
            <div className="flex items-center justify-between gap-3 text-sky-600 dark:text-sky-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                {data.netGrid >= 0 ? 'Grid Import:' : 'Grid Export:'}
              </span>
              <span className="font-mono font-bold">
                {data.netGrid >= 0 ? `+${data.netGrid.toFixed(2)}` : data.netGrid.toFixed(2)}{unit}
              </span>
            </div>
          )}

          <div className={`flex items-center justify-between gap-3 pt-1 border-t ${darkMode ? 'text-slate-200 border-white/10' : 'text-slate-800 border-slate-200'}`}>
            <span className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full border ${darkMode ? 'border-slate-300' : 'border-slate-700'}`} />
              Home Load:
            </span>
            <span className="font-mono font-bold">{data.homeConsumption.toFixed(2)}{unit}</span>
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
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />
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
              {isSingleDay ? 'Power Sources & Instantaneous Flow (kW)' : 'Power Sources & Energy Flow (kWh)'}
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isSingleDay
                ? 'Continuous dynamic stacked power distribution curve'
                : 'Continuous dynamic stacked energy flow curve across period'}
            </p>
          </div>
        </div>

        {/* Interactive Label Pills Acting as Chart Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
          {/* Home Load Toggle Pill */}
          <button
            type="button"
            onClick={() => setShowHome(!showHome)}
            title={showHome ? 'Click to hide Home Load from chart' : 'Click to show Home Load in chart'}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
              showHome
                ? darkMode
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-xs'
                  : 'bg-purple-50 border-purple-200 text-purple-700 shadow-xs'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-slate-500 opacity-50 line-through'
                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 line-through'
            }`}
          >
            <House size={14} weight="fill" className={showHome ? 'text-purple-400' : 'text-slate-500'} />
            <span>Home</span>
            {isSingleDay && realtime && (
              <span className="font-mono">{realtime.homeConsumptionKW.toFixed(2)} kW</span>
            )}
            {!isSingleDay && periodTotals && (
              <span className="font-mono">{periodTotals.home.toFixed(2)} kWh</span>
            )}
          </button>

          {/* Solar Toggle Pill */}
          {hasSolar && (
            <button
              type="button"
              onClick={() => setShowSolar(!showSolar)}
              title={showSolar ? 'Click to hide Solar from chart' : 'Click to show Solar in chart'}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                showSolar
                  ? darkMode
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-xs'
                    : 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
                  : darkMode
                    ? 'bg-white/5 border-white/10 text-slate-500 opacity-50 line-through'
                    : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 line-through'
              }`}
            >
              <Sun size={14} weight="fill" className={showSolar ? 'text-amber-500' : 'text-slate-500'} />
              <span>Solar</span>
              {isSingleDay && realtime && (
                <span className="font-mono">{realtime.solarPowerKW.toFixed(2)} kW</span>
              )}
              {!isSingleDay && periodTotals && (
                <span className="font-mono">{periodTotals.solar.toFixed(2)} kWh</span>
              )}
            </button>
          )}

          {/* Grid Toggle Pill */}
          {hasGrid && (
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? 'Click to hide Grid from chart' : 'Click to show Grid in chart'}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                showGrid
                  ? darkMode
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-xs'
                    : 'bg-sky-50 border-sky-200 text-sky-700 shadow-xs'
                  : darkMode
                    ? 'bg-white/5 border-white/10 text-slate-500 opacity-50 line-through'
                    : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 line-through'
              }`}
            >
              <Plug size={14} weight="fill" className={showGrid ? 'text-sky-400' : 'text-slate-500'} />
              <span>Grid</span>
              {isSingleDay && realtime && (
                <span className="font-mono">{liveGrid >= 0 ? `+${liveGrid.toFixed(2)}` : liveGrid.toFixed(2)} kW</span>
              )}
              {!isSingleDay && periodTotals && (
                <span className="font-mono">{periodTotals.netGrid >= 0 ? `+${periodTotals.netGrid.toFixed(2)}` : periodTotals.netGrid.toFixed(2)} kWh</span>
              )}
            </button>
          )}

          {/* Battery Toggle Pill */}
          {hasBattery && (
            <button
              type="button"
              onClick={() => setShowBattery(!showBattery)}
              title={showBattery ? 'Click to hide Battery from chart' : 'Click to show Battery in chart'}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                showBattery
                  ? darkMode
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-xs'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                  : darkMode
                    ? 'bg-white/5 border-white/10 text-slate-500 opacity-50 line-through'
                    : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 line-through'
              }`}
            >
              {/* Battery Toggle Pill */}
              <BatteryCharging size={14} weight="fill" className={showBattery ? 'text-emerald-400' : 'text-slate-500'} />
              <span>Battery</span>
              {isSingleDay && realtime && (
                <span className="font-mono">{liveBattery >= 0 ? `+${liveBattery.toFixed(2)}` : liveBattery.toFixed(2)} kW</span>
              )}
              {!isSingleDay && periodTotals && (
                <span className="font-mono">{periodTotals.netBattery >= 0 ? `+${periodTotals.netBattery.toFixed(2)}` : periodTotals.netBattery.toFixed(2)} kWh</span>
              )}
            </button>
          )}

          {/* Compare Mode Toggle Pill */}
          <button
            type="button"
            onClick={comparison.toggleCompare}
            title={comparison.isCompareEnabled ? 'Disable Comparison Mode' : 'Enable Year-over-Year Comparison Mode'}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
              comparison.isCompareEnabled
                ? darkMode
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-400'
                  : 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-500'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <Scales size={14} weight={comparison.isCompareEnabled ? 'bold' : 'duotone'} />
            <span>Compare</span>
            {comparison.isCompareEnabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/20 text-slate-950 font-extrabold font-mono">
                {comparison.compareYear}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compare Mode Sub-Bar: Side-by-side Year Selection & Metric Deltas */}
      {comparison.isCompareEnabled && (
        <div
          className={`mb-3 p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all z-10 ${
            darkMode
              ? 'bg-slate-900/80 border-white/10 backdrop-blur-md text-slate-200'
              : 'bg-slate-50/95 border-slate-200 backdrop-blur-md text-slate-800'
          }`}
        >
          {/* Left: 2026 vs Selected Year */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Comparing:
            </span>

            {/* Current Year Badge */}
            <span
              className={`px-2.5 py-1 rounded-xl font-mono font-extrabold border text-xs ${
                darkMode
                  ? 'bg-white/10 border-white/15 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-xs'
              }`}
            >
              {comparison.currentYear} <span className="font-sans font-medium text-[10px] text-slate-400">(This Year)</span>
            </span>

            <span className="font-bold text-slate-400 px-0.5">vs</span>

            {/* Year Selection Pills: 2025, 2024, 2023... */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {comparison.availableYears.map((yr) => {
                const isSelected = yr === comparison.compareYear;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => comparison.setCompareYear(yr)}
                    className={`px-2.5 py-1 rounded-xl font-mono text-xs transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                        : darkMode
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
                          : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>

            {comparison.isLoadingCompare && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 animate-pulse ml-2">
                <ArrowsClockwise size={13} className="animate-spin" />
                <span>Loading {comparison.compareYear} data…</span>
              </span>
            )}
          </div>

          {/* Right: Metric Summary Deltas and Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {comparisonSummary && (
              <div className="flex items-center gap-2 flex-wrap">
                {hasSolar && showSolar && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] ${
                      darkMode
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <Sun size={12} weight="duotone" />
                    <span>Solar:</span>
                    <span className="font-mono font-bold">{comparisonSummary.current.solar.toFixed(1)}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="font-mono">{comparisonSummary.compare.solar.toFixed(1)} kWh</span>
                    <span
                      className={`font-mono font-extrabold ${
                        comparisonSummary.deltas.solar >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {comparisonSummary.deltas.solar >= 0
                        ? `+${comparisonSummary.deltas.solar.toFixed(0)}%`
                        : `${comparisonSummary.deltas.solar.toFixed(0)}%`}
                    </span>
                  </div>
                )}

                {showHome && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] ${
                      darkMode
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                        : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                    }`}
                  >
                    <House size={12} weight="duotone" />
                    <span>Home:</span>
                    <span className="font-mono font-bold">{comparisonSummary.current.home.toFixed(1)}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="font-mono">{comparisonSummary.compare.home.toFixed(1)} kWh</span>
                    <span
                      className={`font-mono font-extrabold ${
                        comparisonSummary.deltas.home <= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {comparisonSummary.deltas.home >= 0
                        ? `+${comparisonSummary.deltas.home.toFixed(0)}%`
                        : `${comparisonSummary.deltas.home.toFixed(0)}%`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Legend guide */}
            <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-0.5 bg-slate-400 rounded-full" />
                <span>{comparison.currentYear}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-amber-400" />
                <span>{comparison.compareYear} (Dashed)</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Recharts Composed Stacked Chart Area - Flexibly fills full card height */}
      <div className="w-full flex-1 min-h-[340px] relative z-10">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No telemetry recorded for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              key={isSingleDay ? 'single-day-composed' : 'multi-day-composed'}
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

                {/* Grid Import Linear Gradient (Sky Blue) */}
                <linearGradient id="gridImportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.88} />
                  <stop offset="60%" stopColor="#0369a1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#075985" stopOpacity={0.08} />
                </linearGradient>

                {/* Battery Discharge Linear Gradient (Emerald Green) */}
                <linearGradient id="batteryDischargeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.88} />
                  <stop offset="60%" stopColor="#059669" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.08} />
                </linearGradient>

                {/* Battery Charge Linear Gradient (Emerald Green - Negative Stack) */}
                <linearGradient id="batteryChargeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.08} />
                  <stop offset="50%" stopColor="#059669" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                </linearGradient>

                {/* Grid Export Linear Gradient (Sky Blue - Negative Stack) */}
                <linearGradient id="gridExportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.08} />
                  <stop offset="50%" stopColor="#0369a1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#075985" stopOpacity={0.85} />
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

              {/* Current time horizon vertical reference line (single-day view only) */}
              {isSingleDay && isViewingToday && (
                <ReferenceLine
                  x={currentMinuteOfDay}
                  stroke="#38bdf8"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              {isSingleDay ? (
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
              ) : (
                <XAxis
                  type="category"
                  dataKey="xAxisLabel"
                  interval={xAxisInterval}
                  tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  tickLine={false}
                />
              )}

              <YAxis
                unit={isSingleDay ? ' kW' : ' kWh'}
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
              {/* POSITIVE STACK AREAS (Monotone cubic spline preserves local   */}
              {/* monotonicity, preventing Runge overshoot and wavy ripples)    */}
              {/* ───────────────────────────────────────────────────────────── */}
              {hasSolar && showSolar && (
                <Area
                  type="monotone"
                  dataKey="solar"
                  stackId="positive"
                  fill="url(#solarGradient)"
                  stroke="none"
                  isAnimationActive={false}
                />
              )}

              {hasGrid && showGrid && (
                <Area
                  type="monotone"
                  dataKey="gridImport"
                  stackId="positive"
                  fill="url(#gridImportGradient)"
                  stroke="none"
                  isAnimationActive={false}
                />
              )}

              {hasBattery && showBattery && (
                <Area
                  type="monotone"
                  dataKey="batteryDischarge"
                  stackId="positive"
                  fill="url(#batteryDischargeGradient)"
                  stroke="none"
                  isAnimationActive={false}
                />
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* NEGATIVE STACK AREAS (Fill only - Emerald Battery, Blue Grid) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {hasBattery && showBattery && (
                <Area
                  type="monotone"
                  dataKey="batteryChargeNegative"
                  stackId="negative"
                  fill="url(#batteryChargeGradient)"
                  stroke="none"
                  isAnimationActive={false}
                />
              )}

              {hasGrid && showGrid && (
                <Area
                  type="monotone"
                  dataKey="gridExportNegative"
                  stackId="negative"
                  fill="url(#gridExportGradient)"
                  stroke="none"
                  isAnimationActive={false}
                />
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* DEDICATED ANCHORED CONTOUR LINES (Monotone spline)            */}
              {/* Cleanly anchored to baseline/underlying stacks without        */}
              {/* disjointed segments or stray lines over inactive layers      */}
              {/* ───────────────────────────────────────────────────────────── */}
              {hasSolar && showSolar && (
                <Line
                  type="monotone"
                  dataKey="solarLine"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}

              {hasGrid && showGrid && (
                <Line
                  type="monotone"
                  dataKey="gridImportLine"
                  stroke="#0284c7"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}

              {hasBattery && showBattery && (
                <Line
                  type="monotone"
                  dataKey="batteryDischargeLine"
                  stroke="#10b981"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}

              {hasBattery && showBattery && (
                <Line
                  type="monotone"
                  dataKey="batteryChargeLine"
                  stroke="#10b981"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}

              {hasGrid && showGrid && (
                <Line
                  type="monotone"
                  dataKey="gridExportLine"
                  stroke="#0284c7"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* HOME CONSUMPTION OVERLAY LINE (Unstacked, Crisp Dashed)      */}
              {/* High contrast in both dark and light modes                   */}
              {/* ───────────────────────────────────────────────────────────── */}
              {showHome && (
                <Line
                  type="monotone"
                  dataKey="homeConsumption"
                  stroke={darkMode ? 'rgba(255, 255, 255, 0.85)' : '#0f172a'}
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* YEAR-OVER-YEAR COMPARISON DASHED LINES (When Compare Mode ON) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {comparison.isCompareEnabled && (
                <>
                  {hasSolar && showSolar && (
                    <Line
                      type="monotone"
                      dataKey="compareSolar"
                      name={`Solar (${comparison.compareYear})`}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}

                  {showHome && (
                    <Line
                      type="monotone"
                      dataKey="compareHome"
                      name={`Home (${comparison.compareYear})`}
                      stroke={darkMode ? '#93c5fd' : '#2563eb'}
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}

                  {hasGrid && showGrid && (
                    <Line
                      type="monotone"
                      dataKey="compareGridImport"
                      name={`Grid (${comparison.compareYear})`}
                      stroke="#38bdf8"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}

                  {hasBattery && showBattery && (
                    <Line
                      type="monotone"
                      dataKey="compareBatteryDischarge"
                      name={`Battery (${comparison.compareYear})`}
                      stroke="#34d399"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
