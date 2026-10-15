import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from '../src/lib/fetchWithTimeout';

describe('fetchWithTimeout (REL-006)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('aborts a request that never settles', async () => {
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );
    await expect(fetchWithTimeout('/never', {}, 30)).rejects.toBeTruthy();
  });

  it('passes through a quick response and honours a caller signal', async () => {
    vi.stubGlobal('fetch', async () => new Response('ok'));
    const res = await fetchWithTimeout('/ok', { signal: new AbortController().signal }, 1000);
    expect(await res.text()).toBe('ok');
  });
});
