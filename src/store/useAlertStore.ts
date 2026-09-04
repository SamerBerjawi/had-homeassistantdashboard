/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Event & Alert Center Store
 * Manages transient toasts, active persistent alerts, and critical emergency modals.
 */

import { create } from 'zustand';
import { haWebSocketService } from '../services/haWebSocket';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 
  | 'persistent_notification' 
  | 'security' 
  | 'hazard' 
  | 'appliance' 
  | 'system' 
  | 'update';

export interface AlertToast {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category?: AlertCategory;
  icon?: string;
  iconType?: string;
  entityId?: string;
  areaName?: string;
  durationMs?: number; // 0 = persistent (no auto-dismiss), default = 5000ms
  timestamp: number;
  haNotificationId?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  timestamp: number;
  entityId?: string;
  areaName?: string;
  isRead: boolean;
  isDismissed: boolean;
  haNotificationId?: string;
}

export interface CriticalAlertData {
  id: string;
  entityId: string;
  title: string;
  message: string;
  sensorType: 'smoke' | 'gas' | 'co' | 'moisture' | 'safety' | 'alarm' | 'hazard';
  areaName?: string;
  timestamp: number;
  acknowledged: boolean;
}

interface AlertStoreState {
  toasts: AlertToast[];
  alerts: AlertItem[];
  criticalAlert: CriticalAlertData | null;
  isDrawerOpen: boolean;
  
  // Actions
  addToast: (toast: Omit<AlertToast, 'id' | 'timestamp'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp' | 'isRead' | 'isDismissed'> & { id?: string }) => string;
  dismissAlert: (id: string, haNotificationId?: string) => Promise<void>;
  clearAllAlerts: () => Promise<void>;
  markAllAsRead: () => void;
  
  triggerCriticalAlert: (alert: Omit<CriticalAlertData, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeCriticalAlert: () => void;
  
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
}

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  toasts: [],
  alerts: [],
  criticalAlert: null,
  isDrawerOpen: false,

  addToast: (toastData) => {
    const id = toastData.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: AlertToast = {
      ...toastData,
      id,
      timestamp: Date.now(),
      durationMs: toastData.durationMs !== undefined ? toastData.durationMs : 5000
    };

    set((state) => ({
      // Limit to 5 active toasts on screen at once to avoid clutter
      toasts: [newToast, ...state.toasts.filter((t) => t.id !== id)].slice(0, 5)
    }));

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  addAlert: (alertData) => {
    const id = alertData.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAlert: AlertItem = {
      ...alertData,
      id,
      timestamp: Date.now(),
      isRead: false,
      isDismissed: false
    };

    set((state) => {
      // Deduplicate alert by ID
      const filtered = state.alerts.filter((a) => a.id !== id);
      return {
        alerts: [newAlert, ...filtered]
      };
    });

    return id;
  },

  dismissAlert: async (id, haNotificationId) => {
    // 1. Remove from alert list locally
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id)
    }));

    // 2. Also remove any matching toast
    get().removeToast(id);

    // 3. If tied to a Home Assistant persistent notification, call HA service to clear it everywhere
    const targetHaId = haNotificationId || (id.startsWith('pn_') ? id.replace('pn_', '') : null);
    if (targetHaId) {
      try {
        await haWebSocketService.callService('persistent_notification', 'dismiss', {
          notification_id: targetHaId
        });
      } catch (err) {
        console.warn(`[AlertStore] Failed to dismiss HA persistent_notification ${targetHaId}:`, err);
      }
    }
  },

  clearAllAlerts: async () => {
    const currentAlerts = get().alerts;
    set({ alerts: [], toasts: [] });

    // Dismiss all HA persistent notifications in bulk
    for (const alert of currentAlerts) {
      const targetHaId = alert.haNotificationId || (alert.id.startsWith('pn_') ? alert.id.replace('pn_', '') : null);
      if (targetHaId) {
        try {
          await haWebSocketService.callService('persistent_notification', 'dismiss', {
            notification_id: targetHaId
          });
        } catch {}
      }
    }
  },

  markAllAsRead: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, isRead: true }))
    }));
  },

  triggerCriticalAlert: (criticalData) => {
    const criticalId = `crit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullCritical: CriticalAlertData = {
      ...criticalData,
      id: criticalId,
      timestamp: Date.now(),
      acknowledged: false
    };

    set({ criticalAlert: fullCritical });

    // Also add as a critical alert and persistent toast
    get().addAlert({
      id: criticalId,
      title: criticalData.title,
      message: criticalData.message,
      severity: 'critical',
      category: 'hazard',
      entityId: criticalData.entityId,
      areaName: criticalData.areaName
    });

    get().addToast({
      id: criticalId,
      title: criticalData.title,
      message: criticalData.message,
      severity: 'critical',
      category: 'hazard',
      entityId: criticalData.entityId,
      areaName: criticalData.areaName,
      durationMs: 0 // Keep on screen until acknowledged
    });
  },

  acknowledgeCriticalAlert: () => {
    set((state) => {
      if (!state.criticalAlert) return { criticalAlert: null };
      return {
        criticalAlert: {
          ...state.criticalAlert,
          acknowledged: true
        }
      };
    });

    // Dismiss after acknowledgement animation
    setTimeout(() => {
      set({ criticalAlert: null });
    }, 300);
  },

  setDrawerOpen: (open) => {
    set({ isDrawerOpen: open });
    if (open) {
      get().markAllAsRead();
    }
  },

  toggleDrawer: () => {
    const nextState = !get().isDrawerOpen;
    get().setDrawerOpen(nextState);
  }
}));
