/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NAS Embedded SQLite Energy Database Service
 * Uses Node.js built-in `node:sqlite` (DatabaseSync) for zero-dependency native persistence.
 * Stores long-term and short-term energy statistics, enabling sub-10ms queries,
 * permanent 5-minute data retention beyond Home Assistant's 10-day purge, and offline disaster recovery backup.
 */

import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

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

export interface EnergyDbStatus {
  dbPath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  totalRecords: number;
  distinctEntities: number;
  earliestDate: string | null;
  latestDate: string | null;
  periodBreakdown: Record<string, number>;
  isReady: boolean;
}

// Convert any timestamp or ISO string into unix epoch milliseconds
export function normalizeTimestampMs(val: number | string | undefined | null, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') {
    return val > 1e11 ? Math.floor(val) : Math.floor(val * 1000);
  }
  // If string consists solely of digits, parse as epoch timestamp
  if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
    const num = Number(val.trim());
    return num > 1e11 ? Math.floor(num) : Math.floor(num * 1000);
  }
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? fallback : parsed;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

let dbInstance: DatabaseSync | null = null;
let activeDbPath = '';

export function initEnergyDatabase(customDataDir?: string): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = customDataDir ||
    process.env.DATA_DIR ||
    (process.env.DASHBOARD_CONFIG_DIR ? path.dirname(process.env.DASHBOARD_CONFIG_DIR) : path.join(process.cwd(), 'data'));

  const energyDir = path.join(dataDir, 'energy');
  if (!fs.existsSync(energyDir)) {
    fs.mkdirSync(energyDir, { recursive: true });
  }

  activeDbPath = path.join(energyDir, 'energy_history.sqlite');
  console.log(`[EnergyDB] Initializing SQLite database at: ${activeDbPath}`);

  const db = new DatabaseSync(activeDbPath);

  // Performance optimizations: WAL mode for non-blocking concurrent reads & normal sync
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA cache_size = -16000;'); // 16MB page cache
  db.exec('PRAGMA temp_store = MEMORY;');

  // Schema: energy_statistics
  db.exec(`
    CREATE TABLE IF NOT EXISTS energy_statistics (
      statistic_id TEXT NOT NULL,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER NOT NULL,
      change REAL,
      sum REAL,
      mean REAL,
      min REAL,
      max REAL,
      state REAL,
      period_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (statistic_id, start_ms, period_type)
    );

    CREATE INDEX IF NOT EXISTS idx_energy_query 
      ON energy_statistics (statistic_id, period_type, start_ms, end_ms);

    CREATE INDEX IF NOT EXISTS idx_energy_range 
      ON energy_statistics (period_type, start_ms);

    CREATE TABLE IF NOT EXISTS energy_sync_state (
      statistic_id TEXT NOT NULL,
      period_type TEXT NOT NULL,
      earliest_ms INTEGER,
      latest_ms INTEGER,
      record_count INTEGER DEFAULT 0,
      last_synced_at INTEGER,
      PRIMARY KEY (statistic_id, period_type)
    );

    CREATE TABLE IF NOT EXISTS energy_metadata (
      statistic_id TEXT PRIMARY KEY,
      unit_of_measurement TEXT,
      name TEXT,
      source TEXT,
      updated_at INTEGER
    );
  `);

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    return initEnergyDatabase();
  }
  return dbInstance;
}

/**
 * Upserts a batch of statistics from Home Assistant.
 * Atomic transaction ensuring database consistency.
 */
export function upsertStatisticsBatch(
  statsByEntity: Record<string, HAStatisticEntry[]>,
  periodType: string
): { totalInserted: number; entitiesUpdated: number } {
  const db = getDatabase();
  const now = Date.now();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO energy_statistics 
      (statistic_id, start_ms, end_ms, change, sum, mean, min, max, state, period_type, created_at)
    VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  let entitiesUpdated = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const [statisticId, entries] of Object.entries(statsByEntity)) {
      if (!statisticId || !Array.isArray(entries) || entries.length === 0) continue;

      let entityEarliestMs = Infinity;
      let entityLatestMs = -Infinity;

      for (const entry of entries) {
        if (!entry || entry.start === undefined || entry.start === null) continue;

        const startMs = normalizeTimestampMs(entry.start);
        const endMs = entry.end !== undefined && entry.end !== null
          ? normalizeTimestampMs(entry.end, startMs + (periodType === '5minute' ? 300000 : 3600000))
          : startMs + (periodType === '5minute' ? 300000 : 3600000);

        if (startMs < entityEarliestMs) entityEarliestMs = startMs;
        if (startMs > entityLatestMs) entityLatestMs = startMs;

        insertStmt.run(
          statisticId,
          startMs,
          endMs,
          typeof entry.change === 'number' ? entry.change : null,
          typeof entry.sum === 'number' ? entry.sum : null,
          typeof entry.mean === 'number' ? entry.mean : null,
          typeof entry.min === 'number' ? entry.min : null,
          typeof entry.max === 'number' ? entry.max : null,
          typeof entry.state === 'number' ? entry.state : null,
          periodType,
          now
        );
        totalInserted++;
      }

      if (entityEarliestMs !== Infinity) {
        entitiesUpdated++;
        // Update sync state for this entity and period
        db.prepare(`
          INSERT INTO energy_sync_state (statistic_id, period_type, earliest_ms, latest_ms, record_count, last_synced_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(statistic_id, period_type) DO UPDATE SET
            earliest_ms = MIN(earliest_ms, excluded.earliest_ms),
            latest_ms = MAX(latest_ms, excluded.latest_ms),
            record_count = (SELECT COUNT(*) FROM energy_statistics WHERE statistic_id = excluded.statistic_id AND period_type = excluded.period_type),
            last_synced_at = excluded.last_synced_at
        `).run(
          statisticId,
          periodType,
          entityEarliestMs,
          entityLatestMs,
          entries.length,
          now
        );
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[EnergyDB] Error in upsertStatisticsBatch transaction:', err);
    throw err;
  }

  return { totalInserted, entitiesUpdated };
}

