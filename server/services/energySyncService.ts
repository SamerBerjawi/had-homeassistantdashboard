/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy Synchronization & Background Ingestion Service
 * Coordinates ingestion of energy statistics into the NAS SQLite database,
 * manages client-assisted batch commits, and maintains database health.
 */

import { upsertStatisticsBatch, HAStatisticEntry, getDatabase } from './energyDbService';

export interface IngestStatsPayload {
  statistics: Record<string, HAStatisticEntry[]>;
  periodType: string;
  metadata?: Record<string, {
    unit_of_measurement?: string | null;
    name?: string | null;
    source?: string;
  }>;
}

export class EnergySyncService {
  private static isIngesting = false;

  /**
   * Process a batch of statistics pushed by client dashboard sessions.
   * Runs atomically and updates metadata if provided.
   */
  public static async ingestBatch(payload: IngestStatsPayload): Promise<{
    success: boolean;
    insertedCount: number;
    entitiesUpdated: number;
    message?: string;
  }> {
    if (!payload || !payload.statistics || typeof payload.statistics !== 'object') {
      return { success: false, insertedCount: 0, entitiesUpdated: 0, message: 'Invalid payload: statistics dictionary required' };
    }

    const periodType = payload.periodType || 'hour';

    try {
      const { totalInserted, entitiesUpdated } = upsertStatisticsBatch(payload.statistics, periodType);

      // Save metadata if provided
      if (payload.metadata && typeof payload.metadata === 'object') {
        const db = getDatabase();
        const now = Date.now();
        const metaStmt = db.prepare(`
          INSERT INTO energy_metadata (statistic_id, unit_of_measurement, name, source, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(statistic_id) DO UPDATE SET
            unit_of_measurement = excluded.unit_of_measurement,
            name = excluded.name,
            source = excluded.source,
            updated_at = excluded.updated_at
        `);

        for (const [statId, meta] of Object.entries(payload.metadata)) {
          if (!statId || !meta) continue;
          metaStmt.run(
            statId,
            meta.unit_of_measurement || null,
            meta.name || null,
            meta.source || 'homeassistant',
            now
          );
        }
      }

      return {
        success: true,
        insertedCount: totalInserted,
        entitiesUpdated
      };
    } catch (err: any) {
      console.error('[EnergySyncService] Failed to ingest statistics batch:', err);
      return {
        success: false,
        insertedCount: 0,
        entitiesUpdated: 0,
        message: err.message || 'Internal database error during ingestion'
      };
    }
  }
}
