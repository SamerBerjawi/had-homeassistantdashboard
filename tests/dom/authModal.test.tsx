// @vitest-environment jsdom
import './setup';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/haWebSocket', () => {
  const service = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    setDemoMode: vi.fn(),
    isDemo: () => false,
    getStatus: () => 'disconnected',
    subscribe: vi.fn(() => () => undefined),
    waitForConnection: vi.fn(async () => undefined),
    refreshStates: vi.fn(async () => undefined)
  };
  return { haWebSocketService: service, default: service };
});

import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import AuthModal from '../../src/components/auth/AuthModal';

function Shell() {
  const { authState, openAuthModal } = useAuth();
  React.useEffect(() => {
    openAuthModal();
  }, [openAuthModal]);
  return (
    <>
      <div data-testid="state">{authState.isDemo ? 'demo' : authState.isAuthenticated ? 'auth' : 'anon'}</div>
      <AuthModal />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AuthModal with the real AuthProvider', () => {
  it('cannot be dismissed with Escape before signing in', async () => {
    render(
      <AuthProvider>
        <Shell />
      </AuthProvider>
    );
    const dialog = await screen.findByRole('dialog', { name: /Sign in to Home Assistant/ });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: /Sign in to Home Assistant/ })).toBe(dialog);
  });

  it('rejects a malformed URL with an inline alert instead of navigating (QA-A-001)', async () => {
    render(
      <AuthProvider>
        <Shell />
      </AuthProvider>
    );
    const input = await screen.findByLabelText('Home Assistant URL');
    fireEvent.change(input, { target: { value: 'not a url' } });
    fireEvent.click(screen.getByText(/Sign In with Home Assistant/));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/valid Home Assistant URL/i);
  });

  it('enters demo mode and closes the gate', async () => {
    render(
      <AuthProvider>
        <Shell />
      </AuthProvider>
    );
    fireEvent.click(await screen.findByText(/Explore Demo Dashboard/));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('demo'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Sign in/ })).toBeNull());
  });

  it('LLAT submit with an invalid URL shows the validation message and does not call the network', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <AuthProvider>
        <Shell />
      </AuthProvider>
    );
    fireEvent.click(await screen.findByText(/Long-Lived Token/));
    fireEvent.change(screen.getByLabelText('Home Assistant URL'), { target: { value: 'bad url' } });
    fireEvent.change(screen.getByLabelText('Long-Lived Access Token'), { target: { value: 'tok' } });
    fireEvent.click(screen.getByText('Connect with token'));
    await waitFor(() => expect(screen.getByText(/valid Home Assistant URL/i)).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
