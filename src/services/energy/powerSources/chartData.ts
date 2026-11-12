/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Transforms 5-minute / period buckets into continuous power streams (kW) or energy flows (kWh)
 * for the Power Sources chart: positive flows stack above the baseline, negative flows below,
 * with anchored contour lines and optional year-over-year comparison series.
 * Reads the current time via new Date() (today detection and the now-cut of the series).
 */

import type { TransformedEnergyBucket } from '../types';
import type {
  PowerDataPoint,
  PowerSourcesChartData,
  PowerSourcesComparisonInput,
  PowerSourcesSeriesVisibility
} from './types';

export function buildPowerSourcesChartData({
  buckets,
  hasSolar,
  showSolar,
  hasGrid,
  showGrid,
  hasBattery,
  showBattery,
  comparison
}: PowerSourcesSeriesVisibility & {
  buckets: TransformedEnergyBucket[];
  comparison: PowerSourcesComparisonInput;
}): PowerSourcesChartData {
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
}
