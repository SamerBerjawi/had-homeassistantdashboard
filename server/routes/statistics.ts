/**
 * Statistics history API (/api/statistics/*, aliases /api/energy/*). The aliases are kept for
 * backwards compatibility: do not remove them.
 */
import type express from 'express';
import {
  queryStatistics,
  checkCoverage,
  getEnergyDbStatus,
  getStoredEntities,
  normalizeTimestampMs
} from '../services/energyDbService';
import { EnergySyncService } from '../services/energySyncService';

export interface StatisticsDeps {
  requireHAAuth: express.RequestHandler;
  requireHAAdmin: express.RequestHandler;
  applyCorsHeaders: (req: express.Request, res: express.Response, allowMethods?: string) => void;
}

export function registerStatisticsRoutes(app: express.Express, deps: StatisticsDeps) {
  const { requireHAAuth, requireHAAdmin, applyCorsHeaders } = deps;

  // -------------------------------------------------------------
  // NAS SQLite Embedded Statistics History & Backup API
  // Supports ALL Home Assistant entities (Energy, Climate, System, Network, Sensors)
  // -------------------------------------------------------------

  // 1. Storage Status & Diagnostics Endpoint
  app.get(['/api/statistics/status', '/api/energy/status'], requireHAAuth, (req, res) => {
    applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');
    try {
      const status = getEnergyDbStatus();
      res.json({ success: true, status });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 2. Stored Entities List & Counts Endpoint
  app.get(['/api/statistics/entities', '/api/energy/entities'], requireHAAuth, (req, res) => {
    applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');
    try {
      const entities = getStoredEntities();
      res.json({ success: true, count: entities.length, entities });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  const MAX_INGEST_ROWS_PER_REQUEST = 200_000;
  const STATISTICS_PERIOD_MS: Record<string, number> = {
    '5minute': 5 * 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 28 * 24 * 60 * 60 * 1000
  };
  const MAX_HISTORY_STATISTIC_IDS = 200;
  const MAX_HISTORY_ROWS = 250_000;

  // 3. Fast Historical Query Endpoint (Sub-10ms from NAS SQLite for ANY entities)
  app.get(['/api/statistics/history', '/api/energy/history'], requireHAAuth, (req, res) => {
    applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');
    try {
      const statisticIdsParam = (req.query.statistic_ids as string) || '';
      const startParam = (req.query.start as string) || '';
      const endParam = (req.query.end as string) || '';
      const periodType = (req.query.period_type as string) || 'hour';

      if (!statisticIdsParam || !startParam || !endParam) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query parameters: statistic_ids, start, end'
        });
      }

      const statisticIds = [...new Set(statisticIdsParam.split(',').map((s) => s.trim()).filter(Boolean))];
      const startMs = normalizeTimestampMs(startParam);
      const endMs = normalizeTimestampMs(endParam);

      // SQLite queries here are synchronous, so bound the work per request to keep the event loop
      // (camera proxying, SSE, API) responsive. Callers fall back to Home Assistant on a 400.
      const periodMs = STATISTICS_PERIOD_MS[periodType];
      if (!periodMs) {
        return res.status(400).json({ success: false, error: `Unsupported period_type: ${periodType}` });
      }
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
        return res.status(400).json({ success: false, error: 'Invalid start/end range' });
      }
      if (statisticIds.length > MAX_HISTORY_STATISTIC_IDS) {
        return res.status(400).json({ success: false, error: `Too many statistic_ids (max ${MAX_HISTORY_STATISTIC_IDS})` });
      }
      const estimatedRows = statisticIds.length * Math.ceil((endMs - startMs) / periodMs + 1);
      if (estimatedRows > MAX_HISTORY_ROWS) {
        return res.status(400).json({ success: false, error: `Requested range is too large (~${estimatedRows} rows, max ${MAX_HISTORY_ROWS})` });
      }

      const coverage = checkCoverage(statisticIds, startMs, endMs, periodType);
      const data = queryStatistics(statisticIds, startMs, endMs, periodType);

      res.json({
        success: true,
        source: 'nas_sqlite',
        periodType,
        coverage,
        data
      });
    } catch (err: unknown) {
      console.error('[Statistics API] /api/statistics/history error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 4. Statistics Batch Ingestion Endpoint (Client-Assisted & Background Sync)
  app.post(['/api/statistics/sync', '/api/energy/sync'], requireHAAuth, requireHAAdmin, async (req, res) => {
    applyCorsHeaders(req, res, 'POST, OPTIONS');
    try {
      const payload = req.body;
      // SEC-015: bound what an authenticated client may push into the history database
      const periodType = payload?.periodType ?? 'hour';
      if (typeof periodType !== 'string' || STATISTICS_PERIOD_MS[periodType] === undefined) {
        return res.status(400).json({ success: false, error: `Unsupported periodType: ${String(periodType).slice(0, 32)}` });
      }
      const stats = payload?.statistics;
      if (stats && typeof stats === 'object') {
        let rows = 0;
        for (const [id, entries] of Object.entries(stats)) {
          if (id.length > 255) {
            return res.status(400).json({ success: false, error: 'statistic id too long' });
          }
          if (Array.isArray(entries)) rows += entries.length;
        }
        if (rows > MAX_INGEST_ROWS_PER_REQUEST) {
          return res.status(413).json({ success: false, error: `Too many rows (max ${MAX_INGEST_ROWS_PER_REQUEST})` });
        }
      }
      const result = await EnergySyncService.ingestBatch(payload);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: unknown) {
      console.error('[Statistics API] /api/statistics/sync error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
}
