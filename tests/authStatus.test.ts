import { describe, expect, it } from 'vitest';
import {
  authenticatedAuthState,
  demoAuthState,
  deriveAuthStatus,
  signedOutAuthState
} from '../src/services/authStatus';

const tokens = { access_token: 'a', auth_type: 'llat', server_url: 'ws://x' } as never;
const user = { id: 'u', name: 'U', isOwner: true };

describe('auth state factories', () => {
  it('never produce demo + authenticated together', () => {
    expect(demoAuthState()).toMatchObject({ isDemo: true, isAuthenticated: false, authMethod: 'demo' });
    const a = authenticatedAuthState({ authMethod: 'llat', haUrl: 'ws://x', user, tokens });
    expect(a).toMatchObject({ isDemo: false, isAuthenticated: true, authMethod: 'llat' });
    expect(signedOutAuthState()).toEqual({ isAuthenticated: false, isDemo: false, authMethod: null });
  });
});

describe('deriveAuthStatus', () => {
  const out = signedOutAuthState();
  const demo = demoAuthState();
  const authed = authenticatedAuthState({ authMethod: 'llat', haUrl: 'ws://x', user, tokens });

  it('initializing wins while the stored session is being restored', () => {
    expect(deriveAuthStatus(authed, false, true)).toBe('initializing');
    expect(deriveAuthStatus(out, true, true)).toBe('initializing');
  });
  it('maps the stable states', () => {
    expect(deriveAuthStatus(out, false, false)).toBe('signed_out');
    expect(deriveAuthStatus(authed, false, false)).toBe('authenticated');
    expect(deriveAuthStatus(demo, false, false)).toBe('demo');
  });
  it('is authenticating while a login is in flight', () => {
    expect(deriveAuthStatus(out, true, false)).toBe('authenticating');
  });
  it('treats an impossible demo+authenticated combination as demo', () => {
    expect(deriveAuthStatus({ isAuthenticated: true, isDemo: true }, false, false)).toBe('demo');
  });
});
