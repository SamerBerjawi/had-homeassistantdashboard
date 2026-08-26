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
  HAEntity
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

  // Raw Registries
  areas: HAArea[];
  devices: HADevice[];
  entityRegistry: HAEntityRegistryEntry[];
  floors: HAFloor[];
  states: Record<string, HAState>;

  // Resolved Graph (HAPulse Structure)
  resolvedEntities: Record<string, ResolvedEntity>;
  resolvedAreas: ResolvedArea[];
  resolvedFloors: ResolvedFloor[];
  unassignedEntities: ResolvedEntity[];
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

export const useAutoLayoutStore = create<AutoLayoutStoreState>((set, get) => ({
  isLiveMode: false,
  serverUrl: 'wss://hass.homz.internal/api/websocket',
  haToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  connectionStatus: 'connected',
  connectionError: null,

  areas: [...MOCK_AREAS],
  devices: [...MOCK_DEVICES],
  entityRegistry: [...MOCK_ENTITY_REGISTRY],
  floors: [...MOCK_FLOORS],
  states: { ...MOCK_STATES },

  resolvedEntities: {},
  resolvedAreas: [],
  resolvedFloors: [],
  unassignedEntities: [],
  metrics: null,

  selectedFloorId: 'all',
  selectedAreaId: null,
  showDiagnosticEntities: false,
  searchQuery: '',

  init: () => {
    haWebSocketService.init({
      onStatusChange: (status, errorMsg) => {
        set({ connectionStatus: status, connectionError: errorMsg || null });
      },
      onRegistriesLoaded: (payload) => {
        set({
          areas: payload.areas,
          devices: payload.devices,
          entityRegistry: payload.entityRegistry,
          floors: payload.floors,
          states: payload.states
        });
        get().recomputeGraph();
      },
      onStateChanged: (entityId, newState) => {
        set(prev => ({
          states: {
            ...prev.states,
            [entityId]: newState
          }
        }));
        get().recomputeGraph();
      },
      onLogMessage: (type, msg, details) => {
        // Will be picked up by logging bus
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ha_log_message', { detail: { type, msg, details } }));
        }
      }
    });

    // Initial graph calculation with mock data
    get().recomputeGraph();
  },

  recomputeGraph: () => {
    const { areas, devices, entityRegistry, floors, states, showDiagnosticEntities } = get();
    const result = resolveHAGraph(areas, devices, entityRegistry, floors, states, {
      includeDiagnostics: showDiagnosticEntities
    });

    set({
      resolvedEntities: result.resolvedEntities,
      resolvedAreas: result.resolvedAreas,
      resolvedFloors: result.resolvedFloors,
      unassignedEntities: result.unassignedEntities,
      metrics: result.metrics
    });
  },

  setLiveMode: (live: boolean, url?: string, token?: string) => {
    const nextUrl = url || get().serverUrl;
    const nextToken = token || get().haToken;
    set({ isLiveMode: live, serverUrl: nextUrl, haToken: nextToken });

    haWebSocketService.setDemoMode(!live);
    if (live) {
      haWebSocketService.connect(nextUrl, nextToken);
    } else {
      get().reloadDemoData();
    }
  },

  connectToHA: (url: string, token: string) => {
    set({ isLiveMode: true, serverUrl: url, haToken: token });
    haWebSocketService.setDemoMode(false);
    haWebSocketService.connect(url, token);
  },

  disconnectFromHA: () => {
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
    await haWebSocketService.callService(domain, service, serviceData, target);

    // Optimistic local state update
    if (target?.entity_id) {
      const entityIds = Array.isArray(target.entity_id) ? target.entity_id : [target.entity_id];
      for (const eid of entityIds) {
        if (service === 'turn_on') {
          get().updateEntityState(eid, 'on', serviceData);
        } else if (service === 'turn_off') {
          get().updateEntityState(eid, 'off', serviceData);
        } else if (service === 'toggle') {
          const current = get().states[eid]?.state;
          get().updateEntityState(eid, current === 'on' ? 'off' : 'on', serviceData);
        } else if (service === 'set_temperature' && serviceData.temperature !== undefined) {
          get().updateEntityState(eid, 'cool', { temperature: serviceData.temperature });
        } else if (service === 'lock') {
          get().updateEntityState(eid, 'locked');
        } else if (service === 'unlock') {
          get().updateEntityState(eid, 'unlocked');
        } else if (service === 'start' || service === 'start_cleaning') {
          get().updateEntityState(eid, 'cleaning');
        } else if (service === 'return_to_base') {
          get().updateEntityState(eid, 'returning');
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
