/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from '../../services/haWebSocket';
import { loadDashboardSnapshot, saveDashboardSnapshot, DashboardSnapshot } from '../../services/dashboardSnapshot';
import { getCachedServerUrl, hasConfiguredHACredentialsAtLoad } from './authCache';
import type { AutoLayoutStoreState } from './types';

// --- Cached snapshot for instant start -------------------------------------------------------
export const SNAPSHOT_SAVE_INTERVAL_MS = 2 * 60 * 1000;

export const SNAPSHOT_READ_BUDGET_MS = 400;

let hasLiveRegistries = false;

export let lastSnapshotSaveAt = 0;

export let snapshotSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Start reading the cache as soon as the app loads, before React mounts
export const earlySnapshot: Promise<DashboardSnapshot | null> = hasConfiguredHACredentialsAtLoad()
  ? loadDashboardSnapshot(getCachedServerUrl()).catch(() => null)
  : Promise.resolve(null);

export function saveSnapshotNow(get: () => AutoLayoutStoreState) {
  if (snapshotSaveTimer) {
    clearTimeout(snapshotSaveTimer);
    snapshotSaveTimer = null;
  }
  const s = get();
  if (!hasLiveRegistries || !s.isLiveMode || haWebSocketService.isDemo() || !s.serverUrl) return;
  lastSnapshotSaveAt = Date.now();
  void saveDashboardSnapshot({
    serverUrl: s.serverUrl,
    haVersion: s.haCoreVersion,
    areas: s.rawAreas,
    devices: s.rawDevices,
    entityRegistry: s.rawEntityRegistry,
    floors: s.rawFloors,
    labels: s.rawLabels,
    states: s.rawStates
  }).catch(() => {});
}

/** Throttled: state events are frequent, but the snapshot only needs to be roughly current. */
export function scheduleSnapshotSave(get: () => AutoLayoutStoreState) {
  if (snapshotSaveTimer) return;
  const wait = Math.max(0, SNAPSHOT_SAVE_INTERVAL_MS - (Date.now() - lastSnapshotSaveAt));
  snapshotSaveTimer = setTimeout(() => saveSnapshotNow(get), wait);
}

export const getHasLiveRegistries = () => hasLiveRegistries;
export const setHasLiveRegistries = (value: boolean) => {
  hasLiveRegistries = value;
};

