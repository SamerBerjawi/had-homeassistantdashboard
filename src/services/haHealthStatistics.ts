/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Home Assistant Historical Health Statistics Service
 * Ingests recorder statistics via `recorder/statistics_during_period`
 * and falls back to `history/history_during_period` or realistic demo traces.
 */

import { haWebSocketService } from './haWebSocket';
import {
  HealthTimeRange,
  HealthMetricKey,
  HealthTimeseriesPoint,
  HealthMetricSummary,
  HEALTH_METRIC_DEFINITIONS,
} from '../types/health';
import { HAState } from '../types';

export interface HAStatisticRecord {
  start: number | string;
  end?: number | string;
  mean?: number | null;
  min?: number | null;
  max?: number | null;
  state?: number | null;
  sum?: number | null;
  change?: number | null;
}

export interface HealthTimeWindow {
  startTime: string;
  endTime: string;
  period: 'hour' | 'day' | 'month';
  displayLabel: string;
}

/**
 * Calculates time window and aggregation period for the requested time range
 */
export function getHealthTimeWindow(range: HealthTimeRange): HealthTimeWindow {
  const now = new Date();
  let start: Date;
  let period: 'hour' | 'day' | 'month' = 'hour';
  let displayLabel = 'Today';

  switch (range) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      period = 'hour';
      displayLabel = 'Today';
      break;
    }
    case 'week': {
      // Start of week (Monday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      period = 'day';
      displayLabel = 'This Week';
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      period = 'day';
      displayLabel = 'This Month';
      break;
    }
    case 'year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      period = 'month';
      displayLabel = 'This Year';
      break;
    }
  }

  return {
    startTime: start.toISOString(),
    endTime: now.toISOString(),
    period,
    displayLabel,
  };
}

function formatPointLabel(date: Date, range: HealthTimeRange): string {
  switch (range) {
    case 'today':
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    case 'week':
      return date.toLocaleDateString([], { weekday: 'short' });
    case 'month':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case 'year':
      return date.toLocaleDateString([], { month: 'short' });
  }
}

/**
 * Parses numeric value from state string or number
 */
export function parseHealthNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Generates realistic Apple Health demo/preview timeseries for a given metric
 */
