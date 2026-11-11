/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'node:dns';
import dotenv from 'dotenv';
import { Agent as UndiciAgent } from 'undici';
import { initEnergyDatabase, closeEnergyDatabase } from './server/services/energyDbService';
import { toApiError } from './server/lib/security';
import { securityHeaders } from './server/middleware/securityHeaders';
import { registerConfigRoutes } from './server/routes/config';
import { registerAssetRoutes } from './server/routes/assets';
import { registerAdguardRoutes } from './server/routes/adguard';
import { registerCameraRoutes } from './server/routes/cameras';
import { registerFrontend } from './server/static';
import { registerStatisticsRoutes } from './server/routes/statistics';
import { registerImageProxyRoutes } from './server/routes/imageProxy';
import { createConfigStore } from './server/services/configStore';
import { createHaAuth } from './server/auth/haAuth';
import { deepMergeConfig, hasMaterialDashboardConfig, isValidDashboardConfig } from './server/lib/configRules';
import { isValidImageMagicBytes } from './server/lib/imageValidation';
import { errorMessage } from './server/lib/errors';

// Request fields set by requireHAAuth (REL-012: typed instead of `(req as any)`)
declare module 'express-serve-static-core' {
  interface Request {
    haToken?: string;
    clientHaUrl?: string;
  }
}

dotenv.config();

// Log instead of dying silently on a stray rejected promise. An uncaught exception leaves the
// process in an unknown state, so exit and let the container restart policy bring it back.
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception, exiting:', err);
  process.exit(1);
});

// Ensure Node resolver favors IPv4 in dual-stack and Docker bridge network environments
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Ignore if not supported
  }
}

// Undici dispatcher configured to prioritize IPv4 lookup and avoid IPv6 connection stalls in Docker/Cloudflare
const haDispatcher = new UndiciAgent({
  keepAliveTimeout: 10000,
  keepAliveMaxTimeout: 15000,
  pipelining: 0,
  connect: {
    autoSelectFamily: false,
    lookup: (hostname, opts, cb) => {
      dns.lookup(hostname, { ...opts, family: 4 }, (err, address, family) => {
        if (err) {
          return dns.lookup(hostname, opts, cb);
        }
        cb(null, address, family);
      });
    }
  }
});



