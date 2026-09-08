/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Devices & Entity Visibility Subpage (Redesigned)
 * Features:
 * - 4 Clear Grouping Modes: By Domain, By Area, By Device, or Flat Searchable List
 * - Instant Search with match count indicator & 1-tap "Show All Results" / "Hide All Results"
 * - Multi-Select with floating bulk action bar (Show Selected, Hide Selected, Select/Deselect All)
 * - Quick Category Filter Pills with live count badges and subcategory drill-downs
 * - Group-level bulk toggles ("Show All", "Hide All", group checkbox selection)
 * - Responsive mobile-first Entity Rows with iOS-style toggle switches and touch-friendly targets
 * - Floor & Area Styling, Labels, and Zones management
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal,
  HouseLine,
  Tag,
  MapPin,
  Cpu,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  CaretDown,
  CaretRight,
  PaintBrush,
  Lock,
  Plus,
  Trash,
  SquaresFour,
  Lightbulb,
  Plug,
  Thermometer,
  Fan,
  AppWindow,
  SpeakerHigh,
  VideoCamera,
  Broom,
  DoorOpen,
  Gauge,
  BatteryMedium,
  Drop,
  Fire,
  WifiHigh,
  Lightning,
  Wind,
  ShieldWarning,
  PersonSimpleWalk,
  Door,
  ListBullets,
  CheckCircle,
  ArrowsClockwise,
  PencilSimple,
  X,
  CheckSquare,
  Square,
  WarningOctagon,
  FolderSimple,
  Check,
  SidebarSimple,
  Armchair,
  ShieldCheck,
  MusicNotes,
  HardDrives,
  ShareNetwork,
  Car,
  Heartbeat,
  GitFork,
  GearSix
} from '@phosphor-icons/react';
import { HAEntity, HAArea, HAFloor, HALabel, HAZone, HADevice, ResolvedEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useUserConfig } from '../../contexts/ConfigContext';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import IconPickerField from '../ui/IconPickerField';
import EntityCustomizerModal from '../modals/EntityCustomizerModal';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';
import { isRainOrWeatherSensor } from '../../lib/entityClassifiers';

interface DeviceVisibilitySectionProps {
  darkMode: boolean;
  entities: HAEntity[];
  setEntities: React.Dispatch<React.SetStateAction<HAEntity[]>>;
  floors: HAFloor[];
  areas: HAArea[];
  rawDevices: HADevice[];
  labels: HALabel[];
  resolvedZones: HAZone[];
  resolvedEntities: Record<string, ResolvedEntity>;
  updateFloor: (floorId: string, updates: Partial<HAFloor>) => void;
  updateArea: (areaId: string, updates: Partial<HAArea>) => void;
  reorderFloors: (newFloors: HAFloor[]) => void;
  reorderAreas: (newAreas: HAArea[]) => void;
  callHAService: (domain: string, service: string, serviceData?: any, target?: any) => Promise<void>;
  updateEntityState: (entityId: string, newState: string, newAttributes?: any) => void;
  addToast?: (toast: any) => void;
  addLog: (type: any, message: string, details?: any) => void;
}

const PRESET_COLORS = [
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#10b981',
  '#f59e0b', '#f97316', '#f43f5e', '#06b6d4', '#64748b'
];

const FLOOR_ICON_OPTIONS = [
  'Stairs', 'House', 'Buildings', 'Tree', 'Shield', 'Armchair', 'Sparkle', 'Compass', 'Stack', 'ArrowsVertical'
];

const AREA_ICON_OPTIONS = [
  'Armchair', 'Bed', 'CookingPot', 'Desktop', 'Bathtub', 'FilmSlate', 'Tree', 'Car', 'Books', 'DoorOpen', 'Lightbulb', 'HouseLine'
];

export interface NavigationPageMeta {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  mandatory?: boolean;
  description: string;
  color: string;
}

export const NAVIGATION_PAGES: NavigationPageMeta[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: SquaresFour,
    mandatory: true,
    description: 'Main home dashboard with quick actions, weather, and room cards.',
    color: '#0ea5e9'
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: Armchair,
    mandatory: false,
    description: 'Per-room device control, lighting, climate, and environmental breakdown.',
    color: '#8b5cf6'
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: Lightning,
    mandatory: false,
    description: 'Solar production, power grid consumption, battery storage, and energy analytics.',
    color: '#f59e0b'
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldCheck,
    mandatory: false,
    description: 'Alarm panels, live camera feeds, door locks, and entry sensors.',
    color: '#ef4444'
  },
  {
    id: 'media',
    label: 'Media',
    icon: MusicNotes,
    mandatory: false,
    description: 'Audio players, smart speakers, media receivers, and playback controls.',
    color: '#ec4899'
  },
  {
    id: 'system',
    label: 'System',
    icon: HardDrives,
    mandatory: false,
    description: 'Host CPU/memory metrics, HA storage, and network latency telemetry.',
    color: '#06b6d4'
  },
  {
    id: 'network',
    label: 'Network',
    icon: ShareNetwork,
    mandatory: false,
    description: 'Connected network clients, router status, and throughput telemetry.',
    color: '#3b82f6'
  },
  {
    id: 'mobility',
    label: 'Mobility',
    icon: Car,
    mandatory: false,
    description: 'Electric vehicle charging, battery range, and car telemetry.',
    color: '#10b981'
  },
  {
    id: 'health',
    label: 'Health',
    icon: Heartbeat,
    mandatory: false,
    description: 'Indoor air quality, CO2, humidity, and home wellness metrics.',
    color: '#14b8a6'
  },
  {
    id: 'vacuums',
    label: 'Vacuums',
    icon: Broom,
    mandatory: false,
    description: 'Robot vacuum cleaners, docking status, and zone cleaning runs.',
    color: '#a855f7'
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: GitFork,
    mandatory: false,
    description: 'Home Assistant automations, scenes, and execution triggers.',
    color: '#f97316'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: GearSix,
    mandatory: true,
    description: 'Dashboard configuration, customization, backups, and connection settings.',
    color: '#64748b'
  }
];

// --- Subcategory Definitions for Binary Sensors ---
export type BinarySensorSubcategory =
  | 'all'
  | 'door'
  | 'window'
  | 'motion'
  | 'presence'
  | 'safety'
  | 'moisture'
  | 'connectivity'
  | 'power_binary'
  | 'other_binary';

// --- Subcategory Definitions for Sensors ---
export type SensorSubcategory =
  | 'all'
  | 'temperature'
  | 'humidity'
  | 'environmental'
  | 'energy'
  | 'battery'
  | 'network'
  | 'other_sensor';

export type GroupingMode = 'domain' | 'area' | 'device' | 'flat';

