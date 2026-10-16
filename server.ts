/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'node:dns';
import { Readable } from 'node:stream';
import dotenv from 'dotenv';
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici';
import {
  initEnergyDatabase,
  queryStatistics,
  checkCoverage,
  getEnergyDbStatus,
  getStoredEntities,
  normalizeTimestampMs,
  closeEnergyDatabase
} from './server/services/energyDbService';
import { EnergySyncService } from './server/services/energySyncService';
import type { JsonObject, PersistedConfig, ServerConfig } from './server/lib/configTypes';
import {
  HLS_FORWARDED_QUERY_KEYS,
  applyPinOnWrite,
  redactConfigForClient,
  redactCredentialsInText,
  resolveHlsSubpath,
  restoreRedactedCameraUrls,
  validateCameraSourceUrl,
  validateDashboardConfigShape
} from './server/lib/security';

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
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security Headers & Request Sanitization Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=(), interest-cohort=()');
    if (req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    }

    // Content-Security-Policy (CSP) Defense-in-Depth:
    // Restrict script execution to 'self' to minimize XSS blast radius.
    // In dev mode, Vite requires 'unsafe-inline' and 'unsafe-eval' for HMR modules.
    const isProd = process.env.NODE_ENV === 'production';
    // Once a Home Assistant instance is trusted, the browser only needs to reach it and ourselves
    // (SEC-011). Before that (opt-in first-run pinning) the policy has to stay open.
    const trustedHa = getTrustedHaBase();
    let connectSrc = "connect-src 'self' ws: wss: https: http:";
    if (trustedHa) {
      try {
        const u = new URL(trustedHa);
        const wsOrigin = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
        connectSrc = `connect-src 'self' ${u.origin} ${wsOrigin}`;
      } catch {
        // keep the open policy if the configured URL cannot be parsed
      }
    }
    const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      connectSrc,
      "media-src 'self' data: blob: https: http:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    // Defense-in-depth: ensure query-string tokens are scrubbed from non-SSE request URLs
    // to prevent tokens leaking into access logs or downstream handlers
    if (req.url && !req.path.startsWith('/api/config/stream') && !req.originalUrl?.startsWith('/api/config/stream')) {
      if (req.query?.token) {
        delete req.query.token;
      }
      if (req.url.includes('token=')) {
        req.url = req.url.replace(/([?&])token=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
      }
    }

    next();
  });

  // Environment Config for NAS Persistent Storage
  const configDir = process.env.DASHBOARD_CONFIG_DIR || 
    (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'config') : path.join(process.cwd(), 'data', 'config'));
  const assetsDir = process.env.DASHBOARD_ASSETS_DIR || 
    (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'assets') : path.join(process.cwd(), 'data', 'assets'));
  const configFilePath = path.join(configDir, 'dashboard-config.json');

  const configBackupPath = path.join(configDir, 'dashboard-config.json.bak');
  const configBackupsDir = path.join(configDir, 'backups');

  // In-memory cache for fast read-through and NAS drive spin-down support
  let cachedServerConfig: ServerConfig | null = null;
  let cachedServerVersion = 0;
  // mtime of the config file the cache was filled from; a different mtime means it changed on disk
  let cachedConfigMtimeMs = -1;
  // PERF-008: timestamped snapshots are rate limited; the single .bak copy still happens on every save
  const SNAPSHOT_MIN_INTERVAL_MS = 60 * 1000;
  let lastSnapshotAt = 0;

  function recordConfigMtime() {
    try {
      cachedConfigMtimeMs = fs.statSync(configFilePath).mtimeMs;
    } catch {
      cachedConfigMtimeMs = -1;
    }
  }

  // Check and initialize persistent NAS storage folders with one-time warnings on failure
  let isConfigStorageWritable = true;
  let isAssetsStorageWritable = true;

  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.accessSync(configDir, fs.constants.W_OK);
  } catch (err: any) {
    isConfigStorageWritable = false;
    console.warn(`[NAS Storage Warning] DASHBOARD_CONFIG_DIR "${configDir}" is not writable or reachable: ${err.message}. Config endpoints will return service unavailable errors.`);
  }

  try {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    fs.accessSync(assetsDir, fs.constants.W_OK);
  } catch (err: any) {
    isAssetsStorageWritable = false;
    console.warn(`[NAS Storage Warning] DASHBOARD_ASSETS_DIR "${assetsDir}" is not writable or reachable: ${err.message}. Asset upload endpoints will return service unavailable errors.`);
  }

  // Initialize embedded SQLite database for NAS Energy History and Backups
  try {
    initEnergyDatabase();
  } catch (err: any) {
    console.warn('[EnergyDB Warning] Failed to initialize NAS energy SQLite database:', err.message);
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
        writable: isConfigStorageWritable,
        serverVersion: cachedServerVersion,
        hasConfig: fs.existsSync(configFilePath),
        hasBackup: fs.existsSync(configBackupPath)
      }
    });
  });

  // In-process write lock queue to serialize concurrent config file writes
  let configWriteQueue: Promise<any> = Promise.resolve();
  function withConfigWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = configWriteQueue.then(fn, fn);
    configWriteQueue = next.then(() => {}, () => {});
    return next;
  }

  // Server-side recursive deep merge utility for plain objects (arrays are wholesale replaced, undefined skipped)
  function deepMergeConfig(base: JsonObject = {}, partial: JsonObject = {}): JsonObject {
    const result: JsonObject = { ...(base || {}) };
    for (const [key, value] of Object.entries(partial || {})) {
      if (value === undefined) continue;
      if (value === null) {
        delete result[key];
        continue;
      }
      if (key === 'sources' && typeof value === 'object' && !Array.isArray(value)) {
        // Wholesale replace camera sources dictionary so deleted sources are not resurrected
        result[key] = { ...value };
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const existing = result[key];
        const baseVal: JsonObject =
          existing !== null && typeof existing === 'object' && !Array.isArray(existing)
            ? (existing as JsonObject)
            : {};
        result[key] = deepMergeConfig(baseVal, value as JsonObject);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // Config validation helper
  function isValidDashboardConfig(body: any): body is ServerConfig {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return false;
    }
    const keys = Object.keys(body);
    if (keys.length === 0) {
      return false;
    }
    if (body.version !== undefined && typeof body.version !== 'number') {
      return false;
    }
    if (body.updatedAt !== undefined && typeof body.updatedAt !== 'string') {
      return false;
    }
    if (body.theme !== undefined && (typeof body.theme !== 'object' || Array.isArray(body.theme) || body.theme === null)) {
      return false;
    }
    if (body.mobility !== undefined && (typeof body.mobility !== 'object' || Array.isArray(body.mobility) || body.mobility === null)) {
      return false;
    }
    return true;
  }

  // Material Data Checker: inspects if configuration has meaningful user customizations
  // Mirroring Crystal's data loss prevention safeguards
  function hasMaterialDashboardConfig(data: any): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    // Check rooms configuration
    if (data.rooms && typeof data.rooms === 'object') {
      if (Array.isArray(data.rooms.floorOrder) && data.rooms.floorOrder.length > 0) return true;
      if (Array.isArray(data.rooms.areaOrder) && data.rooms.areaOrder.length > 0) return true;
      if (Array.isArray(data.rooms.favoriteAreas) && data.rooms.favoriteAreas.length > 0) return true;
      if (data.rooms.areaOverrides && typeof data.rooms.areaOverrides === 'object' && Object.keys(data.rooms.areaOverrides).length > 0) return true;
    }

    // Check entity customizations
    if (data.entities && typeof data.entities === 'object') {
      if (Array.isArray(data.entities.hiddenEntityIds) && data.entities.hiddenEntityIds.length > 0) return true;
      if (data.entities.nameOverrides && typeof data.entities.nameOverrides === 'object' && Object.keys(data.entities.nameOverrides).length > 0) return true;
      if (data.entities.iconOverrides && typeof data.entities.iconOverrides === 'object' && Object.keys(data.entities.iconOverrides).length > 0) return true;
      if (data.entities.customizations && typeof data.entities.customizations === 'object' && Object.keys(data.entities.customizations).length > 0) return true;
    }

    // Check areas / floors / labels
    if (data.areas && typeof data.areas === 'object' && Object.keys(data.areas).length > 0) return true;
    if (data.floors && typeof data.floors === 'object' && Object.keys(data.floors).length > 0) return true;
    if (data.labels && typeof data.labels === 'object' && Object.keys(data.labels).length > 0) return true;

    // Check mobility configuration
    if (data.mobility && typeof data.mobility === 'object') {
      if (data.mobility.car && (data.mobility.car.selectedCarEntityId || data.mobility.car.customVehiclePngUrl)) return true;
      if (data.mobility.bike && (data.mobility.bike.selectedBikeEntityId || data.mobility.bike.customVehiclePngUrl)) return true;
    }

    // Check custom theme
    if (data.theme && typeof data.theme === 'object') {
      if (data.theme.customThemes && typeof data.theme.customThemes === 'object' && Object.keys(data.theme.customThemes).length > 0) return true;
      if (data.theme.preset && data.theme.preset !== 'obsidian') return true;
    }

    // Check custom cameras
    if (data.cameras && typeof data.cameras === 'object') {
      if (Array.isArray(data.cameras.favoriteCameras) && data.cameras.favoriteCameras.length > 0) return true;
      if (data.cameras.sources && typeof data.cameras.sources === 'object' && Object.keys(data.cameras.sources).length > 0) return true;
    }

    // Check preferences / profile
    if (data.preferences && typeof data.preferences === 'object' && Object.keys(data.preferences).length > 0) return true;
    if (data.profile && typeof data.profile === 'object' && Object.keys(data.profile).length > 0) return true;

    return false;
  }

  class SnapshotThrottled extends Error {}

  // Database-grade atomic file persistence with fsync to guarantee flush to physical NAS media
  async function writeConfigFileAtomic(filePath: string, dataString: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const tempFile = path.join(
      dir,
      `.${path.basename(filePath)}.tmp.${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    // Open file descriptor, write, and fsync physical storage on NAS
    const handle = await fs.promises.open(tempFile, 'w');
    try {
      await handle.writeFile(dataString, 'utf-8');
      await handle.sync(); // fsync to ensure bytes reach physical NAS drive
    } finally {
      await handle.close();
    }

    // If target exists, update the primary .bak file and retain timestamped rolling backups
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.copyFile(filePath, configBackupPath);

        // Keep up to 5 rolling snapshots in backups/, at most one per minute
        const now = Date.now();
        if (now - lastSnapshotAt < SNAPSHOT_MIN_INTERVAL_MS) {
          throw new SnapshotThrottled();
        }
        lastSnapshotAt = now;
        if (!fs.existsSync(configBackupsDir)) {
          await fs.promises.mkdir(configBackupsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshotFile = path.join(configBackupsDir, `dashboard-config-${timestamp}.json`);
        await fs.promises.copyFile(filePath, snapshotFile);

        const snapshotFiles = (await fs.promises.readdir(configBackupsDir))
          .filter(f => f.startsWith('dashboard-config-') && f.endsWith('.json'))
          .sort()
          .reverse();
        if (snapshotFiles.length > 5) {
          for (const oldFile of snapshotFiles.slice(5)) {
            await fs.promises.unlink(path.join(configBackupsDir, oldFile)).catch(() => {});
          }
        }
      } catch (backupErr) {
        if (!(backupErr instanceof SnapshotThrottled)) {
          console.warn('[NAS Config] Backup rotation notice:', backupErr);
        }
      }
    }

    // Atomic filesystem rename
    await fs.promises.rename(tempFile, filePath);
    if (filePath === configFilePath) recordConfigMtime();
  }

  // Self-healing configuration reader: reads primary file with automatic fallback to .bak and snapshots
  async function readPersistentConfig(): Promise<PersistedConfig | null> {
    // 1. Try reading primary config file
    if (fs.existsSync(configFilePath)) {
      try {
        const raw = await fs.promises.readFile(configFilePath, 'utf-8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
            const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
            cachedServerConfig = conf;
            cachedServerVersion = version;
            recordConfigMtime();
            return { config: conf, serverVersion: version };
          }
        }
      } catch (parseErr) {
        console.error('[NAS Config] Corrupted primary config detected! Attempting recovery from backup:', parseErr);
      }
    }

    // 2. Self-healing fallback: Check dashboard-config.json.bak
    if (fs.existsSync(configBackupPath)) {
      try {
        const raw = await fs.promises.readFile(configBackupPath, 'utf-8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            console.log('[NAS Config] Successfully recovered valid configuration from .bak file! Healing primary file...');
            await writeConfigFileAtomic(configFilePath, raw);
            const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
            const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
            cachedServerConfig = conf;
            cachedServerVersion = version;
            return { config: conf, serverVersion: version };
          }
        }
      } catch (bakErr) {
        console.error('[NAS Config] .bak recovery failed:', bakErr);
      }
    }

    // 3. Fallback to newest valid snapshot in backups/
    if (fs.existsSync(configBackupsDir)) {
      try {
        const snapshotFiles = (await fs.promises.readdir(configBackupsDir))
          .filter(f => f.startsWith('dashboard-config-') && f.endsWith('.json'))
          .sort()
          .reverse();
        for (const file of snapshotFiles) {
          try {
            const raw = await fs.promises.readFile(path.join(configBackupsDir, file), 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              console.log(`[NAS Config] Recovered configuration from snapshot ${file}! Healing primary file...`);
              await writeConfigFileAtomic(configFilePath, raw);
              const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
              const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
              cachedServerConfig = conf;
              cachedServerVersion = version;
              return { config: conf, serverVersion: version };
            }
          } catch (snapshotErr: any) {
            console.warn(`[NAS Config] Snapshot ${file} unreadable: ${snapshotErr?.message || snapshotErr}`);
          }
        }
      } catch (dirErr: any) {
        console.warn(`[NAS Config] Could not read backups directory: ${dirErr?.message || dirErr}`);
      }
    }

    // 4. Legacy fallback check for ./data/config.json if migrating
    const legacyPath = path.join(path.dirname(configDir), 'config.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = await fs.promises.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        cachedServerConfig = parsed;
        cachedServerVersion = 1;
        return { config: parsed, serverVersion: 1 };
      } catch (legacyErr: any) {
        console.warn(`[NAS Config] Legacy config.json unreadable: ${legacyErr?.message || legacyErr}`);
      }
    }

    return null;
  }

  // -------------------------------------------------------------
  // Home Assistant Token Authentication & Security Gatekeeper
  // -------------------------------------------------------------
  const tokenValidationCache = new Map<string, { valid: boolean; expiresAt: number }>();
  const TOKEN_CACHE_MAX_ENTRIES = 500;
  // SEC-010: a revoked HA token must stop working here quickly, so cache successes briefly
  const VALID_TOKEN_CACHE_MS = 60 * 1000;
  // Entries are keyed by token, so without a bound every refreshed OAuth token stays forever
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of tokenValidationCache) {
      if (entry.expiresAt <= now) tokenValidationCache.delete(key);
    }
    // Maps iterate in insertion order, so this drops the oldest entries first
    for (const key of tokenValidationCache.keys()) {
      if (tokenValidationCache.size <= TOKEN_CACHE_MAX_ENTRIES) break;
      tokenValidationCache.delete(key);
    }
  }, 60 * 1000).unref();
  let lastAuthErrorLog = 0;

  // The Home Assistant instance that validates dashboard tokens must not be chosen by the client:
  // anyone could point X-HA-URL at a server that accepts any token. It comes from the env var or,
  // failing that, is pinned on the first successful sign-in (trust on first use) and persisted.
  const envHaUrl = (
    process.env.HASS_URL ||
    process.env.HA_URL ||
    process.env.HOME_ASSISTANT_URL ||
    process.env.HOMEASSISTANT_URL ||
    ''
  ).trim();
  const pinnedHaInstancePath = path.join(configDir, 'ha-instance.json');
  let pinnedHaBase: string | null = null;
  if (!envHaUrl) {
    try {
      const raw = JSON.parse(fs.readFileSync(pinnedHaInstancePath, 'utf-8'));
      if (typeof raw?.haUrl === 'string' && raw.haUrl) {
        pinnedHaBase = raw.haUrl;
        console.log(`[Auth] Validating tokens against pinned Home Assistant instance ${pinnedHaBase}`);
      }
    } catch {
      // Not pinned yet
    }
  }

  function getTrustedHaBase(): string | null {
    return envHaUrl ? resolveTargetHaBase(envHaUrl) : pinnedHaBase;
  }

  // SEC-001: without HASS_URL or an existing pin, the first client must not become the authority for
  // "valid token". Trust-on-first-use is therefore opt-in (ALLOW_TOFU_PIN=true).
  const allowTofuPin = process.env.ALLOW_TOFU_PIN === 'true';
  // SEC-007: the mock-token bypass is opt-in only; a missing NODE_ENV no longer enables it.
  const allowMockTokens = process.env.ALLOW_MOCK_TOKENS === 'true';
  if (allowMockTokens) {
    console.warn('[Auth] WARNING: ALLOW_MOCK_TOKENS=true. Tokens starting with test_ or mock_ bypass Home Assistant validation. Never enable this in production.');
  }
  if (!envHaUrl && !pinnedHaBase && !allowTofuPin) {
    console.warn('[Auth] No HASS_URL and no pinned Home Assistant instance: authenticated API routes will refuse requests until HASS_URL is set (or ALLOW_TOFU_PIN=true for first-run pinning).');
  }

  function isMockToken(token: string): boolean {
    return allowMockTokens && (token.startsWith('test_') || token.startsWith('mock_'));
  }

  function isHaTrustConfigured(): boolean {
    return Boolean(getTrustedHaBase()) || allowTofuPin;
  }

  async function pinHaBase(haBase: string) {
    if (envHaUrl || pinnedHaBase) return;
    pinnedHaBase = haBase;
    console.log(
      `[Auth] Pinned Home Assistant instance ${haBase} for token validation. ` +
      `To change it, set HASS_URL or delete ${pinnedHaInstancePath} and restart.`
    );
    try {
      const tempFile = `${pinnedHaInstancePath}.tmp.${process.pid}`;
      await fs.promises.writeFile(tempFile, JSON.stringify({ haUrl: haBase, pinnedAt: new Date().toISOString() }, null, 2), 'utf-8');
      await fs.promises.rename(tempFile, pinnedHaInstancePath);
    } catch (err: any) {
      console.warn(`[Auth] Could not persist pinned Home Assistant instance (kept in memory only): ${err?.message || err}`);
    }
  }

  function resolveTargetHaBase(haUrl?: string): string {
    let haBase = (haUrl || 'http://homeassistant.local:8123').trim();

    // Convert ws:// to http:// and wss:// to https://
    if (haBase.startsWith('ws://')) {
      haBase = `http://${haBase.slice(5)}`;
    } else if (haBase.startsWith('wss://')) {
      haBase = `https://${haBase.slice(6)}`;
    } else if (!haBase.startsWith('http://') && !haBase.startsWith('https://')) {
      haBase = `https://${haBase}`;
    }

    return haBase
      .replace(/\/+$/, '')
      .replace(/\/api\/websocket\/?$/, '')
      .replace(/\/api\/?$/, '');
  }

  async function verifyHAToken(token: string, clientHaUrl?: string, forwardedAuthHeader?: string): Promise<boolean> {
    if (!token) return false;

    // Fast-path: test tokens, only when ALLOW_MOCK_TOKENS=true
    if (isMockToken(token)) {
      return true;
    }

    // The client's URL is only used to bootstrap the first sign-in, and only with ALLOW_TOFU_PIN=true
    const trustedBase = getTrustedHaBase();
    if (!trustedBase && !allowTofuPin) return false;
    const haBase = trustedBase || resolveTargetHaBase(clientHaUrl);

    const cacheKey = `${haBase}|${token}`;
    const cached = tokenValidationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.valid;
    }
    const targetUrl = `${haBase}/api/`;
    const authHeader = forwardedAuthHeader || `Bearer ${token}`;

    try {
      const haRes = await undiciFetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'HAD-HomeAssistantDashboard/1.0'
        },
        dispatcher: haDispatcher,
        signal: AbortSignal.timeout(5000)
      });

      // Home Assistant returns 200 OK on GET /api/ when token is valid
      const isValid = haRes.status === 200;

      tokenValidationCache.set(cacheKey, {
        valid: isValid,
        expiresAt: Date.now() + (isValid ? VALID_TOKEN_CACHE_MS : 30 * 1000)
      });

      if (!isValid) {
        console.warn(`[Auth Middleware] Token validation rejected by Home Assistant (HTTP ${haRes.status}) at ${targetUrl}`);
      } else if (!trustedBase) {
        await pinHaBase(haBase);
      }

      return isValid;
    } catch (error: any) {
      const now = Date.now();
      const errorCode = (error as any)?.cause?.code || error?.code || 'UNKNOWN';

      // Cloudflare / proxy connection reset retry: if a pooled TLS connection was closed, retry once with a fresh connection
      if (errorCode === 'ECONNRESET' || errorCode === 'UND_ERR_SOCKET' || errorCode === 'ETIMEDOUT') {
        try {
          const retryRes = await undiciFetch(targetUrl, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'User-Agent': 'HAD-HomeAssistantDashboard/1.0',
              'Connection': 'close'
            },
            signal: AbortSignal.timeout(5000)
          });
          const isValid = retryRes.status === 200;
          tokenValidationCache.set(cacheKey, {
            valid: isValid,
            expiresAt: Date.now() + (isValid ? VALID_TOKEN_CACHE_MS : 30 * 1000)
          });
          return isValid;
        } catch {
          // Proceed to fallback logic
        }
      }

      // If token was previously verified and valid, grant a temporary grace period during network interruptions
      if (cached && cached.valid) {
        tokenValidationCache.set(cacheKey, {
          valid: true,
          expiresAt: now + 60 * 1000 // 1 minute grace period
        });
        if (now - lastAuthErrorLog > 30000) {
          lastAuthErrorLog = now;
          console.warn(`[Auth Middleware] Home Assistant temporarily unreachable (${errorCode}) at ${targetUrl}. Using cached valid session.`);
        }
        return true;
      }

      // Cache the unreachable state briefly (10s) to prevent hammering the upstream endpoint
      tokenValidationCache.set(cacheKey, {
        valid: false,
        expiresAt: now + 10 * 1000
      });

      if (now - lastAuthErrorLog > 30000) {
        lastAuthErrorLog = now;
        console.error(`[Auth Middleware] Could not reach Home Assistant for token validation at ${targetUrl} (${errorCode})`);
        if ((error as any)?.cause) {
          console.error('[Auth Middleware] Error Cause:', (error as any)?.cause?.message || (error as any)?.cause);
        }
      }
      return false;
    }
  }

  function isSameOriginHost(url1: string, url2: string): boolean {
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      const port1 = u1.port || (u1.protocol === 'https:' ? '443' : '80');
      const port2 = u2.port || (u2.protocol === 'https:' ? '443' : '80');
      return u1.hostname.toLowerCase() === u2.hostname.toLowerCase() && port1 === port2;
    } catch {
      return false;
    }
  }

  function isPrivateOrLocalHost(hostname: string): boolean {
    let host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    // IPv4-mapped IPv6 must be judged by its IPv4 part. The URL parser normalizes
    // [::ffff:10.0.0.1] to the hex form [::ffff:a00:1], so handle both.
    if (host.startsWith('::ffff:') && host.includes('.')) {
      host = host.slice(7);
    } else {
      const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (mappedHex) {
        const hi = parseInt(mappedHex[1], 16);
        const lo = parseInt(mappedHex[2], 16);
        host = `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
      }
    }
    if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '::' || host === '0.0.0.0') {
      return true;
    }
    if (host === '169.254.169.254' || host.startsWith('169.254.')) {
      return true;
    }
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);
      if (octet1 === 10) return true;
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
      if (octet1 === 192 && octet2 === 168) return true;
      if (octet1 === 127) return true;
      if (octet1 === 0) return true;
      if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return true; // CGNAT / Tailscale
    }
    // Link-local fe80::/10 and unique-local fc00::/7
    if (/^fe[89ab][0-9a-f]:/.test(host) || /^f[cd][0-9a-f]{2}:/.test(host)) {
      return true;
    }
    return false;
  }

  function isValidImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 12) return false;

    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType === 'image/gif') {
      const header = buffer.toString('ascii', 0, 6);
      return header === 'GIF87a' || header === 'GIF89a';
    }
    if (mimeType === 'image/webp') {
      const riff = buffer.toString('ascii', 0, 4);
      const webp = buffer.toString('ascii', 8, 12);
      return riff === 'RIFF' && webp === 'WEBP';
    }
    if (mimeType === 'image/avif') {
      const ftyp = buffer.toString('ascii', 4, 8);
      const brand = buffer.toString('ascii', 8, 12);
      return ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis' || brand === 'mif1');
    }

    return false;
  }

  // SEC-015: throttle clients that keep presenting invalid tokens (each unknown token costs an
  // outbound request to Home Assistant)
  const AUTH_FAIL_WINDOW_MS = 60_000;
  const AUTH_FAIL_LIMIT = 30;
  const authFailures = new Map<string, { count: number; resetAt: number }>();
  function authFailureKey(req: express.Request): string {
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
  function isAuthRateLimited(req: express.Request): boolean {
    const entry = authFailures.get(authFailureKey(req));
    return Boolean(entry && entry.resetAt > Date.now() && entry.count >= AUTH_FAIL_LIMIT);
  }
  function recordAuthFailure(req: express.Request) {
    const key = authFailureKey(req);
    const now = Date.now();
    const entry = authFailures.get(key);
    if (!entry || entry.resetAt <= now) {
      if (authFailures.size > 1000) authFailures.clear();
      authFailures.set(key, { count: 1, resetAt: now + AUTH_FAIL_WINDOW_MS });
    } else {
      entry.count++;
    }
  }

  async function requireHAAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (isAuthRateLimited(req)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ success: false, error: 'Too many failed authentication attempts' });
    }
    let token = '';
    const rawAuthHeader = req.headers.authorization;
    if (rawAuthHeader && rawAuthHeader.startsWith('Bearer ')) {
      token = rawAuthHeader.slice(7).trim();
    }
    // SEC-013: tokens are accepted from the Authorization header only. The SSE stream and the image
    // proxy used to take ?token=, which ends up in proxy access logs and browser history.

    const clientHaUrl = (req.headers['x-ha-url'] as string) || (req.query.haUrl as string) || '';

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing Home Assistant authentication token'
      });
    }

    const authHeader = rawAuthHeader && rawAuthHeader.startsWith('Bearer ')
      ? rawAuthHeader
      : `Bearer ${token}`;

    if (!isMockToken(token) && !isHaTrustConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Server is not configured: set HASS_URL to the Home Assistant instance that validates tokens'
      });
    }

    const isValid = await verifyHAToken(token, clientHaUrl, authHeader);
    if (!isValid) {
      recordAuthFailure(req);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired Home Assistant authentication token'
      });
    }

    req.clientHaUrl = clientHaUrl;
    req.haToken = token;

    next();
  }

  // SEC-005: camera sources, asset uploads and statistics sync are admin-only. Any other valid
  // HA user may still read everything and save layout/preferences.
  const adminCache = new Map<string, { admin: boolean; expiresAt: number }>();

  function queryHaIsAdmin(haBase: string, token: string): Promise<boolean | null> {
    return new Promise((resolve) => {
      let settled = false;
      let ws: WebSocket | null = null;
      const finish = (value: boolean | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { ws?.close(); } catch { /* ignore */ }
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 5000);
      try {
        ws = new WebSocket(`${haBase.replace(/^http/i, 'ws')}/api/websocket`);
      } catch {
        return finish(null);
      }
      ws.onerror = () => finish(null);
      ws.onclose = () => finish(null);
      ws.onmessage = (ev: MessageEvent) => {
        let msg: any;
        try { msg = JSON.parse(String(ev.data)); } catch { return; }
        if (msg.type === 'auth_required') {
          ws!.send(JSON.stringify({ type: 'auth', access_token: token }));
        } else if (msg.type === 'auth_ok') {
          ws!.send(JSON.stringify({ id: 1, type: 'auth/current_user' }));
        } else if (msg.type === 'auth_invalid') {
          finish(false);
        } else if (msg.id === 1 && msg.type === 'result') {
          finish(msg.success ? Boolean(msg.result?.is_admin) : null);
        }
      };
    });
  }

  async function isHaAdmin(token: string): Promise<boolean> {
    // Mock tokens are admins unless they say otherwise, so tests can exercise both roles
    if (isMockToken(token)) return !/^(test|mock)_nonadmin/.test(token);
    const base = getTrustedHaBase();
    if (!base) return false;
    const key = `${base}|${token}`;
    const cached = adminCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.admin;
    const result = await queryHaIsAdmin(base, token);
    // Unknown (HA unreachable) is denied but not cached for long
    adminCache.set(key, { admin: result === true, expiresAt: Date.now() + (result === null ? 10_000 : 60_000) });
    if (adminCache.size > TOKEN_CACHE_MAX_ENTRIES) {
      adminCache.delete(adminCache.keys().next().value as string);
    }
    return result === true;
  }

  async function requireHAAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (await isHaAdmin(req.haToken ?? '')) return next();
    return res.status(403).json({
      success: false,
      error: 'Forbidden: this action requires a Home Assistant administrator'
    });
  }

  // Set to track connected SSE clients for real-time push configuration updates
  const sseClients = new Set<express.Response>();

  function broadcastConfigUpdate(serverVersion: number) {
    const payload = `event: config_updated\ndata: ${JSON.stringify({ serverVersion })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Periodic heartbeat to prevent intermediate proxy/NAT connection dropouts (every 15s)
  setInterval(() => {
    const pingPayload = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(': heartbeat\n\n');
        client.write(pingPayload);
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);

  // Real-time Push Stream (Server-Sent Events) for multi-device synchronization
  app.get('/api/config/stream', requireHAAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Initial handshake comment and ping event
    res.write(': connected\n\n');
    res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: Date.now(), status: 'connected' })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // NAS REST Configuration Persistence API
  app.get('/api/config', requireHAAuth, async (req, res) => {
    if (!isConfigStorageWritable) {
      return res.status(503).json({
        success: false,
        error: 'Dashboard configuration storage directory is not writable or reachable'
      });
    }

    try {
      // PERF-007: serve from memory while the file on disk is the one the cache was filled from
      let persisted: PersistedConfig | null = null;
      if (cachedServerConfig && cachedServerVersion > 0) {
        try {
          if (fs.statSync(configFilePath).mtimeMs === cachedConfigMtimeMs) {
            persisted = { config: cachedServerConfig, serverVersion: cachedServerVersion };
          }
        } catch {
          // file vanished: fall through to the self-healing reader
        }
      }
      if (!persisted) persisted = await readPersistentConfig();
      if (persisted) {
        return res.json({
          success: true,
          config: redactConfigForClient(persisted.config),
          serverVersion: persisted.serverVersion
        });
      }

      if (fs.existsSync(configFilePath)) {
        // The file is there but neither it nor any snapshot could be read: that is an error, not a first run
        console.error('[NAS Config] Config file exists but could not be read or recovered');
        return res.status(500).json({ success: false, error: 'Failed to read persistent config' });
      }

      // First run: file not found
      return res.status(404).json({
        success: false,
        message: 'Config not found'
      });
    } catch (err: any) {
      console.error('[NAS Config] Error reading persistent config:', err);
      return res.status(500).json({ success: false, error: 'Failed to read persistent config' });
    }
  });

  app.post('/api/config', requireHAAuth, async (req, res) => {
    if (!isConfigStorageWritable) {
      return res.status(503).json({
        success: false,
        error: 'Dashboard configuration storage directory is not writable or reachable'
      });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config payload: expected JSON object with dashboard configuration'
      });
    }

    const allowEmpty = Boolean(body.allowEmpty);
    // A partial save is a delta merged onto the current config (e.g. sent with keepalive while the
    // page unloads). Merging can't wipe sections, so the empty-payload and version guards don't apply.
    const isPartialMerge = body.partial === true && !allowEmpty;

    // Extract target config object and client's last-known version
    const targetConfig = (body.config && typeof body.config === 'object') ? { ...body.config } : { ...body };
    const configPayload: JsonObject = targetConfig;
    delete configPayload.expectedVersion;
    delete configPayload.serverVersion;
    delete configPayload.allowEmpty;
    delete configPayload.partial;

    const clientExpectedVersion = body.expectedVersion !== undefined 
      ? Number(body.expectedVersion) 
      : (body.serverVersion !== undefined ? Number(body.serverVersion) : undefined);

    if (!isValidDashboardConfig(targetConfig)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config payload: expected JSON object with dashboard configuration structure'
      });
    }
    const shapeError = validateDashboardConfigShape(targetConfig);
    if (shapeError) {
      return res.status(400).json({
        success: false,
        error: `Invalid config payload: ${shapeError}`
      });
    }

    try {
      const result = await withConfigWriteLock(async () => {
        // Read existing config with self-healing support
        const existing = await readPersistentConfig();
        const currentServerVersion = existing?.serverVersion || 0;
        const currentConfig = existing?.config || null;

        // Material Data Safeguard (Refuse empty payload overwriting material config unless allowEmpty is explicitly set)
        const isExplicitCameraSourcesUpdate = targetConfig.cameras?.sources !== undefined;
        if (!isPartialMerge && !allowEmpty && !isExplicitCameraSourcesUpdate && currentConfig && hasMaterialDashboardConfig(currentConfig) && !hasMaterialDashboardConfig(targetConfig)) {
          return {
            conflict: true,
            statusCode: 409,
            payload: {
              success: false,
              error: 'Refusing to overwrite existing dashboard configuration with an empty or uninitialized payload',
              materialGuard: true,
              serverVersion: currentServerVersion,
              config: redactConfigForClient(currentConfig)
            }
          };
        }

        // Real conflict check: client's version is older than server's current version
        if (!isPartialMerge && currentConfig && clientExpectedVersion !== undefined && !isNaN(clientExpectedVersion)) {
          if (clientExpectedVersion < currentServerVersion) {
            console.warn(`[NAS Config Conflict] Write rejected: client expected v${clientExpectedVersion} < server current v${currentServerVersion}`);
            return {
              conflict: true,
              statusCode: 409,
              payload: {
                success: false,
                error: 'Conflict: Server configuration has been modified by another client',
                conflict: true,
                serverVersion: currentServerVersion,
                config: redactConfigForClient(currentConfig)
              }
            };
          }
        }

        const nextServerVersion = currentServerVersion + 1;

        // Clients only see redacted camera URLs and a PIN marker; put the stored secrets back
        restoreRedactedCameraUrls(targetConfig, currentConfig);
        applyPinOnWrite(targetConfig, currentConfig);

        // Only a change to the camera sources needs admin rights; ordinary saves echo them back
        if (targetConfig.cameras?.sources !== undefined) {
          const before = JSON.stringify(currentConfig?.cameras?.sources ?? {});
          const after = JSON.stringify(targetConfig.cameras.sources ?? {});
          if (before !== after && !(await isHaAdmin(req.haToken ?? ''))) {
            return {
              conflict: false,
              statusCode: 403,
              payload: {
                success: false,
                error: 'Forbidden: changing camera sources requires a Home Assistant administrator'
              }
            };
          }
        }

        // Deep merge targetConfig onto currentConfig (unless allowEmpty is explicitly set)
        // to prevent partial payloads from silently wiping out unmentioned sections
        let finalConfig = targetConfig;
        if (!allowEmpty && currentConfig) {
          finalConfig = deepMergeConfig(currentConfig, targetConfig);
          // Audit detect if fields from currentConfig were omitted from incoming payload
          const currentKeys = Object.keys(currentConfig);
          const targetKeys = new Set(Object.keys(targetConfig));
          const preservedKeys = currentKeys.filter(k => !targetKeys.has(k));
          if (preservedKeys.length > 0) {
            console.log(`[NAS Config Audit] Merged partial config into v${nextServerVersion}. Preserved ${preservedKeys.length} existing top-level sections: ${preservedKeys.join(', ')}`);
          }
        }

        const diskPayload = {
          serverVersion: nextServerVersion,
          config: finalConfig
        };

        const payloadString = JSON.stringify(diskPayload, null, 2);

        // Atomic persistence with fsync and backup rotation
        await writeConfigFileAtomic(configFilePath, payloadString);

        cachedServerConfig = finalConfig;
        cachedServerVersion = nextServerVersion;

        console.log(`[NAS Config Audit] Config persisted successfully (v${nextServerVersion}) with atomic fsync & backup rotation`);

        return {
          conflict: false,
          statusCode: 200,
          payload: {
            success: true,
            config: redactConfigForClient(finalConfig),
            serverVersion: nextServerVersion
          }
        };
      });

      // Broadcast real-time SSE event to all connected devices if write succeeded
      if (result.statusCode === 200 && result.payload?.serverVersion) {
        broadcastConfigUpdate(result.payload.serverVersion);
        if (targetConfig.cameras?.sources !== undefined) {
          void prewarmCameraStreams();
        }
      }

      return res.status(result.statusCode).json(result.payload);
    } catch (err: any) {
      console.error('[NAS Config] Error saving persistent config:', err);
      return res.status(500).json({ success: false, error: 'Failed to save persistent config' });
    }
  });

  // NAS Custom Asset Upload API (vehicle PNGs / brand logos)
  const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

  app.post('/api/assets', requireHAAuth, requireHAAdmin, async (req, res) => {
    if (!isAssetsStorageWritable) {
      return res.status(503).json({
        success: false,
        error: 'Assets storage directory is not writable or reachable'
      });
    }

    try {
      const { dataUrl, key } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid dataUrl' });
      }

      // Parse base64 DataURL (e.g. data:image/png;base64,...)
      const match = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Invalid base64 DataURL format' });
      }

      const mimeType = match[1].toLowerCase();
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Cap upload size
      if (buffer.length > MAX_ASSET_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          error: `Asset size exceeds maximum limit of 5MB (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`
        });
      }

      // Restrict uploads strictly to safe raster image formats (no SVG to prevent stored XSS)
      const ALLOWED_MIME_TYPES: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/avif': 'avif'
      };

      const ext = ALLOWED_MIME_TYPES[mimeType];
      if (!ext) {
        return res.status(400).json({
          success: false,
          error: `Unsupported image type "${mimeType}". Allowed formats: PNG, JPEG, WebP, GIF, AVIF.`
        });
      }

      // Validate magic bytes / file signature to prevent executable or polyglot masquerading
      if (!isValidImageMagicBytes(buffer, mimeType)) {
        return res.status(400).json({
          success: false,
          error: 'Corrupted image file or MIME type does not match file signature (magic bytes).'
        });
      }

      // Sanitize key and generate safe unique filename to avoid path traversal
      const safeKey = (key || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const uniqueFilename = `${safeKey}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      if (!fs.existsSync(assetsDir)) {
        await fs.promises.mkdir(assetsDir, { recursive: true });
      }

      const targetPath = path.join(assetsDir, uniqueFilename);
      const tempFile = path.join(assetsDir, `.tmp-${uniqueFilename}`);

      const handle = await fs.promises.open(tempFile, 'w');
      try {
        await handle.writeFile(buffer);
        await handle.sync(); // fsync to ensure bytes reach physical NAS drive
      } finally {
        await handle.close();
      }
      await fs.promises.rename(tempFile, targetPath);

      console.log(`[NAS Assets Audit] Uploaded asset "${uniqueFilename}" (${(buffer.length / 1024).toFixed(1)} KB) saved with atomic fsync`);

      const publicUrl = `/api/assets/${uniqueFilename}`;
      return res.json({ success: true, url: publicUrl, filename: uniqueFilename });
    } catch (err: any) {
      console.error('[NAS Assets] Error saving asset:', err);
      return res.status(500).json({ success: false, error: 'Failed to save asset to persistent volume' });
    }
  });

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
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 2. Stored Entities List & Counts Endpoint
  app.get(['/api/statistics/entities', '/api/energy/entities'], requireHAAuth, (req, res) => {
    applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');
    try {
      const entities = getStoredEntities();
      res.json({ success: true, count: entities.length, entities });
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('[Statistics API] /api/statistics/sync error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Universal Image Proxy to bypass CORS / Private Network restrictions for artwork color extraction
  const MAX_PROXY_IMAGE_BYTES = 10 * 1024 * 1024;
  const MAX_PROXY_REDIRECTS = 3;

  // Resolves DNS itself and refuses private addresses, so a public hostname that resolves (or
  // re-resolves via DNS rebinding) to a LAN or cloud-metadata IP can't be reached through the proxy.
  const publicOnlyDispatcher = new UndiciAgent({
    connect: {
      lookup: (hostname, opts, cb) => {
        dns.lookup(hostname, opts as dns.LookupOptions, (err, address: any, family) => {
          if (err) return cb(err, address, family);
          const addresses: string[] = Array.isArray(address) ? address.map((a: dns.LookupAddress) => a.address) : [address];
          if (addresses.some((a) => isPrivateOrLocalHost(a))) {
            const blocked = Object.assign(new Error(`Refusing to proxy ${hostname}: resolves to a private address`), { code: 'EPRIVATEADDR' });
            return cb(blocked, address, family);
          }
          cb(null, address, family);
        });
      }
    }
  });

  app.options('/api/image-proxy', (req, res) => {
    applyCorsHeaders(req, res, 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.sendStatus(204);
  });

  app.get('/api/image-proxy', requireHAAuth, async (req, res) => {
    applyCorsHeaders(req, res, 'GET, OPTIONS');

    const rawUrl = (req.query.url as string) || '';
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const token: string = req.haToken ?? '';
    const haBase = getTrustedHaBase() || resolveTargetHaBase(req.clientHaUrl);

    let currentUrl: URL;
    try {
      // Relative paths (/api/media_player_proxy/..., /local/...) resolve against Home Assistant
      currentUrl = new URL(rawUrl, `${haBase}/`);
    } catch {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    try {
      let response: Awaited<ReturnType<typeof undiciFetch>>;
      let isTargetHa = false;

      // Follow redirects manually so every hop gets the same protocol and private-network checks
      for (let hop = 0; ; hop++) {
        if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
          return res.status(400).json({ error: 'Only http and https protocols are supported' });
        }

        isTargetHa = isSameOriginHost(currentUrl.toString(), haBase);
        if (!isTargetHa && isPrivateOrLocalHost(currentUrl.hostname)) {
          return res.status(403).json({ error: 'Access to private, local, or cloud metadata network addresses is prohibited' });
        }

        const headers: Record<string, string> = {
          'User-Agent': 'HomeAssistantDashboard/1.0',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        };
        // ONLY forward the Home Assistant token to the Home Assistant instance itself
        if (isTargetHa) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        response = await undiciFetch(currentUrl.toString(), {
          headers,
          redirect: 'manual',
          dispatcher: isTargetHa ? haDispatcher : publicOnlyDispatcher,
          signal: AbortSignal.timeout(6000),
        });

        const location = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && location) {
          await response.body?.cancel().catch(() => {});
          if (hop >= MAX_PROXY_REDIRECTS) {
            return res.status(502).json({ error: 'Too many redirects' });
          }
          currentUrl = new URL(location, currentUrl);
          continue;
        }
        break;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        return res.status(response.status).json({ error: `Remote image fetch failed with status ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        await response.body?.cancel().catch(() => {});
        return res.status(400).json({ error: 'Remote URL did not return an image content-type' });
      }

      const declaredLength = Number(response.headers.get('content-length') || 0);
      if (declaredLength > MAX_PROXY_IMAGE_BYTES) {
        await response.body?.cancel().catch(() => {});
        return res.status(413).json({ error: 'Remote image is too large' });
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      if (response.body) {
        for await (const chunk of response.body) {
          totalBytes += chunk.length;
          if (totalBytes > MAX_PROXY_IMAGE_BYTES) {
            return res.status(413).json({ error: 'Remote image is too large' });
          }
          chunks.push(Buffer.from(chunk));
        }
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Only reachable with a valid token, so keep it out of shared caches
      res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
      return res.send(Buffer.concat(chunks, totalBytes));
    } catch (err: any) {
      if (err?.cause?.code === 'EPRIVATEADDR' || err?.code === 'EPRIVATEADDR') {
        return res.status(403).json({ error: 'Access to private, local, or cloud metadata network addresses is prohibited' });
      }
      console.warn('[Image Proxy] Upstream fetch failed:', err?.message || err);
      return res.status(502).json({ error: 'Failed to proxy image' });
    }
  });

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Camera RTSP Streaming & go2rtc Proxy Layer
  // -------------------------------------------------------------
  const isDev = process.env.NODE_ENV !== 'production';
  const hasExplicitGo2RtcUrl = Boolean(process.env.GO2RTC_URL);
  // In development environments, do not attempt to contact or proxy go2rtc unless explicitly configured
  const GO2RTC_ENABLED = !isDev || hasExplicitGo2RtcUrl;
  const GO2RTC_URL = (process.env.GO2RTC_URL || (isDev ? '' : 'http://127.0.0.1:1984')).replace(/\/+$/, '');
  const registeredGo2RtcStreams = new Map<string, string>(); // streamName -> rtspUrl

  function getCameraStreamName(cameraId: string): string {
    return cameraId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function getCameraRtspConfig(cameraId: string): { streamName: string; rtspUrl: string } | null {
    const sources = cachedServerConfig?.cameras?.sources;
    if (!sources || typeof sources !== 'object') return null;
    const entry =
      sources[cameraId] ||
      Object.values(sources).find(
        (s: any) =>
          s?.id === cameraId ||
          s?.haEntityId === cameraId ||
          (s?.id && `camera.${s.id}` === cameraId) ||
          (cameraId.startsWith('camera.') && s?.id === cameraId.replace('camera.', ''))
      );
    if (!entry || !entry.rtspUrl) return null;
    const streamName = getCameraStreamName(entry.id || cameraId);
    return { streamName, rtspUrl: String(entry.rtspUrl).trim() };
  }

  /**
   * Registers every configured camera with go2rtc ahead of time, so the first viewer's WebRTC
   * request doesn't also pay for stream registration. Runs at startup and after config saves.
   */
  async function prewarmCameraStreams(): Promise<void> {
    if (!GO2RTC_ENABLED || !GO2RTC_URL) return;
    if (!cachedServerConfig) {
      await readPersistentConfig().catch(() => null);
    }
    const sources = cachedServerConfig?.cameras?.sources;
    if (!sources || typeof sources !== 'object') return;
    await Promise.all(
      Object.entries(sources).map(([key, entry]: [string, any]) => {
        if (!entry?.rtspUrl) return Promise.resolve(false);
        return ensureGo2RtcStream(getCameraStreamName(entry.id || key), String(entry.rtspUrl).trim());
      })
    );
  }

  let lastGo2RtcWarnTime = 0;
  function logGo2RtcUnreachable(errMessage: string) {
    if (!GO2RTC_ENABLED) return;
    const now = Date.now();
    if (now - lastGo2RtcWarnTime > 30000) {
      lastGo2RtcWarnTime = now;
      console.warn(`[go2rtc Proxy] go2rtc relay is unreachable at ${GO2RTC_URL} (${errMessage}). Ensure the go2rtc container is running or set GO2RTC_URL in your environment.`);
    }
  }

  async function ensureGo2RtcStream(streamName: string, rtspUrl: string): Promise<boolean> {
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return false;
    }
    if (registeredGo2RtcStreams.get(streamName) === rtspUrl) {
      return true;
    }
    // Defense in depth for configs saved before server-side validation existed (SEC-003)
    const sourceError = validateCameraSourceUrl(rtspUrl);
    if (sourceError) {
      console.warn(`[go2rtc Proxy] Refusing to register stream "${streamName}": ${sourceError}`);
      return false;
    }
    try {
      const targetUrl = `${GO2RTC_URL}/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(rtspUrl)}`;
      let res = await fetch(targetUrl, {
        method: 'PUT',
        signal: AbortSignal.timeout(4000)
      });
      if (res.status === 405 || !res.ok) {
        res = await fetch(targetUrl, {
          method: 'POST',
          signal: AbortSignal.timeout(4000)
        });
      }
      if (res.ok || res.status === 201) {
        registeredGo2RtcStreams.set(streamName, rtspUrl);
        return true;
      }
      console.warn(`[go2rtc Proxy] Failed to register stream "${streamName}": status ${res.status}`);
      return false;
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return false;
    }
  }

  // Camera streaming status check
  app.get('/api/cameras/status', requireHAAuth, async (req, res) => {
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return res.json({
        success: true,
        go2rtcOnline: false,
        devDisabled: true,
        error: 'go2rtc is disabled in development environment'
      });
    }
    try {
      const ping = await fetch(`${GO2RTC_URL}/api/streams`, { signal: AbortSignal.timeout(3000) });
      if (ping.ok) {
        const streams = JSON.parse(redactCredentialsInText(JSON.stringify(await ping.json())));
        return res.json({ success: true, go2rtcOnline: true, streams });
      }
      return res.json({ success: true, go2rtcOnline: false, error: `go2rtc returned status ${ping.status}` });
    } catch (err: any) {
      return res.json({ success: true, go2rtcOnline: false, error: 'go2rtc unreachable' });
    }
  });

  // WebRTC WHEP signaling proxy
  app.post('/api/cameras/:cameraId/webrtc', requireHAAuth, async (req, res) => {
    const { cameraId } = req.params;
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return res.status(503).json({
        success: false,
        devDisabled: true,
        error: 'go2rtc streaming is disabled in development environment'
      });
    }
    const config = getCameraRtspConfig(cameraId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Camera "${cameraId}" has no configured RTSP source URL`
      });
    }

    await ensureGo2RtcStream(config.streamName, config.rtspUrl);

    try {
      let clientSdp = '';
      if (typeof req.body === 'string') {
        clientSdp = req.body;
      } else if (req.body && typeof req.body.sdp === 'string') {
        clientSdp = req.body.sdp;
      } else {
        return res.status(400).json({ error: 'Missing client SDP offer in request body' });
      }

      const go2rtcRes = await fetch(`${GO2RTC_URL}/api/webrtc?src=${encodeURIComponent(config.streamName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'User-Agent': 'HomeAssistantDashboard/1.0'
        },
        body: clientSdp,
        signal: AbortSignal.timeout(6000)
      });

      if (!go2rtcRes.ok) {
        console.warn(`[go2rtc Proxy] WebRTC signaling failed (${go2rtcRes.status}): ${(await go2rtcRes.text()).slice(0, 200)}`);
        return res.status(go2rtcRes.status).json({
          error: `go2rtc WebRTC signaling failed (${go2rtcRes.status})`
        });
      }

      const answerSdp = await go2rtcRes.text();
      res.setHeader('Content-Type', 'application/json');
      applyCorsHeaders(req, res, 'POST, OPTIONS');
      return res.json({
        type: 'answer',
        sdp: answerSdp
      });
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return res.status(502).json({
        error: 'Failed to negotiate WebRTC stream with go2rtc'
      });
    }
  });

  // HLS stream and media segment proxy
  app.all('/api/cameras/:cameraId/hls*', requireHAAuth, async (req, res) => {
    // Playlist and segment fetches only (SEC-002): never relay other methods to go2rtc
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    const { cameraId } = req.params;
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return res.status(503).send('go2rtc streaming is disabled in development environment');
    }
    const config = getCameraRtspConfig(cameraId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Camera "${cameraId}" has no configured RTSP source URL`
      });
    }

    await ensureGo2RtcStream(config.streamName, config.rtspUrl);

    try {
      const subpath = resolveHlsSubpath(req.params[0]);
      if (!subpath) {
        return res.status(400).json({ success: false, error: 'Invalid HLS resource path' });
      }

      const urlObj = new URL(`${GO2RTC_URL}/api${subpath}`);
      urlObj.searchParams.set('src', config.streamName);
      for (const [k, v] of Object.entries(req.query)) {
        if (HLS_FORWARDED_QUERY_KEYS.has(k) && typeof v === 'string') {
          urlObj.searchParams.set(k, v);
        }
      }

      const go2rtcRes = await fetch(urlObj.toString(), {
        method: req.method,
        headers: {
          'User-Agent': 'HomeAssistantDashboard/1.0',
          Accept: '*/*'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!go2rtcRes.ok) {
        return res.status(go2rtcRes.status).send(`go2rtc HLS upstream error: ${go2rtcRes.status}`);
      }

      const contentType = go2rtcRes.headers.get('content-type') ||
        (subpath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T');
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');

      if (subpath.endsWith('.m3u8')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      // PERF-009: stream the upstream body instead of buffering whole segments in memory
      if (req.method === 'HEAD' || !go2rtcRes.body) {
        return res.end();
      }
      const upstream = Readable.fromWeb(go2rtcRes.body as any);
      upstream.on('error', () => res.destroy());
      res.on('close', () => upstream.destroy());
      return void upstream.pipe(res);
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return res.status(502).json({
        error: 'Failed to fetch HLS stream from go2rtc'
      });
    }
  });

  // Delete camera source endpoint
  app.delete('/api/cameras/:cameraId', requireHAAuth, requireHAAdmin, async (req, res) => {
    const { cameraId } = req.params;
    console.log(`[Camera API] Deleting camera stream source "${cameraId}"...`);

    try {
      const result = await withConfigWriteLock(async () => {
        const existing = await readPersistentConfig();
        const baseConfig = existing?.config || cachedServerConfig || null;
        const currentServerVersion = existing?.serverVersion || cachedServerVersion || 1;

        if (!baseConfig?.cameras?.sources || !baseConfig.cameras.sources[cameraId]) {
          return { nextVersion: null as number | null, removed: false };
        }

        // Work on a copy so a failed write leaves the cached config untouched (REL-002)
        const nextConfig = JSON.parse(JSON.stringify(baseConfig));
        delete nextConfig.cameras.sources[cameraId];

        const nextVersion = currentServerVersion + 1;
        await writeConfigFileAtomic(
          configFilePath,
          JSON.stringify({ serverVersion: nextVersion, config: nextConfig }, null, 2)
        );
        cachedServerConfig = nextConfig;
        cachedServerVersion = nextVersion;

        // Only after the config is durable: drop the stream from go2rtc
        const streamName = getCameraStreamName(cameraId);
        registeredGo2RtcStreams.delete(streamName);
        if (GO2RTC_ENABLED && GO2RTC_URL) {
          try {
            await fetch(`${GO2RTC_URL}/api/streams?src=${encodeURIComponent(streamName)}`, {
              method: 'DELETE',
              signal: AbortSignal.timeout(3000)
            });
            console.log(`[Camera API] Removed stream "${streamName}" from go2rtc`);
          } catch (err: any) {
            console.warn(`[Camera API] Could not delete stream "${streamName}" from go2rtc:`, err?.message);
          }
        }

        return { nextVersion, removed: true };
      });

      if (result.nextVersion) {
        broadcastConfigUpdate(result.nextVersion);
      }

      applyCorsHeaders(req, res, 'DELETE, OPTIONS');
      return res.json({ success: true, cameraId, removed: result.removed });
    } catch (err: any) {
      console.error(`[Camera API] Failed to delete camera "${cameraId}":`, err);
      return res.status(500).json({ success: false, error: 'Failed to delete camera source' });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/data/assets/**', '**/data/config/**']
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const setStaticCacheHeaders = (res: express.Response, filePath: string) => {
      const fileName = path.basename(filePath);
      if (['sw.js', 'registerSW.js', 'manifest.json', 'favicon.svg', 'index.html'].includes(fileName)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
      } else if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    };

    // dist/ also holds the server bundle and its source map; never serve them as static files
    app.use((req, res, next) => {
      let normalizedPath = req.path;
      try {
        // Normalize like the static handler does, so /assets/../server.cjs is caught too
        normalizedPath = path.posix.normalize(decodeURIComponent(req.path));
      } catch {
        return res.status(400).end();
      }
      if (/^\/server\.cjs/i.test(normalizedPath)) return res.status(404).end();
      next();
    });

    // Serve the .br/.gz copies written at build time (scripts/compress-dist.cjs). The index is
    // built once at startup so requests don't hit the disk to look for variants.
    const precompressed = new Set<string>();
    const indexPrecompressed = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) indexPrecompressed(full);
        else if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) precompressed.add(full);
      }
    };
    try {
      indexPrecompressed(distPath);
    } catch (err: any) {
      console.warn('[HAD Server] Could not index precompressed assets:', err?.message || err);
    }

    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || precompressed.size === 0) return next();
      let filePath: string;
      try {
        filePath = path.join(distPath, decodeURIComponent(req.path));
      } catch {
        return next();
      }
      if (!filePath.startsWith(distPath + path.sep)) return next();

      const acceptEncoding = String(req.headers['accept-encoding'] || '');
      const variant = /\bbr\b/.test(acceptEncoding) && precompressed.has(`${filePath}.br`)
        ? { encoding: 'br', file: `${filePath}.br` }
        : /\bgzip\b/.test(acceptEncoding) && precompressed.has(`${filePath}.gz`)
          ? { encoding: 'gzip', file: `${filePath}.gz` }
          : null;
      if (!variant) return next();

      res.setHeader('Content-Encoding', variant.encoding);
      res.setHeader('Vary', 'Accept-Encoding');
      res.type(path.extname(filePath));
      setStaticCacheHeaders(res, filePath);
      res.sendFile(variant.file, (err) => {
        if (err && !res.headersSent) next();
      });
    });

    app.use(express.static(distPath, { setHeaders: setStaticCacheHeaders }));
    app.get('*', (req, res) => {
      // A missing file (e.g. a chunk from a previous deployment) must 404, not get index.html
      // with a 200: the browser would fail on the HTML as a script and the client would reload in a loop.
      if (req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) {
        return res.status(404).end();
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

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
    for (const client of sseClients) {
      try {
        client.end();
      } catch {}
    }
    sseClients.clear();
    httpServer.closeIdleConnections?.();

    try {
      await configWriteQueue;
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
