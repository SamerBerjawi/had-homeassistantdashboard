/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Home Assistant Official OAuth2 Authentication Service
 * Compatible with Home Assistant auth/authorize and auth/token flows (as used by HAPulse / home-assistant-js-websocket)
 */

export interface HAAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  expires_at?: number;
  server_url: string;
  auth_type: 'oauth' | 'llat';
  client_id?: string;
}

const STORAGE_KEY_AUTH = 'had_ha_auth_tokens';
const STORAGE_KEY_PENDING_URL = 'had_pending_ha_url';
const STORAGE_KEY_PENDING_STATE = 'had_pending_ha_state';
const STORAGE_KEY_PENDING_CLIENT_ID = 'had_pending_ha_client_id';

/**
 * Standardize Home Assistant Base URL (ensure no trailing slashes or /api/websocket)
 */
export function normalizeHAUrl(rawUrl: string): { httpUrl: string; wsUrl: string } {
  let cleaned = rawUrl.trim();
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

/**
 * Get current Redirect URI for OAuth
 */
let inFlightOAuthPromise: Promise<{ success: boolean; tokens?: HAAuthTokens; error?: string }> | null = null;

export function getHARedirectUri(): string {
  return getCanonicalClientId();
}

/**
 * Initiate Home Assistant OAuth authorization redirect (Sign in with HA credentials)
 */
export function startHAOAuthFlow(serverUrl: string): void {
  const { httpUrl } = normalizeHAUrl(serverUrl);
  const clientId = getCanonicalClientId();
  const redirectUri = getHARedirectUri();
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  sessionStorage.setItem(STORAGE_KEY_PENDING_URL, httpUrl);
  sessionStorage.setItem(STORAGE_KEY_PENDING_STATE, state);
  sessionStorage.setItem(STORAGE_KEY_PENDING_CLIENT_ID, clientId);

  try {
    localStorage.setItem(STORAGE_KEY_PENDING_URL, httpUrl);
    localStorage.setItem(STORAGE_KEY_PENDING_STATE, state);
    localStorage.setItem(STORAGE_KEY_PENDING_CLIENT_ID, clientId);
    localStorage.setItem('had_last_ha_url', httpUrl);
  } catch {}

  const authUrl = `${httpUrl}/auth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code`;

  window.location.href = authUrl;
}

/**
 * Handle incoming OAuth redirect with authorization code
 */
export async function handleHAOAuthCallback(): Promise<{ success: boolean; tokens?: HAAuthTokens; error?: string }> {
  if (typeof window === 'undefined') return { success: false };

  // Return existing in-flight promise if already processing
  if (inFlightOAuthPromise) {
    return inFlightOAuthPromise;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    const existing = getStoredHAAuth();
    if (existing) {
      return { success: true, tokens: existing };
    }
    return { success: false };
  }

  inFlightOAuthPromise = (async () => {
    try {
      const savedUrl =
        sessionStorage.getItem(STORAGE_KEY_PENDING_URL) ||
        localStorage.getItem(STORAGE_KEY_PENDING_URL) ||
        localStorage.getItem('had_last_ha_url') ||
        'http://homeassistant.local:8123';
      const savedState =
        sessionStorage.getItem(STORAGE_KEY_PENDING_STATE) ||
        localStorage.getItem(STORAGE_KEY_PENDING_STATE);
      const savedClientId =
        sessionStorage.getItem(STORAGE_KEY_PENDING_CLIENT_ID) ||
        localStorage.getItem(STORAGE_KEY_PENDING_CLIENT_ID) ||
        getCanonicalClientId();

      // Validate state if saved
      if (savedState && state && state !== savedState) {
        console.warn('[HA Auth] OAuth state mismatch:', { state, savedState });
      }

      sessionStorage.removeItem(STORAGE_KEY_PENDING_URL);
      sessionStorage.removeItem(STORAGE_KEY_PENDING_STATE);
      sessionStorage.removeItem(STORAGE_KEY_PENDING_CLIENT_ID);
      try {
        localStorage.removeItem(STORAGE_KEY_PENDING_URL);
        localStorage.removeItem(STORAGE_KEY_PENDING_STATE);
        localStorage.removeItem(STORAGE_KEY_PENDING_CLIENT_ID);
      } catch {}

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

      saveStoredHAAuth(tokens);

      // Clean URL parameters only after token is successfully saved
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}

      return { success: true, tokens };
    } catch (err: any) {
      return { success: false, error: `Failed to exchange token: ${err.message}` };
    } finally {
      inFlightOAuthPromise = null;
    }
  })();

  return inFlightOAuthPromise;
}

/**
 * Refresh an existing OAuth access token using refresh_token
 */
export async function refreshHAOAuthToken(tokens?: HAAuthTokens): Promise<HAAuthTokens | null> {
  const current = tokens || getStoredHAAuth();
  if (!current || !current.refresh_token || current.auth_type !== 'oauth') {
    return null;
  }

  const { httpUrl } = normalizeHAUrl(current.server_url);
  // Ensure the exact client_id used at login is resent during refresh
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
      body: bodyParams.toString()
    });

    if (!response.ok) {
      console.error('[HA Auth] Token refresh failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    const expiresInSec = data.expires_in || 1800;
    const updated: HAAuthTokens = {
      ...current,
      access_token: data.access_token,
      refresh_token: data.refresh_token || current.refresh_token,
      expires_in: expiresInSec,
      expires_at: Date.now() + expiresInSec * 1000,
      client_id: clientId
    };

    saveStoredHAAuth(updated);
    return updated;
  } catch (e) {
    console.error('[HA Auth] Error refreshing token:', e);
    return null;
  }
}

/**
 * Retrieve saved Home Assistant Auth credentials from localStorage
 */
export function getStoredHAAuth(): HAAuthTokens | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_AUTH);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save Home Assistant Auth credentials to localStorage
 */
export function saveStoredHAAuth(tokens: HAAuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(tokens));
  localStorage.setItem('had_last_ha_url', tokens.server_url);
}

/**
 * Remove stored credentials (Sign out)
 */
export function clearStoredHAAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_AUTH);
}

/**
 * Single source of truth to retrieve the currently valid HA access token
 * regardless of OAuth2 or LLAT session.
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
  try {
    const { haWebSocketService } = require('./haWebSocket');
    const wsToken = haWebSocketService?.getCurrentToken?.();
    if (wsToken) return wsToken;
  } catch {}
  return null;
}

