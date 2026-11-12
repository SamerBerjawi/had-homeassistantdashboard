/**
 * Typed payloads of the app's custom window events, so listeners need no casts.
 * Dispatchers: haWebSocket.emitStatus (ha_connection_status), configStorageService and
 * configSyncService.broadcastLocalChange (had_config_updated), autoLayout notificationSlice
 * (had_sync_dismissed_notifications).
 */
import type { HAConnectionStatus } from '../types';
import type { UserDashboardConfig } from './userConfig';
import type { HAAuthTokens } from '../services/haAuth';

declare global {
  interface WindowEventMap {
    ha_connection_status: CustomEvent<{ status: HAConnectionStatus; errorMsg?: string }>;
    ha_token_refreshed: CustomEvent<{ tokens: HAAuthTokens }>;
    had_config_updated: CustomEvent<UserDashboardConfig>;
    had_sync_dismissed_notifications: CustomEvent<string[]>;
  }
}

export {};
