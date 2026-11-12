/**
 * Home Assistant token authentication and admin gate (requireHAAuth / requireHAAdmin).
 * Security-sensitive: see scripts/test-auth-trust.ts and scripts/test-token-security.ts.
 * State (token caches, pinned HA instance, rate-limit counters) lives inside the factory so each
 * server instance owns its own.
 */
import type express from 'express';
import path from 'path';
import fs from 'fs';
import { fetch as undiciFetch } from 'undici';
import type { Agent as UndiciAgent } from 'undici';
import { isOverFailureLimit, recordFailure } from '../lib/security';
import type { FailureEntry } from '../lib/security';
import { errorCode as errorCodeOf, errorMessage } from '../lib/errors';

/** Shape probed on a caught fetch error when logging its cause. */
type ErrorWithCause = { cause?: { message?: unknown } };

/** Messages of the HA WebSocket auth / auth/current_user exchange (parsed JSON, so fields are unknown). */
interface HaWsAdminMessage {
  type?: unknown;
  id?: unknown;
  success?: unknown;
  result?: { is_admin?: unknown } | null;
}

export interface HaAuthOptions {
  /** Directory holding ha-instance.json (the pinned HA instance). */
  configDir: string;
  /** Undici dispatcher used for calls to Home Assistant. */
  haDispatcher: UndiciAgent;
}

export function createHaAuth({ configDir, haDispatcher }: HaAuthOptions) {
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
  // In production, first-run pinning is ignored: HASS_URL must be set (an existing pin keeps working).
  const tofuRequested = process.env.ALLOW_TOFU_PIN === 'true';
  const allowTofuPin = tofuRequested && process.env.NODE_ENV !== 'production';
  if (tofuRequested && !allowTofuPin) {
    console.warn('[Auth] ALLOW_TOFU_PIN=true is ignored when NODE_ENV=production. Set HASS_URL to the Home Assistant instance that validates tokens.');
  }
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
    } catch (err: unknown) {
      console.warn(`[Auth] Could not persist pinned Home Assistant instance (kept in memory only): ${errorMessage(err)}`);
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
    } catch (error: unknown) {
      const now = Date.now();
      const errorCode = errorCodeOf(error) ?? 'UNKNOWN';

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
        if ((error as ErrorWithCause | null)?.cause) {
          console.error('[Auth Middleware] Error Cause:', (error as ErrorWithCause | null)?.cause?.message || (error as ErrorWithCause | null)?.cause);
        }
      }
      return false;
    }
  }

  // SEC-015: throttle clients that keep presenting invalid tokens (each unknown token costs an
  // outbound request to Home Assistant)
  const AUTH_FAIL_WINDOW_MS = 60_000;
  const AUTH_FAIL_LIMIT = 30;
  const AUTH_FAIL_MAX_ENTRIES = 1000;
  const authFailures = new Map<string, FailureEntry>();
  function authFailureKey(req: express.Request): string {
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
  function isAuthRateLimited(req: express.Request): boolean {
    return isOverFailureLimit(authFailures, authFailureKey(req), Date.now(), AUTH_FAIL_LIMIT);
  }
  function recordAuthFailure(req: express.Request) {
    recordFailure(authFailures, authFailureKey(req), Date.now(), AUTH_FAIL_WINDOW_MS, AUTH_FAIL_MAX_ENTRIES);
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
        let msg: HaWsAdminMessage;
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

  return {
    envHaUrl,
    getTrustedHaBase,
    resolveTargetHaBase,
    requireHAAuth,
    requireHAAdmin,
    isHaAdmin
  };
}

export type HaAuth = ReturnType<typeof createHaAuth>;
