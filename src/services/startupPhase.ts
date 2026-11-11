/**
 * App startup as one named phase instead of scattered boolean combinations in App.tsx
 * (see docs/STATE_MACHINE.md).
 *
 *   loading  -> ready          (connected and entities resolved)
 *   loading  -> degraded       (5.5s startup window elapsed, or auth failed, and HA is not connected)
 *   cached / demo              (never block on a loader)
 *
 * Precedence: demo > cached > loading > degraded > ready.
 */
export type StartupPhase = 'demo' | 'cached' | 'loading' | 'degraded' | 'ready';

export interface StartupInputs {
  isDemo: boolean;
  showingCachedSnapshot: boolean;
  isLiveMode: boolean;
  hasCredentials: boolean;
  connectionStatus: string;
  hasInitialLoaded: boolean;
  hasStartupTimeoutElapsed: boolean;
  isAuthInitializing: boolean;
}

export interface StartupState {
  phase: StartupPhase;
  /** Block the UI with the full-screen loader. */
  isAppLoading: boolean;
  /** Live mode, startup window over, and HA is down: show the shared retryable error banner. */
  isConnectionDegraded: boolean;
}

export function deriveStartupState(i: StartupInputs): StartupState {
  const isConnectingToHA =
    !i.hasStartupTimeoutElapsed &&
    (i.isLiveMode || i.hasCredentials) &&
    i.connectionStatus !== 'connected' &&
    i.connectionStatus !== 'auth_failed';
  const isInitialSyncPending =
    !i.hasStartupTimeoutElapsed && i.isLiveMode && !i.hasInitialLoaded && i.connectionStatus !== 'auth_failed';
  // With last session's data on screen there is nothing to block on: live data replaces it
  const isAppLoading =
    !i.isDemo &&
    !i.showingCachedSnapshot &&
    (isConnectingToHA || isInitialSyncPending || (i.isAuthInitializing && i.hasCredentials));
  const isConnectionDegraded =
    i.isLiveMode &&
    i.hasStartupTimeoutElapsed &&
    (i.connectionStatus === 'disconnected' || i.connectionStatus === 'error');

  let phase: StartupPhase;
  if (i.isDemo) phase = 'demo';
  else if (i.showingCachedSnapshot) phase = 'cached';
  else if (isAppLoading) phase = 'loading';
  else if (isConnectionDegraded) phase = 'degraded';
  else phase = 'ready';

  return { phase, isAppLoading, isConnectionDegraded };
}
