import { describe, expect, it } from 'vitest';
import { hasMaterialDashboardConfig, mergeConfig, mergeDelta } from '../src/services/configMerge';
import * as storageService from '../src/services/configStorageService';
import { DEFAULT_USER_CONFIG, UserDashboardConfig } from '../src/types/userConfig';

describe('configStorageService re-exports', () => {
  it('re-exports the merge helpers from configMerge', () => {
    expect(storageService.mergeDelta).toBe(mergeDelta);
    expect(storageService.mergeConfig).toBe(mergeConfig);
    expect(storageService.hasMaterialDashboardConfig).toBe(hasMaterialDashboardConfig);
  });
});

describe('mergeDelta', () => {
  it('deep merges nested sections without injecting defaults', () => {
    const result = mergeDelta(
      { theme: { accentColor: '#fff' } } as Partial<UserDashboardConfig>,
      { theme: { glassOpacity: 0.5 } } as Partial<UserDashboardConfig>
    );
    expect(result).toEqual({ theme: { accentColor: '#fff', glassOpacity: 0.5 } });
  });

  it('skips undefined values and deletes keys set to null', () => {
    const result = mergeDelta(
      { theme: { accentColor: '#fff', glassOpacity: 0.5 } } as Partial<UserDashboardConfig>,
      { theme: { accentColor: null, glassOpacity: undefined } } as unknown as Partial<UserDashboardConfig>
    );
    expect(result).toEqual({ theme: { glassOpacity: 0.5 } });
  });

  it('replaces arrays instead of merging them', () => {
    const result = mergeDelta(
      { rooms: { floorOrder: ['a', 'b'] } } as Partial<UserDashboardConfig>,
      { rooms: { floorOrder: ['c'] } } as Partial<UserDashboardConfig>
    );
    expect(result.rooms?.floorOrder).toEqual(['c']);
  });

  it('replaces camera sources wholesale so deleted sources are not resurrected', () => {
    const result = mergeDelta(
      { cameras: { sources: { a: { url: 'x' }, b: { url: 'y' } } } } as unknown as Partial<UserDashboardConfig>,
      { cameras: { sources: { b: { url: 'z' } } } } as unknown as Partial<UserDashboardConfig>
    );
    expect(result.cameras?.sources).toEqual({ b: { url: 'z' } });
  });

  it('does not mutate its inputs', () => {
    const base = { theme: { accentColor: '#fff' } } as Partial<UserDashboardConfig>;
    mergeDelta(base, { theme: { accentColor: '#000' } } as Partial<UserDashboardConfig>);
    expect(base).toEqual({ theme: { accentColor: '#fff' } });
  });
});

describe('hasMaterialDashboardConfig (client)', () => {
  it('treats empty, non-object and default-only data as not material', () => {
    expect(hasMaterialDashboardConfig(null)).toBe(false);
    expect(hasMaterialDashboardConfig([])).toBe(false);
    expect(hasMaterialDashboardConfig({})).toBe(false);
    expect(hasMaterialDashboardConfig({ theme: { preset: 'obsidian' }, rooms: { floorOrder: [] } })).toBe(false);
  });

  it('detects meaningful customisations', () => {
    expect(hasMaterialDashboardConfig({ rooms: { favoriteAreas: ['kitchen'] } })).toBe(true);
    expect(hasMaterialDashboardConfig({ entities: { nameOverrides: { 'light.a': 'A' } } })).toBe(true);
    expect(hasMaterialDashboardConfig({ theme: { preset: 'aurora' } })).toBe(true);
    expect(hasMaterialDashboardConfig({ cameras: { sources: { a: {} } } })).toBe(true);
    expect(hasMaterialDashboardConfig({ overview: { hideBadges: false } })).toBe(true);
    expect(hasMaterialDashboardConfig({ preferences: { tempUnit: 'C' } })).toBe(true);
  });
});

describe('mergeConfig', () => {
  it('returns the defaults for a missing base and partial', () => {
    expect(mergeConfig(null, null)).toBe(DEFAULT_USER_CONFIG);
    expect(mergeConfig(undefined, undefined)).toBe(DEFAULT_USER_CONFIG);
  });

  it('fills a partial base with defaults', () => {
    const result = mergeConfig({ theme: { accentColor: '#000' } } as Partial<UserDashboardConfig>);
    expect(result.theme.accentColor).toBe('#000');
    expect(result.theme.glassOpacity).toBe(DEFAULT_USER_CONFIG.theme.glassOpacity);
    expect(result.mobility.car).toEqual(DEFAULT_USER_CONFIG.mobility.car);
  });

  it('overlays a partial, keeping version and copying arrays', () => {
    const base = mergeConfig(DEFAULT_USER_CONFIG, { version: 3 } as Partial<UserDashboardConfig>);
    const floorOrder = ['ground', 'first'];
    const result = mergeConfig(base, { rooms: { floorOrder } } as Partial<UserDashboardConfig>);
    expect(result.version).toBe(3);
    expect(result.rooms.floorOrder).toEqual(floorOrder);
    expect(result.rooms.floorOrder).not.toBe(floorOrder);
    expect(result.rooms.hiddenFloors).toEqual([]);
  });

  it('keeps an explicit updatedAt and stamps one otherwise', () => {
    expect(mergeConfig(DEFAULT_USER_CONFIG, { updatedAt: '2020-01-01T00:00:00.000Z' }).updatedAt).toBe(
      '2020-01-01T00:00:00.000Z'
    );
    expect(mergeConfig(DEFAULT_USER_CONFIG, {}).updatedAt).not.toBe(DEFAULT_USER_CONFIG.updatedAt);
  });

  it('replaces camera sources wholesale when the partial provides them', () => {
    const base = mergeConfig(DEFAULT_USER_CONFIG, {
      cameras: { ...DEFAULT_USER_CONFIG.cameras, sources: { a: { url: 'x' }, b: { url: 'y' } } }
    } as unknown as Partial<UserDashboardConfig>);
    const result = mergeConfig(base, {
      cameras: { sources: { b: { url: 'z' } } }
    } as unknown as Partial<UserDashboardConfig>);
    expect(result.cameras.sources).toEqual({ b: { url: 'z' } });
    expect(result.cameras.mutedByDefault).toBe(DEFAULT_USER_CONFIG.cameras.mutedByDefault);
  });

  it('merges overview hideBadges only when it is a boolean', () => {
    const base = mergeConfig(DEFAULT_USER_CONFIG, { overview: { hideBadges: true } } as Partial<UserDashboardConfig>);
    expect(base.overview?.hideBadges).toBe(true);
    const result = mergeConfig(base, { overview: { tileOrder: ['a'] } } as Partial<UserDashboardConfig>);
    expect(result.overview?.hideBadges).toBe(true);
    expect(result.overview?.tileOrder).toEqual(['a']);
  });
});
