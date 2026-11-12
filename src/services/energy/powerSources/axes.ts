/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Y-axis domain / nice ticks, adaptive X-axis interval and 24h tick labels for the Power Sources chart.
 */

import type { InstantaneousPowerTelemetry } from '../../../utils/energyMath';
import type { PowerDataPoint, PowerSourcesSeriesVisibility } from './types';

// Dynamically calculate Y-axis domain and nice step ticks based on active flow series
export function computeYAxis({
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
  comparison
}: PowerSourcesSeriesVisibility & {
  chartData: PowerDataPoint[];
  showHome: boolean;
  realtime?: InstantaneousPowerTelemetry;
  isSingleDay: boolean;
  comparison: { isCompareEnabled: boolean };
}): { yDomain: [number, number]; yTicks: number[] } {
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
}

// Adaptive X-axis tick interval for multi-day views
export function computeXAxisInterval(isSingleDay: boolean, chartDataLength: number): number | 'preserveStartEnd' {
  if (isSingleDay) return 0;
  const len = chartDataLength;
  if (len <= 8) return 0; // Week: show every day
  if (len <= 14) return 1; // 2 weeks: show every 2nd day
  if (len <= 31) return 3; // Month: show every 4th day
  return 'preserveStartEnd'; // Year or long custom range
}

// Format 24-hour XAxis markers
export const formatXAxisTick = (minute: number) => {
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