export default function DeviceVisibilitySection({
  darkMode,
  entities,
  setEntities,
  floors,
  areas,
  rawDevices,
  labels,
  resolvedZones,
  resolvedEntities,
  updateFloor,
  updateArea,
  reorderFloors,
  reorderAreas,
  callHAService,
  updateEntityState,
  addToast,
  addLog
}: DeviceVisibilitySectionProps) {
  const { config, updateConfig, flushPendingSave } = useUserConfig();
  const { setEntityHidden, bulkSetEntitiesHidden, updateLabel } = useAutoLayoutStore();

  // Master set of hidden entity IDs combining remote config hiddenEntityIds, customizations, and store
  const hiddenEntityIdsSet = useMemo(() => {
    const set = new Set<string>(config?.entities?.hiddenEntityIds || []);
    if (config?.entities?.customizations) {
      for (const [id, custom] of Object.entries(config.entities.customizations)) {
        if (custom.hidden === true) set.add(id);
        else if (custom.hidden === false) set.delete(id);
      }
    }
    return set;
  }, [config?.entities?.hiddenEntityIds, config?.entities?.customizations]);

  const isEntityHidden = useCallback((entity: ResolvedEntity | { entity_id: string; hidden?: boolean } | null | undefined): boolean => {
    if (!entity) return false;
    if (hiddenEntityIdsSet.has(entity.entity_id)) return true;
    return Boolean(entity.hidden);
  }, [hiddenEntityIdsSet]);

  // Main navigation tabs
  const [activeTab, setActiveTab] = useState<'pages' | 'visibility' | 'styling' | 'labels' | 'zones'>('pages');

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [binarySubcategory, setBinarySubcategory] = useState<BinarySensorSubcategory>('all');
  const [sensorSubcategory, setSensorSubcategory] = useState<SensorSubcategory>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [offlineOnlyFilter, setOfflineOnlyFilter] = useState<boolean>(false);

  // Grouping Mode
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('domain');

  // Multi-Selection State
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());

  // Accordion collapsed state for groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Floor/Area/Label/Entity styling modals
  const [editingFloor, setEditingFloor] = useState<HAFloor | null>(null);
  const [editingArea, setEditingArea] = useState<HAArea | null>(null);
  const [editingLabel, setEditingLabel] = useState<HALabel | null>(null);
  const [customizingEntity, setCustomizingEntity] = useState<ResolvedEntity | null>(null);

  // Helper to render phosphor icons
  const renderIconByName = (iconName?: string | null, size = 20, colorClass = '') => {
    return <DynamicPhosphorIcon name={iconName || 'Armchair'} size={size} weight="duotone" className={colorClass} />;
  };

  // --- Granular Classifier Functions ---
  const classifyBinarySensor = useCallback((entity: ResolvedEntity): BinarySensorSubcategory => {
    const rawClass = String(entity.attributes?.device_class || '').toLowerCase();
    const eid = entity.entity_id.toLowerCase();
    const fn = (entity.name || entity.attributes?.friendly_name || '').toLowerCase();

    if (rawClass === 'door' || rawClass === 'garage_door' || rawClass === 'opening' || eid.includes('door') || fn.includes('door') || eid.includes('garage') || fn.includes('garage') || eid.includes('gate') || fn.includes('gate')) {
      return 'door';
    }
    if (rawClass === 'window' || eid.includes('window') || fn.includes('window') || eid.includes('skylight')) {
      return 'window';
    }
    if (rawClass === 'motion' || eid.includes('motion') || fn.includes('motion') || eid.includes('pir') || fn.includes('movement')) {
      return 'motion';
    }
    if (rawClass === 'occupancy' || rawClass === 'presence' || eid.includes('presence') || fn.includes('presence') || eid.includes('occupancy') || fn.includes('occupancy') || eid.includes('person')) {
      return 'presence';
    }
    if (rawClass === 'smoke' || rawClass === 'gas' || rawClass === 'carbon_monoxide' || rawClass === 'safety' || rawClass === 'tamper' || rawClass === 'problem' || eid.includes('smoke') || eid.includes('gas') || eid.includes('co_') || eid.includes('fire') || eid.includes('tamper')) {
      return 'safety';
    }
    if (isRainOrWeatherSensor(entity)) {
      return 'other_binary';
    }
    if (rawClass === 'moisture' || eid.includes('leak') || fn.includes('leak') || eid.includes('moisture') || eid.includes('flood') || fn.includes('water')) {
      return 'moisture';
    }
    if (rawClass === 'connectivity' || eid.includes('connectivity') || eid.includes('ping') || eid.includes('online') || fn.includes('status') || eid.includes('connected')) {
      return 'connectivity';
    }
    if (rawClass === 'battery_charging' || rawClass === 'plug' || rawClass === 'power' || eid.includes('charging') || eid.includes('plugged') || fn.includes('power')) {
      return 'power_binary';
    }
    return 'other_binary';
  }, []);

  const classifySensor = useCallback((entity: ResolvedEntity): SensorSubcategory => {
    const rawClass = String(entity.attributes?.device_class || '').toLowerCase();
    const unit = String(entity.attributes?.unit_of_measurement || '');
    const eid = entity.entity_id.toLowerCase();
    const fn = (entity.name || entity.attributes?.friendly_name || '').toLowerCase();

    // 1. Battery percentage
    if (rawClass === 'battery' || eid.includes('battery') || fn.includes('battery') || (unit === '%' && (eid.includes('batt') || fn.includes('batt')))) {
      return 'battery';
    }
    // 2. Temperature
    if (rawClass === 'temperature' || unit.includes('°C') || unit.includes('°F') || unit === 'K' || eid.includes('temperature') || eid.includes('_temp') || fn.includes('temp')) {
      return 'temperature';
    }
    // 3. Humidity
    if (rawClass === 'humidity' || (unit === '%' && (eid.includes('humidity') || fn.includes('humidity') || eid.includes('hygro')))) {
      return 'humidity';
    }
    // 4. Energy & Electricity
    if (
      rawClass === 'energy' ||
      rawClass === 'power' ||
      rawClass === 'current' ||
      rawClass === 'voltage' ||
      rawClass === 'monetary' ||
      unit.toLowerCase() === 'w' ||
      unit.toLowerCase() === 'kw' ||
      unit.toLowerCase() === 'kwh' ||
      unit.toLowerCase() === 'wh' ||
      unit.toLowerCase() === 'v' ||
      unit.toLowerCase() === 'a' ||
      unit.toLowerCase() === 'ma' ||
      eid.includes('power') ||
      eid.includes('energy') ||
      eid.includes('kwh') ||
      eid.includes('watt') ||
      eid.includes('voltage') ||
      eid.includes('current') ||
      fn.includes('energy') ||
      fn.includes('power') ||
      fn.includes('consumption')
    ) {
      return 'energy';
    }
    // 5. Environmental & Air Quality
    if (
      rawClass === 'atmospheric_pressure' ||
      rawClass === 'carbon_dioxide' ||
      rawClass === 'carbon_monoxide' ||
      rawClass === 'pm25' ||
      rawClass === 'pm10' ||
      rawClass === 'volatile_organic_compounds' ||
      rawClass === 'illuminance' ||
      rawClass === 'uv_index' ||
      rawClass === 'air_quality' ||
      rawClass === 'aqi' ||
      unit.toLowerCase().includes('ppm') ||
      unit.toLowerCase().includes('lx') ||
      unit.toLowerCase().includes('lux') ||
      unit.toLowerCase().includes('hpa') ||
      unit.toLowerCase().includes('bar') ||
      unit.toLowerCase().includes('µg/m³') ||
      eid.includes('co2') ||
      eid.includes('air_quality') ||
      fn.includes('air quality') ||
      eid.includes('pressure') ||
      eid.includes('illuminance')
    ) {
      return 'environmental';
    }
    // 6. Network & Signal
    if (
      rawClass === 'signal_strength' ||
      rawClass === 'data_rate' ||
      rawClass === 'data_size' ||
      unit.toLowerCase().includes('dbm') ||
      unit.toLowerCase().includes('db') ||
      unit.toLowerCase().includes('mbps') ||
      unit.toLowerCase().includes('kbps') ||
      unit.toLowerCase().includes('ms') ||
      eid.includes('wifi') ||
      eid.includes('rssi') ||
      eid.includes('signal') ||
      eid.includes('ping') ||
      eid.includes('bandwidth') ||
      eid.includes('lqi') ||
      eid.includes('linkquality') ||
      fn.includes('signal') ||
      fn.includes('ping')
    ) {
      return 'network';
    }
    return 'other_sensor';
  }, []);

  // Category & Sub-Category Matching
  const matchesCategory = useCallback((entity: ResolvedEntity): boolean => {
    const domain = entity.domain;
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'light') return domain === 'light';
    if (categoryFilter === 'switch') return domain === 'switch';
    if (categoryFilter === 'climate') return domain === 'climate';
    if (categoryFilter === 'fan') return domain === 'fan';
    if (categoryFilter === 'cover') return domain === 'cover';
    if (categoryFilter === 'lock') return domain === 'lock';
    if (categoryFilter === 'media_player') return domain === 'media_player';
    if (categoryFilter === 'camera') return domain === 'camera';
    if (categoryFilter === 'vacuum') return domain === 'vacuum';

    if (categoryFilter === 'binary_sensor') {
      if (domain !== 'binary_sensor') return false;
      if (binarySubcategory === 'all') return true;
      return classifyBinarySensor(entity) === binarySubcategory;
    }

    if (categoryFilter === 'sensor') {
      if (domain !== 'sensor') return false;
      if (sensorSubcategory === 'all') return true;
      return classifySensor(entity) === sensorSubcategory;
    }

    if (categoryFilter === 'other') {
      return ![
        'light', 'switch', 'climate', 'fan', 'cover', 'lock',
        'media_player', 'camera', 'vacuum', 'binary_sensor', 'sensor'
      ].includes(domain);
    }

    return true;
  }, [categoryFilter, binarySubcategory, sensorSubcategory, classifyBinarySensor, classifySensor]);

  // Combined Search & Filter function
  const matchesFilter = useCallback((entity: ResolvedEntity): boolean => {
    if (!matchesCategory(entity)) return false;
    if (visibilityFilter === 'visible' && isEntityHidden(entity)) return false;
    if (visibilityFilter === 'hidden' && !isEntityHidden(entity)) return false;

    // Offline / unavailable filter
    if (offlineOnlyFilter) {
      const s = String(entity.state || '').toLowerCase();
      if (s !== 'unavailable' && s !== 'unknown') return false;
    }

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const friendlyName = (entity.name || entity.attributes?.friendly_name || '').toLowerCase();
    const entityId = entity.entity_id.toLowerCase();
    const areaName = (entity.area?.name || '').toLowerCase();
    const devName = (entity.device?.name || entity.device?.name_by_user || '').toLowerCase();
    const devModel = (entity.device?.model || '').toLowerCase();
    const domain = (entity.domain || '').toLowerCase();

    return friendlyName.includes(q) ||
      entityId.includes(q) ||
      areaName.includes(q) ||
      devName.includes(q) ||
      devModel.includes(q) ||
      domain.includes(q);
  }, [matchesCategory, visibilityFilter, isEntityHidden, offlineOnlyFilter, searchQuery]);

  // --- Entity Visibility Toggle Handlers ---
  const handleToggleEntityVisibility = useCallback((entityId: string, currentHidden: boolean) => {
    const nextHidden = !currentHidden;
    setEntityHidden(entityId, nextHidden);

    updateConfig(prev => {
      const hiddenList = new Set(prev.entities?.hiddenEntityIds || []);
      if (nextHidden) {
        hiddenList.add(entityId);
      } else {
        hiddenList.delete(entityId);
      }

      return {
        ...prev,
        entities: {
          ...(prev.entities || {}),
          hiddenEntityIds: Array.from(hiddenList),
          customizations: {
            ...(prev.entities?.customizations || {}),
            [entityId]: {
              ...(prev.entities?.customizations?.[entityId] || {}),
              hidden: nextHidden
            }
          }
        }
      };
    });

    addToast?.({
      type: nextHidden ? 'info' : 'success',
      title: nextHidden ? 'Entity Hidden' : 'Entity Visible',
      message: `${entityId} is now ${nextHidden ? 'hidden' : 'visible'}.`
    });
  }, [setEntityHidden, updateConfig, addToast]);

  // --- Page Visibility Toggle Handlers ---
  const handleTogglePageVisibility = useCallback((pageId: string, currentHidden: boolean) => {
    // Overview and Settings are required system pages and cannot be hidden
    if (pageId === 'overview' || pageId === 'settings') return;

    const nextHidden = !currentHidden;
    updateConfig(prev => {
      const hiddenList = new Set(prev.navigation?.hiddenPages || []);
      if (nextHidden) {
        hiddenList.add(pageId);
      } else {
        hiddenList.delete(pageId);
      }
      return {
        ...prev,
        navigation: {
          ...(prev.navigation || {}),
          hiddenPages: Array.from(hiddenList)
        }
      };
    });

    flushPendingSave();

    const pageMeta = NAVIGATION_PAGES.find(p => p.id === pageId);
    const pageName = pageMeta?.label || (pageId.charAt(0).toUpperCase() + pageId.slice(1));

    addToast?.({
      type: nextHidden ? 'info' : 'success',
      title: nextHidden ? `${pageName} Page Hidden` : `${pageName} Page Visible`,
      message: `${pageName} has been ${nextHidden ? 'removed from' : 'restored to'} navigation.`
    });
  }, [updateConfig, flushPendingSave, addToast]);

  const handleShowAllPages = useCallback(() => {
    updateConfig(prev => ({
      ...prev,
      navigation: {
        ...(prev.navigation || {}),
        hiddenPages: []
      }
    }));
    flushPendingSave();
    addToast?.({
      type: 'success',
      title: 'All Pages Shown',
      message: 'All optional pages are now visible in navigation.'
    });
  }, [updateConfig, flushPendingSave, addToast]);

  const handleBulkSetVisibility = useCallback((entityIds: string[], setHidden: boolean, scopeName: string, areaId?: string) => {
    if (!entityIds || entityIds.length === 0) return;
    bulkSetEntitiesHidden(entityIds, setHidden);

    updateConfig(prev => {
      const hiddenList = new Set(prev.entities?.hiddenEntityIds || []);
      const updatedCustomizations = { ...(prev.entities?.customizations || {}) };

      for (const eid of entityIds) {
        if (setHidden) {
          hiddenList.add(eid);
        } else {
          hiddenList.delete(eid);
        }
        updatedCustomizations[eid] = {
          ...(updatedCustomizations[eid] || {}),
          hidden: setHidden
        };
      }

      let updatedRooms = prev.rooms;
      if (areaId) {
        const hiddenAreas = new Set(prev.rooms?.hiddenAreas || []);
        if (setHidden) {
          hiddenAreas.add(areaId);
        } else {
          hiddenAreas.delete(areaId);
        }
        updatedRooms = {
          ...prev.rooms,
          hiddenAreas: Array.from(hiddenAreas)
        };
      }

      return {
        ...prev,
        rooms: updatedRooms,
        entities: {
          ...(prev.entities || {}),
          hiddenEntityIds: Array.from(hiddenList),
          customizations: updatedCustomizations
        }
      };
    });

    addToast?.({
      type: setHidden ? 'warning' : 'success',
      title: setHidden ? `Hidden in ${scopeName}` : `Shown in ${scopeName}`,
      message: `Updated ${entityIds.length} entities to ${setHidden ? 'hidden' : 'visible'}.`
    });
  }, [bulkSetEntitiesHidden, updateConfig, addToast]);

  // Master Resolved Entities List
  const allResolvedList = useMemo(() => Object.values(resolvedEntities), [resolvedEntities]);

  // Global Visibility Metrics
  const totalCount = allResolvedList.length;
  const hiddenCount = useMemo(() => allResolvedList.filter(e => isEntityHidden(e)).length, [allResolvedList, isEntityHidden]);
  const visibleCount = totalCount - hiddenCount;
  const visiblePercent = totalCount > 0 ? Math.round((visibleCount / totalCount) * 100) : 100;

  // Category Configuration Options
  const categoryConfigs = useMemo(() => [
    { id: 'all', label: 'All Entities', icon: SquaresFour, color: '#0ea5e9' },
    { id: 'light', label: 'Lights', icon: Lightbulb, color: '#f59e0b' },
    { id: 'switch', label: 'Switches', icon: Plug, color: '#10b981' },
    { id: 'climate', label: 'Climate', icon: Thermometer, color: '#06b6d4' },
    { id: 'fan', label: 'Fans', icon: Fan, color: '#38bdf8' },
    { id: 'cover', label: 'Covers', icon: AppWindow, color: '#818cf8' },
    { id: 'lock', label: 'Locks', icon: Lock, color: '#f43f5e' },
    { id: 'media_player', label: 'Media', icon: SpeakerHigh, color: '#a855f7' },
    { id: 'camera', label: 'Cameras', icon: VideoCamera, color: '#3b82f6' },
    { id: 'vacuum', label: 'Vacuums', icon: Broom, color: '#ec4899' },
    { id: 'binary_sensor', label: 'Binary Sensors', icon: DoorOpen, color: '#14b8a6' },
    { id: 'sensor', label: 'Sensors', icon: Gauge, color: '#6366f1' },
    { id: 'other', label: 'Other', icon: SlidersHorizontal, color: '#64748b' }
  ], []);

  const binarySubcategoryConfigs = useMemo(() => [
    { id: 'all' as BinarySensorSubcategory, label: 'All Binary', icon: DoorOpen },
    { id: 'door' as BinarySensorSubcategory, label: 'Doors & Entrances', icon: Door },
    { id: 'window' as BinarySensorSubcategory, label: 'Windows', icon: AppWindow },
    { id: 'motion' as BinarySensorSubcategory, label: 'Motion & PIR', icon: PersonSimpleWalk },
    { id: 'presence' as BinarySensorSubcategory, label: 'Presence & Occupancy', icon: PersonSimpleWalk },
    { id: 'safety' as BinarySensorSubcategory, label: 'Safety & Smoke', icon: Fire },
    { id: 'moisture' as BinarySensorSubcategory, label: 'Water Leaks', icon: Drop },
    { id: 'connectivity' as BinarySensorSubcategory, label: 'Connectivity', icon: WifiHigh },
    { id: 'power_binary' as BinarySensorSubcategory, label: 'Power / Charging', icon: Lightning },
    { id: 'other_binary' as BinarySensorSubcategory, label: 'Other Binary', icon: SlidersHorizontal }
  ], []);

  const sensorSubcategoryConfigs = useMemo(() => [
    { id: 'all' as SensorSubcategory, label: 'All Sensors', icon: Gauge },
    { id: 'temperature' as SensorSubcategory, label: 'Temperature', icon: Thermometer },
    { id: 'humidity' as SensorSubcategory, label: 'Humidity', icon: Drop },
    { id: 'environmental' as SensorSubcategory, label: 'Air & Climate', icon: Wind },
    { id: 'energy' as SensorSubcategory, label: 'Energy & Power', icon: Lightning },
    { id: 'battery' as SensorSubcategory, label: 'Battery Levels', icon: BatteryMedium },
    { id: 'network' as SensorSubcategory, label: 'Network & Signal', icon: WifiHigh },
    { id: 'other_sensor' as SensorSubcategory, label: 'Other Sensors', icon: SlidersHorizontal }
  ], []);

  // Filtered Entities matching all filters
  const activeMatchingEntities = useMemo(() => {
    return allResolvedList.filter(matchesFilter);
  }, [allResolvedList, matchesFilter]);

  // Active Category Meta info
  const activeCategoryInfo = useMemo(() => {
    const main = categoryConfigs.find(c => c.id === categoryFilter) || categoryConfigs[0];
    if (categoryFilter === 'binary_sensor' && binarySubcategory !== 'all') {
      const sub = binarySubcategoryConfigs.find(s => s.id === binarySubcategory);
      return {
        title: sub?.label || main.label,
        icon: sub?.icon || main.icon,
        color: main.color
      };
    }
    if (categoryFilter === 'sensor' && sensorSubcategory !== 'all') {
      const sub = sensorSubcategoryConfigs.find(s => s.id === sensorSubcategory);
      return {
        title: sub?.label || main.label,
        icon: sub?.icon || main.icon,
        color: main.color
      };
    }
    return {
      title: main.label,
      icon: main.icon,
      color: main.color
    };
  }, [categoryFilter, binarySubcategory, sensorSubcategory, categoryConfigs, binarySubcategoryConfigs, sensorSubcategoryConfigs]);

  // Active category specific totals
  const activeCategoryAllEntities = useMemo(() => {
    return allResolvedList.filter(matchesCategory);
  }, [allResolvedList, matchesCategory]);

  const activeCategoryTotalCount = activeCategoryAllEntities.length;
  const activeCategoryVisibleCount = activeCategoryAllEntities.filter(e => !isEntityHidden(e)).length;
  const activeCategoryHiddenCount = activeCategoryTotalCount - activeCategoryVisibleCount;
  const activeCategoryEntityIds = useMemo(() => activeCategoryAllEntities.map(e => e.entity_id), [activeCategoryAllEntities]);

  // --- Grouping Data Structures ---
  interface EntityGroup {
    id: string;
    title: string;
    subtitle?: string;
    icon?: any;
    color?: string;
    entities: ResolvedEntity[];
    allEntityIds: string[];
    visibleCount: number;
    totalCount: number;
  }

  const groupedData: EntityGroup[] = useMemo(() => {
    if (groupingMode === 'flat') {
      return [];
    }

    if (groupingMode === 'domain') {
      // Group by domain/category
      const groupsMap = new Map<string, ResolvedEntity[]>();
      
      activeMatchingEntities.forEach(ent => {
        let catId = ent.domain;
        if (!['light', 'switch', 'climate', 'fan', 'cover', 'lock', 'media_player', 'camera', 'vacuum', 'binary_sensor', 'sensor'].includes(catId)) {
          catId = 'other';
        }
        if (!groupsMap.has(catId)) groupsMap.set(catId, []);
        groupsMap.get(catId)!.push(ent);
      });

      const result: EntityGroup[] = [];
      categoryConfigs.forEach(cfg => {
        if (cfg.id === 'all') return;
        const ents = groupsMap.get(cfg.id) || [];
        if (ents.length === 0) return;

        const eIds = ents.map(e => e.entity_id);
        const visCount = ents.filter(e => !isEntityHidden(e)).length;

        result.push({
          id: cfg.id,
          title: cfg.label,
          icon: cfg.icon,
          color: cfg.color,
          entities: ents,
          allEntityIds: eIds,
          visibleCount: visCount,
          totalCount: ents.length
        });
      });

      return result;
    }

    if (groupingMode === 'area') {
      // Group by Area
      const areaMap = new Map<string, HAArea>(areas.map(a => [a.area_id, a]));
      const floorMap = new Map<string, HAFloor>(floors.map(f => [f.floor_id, f]));
      const areaGroups = new Map<string, ResolvedEntity[]>();
      const unassigned: ResolvedEntity[] = [];

      activeMatchingEntities.forEach(ent => {
        if (ent.area_id && areaMap.has(ent.area_id)) {
          if (!areaGroups.has(ent.area_id)) areaGroups.set(ent.area_id, []);
          areaGroups.get(ent.area_id)!.push(ent);
        } else {
          unassigned.push(ent);
        }
      });

      const result: EntityGroup[] = [];

      // Add assigned areas
      areas.forEach(area => {
        const ents = areaGroups.get(area.area_id) || [];
        if (ents.length === 0) return;

        const floor = area.floor_id ? floorMap.get(area.floor_id) : null;
        const eIds = ents.map(e => e.entity_id);
        const visCount = ents.filter(e => !isEntityHidden(e)).length;

        result.push({
          id: area.area_id,
          title: area.name,
          subtitle: floor ? `${floor.name} (Level ${floor.level ?? 0})` : 'Unassigned Floor',
          icon: area.icon || 'Armchair',
          color: area.color || '#6366f1',
          entities: ents,
          allEntityIds: eIds,
          visibleCount: visCount,
          totalCount: ents.length
        });
      });

      // Add unassigned area group
      if (unassigned.length > 0) {
        const eIds = unassigned.map(e => e.entity_id);
        const visCount = unassigned.filter(e => !isEntityHidden(e)).length;
        result.push({
          id: 'unassigned_area',
          title: 'Unassigned Area',
          subtitle: 'Entities not assigned to any room',
          icon: HouseLine,
          color: '#64748b',
          entities: unassigned,
          allEntityIds: eIds,
          visibleCount: visCount,
          totalCount: unassigned.length
        });
      }

      return result;
    }

    if (groupingMode === 'device') {
      // Group by Device
      const deviceMap = new Map<string, HADevice>(rawDevices.map(d => [d.id, d]));
      const devGroups = new Map<string, ResolvedEntity[]>();
      const standalone: ResolvedEntity[] = [];

      activeMatchingEntities.forEach(ent => {
        if (ent.device_id && deviceMap.has(ent.device_id)) {
          if (!devGroups.has(ent.device_id)) devGroups.set(ent.device_id, []);
          devGroups.get(ent.device_id)!.push(ent);
        } else {
          standalone.push(ent);
        }
      });

      const result: EntityGroup[] = [];

      rawDevices.forEach(dev => {
        const ents = devGroups.get(dev.id) || [];
        if (ents.length === 0) return;

        const eIds = ents.map(e => e.entity_id);
        const visCount = ents.filter(e => !isEntityHidden(e)).length;
        const area = dev.area_id ? areas.find(a => a.area_id === dev.area_id) : null;

        result.push({
          id: dev.id,
          title: dev.name_by_user || dev.name || 'Hardware Device',
          subtitle: [
            dev.manufacturer,
            dev.model,
            area ? `Room: ${area.name}` : null
          ].filter(Boolean).join(' • ') || 'Integration Device',
          icon: Cpu,
          color: '#0ea5e9',
          entities: ents,
          allEntityIds: eIds,
          visibleCount: visCount,
          totalCount: ents.length
        });
      });

      if (standalone.length > 0) {
        const eIds = standalone.map(e => e.entity_id);
        const visCount = standalone.filter(e => !isEntityHidden(e)).length;
        result.push({
          id: 'standalone_entities',
          title: 'Standalone / Virtual Entities',
          subtitle: 'Entities without associated hardware device',
          icon: SlidersHorizontal,
          color: '#8b5cf6',
          entities: standalone,
          allEntityIds: eIds,
          visibleCount: visCount,
          totalCount: standalone.length
        });
      }

      return result;
    }

    return [];
  }, [groupingMode, activeMatchingEntities, categoryConfigs, areas, floors, rawDevices, isEntityHidden]);

  // Global expand/collapse toggle
  const [allCollapsed, setAllCollapsed] = useState(false);
  const handleToggleExpandCollapseAll = () => {
    const next = !allCollapsed;
    setAllCollapsed(next);
    const map: Record<string, boolean> = {};
    groupedData.forEach(g => {
      map[g.id] = next;
    });
    setCollapsedGroups(map);
  };

  // --- Multi-Select Handlers ---
  const toggleSelectEntity = (entityId: string) => {
    setSelectedEntityIds(prev => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  };

  const handleSelectGroup = (groupEntityIds: string[], select: boolean) => {
    setSelectedEntityIds(prev => {
      const next = new Set(prev);
      groupEntityIds.forEach(id => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleSelectAllFiltered = (select: boolean) => {
    if (select) {
      setSelectedEntityIds(new Set(activeMatchingEntities.map(e => e.entity_id)));
    } else {
      setSelectedEntityIds(new Set());
    }
  };

  // Navigation Pages Metrics
  const hiddenPagesList = useMemo(() => config?.navigation?.hiddenPages || [], [config?.navigation?.hiddenPages]);
  const hiddenPagesSet = useMemo(() => new Set(hiddenPagesList), [hiddenPagesList]);
  const visiblePagesCount = NAVIGATION_PAGES.length - hiddenPagesList.length;

  // Sub-Navigation Tabs
  const subNavTabs: SectionTabItem[] = useMemo(() => [
    {
      id: 'pages',
      label: 'Navigation Pages',
      icon: SidebarSimple,
      badge: `${visiblePagesCount}/${NAVIGATION_PAGES.length}`,
      color: '#06b6d4'
    },
    {
      id: 'visibility',
      label: 'Entities',
      icon: Eye,
      badge: `${visibleCount}/${totalCount}`,
      color: '#3b82f6'
    },
    {
      id: 'styling',
      label: 'Room Styling',
      icon: PaintBrush,
      color: '#8b5cf6'
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: Tag,
      badge: labels.length,
      color: '#f59e0b'
    },
    {
      id: 'zones',
      label: 'Zones',
      icon: MapPin,
      badge: resolvedZones.length,
      color: '#10b981'
    }
  ], [visiblePagesCount, visibleCount, totalCount, labels.length, resolvedZones.length]);

  // Helper to render an individual entity row
  const renderEntityRow = (entity: ResolvedEntity) => {
    const isHidden = isEntityHidden(entity);
    const isSelected = selectedEntityIds.has(entity.entity_id);
    const domain = entity.domain;
    const isOnline = entity.state !== 'unavailable' && entity.state !== 'unknown';
    const isActive = entity.state === 'on' || entity.state === 'open' || entity.state === 'unlocked' || entity.state === 'playing';

    // Find area & device
    const areaObj = entity.area_id ? areas.find(a => a.area_id === entity.area_id) : null;
    const devObj = entity.device_id ? rawDevices.find(d => d.id === entity.device_id) : null;

    // Determine domain color
    const catCfg = categoryConfigs.find(c => c.id === domain) || categoryConfigs[categoryConfigs.length - 1];
    const domainColor = catCfg.color || '#64748b';

    return (
      <div
        key={entity.entity_id}
        className={`group relative rounded-2xl p-2.5 sm:p-3.5 transition-all duration-200 border ${
          isSelected
            ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/50 shadow-sm'
            : isHidden
              ? 'bg-slate-100/50 dark:bg-white/2 border-dashed border-slate-300/80 dark:border-white/5 opacity-65'
              : 'bg-white dark:bg-white/5 border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs'
        }`}
      >
        <div className="flex flex-col gap-1.5">
          {/* Top Row: Checkbox + Icon + Name/ID + Actions (Pencil & Toggle) */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
            {/* Left: Checkbox + Icon + Name & Entity ID */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Multi-Select Checkbox */}
              <button
                type="button"
                onClick={() => toggleSelectEntity(entity.entity_id)}
                className="p-1 rounded-lg text-slate-400 hover:text-sky-500 transition-colors shrink-0 cursor-pointer"
                title={isSelected ? 'Deselect entity' : 'Select for bulk action'}
              >
                {isSelected ? (
                  <CheckSquare size={20} weight="fill" className="text-sky-500" />
                ) : (
                  <Square size={20} className="text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                )}
              </button>

              {/* Entity Icon with domain badge */}
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border relative"
                style={{
                  backgroundColor: `${domainColor}15`,
                  borderColor: `${domainColor}35`,
                  color: domainColor
                }}
              >
                <DynamicPhosphorIcon name={entity.icon} size={18} weight="duotone" />
                {/* Online/Offline status dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    !isOnline
                      ? 'bg-rose-500'
                      : isActive
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                  }`}
                  title={`Status: ${entity.state}`}
                />
              </div>

              {/* Entity Name & ID */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {entity.name || entity.attributes?.friendly_name || entity.entity_id}
                  </span>
                  {!isOnline && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                      Offline
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                  {entity.entity_id}
                </span>
              </div>
            </div>

            {/* Right: Actions (Customize button + iOS Toggle Switch) */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Quick Customize Modal trigger */}
              <button
                type="button"
                onClick={() => setCustomizingEntity(entity)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/15 transition-all cursor-pointer"
                title="Customize Name, Icon & Area"
              >
                <PencilSimple size={16} weight="bold" />
              </button>

              {/* iOS-Style Toggle Switch */}
              <div className="flex items-center gap-1.5">
                <span className="hidden md:inline text-xs font-bold text-slate-600 dark:text-slate-300">
                  {!isHidden ? 'Visible' : 'Hidden'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isHidden}
                  onClick={() => handleToggleEntityVisibility(entity.entity_id, isHidden)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs ${
                    !isHidden ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={!isHidden ? 'Click to hide entity' : 'Click to make entity visible'}
                >
                  <span
                    className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out text-[10px] ${
                      !isHidden ? 'translate-x-5 text-emerald-600' : 'translate-x-0 text-slate-400'
                    }`}
                  >
                    {!isHidden ? <Eye size={11} weight="bold" /> : <EyeSlash size={11} weight="bold" />}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Area Badge, Device, State Pills (aligned under text) */}
          {(areaObj || devObj || entity.state) && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] pl-[46px] sm:pl-[52px]">
              {areaObj && (
                <button
                  type="button"
                  onClick={() => {
                    setGroupingMode('area');
                    setSearchQuery(areaObj.name);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                >
                  <HouseLine size={12} weight="duotone" />
                  <span>{areaObj.name}</span>
                </button>
              )}

              {devObj && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px] sm:max-w-none">
                  {devObj.name}
                </span>
              )}

              <span className="text-slate-400 font-mono">
                State: <strong className="text-slate-700 dark:text-slate-200">{entity.state}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-200 pb-28 md:pb-8">
      {/* Top Floating AdaptiveSectionTabs & Visibility Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
        <div className="min-w-0 max-w-full">
          <AdaptiveSectionTabs
            tabs={subNavTabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
            darkMode={darkMode}
          />
        </div>

        {/* Global Visibility Summary Card with visual progress bar */}
        {activeTab === 'pages' ? (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200/90 dark:border-white/10 backdrop-blur-md text-xs shadow-xs font-mono self-start sm:self-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                <Eye size={14} weight="bold" /> {visiblePagesCount} Visible
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <EyeSlash size={14} weight="bold" /> {hiddenPagesList.length} Hidden
              </span>
            </div>

            {/* Mini progress bar */}
            <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden shrink-0">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((visiblePagesCount / NAVIGATION_PAGES.length) * 100)}%` }}
                title={`${Math.round((visiblePagesCount / NAVIGATION_PAGES.length) * 100)}% visible`}
              />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {Math.round((visiblePagesCount / NAVIGATION_PAGES.length) * 100)}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200/90 dark:border-white/10 backdrop-blur-md text-xs shadow-xs font-mono self-start sm:self-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Eye size={14} weight="bold" /> {visibleCount}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <EyeSlash size={14} weight="bold" /> {hiddenCount}
              </span>
            </div>

            {/* Mini progress bar */}
            <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden shrink-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${visiblePercent}%` }}
                title={`${visiblePercent}% visible`}
              />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">{visiblePercent}%</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: NAVIGATION PAGES VISIBILITY */}
      {/* ========================================================================= */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          {/* Header Banner & Quick Controls */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-black/25 border border-slate-200/90 dark:border-white/10 backdrop-blur-md shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    <SidebarSimple size={18} weight="bold" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                    Navigation Menu Pages
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                    {visiblePagesCount} of {NAVIGATION_PAGES.length} Visible
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Customize which pages appear in the sidebar and mobile navigation. Hidden pages are completely removed from navigation menus. Overview and Settings are required and stay permanently visible.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleShowAllPages}
                  disabled={hiddenPagesList.length === 0}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    hiddenPagesList.length > 0
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-xs cursor-pointer'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Eye size={14} weight="bold" />
                  <span>Show All Optional Pages</span>
                </button>
              </div>
            </div>
          </div>

          {/* Page Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {NAVIGATION_PAGES.map((page) => {
              const isHidden = hiddenPagesSet.has(page.id);
              const isMandatory = page.mandatory;
              const PageIcon = page.icon;

              return (
                <div
                  key={page.id}
                  className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isHidden
                      ? 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-75 hover:opacity-100'
                      : 'bg-white/80 dark:bg-white/[0.04] border-slate-200/90 dark:border-white/10 shadow-xs hover:shadow-md hover:border-cyan-500/30 dark:hover:border-cyan-500/30'
                  }`}
                >
                  {/* Top Row: Icon + Title + Mandatory Badge / Toggle Switch */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                          style={{
                            backgroundColor: `${page.color}15`,
                            color: page.color,
                            borderColor: `${page.color}30`
                          }}
                        >
                          <PageIcon size={22} weight={isHidden ? 'regular' : 'bold'} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                              {page.label}
                            </h4>
                            {isMandatory && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-300/40 dark:border-white/10">
                                <Lock size={10} weight="bold" />
                                Required
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            /{page.id}
                          </span>
                        </div>
                      </div>

                      {/* Toggle Control or Lock */}
                      <div className="shrink-0 flex items-center">
                        {isMandatory ? (
                          <div
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                            title="Required page cannot be hidden"
                          >
                            <Lock size={16} weight="bold" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!isHidden}
                            aria-label={`Toggle visibility of ${page.label}`}
                            onClick={() => handleTogglePageVisibility(page.id, isHidden)}
                            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 flex items-center cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-500/40 ${
                              !isHidden
                                ? 'bg-emerald-500 dark:bg-emerald-500 shadow-sm shadow-emerald-500/20 justify-end'
                                : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            }`}
                          >
                            <motion.div
                              layout
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="w-5.5 h-5.5 rounded-full bg-white shadow-xs flex items-center justify-center"
                            >
                              {!isHidden ? (
                                <Eye size={12} weight="bold" className="text-emerald-600" />
                              ) : (
                                <EyeSlash size={12} weight="bold" className="text-slate-500" />
                              )}
                            </motion.div>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                      {page.description}
                    </p>
                  </div>

                  {/* Bottom Status Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          !isHidden ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      <span className={!isHidden ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {!isHidden ? 'Visible in Navigation' : 'Hidden from Navigation'}
                      </span>
                    </span>

                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                      {isMandatory ? 'Permanent' : isHidden ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: REDESIGNED ENTITY VISIBILITY MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'visibility' && (
        <div className="space-y-4">
          {/* Quick Category Filter Bar */}
          <div className="p-3 sm:p-4 rounded-3xl bg-white/70 dark:bg-black/25 border border-slate-200/90 dark:border-white/10 backdrop-blur-md shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal size={14} weight="bold" className="text-sky-500" />
                <span>Categories</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {allResolvedList.length} Total Registered
              </span>
            </div>

            {/* Scrollable Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 touch-scroll-x custom-scrollbar">
              {categoryConfigs.map(cat => {
                const isSelected = categoryFilter === cat.id;
                const IconComponent = cat.icon;
                
                const catEntities = cat.id === 'all'
                  ? allResolvedList
                  : cat.id === 'other'
                    ? allResolvedList.filter(e => ![
                        'light', 'switch', 'climate', 'fan', 'cover', 'lock',
                        'media_player', 'camera', 'vacuum', 'binary_sensor', 'sensor'
                      ].includes(e.domain))
                    : allResolvedList.filter(e => e.domain === cat.id);

                const count = catEntities.length;
                if (count === 0 && cat.id !== 'all') return null;
                const catVisible = catEntities.filter(e => !isEntityHidden(e)).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat.id);
                      if (cat.id === 'binary_sensor') setBinarySubcategory('all');
                      if (cat.id === 'sensor') setSensorSubcategory('all');
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md scale-102 border-transparent'
                        : 'bg-white/80 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <IconComponent
                      size={16}
                      weight={isSelected ? 'fill' : 'duotone'}
                      style={{ color: isSelected ? undefined : cat.color }}
                    />
                    <span>{cat.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold ${
                      isSelected
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                    }`}>
                      {catVisible}/{count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Granular Sub-Category Filter Bar for Binary Sensors */}
            {categoryFilter === 'binary_sensor' && (
              <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DoorOpen size={14} weight="bold" />
                    <span>Binary Sensor Sub-Classifications</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-x custom-scrollbar">
                  {binarySubcategoryConfigs.map(sub => {
                    const isSubSelected = binarySubcategory === sub.id;
                    const SubIcon = sub.icon;
                    const subEntities = sub.id === 'all'
                      ? allResolvedList.filter(e => e.domain === 'binary_sensor')
                      : allResolvedList.filter(e => e.domain === 'binary_sensor' && classifyBinarySensor(e) === sub.id);
                    
                    const count = subEntities.length;
                    if (count === 0 && sub.id !== 'all') return null;
                    const subVis = subEntities.filter(e => !isEntityHidden(e)).length;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setBinarySubcategory(sub.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                          isSubSelected
                            ? 'bg-teal-500 text-white border-teal-400 shadow-sm'
                            : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-teal-50 dark:hover:bg-teal-500/10'
                        }`}
                      >
                        <SubIcon size={14} weight={isSubSelected ? 'bold' : 'duotone'} />
                        <span>{sub.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isSubSelected ? 'bg-black/20 text-white font-bold' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                        }`}>
                          {subVis}/{count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Granular Sub-Category Filter Bar for Numerical Sensors */}
            {categoryFilter === 'sensor' && (
              <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge size={14} weight="bold" />
                    <span>Sensor Sub-Classifications</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-x custom-scrollbar">
                  {sensorSubcategoryConfigs.map(sub => {
                    const isSubSelected = sensorSubcategory === sub.id;
                    const SubIcon = sub.icon;
                    const subEntities = sub.id === 'all'
                      ? allResolvedList.filter(e => e.domain === 'sensor')
                      : allResolvedList.filter(e => e.domain === 'sensor' && classifySensor(e) === sub.id);
                    
                    const count = subEntities.length;
                    if (count === 0 && sub.id !== 'all') return null;
                    const subVis = subEntities.filter(e => !isEntityHidden(e)).length;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSensorSubcategory(sub.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                          isSubSelected
                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                            : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                        }`}
                      >
                        <SubIcon size={14} weight={isSubSelected ? 'bold' : 'duotone'} />
                        <span>{sub.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isSubSelected ? 'bg-black/20 text-white font-bold' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                        }`}>
                          {subVis}/{count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search, Filter & Grouping Controls Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/90 dark:bg-white/2 border border-slate-200 dark:border-white/10 backdrop-blur-md space-y-4 shadow-xs">
            {/* Top Row: Search Input + Visibility Segmented Control */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input with clear button */}
              <div className="relative flex-1 w-full">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, entity_id, room, device, domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              {/* Segmented Visibility Filter (All / Visible / Hidden) */}
              <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-white/10 border border-slate-300/80 dark:border-white/10 shrink-0">
                {(['all', 'visible', 'hidden'] as const).map(mode => {
                  const isSel = visibilityFilter === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setVisibilityFilter(mode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        isSel
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>

              {/* Offline / Unavailable filter pill */}
              <button
                type="button"
                onClick={() => setOfflineOnlyFilter(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                  offlineOnlyFilter
                    ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                    : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                title="Filter to entities currently offline or unavailable"
              >
                <WarningOctagon size={15} weight={offlineOnlyFilter ? 'fill' : 'duotone'} />
                <span>Offline Only</span>
              </button>
            </div>

            {/* Bottom Row: Grouping Selector + Category Bulk Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/5">
              {/* Grouping Mode Switcher */}
              <div className="flex items-center gap-2 flex-wrap max-w-full">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Group By:</span>
                <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-white/10 border border-slate-300/80 dark:border-white/10 overflow-x-auto touch-scroll-x custom-scrollbar max-w-full">
                  <button
                    type="button"
                    onClick={() => setGroupingMode('domain')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      groupingMode === 'domain'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FolderSimple size={14} weight="bold" />
                    <span>Domain</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupingMode('area')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      groupingMode === 'area'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <HouseLine size={14} weight="bold" />
                    <span>Room / Area</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupingMode('device')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      groupingMode === 'device'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Cpu size={14} weight="bold" />
                    <span>Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupingMode('flat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      groupingMode === 'flat'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ListBullets size={14} weight="bold" />
                    <span>Flat List</span>
                  </button>
                </div>

                {groupingMode !== 'flat' && (
                  <button
                    type="button"
                    onClick={handleToggleExpandCollapseAll}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                  >
                    {allCollapsed ? 'Expand All' : 'Collapse All'}
                  </button>
                )}
              </div>

              {/* Category Bulk Toggles / Search Result Bulk Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                {searchQuery.trim() ? (
                  // Search specific bulk actions
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(activeMatchingEntities.map(e => e.entity_id), false, `Search "${searchQuery}"`)}
                      disabled={activeMatchingEntities.length === 0}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-400 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Eye size={14} weight="bold" />
                      <span>Show All Matches ({activeMatchingEntities.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(activeMatchingEntities.map(e => e.entity_id), true, `Search "${searchQuery}"`)}
                      disabled={activeMatchingEntities.length === 0}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white border border-amber-400 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <EyeSlash size={14} weight="bold" />
                      <span>Hide All Matches</span>
                    </button>
                  </>
                ) : (
                  // Category specific bulk actions
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(activeCategoryEntityIds, false, activeCategoryInfo.title)}
                      disabled={activeCategoryTotalCount === 0 || activeCategoryHiddenCount === 0}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                        activeCategoryHiddenCount > 0
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 active:scale-95'
                          : 'bg-emerald-500/10 text-emerald-600/50 dark:text-emerald-400/40 border-emerald-500/15 cursor-not-allowed'
                      }`}
                      title={`Show all ${activeCategoryTotalCount} ${activeCategoryInfo.title}`}
                    >
                      <Eye size={14} weight="bold" />
                      <span>Show All {activeCategoryInfo.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(activeCategoryEntityIds, true, activeCategoryInfo.title)}
                      disabled={activeCategoryTotalCount === 0 || activeCategoryVisibleCount === 0}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                        activeCategoryVisibleCount > 0
                          ? 'bg-amber-500 hover:bg-amber-400 text-white border-amber-400 active:scale-95'
                          : 'bg-amber-500/10 text-amber-600/50 dark:text-amber-400/40 border-amber-500/15 cursor-not-allowed'
                      }`}
                      title={`Hide all ${activeCategoryTotalCount} ${activeCategoryInfo.title}`}
                    >
                      <EyeSlash size={14} weight="bold" />
                      <span>Hide All {activeCategoryInfo.title}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search matches notice if searching */}
          {searchQuery.trim() && (
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
              <span className="flex items-center gap-2">
                <MagnifyingGlass size={15} weight="bold" />
                <span>Found <strong>{activeMatchingEntities.length}</strong> entities matching "<strong>{searchQuery}</strong>"</span>
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ENTITY LISTINGS: GROUPED OR FLAT */}
          {/* ========================================================================= */}
          {activeMatchingEntities.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white/40 dark:bg-white/1 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
                <MagnifyingGlass size={24} weight="duotone" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No entities found
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No entities match your current filters and search query. Try clearing the search or switching the category filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setVisibilityFilter('all');
                  setOfflineOnlyFilter(false);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold shadow-xs hover:bg-sky-400 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : groupingMode === 'flat' ? (
            // Flat List Rendering
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 p-3 sm:p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                <span>All Matching Entities ({activeMatchingEntities.length})</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(selectedEntityIds.size !== activeMatchingEntities.length)}
                  className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                >
                  {selectedEntityIds.size === activeMatchingEntities.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2">
                {activeMatchingEntities.map(entity => renderEntityRow(entity))}
              </div>
            </div>
          ) : (
            // Grouped Accordion Cards (Domain, Area, Device)
            <div className="space-y-3.5">
              {groupedData.map(group => {
                const isCollapsed = Boolean(collapsedGroups[group.id]);
                const IconComponent = group.icon;
                const isAllSelected = group.allEntityIds.length > 0 && group.allEntityIds.every(id => selectedEntityIds.has(id));
                const isPartiallySelected = !isAllSelected && group.allEntityIds.some(id => selectedEntityIds.has(id));

                return (
                  <div
                    key={group.id}
                    className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/2 overflow-hidden shadow-xs transition-all"
                  >
                    {/* Group Header Card */}
                    <div className="p-3 sm:p-4 bg-slate-100/80 dark:bg-white/4 border-b border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                      {/* Top Row / Left Side: Checkbox + Chevron + Icon + Title + (Mobile Count Badge) */}
                      <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          {/* Group Multi-Select Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleSelectGroup(group.allEntityIds, !isAllSelected)}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-500 transition-colors shrink-0 cursor-pointer"
                            title={isAllSelected ? 'Deselect entire group' : 'Select entire group'}
                          >
                            {isAllSelected ? (
                              <CheckSquare size={20} weight="fill" className="text-sky-500" />
                            ) : isPartiallySelected ? (
                              <CheckSquare size={20} weight="duotone" className="text-sky-500 opacity-70" />
                            ) : (
                              <Square size={20} className="text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                            )}
                          </button>

                          {/* Chevron + Icon + Title */}
                          <div
                            onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none min-w-0 flex-1 group"
                          >
                            <button type="button" className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform shrink-0">
                              {isCollapsed ? <CaretRight size={18} weight="bold" /> : <CaretDown size={18} weight="bold" />}
                            </button>

                            <div
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0"
                              style={{
                                backgroundColor: `${group.color || '#0ea5e9'}15`,
                                borderColor: `${group.color || '#0ea5e9'}35`,
                                color: group.color || '#0ea5e9'
                              }}
                            >
                              {typeof IconComponent === 'function' ? (
                                <IconComponent size={18} weight="duotone" />
                              ) : (
                                renderIconByName(IconComponent, 18)
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors truncate">
                                {group.title}
                              </h4>
                              {group.subtitle && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                                  {group.subtitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Count Badge on Mobile */}
                        <span className={`sm:hidden text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                          group.visibleCount === group.totalCount
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : group.visibleCount === 0
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                        }`}>
                          {group.visibleCount} / {group.totalCount}
                        </span>
                      </div>

                      {/* Right Side / Bottom Row: Desktop Count Badge + 1-Tap Show All / Hide All */}
                      <div className="flex items-center gap-2 shrink-0 justify-end sm:justify-start pl-[52px] sm:pl-0 w-full sm:w-auto">
                        {/* Desktop Count Badge */}
                        <span className={`hidden sm:inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${
                          group.visibleCount === group.totalCount
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : group.visibleCount === 0
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                        }`}>
                          {group.visibleCount} / {group.totalCount}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleBulkSetVisibility(group.allEntityIds, false, group.title)}
                          disabled={group.visibleCount === group.totalCount}
                          className="flex-1 sm:flex-initial text-center px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-white/10 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Show All
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBulkSetVisibility(group.allEntityIds, true, group.title)}
                          disabled={group.visibleCount === 0}
                          className="flex-1 sm:flex-initial text-center px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-white/10 hover:bg-amber-50 text-slate-700 hover:text-amber-600 dark:text-slate-200 dark:hover:text-amber-400 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Hide All
                        </button>
                      </div>
                    </div>

                    {/* Entities inside Group */}
                    {!isCollapsed && (
                      <div className="p-3 sm:p-4 space-y-2">
                        {group.entities.map(entity => renderEntityRow(entity))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Multi-Select Action Bar (appears when 1 or more entities are selected) */}
          <AnimatePresence>
            {selectedEntityIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed bottom-5 inset-x-3 sm:inset-x-auto sm:right-8 z-50 sm:max-w-md p-3 sm:p-4 rounded-3xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <CheckSquare size={18} weight="bold" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block">
                      {selectedEntityIds.size} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(false)}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleBulkSetVisibility(Array.from(selectedEntityIds), false, 'Selected Entities');
                      setSelectedEntityIds(new Set());
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Eye size={14} weight="bold" />
                    <span>Show ({selectedEntityIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleBulkSetVisibility(Array.from(selectedEntityIds), true, 'Selected Entities');
                      setSelectedEntityIds(new Set());
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <EyeSlash size={14} weight="bold" />
                    <span>Hide ({selectedEntityIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEntityIds(new Set())}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    title="Dismiss selection"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROOM ICONS & COLORS (Grouped strictly by Floor) */}
      {/* ========================================================================= */}
      {activeTab === 'styling' && (
        <div className="space-y-6">
          {floors.map(floor => {
            const floorRooms = areas.filter(a => a.floor_id === floor.floor_id);

            return (
              <div
                key={floor.floor_id}
                className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 overflow-hidden shadow-xs space-y-3"
              >
                {/* Floor Header Bar with Floor Customization Trigger */}
                <div className="p-4 sm:p-5 bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0"
                      style={{
                        backgroundColor: `${floor.color || '#0ea5e9'}1a`,
                        borderColor: `${floor.color || '#0ea5e9'}40`,
                        color: floor.color || '#0ea5e9'
                      }}
                    >
                      {renderIconByName(floor.icon || 'Stairs', 22)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {floor.name}
                        </h4>
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          Level {floor.level ?? 0}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {floorRooms.length} Living Area{floorRooms.length === 1 ? '' : 's'} assigned
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingFloor(floor)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-sky-50 dark:hover:bg-sky-500/20 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <PaintBrush size={16} weight="bold" />
                    <span>Customize Floor</span>
                  </button>
                </div>

                {/* Rooms Grid inside Floor */}
                <div className="p-4 sm:p-5 pt-1">
                  {floorRooms.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                      No rooms assigned to {floor.name} yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {floorRooms.map(area => (
                        <div
                          key={area.area_id}
                          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/4 flex items-center justify-between shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                              style={{
                                backgroundColor: `${area.color || '#6366f1'}1a`,
                                borderColor: `${area.color || '#6366f1'}40`,
                                color: area.color || '#6366f1'
                              }}
                            >
                              {renderIconByName(area.icon || 'Armchair', 20)}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                {area.name}
                              </h5>
                              <span className="text-xs font-mono text-slate-400 truncate block">
                                {area.area_id}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingArea(area)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-white/10 dark:hover:bg-indigo-500/20 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                          >
                            <PaintBrush size={14} weight="bold" />
                            <span>Style</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 2. UNASSIGNED FLOOR ROOMS */}
          {areas.filter(a => !a.floor_id).length > 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/30 dark:bg-white/1 overflow-hidden shadow-xs space-y-3">
              <div className="p-4 sm:p-5 bg-slate-100/70 dark:bg-white/4 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <HouseLine size={24} weight="duotone" className="text-slate-400 shrink-0" />
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                    Unassigned Floor Rooms ({areas.filter(a => !a.floor_id).length})
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Rooms without an assigned floor in Home Assistant
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {areas.filter(a => !a.floor_id).map(area => (
                  <div
                    key={area.area_id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/4 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: `${area.color || '#6366f1'}1a`,
                          borderColor: `${area.color || '#6366f1'}40`,
                          color: area.color || '#6366f1'
                        }}
                      >
                        {renderIconByName(area.icon || 'Armchair', 20)}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {area.name}
                        </h5>
                        <span className="text-xs font-mono text-slate-400 truncate block">
                          {area.area_id}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingArea(area)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-white/10 dark:hover:bg-indigo-500/20 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                    >
                      <PaintBrush size={14} weight="bold" />
                      <span>Style</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LABELS */}
      {/* ========================================================================= */}
      {activeTab === 'labels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {labels.map(lbl => {
            const count = Object.values(resolvedEntities).filter(e => (e.labels || []).includes(lbl.label_id) || (e.labels || []).includes(lbl.name)).length;
            return (
              <div key={lbl.label_id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                      style={{
                        backgroundColor: `${lbl.color || '#6366f1'}1a`,
                        borderColor: `${lbl.color || '#6366f1'}40`,
                        color: lbl.color || '#6366f1'
                      }}
                    >
                      <DynamicPhosphorIcon name={lbl.icon || 'Tag'} size={18} weight="duotone" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{lbl.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingLabel(lbl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 dark:bg-white/10 dark:hover:bg-sky-500/20 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <PaintBrush size={13} weight="bold" />
                    <span>Style</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">{lbl.description || 'Home Assistant Tag'}</p>
                <span className="text-xs font-mono text-slate-400 block pt-1 font-semibold">{count} tagged entities</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ZONES */}
      {/* ========================================================================= */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resolvedZones.map(zone => (
            <div key={zone.entity_id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MapPin size={20} weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{zone.name}</h4>
                  <span className="text-xs font-mono text-slate-400">{zone.entity_id}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 text-xs space-y-1 font-mono">
                <div>Coordinates: {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</div>
                <div>Radius: {zone.radius}m</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals for Floor, Area, and Label Style Editing */}
      {editingFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Floor Style: {editingFloor.name}</h4>
            <div className="space-y-3">
              <IconPickerField
                label="Floor Icon"
                value={editingFloor.icon}
                defaultValue="Stairs"
                onChange={newIcon => setEditingFloor({ ...editingFloor, icon: newIcon || 'Stairs' })}
                accentColor={editingFloor.color || '#0ea5e9'}
                quickPresets={FLOOR_ICON_OPTIONS}
                modalTitle={`Select Icon for Floor: ${editingFloor.name}`}
                modalSubtitle="Choose any Phosphor icon for this floor level"
              />
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingFloor({ ...editingFloor, color: c })}
                      className={`w-7 h-7 rounded-full border-2 ${editingFloor.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingFloor(null)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  updateFloor(editingFloor.floor_id, { icon: editingFloor.icon, color: editingFloor.color });
                  await updateConfig(prev => ({
                    ...prev,
                    floors: {
                      ...(prev.floors || {}),
                      [editingFloor.floor_id]: {
                        ...(prev.floors?.[editingFloor.floor_id] || {}),
                        icon: editingFloor.icon,
                        color: editingFloor.color,
                        name: editingFloor.name
                      }
                    }
                  }));
                  await flushPendingSave();
                  setEditingFloor(null);
                  addToast?.({ type: 'success', title: 'Floor Saved', message: `Updated ${editingFloor.name} and synced to NAS.` });
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white cursor-pointer hover:bg-sky-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Area Style: {editingArea.name}</h4>
            <div className="space-y-3">
              <IconPickerField
                label="Area Icon"
                value={editingArea.icon}
                defaultValue="Armchair"
                onChange={newIcon => setEditingArea({ ...editingArea, icon: newIcon || 'Armchair' })}
                accentColor={editingArea.color || '#6366f1'}
                quickPresets={AREA_ICON_OPTIONS}
                modalTitle={`Select Icon for Area: ${editingArea.name}`}
                modalSubtitle="Choose any Phosphor icon for this living space"
              />
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingArea({ ...editingArea, color: c })}
                      className={`w-7 h-7 rounded-full border-2 ${editingArea.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingArea(null)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  updateArea(editingArea.area_id, { icon: editingArea.icon, color: editingArea.color });
                  await updateConfig(prev => ({
                    ...prev,
                    rooms: {
                      ...(prev.rooms || {}),
                      areaOverrides: {
                        ...(prev.rooms?.areaOverrides || {}),
                        [editingArea.area_id]: {
                          ...(prev.rooms?.areaOverrides?.[editingArea.area_id] || {}),
                          icon: editingArea.icon,
                          customIcon: editingArea.icon,
                          color: editingArea.color,
                          customColor: editingArea.color,
                          name: editingArea.name
                        }
                      }
                    },
                    areas: {
                      ...(prev.areas || {}),
                      [editingArea.area_id]: {
                        ...(prev.areas?.[editingArea.area_id] || {}),
                        icon: editingArea.icon,
                        customIcon: editingArea.icon,
                        color: editingArea.color,
                        customColor: editingArea.color,
                        name: editingArea.name
                      }
                    }
                  }));
                  await flushPendingSave();
                  setEditingArea(null);
                  addToast?.({ type: 'success', title: 'Area Saved', message: `Updated ${editingArea.name} and synced to NAS.` });
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 text-white cursor-pointer hover:bg-indigo-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Label Style: {editingLabel.name}</h4>
            <div className="space-y-3">
              <IconPickerField
                label="Label Icon"
                value={editingLabel.icon}
                defaultValue="Tag"
                onChange={newIcon => setEditingLabel({ ...editingLabel, icon: newIcon || 'Tag' })}
                accentColor={editingLabel.color || '#6366f1'}
                quickPresets={['Tag', 'Bookmark', 'Hash', 'Star', 'Heart', 'ShieldCheck', 'Flag', 'Sparkle']}
                modalTitle={`Select Icon for Label: ${editingLabel.name}`}
                modalSubtitle="Choose any Phosphor icon for this tag"
              />
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                      className={`w-7 h-7 rounded-full border-2 ${editingLabel.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingLabel(null)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  updateLabel(editingLabel.label_id, { icon: editingLabel.icon, color: editingLabel.color });
                  await updateConfig(prev => ({
                    ...prev,
                    labels: {
                      ...(prev.labels || {}),
                      [editingLabel.label_id]: {
                        ...(prev.labels?.[editingLabel.label_id] || {}),
                        icon: editingLabel.icon,
                        color: editingLabel.color,
                        name: editingLabel.name
                      }
                    }
                  }));
                  await flushPendingSave();
                  setEditingLabel(null);
                  addToast?.({ type: 'success', title: 'Label Saved', message: `Updated ${editingLabel.name} and synced to NAS.` });
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white cursor-pointer hover:bg-sky-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Customizer Modal with Phosphor Icon Finder */}
      <EntityCustomizerModal
        isOpen={Boolean(customizingEntity)}
        onClose={() => setCustomizingEntity(null)}
        entityId={customizingEntity?.entity_id || null}
        defaultName={customizingEntity?.name}
        defaultIcon={customizingEntity?.icon}
        domain={customizingEntity?.domain}
        areaName={customizingEntity?.area?.name}
        floorName={customizingEntity?.floor?.name}
        addToast={addToast}
      />
    </div>
  );
}
