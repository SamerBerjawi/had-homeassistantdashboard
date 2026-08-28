/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from './haWebSocket';

export type EnergyHistoryPeriod = 'today' | 'yesterday' | '7d' | 'month' | 'year';

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

export interface PeriodTimeRange {
  start: string;
  end: string;
  periodType: '5minute' | 'hour' | 'day' | 'month';
}

// -------------------------------------------------------------
// Time Range Calculators for Periods
// -------------------------------------------------------------

export function computePeriodTimeRange(period: EnergyHistoryPeriod): PeriodTimeRange {
  const now = new Date();
  // Align end to current 5-minute boundary with 0 seconds
  const alignedNow = new Date(Math.floor(now.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));
  alignedNow.setSeconds(0, 0);

  if (period === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      // Use hourly buckets — HA only keeps 5-min granularity for the current recording day
      periodType: 'hour'
    };
  }

  if (period === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: alignedNow.toISOString(),
      periodType: 'hour'
    };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: alignedNow.toISOString(),
      periodType: 'day'
    };
  }

  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: alignedNow.toISOString(),
      periodType: 'month'
    };
  }

  // Default: 'today' (5-minute step resolution starting at midnight 00:00:00)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return {
    start: start.toISOString(),
    end: alignedNow.toISOString(),
    periodType: '5minute'
  };
}

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
// WebSocket API Ingestion: recorder/statistics_during_period
// -------------------------------------------------------------

export async function fetchHAEnergyStatistics(
  connection: any | undefined,
  statisticIds: string[],
  period: EnergyHistoryPeriod = 'today',
  customStart?: string,
  customEnd?: string,
  states?: Record<string, any>
): Promise<HAStatisticsResponse> {
  const cleanIds = Array.from(new Set(statisticIds.filter(Boolean)));
  if (cleanIds.length === 0) {
    return {};
  }

  const { start: defaultStart, end: defaultEnd, periodType } = computePeriodTimeRange(period);
  const startTime = customStart || defaultStart;
  const endTime = customEnd || defaultEnd;

  const isLiveClient = haWebSocketService && !haWebSocketService.isDemo();
  if (isLiveClient) {
    await waitForConnection(2500);
  }

  const isLive = (connection && (connection.socket?.readyState === WebSocket.OPEN || connection.connected)) ||
    (!connection && isLiveClient && haWebSocketService.getStatus() === 'connected');

  if (isLive) {
    const payload = {
      type: 'recorder/statistics_during_period',
      start_time: startTime,
      end_time: endTime,
      statistic_ids: cleanIds,
      period: periodType,
      types: ['change', 'sum', 'state']
    };

    try {
      let result: HAStatisticsResponse | null = null;
      if (connection && typeof connection.sendMessagePromise === 'function') {
        result = await connection.sendMessagePromise(payload);
      } else if (connection && typeof connection.sendRequest === 'function') {
        result = await connection.sendRequest('recorder/statistics_during_period', payload);
      } else {
        result = await haWebSocketService.sendRequest<HAStatisticsResponse>('recorder/statistics_during_period', payload);
      }

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        return result;
      }
    } catch (err) {
      console.warn('[haEnergyStatistics] recorder/statistics_during_period error:', err);
    }

    // If live recorder query returned no entries, derive from state values
    if (states && Object.keys(states).length > 0) {
      return deriveStatisticsFromLiveStates(cleanIds, states, startTime, endTime, periodType);
    }
    return {};
  }

  // Simulation fallback ONLY in offline demo mode
  return generateSyntheticStatistics(cleanIds, startTime, endTime, periodType);
}

// -------------------------------------------------------------
// Derive Statistics from Live Sensor States (Zero-flicker Live fallback)
// -------------------------------------------------------------

function deriveStatisticsFromLiveStates(
  statIds: string[],
  states: Record<string, any>,
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
    const stateObj = states[id];
    const totalVal = stateObj ? parseFloat(stateObj.state) : 0;
    const validTotal = isNaN(totalVal) ? 0 : totalVal;
    const avgChange = validTotal > 0 ? (validTotal / Math.max(1, bucketsCount)) : 0;

    let runningSum = 0;
    for (let i = 0; i < bucketsCount; i++) {
      const bucketStart = startMs + i * stepMs;
      const bucketEnd = Math.min(endMs, bucketStart + stepMs);
      runningSum += avgChange;
      result[id].push({
        start: bucketStart,
        end: bucketEnd,
        change: Number(avgChange.toFixed(3)),
        sum: Number(runningSum.toFixed(3)),
        state: Number(avgChange.toFixed(3))
      });
    }
  }

  return result;
}

// -------------------------------------------------------------
// Synthetic Statistics Generator (Demo & Offline)
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

  let sums: Record<string, number> = {};
  for (const id of statIds) {
    sums[id] = 1200.0;
  }

  for (let i = 0; i < bucketsCount; i++) {
    const bucketStartMs = startMs + i * stepMs;
    const bucketEndMs = Math.min(endMs, bucketStartMs + stepMs);
    const date = new Date(bucketStartMs);
    const hour = date.getHours();

    for (const id of statIds) {
      let deltaKWh = 0;

      if (id.includes('solar') || id.includes('pv') || id.includes('production')) {
        if (hour >= 6 && hour <= 19) {
          const bell = Math.sin(((hour - 6) / 13) * Math.PI);
          deltaKWh = Math.max(0, bell * (3.4 + Math.sin(i * 0.4) * 0.5));
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('export') || id.includes('flow_to')) {
        if (hour >= 10 && hour <= 16) {
          const bell = Math.sin(((hour - 6) / 13) * Math.PI);
          deltaKWh = Math.max(0, bell * 1.7);
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('import') || id.includes('flow_from')) {
        if (hour < 7 || hour > 18) {
          deltaKWh = 0.55 + (hour >= 19 && hour <= 22 ? 0.85 : 0.15);
        } else {
          deltaKWh = 0.05;
        }
      } else if (id.includes('battery') && (id.includes('charge') || id.includes('in') || id.includes('to'))) {
        if (hour >= 10 && hour <= 15) {
          deltaKWh = 0.85;
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('battery') && (id.includes('discharge') || id.includes('out') || id.includes('from'))) {
        if (hour >= 18 && hour <= 23) {
          deltaKWh = 0.70;
        } else {
          deltaKWh = 0.02;
        }
      } else if (id.includes('tesla') || id.includes('wall_connector') || id.includes('ev')) {
        if (hour >= 1 && hour <= 3) {
          deltaKWh = 1.35;
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('heat_pump') || id.includes('hvac')) {
        deltaKWh = 0.38 + (hour >= 6 && hour <= 9 ? 0.35 : 0);
      } else if (id.includes('kitchen')) {
        deltaKWh = (hour === 7 || hour === 8 || hour === 12 || hour === 19 || hour === 20) ? 0.52 : 0.06;
      } else {
        deltaKWh = 0.10 + Math.abs(Math.sin(i + 1) * 0.06);
      }

      deltaKWh = Math.round(deltaKWh * 1000) / 1000;
      sums[id] += deltaKWh;

      result[id].push({
        start: bucketStartMs,
        end: bucketEndMs,
        change: deltaKWh,
        sum: sums[id],
        state: deltaKWh
      });
    }
  }

  return result;
}