/**
 * Queries stored statistics from the local NAS SQLite database.
 * Formats results into the exact Home Assistant WebSocket statistics dictionary structure.
 */
export function queryStatistics(
  statisticIds: string[],
  startMs: number,
  endMs: number,
  periodType: string
): HAStatisticsResponse {
  const db = getDatabase();
  const cleanIds = Array.from(new Set(statisticIds.filter(Boolean)));
  if (cleanIds.length === 0) return {};

  const queryStmt = db.prepare(`
    SELECT 
      start_ms, 
      end_ms, 
      change, 
      sum, 
      mean, 
      min, 
      max, 
      state
    FROM energy_statistics
    WHERE 
      statistic_id = ? 
      AND period_type = ? 
      AND start_ms >= ? 
      AND start_ms <= ?
    ORDER BY start_ms ASC
  `);

  const result: HAStatisticsResponse = {};

  for (const id of cleanIds) {
    const rows = queryStmt.all(id, periodType, startMs, endMs) as Array<{
      start_ms: number;
      end_ms: number;
      change: number | null;
      sum: number | null;
      mean: number | null;
      min: number | null;
      max: number | null;
      state: number | null;
    }>;

    result[id] = rows.map((row) => ({
      start: row.start_ms,
      end: row.end_ms,
      change: row.change,
      sum: row.sum,
      mean: row.mean,
      min: row.min,
      max: row.max,
      state: row.state
    }));
  }

  return result;
}

/**
 * Checks if the NAS database has complete coverage for given statistics within a time range.
 * Used by the client/service to determine whether HA WebSocket query is needed.
 */
export function checkCoverage(
  statisticIds: string[],
  startMs: number,
  endMs: number,
  periodType: string,
  minExpectedSlots?: number
): { hasFullCoverage: boolean; coveredCount: number; missingIds: string[] } {
  const db = getDatabase();
  const cleanIds = Array.from(new Set(statisticIds.filter(Boolean)));
  if (cleanIds.length === 0) return { hasFullCoverage: true, coveredCount: 0, missingIds: [] };

  const countStmt = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM energy_statistics
    WHERE statistic_id = ? AND period_type = ? AND start_ms >= ? AND start_ms <= ?
  `);

  const missingIds: string[] = [];
  let coveredCount = 0;

  for (const id of cleanIds) {
    const row = countStmt.get(id, periodType, startMs, endMs) as { cnt: number } | undefined;
    const cnt = row?.cnt || 0;
    if (cnt === 0 || (minExpectedSlots && cnt < minExpectedSlots)) {
      missingIds.push(id);
    } else {
      coveredCount++;
    }
  }

  return {
    hasFullCoverage: missingIds.length === 0,
    coveredCount,
    missingIds
  };
}

/**
 * Returns overall statistics database health and metrics.
 */
export function getEnergyDbStatus(): EnergyDbStatus {
  try {
    const db = getDatabase();

    let fileSizeBytes = 0;
    if (activeDbPath && fs.existsSync(activeDbPath)) {
      const stat = fs.statSync(activeDbPath);
      fileSizeBytes = stat.size;
    }

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM energy_statistics').get() as { count: number };
    const distinctRow = db.prepare('SELECT COUNT(DISTINCT statistic_id) as count FROM energy_statistics').get() as { count: number };
    const minMaxRow = db.prepare('SELECT MIN(start_ms) as minMs, MAX(start_ms) as maxMs FROM energy_statistics').get() as { minMs: number | null; maxMs: number | null };

    const breakdownRows = db.prepare('SELECT period_type, COUNT(*) as count FROM energy_statistics GROUP BY period_type').all() as Array<{ period_type: string; count: number }>;
    const periodBreakdown: Record<string, number> = {};
    for (const r of breakdownRows) {
      periodBreakdown[r.period_type] = r.count;
    }

    return {
      dbPath: activeDbPath,
      fileSizeBytes,
      fileSizeFormatted: formatBytes(fileSizeBytes),
      totalRecords: totalRow?.count || 0,
      distinctEntities: distinctRow?.count || 0,
      earliestDate: minMaxRow?.minMs ? new Date(minMaxRow.minMs).toISOString() : null,
      latestDate: minMaxRow?.maxMs ? new Date(minMaxRow.maxMs).toISOString() : null,
      periodBreakdown,
      isReady: true
    };
  } catch (err: any) {
    return {
      dbPath: activeDbPath,
      fileSizeBytes: 0,
      fileSizeFormatted: '0 B',
      totalRecords: 0,
      distinctEntities: 0,
      earliestDate: null,
      latestDate: null,
      periodBreakdown: {},
      isReady: false
    };
  }
}
