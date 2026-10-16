import { beforeEach, describe, expect, it, vi } from 'vitest';

// Browser globals the remote storage driver relies on
const storage = new Map<string, string>();
const events: Event[] = [];
const eventTarget = new EventTarget();

beforeEach(() => {
  storage.clear();
  events.length = 0;
  (globalThis as any).localStorage = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear()
  };
  (globalThis as any).window = {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: (event: Event) => {
      events.push(event);
      return eventTarget.dispatchEvent(event);
    }
  };
});

const lastSyncStatus = () =>
  (events.filter((e) => e.type === 'had_sync_status_changed').at(-1) as CustomEvent | undefined)?.detail?.status;

async function createDriver(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal('fetch', fetchMock);
  vi.resetModules();
  const { RemoteStorageDriver } = await import('../src/services/configStorageService');
  return { driver: new RemoteStorageDriver(), fetchMock };
}

const ok = () => new Response(JSON.stringify({ success: true, serverVersion: 7, config: {} }), { status: 200 });

describe('RemoteStorageDriver', () => {
  it('keeps a change as unsynced and reports offline when the NAS is unreachable', async () => {
    const { driver } = await createDriver(async () => {
      throw new TypeError('Failed to fetch');
    });
    await driver.saveConfig({ theme: { mode: 'dark' } } as any, { attempts: 1 });
    expect((driver.getUnsyncedChanges() as any)?.theme?.mode).toBe('dark');
    expect(lastSyncStatus()).toBe('offline_fallback');
  });

  it('treats server errors as failures and accumulates unsynced changes', async () => {
    const { driver } = await createDriver(async () => new Response('{}', { status: 500 }));
    await driver.saveConfig({ theme: { mode: 'dark' } } as any, { attempts: 1 });
    await driver.saveConfig({ theme: { backgroundStyle: 'flat' } } as any, { attempts: 1 });
    expect(driver.getUnsyncedChanges()).toMatchObject({ theme: { mode: 'dark', backgroundStyle: 'flat' } });
  });

  it('replays unsynced changes and clears them once the NAS accepts them', async () => {
    let online = false;
    const { driver, fetchMock } = await createDriver(async () => {
      if (!online) throw new TypeError('Failed to fetch');
      return ok();
    });
    await driver.saveConfig({ theme: { mode: 'dark' } } as any, { attempts: 1 });

    online = true;
    fetchMock.mockClear();
    await driver.replayUnsyncedChanges();
    const body = JSON.parse(String(fetchMock.mock.calls.find(([url]) => url === '/api/config')?.[1]?.body));
    expect(body.config.theme.mode).toBe('dark');
    expect(driver.getUnsyncedChanges()).toBeNull();
    expect(lastSyncStatus()).toBe('synced');
  });

  it('sends only the delta with keepalive when the page is closing', async () => {
    const { driver, fetchMock } = await createDriver(async () => ok());
    driver.saveConfigOnUnload({ theme: { mode: 'light' } } as any);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.keepalive).toBe(true);
    expect(JSON.parse(String(init?.body))).toEqual({ config: { theme: { mode: 'light' } }, partial: true });
    // Recorded so it's replayed if the request never arrives
    expect((driver.getUnsyncedChanges() as any)?.theme?.mode).toBe('light');
  });

  describe('conflict retry (REL-001)', () => {
    const conflict = () =>
      new Response(JSON.stringify({ conflict: true, serverVersion: 9, config: { theme: { mode: 'light' } } }), { status: 409 });

    it.each([500, 503, 401])('keeps the edit queued when the retry fails with HTTP %i', async (status) => {
      let posts = 0;
      const { driver } = await createDriver(async (url) => {
        if (url !== '/api/config') return new Response('{}', { status: 200 });
        posts++;
        return posts === 1 ? conflict() : new Response('{}', { status });
      });
      await driver.saveConfig({ theme: { backgroundStyle: 'flat' } } as any, { attempts: 1 });
      expect(posts).toBe(2);
      expect((driver.getUnsyncedChanges() as any)?.theme?.backgroundStyle).toBe('flat');
      expect(lastSyncStatus()).not.toBe('synced');
    });

    it('accepts the server config only on a second conflict', async () => {
      const { driver } = await createDriver(async () => conflict());
      await driver.saveConfig({ theme: { backgroundStyle: 'flat' } } as any, { attempts: 1 });
      expect(driver.getUnsyncedChanges()).toBeNull();
    });

    it('re-sends the merged edit on top of the server config and clears the queue on success', async () => {
      let posts = 0;
      const bodies: any[] = [];
      const { driver } = await createDriver(async (url, init) => {
        if (url !== '/api/config') return new Response('{}', { status: 200 });
        posts++;
        bodies.push(JSON.parse(String(init?.body)));
        return posts === 1 ? conflict() : ok();
      });
      await driver.saveConfig({ theme: { backgroundStyle: 'flat' } } as any, { attempts: 1 });
      expect(bodies[1].expectedVersion).toBe(9);
      expect(bodies[1].config.theme).toMatchObject({ mode: 'light', backgroundStyle: 'flat' });
      expect(driver.getUnsyncedChanges()).toBeNull();
    });
  });
});
