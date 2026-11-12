import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VALID_TABS,
  getTabFromLocation,
  getTabFromUrl,
  hasAnyKey,
  resolveInitialThemeMode,
  resolveIsDark
} from '../src/services/appShell';

describe('hasAnyKey', () => {
  it('is false for an empty object and true once any key exists', () => {
    expect(hasAnyKey({})).toBe(false);
    expect(hasAnyKey({ a: undefined })).toBe(true);
    expect(hasAnyKey({ 'light.kitchen': { state: 'on' } })).toBe(true);
  });
});

describe('getTabFromLocation', () => {
  it('prefers a valid ?tab= query (case-insensitive) over the path', () => {
    expect(getTabFromLocation('?tab=Energy', '/rooms')).toBe('energy');
  });
  it('ignores an unknown ?tab= and falls back to the path', () => {
    expect(getTabFromLocation('?tab=nope', '/security')).toBe('security');
  });
  it('reads the path, trimming slashes and case', () => {
    expect(getTabFromLocation('', '/Settings/')).toBe('settings');
    expect(getTabFromLocation('?code=abc&state=xyz', '//media')).toBe('media');
  });
  it('falls back to overview for root, unknown or nested paths', () => {
    expect(getTabFromLocation('', '/')).toBe('overview');
    expect(getTabFromLocation('', '/unknown')).toBe('overview');
    expect(getTabFromLocation('', '/rooms/kitchen')).toBe('overview');
  });
  it('accepts every valid tab as a path', () => {
    for (const tab of VALID_TABS) expect(getTabFromLocation('', `/${tab}`)).toBe(tab);
  });
});

describe('getTabFromUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('returns overview without a window (node env)', () => {
    expect(getTabFromUrl()).toBe('overview');
  });
  it('reads window.location when a window exists', () => {
    vi.stubGlobal('window', { location: { search: '?tab=health', pathname: '/' } });
    expect(getTabFromUrl()).toBe('health');
  });
});

describe('resolveInitialThemeMode', () => {
  const storage = (values: Record<string, string>) => (key: string) => values[key] ?? null;

  it('uses the config mode first without reading storage', () => {
    const getItem = vi.fn(() => 'light');
    expect(resolveInitialThemeMode('dark', getItem)).toBe('dark');
    expect(getItem).not.toHaveBeenCalled();
  });
  it('uses a valid saved theme_mode', () => {
    expect(resolveInitialThemeMode(undefined, storage({ theme_mode: 'light', theme: 'dark' }))).toBe('light');
    expect(resolveInitialThemeMode(undefined, storage({ theme_mode: 'auto', theme: 'dark' }))).toBe('auto');
  });
  it('falls back to the legacy theme key when theme_mode is missing or invalid', () => {
    expect(resolveInitialThemeMode(undefined, storage({ theme: 'dark' }))).toBe('dark');
    expect(resolveInitialThemeMode(undefined, storage({ theme_mode: 'bogus', theme: 'light' }))).toBe('light');
  });
  it('defaults to auto with nothing saved or no storage', () => {
    expect(resolveInitialThemeMode(undefined, storage({ theme: 'sepia' }))).toBe('auto');
    expect(resolveInitialThemeMode(undefined, null)).toBe('auto');
  });
});

describe('resolveIsDark', () => {
  it('honours explicit modes without consulting the system', () => {
    const system = vi.fn(() => true);
    expect(resolveIsDark('dark', system)).toBe(true);
    expect(resolveIsDark('light', system)).toBe(false);
    expect(system).not.toHaveBeenCalled();
  });
  it('follows the system preference for auto, missing or unknown modes', () => {
    expect(resolveIsDark('auto', () => true)).toBe(true);
    expect(resolveIsDark('auto', () => false)).toBe(false);
    expect(resolveIsDark(null, () => true)).toBe(true);
    expect(resolveIsDark(undefined, () => false)).toBe(false);
    expect(resolveIsDark('sepia', () => true)).toBe(true);
  });
});
