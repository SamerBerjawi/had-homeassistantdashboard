/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAState } from '../../types';
import { useAlertStore } from '../useAlertStore';
import { scheduleRecompute } from './recompute';
import type { AutoLayoutStoreState } from './types';

// Last state reported by Home Assistant for each entity. Optimistic writes from updateEntityState
// never touch this, so a failed service call can restore what HA actually said.
export const confirmedStates = new Map<string, HAState>();

export const rememberConfirmedStates = (statesList: Iterable<HAState>) => {
  for (const s of statesList) {
    if (s?.entity_id) confirmedStates.set(s.entity_id, s);
  }
};

// In live mode these entities only ever show state reported by Home Assistant. Guessing
// "unlocked" or "disarmed" when the call may have failed (wrong code, jammed bolt) is unsafe.
export const isSecurityCriticalEntity = (entityId: string) =>
  entityId.startsWith('lock.') || entityId.startsWith('alarm_control_panel.');

export const collectServiceEntityIds = (serviceData: Record<string, any>, target: any): string[] => {
  const ids = new Set<string>();
  for (const raw of [target?.entity_id, serviceData?.entity_id]) {
    if (!raw) continue;
    for (const id of Array.isArray(raw) ? raw : [raw]) {
      if (typeof id === 'string') ids.add(id);
    }
  }
  return [...ids];
};

// HA rejects with plain { code, message } objects; normalize so callers can rely on err.message.
export const toServiceError = (err: any): Error => {
  if (err instanceof Error) return err;
  const error = new Error(err?.message || String(err || 'Service call failed'));
  if (err?.code) (error as any).code = err.code;
  return error;
};

export const restoreConfirmedStates = (set: any, get: any, entityIds: string[]) => {
  const restored: Record<string, HAState> = {};
  for (const id of entityIds) {
    const confirmed = confirmedStates.get(id);
    if (confirmed) restored[id] = confirmed;
  }
  if (Object.keys(restored).length === 0) return;
  set((prev: AutoLayoutStoreState) => ({
    states: { ...prev.states, ...restored },
    rawStates: { ...prev.rawStates, ...restored }
  }));
  scheduleRecompute(get);
};

export const reportServiceFailure = (domain: string, service: string, err: Error) => {
  useAlertStore.getState().addToast({
    id: `ha_service_error_${domain}_${service}`,
    title: 'Home Assistant action failed',
    message: `${domain}.${service}: ${err.message}`,
    severity: 'warning',
    category: 'system'
  });
};
