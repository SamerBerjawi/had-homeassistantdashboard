/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export const LockEntityFeature = {
  OPEN: 1
};

export interface LockCapabilities {
  isLocked: boolean;
  isUnlocked: boolean;
  isLocking: boolean;
  isUnlocking: boolean;
  isJammed: boolean;
  state: string;
  supportsOpen: boolean;
  batteryPct?: number;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectLockCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): LockCapabilities {
  if (!entity) {
    return {
      isLocked: true,
      isUnlocked: false,
      isLocking: false,
      isUnlocking: false,
      isJammed: false,
      state: 'locked',
      supportsOpen: false,
      friendlyName: 'Smart Lock'
    };
  }

  const attrs = entity.attributes || {};
  const state = String(entity.state || 'locked').toLowerCase();
  const isLocked = state === 'locked';
  const isUnlocked = state === 'unlocked';
  const isLocking = state === 'locking';
  const isUnlocking = state === 'unlocking';
  const isJammed = state === 'jammed';

  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;

  // Supported Features Bitmask
  const sf = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
  const supportsOpen = (sf & LockEntityFeature.OPEN) !== 0;

  // Battery
  const batteryPct =
    typeof attrs.battery_level === 'number'
      ? attrs.battery_level
      : typeof attrs.battery === 'number'
      ? attrs.battery
      : 'batteryPct' in entity && typeof (entity as any).batteryPct === 'number'
      ? (entity as any).batteryPct
      : undefined;

  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    isLocked,
    isUnlocked,
    isLocking,
    isUnlocking,
    isJammed,
    state,
    supportsOpen,
    batteryPct,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
