import { describe, expect, it } from 'vitest';
import {
  decideRemoteApply,
  hasPendingDelta,
  reconcileRemoteConfig,
  reduceSyncStatus
} from '../src/services/configSyncRules';

const merge = (a: any, b: any) => ({ ...a, ...b });

describe('reconcileRemoteConfig', () => {
  it('returns the remote config untouched when nothing is local', () => {
    const remote = { a: 1 };
    expect(reconcileRemoteConfig(remote, { unsynced: null, pendingDelta: {} }, merge)).toBe(remote);
  });
  it('layers unsynced changes, then pending edits, on top of remote', () => {
    const out = reconcileRemoteConfig({ a: 1, b: 1, c: 1 }, { unsynced: { b: 2, c: 2 }, pendingDelta: { c: 3 } }, merge);
    expect(out).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe('decideRemoteApply / hasPendingDelta', () => {
  it('defers while dragging', () => {
    expect(decideRemoteApply(true)).toBe('defer');
    expect(decideRemoteApply(false)).toBe('apply');
  });
  it('detects empty deltas', () => {
    expect(hasPendingDelta({})).toBe(false);
    expect(hasPendingDelta(null)).toBe(false);
    expect(hasPendingDelta({ x: 1 })).toBe(true);
  });
});

describe('reduceSyncStatus', () => {
  it('follows a load lifecycle', () => {
    let s = reduceSyncStatus('synced', { type: 'load_started' });
    expect(s).toBe('syncing');
    expect(reduceSyncStatus(s, { type: 'load_succeeded' })).toBe('synced');
    expect(reduceSyncStatus(s, { type: 'load_failed' })).toBe('offline_fallback');
    expect(reduceSyncStatus(s, { type: 'load_deferred' })).toBe('synced');
  });
  it('takes the status reported by the storage driver', () => {
    expect(reduceSyncStatus('synced', { type: 'driver_status', status: 'error' })).toBe('error');
  });
  it('maps the SSE stream states and ignores the rest', () => {
    expect(reduceSyncStatus('error', { type: 'stream', state: 'connected' })).toBe('synced');
    expect(reduceSyncStatus('synced', { type: 'stream', state: 'reconnecting' })).toBe('syncing');
    expect(reduceSyncStatus('error', { type: 'stream', state: 'disconnected' })).toBe('error');
    expect(reduceSyncStatus('offline_fallback', { type: 'stream', state: 'connecting' })).toBe('offline_fallback');
  });
});
