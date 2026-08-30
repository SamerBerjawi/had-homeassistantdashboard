/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Devices & Entity Visibility Subpage
 * Clean, touch-friendly Floor > Area > Device > Entity hierarchical tree
 * with prominent typography, multi-level bulk actions, and search/filters.
 */

import React, { useState, useMemo } from 'react';
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
  Trash
} from '@phosphor-icons/react';
import { HAEntity, HAArea, HAFloor, HALabel, HAZone, HADevice, ResolvedEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useUserConfig } from '../../contexts/ConfigContext';
import CustomDropdown from '../ui/CustomDropdown';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';

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
  const { updateConfig } = useUserConfig();
  const { setEntityHidden, bulkSetEntitiesHidden } = useAutoLayoutStore();

  const [activeTab, setActiveTab] = useState<'visibility' | 'styling' | 'labels' | 'zones'>('visibility');
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  // Accordion expansion states
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>({});
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});
  const [collapsedDevices, setCollapsedDevices] = useState<Record<string, boolean>>({});

  // Floor/Area styling modals
  const [editingFloor, setEditingFloor] = useState<HAFloor | null>(null);
  const [editingArea, setEditingArea] = useState<HAArea | null>(null);

  // Helper to render phosphor icons
  const renderIconByName = (iconName?: string | null, size = 20, colorClass = '') => {
    return <DynamicPhosphorIcon name={iconName || 'Armchair'} size={size} weight="duotone" className={colorClass} />;
  };

  // --- Entity Visibility Toggle Handlers ---
  const handleToggleEntityVisibility = (entityId: string, currentHidden: boolean) => {
    const nextHidden = !currentHidden;
    setEntityHidden(entityId, nextHidden);

    updateConfig(prev => ({
      ...prev,
      entities: {
        ...(prev.entities || {}),
        [entityId]: {
          ...(prev.entities?.[entityId] || {}),
          hidden: nextHidden
        }
      }
    }));

    addToast?.({
      type: nextHidden ? 'info' : 'success',
      title: nextHidden ? 'Entity Hidden' : 'Entity Visible',
      message: `${entityId} is now ${nextHidden ? 'hidden' : 'visible'}.`
    });
  };

  const handleBulkSetVisibility = (entityIds: string[], setHidden: boolean, scopeName: string) => {
    if (!entityIds || entityIds.length === 0) return;
    bulkSetEntitiesHidden(entityIds, setHidden);

    updateConfig(prev => {
      const updatedEntities = { ...(prev.entities || {}) };
      for (const eid of entityIds) {
        updatedEntities[eid] = {
          ...(updatedEntities[eid] || {}),
          hidden: setHidden
        };
      }
      return {
        ...prev,
        entities: updatedEntities
      };
    });

    addToast?.({
      type: setHidden ? 'warning' : 'success',
      title: setHidden ? `Hidden in ${scopeName}` : `Shown in ${scopeName}`,
      message: `Updated ${entityIds.length} entities to ${setHidden ? 'hidden' : 'visible'}.`
    });
  };

  // --- Construct Hierarchical Graph: Floor > Area > Device > Entity ---
  const hierarchyData = useMemo(() => {
    const allResolvedList = Object.values(resolvedEntities);
    const deviceMap = new Map<string, HADevice>(rawDevices.map(d => [d.id, d]));
    const areaMap = new Map<string, HAArea>(areas.map(a => [a.area_id, a]));

    // 1. Group entities by Device ID or Standalone Area
    const entitiesByDevice = new Map<string, ResolvedEntity[]>();
    const entitiesByAreaStandalone = new Map<string, ResolvedEntity[]>();
    const looseUnassignedEntities: ResolvedEntity[] = [];

    allResolvedList.forEach(entity => {
      if (entity.device_id) {
        if (!entitiesByDevice.has(entity.device_id)) {
          entitiesByDevice.set(entity.device_id, []);
        }
        entitiesByDevice.get(entity.device_id)!.push(entity);
      } else if (entity.area_id) {
        if (!entitiesByAreaStandalone.has(entity.area_id)) {
          entitiesByAreaStandalone.set(entity.area_id, []);
        }
        entitiesByAreaStandalone.get(entity.area_id)!.push(entity);
      } else {
        looseUnassignedEntities.push(entity);
      }
    });

    // 2. Group Devices by Area ID
    const devicesByArea = new Map<string, HADevice[]>();
    const unassignedDevices: HADevice[] = [];

    rawDevices.forEach(device => {
      if (device.area_id && areaMap.has(device.area_id)) {
        if (!devicesByArea.has(device.area_id)) {
          devicesByArea.set(device.area_id, []);
        }
        devicesByArea.get(device.area_id)!.push(device);
      } else {
        unassignedDevices.push(device);
      }
    });

    // 3. Build Floors -> Areas structure
    const floorGroups: Array<{
      floor: HAFloor;
      areas: Array<{
        area: HAArea;
        devices: Array<{
          device: HADevice;
          entities: ResolvedEntity[];
        }>;
        standaloneEntities: ResolvedEntity[];
        allEntityIds: string[];
      }>;
      allEntityIds: string[];
    }> = [];

    floors.forEach(floor => {
      const floorAreas = areas.filter(a => a.floor_id === floor.floor_id);
      const areaList: any[] = [];
      const floorEntityIds: string[] = [];

      floorAreas.forEach(area => {
        const areaDevs = devicesByArea.get(area.area_id) || [];
        const standaloneEnts = entitiesByAreaStandalone.get(area.area_id) || [];
        const areaEntityIds: string[] = [];

        const devNodes = areaDevs.map(device => {
          const ents = entitiesByDevice.get(device.id) || [];
          ents.forEach(e => {
            areaEntityIds.push(e.entity_id);
            floorEntityIds.push(e.entity_id);
          });
          return { device, entities: ents };
        });

        standaloneEnts.forEach(e => {
          areaEntityIds.push(e.entity_id);
          floorEntityIds.push(e.entity_id);
        });

        areaList.push({
          area,
          devices: devNodes,
          standaloneEntities: standaloneEnts,
          allEntityIds: areaEntityIds
        });
      });

      floorGroups.push({
        floor,
        areas: areaList,
        allEntityIds: floorEntityIds
      });
    });

    // 4. Areas without a floor
    const unassignedFloorAreas = areas.filter(a => !a.floor_id);
    const unassignedFloorAreaList: any[] = [];
    const unassignedFloorEntityIds: string[] = [];

    unassignedFloorAreas.forEach(area => {
      const areaDevs = devicesByArea.get(area.area_id) || [];
      const standaloneEnts = entitiesByAreaStandalone.get(area.area_id) || [];
      const areaEntityIds: string[] = [];

      const devNodes = areaDevs.map(device => {
        const ents = entitiesByDevice.get(device.id) || [];
        ents.forEach(e => {
          areaEntityIds.push(e.entity_id);
          unassignedFloorEntityIds.push(e.entity_id);
        });
        return { device, entities: ents };
      });

      standaloneEnts.forEach(e => {
        areaEntityIds.push(e.entity_id);
        unassignedFloorEntityIds.push(e.entity_id);
      });

      unassignedFloorAreaList.push({
        area,
        devices: devNodes,
        standaloneEntities: standaloneEnts,
        allEntityIds: areaEntityIds
      });
    });

    // 5. Unassigned Devices & Loose Entities (No Area)
    const unassignedAreaDevNodes = unassignedDevices.map(device => {
      const ents = entitiesByDevice.get(device.id) || [];
      return { device, entities: ents };
    });

    const unassignedAreaAllEntityIds = [
      ...unassignedAreaDevNodes.flatMap(d => d.entities.map(e => e.entity_id)),
      ...looseUnassignedEntities.map(e => e.entity_id)
    ];

    return {
      floorGroups,
      unassignedFloorAreaList,
      unassignedFloorEntityIds,
      unassignedAreaDevNodes,
      looseUnassignedEntities,
      unassignedAreaAllEntityIds,
      totalEntitiesCount: allResolvedList.length,
      allEntityIds: allResolvedList.map(e => e.entity_id)
    };
  }, [floors, areas, rawDevices, resolvedEntities]);

  // --- Filtering Helper ---
  const matchesFilter = (entity: ResolvedEntity) => {
    if (visibilityFilter === 'visible' && entity.hidden) return false;
    if (visibilityFilter === 'hidden' && !entity.hidden) return false;
    if (domainFilter !== 'all' && !entity.entity_id.startsWith(`${domainFilter}.`)) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const friendlyName = (entity.name || '').toLowerCase();
    const entityId = entity.entity_id.toLowerCase();
    const devName = (entity.device?.name || entity.device?.name_by_user || '').toLowerCase();
    const devModel = (entity.device?.model || '').toLowerCase();

    return friendlyName.includes(q) || entityId.includes(q) || devName.includes(q) || devModel.includes(q);
  };

  // Visibility metrics
  const totalCount = Object.keys(resolvedEntities).length;
  const hiddenCount = Object.values(resolvedEntities).filter(e => Boolean(e.hidden)).length;
  const visibleCount = totalCount - hiddenCount;

  // Toggle Collapse All / Expand All
  const [allCollapsed, setAllCollapsed] = useState(false);
  const handleToggleExpandCollapseAll = () => {
    const nextState = !allCollapsed;
    setAllCollapsed(nextState);

    const fMap: Record<string, boolean> = {};
    floors.forEach(f => { fMap[f.floor_id] = nextState; });
    fMap['unassigned_floor'] = nextState;
    fMap['unassigned_devices'] = nextState;
    setCollapsedFloors(fMap);

    const aMap: Record<string, boolean> = {};
    areas.forEach(a => { aMap[a.area_id] = nextState; });
    setCollapsedAreas(aMap);

    const dMap: Record<string, boolean> = {};
    rawDevices.forEach(d => { dMap[d.id] = nextState; });
    setCollapsedDevices(dMap);
  };

  return (
    <div className="space-y-5 w-full animate-in fade-in duration-200 pb-24 md:pb-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-3xl bg-slate-100/90 dark:bg-white/3 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'visibility'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <Eye size={18} weight="duotone" />
            <span>Entity Visibility Tree</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'visibility' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}>
              {visibleCount} / {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('styling')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'styling'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <PaintBrush size={18} weight="duotone" />
            <span>Room Icons & Colors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('labels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'labels'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <Tag size={18} weight="duotone" />
            <span>Labels ({labels.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'zones'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
            }`}
          >
            <MapPin size={18} weight="duotone" />
            <span>Zones ({resolvedZones.length})</span>
          </button>
        </div>

        {/* Visibility Stats Counter */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs sm:text-sm self-start sm:self-auto shadow-2xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <Eye size={16} weight="bold" /> {visibleCount} Visible
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
            <EyeSlash size={16} weight="bold" /> {hiddenCount} Hidden
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ENTITY VISIBILITY MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'visibility' && (
        <div className="space-y-4">
          {/* Top Control Toolbar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-white/2 border border-slate-200 dark:border-white/10 backdrop-blur-md space-y-3 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md w-full">
                <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search entities, devices, or models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500 shadow-xs"
                />
              </div>

              {/* Filters & Bulk Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-40">
                  <CustomDropdown
                    value={domainFilter}
                    onChange={(val) => setDomainFilter(val)}
                    options={[
                      { value: 'all', label: 'All Domains' },
                      { value: 'light', label: 'Lights' },
                      { value: 'switch', label: 'Switches / Plugs' },
                      { value: 'climate', label: 'Thermostats' },
                      { value: 'sensor', label: 'Sensors' },
                      { value: 'binary_sensor', label: 'Binary Sensors' },
                      { value: 'media_player', label: 'Media Players' },
                      { value: 'fan', label: 'Fans' },
                      { value: 'cover', label: 'Covers' },
                      { value: 'lock', label: 'Locks' }
                    ]}
                    size="sm"
                  />
                </div>

                <div className="w-36">
                  <CustomDropdown
                    value={visibilityFilter}
                    onChange={(val) => setVisibilityFilter(val as any)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'visible', label: 'Visible Only' },
                      { value: 'hidden', label: 'Hidden Only' }
                    ]}
                    size="sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleToggleExpandCollapseAll}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                >
                  {allCollapsed ? 'Expand All' : 'Collapse All'}
                </button>

                {/* Global Show/Hide All */}
                <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleBulkSetVisibility(hierarchyData.allEntityIds, false, 'Entire Home')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    title="Show all entities across the entire system"
                  >
                    <Eye size={15} weight="bold" />
                    <span>Show All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSetVisibility(hierarchyData.allEntityIds, true, 'Entire Home')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    title="Hide all entities across the entire system"
                  >
                    <EyeSlash size={15} weight="bold" />
                    <span>Hide All</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HIERARCHICAL TREE RENDERING */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            {/* 1. FLOORS WITH NESTED AREAS */}
            {hierarchyData.floorGroups.map(({ floor, areas: floorAreas, allEntityIds: floorEntityIds }) => {
              const isFloorCollapsed = collapsedFloors[floor.floor_id];
              const floorVisibleCount = floorEntityIds.filter(id => !resolvedEntities[id]?.hidden).length;
              const floorTotalCount = floorEntityIds.length;

              return (
                <div
                  key={floor.floor_id}
                  className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 overflow-hidden shadow-xs transition-all"
                >
                  {/* Floor Header Bar */}
                  <div className="p-4 sm:p-5 bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div
                      onClick={() => setCollapsedFloors(prev => ({ ...prev, [floor.floor_id]: !prev[floor.floor_id] }))}
                      className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                      <button type="button" className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform">
                        {isFloorCollapsed ? <CaretRight size={20} weight="bold" /> : <CaretDown size={20} weight="bold" />}
                      </button>

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
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                            {floor.name}
                          </h4>
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            Level {floor.level ?? 0}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                          {floorAreas.length} Areas • {floorVisibleCount} of {floorTotalCount} visible
                        </span>
                      </div>
                    </div>

                    {/* Floor Bulk Actions */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs sm:text-sm font-mono font-bold px-3 py-1.5 rounded-xl border ${
                        floorVisibleCount === floorTotalCount
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : floorVisibleCount === 0
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                      }`}>
                        {floorVisibleCount} / {floorTotalCount}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleBulkSetVisibility(floorEntityIds, false, floor.name)}
                        className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        Show All
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkSetVisibility(floorEntityIds, true, floor.name)}
                        className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-amber-50 text-slate-700 hover:text-amber-600 dark:text-slate-200 dark:hover:text-amber-400 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        Hide All
                      </button>
                    </div>
                  </div>

                  {/* Areas within Floor */}
                  {!isFloorCollapsed && (
                    <div className="p-4 sm:p-5 space-y-4">
                      {floorAreas.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400 italic rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                          No areas assigned to {floor.name}.
                        </div>
                      ) : (
                        floorAreas.map(({ area, devices: areaDevs, standaloneEntities, allEntityIds: areaEntityIds }) => {
                          const isAreaCollapsed = collapsedAreas[area.area_id];
                          const areaVisibleCount = areaEntityIds.filter(id => !resolvedEntities[id]?.hidden).length;
                          const areaTotalCount = areaEntityIds.length;

                          return (
                            <div
                              key={area.area_id}
                              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/3 overflow-hidden shadow-xs"
                            >
                              {/* Area Level Header */}
                              <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-white/4 border-b border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                                <div
                                  onClick={() => setCollapsedAreas(prev => ({ ...prev, [area.area_id]: !prev[area.area_id] }))}
                                  className="flex items-center gap-3 cursor-pointer select-none group"
                                >
                                  <button type="button" className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform">
                                    {isAreaCollapsed ? <CaretRight size={18} weight="bold" /> : <CaretDown size={18} weight="bold" />}
                                  </button>

                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                                    style={{
                                      backgroundColor: `${area.color || '#6366f1'}1a`,
                                      borderColor: `${area.color || '#6366f1'}40`,
                                      color: area.color || '#6366f1'
                                    }}
                                  >
                                    {renderIconByName(area.icon || 'Armchair', 18)}
                                  </div>

                                  <div>
                                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                                      {area.name}
                                    </h5>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                      {areaDevs.length} Devices • {areaVisibleCount} / {areaTotalCount} visible
                                    </span>
                                  </div>
                                </div>

                                {/* Area Bulk Actions */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                    {areaVisibleCount} / {areaTotalCount}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleBulkSetVisibility(areaEntityIds, false, area.name)}
                                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 dark:bg-white/10 dark:hover:bg-emerald-500/20 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                                  >
                                    Show
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleBulkSetVisibility(areaEntityIds, true, area.name)}
                                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-600 dark:bg-white/10 dark:hover:bg-amber-500/20 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                                  >
                                    Hide
                                  </button>
                                </div>
                              </div>

                              {/* Devices & Standalone Entities inside Area */}
                              {!isAreaCollapsed && (
                                <div className="p-3.5 space-y-3">
                                  {/* Area Devices */}
                                  {areaDevs.map(({ device, entities: devEntities }) => {
                                    const filteredDevEntities = devEntities.filter(matchesFilter);
                                    if (devEntities.length > 0 && filteredDevEntities.length === 0 && (searchQuery || domainFilter !== 'all' || visibilityFilter !== 'all')) {
                                      return null;
                                    }

                                    const isDevCollapsed = collapsedDevices[device.id];
                                    const devEntityIds = devEntities.map(e => e.entity_id);
                                    const devVisibleCount = devEntities.filter(e => !e.hidden).length;
                                    const devTotalCount = devEntities.length;

                                    return (
                                      <div
                                        key={device.id}
                                        className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-black/20 overflow-hidden"
                                      >
                                        {/* Device Level Header */}
                                        <div className="p-3 bg-slate-100/60 dark:bg-white/2 border-b border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                                          <div
                                            onClick={() => setCollapsedDevices(prev => ({ ...prev, [device.id]: !prev[device.id] }))}
                                            className="flex items-center gap-2.5 cursor-pointer select-none group min-w-0"
                                          >
                                            <button type="button" className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform">
                                              {isDevCollapsed ? <CaretRight size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                                            </button>
                                            <Cpu size={18} weight="duotone" className="text-slate-600 dark:text-slate-400 shrink-0" />
                                            <div className="min-w-0">
                                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate block group-hover:text-sky-500">
                                                {device.name_by_user || device.name || 'IoT Device'}
                                              </span>
                                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate block">
                                                {device.manufacturer ? `${device.manufacturer} • ` : ''}{device.model || device.id}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Device Bulk Actions */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                              {devVisibleCount} / {devTotalCount}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleBulkSetVisibility(devEntityIds, false, device.name || 'Device')}
                                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 dark:bg-white/10 dark:hover:bg-emerald-500/20 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                            >
                                              Show
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleBulkSetVisibility(devEntityIds, true, device.name || 'Device')}
                                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-600 dark:bg-white/10 dark:hover:bg-amber-500/20 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                            >
                                              Hide
                                            </button>
                                          </div>
                                        </div>

                                        {/* Entities inside Device */}
                                        {!isDevCollapsed && (
                                          <div className="p-2.5 sm:p-3 space-y-2">
                                            {filteredDevEntities.map(entity => {
                                              const isHidden = Boolean(entity.hidden);
                                              const domain = entity.domain;
                                              const isOn = entity.state === 'on' || entity.state === 'open' || entity.state === 'unlocked' || entity.state === 'playing';

                                              return (
                                                <div
                                                  key={entity.entity_id}
                                                  className={`p-3 rounded-xl flex items-center justify-between gap-3 border transition-all ${
                                                    isHidden
                                                      ? 'bg-slate-100/40 dark:bg-white/1 border-dashed border-slate-300 dark:border-white/5 opacity-60'
                                                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-xs'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOn ? 'bg-sky-500 shadow-xs' : 'bg-slate-400'}`} />
                                                    <div className="min-w-0">
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                                                          {entity.name}
                                                        </span>
                                                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                                                          ({entity.entity_id})
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2.5 mt-1">
                                                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                                                          {domain}
                                                        </span>
                                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-semibold">
                                                          State: {entity.state}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Show / Hide Toggle Button */}
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleEntityVisibility(entity.entity_id, isHidden)}
                                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 border ${
                                                      !isHidden
                                                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-400 border-slate-300 dark:border-white/10'
                                                    }`}
                                                  >
                                                    {!isHidden ? <Eye size={16} weight="bold" /> : <EyeSlash size={16} weight="bold" />}
                                                    <span>{!isHidden ? 'Visible' : 'Hidden'}</span>
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Standalone Loose Entities in Area */}
                                  {standaloneEntities.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-black/15 p-3 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                          Area Direct Entities ({standaloneEntities.length})
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {standaloneEntities.filter(matchesFilter).map(entity => {
                                          const isHidden = Boolean(entity.hidden);
                                          return (
                                            <div
                                              key={entity.entity_id}
                                              className={`p-3 rounded-xl flex items-center justify-between gap-3 border transition-all ${
                                                isHidden
                                                  ? 'bg-slate-100/40 dark:bg-white/1 border-dashed border-slate-300 dark:border-white/5 opacity-60'
                                                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-xs'
                                              }`}
                                            >
                                              <div className="min-w-0">
                                                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate block">
                                                  {entity.name}
                                                </span>
                                                <span className="text-xs font-mono text-slate-500 truncate block mt-0.5">
                                                  {entity.entity_id}
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleToggleEntityVisibility(entity.entity_id, isHidden)}
                                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 border ${
                                                  !isHidden
                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                                    : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400 border-slate-300 dark:border-white/10'
                                                }`}
                                              >
                                                {!isHidden ? <Eye size={16} weight="bold" /> : <EyeSlash size={16} weight="bold" />}
                                                <span>{!isHidden ? 'Visible' : 'Hidden'}</span>
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. GENERAL / UNASSIGNED FLOOR AREAS */}
            {hierarchyData.unassignedFloorAreaList.length > 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/30 dark:bg-white/1 overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 bg-slate-100/70 dark:bg-white/4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div
                    onClick={() => setCollapsedFloors(prev => ({ ...prev, unassigned_floor: !prev.unassigned_floor }))}
                    className="flex items-center gap-3 cursor-pointer select-none group"
                  >
                    <button type="button" className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white">
                      {collapsedFloors['unassigned_floor'] ? <CaretRight size={20} weight="bold" /> : <CaretDown size={20} weight="bold" />}
                    </button>
                    <HouseLine size={24} weight="duotone" className="text-slate-400" />
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                        Unassigned Floor Areas ({hierarchyData.unassignedFloorAreaList.length})
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">
                        Areas without an assigned Floor
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(hierarchyData.unassignedFloorEntityIds, false, 'Unassigned Floor Areas')}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                    >
                      Show All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(hierarchyData.unassignedFloorEntityIds, true, 'Unassigned Floor Areas')}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                    >
                      Hide All
                    </button>
                  </div>
                </div>

                {!collapsedFloors['unassigned_floor'] && (
                  <div className="p-4 space-y-3">
                    {hierarchyData.unassignedFloorAreaList.map(({ area, devices: areaDevs, standaloneEntities, allEntityIds: areaEntityIds }) => {
                      const isAreaCollapsed = collapsedAreas[area.area_id];
                      return (
                        <div key={area.area_id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/3 overflow-hidden">
                          <div className="p-3.5 bg-slate-50 dark:bg-white/4 flex items-center justify-between">
                            <div
                              onClick={() => setCollapsedAreas(prev => ({ ...prev, [area.area_id]: !prev[area.area_id] }))}
                              className="flex items-center gap-2.5 cursor-pointer"
                            >
                              {isAreaCollapsed ? <CaretRight size={16} /> : <CaretDown size={16} />}
                              {renderIconByName(area.icon, 18)}
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{area.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleBulkSetVisibility(areaEntityIds, false, area.name)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold cursor-pointer"
                              >
                                Show
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkSetVisibility(areaEntityIds, true, area.name)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold cursor-pointer"
                              >
                                Hide
                              </button>
                            </div>
                          </div>

                          {!isAreaCollapsed && (
                            <div className="p-3.5 space-y-2.5">
                              {areaDevs.map(({ device, entities: devEntities }) => (
                                <div key={device.id} className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{device.name || 'Device'}</span>
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleBulkSetVisibility(devEntities.map(e => e.entity_id), false, device.name || 'Device')}
                                        className="text-xs font-bold text-emerald-600"
                                      >
                                        Show
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleBulkSetVisibility(devEntities.map(e => e.entity_id), true, device.name || 'Device')}
                                        className="text-xs font-bold text-amber-600"
                                      >
                                        Hide
                                      </button>
                                    </div>
                                  </div>
                                  {devEntities.filter(matchesFilter).map(entity => (
                                    <div key={entity.entity_id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 text-sm">
                                      <span className="font-semibold truncate">{entity.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleEntityVisibility(entity.entity_id, Boolean(entity.hidden))}
                                        className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                                      >
                                        {entity.hidden ? 'Hidden' : 'Visible'}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. UNASSIGNED DEVICES & LOOSE ENTITIES (NO AREA) */}
            {(hierarchyData.unassignedAreaDevNodes.length > 0 || hierarchyData.looseUnassignedEntities.length > 0) && (
              <div className="rounded-3xl border border-dashed border-amber-300 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10 overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
                  <div
                    onClick={() => setCollapsedFloors(prev => ({ ...prev, unassigned_devices: !prev.unassigned_devices }))}
                    className="flex items-center gap-3 cursor-pointer select-none group"
                  >
                    <button type="button" className="text-amber-600 dark:text-amber-400">
                      {collapsedFloors['unassigned_devices'] ? <CaretRight size={20} weight="bold" /> : <CaretDown size={20} weight="bold" />}
                    </button>
                    <Cpu size={24} weight="duotone" className="text-amber-500" />
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Unassigned Devices & Loose Entities ({hierarchyData.unassignedAreaAllEntityIds.length})
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Devices & entities without an assigned Area
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(hierarchyData.unassignedAreaAllEntityIds, false, 'Unassigned Devices')}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                    >
                      Show All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(hierarchyData.unassignedAreaAllEntityIds, true, 'Unassigned Devices')}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs"
                    >
                      Hide All
                    </button>
                  </div>
                </div>

                {!collapsedFloors['unassigned_devices'] && (
                  <div className="p-4 space-y-3">
                    {hierarchyData.unassignedAreaDevNodes.map(({ device, entities: devEntities }) => {
                      const filteredDevEntities = devEntities.filter(matchesFilter);
                      if (devEntities.length > 0 && filteredDevEntities.length === 0 && (searchQuery || domainFilter !== 'all' || visibilityFilter !== 'all')) {
                        return null;
                      }

                      return (
                        <div key={device.id} className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{device.name || 'IoT Device'}</span>
                              <span className="text-xs font-mono text-slate-500 block">{device.model || device.id}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleBulkSetVisibility(devEntities.map(e => e.entity_id), false, device.name || 'Device')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold cursor-pointer"
                              >
                                Show
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkSetVisibility(devEntities.map(e => e.entity_id), true, device.name || 'Device')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold cursor-pointer"
                              >
                                Hide
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 pt-1">
                            {filteredDevEntities.map(entity => (
                              <div
                                key={entity.entity_id}
                                className={`p-3 rounded-xl flex items-center justify-between gap-3 border transition-all ${
                                  entity.hidden
                                    ? 'bg-slate-100/40 dark:bg-white/1 border-dashed border-slate-300 dark:border-white/5 opacity-60'
                                    : 'bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10'
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate block">{entity.name}</span>
                                  <span className="text-xs font-mono text-slate-500 truncate block mt-0.5">{entity.entity_id}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleEntityVisibility(entity.entity_id, Boolean(entity.hidden))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
                                    !entity.hidden
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                      : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400 border-slate-300 dark:border-white/10'
                                  }`}
                                >
                                  {!entity.hidden ? <Eye size={15} /> : <EyeSlash size={15} />}
                                  <span>{!entity.hidden ? 'Visible' : 'Hidden'}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Loose unassigned entities */}
                    {hierarchyData.looseUnassignedEntities.filter(matchesFilter).map(entity => (
                      <div
                        key={entity.entity_id}
                        className={`p-3 rounded-2xl flex items-center justify-between gap-3 border ${
                          entity.hidden
                            ? 'bg-slate-100/40 dark:bg-white/1 border-dashed opacity-60'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate block">{entity.name}</span>
                          <span className="text-xs font-mono text-slate-500 truncate block mt-0.5">{entity.entity_id}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleEntityVisibility(entity.entity_id, Boolean(entity.hidden))}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border ${
                            !entity.hidden
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400 border-slate-300 dark:border-white/10'
                          }`}
                        >
                          {!entity.hidden ? <Eye size={15} /> : <EyeSlash size={15} />}
                          <span>{!entity.hidden ? 'Visible' : 'Hidden'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROOM ICONS & COLORS (Grouped strictly by Floor) */}
      {/* ========================================================================= */}
      {activeTab === 'styling' && (
        <div className="space-y-6">
          {/* 1. FLOORS WITH NESTED ROOMS */}
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
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
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
                  <div className="flex items-center gap-2">
                    <Tag size={18} weight="bold" style={{ color: lbl.color || '#6366f1' }} />
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{lbl.name}</span>
                  </div>
                  <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: lbl.color || '#6366f1' }} />
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

      {/* Modals for Floor and Area Style Editing */}
      {editingFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Floor Style: {editingFloor.name}</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Floor Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {FLOOR_ICON_OPTIONS.map(iconOpt => (
                    <button
                      key={iconOpt}
                      type="button"
                      onClick={() => setEditingFloor({ ...editingFloor, icon: iconOpt })}
                      className={`p-2.5 rounded-xl flex flex-col items-center gap-1 border ${
                        editingFloor.icon === iconOpt ? 'bg-sky-500/20 border-sky-500 text-sky-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <DynamicPhosphorIcon name={iconOpt} size={20} />
                      <span className="text-[9px] font-semibold truncate">{iconOpt}</span>
                    </button>
                  ))}
                </div>
              </div>
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
                onClick={() => {
                  updateFloor(editingFloor.floor_id, { icon: editingFloor.icon, color: editingFloor.color });
                  setEditingFloor(null);
                  addToast?.({ type: 'success', title: 'Floor Saved', message: `Updated ${editingFloor.name}` });
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white"
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
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Area Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {AREA_ICON_OPTIONS.map(iconOpt => (
                    <button
                      key={iconOpt}
                      type="button"
                      onClick={() => setEditingArea({ ...editingArea, icon: iconOpt })}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 border ${
                        editingArea.icon === iconOpt ? 'bg-indigo-500/20 border-indigo-500 text-indigo-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <DynamicPhosphorIcon name={iconOpt} size={18} />
                      <span className="text-[9px] font-semibold truncate">{iconOpt}</span>
                    </button>
                  ))}
                </div>
              </div>
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
                onClick={() => {
                  updateArea(editingArea.area_id, { icon: editingArea.icon, color: editingArea.color });
                  setEditingArea(null);
                  addToast?.({ type: 'success', title: 'Area Saved', message: `Updated ${editingArea.name}` });
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
