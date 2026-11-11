import { describe, expect, it } from 'vitest';
import { isPrivateOrLocalHost, isSameOriginHost } from '../server/lib/network';
import { isValidImageMagicBytes } from '../server/lib/imageValidation';

describe('isPrivateOrLocalHost (SSRF guard)', () => {
  it.each([
    'localhost', 'foo.localhost', '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '0.0.0.0', '100.64.0.1', '[::1]', '::ffff:127.0.0.1', '[::ffff:7f00:1]', 'fe80::1', 'fd12::1'
  ])('blocks %s', (h) => expect(isPrivateOrLocalHost(h)).toBe(true));
  it.each(['example.com', '8.8.8.8', '172.32.0.1', '100.128.0.1', '1.1.1.1'])('allows %s', (h) =>
    expect(isPrivateOrLocalHost(h)).toBe(false)
  );
});

describe('isSameOriginHost', () => {
  it('compares host and effective port', () => {
    expect(isSameOriginHost('http://ha.local/x', 'http://HA.local:80/')).toBe(true);
    expect(isSameOriginHost('https://ha.local/', 'https://ha.local:443')).toBe(true);
    expect(isSameOriginHost('http://ha.local:8123', 'http://ha.local')).toBe(false);
    expect(isSameOriginHost('not a url', 'http://ha.local')).toBe(false);
  });
});

describe('isValidImageMagicBytes', () => {
  const pad = (b: number[]) => Buffer.from([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);
  it('accepts matching signatures', () => {
    expect(isValidImageMagicBytes(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true);
    expect(isValidImageMagicBytes(pad([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true);
    expect(isValidImageMagicBytes(Buffer.from('GIF89a......'), 'image/gif')).toBe(true);
  });
  it('rejects mismatches, short buffers and unknown types', () => {
    expect(isValidImageMagicBytes(Buffer.from('<html>........'), 'image/png')).toBe(false);
    expect(isValidImageMagicBytes(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBe(false);
    expect(isValidImageMagicBytes(pad([0xff, 0xd8, 0xff]), 'image/svg+xml')).toBe(false);
  });
});
