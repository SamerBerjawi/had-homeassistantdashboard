/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from './haWebSocket';

export type EnergyHistoryPeriod =
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'custom'
  // Convenience aliases for backward compatibility
  | 'today'
  | 'yesterday'
  | '7d';

export interface HAStatisticEntry {
  start: number | string;
  end?: number | string;
  change?: number | null;
  last_reset?: string | null;
  max?: number | null;
  mean?: number | null;
  min?: number | null;
  state?: number | null;
  sum?: number | null;
}

export type HAStatisticsResponse = Record<string, HAStatisticEntry[]>;

export interface StatisticsMetaData {
  statistic_id: string;
  source: string;
  unit_of_measurement?: string | null;
  unit_class?: string | null;
  has_mean?: boolean;
  has_sum?: boolean;
  name?: string | null;
  display_precision?: number | null;
}

export interface SolarForecastData {
  wh_hours: Record<string, number>;
}

export type SolarForecastResponse = Record<string, SolarForecastData> | SolarForecastData;

export interface PeriodTimeRange {
  start: string;
  end: string;
  periodType: '5minute' | 'hour' | 'day' | 'month';
  displayLabel: string;
}

// -------------------------------------------------------------
// In-Memory Caches & Deduplication
// -------------------------------------------------------------

const metadataCache = new Map<string, StatisticsMetaData>();
const statisticsCache = new Map<string, { data: HAStatisticsResponse; expiresAt: number }>();
const inFlightStatistics = new Map<string, Promise<HAStatisticsResponse>>();
let solarForecastCache: { data: Record<string, SolarForecastData> | null; expiresAt: number } | null = null;

const STATS_CACHE_TTL_MS = 60 * 1000; // 1 minute cache for current period
const HISTORICAL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache for past periods

// -------------------------------------------------------------
// Period Time Range & Date Arithmetic
// -------------------------------------------------------------

