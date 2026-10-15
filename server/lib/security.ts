/**
 * Pure helpers for request validation and secret handling on the server.
 * Kept free of Express/fs so they can be unit tested (tests/serverSecurity.test.ts).
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// go2rtc HLS proxy (SEC-002)
// ---------------------------------------------------------------------------

const HLS_SUBPATH_PATTERN = /^\/(?:hls\/)?[A-Za-z0-9_.-]+\.(?:m3u8|ts|m4s|mp4)$/;

/**
 * Returns the go2rtc `/api` sub-path to request for an HLS proxy call, or null when the path must
 * be refused. Only playlist and media-segment names are allowed, so the proxy cannot reach the
 * go2rtc management API (restart, config, streams) or escape the `/api` prefix.
 */
export function resolveHlsSubpath(rawSubpath: string | undefined): string | null {
  let subpath = rawSubpath || '/stream.m3u8';
  if (!subpath.startsWith('/')) subpath = `/${subpath}`;
  if (subpath === '/') subpath = '/stream.m3u8';
  if (subpath.includes('..') || subpath.includes('%') || subpath.includes('\\') || subpath.includes('//')) {
    return null;
  }
  return HLS_SUBPATH_PATTERN.test(subpath) ? subpath : null;
}

/** Only these query parameters are forwarded to go2rtc by the HLS proxy. */
export const HLS_FORWARDED_QUERY_KEYS = new Set(['id', 'n', 'mp4', 'ts']);

// ---------------------------------------------------------------------------
// Camera source URLs (SEC-003)
// ---------------------------------------------------------------------------

const ALLOWED_CAMERA_SOURCE_PROTOCOLS = new Set(['rtsp:', 'rtsps:', 'http:', 'https:']);

/** Validates a camera `rtspUrl`. Returns null when valid, otherwise a human-readable reason. */
export function validateCameraSourceUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'rtspUrl must be a string';
  const trimmed = value.trim();
  if (trimmed.length > 2048) return 'rtspUrl is too long';
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'rtspUrl must be an absolute rtsp://, rtsps://, http:// or https:// URL';
  }
  if (!ALLOWED_CAMERA_SOURCE_PROTOCOLS.has(parsed.protocol)) {
    return `rtspUrl scheme "${parsed.protocol}" is not allowed (use rtsp, rtsps, http or https)`;
  }
  if (!parsed.hostname) return 'rtspUrl must include a host';
  return null;
}

// ---------------------------------------------------------------------------
// Config shape (REL-003)
// ---------------------------------------------------------------------------

const OBJECT_SECTIONS = [
  'theme', 'mobility', 'vacuums', 'rooms', 'entities', 'cameras', 'network', 'energy',
  'navigation', 'preferences', 'profile', 'areas', 'floors', 'labels', 'canvas', 'overview',
  'layoutOverrides', 'responsiveLayoutOverrides'
] as const;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Validates the dashboard config body that `POST /api/config` is about to persist.
 * Returns null when valid, otherwise a message naming the offending field.
 */