async function startServer() {
  const app = express();

  // Behind a reverse proxy req.ip is the proxy's address, so every client would share one auth
  // rate-limit bucket. Set TRUST_PROXY to the number of proxy hops (e.g. 1), or true/CIDR list.
  const trustProxyEnv = (process.env.TRUST_PROXY || '').trim();
  if (trustProxyEnv) {
    const hops = Number(trustProxyEnv);
    app.set('trust proxy', trustProxyEnv === 'true' ? true : Number.isInteger(hops) ? hops : trustProxyEnv);
  }
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security Headers & Request Sanitization Middleware
  app.use(securityHeaders(() => getTrustedHaBase()));

  // Environment Config for NAS Persistent Storage
  const configDir = process.env.DASHBOARD_CONFIG_DIR || 
    (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'config') : path.join(process.cwd(), 'data', 'config'));
  const assetsDir = process.env.DASHBOARD_ASSETS_DIR || 
    (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'assets') : path.join(process.cwd(), 'data', 'assets'));
  // Check and initialize persistent NAS storage folders with one-time warnings on failure
  let isAssetsStorageWritable = true;

  try {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    fs.accessSync(assetsDir, fs.constants.W_OK);
  } catch (err: unknown) {
    isAssetsStorageWritable = false;
    console.warn(`[NAS Storage Warning] DASHBOARD_ASSETS_DIR "${assetsDir}" is not writable or reachable: ${errorMessage(err)}. Asset upload endpoints will return service unavailable errors.`);
  }

  // Initialize embedded SQLite database for NAS Energy History and Backups
  try {
    initEnergyDatabase();
  } catch (err: unknown) {
    console.warn('[EnergyDB Warning] Failed to initialize NAS energy SQLite database:', errorMessage(err));
  }

  // Payload Limit Middleware (allows asset sync, large configs, and SDP text payloads)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.text({ type: ['text/*', 'application/sdp'], limit: '5mb' }));

  // Configurable CORS Policy:
  // By default, HAD is deployed same-origin so no permissive CORS headers are sent.
  // If ALLOWED_ORIGIN is set, matching cross-origin requests receive Access-Control-Allow-Origin.
  const allowedOriginsEnv = process.env.ALLOWED_ORIGIN || process.env.CORS_ALLOWED_ORIGINS || '';
  const allowedOriginsList = allowedOriginsEnv
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  const applyCorsHeaders = (req: express.Request, res: express.Response, allowMethods = 'GET, HEAD, OPTIONS') => {
    const origin = req.headers.origin;
    if (!origin) return;

    if (allowedOriginsList.length > 0) {
      if (allowedOriginsList.includes(origin.toLowerCase()) || allowedOriginsList.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', allowMethods);
        res.setHeader('Vary', 'Origin');
      }
    }
    // No allow-list: same-origin deployment, so no CORS headers at all (SEC-009)
  };

  // Static Assets Directory for NAS uploaded vehicle PNGs / brand logos
  app.use('/api/assets', (req, res, next) => {
    applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  }, express.static(assetsDir, { dotfiles: 'ignore', index: false }));

  app.use('/data/assets', (req, res, next) => {
    applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  }, express.static(assetsDir, { dotfiles: 'ignore', index: false }));

  // Health check endpoint with storage diagnostic information
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      storage: {
        writable: configStore.isWritable,
        serverVersion: configStore.cachedVersion,
        hasConfig: fs.existsSync(configStore.configFilePath),
        hasBackup: fs.existsSync(configStore.configBackupPath)
      }
    });
  });

  // Unauthenticated: lets the login screen prefill the Home Assistant URL configured via HASS_URL.
  app.get('/api/public-config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ haUrl: envHaUrl || null });
  });

  const configStore = createConfigStore({ configDir });

  const { envHaUrl, getTrustedHaBase, resolveTargetHaBase, requireHAAuth, requireHAAdmin, isHaAdmin } =
    createHaAuth({ configDir, haDispatcher });

  const { broadcastConfigUpdate, closeSseClients } = registerConfigRoutes(app, {
    requireHAAuth,
    isHaAdmin,
    configStore,
    // prewarmCameraStreams is created below by registerCameraRoutes (which needs broadcastConfigUpdate)
    onCameraSourcesChanged: () => void prewarmCameraStreams()
  });

  registerAssetRoutes(app, { requireHAAuth, requireHAAdmin, applyCorsHeaders, assetsDir, isAssetsStorageWritable });

  registerAdguardRoutes(app, { requireHAAuth, applyCorsHeaders });

  registerStatisticsRoutes(app, { requireHAAuth, requireHAAdmin, applyCorsHeaders });

  registerImageProxyRoutes(app, { requireHAAuth, applyCorsHeaders, getTrustedHaBase, resolveTargetHaBase, haDispatcher });

  const { prewarmCameraStreams } = registerCameraRoutes(app, { requireHAAuth, requireHAAdmin, applyCorsHeaders, configStore, broadcastConfigUpdate });

  await registerFrontend(app);

  // Final error handler: API clients always get JSON, never an HTML page or a stack trace.
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    const { status, message } = toApiError(err);
    if (status >= 500) console.error('[HAD Server] Unhandled request error:', err);
    res.status(status).json({ success: false, error: message });
  });

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n  \x1b[36m\x1b[1mHAD - Home Assistant Dashboard\x1b[0m');
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m \x1b[36mhttp://0.0.0.0:${PORT}/\x1b[0m (accessible by wall tablets on LAN)\n`);
  });
  void prewarmCameraStreams().catch((err) => console.warn('[go2rtc Proxy] Camera prewarm failed:', err?.message || err));

  httpServer.on('error', (err) => {
    console.error('[HAD Server] HTTP server error:', err);
    process.exit(1);
  });

  // Graceful shutdown: `docker stop` sends SIGTERM and kills after 10s. Stop accepting requests,
  // let in-flight config writes finish, end SSE streams, and close SQLite cleanly.
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[HAD Server] ${signal} received, shutting down...`);
    const forceExit = setTimeout(() => {
      console.warn('[HAD Server] Shutdown timed out, forcing exit');
      process.exit(1);
    }, 8000);
    forceExit.unref();

    httpServer.close();
    closeSseClients();
    httpServer.closeIdleConnections?.();

    try {
      await configStore.drainWrites();
    } catch {}
    try {
      closeEnergyDatabase();
    } catch (err) {
      console.warn('[HAD Server] Error closing statistics database:', err);
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Failed to start HAD server:', err);
  // Exit so the container restarts instead of idling half-initialized (timers keep the loop alive)
  process.exit(1);
});
