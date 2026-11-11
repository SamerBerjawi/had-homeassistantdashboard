/**
 * Explicit auth lifecycle. AuthContext stores `AuthState` (isAuthenticated / isDemo flags) plus
 * `isLoading` / `isInitializing`; this module is the only place that builds those states and maps
 * them to one named status, so impossible combinations (e.g. demo AND authenticated) cannot be
 * constructed by accident. See docs/STATE_MACHINE.md.
 *
 *   initializing -> signed_out | authenticated | demo
 *   signed_out -> authenticating -> authenticated | signed_out
 *   authenticated -> signed_out (logout, fatal refresh failure)
 *   demo -> signed_out (logout)
 */
import type { AuthMethod, AuthState, AuthTokens, AuthUser } from '../types/auth';

export type AuthStatus = 'initializing' | 'signed_out' | 'authenticating' | 'authenticated' | 'demo';

export const DEMO_USER: AuthUser = { id: 'demo_user', name: 'Demo Guest', isOwner: false };

export function signedOutAuthState(): AuthState {
  return { isAuthenticated: false, isDemo: false, authMethod: null };
}

export function demoAuthState(): AuthState {
  return { isAuthenticated: false, isDemo: true, authMethod: 'demo', user: DEMO_USER };
}

export function authenticatedAuthState(params: {
  authMethod: Exclude<AuthMethod, 'demo'>;
  haUrl: string;
  user: AuthUser;
  tokens: AuthTokens;
}): AuthState {
  return { isAuthenticated: true, isDemo: false, ...params };
}

/** Maps the stored flags to one status. Demo wins over authenticated if both were ever set. */
export function deriveAuthStatus(
  authState: Pick<AuthState, 'isAuthenticated' | 'isDemo'>,
  isLoading: boolean,
  isInitializing: boolean
): AuthStatus {
  if (isInitializing) return 'initializing';
  if (authState.isDemo) return 'demo';
  if (isLoading) return 'authenticating';
  return authState.isAuthenticated ? 'authenticated' : 'signed_out';
}
