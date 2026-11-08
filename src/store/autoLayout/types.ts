/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAArea, HADevice, HAEntityRegistryEntry, HAFloor, HALabel, HAState, HAZone, ResolvedEntity, ResolvedArea, ResolvedFloor, AutoLayoutMetrics, HAEntity, HassAreaWithEntities, SecurityOverviewState, OverviewSummaryState, AutoLayoutState, HANativePersistentNotification, HANativeRepairIssue } from '../../types';
import { HAConnectionStatus } from '../../services/haWebSocket';
import type { StoreApi } from 'zustand';

export interface AutoLayoutStoreState {
  // Connection & Config
  isLiveMode: boolean;
  serverUrl: string;
  haToken: string;
  authType: 'oauth' | 'llat' | 'demo';
  connectionStatus: HAConnectionStatus;
  connectionError: string | null;
  haCoreVersion: string | null;
  /** Whether a cached snapshot from the last session is being read ('pending') or shown */
  snapshotStatus: 'pending' | 'hydrated' | 'none';
  /** True while the dashboard shows last-session data that live Home Assistant data hasn't replaced yet */
  showingCachedSnapshot: boolean;
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
  /** Local-only state write. Pass undefined/null as newState to change attributes only. */
  updateEntityState: (entityId: string, newState?: string | null, newAttributes?: Record<string, any>) => void;
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
  deleteArea: (areaId: string) => void;
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

export type SetState = StoreApi<AutoLayoutStoreState>['setState'];
export type GetState = () => AutoLayoutStoreState;
