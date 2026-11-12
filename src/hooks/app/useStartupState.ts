import { useState, useEffect } from 'react';
import type { ToastNotification } from '@/types';
import { deriveStartupState } from '@/services/startupPhase';
import { haWebSocketService } from '@/services/haWebSocket';
import { hasConfiguredHACredentials } from '@/store/useAutoLayoutStore';

interface StartupStateInputs {
  authState: { isDemo: boolean };
  isAuthInitializing: boolean;
  connectionStatus: Parameters<typeof deriveStartupState>[0]['connectionStatus'];
  hasResolvedEntities: boolean;
  showingCachedSnapshot: boolean;
  isLiveMode: boolean;
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
}

// Startup window, loading progress and manual refresh, moved verbatim from App.tsx.
export function useStartupState({
  authState,
  isAuthInitializing,
  connectionStatus,
  hasResolvedEntities,
  showingCachedSnapshot,
  isLiveMode,
  addToast
}: StartupStateInputs) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'connected' && hasResolvedEntities) {
      setHasInitialLoaded(true);
    }
  }, [connectionStatus, hasResolvedEntities]);

  const [hasStartupTimeoutElapsed, setHasStartupTimeoutElapsed] = useState(false);

  useEffect(() => {
    // Graceful startup connection window: after 5.5s, drop full-screen blocking loader so user can interact
    const timer = setTimeout(() => {
      setHasStartupTimeoutElapsed(true);
    }, 5500);
    return () => clearTimeout(timer);
  }, []);

  const { isAppLoading, isConnectionDegraded } = deriveStartupState({
    isDemo: authState.isDemo,
    showingCachedSnapshot,
    isLiveMode,
    hasCredentials: hasConfiguredHACredentials(),
    connectionStatus,
    hasInitialLoaded,
    hasStartupTimeoutElapsed,
    isAuthInitializing
  });

  const [loadingProgress, setLoadingProgress] = useState<number>(15);

  useEffect(() => {
    if (!isAppLoading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(15);
    const t1 = setTimeout(() => setLoadingProgress(35), 400);
    const t2 = setTimeout(() => setLoadingProgress(65), 1000);
    const t3 = setTimeout(() => setLoadingProgress(82), 2000);

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return 92;
        return prev + 1;
      });
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, [isAppLoading]);

  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      if (haWebSocketService && !haWebSocketService.isDemo()) {
        await haWebSocketService.refreshStates();
      }
      window.dispatchEvent(new CustomEvent('had_manual_refresh'));
      addToast({
        title: 'Dashboard Refreshed',
        message: 'All entities, sensors, and telemetry have been updated.',
        type: 'info'
      });
    } catch (err: any) {
      console.warn('[App] Manual refresh error:', err);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  return {
    isManualRefreshing,
    setHasStartupTimeoutElapsed,
    isAppLoading,
    isConnectionDegraded,
    loadingProgress,
    handleManualRefresh
  };
}
