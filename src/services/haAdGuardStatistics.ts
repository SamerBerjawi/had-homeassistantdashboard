/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Home Assistant AdGuard Statistics Service
 * Ingests live telemetry directly from the 4 native AdGuard Home sensors:
 * - sensor.adguard_home_dns_queries
 * - sensor.adguard_home_dns_queries_blocked
 * - sensor.adguard_home_safe_browsing_blocked
 * - sensor.adguard_home_parental_control_blocked
 * 
 * Queries Home Assistant recorder statistics and historical state changes.
 * Zero hardcoded metrics and zero synthetic reverse calculations.
 */

import { haWebSocketService } from './haWebSocket';
import { queryStoredStatistics, syncStoredStatistics } from './haStatisticsStorage';
import {
  normalizeHATimestamp,
  fetchLiveEntityHistory
} from './haHistoryService';
import { AdGuardTimeseriesPoint, NetworkTimeRange } from '../types/network';

export interface HAStatisticRecord {
  start: number | string;
  end?: number | string;
  change?: number | null;
  mean?: number | null;
  state?: number | null;
  sum?: number | null;
  max?: number | null;
  min?: number | null;
}

export const ADGUARD_SENSOR_IDS = {
  total: 'sensor.adguard_home_dns_queries',
  blocked: 'sensor.adguard_home_dns_queries_blocked',
  safeBrowsing: 'sensor.adguard_home_safe_browsing_blocked',
  parental: 'sensor.adguard_home_parental_control_blocked'
} as const;

// Backward-compatible entity ID mapping
export const ADGUARD_ENTITY_IDS = {
  totalQueries: [ADGUARD_SENSOR_IDS.total, 'sensor.adguard_dns_queries'],
  blockedQueries: [ADGUARD_SENSOR_IDS.blocked, 'sensor.adguard_dns_queries_blocked'],
  safeBrowsing: [ADGUARD_SENSOR_IDS.safeBrowsing, 'sensor.adguard_safe_browsing_blocked'],
  parental: [ADGUARD_SENSOR_IDS.parental, 'sensor.adguard_parental_control_blocked'],
  ratio: ['sensor.adguard_home_dns_queries_blocked_ratio', 'sensor.adguard_dns_queries_blocked_ratio'],
  rulesCount: ['sensor.adguard_home_rules_count', 'sensor.adguard_rules_count'],
  speed: ['sensor.adguard_home_average_processing_speed', 'sensor.adguard_average_processing_speed'],
  safeSearches: ['sensor.adguard_home_safe_searches_enforced', 'sensor.adguard_safe_searches_enforced']
};

export function getTimeWindow(range: NetworkTimeRange): {
  startTime: string;
  endTime: string;
  period: 'hour' | 'day';
  totalHours: number;
  stepMs: number;
} {
  const now = new Date();
  let totalHours = 24;
  let period: 'hour' | 'day' = 'hour';

  switch (range) {
    case '24H':
    case '1D':
      totalHours = 24;
      period = 'hour';
      break;
    case '7D':
    case '1W':
      totalHours = 24 * 7;
      period = 'hour'; // 168 hourly points
      break;
    case '30D':
    case '1M':
      totalHours = 24 * 30;
      period = 'day';
      break;
    case '90D':
    case '3M':
    default:
      totalHours = 24 * 90;
      period = 'day';
      break;
  }

  const stepMs = period === 'hour' ? 3600 * 1000 : 24 * 3600 * 1000;
  const startTime = new Date(now.getTime() - totalHours * 3600 * 1000).toISOString();
  const endTime = now.toISOString();

  return { startTime, endTime, period, totalHours, stepMs };
}

function parseNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const p = parseFloat(clean);
    return isNaN(p) ? fallback : p;
  }
  return fallback;
}

// In-memory cache for AdGuard statistics with 60-second TTL
interface CacheEntry {
  data: AdGuardTimeseriesPoint[];
  expiresAt: number;
}
const statsCache = new Map<string, CacheEntry>();

/**
 * Bins recorder statistics records into uniform slot deltas (similar to energyDataTransformer)
 */
function binStatisticRecords(
  records: HAStatisticRecord[],
  canonicalSlots: number[],
  stepMs: number
): Map<number, number> {
  const slotMap = new Map<number, number>();
  if (!records || records.length === 0) return slotMap;

  const sorted = records
    .map(r => {
      const t = normalizeHATimestamp(r.start);
      return {
        time: t,
        change: typeof r.change === 'number' && !isNaN(r.change) ? Math.max(0, r.change) : null,
        sum: typeof r.sum === 'number' && !isNaN(r.sum) ? r.sum : null,
        state: typeof r.state === 'number' && !isNaN(r.state) ? r.state : null,
        mean: typeof r.mean === 'number' && !isNaN(r.mean) ? r.mean : null
      };
    })
    .filter(r => !isNaN(r.time))
    .sort((a, b) => a.time - b.time);

  const hasExplicitChange = sorted.some(r => r.change !== null && r.change > 0);

  if (hasExplicitChange) {
    for (const r of sorted) {
      const nearestSlot = Math.round(r.time / stepMs) * stepMs;
      const delta = r.change !== null ? r.change : 0;
      slotMap.set(nearestSlot, (slotMap.get(nearestSlot) || 0) + delta);
    }
  } else {
    // Accumulative counter states: compute deltas between consecutive entries
    let prevVal: number | null = null;
    for (const r of sorted) {
      const nearestSlot = Math.round(r.time / stepMs) * stepMs;
      const curr = r.sum !== null ? r.sum : (r.state !== null ? r.state : (r.mean !== null ? r.mean : null));
      if (curr !== null) {
        if (prevVal !== null) {
          const delta = curr >= prevVal ? curr - prevVal : curr;
          slotMap.set(nearestSlot, (slotMap.get(nearestSlot) || 0) + Math.max(0, delta));
        }
        prevVal = curr;
      }
    }
  }

  return slotMap;
}

