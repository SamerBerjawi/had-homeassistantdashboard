/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { HAState } from '../types';
import { resolveHAGraph, resolvedEntityToHAEntity, shareGraphStructure } from '../services/graphResolution';
import { haWebSocketService } from '../services/haWebSocket';
import { startHAOAuthFlow, refreshHAOAuthTokenWithStatus, normalizeHAUrl } from '../services/haAuth';
import { getStoredAuthConfig, saveStoredAuthConfig, clearStoredAuthConfig } from '../services/authStorage';
import { loadMockRegistries } from '../data/loadMockRegistries';
import { clearDashboardSnapshots } from '../services/dashboardSnapshot';
import { INITIAL_SECURITY_OVERVIEW, INITIAL_OVERVIEW_SUMMARY } from './autoLayout/initialState';
import { getCachedServerUrl, getCachedHaToken, getCachedLiveMode, hasConfiguredHACredentialsAtLoad, clearAllStoredHACredentials } from './autoLayout/authCache';
import { scheduleRecompute } from './autoLayout/recompute';
import { createStateBatcher } from './autoLayout/stateBatcher';
import { confirmedStates, rememberConfirmedStates } from './autoLayout/optimistic';
import { SNAPSHOT_READ_BUDGET_MS, earlySnapshot, saveSnapshotNow, scheduleSnapshotSave, getHasLiveRegistries, setHasLiveRegistries } from './autoLayout/snapshotCache';
import { createServiceSlice } from './autoLayout/serviceSlice';
import { createAreaSlice } from './autoLayout/areaSlice';
import { createCustomizationSlice } from './autoLayout/customizationSlice';
import { createNotificationSlice } from './autoLayout/notificationSlice';
import { createSelectionSlice } from './autoLayout/selectionSlice';
import type { AutoLayoutStoreState } from './autoLayout/types';

export type { AutoLayoutStoreState } from './autoLayout/types';
export { hasConfiguredHACredentials } from './autoLayout/authCache';

// Coalesces bursts of state_changed events into one store update per window (see stateBatcher.ts).
const STATE_EVENT_WINDOW_MS = 250;
const stateBatcher = createStateBatcher<HAState>((batch) => {
  const map: Record<string, HAState> = Object.fromEntries(batch);
  useAutoLayoutStore.setState((prev) => ({
    states: { ...prev.states, ...map },
    rawStates: { ...prev.rawStates, ...map }
  }));
  scheduleRecompute(useAutoLayoutStore.getState);
  scheduleSnapshotSave(useAutoLayoutStore.getState);
}, STATE_EVENT_WINDOW_MS);

