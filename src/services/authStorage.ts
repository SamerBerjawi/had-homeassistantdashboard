/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hardened Persistent Authentication Storage Engine (Schema v1)
 * Provides centralized storage, schema migration, token validation, and persistence for HOMZ.
 */

import { AuthTokens, AuthMethod } from '../types/auth';
import { normalizeHAUrl } from './haAuth';

export const AUTH_STORAGE_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  CONFIG_V1: 'had_auth_config_v1',
  PENDING_OAUTH: 'had_pending_oauth_flow',
  LEGACY_AUTH_TOKENS: 'had_ha_auth_tokens',
  LEGACY_HA_TOKEN: 'ha_token',
  LEGACY_HA_SERVER_URL: 'ha_server_url',
  LEGACY_LIVE_MODE: 'ha_live_mode',
  LEGACY_DEMO_MODE: 'had_auth_demo',
  LAST_HA_URL: 'had_last_ha_url'
} as const;

export interface StoredAuthConfig {
  version: number;
  authMethod: AuthMethod;
  serverUrl: string; // WebSocket URL (ws://... or wss://...)
  httpUrl: string;   // HTTP URL (http://... or https://...)
  tokens?: AuthTokens;
  lastUpdated: number;
}

export interface PendingOAuthState {
  serverUrl: string;
  state: string;
  clientId: string;
  createdAt: number;
}

/**
 * Safely parse JSON from localStorage/sessionStorage
 */
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or close to expiration (default safety buffer: 300 seconds / 5 minutes)
 */
export function isTokenExpired(tokens?: AuthTokens | null, bufferSeconds = 300): boolean {
  if (!tokens) return true;
  // LLAT tokens do not expire
  if (tokens.auth_type === 'llat') return false;

  // If no expires_at timestamp exists, calculate from expires_in or assume expired
  const now = Date.now();
  const expiresAt = tokens.expires_at || 0;
  if (!expiresAt) {
    return true;
  }

  return expiresAt - now <= bufferSeconds * 1000;
}

/**
 * Migrate legacy credentials into the modern StoredAuthConfig schema (v1)
 */
function migrateLegacyStorage(): StoredAuthConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check legacy had_ha_auth_tokens
    const legacyAuthRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_AUTH_TOKENS);
    const legacyAuth = safeJsonParse<any>(legacyAuthRaw);
    if (legacyAuth && legacyAuth.access_token) {
      const serverUrl = legacyAuth.server_url || localStorage.getItem(STORAGE_KEYS.LAST_HA_URL) || 'http://homeassistant.local:8123';
      const { httpUrl, wsUrl } = normalizeHAUrl(serverUrl);
      const isLlat = legacyAuth.auth_type === 'llat' || !legacyAuth.refresh_token;

      const tokens: AuthTokens = {
        access_token: legacyAuth.access_token,
        refresh_token: legacyAuth.refresh_token,
        expires_in: legacyAuth.expires_in || 1800,
        token_type: legacyAuth.token_type || 'Bearer',
        expires_at: legacyAuth.expires_at || (Date.now() + (legacyAuth.expires_in || 1800) * 1000),
        server_url: wsUrl,
        auth_type: isLlat ? 'llat' : 'oauth',
        client_id: legacyAuth.client_id
      };

      const config: StoredAuthConfig = {
        version: AUTH_STORAGE_SCHEMA_VERSION,
        authMethod: isLlat ? 'llat' : 'oauth',
        serverUrl: wsUrl,
        httpUrl,
        tokens,
        lastUpdated: Date.now()
      };

      saveStoredAuthConfig(config);
      return config;
    }

    // 2. Check legacy LLAT standalone keys (ha_token + ha_server_url)
    const legacyToken = localStorage.getItem(STORAGE_KEYS.LEGACY_HA_TOKEN);
    const legacyServerUrl = localStorage.getItem(STORAGE_KEYS.LEGACY_HA_SERVER_URL);
    if (legacyToken && legacyToken.trim()) {
      const { httpUrl, wsUrl } = normalizeHAUrl(legacyServerUrl || 'http://homeassistant.local:8123');
      const tokens: AuthTokens = {
        access_token: legacyToken.trim(),
        server_url: wsUrl,
        auth_type: 'llat'
      };

      const config: StoredAuthConfig = {
        version: AUTH_STORAGE_SCHEMA_VERSION,
        authMethod: 'llat',
        serverUrl: wsUrl,
        httpUrl,
        tokens,
        lastUpdated: Date.now()
      };

      saveStoredAuthConfig(config);
      return config;
    }

    // 3. Check legacy Demo Mode
    const isDemoSaved = localStorage.getItem(STORAGE_KEYS.LEGACY_DEMO_MODE) === 'true';
    if (isDemoSaved) {
      const config: StoredAuthConfig = {
        version: AUTH_STORAGE_SCHEMA_VERSION,
        authMethod: 'demo',
        serverUrl: '',
        httpUrl: '',
        lastUpdated: Date.now()
      };
      saveStoredAuthConfig(config);
      return config;
    }
  } catch (err) {
    console.error('[AuthStorage] Legacy migration failed:', err);
  }

  return null;
}

