import { describe, expect, it } from 'vitest';
import { deriveStartupState, type StartupInputs } from '../src/services/startupPhase';

const base: StartupInputs = {
  isDemo: false,
  showingCachedSnapshot: false,
  isLiveMode: true,
  hasCredentials: true,
  connectionStatus: 'connecting',
  hasInitialLoaded: false,
  hasStartupTimeoutElapsed: false,
  isAuthInitializing: false
};
const at = (o: Partial<StartupInputs>) => deriveStartupState({ ...base, ...o });

describe('deriveStartupState', () => {
  it('blocks with the loader while connecting inside the startup window', () => {
    expect(at({})).toMatchObject({ phase: 'loading', isAppLoading: true });
  });
  it('keeps loading until connected AND entities resolved', () => {
    expect(at({ connectionStatus: 'connected' })).toMatchObject({ phase: 'loading', isAppLoading: true });
    expect(at({ connectionStatus: 'connected', hasInitialLoaded: true })).toMatchObject({ phase: 'ready', isAppLoading: false });
  });
  it('stops blocking once the startup window elapses and flags a down connection', () => {
    expect(at({ hasStartupTimeoutElapsed: true, connectionStatus: 'disconnected' })).toEqual({
      phase: 'degraded',
      isAppLoading: false,
      isConnectionDegraded: true
    });
  });
  it('does not block on auth failure; the auth modal handles it', () => {
    expect(at({ connectionStatus: 'auth_failed' }).isAppLoading).toBe(false);
  });
  it('never blocks in demo or with a cached snapshot', () => {
    expect(at({ isDemo: true }).phase).toBe('demo');
    expect(at({ showingCachedSnapshot: true }).phase).toBe('cached');
    expect(at({ showingCachedSnapshot: true }).isAppLoading).toBe(false);
  });
  it('waits for auth restore only when credentials exist', () => {
    const local = { isLiveMode: false, connectionStatus: 'disconnected' };
    expect(at({ ...local, hasCredentials: false, isAuthInitializing: true }).isAppLoading).toBe(false);
    expect(at({ ...local, hasCredentials: true, isAuthInitializing: true }).isAppLoading).toBe(true);
  });
  it('keeps the degraded banner visible over a cached snapshot (previous behaviour)', () => {
    expect(at({ showingCachedSnapshot: true, hasStartupTimeoutElapsed: true, connectionStatus: 'error' }).isConnectionDegraded).toBe(true);
  });
});