export const useAutoLayoutStore = create<AutoLayoutStoreState>((set, get) => ({
  isLiveMode: getCachedLiveMode(),
  serverUrl: getCachedServerUrl(),
  haToken: getCachedHaToken(),
  connectionStatus: 'connected',
  connectionError: null,
  isLoading: false,
  error: null,

  // Empty until Home Assistant (or, in demo mode, the lazily loaded sample data) fills them
  rawAreas: [],

  rawDevices: [],
  rawEntityRegistry: [],
  rawFloors: [],
  rawLabels: [],
  rawStates: {},
  areas: [],
  devices: [],
  entityRegistry: [],
  floors: [],
  labels: [],
  states: {},
  resolvedEntities: {},
  resolvedAreas: [],
  areasMap: {},
  resolvedFloors: [],
  resolvedZones: [],
  unassignedEntities: [],
  domainGroups: {},
  securityOverview: INITIAL_SECURITY_OVERVIEW,
  overviewSummary: INITIAL_OVERVIEW_SUMMARY,
  metrics: null,
  selectedFloorId: 'all',
  selectedAreaId: null,
  selectedSettingsSection: null,
  selectedWeatherEntityId: typeof window !== 'undefined' ? localStorage.getItem('ha_selected_weather_id') : null,
  selectedAlarmEntityId: typeof window !== 'undefined' ? localStorage.getItem('ha_selected_alarm_id') : null,
  nativeNotifications: [],
  nativeRepairs: [],

  dismissedNotificationIds: typeof window !== 'undefined' 
    ? (() => {
        try {
          const raw = JSON.parse(localStorage.getItem('ha_dismissed_notifications') || '[]');
          const cleaned = Array.isArray(raw) ? raw.filter((id: unknown) => typeof id === 'string') : [];
          return cleaned;
        } catch {
          return [];
        }
      })()
    : [],

  showDiagnosticEntities: false,
  searchQuery: '',
  entityCustomizations: {},
  authType: 'demo',
  haCoreVersion: getCachedLiveMode() ? (haWebSocketService.getVersion() || null) : '2026.8.0',
  snapshotStatus: hasConfiguredHACredentialsAtLoad() ? 'pending' : 'none',
  showingCachedSnapshot: false,

  init: async () => {
    haWebSocketService.init({
      onStatusChange: (status, errorMsg) => {
        set({ 
          connectionStatus: status, 
          connectionError: errorMsg || null,
          isLoading: status === 'connecting',
          error: errorMsg || null
        });
      },
      onVersionLoaded: (version: string) => {
        if (version) {
          set({ haCoreVersion: version });
        }
      },
      onAuthInvalid: async () => {
        const stored = getStoredAuthConfig();
        if (stored && stored.authMethod === 'oauth' && stored.tokens?.refresh_token) {
          try {
            const refreshResult = await refreshHAOAuthTokenWithStatus(stored.tokens);
            if (refreshResult.success && refreshResult.tokens) {
              set({
                haToken: refreshResult.tokens.access_token,
                serverUrl: refreshResult.tokens.server_url
              });
              haWebSocketService.updateToken(refreshResult.tokens.access_token);
              return refreshResult.tokens.access_token;
            } else if (refreshResult.isFatal) {
              console.warn('[HA Auth] OAuth token could not be refreshed (revoked). Forcing re-login.');
              clearStoredAuthConfig();
              set({
                isLiveMode: false,
                authType: 'demo',
                haToken: '',
                connectionStatus: 'auth_failed',
                connectionError: 'Session expired. Please sign in again.'
              });
              get().reloadDemoData();
              return null;
            }
          } catch (e) {
            console.error('[HA Auth] onAuthInvalid refresh attempt failed:', e);
          }
          // Transient network issue: keep connection reconnecting without wiping stored session
          return null;
        }

        // For LLAT: do NOT erase the user's token or configuration
        console.warn('[HA Auth] LLAT authentication rejected. Please check your Long-Lived Access Token in Settings.');
        set({
          isLiveMode: false,
          connectionStatus: 'auth_failed',
          connectionError: 'Invalid Long-Lived Access Token. Please verify token in Settings.'
        });
        get().reloadDemoData();
        return null;
      },
      onRegistriesLoaded: (payload) => {
        stateBatcher.clear();
        setHasLiveRegistries(true);
        confirmedStates.clear();
        rememberConfirmedStates(Object.values(payload.states || {}));
        const detectedVersion = payload.haVersion || payload.states?.['update.home_assistant_core_update']?.attributes?.installed_version || payload.states?.['update.home_assistant_core']?.attributes?.installed_version || get().haCoreVersion;
        set({
          haCoreVersion: detectedVersion || get().haCoreVersion || null,
          areas: payload.areas,
          devices: payload.devices,
          entityRegistry: payload.entityRegistry,
          floors: payload.floors,
          labels: payload.labels || [],
          states: payload.states,
          rawAreas: payload.areas,
          rawDevices: payload.devices,
          rawEntityRegistry: payload.entityRegistry,
          rawFloors: payload.floors,
          rawLabels: payload.labels || [],
          rawStates: payload.states,
          nativeNotifications: payload.nativeNotifications || [],
          nativeRepairs: payload.nativeRepairs || [],
          isLoading: false,
          error: null,
          showingCachedSnapshot: false,
          snapshotStatus: 'none'
        });
        if (!haWebSocketService.isDemo()) saveSnapshotNow(get);
        // Check if cached config has custom area/floor/entity overrides
        try {
          const cached = typeof window !== 'undefined' ? localStorage.getItem('had_user_dashboard_config_v1') : null;
          if (cached) {
            get().applyConfigCustomizations(JSON.parse(cached));
          }
        } catch {}
        get().recomputeGraph();
      },
      onNativeNotificationsLoaded: (notifications, repairs) => {
        set({
          nativeNotifications: notifications,
          nativeRepairs: repairs
        });
      },
      onStatesBatchUpdated: (statesList) => {
        stateBatcher.flush();
        rememberConfirmedStates(statesList);
        const map: Record<string, HAState> = {};
        for (const s of statesList) {
          if (s?.entity_id) map[s.entity_id] = s;
        }
        set(prev => ({
          states: { ...prev.states, ...map },
          rawStates: { ...prev.rawStates, ...map }
        }));
        scheduleRecompute(get);
        scheduleSnapshotSave(get);
      },
      onStateChanged: (entityId, newState) => {
        confirmedStates.set(entityId, newState);
        stateBatcher.push(entityId, newState);
      },
      onLogMessage: (type, msg, details) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ha_log_message', { detail: { type, msg, details } }));
        }
      }
    });

    // Synchronize initial state from stored auth configuration
    const stored = getStoredAuthConfig();
    if (stored && (stored.authMethod === 'oauth' || stored.authMethod === 'llat') && stored.tokens) {
      set({
        isLiveMode: true,
        serverUrl: stored.serverUrl,
        haToken: stored.tokens.access_token,
        authType: stored.authMethod
      });

      // Show the last session's data right away; live registries replace it when they arrive.
      // If the cache is slow, stop waiting (the loader shows) but still use it if it lands first.
      const readBudget = setTimeout(() => {
        if (get().snapshotStatus === 'pending') set({ snapshotStatus: 'none' });
      }, SNAPSHOT_READ_BUDGET_MS);
      void earlySnapshot.then((snapshot) => {
        clearTimeout(readBudget);
        if (!snapshot || getHasLiveRegistries() || haWebSocketService.isDemo()) {
          if (get().snapshotStatus === 'pending') set({ snapshotStatus: 'none' });
          return;
        }
        stateBatcher.clear();
        set({
          areas: snapshot.areas,
          devices: snapshot.devices,
          entityRegistry: snapshot.entityRegistry,
          floors: snapshot.floors,
          labels: snapshot.labels,
          states: snapshot.states,
          rawAreas: snapshot.areas,
          rawDevices: snapshot.devices,
          rawEntityRegistry: snapshot.entityRegistry,
          rawFloors: snapshot.floors,
          rawLabels: snapshot.labels,
          rawStates: snapshot.states,
          haCoreVersion: snapshot.haVersion || get().haCoreVersion,
          snapshotStatus: 'hydrated',
          showingCachedSnapshot: true
        });
        try {
          const cachedConfig = localStorage.getItem('had_user_dashboard_config_v1');
          if (cachedConfig) get().applyConfigCustomizations(JSON.parse(cachedConfig));
        } catch {}
        get().recomputeGraph();
      });
    } else {
      set({ authType: 'demo' });
      get().reloadDemoData();
    }
  },

  loginWithHA: (url: string) => {
    startHAOAuthFlow(url);
  },

  logoutHA: () => {
    clearAllStoredHACredentials();
    setHasLiveRegistries(false);
    void clearDashboardSnapshots();
    haWebSocketService.disconnect();
    set({
      isLiveMode: false,
      authType: 'demo',
      haToken: '',
      serverUrl: '',
      connectionStatus: 'disconnected',
      connectionError: null
    });
    get().reloadDemoData();
  },

  recomputeGraph: () => {
    const prev = get();
    const { areas, devices, entityRegistry, floors, labels, states, showDiagnosticEntities, entityCustomizations } = prev;
    const result = resolveHAGraph(areas, devices, entityRegistry, floors, states, labels, {
      includeDiagnostics: showDiagnosticEntities,
      entityOverrides: entityCustomizations,
      previousEntities: prev.resolvedEntities
    });

    // Keep references for everything a state event didn't change, so components subscribed to
    // other slices (or other entities) don't re-render. A single light changing only replaces
    // that entity, its area/domain arrays and the summaries it affects.
    set({
      resolvedEntities: shareGraphStructure(prev.resolvedEntities, result.resolvedEntities),
      resolvedAreas: shareGraphStructure(prev.resolvedAreas, result.resolvedAreas),
      areasMap: shareGraphStructure(prev.areasMap, result.areasMap),
      resolvedFloors: shareGraphStructure(prev.resolvedFloors, result.resolvedFloors),
      resolvedZones: shareGraphStructure(prev.resolvedZones, result.resolvedZones),
      labels: shareGraphStructure(prev.labels, result.labels),
      unassignedEntities: shareGraphStructure(prev.unassignedEntities, result.unassignedEntities),
      domainGroups: shareGraphStructure(prev.domainGroups, result.domainGroups),
      securityOverview: shareGraphStructure(prev.securityOverview, result.securityOverview),
      overviewSummary: shareGraphStructure(prev.overviewSummary, result.overviewSummary),
      metrics: shareGraphStructure(prev.metrics, result.metrics)
    });
  },

  setLiveMode: (live: boolean, url?: string, token?: string) => {
    if (!live) {
      get().disconnectFromHA();
      return;
    }

    const nextUrl = (url || get().serverUrl || '').trim();
    const nextToken = (token || get().haToken || '').trim();
    const { httpUrl, wsUrl } = normalizeHAUrl(nextUrl);
    
    if (nextToken && nextUrl) {
      saveStoredAuthConfig({
        version: 1,
        authMethod: 'llat',
        serverUrl: wsUrl,
        httpUrl,
        tokens: {
          access_token: nextToken,
          server_url: wsUrl,
          auth_type: 'llat'
        },
        lastUpdated: Date.now()
      });
    }

    set({
      isLiveMode: true,
      serverUrl: wsUrl,
      haToken: nextToken,
      authType: 'llat',
      connectionStatus: 'connecting',
      connectionError: null
    });
    haWebSocketService.setDemoMode(false);
    haWebSocketService.connect(wsUrl, nextToken);
  },

  connectToHA: (url: string, token: string) => {
    const cleanUrl = url.trim();
    const cleanToken = token.trim();
    const { httpUrl, wsUrl } = normalizeHAUrl(cleanUrl);

    saveStoredAuthConfig({
      version: 1,
      authMethod: 'llat',
      serverUrl: wsUrl,
      httpUrl,
      tokens: {
        access_token: cleanToken,
        server_url: wsUrl,
        auth_type: 'llat'
      },
      lastUpdated: Date.now()
    });

    set({
      isLiveMode: true,
      serverUrl: wsUrl,
      haToken: cleanToken,
      authType: 'llat',
      connectionStatus: 'connecting',
      connectionError: null
    });
    haWebSocketService.setDemoMode(false);
    haWebSocketService.connect(wsUrl, cleanToken);
  },

  disconnectFromHA: () => {
    clearAllStoredHACredentials();
    haWebSocketService.disconnect();
    set({
      isLiveMode: false,
      authType: 'demo',
      haToken: '',
      serverUrl: '',
      connectionStatus: 'disconnected',
      connectionError: null
    });
    get().reloadDemoData();
  },

  reloadDemoData: () => {
    stateBatcher.clear();
    loadMockRegistries()
      .then(({ MOCK_AREAS, MOCK_DEVICES, MOCK_ENTITY_REGISTRY, MOCK_FLOORS, MOCK_LABELS, MOCK_STATES }) => {
        // The user may have signed in to a live instance while the sample data was loading
        if (get().isLiveMode && !haWebSocketService.isDemo()) return;
        set({
          areas: [...MOCK_AREAS],
          devices: [...MOCK_DEVICES],
          entityRegistry: [...MOCK_ENTITY_REGISTRY],
          floors: [...MOCK_FLOORS],
          labels: [...MOCK_LABELS],
          rawAreas: [...MOCK_AREAS],
          rawDevices: [...MOCK_DEVICES],
          rawEntityRegistry: [...MOCK_ENTITY_REGISTRY],
          rawFloors: [...MOCK_FLOORS],
          rawLabels: [...MOCK_LABELS],
          states: { ...MOCK_STATES },
          rawStates: { ...MOCK_STATES },
          haCoreVersion: '2026.8.0',
          connectionStatus: 'connected',
          connectionError: null
        });
        get().recomputeGraph();
      })
      .catch((err) => console.error('[AutoLayout] Failed to load demo data:', err));
  },

  getLegacyEntities: () => {
    const { resolvedEntities } = get();
    return Object.values(resolvedEntities).map(resolvedEntityToHAEntity);
  },

  ...createServiceSlice(set, get),
  ...createAreaSlice(set, get),
  ...createCustomizationSlice(set, get),
  ...createNotificationSlice(set, get),
  ...createSelectionSlice(set, get),
}));
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveSnapshotNow(useAutoLayoutStore.getState);
  });
}