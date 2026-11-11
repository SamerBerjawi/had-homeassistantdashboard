/**
 * Pure rules for ConfigContext's sync lifecycle (see docs/STATE_MACHINE.md).
 *
 * Remote config arrives from three places (initial/silent load, SSE-triggered reload, same-tab or
 * cross-tab broadcast). Each must be treated identically:
 *   1. drag in progress  -> defer (apply when the drag ends)
 *   2. otherwise         -> remote + unsynced local changes + in-flight debounced edits
 *
 * Sync status transitions:
 *   synced <-> syncing, any -> offline_fallback | error (from the storage driver), -> synced on recovery
 */
export type SyncStatus = 'synced' | 'syncing' | 'offline_fallback' | 'error';

export type SyncEvent =
  | { type: 'load_started' }
  | { type: 'load_succeeded' }
  | { type: 'load_deferred' } // remote config received while dragging: nothing wrong, nothing applied yet
  | { type: 'load_failed' }
  | { type: 'driver_status'; status: SyncStatus }
  | { type: 'stream'; state: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' };

export function reduceSyncStatus(current: SyncStatus, event: SyncEvent): SyncStatus {
  switch (event.type) {
    case 'load_started':
      return 'syncing';
    case 'load_succeeded':
    case 'load_deferred':
      return 'synced';
    case 'load_failed':
      return 'offline_fallback';
    case 'driver_status':
      return event.status;
    case 'stream':
      if (event.state === 'connected') return 'synced';
      if (event.state === 'reconnecting') return 'syncing';
      return current;
  }
}

export type RemoteApplyDecision = 'defer' | 'apply';

export function decideRemoteApply(isDragActive: boolean): RemoteApplyDecision {
  return isDragActive ? 'defer' : 'apply';
}

export function hasPendingDelta(delta: object | null | undefined): boolean {
  return Boolean(delta) && Object.keys(delta as object).length > 0;
}

/**
 * Layers local-only changes on top of a remote config so incoming broadcasts never revert them:
 * first changes that never reached the server, then edits still waiting for the debounced save.
 */
export function reconcileRemoteConfig<T extends object>(
  remote: T,
  local: { unsynced?: object | null; pendingDelta?: object | null },
  merge: (base: T, patch: any) => T
): T {
  const withUnsynced = local.unsynced ? merge(remote, local.unsynced) : remote;
  return hasPendingDelta(local.pendingDelta) ? merge(withUnsynced, local.pendingDelta) : withUnsynced;
}

/**
 * Status shown in the UI: a failure always wins; otherwise the initial load counts as syncing so
 * one indicator covers both (previously two separate pills).
 */
export function effectiveSyncStatus(status: SyncStatus, isConfigLoading: boolean): SyncStatus {
  if (status === 'offline_fallback' || status === 'error') return status;
  return isConfigLoading ? 'syncing' : status;
}
