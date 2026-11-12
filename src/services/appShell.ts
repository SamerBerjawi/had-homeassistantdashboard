// Pure helpers for the App shell (src/App.tsx and src/hooks/app/*): tab routing and theme resolution.

export const VALID_TABS = [
  'overview',
  'rooms',
  'energy',
  'security',
  'media',
  'system',
  'network',
  'mobility',
  'health',
  'vacuums',
  'automations',
  'integrations',
  'settings'
] as const;

export type TabKey = typeof VALID_TABS[number];

export type ThemeMode = 'auto' | 'dark' | 'light';

export function hasAnyKey(obj: Record<string, unknown>): boolean {
  for (const _ in obj) return true;
  return false;
}

/** Tab from a URL's `?tab=` query (preferred) or its first path segment; falls back to 'overview'. */
export function getTabFromLocation(search: string, pathname: string): TabKey {
  const searchParams = new URLSearchParams(search);
  const tabParam = searchParams.get('tab')?.toLowerCase();
  if (tabParam && VALID_TABS.includes(tabParam as TabKey)) {
    return tabParam as TabKey;
  }
  const rawPath = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (VALID_TABS.includes(rawPath as TabKey)) {
    return rawPath as TabKey;
  }
  return 'overview';
}

export function getTabFromUrl(): TabKey {
  if (typeof window === 'undefined') return 'overview';
  return getTabFromLocation(window.location.search, window.location.pathname);
}

/**
 * Initial theme mode: the config's mode wins, then the saved `theme_mode` key, then the legacy
 * `theme` key. `getItem` is null when there is no window (storage is then never read).
 */
export function resolveInitialThemeMode(
  configMode: ThemeMode | undefined,
  getItem: ((key: string) => string | null) | null
): ThemeMode {
  if (configMode) return configMode;
  if (getItem) {
    const saved = getItem('theme_mode');
    if (saved === 'auto' || saved === 'dark' || saved === 'light') return saved;
    const oldTheme = getItem('theme');
    if (oldTheme === 'dark') return 'dark';
    if (oldTheme === 'light') return 'light';
  }
  return 'auto';
}

/** 'dark' and 'light' are explicit; anything else follows the system preference (read lazily). */
export function resolveIsDark(mode: string | null | undefined, systemPrefersDark: () => boolean): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemPrefersDark();
}
