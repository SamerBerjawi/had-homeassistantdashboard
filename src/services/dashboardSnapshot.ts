/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Last-known Home Assistant data, kept in IndexedDB so the dashboard can render immediately
 * on launch while the live connection is established, instead of a full-screen loader.
 */

import type { HAArea, HADevice, HAEntityRegistryEntry, HAFloor, HALabel, HAState } from '../types';

export interface DashboardSnapshot {
  serverUrl: string;
  savedAt: number;
  haVersion?: string | null;
  areas: HAArea[];
  devices: HADevice[];
  entityRegistry: HAEntityRegistryEntry[];
  floors: HAFloor[];
  labels: HALabel[];
  states: Record<string, HAState>;
}

const DB_NAME = 'had-dashboard-cache';
const STORE = 'snapshots';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Never shown from cache: a stale "locked" or "disarmed" is worse than "unavailable" for the
// second or two until Home Assistant reports the real state
const isSecurityCriticalEntity = (entityId: string) =>
  entityId.startsWith('lock.') || entityId.startsWith('alarm_control_panel.');

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function runRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const request = run(tx.objectStore(STORE));
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => resolve(null);
          tx.oncomplete = () => db.close();
          tx.onabort = () => db.close();
        } catch {
          db.close();
          resolve(null);
        }
      })
  );
}

// The same instance may be stored as ws://host/api/websocket or http://host; key by host
const snapshotKey = (serverUrl: string) =>
  serverUrl
    .trim()
    .toLowerCase()
    .replace(/^(wss?|https?):\/\//, '')
    .replace(/\/api\/websocket\/?$/, '')
    .replace(/\/+$/, '');

export async function loadDashboardSnapshot(serverUrl: string): Promise<DashboardSnapshot | null> {
  if (!serverUrl) return null;
  const snapshot = await runRequest<DashboardSnapshot>('readonly', (store) => store.get(snapshotKey(serverUrl)));
  if (!snapshot || !snapshot.states || Date.now() - snapshot.savedAt > MAX_AGE_MS) return null;
  return snapshot;
}

export async function saveDashboardSnapshot(snapshot: Omit<DashboardSnapshot, 'savedAt'>): Promise<void> {
  if (!snapshot.serverUrl) return;
  const states: Record<string, HAState> = {};
  for (const [entityId, state] of Object.entries(snapshot.states)) {
    if (!isSecurityCriticalEntity(entityId)) states[entityId] = state;
  }
  await runRequest('readwrite', (store) =>
    store.put({ ...snapshot, states, savedAt: Date.now() }, snapshotKey(snapshot.serverUrl))
  );
}

export async function clearDashboardSnapshots(): Promise<void> {
  await runRequest('readwrite', (store) => store.clear());
}
