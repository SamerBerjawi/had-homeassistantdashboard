/**
 * AdGuard Home stats proxy.
 */
import type express from 'express';
import { fetch as undiciFetch } from 'undici';
import { errorMessage } from '../lib/errors';

export interface AdguardDeps {
  requireHAAuth: express.RequestHandler;
  applyCorsHeaders: (req: express.Request, res: express.Response, allowMethods?: string) => void;
}

export function registerAdguardRoutes(app: express.Express, deps: AdguardDeps) {
  const { requireHAAuth, applyCorsHeaders } = deps;

  // -------------------------------------------------------------
  // AdGuard Home native stats proxy (/control/stats). The HA sensors are
  // rolling-window totals, so per-bucket history must come from AdGuard itself.
  // Configure with ADGUARD_URL (+ ADGUARD_USERNAME / ADGUARD_PASSWORD).
  // -------------------------------------------------------------
  app.get('/api/adguard/stats', requireHAAuth, async (req, res) => {
    applyCorsHeaders(req, res, 'GET, OPTIONS');
    const base = (process.env.ADGUARD_URL || '').replace(/\/+$/, '');
    if (!base) {
      return res.status(503).json({ error: 'ADGUARD_URL is not configured' });
    }
    try {
      const headers: Record<string, string> = {};
      if (process.env.ADGUARD_USERNAME) {
        const cred = `${process.env.ADGUARD_USERNAME}:${process.env.ADGUARD_PASSWORD || ''}`;
        headers.Authorization = `Basic ${Buffer.from(cred).toString('base64')}`;
      }
      const upstream = await undiciFetch(`${base}/control/stats`, {
        headers,
        signal: AbortSignal.timeout(8000)
      });
      if (!upstream.ok) {
        return res.status(502).json({ error: `AdGuard responded ${upstream.status}` });
      }
      const body = (await upstream.json()) as Record<string, unknown>;
      res.json({
        time_units: body.time_units,
        dns_queries: body.dns_queries,
        blocked_filtering: body.blocked_filtering,
        replaced_safebrowsing: body.replaced_safebrowsing,
        replaced_parental: body.replaced_parental
      });
    } catch (err: unknown) {
      console.warn('[AdGuard Proxy] stats fetch failed:', errorMessage(err));
      res.status(502).json({ error: 'AdGuard Home unreachable' });
    }
  });
}
