/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import {
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HAFloor,
  HALabel,
  HAState,
  HAZone,
  ResolvedEntity,
  ResolvedArea,
  ResolvedFloor,
  AutoLayoutMetrics,
  HAEntity,
  HassAreaWithEntities,
  SecurityOverviewState,
  OverviewSummaryState,
  AutoLayoutState,
  HANativePersistentNotification,
  HANativeRepairIssue
} from '../types';

import { resolveHAGraph, resolvedEntityToHAEntity } from '../services/graphResolution';
import { haWebSocketService, HAConnectionStatus } from '../services/haWebSocket';
import { 
  startHAOAuthFlow, 
  refreshHAOAuthTokenWithStatus,
  normalizeHAUrl,
  HAAuthTokens
} from '../services/haAuth';
import {
  getStoredAuthConfig,
  saveStoredAuthConfig,
  clearStoredAuthConfig,
  isTokenExpired,
  StoredAuthConfig
} from '../services/authStorage';
import { MOCK_AREAS, MOCK_DEVICES, MOCK_ENTITY_REGISTRY, MOCK_FLOORS, MOCK_LABELS, MOCK_STATES } from '../data/mockRegistries';

export interface AutoLayoutStoreState {
  // Connection & Config
  isLiveMode: boolean;
  serverUrl: string;
  haToken: string;
  authType: 'oauth' | 'llat' | 'demo';
  connectionStatus: HAConnectionStatus;
  connectionError: string | null;
  haCoreVersion: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  setLiveMode: (live: boolean, url?: string, token?: string) => void;
  connectToHA: (url: string, token: string) => void;
  loginWithHA: (url: string) => void;
  logoutHA: () => void;
  disconnectFromHA: () => void;
  reloadDemoData: () => void;

  // Raw Registries
  rawAreas: HAArea[];
  rawDevices: HADevice[];
  rawEntityRegistry: HAEntityRegistryEntry[];
  rawFloors: HAFloor[];
  rawLabels: HALabel[];
  rawStates: Record<string, HAState>;

  // Legacy arrays for compatibility
  areas: HAArea[];
  devices: HADevice[];
  entityRegistry: HAEntityRegistryEntry[];
  floors: HAFloor[];
  labels: HALabel[];
  states: Record<string, HAState>;

  // Resolved Graph (Auto-Layout Structure & AutoLayoutState)
  resolvedEntities: Record<string, ResolvedEntity>;
  resolvedAreas: ResolvedArea[];
  areasMap: Record<string, HassAreaWithEntities>;
  resolvedFloors: ResolvedFloor[];
  resolvedZones: HAZone[];
  unassignedEntities: ResolvedEntity[];
  domainGroups: Record<string, ResolvedEntity[]>;
  securityOverview: SecurityOverviewState;
  overviewSummary: OverviewSummaryState;
  metrics: AutoLayoutMetrics | null;

  // Filter & Navigation
  selectedFloorId: string | 'all';
  selectedAreaId: string | null;
  selectedSettingsSection: string | null;
  selectedWeatherEntityId: string | null;
  selectedAlarmEntityId: string | null;
  showDiagnosticEntities: boolean;
  searchQuery: string;

  // Graph & State Mutators
  recomputeGraph: () => void;
  updateEntityState: (entityId: string, newState: string, newAttributes?: Record<string, any>) => void;
  callHAService: (domain: string, service: string, serviceData?: Record<string, any>, target?: any) => Promise<void>;
  reassignEntityArea: (entityId: string, newAreaId: string | null) => void;
  
  // Floor & Area Customization Actions
  updateFloor: (floorId: string, updates: Partial<HAFloor>) => void;
  updateArea: (areaId: string, updates: Partial<HAArea>) => void;
  updateLabel: (labelId: string, updates: Partial<HALabel>) => void;
  reorderFloors: (newFloors: HAFloor[]) => void;
  reorderAreas: (newAreas: HAArea[]) => void;
  addFloor: (floor: Partial<HAFloor>) => void;
  addArea: (area: Partial<HAArea>) => void;
  deleteFloor: (floorId: string) => void;
  // Entity Customization & Visibility Actions
  entityCustomizations: Record<string, { customName?: string; hidden?: boolean; customIcon?: string; icon?: string }>;
  updateEntityCustomization: (entityId: string, updates: { customName?: string; customIcon?: string; icon?: string; hidden?: boolean }) => void;
  setEntityHidden: (entityId: string, hidden: boolean) => void;
  bulkSetEntitiesHidden: (entityIds: string[], hidden: boolean) => void;
  applyConfigCustomizations: (config: any) => void;

