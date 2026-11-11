/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStoredAuthConfig, clearStoredAuthConfig, getLegacyHaToken } from '../../services/authStorage';

// Browser Caching Helpers for WebSocket Endpoint & Access Token
export const getCachedServerUrl = (): string => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.serverUrl) return config.serverUrl;
    const saved = localStorage.getItem('ha_server_url');
    if (saved && saved.trim()) return saved;
  }
  return 'ws://homeassistant.local:8123/api/websocket';
};

export const getCachedHaToken = (): string => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.tokens?.access_token) return config.tokens.access_token;
    const saved = getLegacyHaToken();
    if (saved) return saved;
  }
  return '';
};

export const getCachedLiveMode = (): boolean => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.authMethod === 'oauth' || config?.authMethod === 'llat') return true;
    if (config?.authMethod === 'demo') return false;
    const live = localStorage.getItem('ha_live_mode');
    if (live === 'true') return true;
  }
  return false;
};

// Check if user has credentials configured
export const hasConfiguredHACredentials = (): boolean => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.tokens?.access_token) return true;
    if (getLegacyHaToken()) return true;
  }
  return false;
};

export function hasConfiguredHACredentialsAtLoad(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(getStoredAuthConfig()?.tokens?.access_token);
  } catch {
    return false;
  }
}

export function clearAllStoredHACredentials() {
  clearStoredAuthConfig();
}
