/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Reactive Authentication Context Provider
 * Manages Home Assistant OAuth2, Long-Lived Access Tokens (LLAT), and Sandboxed Demo Mode
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthState, AuthContextType, AuthUser, AuthTokens } from '../types/auth';
import { 
  handleHAOAuthCallback, 
  getStoredHAAuth, 
  startHAOAuthFlow, 
  clearStoredHAAuth, 
  saveStoredHAAuth, 
  refreshHAOAuthToken,
  normalizeHAUrl 
} from '../services/haAuth';
import { haWebSocketService, HAConnectionStatus } from '../services/haWebSocket';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

const STORAGE_KEY_DEMO = 'had_auth_demo';

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isDemo: false,
  authMethod: null
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync with autoLayoutStore for graph & registries
  const setLiveMode = useAutoLayoutStore((s) => s.setLiveMode);
  const reloadDemoData = useAutoLayoutStore((s) => s.reloadDemoData);

  const fetchHAUserProfile = useCallback(async (): Promise<AuthUser> => {
    try {
      const userRes = await haWebSocketService.sendRequest<any>('auth/current_user');
      if (userRes && userRes.id) {
        return {
          id: userRes.id,
          name: userRes.name || userRes.username || 'Home Assistant User',
          isOwner: Boolean(userRes.is_owner || userRes.is_admin),
          username: userRes.username
        };
      }
    } catch {
      // Ignore if command not supported or demo
    }

    return {
      id: 'ha_primary_user',
      name: 'Home Assistant User',
      isOwner: true
    };
  }, []);

  // Initialize Auth State on Initial Mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      setError(null);

      // 1. Check for incoming OAuth redirect (?code=...)
      try {
        const oauthResult = await handleHAOAuthCallback();
        if (oauthResult.success && oauthResult.tokens && isMounted) {
          const tokens: AuthTokens = oauthResult.tokens;
          localStorage.removeItem(STORAGE_KEY_DEMO);
          localStorage.setItem('ha_live_mode', 'true');

          haWebSocketService.setDemoMode(false);
          haWebSocketService.connect(tokens.server_url, tokens.access_token);

          // Authenticate immediately to close modal and reveal overview instantly
          setAuthState({
            isAuthenticated: true,
            isDemo: false,
            authMethod: 'oauth',
            haUrl: tokens.server_url,
            user: { id: 'oauth_user', name: 'Home Assistant User', isOwner: true },
            tokens
          });
          setIsAuthModalOpen(false);
          setIsLoading(false);
          setIsInitializing(false);

          // Fetch full user profile in background once connection completes
          fetchHAUserProfile()
            .then((user) => {
              if (isMounted) {
                setAuthState((prev) => ({ ...prev, user }));
              }
            })
            .catch(() => {});

          return;
        }
      } catch (err: any) {
        console.error('[AuthContext] OAuth callback error:', err);
      }

      // 2. Check for stored credentials
      const stored = getStoredHAAuth();
      if (stored && isMounted) {
        if (stored.auth_type === 'oauth') {
          let validTokens = stored;
          // Check if expired or about to expire in 3m
          if (!stored.expires_at || stored.expires_at < Date.now() + 180000) {
            const refreshed = await refreshHAOAuthToken(stored);
            if (refreshed) {
              validTokens = refreshed;
            } else {
              console.warn('[AuthContext] Stored OAuth token expired and refresh failed.');
              clearStoredHAAuth();
              setAuthState({
                isAuthenticated: false,
                isDemo: false,
                authMethod: null
              });
              setIsAuthModalOpen(true);
              setIsLoading(false);
              setIsInitializing(false);
              return;
            }
          }

          haWebSocketService.setDemoMode(false);
          haWebSocketService.connect(validTokens.server_url, validTokens.access_token);

          setAuthState({
            isAuthenticated: true,
            isDemo: false,
            authMethod: 'oauth',
            haUrl: validTokens.server_url,
            user: { id: 'oauth_user', name: 'Home Assistant User', isOwner: true },
            tokens: validTokens
          });
          setIsAuthModalOpen(false);
          setIsLoading(false);
          setIsInitializing(false);

          fetchHAUserProfile()
            .then((user) => {
              if (isMounted) {
                setAuthState((prev) => ({ ...prev, user }));
              }
            })
            .catch(() => {});

          return;
        } else if (stored.auth_type === 'llat' && stored.access_token) {
          haWebSocketService.setDemoMode(false);
          haWebSocketService.connect(stored.server_url, stored.access_token);

          setAuthState({
            isAuthenticated: true,
            isDemo: false,
            authMethod: 'llat',
            haUrl: stored.server_url,
            user: { id: 'kiosk_user', name: 'Wall Kiosk Operator', isOwner: true },
            tokens: stored
          });
          setIsAuthModalOpen(false);
          setIsLoading(false);
          setIsInitializing(false);
          return;
        }
      }

      // 3. Fallback: check legacy localStorage ha_token
      const legacyToken = localStorage.getItem('ha_token');
      const legacyUrl = localStorage.getItem('ha_server_url') || 'http://homeassistant.local:8123';
      if (legacyToken && legacyToken.trim() && isMounted) {
        const tokens: AuthTokens = {
          access_token: legacyToken.trim(),
          server_url: normalizeHAUrl(legacyUrl).wsUrl,
          auth_type: 'llat'
        };
        saveStoredHAAuth(tokens);
        haWebSocketService.setDemoMode(false);
        haWebSocketService.connect(tokens.server_url, tokens.access_token);

        setAuthState({
          isAuthenticated: true,
          isDemo: false,
          authMethod: 'llat',
          haUrl: tokens.server_url,
          user: { id: 'kiosk_user', name: 'Kiosk Display', isOwner: true },
          tokens
        });
        setIsAuthModalOpen(false);
        setIsLoading(false);
        setIsInitializing(false);
        return;
      }

      // 4. Check if demo mode was explicitly selected
      const isDemoSaved = localStorage.getItem(STORAGE_KEY_DEMO) === 'true';
      if (isDemoSaved && isMounted) {
        haWebSocketService.setDemoMode(true);
        setAuthState({
          isAuthenticated: false,
          isDemo: true,
          authMethod: 'demo',
          user: { id: 'demo_user', name: 'Demo Guest', isOwner: false }
        });
        setIsAuthModalOpen(false);
        setIsLoading(false);
        setIsInitializing(false);
        return;
      }

      // 5. Unauthenticated — Gatekeeper opens AuthModal
      if (isMounted) {
        setAuthState({
          isAuthenticated: false,
          isDemo: false,
          authMethod: null
        });
        setIsAuthModalOpen(true);
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchHAUserProfile]);

  // Handle Auth Rejections or Expired Sessions from WebSocket
  useEffect(() => {
    const handleAuthStatus = (event: any) => {
      const status: HAConnectionStatus = event?.detail?.status;
      if (status === 'auth_failed') {
        setError('Authentication expired or invalid token. Please sign in again.');
        setIsAuthModalOpen(true);
      }
    };

    window.addEventListener('ha_connection_status' as any, handleAuthStatus);
    return () => {
      window.removeEventListener('ha_connection_status' as any, handleAuthStatus);
    };
  }, []);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    // Only allow closing if already authenticated or in demo mode
    if (authState.isAuthenticated || authState.isDemo) {
      setIsAuthModalOpen(false);
    }
  }, [authState]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 1. Sign In via Home Assistant OAuth2
  const loginOAuth = useCallback((customUrl?: string) => {
    setError(null);
    setIsLoading(true);
    const targetUrl = (customUrl || authState.haUrl || 'http://homeassistant.local:8123').trim();
    localStorage.removeItem(STORAGE_KEY_DEMO);
    localStorage.setItem('ha_live_mode', 'true');
    startHAOAuthFlow(targetUrl);
  }, [authState.haUrl]);

  // 2. Sign In via Long-Lived Access Token (LLAT)
  const loginLLAT = useCallback(async (
    rawUrl: string,
    rawToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setIsLoading(true);

    const token = rawToken.trim();
    const { httpUrl, wsUrl } = normalizeHAUrl(rawUrl);

    if (!token) {
      const err = 'Please enter a valid Long-Lived Access Token';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    try {
      // Test REST API connectivity with LLAT before committing
      const restTestUrl = `${httpUrl}/api/`;
      const response = await fetch(restTestUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errMsg = response.status === 401
          ? '401 Unauthorized: The Long-Lived Access Token is invalid or expired.'
          : `Connection error (${response.status}): ${errorText || 'Could not verify token'}`;
        setError(errMsg);
        setIsLoading(false);
        return { success: false, error: errMsg };
      }

      const tokens: AuthTokens = {
        access_token: token,
        server_url: wsUrl,
        auth_type: 'llat'
      };

      saveStoredHAAuth(tokens);
      localStorage.removeItem(STORAGE_KEY_DEMO);
      localStorage.setItem('ha_live_mode', 'true');
      localStorage.setItem('ha_token', token);
      localStorage.setItem('ha_server_url', httpUrl);

      haWebSocketService.setDemoMode(false);
      haWebSocketService.connect(wsUrl, token);

      setAuthState({
        isAuthenticated: true,
        isDemo: false,
        authMethod: 'llat',
        haUrl: wsUrl,
        user: { id: 'kiosk_user', name: 'Wall Kiosk Operator', isOwner: true },
        tokens
      });

      setIsAuthModalOpen(false);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      const errMsg = `Failed to connect to Home Assistant: ${err?.message || 'Network error / Host unreachable'}`;
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  // 3. Enter Sandboxed Demo Mode
  const enterDemoMode = useCallback(() => {
    setError(null);
    clearStoredHAAuth();
    localStorage.setItem(STORAGE_KEY_DEMO, 'true');
    localStorage.setItem('ha_live_mode', 'false');

    haWebSocketService.setDemoMode(true);
    reloadDemoData();

    setAuthState({
      isAuthenticated: false,
      isDemo: true,
      authMethod: 'demo',
      user: { id: 'demo_user', name: 'Demo Guest', isOwner: false }
    });

    setIsAuthModalOpen(false);
    setIsLoading(false);
  }, [reloadDemoData]);

  // 4. Clean Sign Out
  const logout = useCallback(() => {
    clearStoredHAAuth();
    localStorage.removeItem(STORAGE_KEY_DEMO);
    localStorage.removeItem('ha_token');
    localStorage.removeItem('ha_server_url');
    localStorage.setItem('ha_live_mode', 'false');

    haWebSocketService.disconnect();
    haWebSocketService.setDemoMode(false);

    setAuthState({
      isAuthenticated: false,
      isDemo: false,
      authMethod: null,
      tokens: undefined,
      user: undefined
    });

    setIsAuthModalOpen(true);
    setError(null);
  }, []);

  const contextValue: AuthContextType = {
    authState,
    isLoading,
    isInitializing,
    error,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    loginOAuth,
    loginLLAT,
    enterDemoMode,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
