/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'node:dns';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
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

let aiClient: GoogleGenAI | null = null;
let quotaBackoffUntil = 0;

// Bounded in-memory weather cache: key -> { data: any, expiresAt: number }
const MAX_CACHE_ENTRIES = 100;
const weatherCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiting map: ip -> { count: number, resetAt: number }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function setWeatherCache(key: string, data: any) {
  if (weatherCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = weatherCache.keys().next().value;
    if (oldestKey) weatherCache.delete(oldestKey);
  }
  weatherCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Periodic cleanup of expired cache entries and rate limits every 15m
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of weatherCache.entries()) {
    if (v.expiresAt < now) weatherCache.delete(k);
  }
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, CACHE_TTL_MS);

function getAiClient(): GoogleGenAI | null {

  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}



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

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
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

  // -------------------------------------------------------------
  // Home Assistant Token Authentication & Security Gatekeeper
  // -------------------------------------------------------------
  const tokenValidationCache = new Map<string, { valid: boolean; expiresAt: number }>();

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
          'Content-Type': 'application/json'
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
      console.error('[Auth Middleware] Could not reach Home Assistant for token validation: fetch failed');
      console.error('[Auth Middleware] Target URL:', targetUrl);
      console.error('[Auth Middleware] Error Cause:', (error as any)?.cause);
      console.error('[Auth Middleware] Full Error:', error);
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
      // Check primary file dashboard-config.json
      if (fs.existsSync(configFilePath)) {
        const raw = await fs.promises.readFile(configFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.serverVersion !== undefined) {
          return res.json({
            success: true,
            config: parsed.config,
            serverVersion: Number(parsed.serverVersion)
          });
        }
        return res.json({
          success: true,
          config: parsed,
          serverVersion: parsed?.version || 1
        });
      }

      // Legacy fallback check for ./data/config.json if migrating
      const legacyPath = path.join(path.dirname(configDir), 'config.json');
      if (fs.existsSync(legacyPath)) {
        const raw = await fs.promises.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.json({
          success: true,
          config: parsed,
          serverVersion: 1
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

    // Extract target config object and client's last-known version
    const targetConfig = (body.config && typeof body.config === 'object') ? { ...body.config } : { ...body };
    delete (targetConfig as any).expectedVersion;
    delete (targetConfig as any).serverVersion;

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
        let currentServerVersion = 0;
        let currentConfig: any = null;

        if (fs.existsSync(configFilePath)) {
          try {
            const raw = await fs.promises.readFile(configFilePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (parsed.serverVersion !== undefined) {
                currentServerVersion = Number(parsed.serverVersion) || 1;
                currentConfig = parsed.config;
              } else {
                currentServerVersion = 1;
                currentConfig = parsed;
              }
            }
          } catch (err) {
            console.warn('[NAS Config] Could not parse existing config for version comparison:', err);
          }
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

        if (!fs.existsSync(configDir)) {
          await fs.promises.mkdir(configDir, { recursive: true });
        }

        const tempFile = path.join(
          configDir,
          `.dashboard-config.json.tmp.${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        );
        const payloadString = JSON.stringify(diskPayload, null, 2);

        await fs.promises.writeFile(tempFile, payloadString, 'utf-8');
        await fs.promises.rename(tempFile, configFilePath);

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

  // Helper to build list of candidate URLs for go2rtc proxy probing
  const resolveGo2RtcCandidateUrls = (rawUrl?: string, haUrl?: string): string[] => {
    const candidates = new Set<string>();

    const addCandidate = (u?: string) => {
      if (!u) return;
      const clean = u.trim().replace(/\/+$/, '');
      if (clean) {
        candidates.add(clean);
        if (clean.includes(':1984')) {
          candidates.add(clean.replace(':1984', ':11984'));
        }
      }
    };

    // 1. Target URL explicitly requested by client
    addCandidate(rawUrl);

    // 2. Server URL from Home Assistant
    if (haUrl) {
      try {
        const u = new URL(haUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://'));
        if (u.hostname) {
          const proto = u.protocol === 'https:' ? 'https:' : 'http:';
          addCandidate(`${proto}//${u.hostname}:1984`);
          addCandidate(`http://${u.hostname}:1984`);
          addCandidate(`http://${u.hostname}:11984`);
        }
      } catch {
        // ignore
      }
    }

    // 3. Environment variable overrides (if container has them set)
    if (process.env.GO2RTC_URL) addCandidate(process.env.GO2RTC_URL);
    if (process.env.HOMZ_GO2RTC_URL) addCandidate(process.env.HOMZ_GO2RTC_URL);
    const envHaUrl = process.env.HASS_URL || process.env.HA_URL || process.env.HOME_ASSISTANT_URL || process.env.HOMEASSISTANT_URL;
    if (envHaUrl) {
      try {
        const u = new URL(envHaUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://').startsWith('http')
          ? envHaUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://')
          : `https://${envHaUrl}`);
        if (u.hostname) addCandidate(`http://${u.hostname}:1984`);
      } catch { /* ignore */ }
    }

    // 4. HA network hostnames and supervisor
    candidates.add('http://homeassistant.local:1984');
    candidates.add('http://homeassistant:1984');
    candidates.add('http://supervisor:1984');

    // 5. Localhost fallbacks
    candidates.add('http://localhost:1984');
    candidates.add('http://127.0.0.1:1984');
    candidates.add('http://localhost:11984');

    return Array.from(candidates);
  };

  // Proxy endpoint to query go2rtc streams bypassing any browser CORS / Private Network Access restrictions
  app.get('/api/go2rtc/streams', async (req, res) => {
    const rawUrl = (req.query.url as string) || '';
    const haUrl = (req.query.haUrl as string) || (req.headers['x-ha-server-url'] as string) || '';
    const candidates = resolveGo2RtcCandidateUrls(rawUrl, haUrl);

    for (const base of candidates) {
      try {
        const endpoint = base.endsWith('/api/streams') ? base : `${base.replace(/\/+$/, '')}/api/streams`;
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(2500)
        });

        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === 'object') {
            return res.json({ success: true, base_url: base.replace(/\/api\/streams$/, ''), streams: data });
          }
        }
      } catch {
        // continue to next candidate
      }
    }

    return res.status(502).json({ success: false, error: 'Could not connect to go2rtc API endpoint on probed ports.' });
  });

  // Proxy endpoint to negotiate go2rtc WebRTC SDP offer/answer
  app.post('/api/go2rtc/webrtc', express.text({ type: '*/*' }), async (req, res) => {
    const rawUrl = (req.query.url as string) || '';
    const haUrl = (req.query.haUrl as string) || (req.headers['x-ha-server-url'] as string) || '';
    const src = (req.query.src as string) || '';
    const sdpOffer = req.body;

    if (!src || !sdpOffer) {
      return res.status(400).json({ error: 'Missing src or SDP offer body' });
    }

    const candidates = resolveGo2RtcCandidateUrls(rawUrl, haUrl);

    for (const base of candidates) {
      try {
        const postEndpoint = `${base.replace(/\/+$/, '')}/api/webrtc?src=${encodeURIComponent(src)}`;
        const response = await fetch(postEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: sdpOffer,
          signal: AbortSignal.timeout(4000)
        });

        if (response.ok) {
          const answerSdp = await response.text();
          res.setHeader('Content-Type', 'text/plain');
          return res.send(answerSdp);
        }
      } catch {
        // continue to next candidate
      }
    }

    return res.status(502).json({ error: 'Failed to negotiate WebRTC with go2rtc' });
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

  // Proxy endpoint to dispatch go2rtc PTZ commands
  app.get('/api/go2rtc/ptz', async (req, res) => {
    const rawUrl = (req.query.url as string) || '';
    const src = (req.query.src as string) || '';
    const dir = (req.query.dir as string) || '';

    if (!rawUrl || !src || !dir) {
      return res.status(400).json({ error: 'Missing url, src, or dir parameter' });
    }

    try {
      const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
      let query = `src=${encodeURIComponent(src)}`;
      if (dir === 'left' || dir === 'right') query += `&pan=${dir}`;
      if (dir === 'up' || dir === 'down') query += `&tilt=${dir}`;
      if (dir === 'zoom_in') query += `&zoom=in`;
      if (dir === 'zoom_out') query += `&zoom=out`;

      const ptzEndpoint = `${cleanUrl}/api/ptz?${query}`;
      const response = await fetch(ptzEndpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        return res.json({ success: true });
      }
      return res.status(response.status).json({ error: `go2rtc PTZ returned ${response.status}` });
    } catch (err: any) {
      return res.status(502).json({ error: `Failed to dispatch go2rtc PTZ: ${err.message}` });
    }
  });

  // Rate limiter middleware for /api/weather
  const weatherRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || entry.resetAt < now) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Too many weather requests from this IP. Please wait before retrying.',
        retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000)
      });
    }

    entry.count++;
    next();
  };

  // Dynamic Weather API using Google Search Grounding with Gemini 3.7 Flash
  app.post('/api/weather', weatherRateLimiter, async (req, res) => {
    // 1. Sanitize & validate inputs
    let safeLocation = typeof req.body.location === 'string' ? req.body.location.trim().slice(0, 100) : '';
    safeLocation = safeLocation.replace(/[\r\n\t]/g, ' ').replace(/[<>{}[\]]/g, '');

    let safeLat: number | undefined = undefined;
    let safeLon: number | undefined = undefined;
    if (typeof req.body.lat === 'number' && !isNaN(req.body.lat) && req.body.lat >= -90 && req.body.lat <= 90) {
      safeLat = req.body.lat;
    }
    if (typeof req.body.lon === 'number' && !isNaN(req.body.lon) && req.body.lon >= -180 && req.body.lon <= 180) {
      safeLon = req.body.lon;
    }

    if (!safeLocation && (safeLat === undefined || safeLon === undefined)) {
      return res.status(400).json({ error: 'LOCATION_REQUIRED', isGrounded: false, message: 'Location or geographic coordinates must be provided' });
    }

    const targetLocation = safeLat !== undefined && safeLon !== undefined ? `${safeLat.toFixed(4)}, ${safeLon.toFixed(4)}` : safeLocation;
    const cacheKey = (safeLocation || 'coords').toLowerCase().trim() + (safeLat !== undefined && safeLon !== undefined ? `_${safeLat.toFixed(2)}_${safeLon.toFixed(2)}` : '');

    // 2. Check in-memory cache
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({
        ...cached.data,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    // 3. Check if currently in quota backoff period or AI client unavailable
    const isQuotaLimited = quotaBackoffUntil > Date.now();
    if (isQuotaLimited) {
      return res.status(429).json({ error: 'AI_QUOTA_EXHAUSTED', isGrounded: false, message: 'Gemini live grounding quota rate-limited' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: 'AI_NOT_CONFIGURED', isGrounded: false, message: 'Gemini API key is not configured' });
    }

    try {
      const prompt = `You are a real-time weather intelligence assistant.
Find the current, live, verified weather conditions for "${targetLocation}" right now using Google Search grounding.

Return ONLY a single valid JSON object strictly formatted as follows (no markdown backticks, or wrapped in a standard \`\`\`json block):
{
  "location": "City, State/Country",
  "country": "Country name",
  "temperatureC": 20,
  "temperatureF": 68,
  "condition": "Partly Cloudy",
  "conditionCode": "partly-cloudy", // MUST be one of: 'sunny', 'cloudy', 'partly-cloudy', 'rain', 'storm', 'snow', 'fog'
  "highC": 23,
  "lowC": 14,
  "highF": 73,
  "lowF": 57,
  "humidity": 60,
  "windSpeedKmh": 15,
  "windSpeedMph": 9,
  "uvIndex": 5,
  "aqi": 35,
  "aqiStatus": "Good", // e.g. "Good", "Moderate", "Unhealthy for Sensitive", "Unhealthy"
  "feelsLikeC": 20,
  "feelsLikeF": 68,
  "summary": "1 brief sentence summarizing current atmospheric conditions and smart home HVAC tip.",
  "forecast": [
    { "day": "Tomorrow", "condition": "Sunny", "tempC": 22, "tempF": 72, "highC": 24, "lowC": 15 },
    { "day": "Day after", "condition": "Partly Cloudy", "tempC": 21, "tempF": 70, "highC": 23, "lowC": 14 },
    { "day": "Day 3", "condition": "Sunny", "tempC": 23, "tempF": 73, "highC": 25, "lowC": 16 }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const rawText = response.text || '';
      let cleanedJson = rawText.trim();
      if (cleanedJson.includes('```json')) {
        cleanedJson = cleanedJson.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      } else if (cleanedJson.includes('```')) {
        cleanedJson = cleanedJson.replace(/```\s*/g, '').trim();
      }

      // Extract JSON substring if surrounded by extra text
      const startIdx = cleanedJson.indexOf('{');
      const endIdx = cleanedJson.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        cleanedJson = cleanedJson.substring(startIdx, endIdx + 1);
      }

      let parsedData: any = {};
      try {
        parsedData = JSON.parse(cleanedJson);
      } catch (parseErr) {
        console.warn('Failed to parse weather JSON from model response');
        return res.status(502).json({ error: 'AI_PARSE_ERROR', isGrounded: false, message: 'Failed to parse weather JSON from model response' });
      }

      // Extract grounding sources from response candidates
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundingSources: Array<{ title: string; url: string }> = [];

      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || 'Google Search Grounding Source',
            url: chunk.web.uri
          });
        }
      }

      parsedData.groundingSources = groundingSources.length > 0 ? groundingSources.slice(0, 5) : [
        { title: `Google Search Weather: ${parsedData.location || safeLocation}`, url: `https://www.google.com/search?q=weather+${encodeURIComponent(parsedData.location || safeLocation)}` }
      ];
      parsedData.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      parsedData.isGrounded = true;

      // Cache successful response
      setWeatherCache(cacheKey, parsedData);

      res.json(parsedData);
    } catch (err: any) {
      const errStr = String(err?.message || err);
      const is429 = err?.status === 429 || err?.code === 429 || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota');
      
      if (is429) {
        quotaBackoffUntil = Date.now() + 5 * 60 * 1000; // 5 minutes backoff
        console.warn('[Weather API] Gemini live grounding quota rate-limited.');
        return res.status(429).json({ error: 'AI_QUOTA_EXHAUSTED', isGrounded: false, message: 'Gemini live grounding quota rate-limited' });
      } else {
        console.warn('[Weather API] Grounding query notice:', errStr);
        return res.status(503).json({ error: 'AI_UNAVAILABLE', isGrounded: false, message: errStr });
      }
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
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
    console.log('\n  \x1b[36m\x1b[1mHOMZ Smart Home Assistant Dashboard\x1b[0m');
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m \x1b[36mhttp://0.0.0.0:${PORT}/\x1b[0m (accessible by wall tablets on LAN)\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Homz server:', err);
});
