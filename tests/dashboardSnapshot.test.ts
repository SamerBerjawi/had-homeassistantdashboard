import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDashboardSnapshots, loadDashboardSnapshot, saveDashboardSnapshot } from '../src/services/dashboardSnapshot';

const baseSnapshot = {
  serverUrl: 'ws://homeassistant.local:8123/api/websocket',
  haVersion: '2026.10.0',
  areas: [],
  devices: [],
  entityRegistry: [],
  floors: [],
  labels: [],
  states: {
    'light.kitchen': { entity_id: 'light.kitchen', state: 'on', attributes: {} },
    'lock.front': { entity_id: 'lock.front', state: 'locked', attributes: {} },
    'alarm_control_panel.home': { entity_id: 'alarm_control_panel.home', state: 'disarmed', attributes: {} }
  }
} as any;

beforeEach(async () => {
  vi.useRealTimers();
  await clearDashboardSnapshots();
});

describe('dashboard snapshot', () => {
  it('round-trips registries and states, keyed by host regardless of URL form', async () => {
    await saveDashboardSnapshot(baseSnapshot);
    const loaded = await loadDashboardSnapshot('http://homeassistant.local:8123/');
    expect(loaded?.states['light.kitchen'].state).toBe('on');
    expect(loaded?.haVersion).toBe('2026.10.0');
    expect(await loadDashboardSnapshot('http://other-host:8123')).toBeNull();
  });

  it('never stores lock or alarm states', async () => {
    await saveDashboardSnapshot(baseSnapshot);
    const loaded = await loadDashboardSnapshot(baseSnapshot.serverUrl);
    expect(loaded?.states).not.toHaveProperty('lock.front');
    expect(loaded?.states).not.toHaveProperty('alarm_control_panel.home');
  });

  it('ignores snapshots older than a week', async () => {
    await saveDashboardSnapshot(baseSnapshot);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(await loadDashboardSnapshot(baseSnapshot.serverUrl)).toBeNull();
    vi.useRealTimers();
  });
});

describe('store hydration from snapshot', () => {
  it('shows cached data until live registries replace it', async () => {
    vi.resetModules();
    // Pretend a live session is stored, and a snapshot exists for its server
    (globalThis as any).window = { addEventListener: () => {}, dispatchEvent: () => true };
    const storage = new Map<string, string>([[
      'had_auth_config_v1',
      JSON.stringify({
        version: 1,
        authMethod: 'llat',
        serverUrl: 'ws://ha.test:8123/api/websocket',
        httpUrl: 'http://ha.test:8123',
        tokens: { access_token: 'tok', server_url: 'http://ha.test:8123' }
      })
    ]]);
    (globalThis as any).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k)
    };
    await saveDashboardSnapshot({ ...baseSnapshot, serverUrl: 'http://ha.test:8123' });

    const { useAutoLayoutStore } = await import('../src/store/useAutoLayoutStore');
    const { haWebSocketService } = await import('../src/services/haWebSocket');
    (haWebSocketService as any).isDemoMode = false;
    expect(useAutoLayoutStore.getState().snapshotStatus).toBe('pending');

    await useAutoLayoutStore.getState().init();
    await vi.waitFor(() => expect(useAutoLayoutStore.getState().snapshotStatus).toBe('hydrated'));
    expect(useAutoLayoutStore.getState().showingCachedSnapshot).toBe(true);
    expect(useAutoLayoutStore.getState().states['light.kitchen'].state).toBe('on');
    expect(useAutoLayoutStore.getState().states).not.toHaveProperty('lock.front');

    (haWebSocketService as any).callbacks.onRegistriesLoaded({
      areas: [], devices: [], entityRegistry: [], floors: [], labels: [],
      states: { 'light.kitchen': { entity_id: 'light.kitchen', state: 'off', attributes: {} } }
    });
    expect(useAutoLayoutStore.getState().showingCachedSnapshot).toBe(false);
    expect(useAutoLayoutStore.getState().states['light.kitchen'].state).toBe('off');
  });
});
