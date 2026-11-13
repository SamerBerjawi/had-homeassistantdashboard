import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadHAImageBlob } from '../src/services/haImageService';

describe('haImageService.loadHAImageBlob', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to /api/image-proxy with Bearer auth when direct CORS fetch fails for a protected HA /api/ image', async () => {
    vi.stubGlobal('window', {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:proxied-avatar');

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('https://ha.example.com/api/image/serve/')) {
        throw new TypeError('Failed to fetch (CORS)');
      }
      if (url.startsWith('/api/image-proxy?url=')) {
        const headers = (init?.headers || {}) as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer test-token-1');
        expect(headers['X-HA-URL']).toBe('https://ha.example.com');
        return new Response(new Blob(['img'], { type: 'image/png' }), {
          status: 200,
          headers: { 'content-type': 'image/png' }
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadHAImageBlob(
      '/api/image/serve/person1/512x512',
      'https://ha.example.com',
      'test-token-1'
    );

    expect(result).toBe('blob:proxied-avatar');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns empty string instead of an unauthenticated HA /api/ URL when both direct and proxy fetches fail', async () => {
    vi.stubGlobal('window', {});

    const fetchMock = vi.fn(async () => new Response('Unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadHAImageBlob(
      '/api/image/serve/person2/512x512',
      'https://ha.example.com',
      'test-token-2'
    );

    expect(result).toBe('');
  });

  it('allows direct URL fallback for /api/camera_proxy/ URLs that already carry a ?token= query param', async () => {
    vi.stubGlobal('window', {});

    const fetchMock = vi.fn(async () => new Response('Not Found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadHAImageBlob(
      '/api/camera_proxy/camera.front?token=abc123',
      'https://ha.example.com',
      'test-token-3'
    );

    expect(result).toBe('https://ha.example.com/api/camera_proxy/camera.front?token=abc123');
  });
});
