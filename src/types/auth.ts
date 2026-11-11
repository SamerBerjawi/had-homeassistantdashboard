/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuthStatus } from '../services/authStatus';

export type AuthMethod = 'oauth' | 'llat' | 'demo';

export interface AuthUser {
  id: string;
  name: string;
  isOwner: boolean;
  username?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  expires_at?: number;
  server_url: string;
  auth_type: 'oauth' | 'llat';
  client_id?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isDemo: boolean;
  authMethod: AuthMethod | null;
  haUrl?: string;
  user?: AuthUser;
  tokens?: AuthTokens;
}

export interface AuthContextType {
  authState: AuthState;
  /** Single named lifecycle status derived from the flags below (see services/authStatus.ts). */
  status: AuthStatus;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginOAuth: (haUrl?: string) => void;
  loginLLAT: (haUrl: string, token: string) => Promise<{ success: boolean; error?: string }>;
  enterDemoMode: () => void;
  logout: () => void;
  clearError: () => void;
}