/**
 * Bins raw historical state changes into uniform slot deltas for cumulative sensors.
 */
function binHistoryIntoDeltas(
  history: Array<{ state: string; timestamp: number }>,
  canonicalSlots: number[],
  stepMs: number
): Map<number, number> {
  const slotMap = new Map<number, number>();
  if (!history || history.length === 0) return slotMap;

  const valid = history
    .map(h => ({ time: h.timestamp, value: parseNumber(h.state, NaN) }))
    .filter(h => !isNaN(h.time) && !isNaN(h.value))
    .sort((a, b) => a.time - b.time);

  if (valid.length === 0) return slotMap;

  let lastKnown = valid[0].value;

  for (let i = 0; i < canonicalSlots.length; i++) {
    const slotStart = canonicalSlots[i];
    const slotEnd = slotStart + stepMs;

    const inSlot = valid.filter(h => h.time >= slotStart && h.time < slotEnd);

    if (inSlot.length >= 2) {
      const first = inSlot[0].value;
      const last = inSlot[inSlot.length - 1].value;
      const delta = last >= first ? last - first : last;
      slotMap.set(slotStart, Math.max(0, delta));
      lastKnown = last;
    } else if (inSlot.length === 1) {
      const curr = inSlot[0].value;
      const delta = curr >= lastKnown ? curr - lastKnown : curr;
      slotMap.set(slotStart, Math.max(0, delta));
      lastKnown = curr;
    } else {
      const prior = valid.filter(h => h.time < slotEnd);
      if (prior.length > 0) {
        const latestPrior = prior[prior.length - 1].value;
        const delta = latestPrior >= lastKnown ? latestPrior - lastKnown : 0;
        slotMap.set(slotStart, Math.max(0, delta));
        lastKnown = latestPrior;
      } else {
        slotMap.set(slotStart, 0);
      }
    }
  }

  return slotMap;
}

/**
 * Fetch Home Assistant AdGuard Statistics strictly for the 4 requested entities:
 * - sensor.adguard_home_dns_queries
 * - sensor.adguard_home_dns_queries_blocked
 * - sensor.adguard_home_safe_browsing_blocked
 * - sensor.adguard_home_parental_control_blocked
 */