  // Notification & Alert Management
  nativeNotifications: HANativePersistentNotification[];
  nativeRepairs: HANativeRepairIssue[];
  dismissedNotificationIds: string[];
  dismissNotification: (id: string) => void;
  restoreNotification: (id: string) => void;
  clearAllNotifications: (ids: string[]) => void;
  installUpdate: (entityId: string) => Promise<void>;
  skipUpdate: (entityId: string) => Promise<void>;
  clearSkippedUpdate: (entityId: string) => Promise<void>;


  // Navigation Setters
  setSelectedFloorId: (floorId: string | 'all') => void;
  setSelectedAreaId: (areaId: string | null) => void;
  setSelectedSettingsSection: (section: string | null) => void;
  setSelectedWeatherEntityId: (id: string | null) => void;
  setSelectedAlarmEntityId: (id: string | null) => void;
  setShowDiagnosticEntities: (show: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Convenience Accessor
  getLegacyEntities: () => HAEntity[];
}

const INITIAL_SECURITY_OVERVIEW: SecurityOverviewState = {
  locks: [],
  openDoorsWindows: [],
  activeMotionSensors: [],
  cameras: []
};

const INITIAL_OVERVIEW_SUMMARY: OverviewSummaryState = {
  peopleHome: 2,
  peopleAway: 0,
  totalPeople: 2,
  lightsOnCount: 0,
  totalLightsCount: 0,
  fansOnCount: 0,
  totalFansCount: 0,
  doorsOpenCount: 0,
  totalDoorsCount: 0,
  windowsOpenCount: 0,
  totalWindowsCount: 0,
  openOpeningsCount: 0,
  alarmState: 'armed_home',
  activeMediaCount: 0,
  totalMediaCount: 0,
  activeClimatesCount: 0,
  activeSwitchesCount: 0,
  totalPowerWatts: 0
};

// Browser Caching Helpers for WebSocket Endpoint & Access Token
const getCachedServerUrl = (): string => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.serverUrl) return config.serverUrl;
    const saved = localStorage.getItem('ha_server_url');
    if (saved && saved.trim()) return saved;
  }
  return 'ws://homeassistant.local:8123/api/websocket';
};

const getCachedHaToken = (): string => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.tokens?.access_token) return config.tokens.access_token;
    const saved = localStorage.getItem('ha_token');
    if (saved && saved.trim()) return saved;
  }
  return '';
};

const getCachedLiveMode = (): boolean => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.authMethod === 'oauth' || config?.authMethod === 'llat') return true;
    if (config?.authMethod === 'demo') return false;
    const live = localStorage.getItem('ha_live_mode');
    if (live === 'true') return true;
  }
  return false;
};

// Check if user has credentials configured
export const hasConfiguredHACredentials = (): boolean => {
  if (typeof window !== 'undefined') {
    const config = getStoredAuthConfig();
    if (config?.tokens?.access_token) return true;
    const token = localStorage.getItem('ha_token');
    if (token && token.trim()) return true;
  }
  return false;
};

let recomputeTimer: any = null;
const scheduleRecompute = (get: any) => {
  if (recomputeTimer) return;
  if (typeof requestAnimationFrame !== 'undefined') {
    recomputeTimer = requestAnimationFrame(() => {
      recomputeTimer = null;
      get().recomputeGraph();
    });
  } else {
    recomputeTimer = setTimeout(() => {
      recomputeTimer = null;
      get().recomputeGraph();
    }, 16);
  }
};

function clearAllStoredHACredentials() {
  clearStoredAuthConfig();
}

