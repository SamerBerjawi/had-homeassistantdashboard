/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'node:dns';
import dotenv from 'dotenv';
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici';

dotenv.config();

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

    // Content-Security-Policy (CSP) Defense-in-Depth:
    // Restrict script execution to 'self' to minimize XSS blast radius.
    // In dev mode, Vite requires 'unsafe-inline' and 'unsafe-eval' for HMR modules.
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' ws: wss: https: http:",
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
  let cachedServerConfig: any = null;
  let cachedServerVersion = 0;

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
  function deepMergeConfig(base: any = {}, partial: any = {}): any {
    const result: any = { ...(base || {}) };
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
        const baseVal =
          result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])
            ? result[key]
            : {};
        result[key] = deepMergeConfig(baseVal, value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // Config validation helper
  function isValidDashboardConfig(body: any): boolean {
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

        // Keep up to 5 rolling snapshots in backups/
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
        console.warn('[NAS Config] Backup rotation notice:', backupErr);
      }
    }

    // Atomic filesystem rename
    await fs.promises.rename(tempFile, filePath);
  }

  // Self-healing configuration reader: reads primary file with automatic fallback to .bak and snapshots
  async function readPersistentConfig(): Promise<{ config: any; serverVersion: number } | null> {
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
          } catch {}
        }
      } catch {}
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
      } catch {}
    }

    return null;
  }

  // -------------------------------------------------------------
  // Home Assistant Token Authentication & Security Gatekeeper
  // -------------------------------------------------------------
  const tokenValidationCache = new Map<string, { valid: boolean; expiresAt: number }>();
  let lastAuthErrorLog = 0;

  function resolveTargetHaBase(clientHaUrl?: string): string {
    let haBase = (
      process.env.HASS_URL ||
      process.env.HA_URL ||
      process.env.HOME_ASSISTANT_URL ||
      process.env.HOMEASSISTANT_URL ||
      clientHaUrl ||
      'http://homeassistant.local:8123'
    ).trim();

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

    // Fast-path: allow test tokens in non-production test harnesses or when explicitly enabled for testing
    if ((process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_TOKENS === 'true') && (token.startsWith('test_') || token.startsWith('mock_'))) {
      return true;
    }

    const cached = tokenValidationCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.valid;
    }

    const haBase = resolveTargetHaBase(clientHaUrl);
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

      tokenValidationCache.set(token, {
        valid: isValid,
        expiresAt: Date.now() + (isValid ? 10 * 60 * 1000 : 30 * 1000)
      });

      if (!isValid) {
        console.warn(`[Auth Middleware] Token validation rejected by Home Assistant (HTTP ${haRes.status}) at ${targetUrl}`);
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
          tokenValidationCache.set(token, {
            valid: isValid,
            expiresAt: Date.now() + (isValid ? 10 * 60 * 1000 : 30 * 1000)
          });
          return isValid;
        } catch {
          // Proceed to fallback logic
        }
      }

      // If token was previously verified and valid, grant a temporary grace period during network interruptions
      if (cached && cached.valid) {
        tokenValidationCache.set(token, {
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
      tokenValidationCache.set(token, {
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
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
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
    }
    if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:')) {
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

  async function requireHAAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    let token = '';
    const rawAuthHeader = req.headers.authorization;
    if (rawAuthHeader && rawAuthHeader.startsWith('Bearer ')) {
      token = rawAuthHeader.slice(7).trim();
    } else if (req.path === '/api/config/stream' || req.originalUrl?.startsWith('/api/config/stream')) {
      /**
       * SSE Route Query String Token Fallback:
       * Browser EventSource API does not support custom HTTP Authorization headers.
       * Therefore, the real-time push stream (/api/config/stream) accepts the bearer token via
       * query parameter (?token=...) as a strictly-scoped fallback.
       *
       * Security mitigations:
       * 1. Scoped EXCLUSIVELY to /api/config/stream. REST endpoints (/api/config, /api/assets)
       *    must ALWAYS provide the Authorization: Bearer <token> header and will reject query tokens.
       * 2. The token is immediately deleted from req.query and redacted from req.url so it
       *    never leaks into server/reverse-proxy access logs or downstream middleware.
       */
      if (req.query.token && typeof req.query.token === 'string') {
        token = req.query.token.trim();
        delete req.query.token;
        if (req.url) {
          req.url = req.url.replace(/([?&])token=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
        }
      }
    }

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

    const isValid = await verifyHAToken(token, clientHaUrl, authHeader);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired Home Assistant authentication token'
      });
    }

    (req as any).clientHaUrl = clientHaUrl;
    (req as any).haToken = token;

    next();
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
      const persisted = await readPersistentConfig();
      if (persisted) {
        return res.json({
          success: true,
          config: persisted.config,
          serverVersion: persisted.serverVersion
        });
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

    // Extract target config object and client's last-known version
    const targetConfig = (body.config && typeof body.config === 'object') ? { ...body.config } : { ...body };
    delete (targetConfig as any).expectedVersion;
    delete (targetConfig as any).serverVersion;
    delete (targetConfig as any).allowEmpty;

    const clientExpectedVersion = body.expectedVersion !== undefined 
      ? Number(body.expectedVersion) 
      : (body.serverVersion !== undefined ? Number(body.serverVersion) : undefined);

    if (!isValidDashboardConfig(targetConfig)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config payload: expected JSON object with dashboard configuration structure'
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
        if (!allowEmpty && !isExplicitCameraSourcesUpdate && currentConfig && hasMaterialDashboardConfig(currentConfig) && !hasMaterialDashboardConfig(targetConfig)) {
          return {
            conflict: true,
            statusCode: 409,
            payload: {
              success: false,
              error: 'Refusing to overwrite existing dashboard configuration with an empty or uninitialized payload',
              materialGuard: true,
              serverVersion: currentServerVersion,
              config: currentConfig
            }
          };
        }

        // Real conflict check: client's version is older than server's current version
        if (currentConfig && clientExpectedVersion !== undefined && !isNaN(clientExpectedVersion)) {
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
                config: currentConfig
              }
            };
          }
        }

        const nextServerVersion = currentServerVersion + 1;

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
            config: finalConfig,
            serverVersion: nextServerVersion
          }
        };
      });

      // Broadcast real-time SSE event to all connected devices if write succeeded
      if (result.statusCode === 200 && result.payload?.serverVersion) {
        broadcastConfigUpdate(result.payload.serverVersion);
      }

      return res.status(result.statusCode).json(result.payload);
    } catch (err: any) {
      console.error('[NAS Config] Error saving persistent config:', err);
      return res.status(500).json({ success: false, error: 'Failed to save persistent config' });
    }
  });

  // NAS Custom Asset Upload API (vehicle PNGs / brand logos)
  const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

  app.post('/api/assets', requireHAAuth, async (req, res) => {
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

  // Universal Image Proxy to bypass CORS / Private Network restrictions for artwork color extraction
  app.get('/api/image-proxy', requireHAAuth, async (req, res) => {
    const rawUrl = (req.query.url as string) || '';
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https protocols are supported' });
    }

    // Determine configured/client Home Assistant URL
    const clientHaUrl = (req as any).clientHaUrl || process.env.DASHBOARD_HA_URL || process.env.HA_URL || '';
    const isTargetHa = clientHaUrl ? isSameOriginHost(rawUrl, clientHaUrl) : false;

    // SSRF Guard: block private/internal/cloud-metadata IPs unless it is explicitly the target Home Assistant instance
    if (!isTargetHa && isPrivateOrLocalHost(parsedUrl.hostname)) {
      return res.status(403).json({ error: 'Access to private, local, or cloud metadata network addresses is prohibited' });
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'HomeAssistantDashboard/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      };

      // Credential Leakage Prevention: ONLY forward Home Assistant Authorization header to the Home Assistant instance itself
      if (isTargetHa) {
        const rawAuthHeader = req.headers['authorization'];
        if (rawAuthHeader) {
          headers['Authorization'] = rawAuthHeader;
        } else if ((req as any).haToken) {
          headers['Authorization'] = `Bearer ${(req as any).haToken}`;
        }
      }

      const response = await fetch(parsedUrl.toString(), {
        headers,
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote image fetch failed with status ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: 'Remote URL did not return an image content-type' });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      applyCorsHeaders(req, res, 'GET, OPTIONS');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.send(buffer);
    } catch (err: any) {
      return res.status(502).json({ error: 'Failed to proxy image: ' + (err?.message || 'Network error') });
    }
  });

  // -------------------------------------------------------------
  // Camera RTSP Streaming & go2rtc Proxy Layer
  // -------------------------------------------------------------
  const GO2RTC_URL = (process.env.GO2RTC_URL || 'http://127.0.0.1:1984').replace(/\/+$/, '');
  const registeredGo2RtcStreams = new Map<string, string>(); // streamName -> rtspUrl

  function getCameraStreamName(cameraId: string): string {
    return cameraId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function getCameraRtspConfig(cameraId: string): { streamName: string; rtspUrl: string } | null {
    const sources = (cachedServerConfig as any)?.cameras?.sources;
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

  let lastGo2RtcWarnTime = 0;
  function logGo2RtcUnreachable(errMessage: string) {
    const now = Date.now();
    if (now - lastGo2RtcWarnTime > 30000) {
      lastGo2RtcWarnTime = now;
      console.warn(`[go2rtc Proxy] go2rtc relay is unreachable at ${GO2RTC_URL} (${errMessage}). Ensure the go2rtc container is running or set GO2RTC_URL in your environment.`);
    }
  }

  async function ensureGo2RtcStream(streamName: string, rtspUrl: string): Promise<boolean> {
    if (registeredGo2RtcStreams.get(streamName) === rtspUrl) {
      return true;
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
    try {
      const ping = await fetch(`${GO2RTC_URL}/api/streams`, { signal: AbortSignal.timeout(3000) });
      if (ping.ok) {
        const streams = await ping.json();
        return res.json({ success: true, go2rtcOnline: true, streams });
      }
      return res.json({ success: true, go2rtcOnline: false, error: `go2rtc returned status ${ping.status}` });
    } catch (err: any) {
      return res.json({ success: true, go2rtcOnline: false, error: err?.message || 'go2rtc unreachable' });
    }
  });

  // WebRTC WHEP signaling proxy
  app.post('/api/cameras/:cameraId/webrtc', requireHAAuth, async (req, res) => {
    const { cameraId } = req.params;
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
        const errText = await go2rtcRes.text();
        return res.status(go2rtcRes.status).json({
          error: `go2rtc WebRTC signaling failed (${go2rtcRes.status}): ${errText}`
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
        error: 'Failed to negotiate WebRTC stream with go2rtc: ' + (err?.message || 'Unknown error')
      });
    }
  });

  // HLS stream and media segment proxy
  app.all('/api/cameras/:cameraId/hls*', requireHAAuth, async (req, res) => {
    const { cameraId } = req.params;
    const config = getCameraRtspConfig(cameraId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Camera "${cameraId}" has no configured RTSP source URL`
      });
    }

    await ensureGo2RtcStream(config.streamName, config.rtspUrl);

    try {
      let subpath = req.params[0] || '/stream.m3u8';
      if (!subpath.startsWith('/')) subpath = `/${subpath}`;
      if (subpath === '/' || subpath === '') subpath = '/stream.m3u8';

      const urlObj = new URL(`${GO2RTC_URL}/api${subpath}`);
      urlObj.searchParams.set('src', config.streamName);
      for (const [k, v] of Object.entries(req.query)) {
        if (k !== 'src' && typeof v === 'string') {
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

      const buffer = Buffer.from(await go2rtcRes.arrayBuffer());
      return res.send(buffer);
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return res.status(502).json({
        error: 'Failed to fetch HLS stream from go2rtc: ' + (err?.message || 'Unknown error')
      });
    }
  });

  // Delete camera source endpoint
  app.delete('/api/cameras/:cameraId', requireHAAuth, async (req, res) => {
    const { cameraId } = req.params;
    console.log(`[Camera API] Deleting camera stream source "${cameraId}"...`);

    const result = await withConfigWriteLock(async () => {
      const existing = await readPersistentConfig();
      const currentConfig = existing?.config || cachedServerConfig || null;
      const currentServerVersion = existing?.serverVersion || cachedServerVersion || 1;

      if (currentConfig?.cameras?.sources && currentConfig.cameras.sources[cameraId]) {
        const streamName = getCameraStreamName(cameraId);
        delete currentConfig.cameras.sources[cameraId];

        // Remove stream from go2rtc memory if running
        try {
          await fetch(`${GO2RTC_URL}/api/streams?src=${encodeURIComponent(streamName)}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(3000)
          });
          console.log(`[Camera API] Removed stream "${streamName}" from go2rtc`);
        } catch (err: any) {
          console.warn(`[Camera API] Could not delete stream "${streamName}" from go2rtc:`, err?.message);
        }
        registeredGo2RtcStreams.delete(streamName);

        // Atomically persist config
        const nextVersion = currentServerVersion + 1;
        const diskPayload = {
          serverVersion: nextVersion,
          config: currentConfig
        };
        await writeConfigFileAtomic(configFilePath, JSON.stringify(diskPayload, null, 2));
        cachedServerConfig = currentConfig;
        cachedServerVersion = nextVersion;

        return { nextVersion };
      }
      return { nextVersion: currentServerVersion };
    });

    if (result.nextVersion) {
      broadcastConfigUpdate(result.nextVersion);
    }

    applyCorsHeaders(req, res, 'DELETE, OPTIONS');
    return res.json({ success: true, cameraId });
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
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        if (['sw.js', 'registerSW.js', 'manifest.json', 'favicon.svg', 'index.html'].includes(fileName)) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n  \x1b[36m\x1b[1mHAD - Home Assistant Dashboard\x1b[0m');
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m \x1b[36mhttp://0.0.0.0:${PORT}/\x1b[0m (accessible by wall tablets on LAN)\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start HAD server:', err);
});
