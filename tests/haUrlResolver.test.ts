import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, string> = {};
vi.stubGlobal('window', { location: { protocol: 'http:' }, addEventListener() {}, removeEventListener() {} });
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => void (store[k] = v),
  removeItem: (k: string) => void delete store[k]
});

import { saveStoredAuthConfig } from '../src/services/authStorage';
import {
  applyActiveUrl,
  getCurrentHttpUrl,
  refreshHaRoute,
  toHttpBase,
  __resetHaUrlResolverForTests
} from '../src/services/haUrlResolver';

function seed(extra: Record<string, unknown> = {}) {
  saveStoredAuthConfig({
    version: 1,
    authMethod: 'llat',
    serverUrl: 'wss://ha.example.com/api/websocket',
    httpUrl: 'https://ha.example.com',
    internalUrl: 'http://192.168.1.10:8123',
    tokens: { access_token: 't', server_url: 'wss://ha.example.com/api/websocket', auth_type: 'llat' },
    lastUpdated: 1,
    ...extra
  } as any);
}

function mockSocket(behaviour: 'auth_required' | 'error', haVersion = '2026.1.0') {
  vi.stubGlobal(
    'WebSocket',
    class {
      onmessage: any;
      onerror: any;
      onclose: any;
      constructor() {
        setTimeout(() => {
          if (behaviour === 'error') this.onerror?.({});
          else this.onmessage?.({ data: JSON.stringify({ type: 'auth_required', ha_version: haVersion }) });
        }, 0);
      }
      close() {}
    }
  );
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem() {}, removeItem() {} });
  __resetHaUrlResolverForTests('external');
});

describe('haUrlResolver', () => {
  it('normalizes urls', () => {
    expect(toHttpBase('ws://x:8123/api/websocket')).toBe('http://x:8123');
    expect(toHttpBase('192.168.1.2:8123/')).toBe('http://192.168.1.2:8123');
  });

  it('uses external URL when internal is unreachable', async () => {
    seed();
    mockSocket('error');
    expect(await refreshHaRoute()).toBe('external');
    expect(applyActiveUrl('wss://ha.example.com/api/websocket')).toBe('wss://ha.example.com/api/websocket');
  });

  it('switches to internal URL when HA answers locally', async () => {
    seed();
    mockSocket('auth_required');
    expect(await refreshHaRoute()).toBe('internal');
    expect(applyActiveUrl('wss://ha.example.com/api/websocket')).toBe('ws://192.168.1.10:8123/api/websocket');
    expect(getCurrentHttpUrl()).toBe('http://192.168.1.10:8123');
  });

  it('rejects an internal host reporting a different HA version', async () => {
    seed({ haVersion: '2026.1.0' });
    mockSocket('auth_required', '2024.5.0');
    expect(await refreshHaRoute()).toBe('external');
  });

  it('stays external when no internal URL is configured', async () => {
    seed({ internalUrl: undefined });
    mockSocket('auth_required');
    expect(await refreshHaRoute()).toBe('external');
  });
});
