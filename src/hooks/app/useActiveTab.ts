import { useState, useEffect } from 'react';
import type { ConfigContextType } from '@/types/userConfig';
import { useAutoLayoutStore } from '@/store/useAutoLayoutStore';
import { PAGE_THEMES } from '@/config/pageThemes';
import { VALID_TABS, getTabFromUrl, type TabKey } from '@/services/appShell';

// Active tab with URL path synchronisation, document title and hidden-page fallback, moved verbatim from App.tsx.
export function useActiveTab(config: ConfigContextType['config']) {
  // Tab State with URL Path Synchronization
  const [activeTab, setActiveTabState] = useState<string>(getTabFromUrl);

  const setActiveTab = (tab: string) => {
    if (tab === 'rooms') {
      useAutoLayoutStore.getState().setSelectedAreaId(null);
    }
    if (tab === 'settings') {
      useAutoLayoutStore.getState().setSelectedSettingsSection(null);
    }
    const validTab = VALID_TABS.includes(tab as TabKey) ? tab : 'overview';
    setActiveTabState(validTab);
    const targetPath = `/${validTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: validTab }, '', targetPath);
    }
  };

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentTab = getTabFromUrl();
      if (currentTab === 'rooms') {
        useAutoLayoutStore.getState().setSelectedAreaId(null);
      }
      if (currentTab === 'settings') {
        useAutoLayoutStore.getState().setSelectedSettingsSection(null);
      }
      setActiveTabState(currentTab);
    };

    window.addEventListener('popstate', handlePopState);

    // Ensure root '/' or malformed path cleanly normalizes in the address bar while preserving query params (e.g. ?code=...&state=...)
    const initialTab = getTabFromUrl();
    const expectedPath = `/${initialTab}`;
    if (window.location.pathname !== expectedPath) {
      const search = window.location.search || '';
      window.history.replaceState({ tab: initialTab }, '', `${expectedPath}${search}`);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update browser tab title to match the active view
  useEffect(() => {
    const theme = PAGE_THEMES[activeTab];
    const label = theme?.title || (activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
    document.title = activeTab === 'overview' ? 'HAD - Home Assistant Dashboard' : `HAD • ${label}`;
  }, [activeTab]);

  // Fallback redirect if current page is hidden by user configuration
  useEffect(() => {
    const hidden = config?.navigation?.hiddenPages || [];
    if (hidden.includes(activeTab) && activeTab !== 'overview' && activeTab !== 'settings') {
      setActiveTab('overview');
    }
  }, [config?.navigation?.hiddenPages, activeTab]);

  return { activeTab, setActiveTab };
}