export function computePeriodTimeRange(
  period: EnergyHistoryPeriod,
  referenceDate: Date = new Date(),
  customStart?: Date,
  customEnd?: Date
): PeriodTimeRange {
  const ref = new Date(referenceDate);

  if (period === 'yesterday') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1, 0, 0, 0, 0);
    const end   = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1, 23, 59, 59, 999);
    const label = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'hour',
      displayLabel: label
    };
  }

  if (period === '7d') {
    const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
    const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
    const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'day',
      displayLabel: label
    };
  }

  if (period === 'day' || period === 'today') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
    const isToday = new Date().toDateString() === ref.toDateString();
    const label = isToday
      ? `Today, ${ref.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : ref.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'hour',
      displayLabel: label
    };
  }

  if (period === 'week') {
    // Start on Monday
    const day = ref.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'day',
      displayLabel: label
    };
  }

  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = ref.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'day',
      displayLabel: label
    };
  }

  if (period === 'year') {
    const start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    const label = `${ref.getFullYear()}`;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'month',
      displayLabel: label
    };
  }

  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    const durationDays = (end.getTime() - start.getTime()) / (24 * 3600 * 1000);

    let periodType: 'hour' | 'day' | 'month' = 'day';
    if (durationDays <= 3) {
      periodType = 'hour';
    } else if (durationDays > 35) {
      periodType = 'month';
    }

    const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType,
      displayLabel: label
    };
  }

  // Fallback to day
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    periodType: 'hour',
    displayLabel: ref.toLocaleDateString()
  };
}

export function shiftReferenceDate(
  period: EnergyHistoryPeriod,
  currentDate: Date,
  direction: -1 | 1
): Date {
  const next = new Date(currentDate);

  if (period === 'day' || period === 'today' || period === 'yesterday') {
    next.setDate(next.getDate() + direction);
    return next;
  }

  if (period === 'week' || period === '7d') {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }

  if (period === 'month') {
    next.setMonth(next.getMonth() + direction);
    return next;
  }

  if (period === 'year') {
    next.setFullYear(next.getFullYear() + direction);
    return next;
  }

  return next;
}

export function isPeriodAtLimit(
  period: EnergyHistoryPeriod,
  currentDate: Date
): boolean {
  const now = new Date();

  if (period === 'day' || period === 'today') {
    return currentDate.toDateString() === now.toDateString() || currentDate > now;
  }

  if (period === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return currentDate >= yesterday;
  }

  if (period === 'week' || period === '7d') {
    const currentWeekRange = computePeriodTimeRange('week', now);
    const activeRange = computePeriodTimeRange('week', currentDate);
    return new Date(activeRange.end).getTime() >= new Date(currentWeekRange.end).getTime();
  }

  if (period === 'month') {
    return (
      currentDate.getFullYear() === now.getFullYear() &&
      currentDate.getMonth() >= now.getMonth()
    );
  }

  if (period === 'year') {
    return currentDate.getFullYear() >= now.getFullYear();
  }

  return false;
}

// -------------------------------------------------------------
// Connection & Request Helpers
// -------------------------------------------------------------

async function waitForConnection(timeoutMs = 2500): Promise<boolean> {
  if (!haWebSocketService || haWebSocketService.isDemo()) return false;
  if (haWebSocketService.getStatus() === 'connected') return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (haWebSocketService.getStatus() === 'connected') return true;
    if (haWebSocketService.getStatus() === 'auth_failed' || haWebSocketService.getStatus() === 'error') {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  return haWebSocketService.getStatus() === 'connected';
}

// -------------------------------------------------------------
// WebSocket API: recorder/get_statistics_metadata (Cached)
// -------------------------------------------------------------

export async function fetchHAStatisticsMetadata(
  connection?: any,
  statisticIds: string[] = []
): Promise<Record<string, StatisticsMetaData>> {
  const cleanIds = Array.from(new Set(statisticIds.filter(Boolean)));
  if (cleanIds.length === 0) return {};

  // Check which IDs are missing from in-memory cache
  const missingIds = cleanIds.filter(id => !metadataCache.has(id));
  if (missingIds.length === 0) {
    const cachedMap: Record<string, StatisticsMetaData> = {};
    for (const id of cleanIds) {
      const item = metadataCache.get(id);
      if (item) cachedMap[id] = item;
    }
    return cachedMap;
  }

  const isLiveClient = haWebSocketService && !haWebSocketService.isDemo();
  if (isLiveClient) {
    await waitForConnection(2500);
  }

  const isLive = (connection && (connection.socket?.readyState === WebSocket.OPEN || connection.connected)) ||
    (!connection && isLiveClient && haWebSocketService.getStatus() === 'connected');

  if (isLive) {
    try {
      const payload = {
        type: 'recorder/get_statistics_metadata',
        statistic_ids: missingIds
      };

      let result: StatisticsMetaData[] | Record<string, StatisticsMetaData> | null = null;
      if (connection && typeof connection.sendMessagePromise === 'function') {
        result = await connection.sendMessagePromise(payload);
      } else if (connection && typeof connection.sendRequest === 'function') {
        result = await connection.sendRequest('recorder/get_statistics_metadata', payload);
      } else {
        result = await haWebSocketService.sendRequest<any>('recorder/get_statistics_metadata', payload);
      }

      if (Array.isArray(result)) {
        for (const meta of result) {
          if (meta.statistic_id) metadataCache.set(meta.statistic_id, meta);
        }
      } else if (result && typeof result === 'object') {
        for (const [id, meta] of Object.entries(result)) {
          if (meta) metadataCache.set(id, meta as StatisticsMetaData);
        }
      }
    } catch (err) {
      console.warn('[haEnergyStatistics] recorder/get_statistics_metadata error:', err);
    }
  }

  const outputMap: Record<string, StatisticsMetaData> = {};
  for (const id of cleanIds) {
    const item = metadataCache.get(id);
    if (item) {
      outputMap[id] = item;
    } else {
      outputMap[id] = {
        statistic_id: id,
        source: 'recorder',
        unit_of_measurement: id.includes('gas') ? 'm³' : id.includes('water') ? 'L' : 'kWh',
        has_sum: true
      };
    }
  }
  return outputMap;
}

// -------------------------------------------------------------
// WebSocket API: energy/solar_forecast (Cached)
// -------------------------------------------------------------

export async function fetchHAEnergySolarForecasts(
  connection?: any
): Promise<Record<string, SolarForecastData> | null> {
  if (solarForecastCache && solarForecastCache.expiresAt > Date.now()) {
    return solarForecastCache.data;
  }

  const isLiveClient = haWebSocketService && !haWebSocketService.isDemo();
  if (isLiveClient) {
    await waitForConnection(2500);
  }

  const isLive = (connection && (connection.socket?.readyState === WebSocket.OPEN || connection.connected)) ||
    (!connection && isLiveClient && haWebSocketService.getStatus() === 'connected');

  if (isLive) {
    try {
      const payload = { type: 'energy/solar_forecast' };
      let result: any = null;
      if (connection && typeof connection.sendMessagePromise === 'function') {
        result = await connection.sendMessagePromise(payload);
      } else {
        result = await haWebSocketService.sendRequest<any>('energy/solar_forecast');
      }

      if (result && typeof result === 'object') {
        const data = result as Record<string, SolarForecastData>;
        solarForecastCache = { data, expiresAt: Date.now() + 15 * 60 * 1000 }; // 15 mins cache
        return data;
      }
    } catch (err) {
      console.debug('[haEnergyStatistics] energy/solar_forecast unavailable:', err);
    }
  }

  return null;
}

// -------------------------------------------------------------
// WebSocket API: recorder/statistics_during_period (Optimized & Deduplicated)
// -------------------------------------------------------------

export async function fetchHAEnergyStatistics(
  connection: any | undefined,
  statisticIds: string[],
  period: EnergyHistoryPeriod = 'today',
  referenceDate: Date = new Date(),
  customStart?: Date,
  customEnd?: Date,
  bypassCache = false
): Promise<HAStatisticsResponse> {
  const cleanIds = Array.from(new Set(statisticIds.filter(Boolean))).sort();
  if (cleanIds.length === 0) {
    return {};
  }

  const timeRange = computePeriodTimeRange(period, referenceDate, customStart, customEnd);
  const cacheKey = `${timeRange.periodType}_${timeRange.start}_${timeRange.end}_${cleanIds.join(',')}`;

  // 1. Check in-memory cache
  if (!bypassCache) {
    const cached = statisticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  // 2. Check if identical request is already in-flight (deduplication)
  if (inFlightStatistics.has(cacheKey)) {
    return inFlightStatistics.get(cacheKey)!;
  }

  const isLiveClient = haWebSocketService && !haWebSocketService.isDemo();
  if (isLiveClient) {
    await waitForConnection(2500);
  }

  const isLive = (connection && (connection.socket?.readyState === WebSocket.OPEN || connection.connected)) ||
    (!connection && isLiveClient && haWebSocketService.getStatus() === 'connected');

  if (isLive) {
    // Only query 'change' and 'sum' - NEVER query heavy 'state' for energy statistics (prevents database overload)
    const payload = {
      type: 'recorder/statistics_during_period',
      start_time: timeRange.start,
      end_time: timeRange.end,
      statistic_ids: cleanIds,
      period: timeRange.periodType,
      types: ['change', 'sum']
    };

    const fetchPromise = (async (): Promise<HAStatisticsResponse> => {
      try {
        let result: HAStatisticsResponse | null = null;
        if (connection && typeof connection.sendMessagePromise === 'function') {
          result = await connection.sendMessagePromise(payload);
        } else if (connection && typeof connection.sendRequest === 'function') {
          result = await connection.sendRequest('recorder/statistics_during_period', payload);
        } else {
          result = await haWebSocketService.sendRequest<HAStatisticsResponse>('recorder/statistics_during_period', payload);
        }

        if (result && typeof result === 'object') {
          const isHistorical = new Date(timeRange.end).getTime() < (Date.now() - 3600 * 1000);
          const ttl = isHistorical ? HISTORICAL_CACHE_TTL_MS : STATS_CACHE_TTL_MS;
          statisticsCache.set(cacheKey, { data: result, expiresAt: Date.now() + ttl });
          return result;
        }
      } catch (err) {
        console.warn('[haEnergyStatistics] recorder/statistics_during_period error:', err);
      } finally {
        inFlightStatistics.delete(cacheKey);
      }
      return {};
    })();

    inFlightStatistics.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  // Synthetic preview generator used exclusively in offline demo mode
  return generateSyntheticStatistics(cleanIds, timeRange.start, timeRange.end, timeRange.periodType);
}

// -------------------------------------------------------------
// Synthetic Statistics Generator (Demo Mode only)
// -------------------------------------------------------------

function generateSyntheticStatistics(
  statIds: string[],
  startTime: string,
  endTime: string,
  periodType: '5minute' | 'hour' | 'day' | 'month'
): HAStatisticsResponse {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  let stepMs = 3600 * 1000;
  if (periodType === '5minute') stepMs = 5 * 60 * 1000;
  if (periodType === 'day') stepMs = 24 * 3600 * 1000;
  if (periodType === 'month') stepMs = 30 * 24 * 3600 * 1000;

  const bucketsCount = Math.max(1, Math.min(744, Math.ceil((endMs - startMs) / stepMs)));
  const result: HAStatisticsResponse = {};

  for (const id of statIds) {
    result[id] = [];
  }

  const sums: Record<string, number> = {};
  for (const id of statIds) {
    sums[id] = 500.0;
  }

  for (let i = 0; i < bucketsCount; i++) {
    const bucketStartMs = startMs + i * stepMs;
    const bucketEndMs = Math.min(endMs, bucketStartMs + stepMs);
    const date = new Date(bucketStartMs);
    const hour = date.getHours();
    const day = date.getDate();

    for (const id of statIds) {
      let delta = 0;

      if (id.includes('solar') || id.includes('pv') || id.includes('production')) {
        if (periodType === 'month') {
          const m = date.getMonth();
          delta = 250 + Math.sin((m / 12) * Math.PI) * 450;
        } else if (periodType === 'day') {
          delta = 14.5 + Math.sin(day * 0.4) * 6;
        } else {
          if (hour >= 6 && hour <= 19) {
            const bell = Math.sin(((hour - 6) / 13) * Math.PI);
            delta = Math.max(0, bell * (3.8 + Math.sin(i * 0.4) * 0.6));
          } else {
            delta = 0;
          }
        }
      } else if (id.includes('export') || id.includes('flow_to')) {
        if (periodType === 'month') {
          delta = 100 + Math.sin((date.getMonth() / 12) * Math.PI) * 200;
        } else if (periodType === 'day') {
          delta = 4.2 + Math.sin(day * 0.3) * 2;
        } else {
          if (hour >= 10 && hour <= 16) {
            const bell = Math.sin(((hour - 6) / 13) * Math.PI);
            delta = Math.max(0, bell * 1.8);
          } else {
            delta = 0;
          }
        }
      } else if (id.includes('import') || id.includes('flow_from')) {
        if (periodType === 'month') {
          delta = 180 + Math.cos((date.getMonth() / 12) * Math.PI) * 80;
        } else if (periodType === 'day') {
          delta = 6.5 + Math.cos(day * 0.5) * 1.5;
        } else {
          if (hour < 7 || hour > 18) {
            delta = 0.45 + (hour >= 19 && hour <= 22 ? 0.75 : 0.15);
          } else {
            delta = 0.08;
          }
        }
      } else if (id.includes('battery') && (id.includes('charge') || id.includes('in') || id.includes('to'))) {
        if (hour >= 9 && hour <= 15 && periodType === 'hour') {
          delta = 0.95;
        } else if (periodType === 'day') {
          delta = 4.5;
        } else if (periodType === 'month') {
          delta = 120;
        } else {
          delta = 0;
        }
      } else if (id.includes('battery') && (id.includes('discharge') || id.includes('out') || id.includes('from'))) {
        if (hour >= 18 && hour <= 23 && periodType === 'hour') {
          delta = 0.75;
        } else if (periodType === 'day') {
          delta = 3.8;
        } else if (periodType === 'month') {
          delta = 105;
        } else {
          delta = 0.02;
        }
      } else if (id.includes('heat_pump') || id.includes('hvac')) {
        delta = periodType === 'hour' ? (0.35 + (hour >= 6 && hour <= 9 ? 0.4 : 0)) : (periodType === 'day' ? 3.2 : 90);
      } else if (id.includes('ev') || id.includes('wallbox') || id.includes('charger')) {
        delta = periodType === 'hour' ? (hour >= 1 && hour <= 4 ? 1.8 : 0) : (periodType === 'day' ? 4.5 : 130);
      } else if (id.includes('gas')) {
        delta = periodType === 'hour' ? 0.05 : (periodType === 'day' ? 0.8 : 22);
      } else if (id.includes('water')) {
        delta = periodType === 'hour' ? 12 : (periodType === 'day' ? 140 : 4200);
      } else {
        delta = periodType === 'hour' ? (0.08 + Math.abs(Math.sin(i)) * 0.05) : (periodType === 'day' ? 1.1 : 32);
      }

      delta = Number(delta.toFixed(3));
      sums[id] += delta;

      result[id].push({
        start: bucketStartMs,
        end: bucketEndMs,
        change: delta,
        sum: Number(sums[id].toFixed(3)),
        state: delta
      });
    }
  }

  return result;
}
