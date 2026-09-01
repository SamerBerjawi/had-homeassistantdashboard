/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Reactive Authentication Context Provider
 * Manages Home Assistant OAuth2, Long-Lived Access Tokens (LLAT), and Sandboxed Demo Mode.
 * Handles proactive silent token refresh, resilient network reconnection, and persistent storage.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthState, AuthContextType, AuthUser, AuthTokens } from '../types/auth';
import { 
  handleHAOAuthCallback, 
  startHAOAuthFlow, 
  refreshHAOAuthTokenWithStatus,
  normalizeHAUrl 
} from '../services/haAuth';
import { 
  getStoredAuthConfig, 
  saveStoredAuthConfig, 
  clearStoredAuthConfig, 
  updateStoredTokens,
  isTokenExpired,
  StoredAuthConfig 
} from '../services/authStorage';
import { haWebSocketService, HAConnectionStatus } from '../services/haWebSocket';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

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

  const refreshTimerRef = useRef<any>(null);
  const reloadDemoData = useAutoLayoutStore((s) => s.reloadDemoData);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

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
      // Ignore if command not supported
    }

    return {
      id: 'ha_primary_user',
      name: 'Home Assistant User',
      isOwner: true
    };
  }, []);

  // Schedule proactive silent token refresh 5 minutes (300s) before access token expires
  const scheduleProactiveTokenRefresh = useCallback((tokens: AuthTokens) => {
    clearRefreshTimer();

    if (tokens.auth_type !== 'oauth' || !tokens.refresh_token) {
      return;
    }

    const now = Date.now();
    const expiresAt = tokens.expires_at || (now + (tokens.expires_in || 1800) * 1000);
    const safetyBufferMs = 300000; // 5 minutes before expiry
    const refreshDelay = Math.max(5000, expiresAt - now - safetyBufferMs);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const result = await refreshHAOAuthTokenWithStatus(tokens);
        if (result.success && result.tokens) {
          haWebSocketService.updateToken(result.tokens.access_token);
          setAuthState((prev) => ({
            ...prev,
            tokens: result.tokens
          }));
          scheduleProactiveTokenRefresh(result.tokens);
        } else if (result.isFatal) {
          console.error('[AuthContext] OAuth refresh token rejected by Home Assistant. Logging out.');
          clearStoredAuthConfig();
          haWebSocketService.disconnect();
          setAuthState({
            isAuthenticated: false,
            isDemo: false,
            authMethod: null
          });
          setError('Session expired. Please sign in again.');
          setIsAuthModalOpen(true);
        } else {
          // Transient network failure: retry in 30 seconds
          console.warn('[AuthContext] Proactive refresh transient failure. Retrying in 30s...');
          refreshTimerRef.current = setTimeout(() => {
            scheduleProactiveTokenRefresh(tokens);
          }, 30000);
        }
      } catch (err) {
        console.error('[AuthContext] Error in proactive token refresh timer:', err);
      }
    }, refreshDelay);
  }, [clearRefreshTimer]);

  // Hook into haWebSocketService onAuthInvalid for seamless socket-level token recovery
  useEffect(() => {
    // Also listen for connection status auth_failed
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

  // Listen for window focus, visibilitychange, and online to refresh stale tokens
  useEffect(() => {
    const handleVisibilityOrOnline = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      const stored = getStoredAuthConfig();
      if (stored && stored.authMethod === 'oauth' && stored.tokens?.refresh_token) {
        if (isTokenExpired(stored.tokens, 300)) {
          try {
            const result = await refreshHAOAuthTokenWithStatus(stored.tokens);
            if (result.success && result.tokens) {
              haWebSocketService.updateToken(result.tokens.access_token);
              setAuthState((prev) => ({
                ...prev,
                tokens: result.tokens
              }));
              scheduleProactiveTokenRefresh(result.tokens);
            } else if (result.isFatal) {
              clearStoredAuthConfig();
              haWebSocketService.disconnect();
              setAuthState({
                isAuthenticated: false,
                isDemo: false,
                authMethod: null
              });
              setError('Session expired. Please sign in again.');
              setIsAuthModalOpen(true);
            }
          } catch (e) {
            console.warn('[AuthContext] Error during wake/online token refresh:', e);
          }
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleVisibilityOrOnline);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleVisibilityOrOnline);
      }
    };
  }, [scheduleProactiveTokenRefresh]);

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
          const tokens = oauthResult.tokens;
          haWebSocketService.setDemoMode(false);
          haWebSocketService.connect(tokens.server_url, tokens.access_token);
          scheduleProactiveTokenRefresh(tokens);

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

      // 2. Check for stored credentials via hardened authStorage
      const storedConfig = getStoredAuthConfig();
      if (storedConfig && isMounted) {
        if (storedConfig.authMethod === 'oauth' && storedConfig.tokens) {
          let activeTokens = storedConfig.tokens;

          // Check if token is expired or close to expiry (within 5 minutes)
          if (isTokenExpired(activeTokens, 300)) {
            const refreshResult = await refreshHAOAuthTokenWithStatus(activeTokens);
            if (refreshResult.success && refreshResult.tokens) {
              activeTokens = refreshResult.tokens;
            } else if (refreshResult.isFatal) {
              console.warn('[AuthContext] Stored OAuth token revoked. Clearing credentials.');
              clearStoredAuthConfig();
              setAuthState({
                isAuthenticated: false,
                isDemo: false,
                authMethod: null
              });
              setIsAuthModalOpen(true);
              setIsLoading(false);
              setIsInitializing(false);
              return;
            } else {
              // Transient failure (e.g. offline on mount): proceed with existing tokens
              console.warn('[AuthContext] Token refresh delayed due to network. Proceeding with stored session.');
            }
          }

          haWebSocketService.setDemoMode(false);
          haWebSocketService.connect(activeTokens.server_url, activeTokens.access_token);
          scheduleProactiveTokenRefresh(activeTokens);

          setAuthState({
            isAuthenticated: true,
            isDemo: false,
            authMethod: 'oauth',
            haUrl: activeTokens.server_url,
            user: { id: 'oauth_user', name: 'Home Assistant User', isOwner: true },
            tokens: activeTokens
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
        } else if (storedConfig.authMethod === 'llat' && storedConfig.tokens?.access_token) {
          haWebSocketService.setDemoMode(false);
          haWebSocketService.connect(storedConfig.tokens.server_url, storedConfig.tokens.access_token);

          setAuthState({
            isAuthenticated: true,
            isDemo: false,
            authMethod: 'llat',
            haUrl: storedConfig.tokens.server_url,
            user: { id: 'kiosk_user', name: 'Wall Kiosk Operator', isOwner: true },
            tokens: storedConfig.tokens
          });
          setIsAuthModalOpen(false);
          setIsLoading(false);
          setIsInitializing(false);
          return;
        } else if (storedConfig.authMethod === 'demo') {
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
      }

      // 3. Unauthenticated — Open AuthModal
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
      clearRefreshTimer();
    };
  }, [fetchHAUserProfile, scheduleProactiveTokenRefresh, clearRefreshTimer]);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
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
        const errorText = await response.text().catch(() => '');
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

      const config: StoredAuthConfig = {
        version: 1,
        authMethod: 'llat',
        serverUrl: wsUrl,
        httpUrl,
        tokens,
        lastUpdated: Date.now()
      };

      saveStoredAuthConfig(config);
      clearRefreshTimer();

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
  }, [clearRefreshTimer]);

  // 3. Enter Sandboxed Demo Mode
  const enterDemoMode = useCallback(() => {
    setError(null);
    clearRefreshTimer();
    
    const config: StoredAuthConfig = {
      version: 1,
      authMethod: 'demo',
      serverUrl: '',
      httpUrl: '',
      lastUpdated: Date.now()
    };
    saveStoredAuthConfig(config);

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
  }, [clearRefreshTimer, reloadDemoData]);

  // 4. Clean Sign Out
  const logout = useCallback(() => {
    clearRefreshTimer();
    clearStoredAuthConfig();

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
  }, [clearRefreshTimer]);

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
