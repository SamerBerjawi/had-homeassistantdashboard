/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared notification list for the bell, sidebar and notification drawer.
 */

import { useShallow } from 'zustand/react/shallow';
import { useAutoLayoutStore, AutoLayoutStoreState } from '../store/useAutoLayoutStore';
import { useAlertStore, AlertItem } from '../store/useAlertStore';
import { extractHANotifications } from '../services/notificationsService';
import { HANotificationItem } from '../types/notifications';

const EMPTY: HANotificationItem[] = [];

// One computation per input change, shared by every consumer
let cachedInputs: unknown[] | null = null;
let cachedResult: HANotificationItem[] = EMPTY;

function selectNotifications(s: AutoLayoutStoreState, storeAlerts: AlertItem[]): HANotificationItem[] {
  const inputs = [
    s.domainGroups,
    s.states,
    s.entityRegistry,
    s.nativeNotifications,
    s.nativeRepairs,
    s.dismissedNotificationIds,
    storeAlerts
  ];
  if (cachedInputs && inputs.every((value, i) => Object.is(value, cachedInputs![i]))) {
    return cachedResult;
  }
  cachedInputs = inputs;
  cachedResult = extractHANotifications({
    domainGroups: s.domainGroups,
    states: s.states,
    entityRegistry: s.entityRegistry,
    nativeNotifications: s.nativeNotifications,
    nativeRepairs: s.nativeRepairs,
    dismissedNotificationIds: s.dismissedNotificationIds,
    callHAService: s.callHAService,
    dismissNotification: s.dismissNotification,
    updateEntityState: s.updateEntityState,
    installUpdate: s.installUpdate,
    skipUpdate: s.skipUpdate,
    clearSkippedUpdate: s.clearSkippedUpdate,
    storeAlerts
  });
  return cachedResult;
}

/**
 * The full notification list. Pass `enabled = false` while the list isn't shown (e.g. a closed
 * drawer) to skip the work and stay out of re-renders.
 */
export function useHANotifications(enabled = true): HANotificationItem[] {
  const storeAlerts = useAlertStore((s) => s.alerts);
  return useAutoLayoutStore((s) => (enabled ? selectNotifications(s, storeAlerts) : EMPTY));
}

export interface HANotificationSummary {
  total: number;
  updates: number;
  hasCritical: boolean;
  hasWarning: boolean;
}

/**
 * Counts and severity flags only. Badges re-render when these change, not on every
 * Home Assistant state event that rebuilds the list.
 */
export function useHANotificationSummary(): HANotificationSummary {
  const storeAlerts = useAlertStore((s) => s.alerts);
  return useAutoLayoutStore(
    useShallow((s) => {
      const list = selectNotifications(s, storeAlerts);
      let updates = 0;
      let hasCritical = false;
      let hasWarning = false;
      for (const n of list) {
        if (n.category === 'update' && !n.skippedVersion) updates++;
        if (n.severity === 'critical') hasCritical = true;
        if (n.severity === 'warning' || n.severity === 'error') hasWarning = true;
      }
      return { total: list.length, updates, hasCritical, hasWarning };
    })
  );
}
