/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Home Assistant Official OAuth2 Authentication Service
 * Compatible with Home Assistant auth/authorize and auth/token flows (as used by home-assistant-js-websocket)
 */

import { AuthTokens } from '../types/auth';
import {
  getStoredAuthConfig,
  saveStoredAuthConfig,
  updateStoredTokens,
  clearStoredAuthConfig,
  setPendingOAuthState,
  getPendingOAuthState,
  clearPendingOAuthState,
  StoredAuthConfig
} from './authStorage';

export type HAAuthTokens = AuthTokens;

export interface TokenRefreshResult {
  success: boolean;
  tokens?: HAAuthTokens;
  isFatal: boolean; // true if refresh token was revoked / 400 invalid_grant; false if transient network/server blip
  error?: string;
}

/**
 * Standardize Home Assistant Base URL (ensure no trailing slashes or /api/websocket)
 */
export function normalizeHAUrl(rawUrl: string): { httpUrl: string; wsUrl: string } {
  let cleaned = (rawUrl || '').trim();
  if (!cleaned) {
    cleaned = 'http://homeassistant.local:8123';
  }

  // If user entered ws:// or wss://, convert to http/https for REST calls
  if (cleaned.startsWith('ws://')) {
    cleaned = 'http://' + cleaned.slice(5);
  } else if (cleaned.startsWith('wss://')) {
    cleaned = 'https://' + cleaned.slice(6);
  }

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }

  // Remove trailing slashes and /api/websocket
  cleaned = cleaned.replace(/\/api\/websocket\/?$/, '').replace(/\/+$/, '');

  const httpUrl = cleaned;
  const wsUrl = (httpUrl.startsWith('https://') 
    ? httpUrl.replace('https://', 'wss://') 
    : httpUrl.replace('http://', 'ws://')) + '/api/websocket';

  return { httpUrl, wsUrl };
}

/**
 * Canonical Client ID and Redirect URI for OAuth.
 * Uses origin with trailing slash (e.g. http://localhost:3000/ or https://dashboard.example.com/)
 * as required by Home Assistant IndieAuth / OAuth specification (MUST contain path component).
 */
export function getCanonicalClientId(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin.replace(/\/+$/, '');
  return `${origin}/`;
}

export function getHARedirectUri(): string {
  return getCanonicalClientId();
}

let inFlightOAuthPromise: Promise<{ success: boolean; tokens?: HAAuthTokens; error?: string }> | null = null;
let inFlightRefreshPromise: Promise<TokenRefreshResult> | null = null;

/**
 * Initiate Home Assistant OAuth authorization redirect (Sign in with HA credentials)
 */
export function startHAOAuthFlow(serverUrl: string): void {
  const { httpUrl, wsUrl } = normalizeHAUrl(serverUrl);
  const clientId = getCanonicalClientId();
  const redirectUri = getHARedirectUri();
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  setPendingOAuthState({
    serverUrl: wsUrl,
    state,
    clientId,
    createdAt: Date.now()
  });

  const authUrl = `${httpUrl}/auth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code`;

  window.location.href = authUrl;
}

/**
 * Handle incoming OAuth redirect with authorization code
 */
