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
}

const STORAGE_KEY_AUTH = 'had_ha_auth_tokens';
const STORAGE_KEY_PENDING_URL = 'had_pending_ha_url';
const STORAGE_KEY_PENDING_STATE = 'had_pending_ha_state';

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
 * Get current Redirect URI for OAuth
 */
export function getHARedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
}

/**
 * Initiate Home Assistant OAuth authorization redirect (Sign in with HA credentials)
 */
export function startHAOAuthFlow(serverUrl: string): void {
  const { httpUrl } = normalizeHAUrl(serverUrl);
  const redirectUri = getHARedirectUri();
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  sessionStorage.setItem(STORAGE_KEY_PENDING_URL, httpUrl);
  sessionStorage.setItem(STORAGE_KEY_PENDING_STATE, state);

  const authUrl = `${httpUrl}/auth/authorize?client_id=${encodeURIComponent(redirectUri)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code`;

  window.location.href = authUrl;
}

/**
 * Handle incoming OAuth redirect with authorization code
 */
export async function handleHAOAuthCallback(): Promise<{ success: boolean; tokens?: HAAuthTokens; error?: string }> {
  if (typeof window === 'undefined') return { success: false };

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return { success: false };
  }

  const savedUrl = sessionStorage.getItem(STORAGE_KEY_PENDING_URL) || localStorage.getItem('had_last_ha_url') || 'http://homeassistant.local:8123';
  const savedState = sessionStorage.getItem(STORAGE_KEY_PENDING_STATE);

  // Clean URL parameters immediately
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);

  // Validate state if saved
  if (savedState && state && state !== savedState) {
    console.warn('[HA Auth] OAuth state mismatch:', { state, savedState });
  }

  sessionStorage.removeItem(STORAGE_KEY_PENDING_URL);
  sessionStorage.removeItem(STORAGE_KEY_PENDING_STATE);

  const { httpUrl, wsUrl } = normalizeHAUrl(savedUrl);
  const redirectUri = getHARedirectUri();

  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('grant_type', 'authorization_code');
    bodyParams.append('code', code);
    bodyParams.append('client_id', redirectUri);

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
      auth_type: 'oauth'
    };

    saveStoredHAAuth(tokens);
    return { success: true, tokens };
  } catch (err: any) {
    return { success: false, error: `Failed to exchange token: ${err.message}` };
  }
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
  const redirectUri = getHARedirectUri();

  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('grant_type', 'refresh_token');
    bodyParams.append('refresh_token', current.refresh_token);
    bodyParams.append('client_id', redirectUri);

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
      expires_in: expiresInSec,
      expires_at: Date.now() + expiresInSec * 1000
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
