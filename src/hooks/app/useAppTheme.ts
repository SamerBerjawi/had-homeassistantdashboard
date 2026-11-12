import { useState, useEffect } from 'react';
import type { ConfigContextType } from '@/types/userConfig';
import { resolveInitialThemeMode, resolveIsDark } from '@/services/appShell';

// Theme mode, resolved dark mode and background style, moved verbatim from App.tsx.
// Theme resolution delegates to the pure helpers in services/appShell.ts.
export function useAppTheme(config: ConfigContextType['config'], updateConfig: ConfigContextType['updateConfig']) {
  // Theme Mode State: 'auto' (system OS) | 'dark' (OLED) | 'light' (Daylight)
  const [themeMode, setThemeMode] = useState<'auto' | 'dark' | 'light'>(() => {
    return resolveInitialThemeMode(
      config?.theme?.mode,
      typeof window !== 'undefined' ? (key) => localStorage.getItem(key) : null
    );
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = config?.theme?.mode || config?.theme?.themeMode || localStorage.getItem('theme_mode');
      return resolveIsDark(savedMode, () => window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Sync theme with config when remote config changes
  useEffect(() => {
    const currentConfigMode = config?.theme?.mode || config?.theme?.themeMode;
    if (currentConfigMode && currentConfigMode !== themeMode) {
      setThemeMode(currentConfigMode);
    }
  }, [config?.theme?.mode, config?.theme?.themeMode]);

  const handleToggleDarkMode = (next?: boolean) => {
    const nextDark = next !== undefined ? next : !darkMode;
    const nextMode = nextDark ? 'dark' : 'light';
    setThemeMode(nextMode);
    setDarkMode(nextDark);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', nextDark ? '#020617' : '#f8fafc');
    }
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        mode: nextMode,
        themeMode: nextMode
      }
    }));
  };

  useEffect(() => {
    const applyTheme = () => {
      const isDark = resolveIsDark(themeMode, () => window.matchMedia('(prefers-color-scheme: dark)').matches);
      setDarkMode(isDark);
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#020617' : '#f8fafc');
      }
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (themeMode === 'auto') {
        applyTheme();
      }
    };
    mql.addEventListener('change', handleSystemChange);
    return () => mql.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  // Background Style State: 'glow' (Ambient Blobs) | 'flat' (Minimalist Solid)
  const [backgroundStyle, setBackgroundStyle] = useState<'glow' | 'flat'>(() => {
    if (config?.theme?.backgroundStyle) return config.theme.backgroundStyle;
    if (config?.preferences?.backgroundStyle) return config.preferences.backgroundStyle;
    return 'glow';
  });

  useEffect(() => {
    const style = config?.theme?.backgroundStyle || config?.preferences?.backgroundStyle;
    if (style && style !== backgroundStyle) {
      setBackgroundStyle(style);
    }
  }, [config?.theme?.backgroundStyle, config?.preferences?.backgroundStyle]);

  const handleSetBackgroundStyle = (style: 'glow' | 'flat') => {
    setBackgroundStyle(style);
    updateConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        backgroundStyle: style
      },
      preferences: {
        ...(prev.preferences || {}),
        backgroundStyle: style
      }
    }));
  };

  return {
    themeMode,
    setThemeMode,
    darkMode,
    handleToggleDarkMode,
    backgroundStyle,
    handleSetBackgroundStyle
  };
}