/**
 * Retrieve the active persisted authentication config
 */
export function getStoredAuthConfig(): StoredAuthConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG_V1);
    if (raw) {
      const config = safeJsonParse<StoredAuthConfig>(raw);
      if (config && config.version === AUTH_STORAGE_SCHEMA_VERSION && config.authMethod) {
        return config;
      }
    }

    // Attempt migration from legacy storage keys
    return migrateLegacyStorage();
  } catch (err) {
    console.error('[AuthStorage] Failed to read stored auth config:', err);
    return null;
  }
}

/**
 * Persist the active authentication config to localStorage
 */
export function saveStoredAuthConfig(config: StoredAuthConfig): void {
  if (typeof window === 'undefined') return;

  try {
    const payload = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEYS.CONFIG_V1, payload);

    // Keep legacy fallback keys in sync for backward compatibility
    if (config.authMethod === 'oauth' && config.tokens) {
      localStorage.setItem(STORAGE_KEYS.LEGACY_AUTH_TOKENS, JSON.stringify(config.tokens));
      localStorage.setItem(STORAGE_KEYS.LEGACY_LIVE_MODE, 'true');
      localStorage.setItem(STORAGE_KEYS.LAST_HA_URL, config.serverUrl);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_DEMO_MODE);
    } else if (config.authMethod === 'llat' && config.tokens) {
      localStorage.setItem(STORAGE_KEYS.LEGACY_AUTH_TOKENS, JSON.stringify(config.tokens));
      localStorage.setItem(STORAGE_KEYS.LEGACY_HA_TOKEN, config.tokens.access_token);
      localStorage.setItem(STORAGE_KEYS.LEGACY_HA_SERVER_URL, config.httpUrl);
      localStorage.setItem(STORAGE_KEYS.LEGACY_LIVE_MODE, 'true');
      localStorage.setItem(STORAGE_KEYS.LAST_HA_URL, config.serverUrl);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_DEMO_MODE);
    } else if (config.authMethod === 'demo') {
      localStorage.setItem(STORAGE_KEYS.LEGACY_DEMO_MODE, 'true');
      localStorage.setItem(STORAGE_KEYS.LEGACY_LIVE_MODE, 'false');
      localStorage.removeItem(STORAGE_KEYS.LEGACY_AUTH_TOKENS);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_HA_TOKEN);
    }
  } catch (err) {
    console.error('[AuthStorage] Failed to save auth config:', err);
  }
}

/**
 * Atomically update tokens (e.g. after a silent OAuth refresh) without mutating other settings
 */
export function updateStoredTokens(updatedTokens: Partial<AuthTokens> & { access_token: string }): StoredAuthConfig | null {
  const current = getStoredAuthConfig();
  if (!current || !current.tokens) return null;

  const mergedTokens: AuthTokens = {
    ...current.tokens,
    ...updatedTokens,
    expires_at: updatedTokens.expires_at || (
      updatedTokens.expires_in
        ? Date.now() + updatedTokens.expires_in * 1000
        : current.tokens.expires_at
    )
  };

  const updatedConfig: StoredAuthConfig = {
    ...current,
    tokens: mergedTokens,
    lastUpdated: Date.now()
  };

  saveStoredAuthConfig(updatedConfig);
  return updatedConfig;
}

/**
 * Remove all stored authentication credentials and reset to logged-out state
 */
export function clearStoredAuthConfig(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.CONFIG_V1);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_AUTH_TOKENS);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_HA_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_HA_SERVER_URL);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_LIVE_MODE);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_DEMO_MODE);
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_OAUTH);
  } catch (err) {
    console.error('[AuthStorage] Failed to clear auth config:', err);
  }
}

/**
 * Pending OAuth Flow Session Tracking (survives OAuth redirects)
 */
export function setPendingOAuthState(pending: PendingOAuthState): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(pending);
    sessionStorage.setItem(STORAGE_KEYS.PENDING_OAUTH, raw);
    localStorage.setItem(STORAGE_KEYS.PENDING_OAUTH, raw);
    localStorage.setItem(STORAGE_KEYS.LAST_HA_URL, pending.serverUrl);
  } catch {}
}

export function getPendingOAuthState(): PendingOAuthState | null {
  if (typeof window === 'undefined') return null;
  try {
    const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.PENDING_OAUTH);
    if (sessionRaw) {
      return safeJsonParse<PendingOAuthState>(sessionRaw);
    }
    const localRaw = localStorage.getItem(STORAGE_KEYS.PENDING_OAUTH);
    if (localRaw) {
      return safeJsonParse<PendingOAuthState>(localRaw);
    }
  } catch {}
  return null;
}

export function clearPendingOAuthState(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_OAUTH);
    localStorage.removeItem(STORAGE_KEYS.PENDING_OAUTH);
  } catch {}
}
