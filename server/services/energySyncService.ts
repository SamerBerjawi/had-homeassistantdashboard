/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy Synchronization & Background Ingestion Service
 * Coordinates ingestion of energy statistics into the NAS SQLite database,
 * manages client-assisted batch commits, and maintains database health.
 */

import { upsertStatisticsBatch, HAStatisticEntry, getDatabase, markEnergyDataChanged } from './energyDbService';

export interface IngestStatsPayload {
  statistics: Record<string, HAStatisticEntry[]>;
  periodType: string;
  metadata?: Record<string, {
    unit_of_measurement?: string | null;
    name?: string | null;
    source?: string;
  }>;
}

// Rows written per transaction. Inserts are synchronous, so large batches are split and the
// event loop gets a turn between chunks instead of blocking for the whole upload.
const INGEST_CHUNK_ROWS = 5000;

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

function* chunkStatistics(
  statistics: Record<string, HAStatisticEntry[]>,
  maxRows: number
): Generator<Record<string, HAStatisticEntry[]>> {
  let chunk: Record<string, HAStatisticEntry[]> = {};
  let rows = 0;
  for (const [statisticId, entries] of Object.entries(statistics)) {
    if (!Array.isArray(entries)) continue;
    for (let i = 0; i < entries.length; i += maxRows) {
      const slice = entries.slice(i, i + maxRows);
      if (rows > 0 && rows + slice.length > maxRows) {
        yield chunk;
        chunk = {};
        rows = 0;
      }
      chunk[statisticId] = [...(chunk[statisticId] || []), ...slice];
      rows += slice.length;
    }
  }
  if (rows > 0) yield chunk;
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

    let totalInserted = 0;
    try {
      const updatedIds = new Set<string>();
      let first = true;
      for (const chunk of chunkStatistics(payload.statistics, INGEST_CHUNK_ROWS)) {
        if (!first) await yieldToEventLoop();
        first = false;
        totalInserted += upsertStatisticsBatch(chunk, periodType).totalInserted;
        for (const id of Object.keys(chunk)) updatedIds.add(id);
      }
      const entitiesUpdated = updatedIds.size;

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
        markEnergyDataChanged();
      }

      return {
        success: true,
        insertedCount: totalInserted,
        entitiesUpdated
      };
    } catch (err: any) {
      console.error('[EnergySyncService] Failed to ingest statistics batch:', err);
      // Earlier chunks are already committed (REL-009): report them so the client can retry the rest
      return {
        success: false,
        insertedCount: totalInserted,
        entitiesUpdated: 0,
        message: totalInserted > 0
          ? 'Partial ingest: some rows were stored before an error occurred'
          : 'Internal database error during ingestion'
      };
    }
  }
}