export async function handleHAOAuthCallback(): Promise<{ success: boolean; tokens?: HAAuthTokens; error?: string }> {
  if (typeof window === 'undefined') return { success: false };

  // Return existing in-flight promise if already processing to avoid race conditions
  if (inFlightOAuthPromise) {
    return inFlightOAuthPromise;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    const existingConfig = getStoredAuthConfig();
    if (existingConfig?.tokens) {
      return { success: true, tokens: existingConfig.tokens };
    }
    return { success: false };
  }

  inFlightOAuthPromise = (async () => {
    try {
      const pending = getPendingOAuthState();
      const savedUrl = pending?.serverUrl || 'http://homeassistant.local:8123';
      const savedClientId = pending?.clientId || getCanonicalClientId();

      // Validate state if saved
      if (pending?.state && state && state !== pending.state) {
        console.warn('[HA Auth] OAuth state mismatch:', { state, savedState: pending.state });
      }

      clearPendingOAuthState();

      const { httpUrl, wsUrl } = normalizeHAUrl(savedUrl);
      const clientId = savedClientId;

      const bodyParams = new URLSearchParams();
      bodyParams.append('grant_type', 'authorization_code');
      bodyParams.append('code', code);
      bodyParams.append('client_id', clientId);
      bodyParams.append('redirect_uri', clientId);

      const tokenEndpoint = `${httpUrl}/auth/token`;
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Home Assistant Auth error (${response.status}): ${errorText}` };
      }

      const data = await response.json();
      const expiresInSec = data.expires_in || 1800;
      const expiresAt = Date.now() + expiresInSec * 1000;

      const tokens: HAAuthTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: expiresInSec,
        token_type: data.token_type || 'Bearer',
        expires_at: expiresAt,
        server_url: wsUrl,
        auth_type: 'oauth',
        client_id: clientId
      };

      const config: StoredAuthConfig = {
        version: 1,
        authMethod: 'oauth',
        serverUrl: wsUrl,
        httpUrl,
        tokens,
        lastUpdated: Date.now()
      };

      saveStoredAuthConfig(config);

      // Clean URL parameters only after token is successfully saved
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return { success: true, tokens };
    } catch (err: any) {
      return { success: false, error: `Failed to exchange token: ${err?.message || err}` };
    } finally {
      inFlightOAuthPromise = null;
    }
  })();

  return inFlightOAuthPromise;
}

/**
 * Refresh an existing OAuth access token using refresh_token with detailed status
 */
export async function refreshHAOAuthTokenWithStatus(tokens?: HAAuthTokens): Promise<TokenRefreshResult> {
  const activeConfig = getStoredAuthConfig();
  const current = tokens || activeConfig?.tokens;

  if (!current || !current.refresh_token || current.auth_type !== 'oauth') {
    return { success: false, isFatal: false, error: 'No OAuth refresh token available' };
  }

  // Reuse in-flight refresh promise to prevent duplicate simultaneous token exchange requests
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
    // Check if browser is currently offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[HA Auth] Skipping token refresh: browser is offline');
      return { success: false, isFatal: false, error: 'Browser is offline' };
    }

    const { httpUrl, wsUrl } = normalizeHAUrl(current.server_url);
    const clientId = current.client_id || getCanonicalClientId();

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('grant_type', 'refresh_token');
      bodyParams.append('refresh_token', current.refresh_token);
      bodyParams.append('client_id', clientId);

      const tokenEndpoint = `${httpUrl}/auth/token`;
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[HA Auth] Token refresh endpoint returned HTTP ${response.status}: ${errorText}`);

        // HTTP 400 / 401 specifically indicates invalid_grant (revoked or expired refresh token)
        const isFatal = response.status === 400 || response.status === 401;
        return {
          success: false,
          isFatal,
          error: `HTTP ${response.status}: ${errorText || 'Token refresh rejected'}`
        };
      }

      const data = await response.json();
      const expiresInSec = data.expires_in || 1800;
      const updated: HAAuthTokens = {
        ...current,
        access_token: data.access_token,
        refresh_token: data.refresh_token || current.refresh_token,
        expires_in: expiresInSec,
        expires_at: Date.now() + expiresInSec * 1000,
        server_url: wsUrl,
        client_id: clientId
      };

      updateStoredTokens(updated);

      // Dispatch event to inform any active WebSocket clients or UI elements of fresh token
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ha_token_refreshed', { detail: { tokens: updated } }));
      }

      return { success: true, tokens: updated, isFatal: false };
    } catch (e: any) {
      console.warn('[HA Auth] Transient error during token refresh:', e?.message || e);
      // Network failures, aborts, DNS errors are transient and non-fatal
      return { success: false, isFatal: false, error: e?.message || 'Network error' };
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

/**
 * Backward-compatible refresh helper returning updated tokens or null
 */
export async function refreshHAOAuthToken(tokens?: HAAuthTokens): Promise<HAAuthTokens | null> {
  const result = await refreshHAOAuthTokenWithStatus(tokens);
  return result.success && result.tokens ? result.tokens : null;
}

/**
 * Retrieve saved Home Assistant Auth credentials from persistent storage
 */
export function getStoredHAAuth(): HAAuthTokens | null {
  const config = getStoredAuthConfig();
  return config?.tokens || null;
}

/**
 * Save Home Assistant Auth credentials to persistent storage
 */
export function saveStoredHAAuth(tokens: HAAuthTokens): void {
  const { httpUrl, wsUrl } = normalizeHAUrl(tokens.server_url);
  const config: StoredAuthConfig = {
    version: 1,
    authMethod: tokens.auth_type || 'oauth',
    serverUrl: wsUrl,
    httpUrl,
    tokens,
    lastUpdated: Date.now()
  };
  saveStoredAuthConfig(config);
}

/**
 * Remove stored credentials (Sign out)
 */
export function clearStoredHAAuth(): void {
  clearStoredAuthConfig();
}

/**
 * Single source of truth to retrieve the currently valid HA access token
 */
export function getActiveHAToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = getStoredHAAuth();
  if (stored?.access_token) {
    return stored.access_token;
  }
  const legacyToken = localStorage.getItem('ha_token');
  if (legacyToken && legacyToken.trim()) {
    return legacyToken.trim();
  }
  return null;
}
