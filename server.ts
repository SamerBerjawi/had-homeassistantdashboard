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

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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

  // Payload Limit Middleware (allows asset sync and large configs)
  app.use(express.json({ limit: '15mb' }));

  // Static Assets Directory for NAS uploaded vehicle PNGs / brand logos with CORS headers
  app.use('/api/assets', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    next();
  }, express.static(assetsDir));

  app.use('/data/assets', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    next();
  }, express.static(assetsDir));

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

    // Fast-path: allow test tokens in non-production test harnesses
    if (process.env.NODE_ENV !== 'production' && (token.startsWith('test_') || token.startsWith('mock_'))) {
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

  async function requireHAAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    let token = '';
    const rawAuthHeader = req.headers.authorization;
    if (rawAuthHeader && rawAuthHeader.startsWith('Bearer ')) {
      token = rawAuthHeader.slice(7).trim();
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token.trim();
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
        if (!allowEmpty && currentConfig && hasMaterialDashboardConfig(currentConfig) && !hasMaterialDashboardConfig(targetConfig)) {
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
        const diskPayload = {
          serverVersion: nextServerVersion,
          config: targetConfig
        };

        const payloadString = JSON.stringify(diskPayload, null, 2);

        // Atomic persistence with fsync and backup rotation
        await writeConfigFileAtomic(configFilePath, payloadString);

        cachedServerConfig = targetConfig;
        cachedServerVersion = nextServerVersion;

        return {
          conflict: false,
          statusCode: 200,
          payload: {
            success: true,
            config: targetConfig,
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

      let ext = 'png';
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
      else if (mimeType.includes('svg')) ext = 'svg';
      else if (mimeType.includes('webp')) ext = 'webp';
      else if (mimeType.includes('gif')) ext = 'gif';
      else if (mimeType.includes('avif')) ext = 'avif';

      // Sanitize key and generate safe unique filename to avoid path traversal
      const safeKey = (key || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const uniqueFilename = `${safeKey}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      if (!fs.existsSync(assetsDir)) {
        await fs.promises.mkdir(assetsDir, { recursive: true });
      }

      const targetPath = path.join(assetsDir, uniqueFilename);
      const tempFile = path.join(assetsDir, `.tmp-${uniqueFilename}`);

      await fs.promises.writeFile(tempFile, buffer);
      await fs.promises.rename(tempFile, targetPath);

      const publicUrl = `/api/assets/${uniqueFilename}`;
      return res.json({ success: true, url: publicUrl, filename: uniqueFilename });
    } catch (err: any) {
      console.error('[NAS Assets] Error saving asset:', err);
      return res.status(500).json({ success: false, error: 'Failed to save asset to persistent volume' });
    }
  });

  // Universal Image Proxy to bypass CORS / Private Network restrictions for artwork color extraction
  app.get('/api/image-proxy', async (req, res) => {
    const rawUrl = (req.query.url as string) || '';
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
      const authHeader = (req.headers['authorization'] as string) || '';
      const headers: Record<string, string> = {
        'User-Agent': 'HomeAssistantDashboard/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(rawUrl, {
        headers,
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote image fetch failed with status ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.send(buffer);
    } catch (err: any) {
      return res.status(502).json({ error: 'Failed to proxy image: ' + (err?.message || 'Network error') });
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