export function generateDemoTimeseries(
  key: HealthMetricKey,
  range: HealthTimeRange,
  baseVal?: number
): HealthTimeseriesPoint[] {
  const def = HEALTH_METRIC_DEFINITIONS[key];
  const now = Date.now();
  const points: HealthTimeseriesPoint[] = [];

  let count = 12;
  let intervalMs = 2 * 3600 * 1000;

  switch (range) {
    case 'today':
      count = 14;
      intervalMs = 3600 * 1000;
      break;
    case 'week':
      count = 7;
      intervalMs = 24 * 3600 * 1000;
      break;
    case 'month':
      count = 30;
      intervalMs = 24 * 3600 * 1000;
      break;
    case 'year':
      count = 12;
      intervalMs = 30 * 24 * 3600 * 1000;
      break;
  }

  // Determine typical baseline per metric
  let baseline = baseVal && baseVal > 0 ? baseVal : 0;
  if (!baseline) {
    switch (key) {
      case 'healthSteps':
        baseline = range === 'today' ? 650 : 8400;
        break;
      case 'activeEnergy':
        baseline = range === 'today' ? 35 : 460;
        break;
      case 'restingEnergy':
        baseline = range === 'today' ? 120 : 1720;
        break;
      case 'distance':
        baseline = range === 'today' ? 0.6 : 6.2;
        break;
      case 'flightsClimbed':
        baseline = range === 'today' ? 1 : 9;
        break;
      case 'exerciseTime':
        baseline = range === 'today' ? 5 : 34;
        break;
      case 'activePace':
        baseline = 5.4;
        break;
      case 'vo2Max':
        baseline = 44.5;
        break;
      case 'heartRate':
        baseline = 72;
        break;
      case 'restingHeartRate':
        baseline = 61;
        break;
      case 'walkingHeartRate':
        baseline = 94;
        break;
      case 'hrv':
        baseline = 48;
        break;
      case 'respiratoryRate':
        baseline = 15;
        break;
      case 'bloodOxygen':
        baseline = 98;
        break;
      case 'bpSystolic':
        baseline = 118;
        break;
      case 'bpDiastolic':
        baseline = 76;
        break;
      case 'bloodGlucose':
        baseline = 92;
        break;
      case 'bodyTemperature':
        baseline = 36.6;
        break;
      case 'basalBodyTemperature':
        baseline = 36.4;
        break;
      case 'weight':
        baseline = 74.5;
        break;
      case 'height':
        baseline = 178;
        break;
      case 'bodyFat':
        baseline = 16.2;
        break;
      case 'leanBodyMass':
        baseline = 62.4;
        break;
      case 'water':
        baseline = range === 'today' ? 0.35 : 2.2;
        break;
      default:
        baseline = 50;
    }
  }

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const wave = Math.sin((i / count) * Math.PI * 3);
    const noise = Math.cos(i * 1.7) * 0.15;
    let factor = 1 + wave * 0.2 + noise;

    if (key === 'bloodOxygen') {
      factor = 1 + (Math.sin(i) * 0.015);
    } else if (key === 'weight' || key === 'height' || key === 'bodyFat' || key === 'leanBodyMass') {
      factor = 1 + (Math.sin(i * 0.3) * 0.01);
    }

    let val = Math.max(0, baseline * factor);
    if (def.decimals === 0) {
      val = Math.round(val);
    } else {
      const pow = Math.pow(10, def.decimals);
      val = Math.round(val * pow) / pow;
    }

    points.push({
      date: t,
      label: formatPointLabel(t, range),
      value: val,
      min: Math.round(val * 0.9 * 10) / 10,
      max: Math.round(val * 1.1 * 10) / 10,
      mean: val,
      sum: val,
    });
  }

  return points;
}

/**
 * Evaluates health status against normal clinical ranges or user goals
 */
function evaluateStatus(
  key: HealthMetricKey,
  value: number | null
): 'normal' | 'low' | 'elevated' | 'optimal' | 'unknown' {
  if (value === null || isNaN(value)) return 'unknown';

  const def = HEALTH_METRIC_DEFINITIONS[key];
  if (def.normalRange) {
    if (value < def.normalRange.min) return 'low';
    if (value > def.normalRange.max) return 'elevated';
    return 'normal';
  }

  if (def.goal) {
    if (value >= def.goal) return 'optimal';
    if (value >= def.goal * 0.7) return 'normal';
    return 'low';
  }

  return 'normal';
}

/**
 * Ingests and calculates summary statistics for a given health metric
 */
export function buildMetricSummary(
  key: HealthMetricKey,
  stateObj: HAState | undefined,
  history: HealthTimeseriesPoint[]
): HealthMetricSummary {
  const def = HEALTH_METRIC_DEFINITIONS[key];
  const rawCurrent = stateObj ? parseHealthNumber(stateObj.state) : null;
  const currentVal = rawCurrent !== null ? rawCurrent : (history.length > 0 ? history[history.length - 1].value : null);

  const values = history.map((p) => p.value).filter((v) => !isNaN(v));
  const rawMin = values.length > 0 ? Math.min(...values) : undefined;
  const rawMax = values.length > 0 ? Math.max(...values) : undefined;
  const decPower = Math.pow(10, Math.min(def.decimals, 1));
  const min = rawMin !== undefined ? (def.decimals === 0 ? Math.round(rawMin) : Math.round(rawMin * decPower) / decPower) : undefined;
  const max = rawMax !== undefined ? (def.decimals === 0 ? Math.round(rawMax) : Math.round(rawMax * decPower) / decPower) : undefined;
  const totalSum = values.length > 0 ? values.reduce((a, b) => a + b, 0) : undefined;
  const average = values.length > 0 ? Math.round((totalSum! / values.length) * 10) / 10 : undefined;

  let changePercent: number | undefined;
  if (values.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
    if (avg1 > 0) {
      changePercent = Math.round(((avg2 - avg1) / avg1) * 100);
    }
  }

  const unit = stateObj?.attributes?.unit_of_measurement || def.defaultUnit;
  const friendlyName = stateObj?.attributes?.friendly_name || def.label;

  return {
    key,
    entityId: stateObj?.entity_id,
    currentValue: currentVal,
    unit,
    friendlyName,
    lastUpdated: stateObj?.last_updated,
    min,
    max,
    average,
    totalSum: def.chartType === 'bar' ? totalSum : undefined,
    changePercent,
    history,
    status: evaluateStatus(key, currentVal),
  };
}

