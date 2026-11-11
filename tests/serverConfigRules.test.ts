import { describe, expect, it } from 'vitest';
import { cameraSourcesChanged, checkConfigWriteGuards, deepMergeConfig, hasMaterialDashboardConfig, isValidDashboardConfig } from '../server/lib/configRules';

describe('deepMergeConfig', () => {
  it('merges nested objects, replaces arrays, deletes on null, skips undefined', () => {
    const out = deepMergeConfig({ a: { x: 1, y: 2 }, list: [1, 2], gone: 1 }, { a: { y: 3 }, list: [9], gone: null, skip: undefined } as never);
    expect(out).toEqual({ a: { x: 1, y: 3 }, list: [9] });
  });
  it('replaces camera sources wholesale so deleted sources stay deleted', () => {
    const out = deepMergeConfig({ cameras: { sources: { a: 1, b: 2 } } }, { cameras: { sources: { a: 1 } } });
    expect(out).toEqual({ cameras: { sources: { a: 1 } } });
  });
});

describe('isValidDashboardConfig', () => {
  it.each([null, [], {}, 'x', { version: '1' }, { updatedAt: 5 }, { theme: [] }, { mobility: null }])('rejects %j', (v) =>
    expect(isValidDashboardConfig(v)).toBe(false)
  );
  it('accepts a minimal valid config', () => {
    expect(isValidDashboardConfig({ version: 2, theme: {} })).toBe(true);
  });
});

describe('hasMaterialDashboardConfig (data-loss guard)', () => {
  it('is false for empty or default-only configs', () => {
    expect(hasMaterialDashboardConfig({})).toBe(false);
    expect(hasMaterialDashboardConfig({ theme: { preset: 'obsidian' }, rooms: { floorOrder: [] } })).toBe(false);
    expect(hasMaterialDashboardConfig(null)).toBe(false);
  });
  it('is true once the user customised something', () => {
    expect(hasMaterialDashboardConfig({ rooms: { favoriteAreas: ['kitchen'] } })).toBe(true);
    expect(hasMaterialDashboardConfig({ theme: { preset: 'aurora' } })).toBe(true);
    expect(hasMaterialDashboardConfig({ cameras: { sources: { a: {} } } })).toBe(true);
  });
});

describe('checkConfigWriteGuards', () => {
  const custom = { rooms: { favoriteAreas: ['kitchen'] } } as never;
  const base = { currentConfig: custom, currentServerVersion: 5, targetConfig: { theme: {} }, allowEmpty: false, isPartialMerge: false, clientExpectedVersion: 5 };

  it('allows a normal save at the current version', () => {
    expect(checkConfigWriteGuards({ ...base, targetConfig: { rooms: { favoriteAreas: ['a'] } } }).kind).toBe('ok');
  });
  it('refuses an empty payload over a customised config', () => {
    expect(checkConfigWriteGuards(base).kind).toBe('material_guard');
  });
  it('lets allowEmpty, partial merges and explicit camera updates through the material guard', () => {
    expect(checkConfigWriteGuards({ ...base, allowEmpty: true }).kind).toBe('ok');
    expect(checkConfigWriteGuards({ ...base, isPartialMerge: true }).kind).toBe('ok');
    expect(checkConfigWriteGuards({ ...base, targetConfig: { cameras: { sources: {} } } }).kind).toBe('ok');
  });
  it('rejects a stale client version but not partial merges or unknown versions', () => {
    const t = { rooms: { favoriteAreas: ['a'] } };
    expect(checkConfigWriteGuards({ ...base, targetConfig: t, clientExpectedVersion: 4 })).toEqual({ kind: 'version_conflict', clientExpectedVersion: 4 });
    expect(checkConfigWriteGuards({ ...base, targetConfig: t, clientExpectedVersion: 4, isPartialMerge: true }).kind).toBe('ok');
    expect(checkConfigWriteGuards({ ...base, targetConfig: t, clientExpectedVersion: undefined }).kind).toBe('ok');
    expect(checkConfigWriteGuards({ ...base, targetConfig: t, clientExpectedVersion: NaN }).kind).toBe('ok');
  });
  it('has nothing to guard on first write', () => {
    expect(checkConfigWriteGuards({ ...base, currentConfig: null, clientExpectedVersion: 0 }).kind).toBe('ok');
  });
});

describe('cameraSourcesChanged', () => {
  it('is false when sources are absent or echoed back unchanged', () => {
    const cur = { cameras: { sources: { a: { url: 'x' } } } } as never;
    expect(cameraSourcesChanged(cur, {})).toBe(false);
    expect(cameraSourcesChanged(cur, { cameras: { sources: { a: { url: 'x' } } } })).toBe(false);
  });
  it('is true when sources are added, changed or removed', () => {
    const cur = { cameras: { sources: { a: 1 } } } as never;
    expect(cameraSourcesChanged(cur, { cameras: { sources: { a: 2 } } })).toBe(true);
    expect(cameraSourcesChanged(cur, { cameras: { sources: {} } })).toBe(true);
    expect(cameraSourcesChanged(null, { cameras: { sources: { a: 1 } } })).toBe(true);
  });
});
