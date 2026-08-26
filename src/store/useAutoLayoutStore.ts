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
  HAState,
  ResolvedEntity,
  ResolvedArea,
  ResolvedFloor,
  AutoLayoutMetrics,
  HAEntity,
  HassAreaWithEntities,
  SecurityOverviewState,
  OverviewSummaryState,
  AutoLayoutState
} from '../types';
import { resolveHAGraph, resolvedEntityToHAEntity } from '../services/graphResolution';
import { haWebSocketService, HAConnectionStatus } from '../services/haWebSocket';
import { MOCK_AREAS, MOCK_DEVICES, MOCK_ENTITY_REGISTRY, MOCK_FLOORS, MOCK_STATES } from '../data/mockRegistries';

export interface AutoLayoutStoreState {
  // Connection & Config
  isLiveMode: boolean;
  serverUrl: string;
  haToken: string;
  connectionStatus: HAConnectionStatus;
  connectionError: string | null;
  isLoading: boolean;
  error: string | null;

  // Raw Registries
  rawAreas: HAArea[];
  rawDevices: HADevice[];
  rawEntityRegistry: HAEntityRegistryEntry[];
  rawFloors: HAFloor[];
  rawStates: Record<string, HAState>;

  // Legacy arrays for compatibility
  areas: HAArea[];
  devices: HADevice[];
  entityRegistry: HAEntityRegistryEntry[];
  floors: HAFloor[];
  states: Record<string, HAState>;

  // Resolved Graph (Auto-Layout Structure & AutoLayoutState)
  resolvedEntities: Record<string, ResolvedEntity>;
  resolvedAreas: ResolvedArea[];
  areasMap: Record<string, HassAreaWithEntities>;
  resolvedFloors: ResolvedFloor[];
  unassignedEntities: ResolvedEntity[];
  domainGroups: Record<string, ResolvedEntity[]>;
  securityOverview: SecurityOverviewState;
  overviewSummary: OverviewSummaryState;
  metrics: AutoLayoutMetrics | null;

  // Filter & Navigation
  selectedFloorId: string | 'all';
  selectedAreaId: string | null;
  showDiagnosticEntities: boolean;
  searchQuery: string;

  // Actions
  init: () => void;
  setLiveMode: (live: boolean, url?: string, token?: string) => void;
  connectToHA: (url: string, token: string) => void;
  disconnectFromHA: () => void;
  reloadDemoData: () => void;
  
  // Graph & State Mutators
  recomputeGraph: () => void;
  updateEntityState: (entityId: string, newState: string, newAttributes?: Record<string, any>) => void;
  callHAService: (domain: string, service: string, serviceData?: Record<string, any>, target?: any) => Promise<void>;
  reassignEntityArea: (entityId: string, newAreaId: string | null) => void;
  
  // Navigation Setters
  setSelectedFloorId: (floorId: string | 'all') => void;
  setSelectedAreaId: (areaId: string | null) => void;
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
  lightsOnCount: 0,
  openOpeningsCount: 0,
  activeMediaCount: 0,
  activeClimatesCount: 0,
  activeSwitchesCount: 0,
  totalPowerWatts: 0
};

// Browser Caching Helpers for WebSocket Endpoint & Access Token
const getCachedServerUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ha_server_url');
    if (saved && saved.trim()) return saved;
  }
  return 'wss://hass.homz.internal/api/websocket';
};

const getCachedHaToken = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ha_token');
    if (saved && saved.trim()) return saved;
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
};

const getCachedLiveMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ha_live_mode') === 'true';
  }
  return false;
};

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
  rawStates: { ...MOCK_STATES },

  areas: [...MOCK_AREAS],
  devices: [...MOCK_DEVICES],
  entityRegistry: [...MOCK_ENTITY_REGISTRY],
  floors: [...MOCK_FLOORS],
  states: { ...MOCK_STATES },

  resolvedEntities: {},
  resolvedAreas: [],
  areasMap: {},
  resolvedFloors: [],
  unassignedEntities: [],
  domainGroups: {},
  securityOverview: INITIAL_SECURITY_OVERVIEW,
  overviewSummary: INITIAL_OVERVIEW_SUMMARY,
  metrics: null,

  selectedFloorId: 'all',
  selectedAreaId: null,
  showDiagnosticEntities: false,
  searchQuery: '',

  init: () => {
    const cachedUrl = getCachedServerUrl();
    const cachedToken = getCachedHaToken();
    const cachedLive = getCachedLiveMode();

    haWebSocketService.init({
      onStatusChange: (status, errorMsg) => {
        set({ 
          connectionStatus: status, 
          connectionError: errorMsg || null,
          isLoading: status === 'connecting',
          error: errorMsg || null
        });
      },
      onRegistriesLoaded: (payload) => {
        set({
          areas: payload.areas,
          devices: payload.devices,
          entityRegistry: payload.entityRegistry,
          floors: payload.floors,
          states: payload.states,
          rawAreas: payload.areas,
          rawDevices: payload.devices,
          rawEntityRegistry: payload.entityRegistry,
          rawFloors: payload.floors,
          rawStates: payload.states,
          isLoading: false,
          error: null
        });
        get().recomputeGraph();
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
        get().recomputeGraph();
      },
      onLogMessage: (type, msg, details) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ha_log_message', { detail: { type, msg, details } }));
        }
      }
    });

    // If live mode was previously enabled and valid credentials exist in browser cache, automatically connect!
    if (cachedLive && cachedUrl && cachedToken && !cachedUrl.includes('hass.homz.internal')) {
      set({ isLiveMode: true, serverUrl: cachedUrl, haToken: cachedToken });
      haWebSocketService.setDemoMode(false);
      haWebSocketService.connect(cachedUrl, cachedToken);
    } else {
      // Initial graph calculation with mock/demo data
      get().recomputeGraph();
    }
  },

  recomputeGraph: () => {
    const { areas, devices, entityRegistry, floors, states, showDiagnosticEntities } = get();
    const result = resolveHAGraph(areas, devices, entityRegistry, floors, states, {
      includeDiagnostics: showDiagnosticEntities
    });

    set({
      resolvedEntities: result.resolvedEntities,
      resolvedAreas: result.resolvedAreas,
      areasMap: result.areasMap,
      resolvedFloors: result.resolvedFloors,
      unassignedEntities: result.unassignedEntities,
      domainGroups: result.domainGroups,
      securityOverview: result.securityOverview,
      overviewSummary: result.overviewSummary,
      metrics: result.metrics
    });
  },

  setLiveMode: (live: boolean, url?: string, token?: string) => {
    const nextUrl = url || get().serverUrl;
    const nextToken = token || get().haToken;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('ha_live_mode', live ? 'true' : 'false');
      if (nextUrl) localStorage.setItem('ha_server_url', nextUrl);
      if (nextToken) localStorage.setItem('ha_token', nextToken);
    }

    set({ isLiveMode: live, serverUrl: nextUrl, haToken: nextToken });

    haWebSocketService.setDemoMode(!live);
    if (live) {
      haWebSocketService.connect(nextUrl, nextToken);
    } else {
      get().reloadDemoData();
    }
  },

  connectToHA: (url: string, token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ha_live_mode', 'true');
      localStorage.setItem('ha_server_url', url);
      localStorage.setItem('ha_token', token);
    }
    set({ isLiveMode: true, serverUrl: url, haToken: token });
    haWebSocketService.setDemoMode(false);
    haWebSocketService.connect(url, token);
  },

  disconnectFromHA: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ha_live_mode', 'false');
    }
    haWebSocketService.disconnect();
    set({ isLiveMode: false });
    get().reloadDemoData();
  },

  reloadDemoData: () => {
    set({
      areas: [...MOCK_AREAS],
      devices: [...MOCK_DEVICES],
      entityRegistry: [...MOCK_ENTITY_REGISTRY],
      floors: [...MOCK_FLOORS],
      states: { ...MOCK_STATES },
      connectionStatus: 'connected',
      connectionError: null
    });
    get().recomputeGraph();
  },

  updateEntityState: (entityId: string, newState: string, newAttributes?: Record<string, any>) => {
    set(prev => {
      const existing = prev.states[entityId] || {
        entity_id: entityId,
        state: newState,
        attributes: {}
      };

      const updatedState: HAState = {
        ...existing,
        state: newState,
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
        }
      };
    });

    get().recomputeGraph();
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
        } else if (service === 'media_play') {
          get().updateEntityState(eid, 'playing');
        } else if (service === 'media_pause') {
          get().updateEntityState(eid, 'paused');
        } else if (service === 'media_play_pause') {
          get().updateEntityState(eid, currentState === 'playing' ? 'paused' : 'playing');
        } else if (service === 'media_stop') {
          get().updateEntityState(eid, 'idle');
        } else if (service === 'volume_set' && serviceData.volume_level !== undefined) {
          get().updateEntityState(eid, currentState || 'playing', { volume_level: serviceData.volume_level });
        } else if (service === 'volume_mute') {
          get().updateEntityState(eid, currentState || 'playing', { is_volume_muted: serviceData.is_volume_muted });
        } else if (service === 'start' || service === 'start_cleaning') {
          get().updateEntityState(eid, 'cleaning');
        } else if (service === 'return_to_base') {
          get().updateEntityState(eid, 'returning');
        } else if (service === 'pause') {
          get().updateEntityState(eid, 'paused');
        } else if (service === 'set_percentage' && serviceData.percentage !== undefined) {
          get().updateEntityState(eid, serviceData.percentage > 0 ? 'on' : 'off', { percentage: serviceData.percentage });
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

  setSelectedFloorId: (floorId: string | 'all') => set({ selectedFloorId: floorId }),
  setSelectedAreaId: (areaId: string | null) => set({ selectedAreaId: areaId }),
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
