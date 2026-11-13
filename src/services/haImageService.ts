import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { useState, useEffect } from 'react';
import { getActiveHAToken } from './haAuth';
import { getStoredAuthConfig } from './authStorage';
import { applyActiveUrl } from './haUrlResolver';

// In-memory cache for resolved Blob URLs to prevent duplicate network requests
const blobUrlCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

/**
 * Converts any Home Assistant server URL (including ws://, wss://, /api/websocket)
 * into a clean, valid HTTP/S base URL.
 */
export function getHAHttpBaseUrl(serverUrl?: string | null): string {
  let target = serverUrl;
  if (!target && typeof window !== 'undefined') {
    const authConfig = getStoredAuthConfig();
    target = authConfig?.httpUrl || authConfig?.serverUrl;
    if (!target) {
      target = localStorage.getItem('ha_server_url') || localStorage.getItem('had_last_ha_url');
    }
  }

  if (!target) return '';

  return applyActiveUrl(target)
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
 * Returns true if the URL targets a Home Assistant `/api/` endpoint without an embedded `?token=`
 * query parameter. Such URLs must never be handed to `<img src>` unauthenticated, or HA logs a
 * "Login attempt failed" 401 notification.
 */
function isProtectedHaApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'http://placeholder.local');
    return parsed.pathname.startsWith('/api/') && !parsed.searchParams.has('token');
  } catch {
    return url.includes('/api/') && !url.includes('token=');
  }
}

async function fetchViaImageProxy(
  rawUrl: string,
  token: string,
  haBase: string
): Promise<string | null> {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`
    };
    if (haBase) {
      headers['X-HA-URL'] = haBase;
    }
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(rawUrl)}`;
    const res = await fetchWithTimeout(proxyUrl, { headers }, 10000);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
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

  // External images (e.g. external CDN like Spotify or Apple Music) don't need HA Auth headers - return directly for <img>
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const base = getHAHttpBaseUrl(serverUrl);
    const isHAHost = base && url.startsWith(base);
    if (!isHAHost) {
      return url;
    }
  }

  const targetUrl = resolveHAImageUrl(url, serverUrl);
  if (!targetUrl) return '';

  const activeToken = token || getActiveHAToken();
  const haBase = getHAHttpBaseUrl(serverUrl);

  // Check cache
  const cacheKey = `${targetUrl}_${activeToken || ''}`;
  if (blobUrlCache.has(cacheKey)) {
    return blobUrlCache.get(cacheKey)!;
  }

  // Deduplicate ongoing requests
  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey)!;
  }

  const fallbackResult = async (): Promise<string> => {
    if (activeToken) {
      const proxied = await fetchViaImageProxy(url, activeToken, haBase);
      if (proxied) {
        blobUrlCache.set(cacheKey, proxied);
        return proxied;
      }
    }
    // Never hand a protected HA /api/ URL to <img src> without auth — HA logs a 401 notification.
    return isProtectedHaApiUrl(targetUrl) ? '' : targetUrl;
  };

  const fetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const response = await fetchWithTimeout(targetUrl, {
        headers,
        mode: 'cors'
      }, 10000);

      if (!response.ok) {
        return await fallbackResult();
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.startsWith('image/')) {
        return await fallbackResult();
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlCache.set(cacheKey, objectUrl);
      return objectUrl;
    } catch {
      return await fallbackResult();
    } finally {
      pendingPromises.delete(cacheKey);
    }
  })();

  pendingPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * React hook to reactively resolve authenticated Home Assistant image blob URLs.
 * Synchronously uses cache when available, otherwise loads asynchronously.
 */
export function useHAImage(
  rawUrl?: string | null,
  serverUrl?: string | null
): { imageUrl: string; isLoading: boolean } {
  const isExternalUrl = (u?: string | null) => {
    if (!u) return false;
    if (u.startsWith('http://') || u.startsWith('https://')) {
      const base = getHAHttpBaseUrl(serverUrl);
      return !base || !u.startsWith(base);
    }
    return false;
  };

  const [imageUrl, setImageUrl] = useState<string>(() => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) return rawUrl;
    if (isExternalUrl(rawUrl)) return rawUrl;
    const targetUrl = resolveHAImageUrl(rawUrl, serverUrl);
    const activeToken = getActiveHAToken();
    const cacheKey = `${targetUrl}_${activeToken || ''}`;
    return blobUrlCache.get(cacheKey) || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !imageUrl && Boolean(rawUrl));

  useEffect(() => {
    if (!rawUrl) {
      setImageUrl('');
      setIsLoading(false);
      return;
    }

    if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
      setImageUrl(rawUrl);
      setIsLoading(false);
      return;
    }

    if (isExternalUrl(rawUrl)) {
      setImageUrl(rawUrl);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    loadHAImageBlob(rawUrl, serverUrl).then((resolved) => {
      if (isMounted) {
        setImageUrl(resolved);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [rawUrl, serverUrl]);

  return { imageUrl, isLoading };
}