export async function fetchAdGuardStatistics(
  range: NetworkTimeRange,
  _liveMetrics?: {
    total?: number;
    blocked?: number;
    safeBrowsing?: number;
    parental?: number;
  },
  customEntityIds?: {
    totalId?: string;
    blockedId?: string;
    safeBrowsingId?: string;
    parentalId?: string;
  }
): Promise<AdGuardTimeseriesPoint[]> {
  const { startTime, endTime, period, stepMs } = getTimeWindow(range);

  // Strictly target the 4 designated sensors:
  const totalId = customEntityIds?.totalId || ADGUARD_SENSOR_IDS.total;
  const blockedId = customEntityIds?.blockedId || ADGUARD_SENSOR_IDS.blocked;
  const safeBrowsingId = customEntityIds?.safeBrowsingId || ADGUARD_SENSOR_IDS.safeBrowsing;
  const parentalId = customEntityIds?.parentalId || ADGUARD_SENSOR_IDS.parental;

  const targetIds = [totalId, blockedId, safeBrowsingId, parentalId];
  const cacheKey = `${range}_${targetIds.join(',')}`;

  const cached = statsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Canonical uniform time grid construction
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const startSlot = Math.floor(startMs / stepMs) * stepMs;
  const endSlot = Math.floor(endMs / stepMs) * stepMs;

  const canonicalSlots: number[] = [];
  for (let t = startSlot; t <= endSlot; t += stepMs) {
    canonicalSlots.push(t);
  }

  // If running in offline demo mode, return demo points
  if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
    return generateDemoTimeseries(range, _liveMetrics);
  }

  // 1. Primary: Check NAS SQLite first, fallback to Home Assistant Long-Term Statistics
  try {
    let statsRes = await queryStoredStatistics(targetIds, startTime, endTime, period);

    if (!statsRes) {
      statsRes = await haWebSocketService.sendRequest<Record<string, HAStatisticRecord[]>>(
        'recorder/statistics_during_period',
        {
          start_time: startTime,
          end_time: endTime,
          statistic_ids: targetIds,
          period,
          types: ['change', 'sum', 'mean', 'state', 'max', 'min']
        }
      ).catch(() => null);

      if (statsRes && typeof statsRes === 'object') {
        syncStoredStatistics(statsRes, period);
      }
    }

    if (statsRes && typeof statsRes === 'object') {
      const totalSlots = binStatisticRecords(statsRes[totalId] || [], canonicalSlots, stepMs);
      const blockedSlots = binStatisticRecords(statsRes[blockedId] || [], canonicalSlots, stepMs);
      const sbSlots = binStatisticRecords(statsRes[safeBrowsingId] || [], canonicalSlots, stepMs);
      const parentalSlots = binStatisticRecords(statsRes[parentalId] || [], canonicalSlots, stepMs);

      const points: AdGuardTimeseriesPoint[] = canonicalSlots.map(t => ({
        date: new Date(t),
        totalQueries: Math.round(totalSlots.get(t) || 0),
        blockedQueries: Math.round(blockedSlots.get(t) || 0),
        safeBrowsingBlocked: Math.round(sbSlots.get(t) || 0),
        parentalBlocked: Math.round(parentalSlots.get(t) || 0)
      }));

      if (points.some(p => p.totalQueries > 0 || p.blockedQueries > 0 || p.safeBrowsingBlocked > 0 || p.parentalBlocked > 0)) {
        statsCache.set(cacheKey, { data: points, expiresAt: Date.now() + 60000 });
        return points;
      }
    }
  } catch (err) {
    console.debug('[haAdGuardStatistics] recorder/statistics_during_period error:', err);
  }

  // 2. Secondary: Raw Home Assistant State History (history/history_during_period + REST fallback)
  try {
    const [totalHist, blockedHist, sbHist, parentalHist] = await Promise.all([
      fetchLiveEntityHistory(totalId, startTime, endTime),
      fetchLiveEntityHistory(blockedId, startTime, endTime),
      fetchLiveEntityHistory(safeBrowsingId, startTime, endTime),
      fetchLiveEntityHistory(parentalId, startTime, endTime)
    ]);

    const totalSlots = binHistoryIntoDeltas(totalHist, canonicalSlots, stepMs);
    const blockedSlots = binHistoryIntoDeltas(blockedHist, canonicalSlots, stepMs);
    const sbSlots = binHistoryIntoDeltas(sbHist, canonicalSlots, stepMs);
    const parentalSlots = binHistoryIntoDeltas(parentalHist, canonicalSlots, stepMs);

    const points: AdGuardTimeseriesPoint[] = canonicalSlots.map(t => ({
      date: new Date(t),
      totalQueries: Math.round(totalSlots.get(t) || 0),
      blockedQueries: Math.round(blockedSlots.get(t) || 0),
      safeBrowsingBlocked: Math.round(sbSlots.get(t) || 0),
      parentalBlocked: Math.round(parentalSlots.get(t) || 0)
    }));

    if (points.some(p => p.totalQueries > 0 || p.blockedQueries > 0 || p.safeBrowsingBlocked > 0 || p.parentalBlocked > 0)) {
      statsCache.set(cacheKey, { data: points, expiresAt: Date.now() + 60000 });
      return points;
    }
  } catch (err) {
    console.debug('[haAdGuardStatistics] fetchLiveEntityHistory error:', err);
  }

  // 3. Fallback: Uniform baseline points across the canonical slots when entities have 0 delta
  const fallbackPoints: AdGuardTimeseriesPoint[] = canonicalSlots.map(t => ({
    date: new Date(t),
    totalQueries: 0,
    blockedQueries: 0,
    safeBrowsingBlocked: 0,
    parentalBlocked: 0
  }));
  return fallbackPoints;
}

/**
 * Simple preview generator used exclusively in offline demo mode when disconnected
 */
export function generateDemoTimeseries(
  range: NetworkTimeRange,
  liveMetrics?: {
    total?: number;
    blocked?: number;
    safeBrowsing?: number;
    parental?: number;
  }
): AdGuardTimeseriesPoint[] {
  const { totalHours, period, stepMs } = getTimeWindow(range);
  const now = Date.now();
  const bucketCount = period === 'hour' ? totalHours : Math.round(totalHours / 24);
  const startSlot = Math.floor((now - totalHours * 3600 * 1000) / stepMs) * stepMs;

  const points: AdGuardTimeseriesPoint[] = [];
  const baseTotal = liveMetrics?.total || 0;
  const baseBlocked = liveMetrics?.blocked || 0;
  const baseSb = liveMetrics?.safeBrowsing || 0;
  const baseParental = liveMetrics?.parental || 0;

  for (let i = 0; i < bucketCount; i++) {
    points.push({
      date: new Date(startSlot + i * stepMs),
      totalQueries: Math.round(baseTotal / Math.max(1, bucketCount)),
      blockedQueries: Math.round(baseBlocked / Math.max(1, bucketCount)),
      safeBrowsingBlocked: baseSb > 0 ? (i === Math.floor(bucketCount / 2) ? 1 : 0) : 0,
      parentalBlocked: baseParental > 0 ? (i % 5 === 0 ? 1 : 0) : 0
    });
  }
  return points;
}
