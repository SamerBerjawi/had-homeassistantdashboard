/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure protocol helpers for the Home Assistant WebSocket client: the callback contract, URL
 * normalisation and the compressed-entity (`subscribe_entities`) state expansion/diffing.
 * No sockets or timers here, so everything is unit-testable.
 */

import type {
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HAFloor,
  HALabel,
  HAState,
  HAConnectionStatus,
  HANativePersistentNotification,
  HANativeRepairIssue
} from '../types';

export interface HAWebSocketCallbacks {
  onStatusChange: (status: HAConnectionStatus, errorMsg?: string) => void;
  onAuthInvalid?: () => Promise<string | null>;
  onRegistriesLoaded: (payload: {
    areas: HAArea[];
    devices: HADevice[];
    entityRegistry: HAEntityRegistryEntry[];
    floors: HAFloor[];
    labels?: HALabel[];
    states: Record<string, HAState>;
    nativeNotifications?: HANativePersistentNotification[];
    nativeRepairs?: HANativeRepairIssue[];
    haVersion?: string;
  }) => void;
  onVersionLoaded?: (version: string) => void;
  onNativeNotificationsLoaded?: (notifications: HANativePersistentNotification[], repairs: HANativeRepairIssue[]) => void;
  onStateChanged: (entityId: string, newState: HAState) => void;
  onStatesBatchUpdated?: (statesList: HAState[]) => void;
  onLogMessage: (type: 'info' | 'service_call' | 'state_changed' | 'warning' | 'error', msg: string, details?: any) => void;
}

export function normalizeHAWebSocketUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Auto-convert HTTP(S) to WS(S)
  if (url.startsWith('http://')) {
    url = 'ws://' + url.slice(7);
  } else if (url.startsWith('https://')) {
    url = 'wss://' + url.slice(8);
  } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    url = 'ws://' + url;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure /api/websocket suffix
  if (!url.endsWith('/api/websocket')) {
    url = url + '/api/websocket';
  }

  return url;
}

// Compressed entity state from `subscribe_entities`: s=state, a=attributes, c=context,
// lc=last_changed, lu=last_updated (epoch seconds; lu omitted when equal to lc)
export interface CompressedState {
  s: string;
  a?: Record<string, any>;
  c?: string | { id: string; parent_id?: string | null; user_id?: string | null };
  lc: number;
  lu?: number;
}

export interface CompressedStateDiff {
  '+'?: Partial<CompressedState>;
  '-'?: { a?: string[] };
}

export interface EntitiesMessage {
  a?: Record<string, CompressedState>;
  c?: Record<string, CompressedStateDiff>;
  r?: string[];
}

const toIsoTime = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();
const toContext = (c: CompressedState['c']) =>
  typeof c === 'string' ? { id: c, parent_id: null, user_id: null } : c;

export function expandCompressedState(entityId: string, cs: CompressedState): HAState {
  return {
    entity_id: entityId,
    state: cs.s,
    attributes: cs.a || {},
    last_changed: toIsoTime(cs.lc),
    last_updated: toIsoTime(cs.lu ?? cs.lc),
    ...(cs.c !== undefined ? { context: toContext(cs.c) } : {})
  } as HAState;
}

export function applyCompressedDiff(previous: HAState, diff: CompressedStateDiff): HAState {
  const added = diff['+'];
  const removedAttrs = diff['-']?.a;
  const next: any = { ...previous };

  // Keep the attributes object when they didn't change, so downstream identity checks hold
  if (added?.a || removedAttrs?.length) {
    const attributes = { ...previous.attributes, ...(added?.a || {}) };
    for (const key of removedAttrs || []) delete attributes[key];
    next.attributes = attributes;
  }
  if (added) {
    if (added.s !== undefined) next.state = added.s;
    if (added.c !== undefined) next.context = toContext(added.c);
    if (added.lc !== undefined) {
      next.last_changed = next.last_updated = toIsoTime(added.lc);
    } else if (added.lu !== undefined) {
      next.last_updated = toIsoTime(added.lu);
    }
  }
  return next;
}