export const useAutoLayoutStore = create<AutoLayoutStoreState>((set, get) => ({
  isLiveMode: getCachedLiveMode(),
  serverUrl: getCachedServerUrl(),
  haToken: getCachedHaToken(),
  connectionStatus: 'connected',
  connectionError: null,
  isLoading: false,
  error: null,

  rawAreas: [...MOCK_AREAS],
  rawDevices: [...MOCK_DEVICES],
  rawEntityRegistry: [...MOCK_ENTITY_REGISTRY],
  rawFloors: [...MOCK_FLOORS],
  rawLabels: [...MOCK_LABELS],
  rawStates: { ...MOCK_STATES },

  areas: [...MOCK_AREAS],
  devices: [...MOCK_DEVICES],
  entityRegistry: [...MOCK_ENTITY_REGISTRY],
  floors: [...MOCK_FLOORS],
  labels: [...MOCK_LABELS],
  states: { ...MOCK_STATES },

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
          const cleaned = Array.isArray(raw) ? raw.filter((id: any) => typeof id === 'string' && !id.startsWith('update.') && !id.startsWith('hacs_')) : [];
          if (Array.isArray(raw) && raw.length !== cleaned.length) {
            localStorage.setItem('ha_dismissed_notifications', JSON.stringify(cleaned));
          }
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
        const detectedVersion = payload.haVersion || payload.states?.['update.home_assistant_core_update']?.attributes?.installed_version || payload.states?.['update.home_assistant_core']?.attributes?.installed_version || get().haCoreVersion;
        set({
          haCoreVersion: detectedVersion || get().haCoreVersion || null,
          areas: payload.areas,
          devices: payload.devices,
          entityRegistry: payload.entityRegistry,
          floors: payload.floors,
          labels: payload.labels && payload.labels.length > 0 ? payload.labels : [...MOCK_LABELS],
          states: payload.states,
          rawAreas: payload.areas,
          rawDevices: payload.devices,
          rawEntityRegistry: payload.entityRegistry,
          rawFloors: payload.floors,
          rawLabels: payload.labels && payload.labels.length > 0 ? payload.labels : [...MOCK_LABELS],
          rawStates: payload.states,
          nativeNotifications: payload.nativeNotifications || [],
          nativeRepairs: payload.nativeRepairs || [],
          isLoading: false,
          error: null
        });
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
        const map: Record<string, HAState> = {};
        for (const s of statesList) {
          if (s?.entity_id) map[s.entity_id] = s;
        }
        set(prev => ({
          states: { ...prev.states, ...map },
          rawStates: { ...prev.rawStates, ...map }
        }));
        scheduleRecompute(get);
      },
      onStateChanged: (entityId, newState) => {
        set(prev => ({
          states: {
            ...prev.states,
            [entityId]: newState
          },
          rawStates: {
            ...prev.rawStates,
            [entityId]: newState
          }
        }));
        scheduleRecompute(get);
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
    } else {
      set({ authType: 'demo' });
      get().recomputeGraph();
    }
  },

  loginWithHA: (url: string) => {
    startHAOAuthFlow(url);
  },

  logoutHA: () => {
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

  recomputeGraph: () => {
    const { areas, devices, entityRegistry, floors, labels, states, showDiagnosticEntities, entityCustomizations } = get();
    const result = resolveHAGraph(areas, devices, entityRegistry, floors, states, labels, {
      includeDiagnostics: showDiagnosticEntities,
      entityOverrides: entityCustomizations
    });

    set({
      resolvedEntities: result.resolvedEntities,
      resolvedAreas: result.resolvedAreas,
      areasMap: result.areasMap,
      resolvedFloors: result.resolvedFloors,
      resolvedZones: result.resolvedZones,
      labels: result.labels,
      unassignedEntities: result.unassignedEntities,
      domainGroups: result.domainGroups,
      securityOverview: result.securityOverview,
      overviewSummary: result.overviewSummary,
      metrics: result.metrics
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
  },

  updateEntityState: (entityId: string, newState?: string | null, newAttributes?: Record<string, any>) => {
    set(prev => {
      const existing = prev.states[entityId] || {
        entity_id: entityId,
        state: newState || 'off',
        attributes: {}
      };

      const finalState = (newState !== undefined && newState !== null) ? newState : (existing.state || 'off');

      const updatedState: HAState = {
        ...existing,
        state: finalState,
        attributes: {
          ...existing.attributes,
          ...(newAttributes || {})
        },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      return {
        states: {
          ...prev.states,
          [entityId]: updatedState
        },
        rawStates: {
          ...prev.rawStates,
          [entityId]: updatedState
        }
      };
    });

    scheduleRecompute(get);
  },


  callHAService: async (domain: string, service: string, serviceData: Record<string, any> = {}, target: any = {}) => {
    try {
      await haWebSocketService.callService(domain, service, serviceData, target);
    } catch (err: any) {
      console.warn(`[HA WebSocket] Service call failed: ${domain}.${service}`, err);
    }

    // Comprehensive optimistic local state update
    if (target?.entity_id) {
      const entityIds = Array.isArray(target.entity_id) ? target.entity_id : [target.entity_id];
      for (const eid of entityIds) {
        const current = get().states[eid];
        const currentState = current?.state;
        const currentAttrs = current?.attributes || {};

        if (service === 'turn_on') {
          const brightness = serviceData.brightness !== undefined ? serviceData.brightness : serviceData.brightness_pct !== undefined ? Math.round((serviceData.brightness_pct / 100) * 255) : currentAttrs.brightness;
          get().updateEntityState(eid, 'on', { ...serviceData, ...(brightness !== undefined ? { brightness } : {}) });
        } else if (service === 'turn_off') {
          get().updateEntityState(eid, 'off', serviceData);
        } else if (service === 'toggle') {
          get().updateEntityState(eid, currentState === 'on' ? 'off' : 'on', serviceData);
        } else if (service === 'open_cover') {
          get().updateEntityState(eid, 'open', { current_position: 100 });
        } else if (service === 'close_cover') {
          get().updateEntityState(eid, 'closed', { current_position: 0 });
        } else if (service === 'stop_cover') {
          get().updateEntityState(eid, 'stopped');
        } else if (service === 'set_cover_position') {
          const pos = Number(serviceData.position ?? 50);
          get().updateEntityState(eid, pos > 0 ? 'open' : 'closed', { current_position: pos });
        } else if (service === 'set_temperature' && serviceData.temperature !== undefined) {
          get().updateEntityState(eid, currentState === 'off' ? 'heat' : currentState, { temperature: serviceData.temperature });
        } else if (service === 'set_hvac_mode' && serviceData.hvac_mode !== undefined) {
          get().updateEntityState(eid, serviceData.hvac_mode);
        } else if (service === 'lock') {
          get().updateEntityState(eid, 'locked');
        } else if (service === 'unlock') {
          get().updateEntityState(eid, 'unlocked');
        } else if (service === 'media_play' || service === 'media_play_pause') {
          const isCurrentlyPlaying = currentState === 'playing';
          const nextState = service === 'media_play_pause' && isCurrentlyPlaying ? 'paused' : 'playing';
          const isFreshPlay = nextState === 'playing' && (currentState === 'idle' || currentState === 'off' || currentState === 'standby' || !currentAttrs.media_title);
          
          get().updateEntityState(eid, nextState, {
            ...currentAttrs,
            ...(isFreshPlay ? {
              media_title: currentAttrs.media_title || 'AirPlay Hi-Fi Stream',
              media_artist: currentAttrs.media_artist || (eid.includes('homepod') ? 'Apple Music' : 'Media Stream'),
              media_duration: currentAttrs.media_duration || 228,
              media_position: currentAttrs.media_position || 0,
              media_position_updated_at: new Date().toISOString()
            } : {})
          });
        } else if (service === 'media_stop') {
          get().updateEntityState(eid, 'idle');
        } else if (service === 'media_next_track' || service === 'media_previous_track') {
          get().updateEntityState(eid, 'playing', {
            ...currentAttrs,
            media_position: 0,
            media_position_updated_at: new Date().toISOString()
          });
        } else if (service === 'select_source' && serviceData.source) {
          get().updateEntityState(eid, currentState || 'playing', { source: serviceData.source });
        } else if (service === 'select_sound_mode' && serviceData.sound_mode) {
          get().updateEntityState(eid, currentState || 'playing', { sound_mode: serviceData.sound_mode });
        } else if (service === 'volume_set' && serviceData.volume_level !== undefined) {
          get().updateEntityState(eid, currentState || 'playing', { volume_level: serviceData.volume_level });
        } else if (service === 'volume_mute') {
          get().updateEntityState(eid, currentState || 'playing', { is_volume_muted: Boolean(serviceData.is_volume_muted) });
        } else if (service === 'volume_up') {
          const currentVol = currentAttrs.volume_level !== undefined ? currentAttrs.volume_level : 0.5;
          get().updateEntityState(eid, currentState || 'playing', { volume_level: Math.min(1, currentVol + 0.05) });
        } else if (service === 'volume_down') {
          const currentVol = currentAttrs.volume_level !== undefined ? currentAttrs.volume_level : 0.5;
          get().updateEntityState(eid, currentState || 'playing', { volume_level: Math.max(0, currentVol - 0.05) });
        } else if (domain === 'remote' && service === 'toggle') {
          const nextState = currentState === 'on' ? 'off' : 'on';
          get().updateEntityState(eid, nextState);
          // Also sync paired media player state if present
          const clean = eid.replace('remote.', '').replace('_remote', '');
          const pairedCandidates = [`media_player.${clean}`, `media_player.${clean}_homepod`, `media_player.office_${clean}`];
          for (const cand of pairedCandidates) {
            if (get().states[cand]) {
              get().updateEntityState(cand, nextState === 'on' ? 'idle' : 'off');
              break;
            }
          }
        } else if (domain === 'remote' && service === 'turn_on') {
          get().updateEntityState(eid, 'on');
        } else if (domain === 'remote' && service === 'turn_off') {
          get().updateEntityState(eid, 'off');
        } else if (service === 'send_command' && domain === 'remote') {
          // Keep remote active
          get().updateEntityState(eid, 'on');
        } else if (service === 'start' || service === 'start_cleaning') {
          get().updateEntityState(eid, 'cleaning');
        } else if (service === 'return_to_base') {
          get().updateEntityState(eid, 'returning');
        } else if (service === 'pause') {
          get().updateEntityState(eid, 'paused');
        } else if (service === 'set_percentage' && serviceData.percentage !== undefined) {
          get().updateEntityState(eid, serviceData.percentage > 0 ? 'on' : 'off', { percentage: serviceData.percentage });
        } else if (domain === 'fan' && service === 'oscillate') {
          get().updateEntityState(eid, currentState || 'on', { oscillating: Boolean(serviceData.oscillating) });
        } else if (domain === 'fan' && service === 'set_direction') {
          get().updateEntityState(eid, currentState || 'on', { direction: serviceData.direction });
        } else if (domain === 'fan' && service === 'set_preset_mode') {
          get().updateEntityState(eid, currentState || 'on', { preset_mode: serviceData.preset_mode });
        } else if (domain === 'fan' && (service === 'set_oscillation_angle' || service === 'set_angle')) {
          get().updateEntityState(eid, currentState || 'on', { 
            oscillation_angle: serviceData.angle || serviceData.oscillation_angle,
            angle: serviceData.angle || serviceData.oscillation_angle 
          });
        } else if (domain === 'fan' && service === 'set_target_temperature') {
          get().updateEntityState(eid, currentState || 'on', { target_temperature: serviceData.temperature || serviceData.target_temperature });
        } else if (domain === 'update') {
          if (service === 'install') {
            get().updateEntityState(eid, 'off', { in_progress: false, installed_version: currentAttrs.latest_version || currentAttrs.installed_version });
          } else if (service === 'skip') {
            get().updateEntityState(eid, 'off', { skipped_version: currentAttrs.latest_version });
          } else if (service === 'clear_skipped') {
            get().updateEntityState(eid, 'on', { skipped_version: null });
          }
        } else if (domain === 'persistent_notification' && service === 'dismiss') {
          get().updateEntityState(eid, 'dismissed');
        } else if (domain === 'alarm_control_panel' || service.startsWith('alarm_')) {
          if (service === 'alarm_arm_home') {
            get().updateEntityState(eid, 'armed_home', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_arm_away') {
            get().updateEntityState(eid, 'armed_away', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_arm_night') {
            get().updateEntityState(eid, 'armed_night', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_disarm') {
            get().updateEntityState(eid, 'disarmed', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_trigger') {
            get().updateEntityState(eid, 'triggered', { changed_by: 'Alarm Trigger', last_changed: new Date().toISOString() });
          }
        } else if (domain === 'button' && service === 'press') {
          get().updateEntityState(eid, new Date().toISOString(), { last_pressed: new Date().toISOString() });
        } else if (domain === 'select' && service === 'select_option' && serviceData.option) {
          get().updateEntityState(eid, String(serviceData.option));
        }
      }
    }
  },

  reassignEntityArea: (entityId: string, newAreaId: string | null) => {
    set(prev => {
      const updatedRegistry = prev.entityRegistry.map(e => {
        if (e.entity_id === entityId) {
          return { ...e, area_id: newAreaId };
        }
        return e;
      });

      return { entityRegistry: updatedRegistry };
    });

    get().recomputeGraph();
  },

  updateFloor: (floorId: string, updates: Partial<HAFloor>) => {
    set(prev => {
      const updatedFloors = prev.floors.map(f => {
        if (f.floor_id === floorId) {
          return { ...f, ...updates };
        }
        return f;
      });
      return { floors: updatedFloors, rawFloors: updatedFloors };
    });
    get().recomputeGraph();
  },

  updateArea: (areaId: string, updates: Partial<HAArea>) => {
    set(prev => {
      const updatedAreas = prev.areas.map(a => {
        if (a.area_id === areaId) {
          return { ...a, ...updates };
        }
        return a;
      });
      return { areas: updatedAreas, rawAreas: updatedAreas };
    });
    get().recomputeGraph();
  },

  updateLabel: (labelId: string, updates: Partial<HALabel>) => {
    set(prev => {
      const updatedLabels = prev.labels.map(l => {
        if (l.label_id === labelId) {
          return { ...l, ...updates };
        }
        return l;
      });
      return { labels: updatedLabels, rawLabels: updatedLabels };
    });
    get().recomputeGraph();
  },

  reorderFloors: (newFloors: HAFloor[]) => {
    const indexed = newFloors.map((f, idx) => ({ ...f, order: idx }));
    set({ floors: indexed, rawFloors: indexed });
    get().recomputeGraph();
  },

  reorderAreas: (newAreas: HAArea[]) => {
    const indexed = newAreas.map((a, idx) => ({ ...a, order: idx }));
    set({ areas: indexed, rawAreas: indexed });
    get().recomputeGraph();
  },

  addFloor: (floor: Partial<HAFloor>) => {
    const id = floor.floor_id || `floor_${Date.now()}`;
    const newFloor: HAFloor = {
      floor_id: id,
      name: floor.name || 'New Floor',
      level: floor.level ?? get().floors.length,
      icon: floor.icon || 'Stairs',
      color: floor.color || '#38bdf8',
      order: get().floors.length
    };
    set(prev => ({
      floors: [...prev.floors, newFloor],
      rawFloors: [...prev.rawFloors, newFloor]
    }));
    get().recomputeGraph();
  },

  addArea: (area: Partial<HAArea>) => {
    const id = area.area_id || `area_${Date.now()}`;
    const newArea: HAArea = {
      area_id: id,
      name: area.name || 'New Area',
      floor_id: area.floor_id || null,
      icon: area.icon || 'Armchair',
      color: area.color || '#38bdf8',
      order: get().areas.length
    };
    set(prev => ({
      areas: [...prev.areas, newArea],
      rawAreas: [...prev.rawAreas, newArea]
    }));
    get().recomputeGraph();
  },

  deleteFloor: (floorId: string) => {
    set(prev => {
      const remainingFloors = prev.floors.filter(f => f.floor_id !== floorId);
      const updatedAreas = prev.areas.map(a => a.floor_id === floorId ? { ...a, floor_id: null } : a);
      return {
        floors: remainingFloors,
        rawFloors: remainingFloors,
        areas: updatedAreas,
        rawAreas: updatedAreas
      };
    });
    get().recomputeGraph();
  },

  deleteArea: (areaId: string) => {
    set(prev => {
      const remainingAreas = prev.areas.filter(a => a.area_id !== areaId);
      const updatedRegistry = prev.entityRegistry.map(e => e.area_id === areaId ? { ...e, area_id: null } : e);
      return {
        areas: remainingAreas,
        rawAreas: remainingAreas,
        entityRegistry: updatedRegistry
      };
    });
    get().recomputeGraph();
  },

  applyConfigCustomizations: (config: any) => {
    if (!config || typeof config !== 'object') return;
    set(prev => {
      let newAreas = [...prev.areas];
      let newFloors = [...prev.floors];
      let newResolved = { ...prev.resolvedEntities };

      // 1. Process Area Overrides
      const areaOverrides = config.rooms?.areaOverrides || config.areas;
      if (areaOverrides && typeof areaOverrides === 'object') {
        newAreas = newAreas.map(a => {
          const custom = areaOverrides[a.area_id];
          if (custom) {
            return {
              ...a,
              name: custom.customName || custom.name || a.name,
              icon: custom.customIcon || custom.icon || a.icon,
              color: custom.customColor || custom.color || a.color,
              picture: custom.backgroundImageUrl || custom.picture || a.picture
            };
          }
          return a;
        });
      }

      // 2. Process Floor Overrides
      if (config.floors && typeof config.floors === 'object') {
        newFloors = newFloors.map(f => {
          const custom = config.floors[f.floor_id];
          if (custom) {
            return {
              ...f,
              name: custom.name || f.name,
              icon: custom.icon || f.icon,
              color: custom.color || f.color,
              level: custom.level !== undefined ? custom.level : f.level
            };
          }
          return f;
        });
      }

      // 2.5 Process Label Overrides
      let newLabels = [...prev.labels];
      if (config.labels && typeof config.labels === 'object') {
        newLabels = newLabels.map(l => {
          const custom = config.labels[l.label_id];
          if (custom) {
            return {
              ...l,
              name: custom.name || l.name,
              icon: custom.icon || l.icon,
              color: custom.color || l.color,
              description: custom.description || l.description
            };
          }
          return l;
        });
      }

      // 3. Process Entity Customizations
      const entityCustoms = config.entities?.customizations || config.entities;
      if (entityCustoms && typeof entityCustoms === 'object') {
        for (const [id, custom] of Object.entries(entityCustoms as Record<string, any>)) {
          if (newResolved[id] && custom) {
            newResolved[id] = {
              ...newResolved[id],
              name: custom.customName || custom.name || newResolved[id].name,
              icon: custom.customIcon || custom.icon || newResolved[id].icon,
              hidden: custom.hidden !== undefined ? custom.hidden : newResolved[id].hidden
            };
          }
        }
      }

      // Process Entity Icon Overrides
      if (config.entities?.iconOverrides && typeof config.entities.iconOverrides === 'object') {
        for (const [id, icon] of Object.entries(config.entities.iconOverrides as Record<string, string>)) {
          if (newResolved[id] && icon) {
            newResolved[id] = {
              ...newResolved[id],
              icon
            };
          }
        }
      }

      // Process Entity Name Overrides
      if (config.entities?.nameOverrides && typeof config.entities.nameOverrides === 'object') {
        for (const [id, name] of Object.entries(config.entities.nameOverrides as Record<string, string>)) {
          if (newResolved[id] && name) {
            newResolved[id] = {
              ...newResolved[id],
              name
            };
          }
        }
      }

      const nextEntityCustomizations = {
        ...prev.entityCustomizations,
        ...(typeof entityCustoms === 'object' ? entityCustoms : {})
      };

      if (Array.isArray(config.entities?.hiddenEntityIds)) {
        for (const hiddenId of config.entities.hiddenEntityIds) {
          nextEntityCustomizations[hiddenId] = {
            ...(nextEntityCustomizations[hiddenId] || {}),
            hidden: true
          };
          if (newResolved[hiddenId]) {
            newResolved[hiddenId] = {
              ...newResolved[hiddenId],
              hidden: true
            };
          }
        }
      }

      const selectedWeather = config.preferences?.selectedWeatherEntityId || prev.selectedWeatherEntityId;
      const selectedAlarm = config.preferences?.selectedAlarmEntityId || prev.selectedAlarmEntityId;
      const dismissedIds = Array.isArray(config.preferences?.dismissedNotificationIds)
        ? Array.from(new Set([...prev.dismissedNotificationIds, ...config.preferences.dismissedNotificationIds]))
        : prev.dismissedNotificationIds;

      return {
        areas: newAreas,
        rawAreas: newAreas,
        floors: newFloors,
        rawFloors: newFloors,
        labels: newLabels,
        rawLabels: newLabels,
        resolvedEntities: newResolved,
        entityCustomizations: nextEntityCustomizations,
        selectedWeatherEntityId: selectedWeather,
        selectedAlarmEntityId: selectedAlarm,
        dismissedNotificationIds: dismissedIds
      };
    });
    get().recomputeGraph();
  },

  updateEntityCustomization: (
    entityId: string,
    updates: { customName?: string; customIcon?: string; icon?: string; hidden?: boolean }
  ) => {
    set(prev => {
      const nextCustomizations = {
        ...prev.entityCustomizations,
        [entityId]: {
          ...(prev.entityCustomizations[entityId] || {}),
          ...updates
        }
      };
      const nextResolved = { ...prev.resolvedEntities };
      if (nextResolved[entityId]) {
        nextResolved[entityId] = {
          ...nextResolved[entityId],
          name:
            updates.customName !== undefined
              ? updates.customName || nextResolved[entityId].name
              : nextResolved[entityId].name,
          icon: updates.customIcon || updates.icon || nextResolved[entityId].icon,
          hidden: updates.hidden !== undefined ? updates.hidden : nextResolved[entityId].hidden
        };
      }
      return { entityCustomizations: nextCustomizations, resolvedEntities: nextResolved };
    });
  },

  setEntityHidden: (entityId: string, hidden: boolean) => {
    set(prev => {
      const nextCustomizations = {
        ...prev.entityCustomizations,
        [entityId]: {
          ...(prev.entityCustomizations[entityId] || {}),
          hidden
        }
      };

      const updatedResolved = { ...prev.resolvedEntities };
      if (updatedResolved[entityId]) {
        updatedResolved[entityId] = {
          ...updatedResolved[entityId],
          hidden
        };
      }

      return {
        entityCustomizations: nextCustomizations,
        resolvedEntities: updatedResolved
      };
    });
    get().recomputeGraph();
  },

  bulkSetEntitiesHidden: (entityIds: string[], hidden: boolean) => {
    if (!entityIds || entityIds.length === 0) return;
    set(prev => {
      const nextCustomizations = { ...prev.entityCustomizations };
      const updatedResolved = { ...prev.resolvedEntities };

      for (const eid of entityIds) {
        nextCustomizations[eid] = {
          ...(nextCustomizations[eid] || {}),
          hidden
        };
        if (updatedResolved[eid]) {
          updatedResolved[eid] = {
            ...updatedResolved[eid],
            hidden
          };
        }
      }

      return {
        entityCustomizations: nextCustomizations,
        resolvedEntities: updatedResolved
      };
    });
    get().recomputeGraph();
  },

  dismissNotification: (id: string) => {
    set(prev => {
      const nextIds = Array.from(new Set([...prev.dismissedNotificationIds, id]));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(nextIds));
        } catch {}
      }
      return { dismissedNotificationIds: nextIds };
    });
  },

  restoreNotification: (id: string) => {
    set(prev => {
      const nextIds = prev.dismissedNotificationIds.filter(item => item !== id);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(nextIds));
        } catch {}
      }
      return { dismissedNotificationIds: nextIds };
    });
  },

  clearAllNotifications: (ids: string[]) => {
    set(prev => {
      const nextIds = Array.from(new Set([...prev.dismissedNotificationIds, ...ids]));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(nextIds));
        } catch {}
      }
      return { dismissedNotificationIds: nextIds };
    });
  },

  installUpdate: async (entityId: string) => {
    const current = get().states[entityId];
    const attrs = current?.attributes || {};
    const latest = attrs.latest_version || attrs.installed_version || 'Latest';
    const friendlyName = attrs.friendly_name || attrs.title || entityId;

    // Step 1: Set immediate installing state with initial percentage
    get().updateEntityState(entityId, 'installing', {
      in_progress: true,
      update_percentage: 15
    });

    // Send the live service call to Home Assistant (both service_data and target for wide HA version support)
    try {
      await haWebSocketService.callService('update', 'install', { backup: false, entity_id: entityId }, { entity_id: entityId });
    } catch (e) {
      console.warn('[HA Update] Service call caught:', e);
    }

    // Step 2: Animated progress sequence for rich feedback
    setTimeout(() => {
      const st = get().states[entityId];
      if (st?.attributes?.in_progress || st?.state === 'installing') {
        get().updateEntityState(entityId, 'installing', {
          in_progress: true,
          update_percentage: 45
        });
      }
    }, 700);

    setTimeout(() => {
      const st = get().states[entityId];
      if (st?.attributes?.in_progress || st?.state === 'installing') {
        get().updateEntityState(entityId, 'installing', {
          in_progress: true,
          update_percentage: 80
        });
      }
    }, 1500);

    setTimeout(() => {
      // Step 3: Complete update - installed version becomes latest, state turns off (up to date)
      get().updateEntityState(entityId, 'off', {
        in_progress: false,
        update_percentage: 100,
        installed_version: latest,
        skipped_version: null
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ha_log_message', {
          detail: {
            type: 'info',
            msg: `Successfully installed ${friendlyName} v${latest}`,
            details: { entity_id: entityId, version: latest }
          }
        }));
      }
    }, 2400);
  },

  skipUpdate: async (entityId: string) => {
    const current = get().states[entityId];
    const latest = current?.attributes?.latest_version || 'skipped';
    get().updateEntityState(entityId, 'off', { skipped_version: latest, in_progress: false });
    await haWebSocketService.callService('update', 'skip', { entity_id: entityId }, { entity_id: entityId }).catch(() => {});
  },

  clearSkippedUpdate: async (entityId: string) => {
    get().updateEntityState(entityId, 'on', { skipped_version: null, in_progress: false });
    await haWebSocketService.callService('update', 'clear_skipped', { entity_id: entityId }, { entity_id: entityId }).catch(() => {});
  },

  setSelectedFloorId: (floorId: string | 'all') => set({ selectedFloorId: floorId }),

  setSelectedAreaId: (areaId: string | null) => set({ selectedAreaId: areaId }),
  setSelectedSettingsSection: (section: string | null) => set({ selectedSettingsSection: section }),
  setSelectedWeatherEntityId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem('ha_selected_weather_id', id);
        } else {
          localStorage.removeItem('ha_selected_weather_id');
        }
      } catch {}
    }
    set({ selectedWeatherEntityId: id });
  },
  setSelectedAlarmEntityId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem('ha_selected_alarm_id', id);
        } else {
          localStorage.removeItem('ha_selected_alarm_id');
        }
      } catch {}
    }
    set({ selectedAlarmEntityId: id });
  },
  setShowDiagnosticEntities: (show: boolean) => {
    set({ showDiagnosticEntities: show });
    get().recomputeGraph();
  },
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  getLegacyEntities: () => {
    const { resolvedEntities } = get();
    return Object.values(resolvedEntities).map(resolvedEntityToHAEntity);
  }
}));