/**
 * Fetches historical statistics for multiple health entity IDs via Home Assistant WebSocket
 */
export async function fetchHealthStatistics(
  range: HealthTimeRange,
  entityIdMap: Partial<Record<HealthMetricKey, string>>,
  isLiveMode: boolean
): Promise<Record<HealthMetricKey, HealthTimeseriesPoint[]>> {
  const result: Record<string, HealthTimeseriesPoint[]> = {};
  const { startTime, endTime, period } = getHealthTimeWindow(range);

  const entries = Object.entries(entityIdMap) as [HealthMetricKey, string][];
  const validEntries = entries.filter(([_, id]) => Boolean(id));

  // If not live mode or no entities registered, return demo traces only in demo mode
  if (!isLiveMode || validEntries.length === 0) {
    for (const [key] of Object.entries(HEALTH_METRIC_DEFINITIONS)) {
      result[key] = haWebSocketService.isDemo()
        ? generateDemoTimeseries(key as HealthMetricKey, range)
        : [];
    }
    return result as Record<HealthMetricKey, HealthTimeseriesPoint[]>;
  }

  const statisticIds = validEntries.map(([_, id]) => id);

  try {
    const statsRes = await haWebSocketService.sendRequest<Record<string, HAStatisticRecord[]>>(
      'recorder/statistics_during_period',
      {
        start_time: startTime,
        end_time: endTime,
        statistic_ids: statisticIds,
        period,
        types: ['mean', 'min', 'max', 'state', 'sum', 'change'],
      }
    ).catch(() => null);

    if (statsRes && typeof statsRes === 'object') {
      for (const [key, entityId] of validEntries) {
        const records = statsRes[entityId];
        if (records && records.length > 0) {
          result[key] = records.map((rec) => {
            const date = new Date(rec.start);
            let val = 0;
            const def = HEALTH_METRIC_DEFINITIONS[key];

            if (def.chartType === 'bar') {
              val = rec.change ?? rec.sum ?? rec.state ?? rec.mean ?? 0;
            } else {
              val = rec.mean ?? rec.state ?? rec.max ?? 0;
            }

            return {
              date,
              label: formatPointLabel(date, range),
              value: Number(val),
              min: rec.min !== null && rec.min !== undefined ? Number(rec.min) : undefined,
              max: rec.max !== null && rec.max !== undefined ? Number(rec.max) : undefined,
              mean: rec.mean !== null && rec.mean !== undefined ? Number(rec.mean) : undefined,
              sum: rec.sum !== null && rec.sum !== undefined ? Number(rec.sum) : undefined,
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('[HA Health Stats] Failed to query recorder statistics:', err);
  }

  // Populate any missing metric keys with fallback traces ONLY in demo mode
  for (const [key] of Object.entries(HEALTH_METRIC_DEFINITIONS)) {
    if (!result[key] || result[key].length === 0) {
      result[key] = haWebSocketService.isDemo()
        ? generateDemoTimeseries(key as HealthMetricKey, range)
        : [];
    }
  }

  return result as Record<HealthMetricKey, HealthTimeseriesPoint[]>;
}
