/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Home Assistant Ookla Speedtest Statistics Service
 * Ingests live recorder history via `recorder/statistics_during_period` and `history/history_during_period`
 * strictly from Home Assistant without hardcoded data in live mode.
 */

import { haWebSocketService } from './haWebSocket';
import { SpeedTestTimeseriesPoint, NetworkTimeRange } from '../types/network';

export interface HAStatisticRecord {
  start: number | string;
  end: number | string;
  mean?: number | null;
  state?: number | null;
  max?: number | null;
  min?: number | null;
  change?: number | null;
}

export const SPEEDTEST_ENTITY_IDS = {
  download: ['sensor.ookla_speedtest_download', 'sensor.speedtest_download', 'sensor.speedtest_download_speed'],
  upload: ['sensor.ookla_speedtest_upload', 'sensor.speedtest_upload', 'sensor.speedtest_upload_speed'],
  ping: ['sensor.ookla_speedtest_ping', 'sensor.speedtest_ping', 'sensor.speedtest_latency'],
  jitter: ['sensor.ookla_speedtest_jitter', 'sensor.speedtest_jitter']
};

export function getTimeWindow(range: NetworkTimeRange): { startTime: string; endTime: string; period: 'hour' | 'day'; totalHours: number } {
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
      period = 'day';
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

  const startTime = new Date(now.getTime() - totalHours * 3600 * 1000).toISOString();
  const endTime = now.toISOString();

  return { startTime, endTime, period, totalHours };
}

/**
 * Fetch live Home Assistant Recorder Statistics for Speed Test metrics
 */
