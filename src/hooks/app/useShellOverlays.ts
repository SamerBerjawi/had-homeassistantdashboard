import { useState, useEffect } from 'react';
import type { ToastNotification } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useEntityPopup } from '@/contexts/EntityPopupContext';
import { useAlertStore } from '@/store/useAlertStore';

// Toasts, drawers and the "has opened" flags that defer mounting lazy modals/drawers, moved verbatim from App.tsx.
export function useShellOverlays() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isWeatherDrawerOpen, setIsWeatherDrawerOpen] = useState<boolean>(false);
  const { isDrawerOpen: isAlertDrawerOpen, setDrawerOpen: setAlertDrawerOpen } = useAlertStore();

  const isNotificationOpen = isNotificationDrawerOpen || isAlertDrawerOpen;
  const handleOpenNotifications = () => {
    // Mount the drawer in the same render instead of waiting for the effect below
    setHasOpenedNotifications(true);
    setIsNotificationDrawerOpen(true);
    setAlertDrawerOpen(true);
  };
  const handleCloseNotifications = () => {
    setIsNotificationDrawerOpen(false);
    setAlertDrawerOpen(false);
  };

  // Track first open of lazy modals/drawers to preserve exit animations while avoiding eager chunk download
  const { isOpen: isEntityPopupOpen } = useEntityPopup();
  const criticalAlert = useAlertStore((s) => s.criticalAlert);
  const { isAuthModalOpen } = useAuth();

  const [hasOpenedNotifications, setHasOpenedNotifications] = useState(false);

  // Load frequently opened drawers while the app is idle. The notification drawer is then
  // mounted closed (it does no work while closed): opening a lazy component that hasn't
  // rendered yet suspends, and React holds back revealing suspended content for ~300ms.
  useEffect(() => {
    let cancelled = false;
    const prefetch = () => {
      import('@/components/notifications/NotificationDrawer')
        .then(() => {
          if (!cancelled) setHasOpenedNotifications(true);
        })
        .catch(() => {});
      import('@/components/modals/EntityDetailModal')
        .then(() => {
          if (!cancelled) setHasOpenedEntityDetail(true);
        })
        .catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
      };
    }
    const timer = setTimeout(prefetch, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  const [hasOpenedWeather, setHasOpenedWeather] = useState(false);
  const [hasOpenedAuth, setHasOpenedAuth] = useState(false);
  const [hasCriticalAlert, setHasCriticalAlert] = useState(false);
  const [hasOpenedEntityDetail, setHasOpenedEntityDetail] = useState(false);

  useEffect(() => {
    if (isNotificationOpen) setHasOpenedNotifications(true);
  }, [isNotificationOpen]);

  useEffect(() => {
    if (isWeatherDrawerOpen) setHasOpenedWeather(true);
  }, [isWeatherDrawerOpen]);

  useEffect(() => {
    if (isAuthModalOpen) setHasOpenedAuth(true);
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (criticalAlert) setHasCriticalAlert(true);
  }, [criticalAlert]);

  useEffect(() => {
    if (isEntityPopupOpen) setHasOpenedEntityDetail(true);
  }, [isEntityPopupOpen]);

  // Toast System
  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: new Date().toLocaleTimeString()
    };
    setToasts(prev => [...prev.slice(-4), newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toasts,
    setToasts,
    addToast,
    dismissToast,
    isNotificationOpen,
    handleOpenNotifications,
    handleCloseNotifications,
    isWeatherDrawerOpen,
    setIsWeatherDrawerOpen,
    hasOpenedNotifications,
    hasOpenedWeather,
    hasOpenedAuth,
    hasCriticalAlert,
    hasOpenedEntityDetail
  };
}
