/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Internal / external Home Assistant URL resolver (like the HA Companion app).
 *
 * When an internal URL is configured, the dashboard probes it: if Home Assistant answers there
 * (and identifies itself as the same instance) the device is on the home network and the internal
 * URL is used; otherwise the external URL is used. A browser cannot read the Wi-Fi SSID, so
 * reachability of the internal URL is the signal.
 */

import { getStoredAuthConfig, saveStoredAuthConfig } from './authStorage';

export type HaUrlRoute = 'internal' | 'external';

export interface HaUrlResolution {
  route: HaUrlRoute;
  /** Base HTTP(S) URL in use, without a trailing slash or /api/websocket. */
  httpUrl: string;
  /** WebSocket URL in use (ends with /api/websocket). */
  wsUrl: string;
}

const ROUTE_CACHE_KEY = 'had_ha_url_route';
const PROBE_TIMEOUT_MS = 2500;

let currentRoute: HaUrlRoute = readCachedRoute();
let inFlight: Promise<HaUrlRoute> | null = null;
const listeners = new Set<(route: HaUrlRoute) => void>();

function readCachedRoute(): HaUrlRoute {
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ROUTE_CACHE_KEY) === 'internal') {
      return 'internal';
    }
  } catch {
    // storage unavailable
  }
  return 'external';
}

function writeCachedRoute(route: HaUrlRoute): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(ROUTE_CACHE_KEY, route);
  } catch {
    // storage unavailable
  }
}

/** Strips ws(s)://, /api/websocket and trailing slashes; returns '' for empty input. */
export function toHttpBase(raw?: string | null): string {
  let url = (raw || '').trim();
  if (!url) return '';
  if (/^wss:\/\//i.test(url)) url = 'https://' + url.slice(6);
  else if (/^ws:\/\//i.test(url)) url = 'http://' + url.slice(5);
  else if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  return url.replace(/\/api\/websocket\/?$/i, '').replace(/\/+$/, '');
}

export function toWsUrl(httpBase: string): string {
  return httpBase.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://') + '/api/websocket';
}

/**
 * A page served over https cannot open ws:// connections (mixed content), so an http internal URL
 * can never work there. Reported to the UI instead of failing silently.
 */
export function isInternalUrlBlockedByMixedContent(internalUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  const base = toHttpBase(internalUrl);
  if (!base || window.location.protocol !== 'https:') return false;
  return /^http:\/\//i.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(base);
}

export function getConfiguredInternalUrl(): string {
  return toHttpBase(getStoredAuthConfig()?.internalUrl);
}

export function setConfiguredInternalUrl(internalUrl: string): void {
  const config = getStoredAuthConfig();
  if (!config) return;
  const cleaned = toHttpBase(internalUrl);
  const next = { ...config, lastUpdated: Date.now() };
  if (cleaned) next.internalUrl = cleaned;
  else delete next.internalUrl;
  saveStoredAuthConfig(next);
  if (!cleaned) setRoute('external');
}

/** Synchronous best guess from the last probe; safe to call from hot paths. */
export function getCurrentHttpUrl(fallback?: string | null): string {
  const config = getStoredAuthConfig();
  const external = toHttpBase(config?.httpUrl || fallback);
  const internal = toHttpBase(config?.internalUrl);
  return currentRoute === 'internal' && internal ? internal : external;
}

/** Rewrites an external HA URL (http or ws form) to the one currently in use. */
export function applyActiveUrl(url: string): string {
  const config = getStoredAuthConfig();
  const internal = toHttpBase(config?.internalUrl);
  if (!internal || currentRoute !== 'internal') return url;
  const external = toHttpBase(config?.httpUrl);
  if (external && toHttpBase(url) !== external) return url; // caller targets some other host
  return /^wss?:\/\//i.test(url) ? toWsUrl(internal) : internal;
}

export function getCurrentResolution(): HaUrlResolution {
  const httpUrl = getCurrentHttpUrl();
  return { route: currentRoute, httpUrl, wsUrl: toWsUrl(httpUrl) };
}

export function onHaRouteChange(listener: (route: HaUrlRoute) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setRoute(route: HaUrlRoute): void {
  writeCachedRoute(route);
  if (route === currentRoute) return;
  currentRoute = route;
  listeners.forEach((l) => {
    try {
      l(route);
    } catch {
      // listener errors must not break resolution
    }
  });
}

/**
 * Opens a WebSocket to the internal URL and waits for HA's unauthenticated auth_required frame.
 * No token is sent. Resolves with ha_version, or null if unreachable/not Home Assistant.
 */
export function probeHomeAssistant(
  httpBase: string,
  timeoutMs = PROBE_TIMEOUT_MS
): Promise<{ haVersion: string | null } | null> {
  return new Promise((resolve) => {
    let socket: WebSocket | null = null;
    let settled = false;
    const done = (value: { haVersion: string | null } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (socket) {
          socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
          socket.close();
        }
      } catch {
        // ignore
      }
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    try {
      socket = new WebSocket(toWsUrl(httpBase));
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg?.type === 'auth_required') {
            done({ haVersion: msg.ha_version ? String(msg.ha_version) : null });
            return;
          }
        } catch {
          // fall through
        }
        done(null);
      };
      socket.onerror = () => done(null);
      socket.onclose = () => done(null);
    } catch {
      done(null);
    }
  });
}

/**
 * Probes the internal URL (if configured) and updates the active route. Concurrent calls share one probe.
 * Guard against a different device on a foreign LAN using the same private address: the internal host
 * must report the same HA version as the external one was last seen with.
 */
export function refreshHaRoute(): Promise<HaUrlRoute> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const config = getStoredAuthConfig();
      const internal = toHttpBase(config?.internalUrl);
      if (!internal || !config?.httpUrl || toHttpBase(config.httpUrl) === internal) {
        setRoute('external');
        return currentRoute;
      }
      if (isInternalUrlBlockedByMixedContent(internal)) {
        setRoute('external');
        return currentRoute;
      }
      const result = await probeHomeAssistant(internal);
      const knownVersion = config.haVersion;
      const sameInstance = !!result && (!knownVersion || !result.haVersion || result.haVersion === knownVersion);
      setRoute(sameInstance ? 'internal' : 'external');
      return currentRoute;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Remembers the HA version seen on a live connection, used to recognise the instance later. */
export function recordHaVersion(version: string | null | undefined): void {
  if (!version) return;
  const config = getStoredAuthConfig();
  if (!config || config.haVersion === version) return;
  saveStoredAuthConfig({ ...config, haVersion: version });
}

/** Re-checks the route when the device's network may have changed. Returns an unsubscribe function. */
export function watchNetworkChanges(onChange?: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const trigger = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      void refreshHaRoute().then(() => onChange?.());
    }, 800);
  };
  const conn = (navigator as any).connection;
  window.addEventListener('online', trigger);
  window.addEventListener('offline', trigger);
  conn?.addEventListener?.('change', trigger);
  return () => {
    if (debounce) clearTimeout(debounce);
    window.removeEventListener('online', trigger);
    window.removeEventListener('offline', trigger);
    conn?.removeEventListener?.('change', trigger);
  };
}

/** Test helper. */
export function __resetHaUrlResolverForTests(route: HaUrlRoute = 'external'): void {
  currentRoute = route;
  inFlight = null;
  listeners.clear();
}
