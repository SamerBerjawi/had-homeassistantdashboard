/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-memory cache for resolved Blob URLs to prevent duplicate network requests
const blobUrlCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

/**
 * Converts any Home Assistant server URL (including ws://, wss://, /api/websocket)
 * into a clean, valid HTTP/S base URL.
 */
export function getHAHttpBaseUrl(serverUrl?: string | null): string {
  if (!serverUrl) {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ha_server_url') || localStorage.getItem('had_last_ha_url');
      if (saved) {
        return saved
          .replace(/^wss:\/\//i, 'https://')
          .replace(/^ws:\/\//i, 'http://')
          .replace(/\/api\/websocket\/?$/i, '')
          .replace(/\/+$/, '');
      }
    }
    return '';
  }

  return serverUrl
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
    .replace(/\/api\/websocket\/?$/i, '')
    .replace(/\/+$/, '');
}

/**
 * Normalizes a relative or absolute HA image URL.
 */
export function resolveHAImageUrl(url?: string | null, serverUrl?: string | null): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const base = getHAHttpBaseUrl(serverUrl);
  const path = url.startsWith('/') ? url : `/${url}`;
  return base ? `${base}${path}` : path;
}

/**
 * Fetches an image from Home Assistant using Bearer token authentication
 * and returns a cached Object URL (blob:...).
 */
export async function loadHAImageBlob(
  url?: string | null,
  serverUrl?: string | null,
  token?: string | null
): Promise<string> {
  if (!url) return '';

  // Already a self-contained URI or blob
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // External images (e.g. Unsplash) don't need HA Auth headers
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const base = getHAHttpBaseUrl(serverUrl);
    const isHAHost = base && url.startsWith(base);
    if (!isHAHost) {
      return url;
    }
  }

  const targetUrl = resolveHAImageUrl(url, serverUrl);
  if (!targetUrl) return '';

  // Check cache
  const cacheKey = `${targetUrl}_${token || ''}`;
  if (blobUrlCache.has(cacheKey)) {
    return blobUrlCache.get(cacheKey)!;
  }

  // Deduplicate ongoing requests
  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {};
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ha_token') : null);
      
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const response = await fetch(targetUrl, {
        headers,
        mode: 'cors'
      });

      if (!response.ok) {
        // If authenticated fetch fails with 404 or 401, return direct URL as fallback
        return targetUrl;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlCache.set(cacheKey, objectUrl);
      return objectUrl;
    } catch {
      // Return direct URL on network/CORS error so <img> can attempt standard load
      return targetUrl;
    } finally {
      pendingPromises.delete(cacheKey);
    }
  })();

  pendingPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}
