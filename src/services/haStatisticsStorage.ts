/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Universal Home Assistant Statistics Storage Client
 * Coordinates querying and backing up ANY Home Assistant entity statistics
 * (Energy, Climate, System Health, AdGuard, SpeedTest, Battery, Sensors)
 * to the local NAS SQLite embedded database for sub-10ms queries and disaster recovery.
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { getAuthHeadersAsync } from './configStorageService';

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

export type HAStatisticsMap = Record<string, HAStatisticRecord[]>;

export interface StoredStatisticsResponse {
  success: boolean;
  source: 'nas_sqlite';
  periodType: string;
  coverage: {
    hasFullCoverage: boolean;
    coveredCount: number;
    missingIds: string[];
  };
  data: HAStatisticsMap;
}

export interface StoredEntitySummary {
  statisticId: string;
  name: string | null;
  unit: string | null;
  source: string | null;
  earliestDate: string | null;
  latestDate: string | null;
  totalRecords: number;
}

/**
 * Fast historical query from the NAS SQLite database (<5ms)
 * Works for any statistic entities (energy, temperature, CPU, etc.)
 */
export async function queryStoredStatistics(
  statisticIds: string[],
  start: string | number,
  end: string | number,
  periodType = 'hour'
): Promise<HAStatisticsMap | null> {
  if (typeof window === 'undefined') return null;
  const cleanIds = Array.from(new Set(statisticIds.filter(Boolean)));
  if (cleanIds.length === 0) return {};

  try {
    const params = new URLSearchParams({
      statistic_ids: cleanIds.join(','),
      start: String(start),
      end: String(end),
      period_type: periodType
    });

    const res = await fetchWithTimeout(`/api/statistics/history?${params.toString()}`, { headers: await getAuthHeadersAsync() }, 15000);
    if (!res.ok) return null;

    const json: StoredStatisticsResponse = await res.json();
    if (json && json.success && json.data && json.coverage?.hasFullCoverage) {
      return json.data;
    }
  } catch {
    // Non-blocking fallback to HA WebSocket
  }

  return null;
}

/**
 * Asynchronously backups statistics to the NAS SQLite database in the background.
 * Works for any entities. Fire-and-forget; never blocks UI rendering.
 */
export async function syncStoredStatistics(
  statistics: HAStatisticsMap,
  periodType = 'hour',
  metadata?: Record<string, { unit_of_measurement?: string | null; name?: string | null; source?: string }>
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!statistics || typeof statistics !== 'object' || Object.keys(statistics).length === 0) return;

  // REL-009: the server commits per chunk, so a failure can be partial. Check the result and retry
  // once; ingestion is idempotent (INSERT OR REPLACE), so re-sending is safe.
  const body = JSON.stringify({ statistics, periodType, metadata });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchWithTimeout('/api/statistics/sync', {
        method: 'POST',
        headers: await getAuthHeadersAsync(),
        body
      }, 30000);
      if (res.ok) return;
      console.warn(`[haStatisticsStorage] Statistics sync attempt ${attempt} failed with HTTP ${res.status}`);
      // 4xx will not succeed on retry
      if (res.status >= 400 && res.status < 500) return;
    } catch (err) {
      console.warn(`[haStatisticsStorage] Statistics sync attempt ${attempt} failed:`, err);
    }
  }
}

/**
 * Returns overall statistics database diagnostics from the NAS.
 */
export async function fetchStoredStatisticsStatus(): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetchWithTimeout('/api/statistics/status', { headers: await getAuthHeadersAsync() });
    if (!res.ok) return null;
    const json = await res.json();
    return json.status || null;
  } catch {
    return null;
  }
}

/**
 * Returns a list of all distinct entities saved in the NAS database.
 */
export async function fetchStoredStatisticsEntities(): Promise<StoredEntitySummary[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetchWithTimeout('/api/statistics/entities', { headers: await getAuthHeadersAsync() });
    if (!res.ok) return [];
    const json = await res.json();
    return json.entities || [];
  } catch {
    return [];
  }
}