export async function fetchSpeedTestStatistics(
  range: NetworkTimeRange,
  customEntityIds?: {
    downloadId?: string;
    uploadId?: string;
    pingId?: string;
    jitterId?: string;
  }
): Promise<SpeedTestTimeseriesPoint[] | null> {
  const { startTime, endTime, period } = getTimeWindow(range);

  const queryIds = [
    customEntityIds?.downloadId || SPEEDTEST_ENTITY_IDS.download[0],
    customEntityIds?.uploadId || SPEEDTEST_ENTITY_IDS.upload[0],
    customEntityIds?.pingId || SPEEDTEST_ENTITY_IDS.ping[0],
    customEntityIds?.jitterId || SPEEDTEST_ENTITY_IDS.jitter[0],
    ...SPEEDTEST_ENTITY_IDS.download,
    ...SPEEDTEST_ENTITY_IDS.upload,
    ...SPEEDTEST_ENTITY_IDS.ping,
    ...SPEEDTEST_ENTITY_IDS.jitter
  ];
  const uniqueIds = Array.from(new Set(queryIds));

  // 1. Primary: Query Home Assistant Long-Term Statistics API with types: ["mean", "state", "max"]
  try {
    const statsRes = await haWebSocketService.sendRequest<Record<string, HAStatisticRecord[]>>(
      'recorder/statistics_during_period',
      {
        start_time: startTime,
        end_time: endTime,
        statistic_ids: uniqueIds,
        period,
        types: ['mean', 'state', 'max']
      }
    ).catch(() => null);

    if (statsRes && typeof statsRes === 'object' && Object.keys(statsRes).some(k => (statsRes[k] || []).length > 0)) {
      const getSeriesList = (candidates: string[]) => {
        for (const c of candidates) {
          if (statsRes[c] && statsRes[c].length > 0) return statsRes[c];
        }
        return [];
      };

      const downList = getSeriesList(customEntityIds?.downloadId ? [customEntityIds.downloadId, ...SPEEDTEST_ENTITY_IDS.download] : SPEEDTEST_ENTITY_IDS.download);
      const upList = getSeriesList(customEntityIds?.uploadId ? [customEntityIds.uploadId, ...SPEEDTEST_ENTITY_IDS.upload] : SPEEDTEST_ENTITY_IDS.upload);
      const pingList = getSeriesList(customEntityIds?.pingId ? [customEntityIds.pingId, ...SPEEDTEST_ENTITY_IDS.ping] : SPEEDTEST_ENTITY_IDS.ping);
      const jitterList = getSeriesList(customEntityIds?.jitterId ? [customEntityIds.jitterId, ...SPEEDTEST_ENTITY_IDS.jitter] : SPEEDTEST_ENTITY_IDS.jitter);

      const timeMap = new Map<number, { down: number; up: number; ping: number; jitter: number }>();

      const ingestSeries = (list: HAStatisticRecord[], key: 'down' | 'up' | 'ping' | 'jitter') => {
        for (const item of list) {
          const t = typeof item.start === 'number' ? item.start : new Date(item.start).getTime();
          let val = 0;
          if (item.mean !== undefined && item.mean !== null && !isNaN(item.mean)) {
            val = Number(item.mean);
          } else if (item.state !== undefined && item.state !== null && !isNaN(item.state)) {
            val = Number(item.state);
          } else if (item.max !== undefined && item.max !== null && !isNaN(item.max)) {
            val = Number(item.max);
          }

          if (!timeMap.has(t)) {
            timeMap.set(t, { down: 0, up: 0, ping: 0, jitter: 0 });
          }
          timeMap.get(t)![key] = val;
        }
      };

      ingestSeries(downList, 'down');
      ingestSeries(upList, 'up');
      ingestSeries(pingList, 'ping');
      ingestSeries(jitterList, 'jitter');

      if (timeMap.size > 0) {
        const sortedTimestamps = Array.from(timeMap.keys()).sort((a, b) => a - b);
        return sortedTimestamps.map(ts => {
          const entry = timeMap.get(ts)!;
          return {
            date: new Date(ts),
            downloadMbps: entry.down,
            uploadMbps: entry.up,
            pingMs: entry.ping,
            jitterMs: entry.jitter
          };
        });
      }
    }
  } catch (e) {
    console.warn('[HA Statistics] Failed to query recorder/statistics_during_period for speedtest:', e);
  }

  // 2. Secondary Fallback: Query raw recorder state changes
  try {
    const rawRes = await haWebSocketService.sendRequest<Record<string, Array<{ state: string; last_updated: string; last_changed: string }>>>(
      'history/history_during_period',
      {
        start_time: startTime,
        end_time: endTime,
        entity_ids: uniqueIds,
        minimal_response: true,
        significant_changes_only: false
      }
    ).catch(() => null);

    if (rawRes && typeof rawRes === 'object') {
      const getHistoryEntries = (candidates: string[]) => {
        for (const c of candidates) {
          if (rawRes[c] && rawRes[c].length > 0) return rawRes[c];
        }
        return [];
      };

      const downHist = getHistoryEntries(customEntityIds?.downloadId ? [customEntityIds.downloadId, ...SPEEDTEST_ENTITY_IDS.download] : SPEEDTEST_ENTITY_IDS.download);
      const upHist = getHistoryEntries(customEntityIds?.uploadId ? [customEntityIds.uploadId, ...SPEEDTEST_ENTITY_IDS.upload] : SPEEDTEST_ENTITY_IDS.upload);
      const pingHist = getHistoryEntries(customEntityIds?.pingId ? [customEntityIds.pingId, ...SPEEDTEST_ENTITY_IDS.ping] : SPEEDTEST_ENTITY_IDS.ping);
      const jitterHist = getHistoryEntries(customEntityIds?.jitterId ? [customEntityIds.jitterId, ...SPEEDTEST_ENTITY_IDS.jitter] : SPEEDTEST_ENTITY_IDS.jitter);

      const timeMap = new Map<number, { down: number; up: number; ping: number; jitter: number }>();

      const ingestHistory = (list: Array<{ state: string; last_updated: string }>, key: 'down' | 'up' | 'ping' | 'jitter') => {
        for (const item of list) {
          const val = parseFloat(item.state);
          if (isNaN(val)) continue;
          const t = new Date(item.last_updated).getTime();
          // Bucket to 15-minute or 1-hour window for crispness
          const bucket = Math.floor(t / (15 * 60 * 1000)) * (15 * 60 * 1000);

          if (!timeMap.has(bucket)) {
            timeMap.set(bucket, { down: 0, up: 0, ping: 0, jitter: 0 });
          }
          timeMap.get(bucket)![key] = val;
        }
      };

      ingestHistory(downHist, 'down');
      ingestHistory(upHist, 'up');
      ingestHistory(pingHist, 'ping');
      ingestHistory(jitterHist, 'jitter');

      if (timeMap.size > 0) {
        const sortedTimestamps = Array.from(timeMap.keys()).sort((a, b) => a - b);
        return sortedTimestamps.map(ts => {
          const entry = timeMap.get(ts)!;
          return {
            date: new Date(ts),
            downloadMbps: entry.down,
            uploadMbps: entry.up,
            pingMs: entry.ping,
            jitterMs: entry.jitter
          };
        });
      }
    }
  } catch (e) {
    console.warn('[HA Statistics] Failed to query history/history_during_period for speedtest:', e);
  }

  return null;
}