export function validateDashboardConfigShape(body: unknown): string | null {
  if (!isPlainObject(body)) return 'config must be a JSON object';
  if (Object.keys(body).length === 0) return 'config must not be empty';
  if (body.version !== undefined && typeof body.version !== 'number') return 'version must be a number';
  if (body.updatedAt !== undefined && typeof body.updatedAt !== 'string') return 'updatedAt must be a string';
  if (body.cartoApiKey !== undefined && typeof body.cartoApiKey !== 'string') return 'cartoApiKey must be a string';

  for (const key of OBJECT_SECTIONS) {
    const v = body[key];
    // null is a merge-delete marker for the server-side deep merge, so it is allowed
    if (v !== undefined && v !== null && !isPlainObject(v)) return `${key} must be an object`;
  }

  const rooms = body.rooms;
  if (isPlainObject(rooms)) {
    for (const k of ['floorOrder', 'hiddenFloors', 'areaOrder', 'hiddenAreas', 'favoriteAreas']) {
      const v = rooms[k];
      if (v !== undefined && !(Array.isArray(v) && v.every((x) => typeof x === 'string'))) {
        return `rooms.${k} must be an array of strings`;
      }
    }
  }

  const cameras = body.cameras;
  if (isPlainObject(cameras) && cameras.sources !== undefined && cameras.sources !== null) {
    if (!isPlainObject(cameras.sources)) return 'cameras.sources must be an object';
    for (const [id, src] of Object.entries(cameras.sources)) {
      if (!isPlainObject(src)) return `cameras.sources.${id} must be an object`;
      const reason = validateCameraSourceUrl(src.rtspUrl);
      // A redacted URL (see redactCredentialsInText) is resolved against the stored value later
      if (reason) return `cameras.sources.${id}: ${reason}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Credential redaction (SEC-006)
// ---------------------------------------------------------------------------

const CREDENTIALS_IN_URL = /([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^/\s:@"'\\]+(?::[^/\s@"'\\]*)?@/g;
const REDACTED_MARKER = '***:***@';

/** Replaces `scheme://user:pass@` with `scheme://***:***@` anywhere in a string. */
export function redactCredentialsInText(text: string): string {
  return text.replace(CREDENTIALS_IN_URL, `$1${REDACTED_MARKER}`);
}

/** Deep-copies a JSON-compatible value with URL credentials removed from every string. */
export function redactCredentialsDeep<T>(value: T): T {
  if (typeof value === 'string') return redactCredentialsInText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactCredentialsDeep(v)) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactCredentialsDeep(v);
    return out as T;
  }
  return value;
}

export function containsRedactedCredentials(value: string): boolean {
  return value.includes(REDACTED_MARKER);
}

/**
 * The client only ever sees redacted camera URLs, so a save that echoes one back must not
 * overwrite the stored credentials. Mutates `incomingConfig` in place.
 */
export function restoreRedactedCameraUrls(incomingConfig: any, storedConfig: any): void {
  const incoming = incomingConfig?.cameras?.sources;
  const stored = storedConfig?.cameras?.sources;
  if (!isPlainObject(incoming) || !isPlainObject(stored)) return;
  for (const [id, src] of Object.entries(incoming)) {
    if (!isPlainObject(src) || typeof src.rtspUrl !== 'string') continue;
    if (!containsRedactedCredentials(src.rtspUrl)) continue;
    const storedUrl = (stored as any)[id]?.rtspUrl;
    if (typeof storedUrl === 'string' && redactCredentialsInText(storedUrl) === src.rtspUrl) {
      src.rtspUrl = storedUrl;
    }
  }
}

// ---------------------------------------------------------------------------
// Kiosk PIN hashing (SEC-006)
// ---------------------------------------------------------------------------

const PIN_HASH_PREFIX = 'scrypt$';

export function isHashedPin(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PIN_HASH_PREFIX);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${PIN_HASH_PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!isHashedPin(stored)) return false;
  const [, saltHex, hashHex] = stored.split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Returned to clients in place of the stored PIN hash (a 4-digit hash would be brute-forceable). */
export const PIN_SET_SENTINEL = '__pin_set__';

/**
 * Prepares `canvas.pinCode` of an incoming config for persistence, in place:
 * a plaintext PIN is hashed, the sentinel keeps the stored hash, and an empty value clears it.
 */
export function applyPinOnWrite(incomingConfig: any, storedConfig: any): void {
  const canvas = incomingConfig?.canvas;
  if (!isPlainObject(canvas) || canvas.pinCode === undefined) return;
  const pin = canvas.pinCode;
  if (pin === PIN_SET_SENTINEL || isHashedPin(pin)) {
    const storedPin = storedConfig?.canvas?.pinCode;
    if (isHashedPin(storedPin)) canvas.pinCode = storedPin;
    else delete canvas.pinCode;
    return;
  }
  if (typeof pin !== 'string' || pin === '') {
    canvas.pinCode = '';
    return;
  }
  canvas.pinCode = hashPin(pin);
}

/** Config as sent to clients: URL credentials redacted and the PIN hash replaced by a marker. */
export function redactConfigForClient<T>(config: T): T {
  const out: any = redactCredentialsDeep(config);
  if (isPlainObject(out?.canvas) && isHashedPin(out.canvas.pinCode)) {
    out.canvas.pinCode = PIN_SET_SENTINEL;
  }
  return out as T;
}
