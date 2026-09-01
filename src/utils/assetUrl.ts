/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Canonical Asset URL Resolver Utility
 * Ensures custom vehicle PNG/JPEG/SVG assets, brand logos, and media files
 * resolve correctly across household devices, reverse proxies, and wall kiosks.
 */

import { getStoredHAAuth } from '../services/haAuth';
import { getStoredAuthConfig } from '../services/authStorage';

/**
 * Resolves a raw asset URL to a fully qualified, cache-busted, cross-device accessible URL.
 * 
 * @param rawUrl - The stored asset URL (e.g., "/api/assets/car_123.png", "data:image/png;base64,...", or full HTTP URL)
 * @param versionTimestamp - Optional version or timestamp (e.g., config.updatedAt) for cache busting
 * @returns The resolved canonical URL, or undefined if no URL was provided.
 */
export function resolveAssetUrl(
  rawUrl?: string | null,
  versionTimestamp?: string | number
): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return undefined;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  // 1. Data URLs (Base64) & Blob URLs: Return directly without cache busting
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Generate cache-busting query parameter if versionTimestamp is supplied
  let versionQuery = '';
  if (versionTimestamp) {
    const rawVal = String(versionTimestamp);
    // Use numeric hash or clean string
    const sanitized = rawVal.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized) {
      versionQuery = `v=${sanitized}`;
    }
  }

  const appendVersion = (url: string): string => {
    if (!versionQuery) return url;
    if (url.includes('?')) {
      // If version is already in query, don't duplicate
      if (url.includes('v=')) return url;
      return `${url}&${versionQuery}`;
    }
    return `${url}?${versionQuery}`;
  };

  // 3. Absolute URLs (http:// or https://)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return appendVersion(trimmed);
  }

  // 4. Relative URLs (/api/assets/... or /data/assets/... or /local/...)
  // If running in browser, ensure path has leading slash
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // If the dashboard is connecting to a remote Home Assistant instance directly from a different origin
  if (typeof window !== 'undefined') {
    // If relative path and we are on same origin, relative works directly
    return appendVersion(normalizedPath);
  }

  return appendVersion(normalizedPath);
}
