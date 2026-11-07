/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { SlidersHorizontal, HouseLine, Tag, MapPin, Cpu, Eye, EyeSlash, PaintBrush, Lock, SquaresFour, Lightbulb, Plug, Thermometer, Fan, AppWindow, SpeakerHigh, VideoCamera, Broom, DoorOpen, Gauge, BatteryMedium, Drop, Fire, WifiHigh, Lightning, Wind, PersonSimpleWalk, Door, PencilSimple, CheckSquare, Square, SidebarSimple, Armchair } from '@phosphor-icons/react';
import { HAArea, HAFloor, HALabel, HADevice, ResolvedEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { useUserConfig } from '../../../contexts/ConfigContext';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { SectionTabItem } from '../../common/AdaptiveSectionTabs';
import { isRainOrWeatherSensor } from '../../../lib/entityClassifiers';
import { BinarySensorSubcategory, DeviceVisibilitySectionProps, GroupingMode, NAVIGATION_PAGES, SensorSubcategory } from './shared';

/**
 * State, derived data and handlers behind the Devices & Visibility settings page. The section
 * component lays out the tabs; each panel in this folder reads what it needs from this bag.
 */
export function useDeviceVisibilityState(props: DeviceVisibilitySectionProps) {
  const {
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
  } = props;

  const { config, updateConfig, flushPendingSave } = useUserConfig();
  const { setEntityHidden, bulkSetEntitiesHidden, updateLabel } = useAutoLayoutStore(useShallow((s) => ({ setEntityHidden: s.setEntityHidden, bulkSetEntitiesHidden: s.bulkSetEntitiesHidden, updateLabel: s.updateLabel })));

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
                    <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
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
                    className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out text-[11px] ${
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
  return {
    activeCategoryAllEntities,
    activeCategoryEntityIds,
    activeCategoryHiddenCount,
    activeCategoryInfo,
    activeCategoryTotalCount,
    activeCategoryVisibleCount,
    activeMatchingEntities,
    activeTab,
    addLog,
    addToast,
    allCollapsed,
    allResolvedList,
    areas,
    binarySubcategory,
    binarySubcategoryConfigs,
    bulkSetEntitiesHidden,
    callHAService,
    categoryConfigs,
    categoryFilter,
    classifyBinarySensor,
    classifySensor,
    collapsedGroups,
    config,
    customizingEntity,
    darkMode,
    editingArea,
    editingFloor,
    editingLabel,
    entities,
    floors,
    flushPendingSave,
    groupedData,
    groupingMode,
    handleBulkSetVisibility,
    handleSelectAllFiltered,
    handleSelectGroup,
    handleShowAllPages,
    handleToggleEntityVisibility,
    handleToggleExpandCollapseAll,
    handleTogglePageVisibility,
    hiddenCount,
    hiddenEntityIdsSet,
    hiddenPagesList,
    hiddenPagesSet,
    isEntityHidden,
    labels,
    matchesCategory,
    matchesFilter,
    offlineOnlyFilter,
    rawDevices,
    renderEntityRow,
    renderIconByName,
    reorderAreas,
    reorderFloors,
    resolvedEntities,
    resolvedZones,
    searchQuery,
    selectedEntityIds,
    sensorSubcategory,
    sensorSubcategoryConfigs,
    setActiveTab,
    setAllCollapsed,
    setBinarySubcategory,
    setCategoryFilter,
    setCollapsedGroups,
    setCustomizingEntity,
    setEditingArea,
    setEditingFloor,
    setEditingLabel,
    setEntities,
    setEntityHidden,
    setGroupingMode,
    setOfflineOnlyFilter,
    setSearchQuery,
    setSelectedEntityIds,
    setSensorSubcategory,
    setVisibilityFilter,
    subNavTabs,
    toggleSelectEntity,
    totalCount,
    updateArea,
    updateConfig,
    updateEntityState,
    updateFloor,
    updateLabel,
    visibilityFilter,
    visibleCount,
    visiblePagesCount,
    visiblePercent
  };
}

export type DeviceVisibilityState = ReturnType<typeof useDeviceVisibilityState>;
