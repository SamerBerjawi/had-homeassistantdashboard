import { describe, expect, it } from 'vitest';
import {
  hashPin,
  applyPinOnWrite,
  PIN_SET_SENTINEL,
  redactConfigForClient,
  isHashedPin,
  redactCredentialsDeep,
  redactCredentialsInText,
  resolveHlsSubpath,
  restoreRedactedCameraUrls,
  validateCameraSourceUrl,
  validateDashboardConfigShape,
  verifyPin
} from '../server/lib/security';

describe('resolveHlsSubpath (SEC-002)', () => {
  it('defaults to the playlist', () => {
    expect(resolveHlsSubpath(undefined)).toBe('/stream.m3u8');
    expect(resolveHlsSubpath('/')).toBe('/stream.m3u8');
  });
  it('allows playlists and segments', () => {
    expect(resolveHlsSubpath('/stream.m3u8')).toBe('/stream.m3u8');
    expect(resolveHlsSubpath('/stream.ts')).toBe('/stream.ts');
    expect(resolveHlsSubpath('/hls/segment.m4s')).toBe('/hls/segment.m4s');
  });
  it.each(['/restart', '/exit', '/config', '/streams', '/../restart', '/..%2frestart', '/a/b.ts', '//x.ts', '/x.json'])(
    'refuses %s',
    (p) => expect(resolveHlsSubpath(p)).toBeNull()
  );
});

describe('validateCameraSourceUrl (SEC-003)', () => {
  it('accepts supported schemes and empty values', () => {
    expect(validateCameraSourceUrl('rtsp://user:pw@192.168.1.5:554/s1')).toBeNull();
    expect(validateCameraSourceUrl('https://cam.local/stream')).toBeNull();
    expect(validateCameraSourceUrl('')).toBeNull();
    expect(validateCameraSourceUrl(undefined)).toBeNull();
  });
  it.each(['exec:touch /tmp/pwned #', 'ffmpeg:x', 'file:///etc/passwd', 'echo:hi', 'not a url', 'javascript:alert(1)'])(
    'rejects %s',
    (v) => expect(validateCameraSourceUrl(v)).not.toBeNull()
  );
  it('rejects non-strings and very long values', () => {
    expect(validateCameraSourceUrl(123)).not.toBeNull();
    expect(validateCameraSourceUrl('rtsp://h/' + 'a'.repeat(3000))).not.toBeNull();
  });
});

describe('validateDashboardConfigShape (REL-003)', () => {
  it('accepts a minimal valid config', () => {
    expect(validateDashboardConfigShape({ theme: { accentColor: '#fff' }, version: 1 })).toBeNull();
    expect(validateDashboardConfigShape({ navigation: { hiddenPages: [] } })).toBeNull();
  });
  it('rejects wrong-typed sections', () => {
    expect(validateDashboardConfigShape({ rooms: [] })).toMatch(/rooms/);
    expect(validateDashboardConfigShape({ entities: 'x' })).toMatch(/entities/);
    expect(validateDashboardConfigShape({ cameras: 5 })).toMatch(/cameras/);
    expect(validateDashboardConfigShape({ rooms: { floorOrder: [1] } })).toMatch(/floorOrder/);
  });
  it('rejects a bad camera source URL', () => {
    expect(
      validateDashboardConfigShape({ cameras: { sources: { c1: { id: 'c1', rtspUrl: 'exec:touch /tmp/x' } } } })
    ).toMatch(/cameras\.sources\.c1/);
  });
  it('allows null as a merge-delete marker', () => {
    expect(validateDashboardConfigShape({ vacuums: null })).toBeNull();
  });
});

describe('credential redaction (SEC-006)', () => {
  it('redacts user:pass in URLs', () => {
    expect(redactCredentialsInText('rtsp://admin:s3cret@10.0.0.2:554/x')).toBe('rtsp://***:***@10.0.0.2:554/x');
    expect(redactCredentialsInText('rtsp://10.0.0.2/x')).toBe('rtsp://10.0.0.2/x');
  });
  it('redacts deeply without mutating the input', () => {
    const input = { a: [{ u: 'rtsp://u:p@h/s' }] };
    const out = redactCredentialsDeep(input);
    expect(JSON.stringify(out)).not.toContain('p@h');
    expect(input.a[0].u).toBe('rtsp://u:p@h/s');
  });
  it('restores stored credentials when a redacted URL is echoed back', () => {
    const stored = { cameras: { sources: { c1: { rtspUrl: 'rtsp://u:p@h/s' } } } };
    const incoming = { cameras: { sources: { c1: { rtspUrl: 'rtsp://***:***@h/s' } } } };
    restoreRedactedCameraUrls(incoming, stored);
    expect(incoming.cameras.sources.c1.rtspUrl).toBe('rtsp://u:p@h/s');
  });
  it('keeps a genuinely new URL', () => {
    const stored = { cameras: { sources: { c1: { rtspUrl: 'rtsp://u:p@h/s' } } } };
    const incoming = { cameras: { sources: { c1: { rtspUrl: 'rtsp://new:pw@h2/s' } } } };
    restoreRedactedCameraUrls(incoming, stored);
    expect(incoming.cameras.sources.c1.rtspUrl).toBe('rtsp://new:pw@h2/s');
  });
});

describe('kiosk PIN hashing (SEC-006)', () => {
  it('hashes and verifies', () => {
    const h = hashPin('1234');
    expect(isHashedPin(h)).toBe(true);
    expect(h).not.toContain('1234');
    expect(verifyPin('1234', h)).toBe(true);
    expect(verifyPin('1235', h)).toBe(false);
  });
  it('hashes a plaintext canvas.pinCode on write', () => {
    const cfg: any = { canvas: { pinCode: '4321' } };
    applyPinOnWrite(cfg, null);
    expect(isHashedPin(cfg.canvas.pinCode)).toBe(true);
  });
  it('keeps the stored hash when the sentinel is echoed back', () => {
    const stored: any = { canvas: { pinCode: hashPin('1111') } };
    const cfg: any = { canvas: { pinCode: PIN_SET_SENTINEL } };
    applyPinOnWrite(cfg, stored);
    expect(cfg.canvas.pinCode).toBe(stored.canvas.pinCode);
  });
  it('clears the PIN on empty value', () => {
    const stored: any = { canvas: { pinCode: hashPin('1111') } };
    const cfg: any = { canvas: { pinCode: '' } };
    applyPinOnWrite(cfg, stored);
    expect(cfg.canvas.pinCode).toBe('');
  });
  it('never returns the hash or camera passwords to clients', () => {
    const stored: any = {
      canvas: { pinCode: hashPin('1111') },
      cameras: { sources: { c1: { rtspUrl: 'rtsp://u:pw@h/s' } } }
    };
    const out: any = redactConfigForClient(stored);
    expect(out.canvas.pinCode).toBe(PIN_SET_SENTINEL);
    expect(JSON.stringify(out)).not.toContain('pw@h');
  });
});
