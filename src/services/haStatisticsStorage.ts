/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Universal Home Assistant Statistics Storage Client
 * Coordinates querying and backing up ANY Home Assistant entity statistics
 * (Energy, Climate, System Health, AdGuard, SpeedTest, Battery, Sensors)
 * to the local NAS SQLite embedded database for sub-10ms queries and disaster recovery.
 */

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

    const res = await fetch(`/api/statistics/history?${params.toString()}`);
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

  try {
    await fetch('/api/statistics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statistics,
        periodType,
        metadata
      })
    });
  } catch {
    // Non-blocking fire-and-forget sync
  }
}

/**
 * Returns overall statistics database diagnostics from the NAS.
 */
export async function fetchStoredStatisticsStatus(): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/statistics/status');
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
    const res = await fetch('/api/statistics/entities');
    if (!res.ok) return [];
    const json = await res.json();
    return json.entities || [];
  } catch {
    return [];
  }
}
