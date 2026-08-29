/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Displays all security sensors, locks, contacts, and hazard detectors
 * organized by Floor and Area with room banners, status badges, and quick controls.
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  LockOpen, 
  Door, 
  DoorOpen, 
  PersonSimpleWalk, 
  Drop, 
  Flame, 
  BatteryHigh, 
  BatteryLow, 
  BatteryWarning, 
  MagnifyingGlass, 
  CheckCircle, 
  WarningCircle, 
  Building, 
  Stack, 
  Tree, 
  ArrowsClockwise, 
  CaretRight 
} from '@phosphor-icons/react';
import { ResolvedEntity, ResolvedArea, ResolvedFloor } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

export type SecurityCategoryType = 'all' | 'openings' | 'locks' | 'motion' | 'hazards';

interface FloorAreaSensorsSectionProps {
  darkMode?: boolean;
  lockEntities: ResolvedEntity[];
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  motionSensors: ResolvedEntity[];
  leakSensors: ResolvedEntity[];
  smokeSensors: ResolvedEntity[];
  resolvedFloors: ResolvedFloor[];
  resolvedAreas: ResolvedArea[];
  activeCategory?: SecurityCategoryType;
  onSelectCategory?: (category: SecurityCategoryType) => void;
}

export default function FloorAreaSensorsSection({
  darkMode = true,
  lockEntities,
  doorSensors,
  windowSensors,
  motionSensors,
  leakSensors,
  smokeSensors,
  resolvedFloors,
  resolvedAreas,
  activeCategory: controlledCategory,
  onSelectCategory
}: FloorAreaSensorsSectionProps) {
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all');
  const [internalCategory, setInternalCategory] = useState<SecurityCategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingLockId, setTogglingLockId] = useState<string | null>(null);

  const activeCategory = controlledCategory !== undefined ? controlledCategory : internalCategory;

  const handleCategoryChange = (cat: SecurityCategoryType) => {
    setInternalCategory(cat);
    onSelectCategory?.(cat);
  };

  const callHAService = useAutoLayoutStore(s => s.callHAService);
  const updateEntityState = useAutoLayoutStore(s => s.updateEntityState);

  // Group all security entities by area_id
  const areaSecurityEntitiesMap = useMemo(() => {
    const map = new Map<string, {
      locks: ResolvedEntity[];
      doors: ResolvedEntity[];
      windows: ResolvedEntity[];
      motion: ResolvedEntity[];
      leaks: ResolvedEntity[];
      smoke: ResolvedEntity[];
      totalCount: number;
    }>();

    // Helper to add entity to area
    const addEntity = (entity: ResolvedEntity, type: 'locks' | 'doors' | 'windows' | 'motion' | 'leaks' | 'smoke') => {
      const areaId = entity.area_id || 'unassigned';
      if (!map.has(areaId)) {
        map.set(areaId, {
          locks: [],
          doors: [],
          windows: [],
          motion: [],
          leaks: [],
          smoke: [],
          totalCount: 0
        });
      }
      const entry = map.get(areaId)!;
      entry[type].push(entity);
      entry.totalCount++;
    };

    lockEntities.forEach(e => addEntity(e, 'locks'));
    doorSensors.forEach(e => addEntity(e, 'doors'));
    windowSensors.forEach(e => addEntity(e, 'windows'));
    motionSensors.forEach(e => addEntity(e, 'motion'));
    leakSensors.forEach(e => addEntity(e, 'leaks'));
    smokeSensors.forEach(e => addEntity(e, 'smoke'));

    return map;
  }, [lockEntities, doorSensors, windowSensors, motionSensors, leakSensors, smokeSensors]);

  // Floors list with fallbacks
  const defaultFloors: Array<{ floor_id: string; name: string; icon: string }> = [
    { floor_id: 'all', name: 'All Floors', icon: 'Layers' },
    { floor_id: 'floor_ground', name: 'Ground Floor', icon: 'Layers' },
    { floor_id: 'floor_first', name: 'First Floor', icon: 'Building' },
    { floor_id: 'floor_outdoor', name: 'Outdoors & Perimeter', icon: 'Trees' }
  ];

  const floorTabs = resolvedFloors.length > 0
    ? [{ floor_id: 'all', name: 'All Floors', icon: 'Layers' }, ...resolvedFloors]
    : defaultFloors;

  // Filter areas strictly based on selected floor, active category, and search query
  const filteredAreas = useMemo(() => {
    return resolvedAreas.filter(area => {
      if (selectedFloorId !== 'all' && area.floor_id !== selectedFloorId) {
        return false;
      }
      const secData = areaSecurityEntitiesMap.get(area.area_id);
      if (!secData) {
        return false;
      }

      // Check if area has entities for the active category
      if (activeCategory === 'locks' && secData.locks.length === 0) return false;
      if (activeCategory === 'openings' && secData.doors.length === 0 && secData.windows.length === 0) return false;
      if (activeCategory === 'motion' && secData.motion.length === 0) return false;
      if (activeCategory === 'hazards' && secData.leaks.length === 0 && secData.smoke.length === 0) return false;
      if (activeCategory === 'all' && secData.totalCount === 0) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = area.name.toLowerCase().includes(q);
        const matchDevice = [
          ...secData.locks,
          ...secData.doors,
          ...secData.windows,
          ...secData.motion,
          ...secData.leaks,
          ...secData.smoke
        ].some(d => (d.name || d.entity_id).toLowerCase().includes(q));
        return matchName || matchDevice;
      }
      return true;
    });
  }, [resolvedAreas, selectedFloorId, areaSecurityEntitiesMap, activeCategory, searchQuery]);

  const handleToggleLock = async (lock: ResolvedEntity) => {
    const isCurrentlyLocked = lock.state === 'locked';
    const nextService = isCurrentlyLocked ? 'unlock' : 'lock';
    const nextState = isCurrentlyLocked ? 'unlocked' : 'locked';

    setTogglingLockId(lock.entity_id);
    try {
      await callHAService('lock', nextService, {}, { entity_id: lock.entity_id });
      updateEntityState(lock.entity_id, nextState, {
        changed_by: 'User Floor Area Action',
        last_changed: 'Just now'
      });
    } catch (e) {
      console.error('Failed to toggle lock:', e);
    } finally {
      setTimeout(() => setTogglingLockId(null), 400);
    }
  };

  const renderBatteryIcon = (battery?: number) => {
    if (battery === undefined || battery === null) return null;
    if (battery <= 20) return <BatteryLow size={13} className="text-rose-400" />;
    if (battery <= 40) return <BatteryWarning size={13} className="text-amber-400" />;
    return <BatteryHigh size={13} className="text-emerald-400" />;
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center">
            <Stack size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              {activeCategory === 'locks'
                ? 'Perimeter Locks'
                : activeCategory === 'openings'
                  ? 'Doors & Windows'
                  : activeCategory === 'motion'
                    ? 'Motion & Occupancy'
                    : activeCategory === 'hazards'
                      ? 'Hazards & Leaks'
                      : 'Perimeter & Sensors'}
            </h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`relative flex items-center px-3 py-1.5 rounded-2xl border text-xs ${
          darkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <MagnifyingGlass size={15} className="text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Filter room or sensor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-28 sm:w-44"
          />
        </div>
      </div>

      {/* Floor & Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Floor Switcher */}
        <div className={`flex flex-wrap items-center p-1 rounded-2xl border backdrop-blur-md ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-900/[0.03] border-slate-900/[0.06]'
        }`}>
          {floorTabs.map((floor) => (
            <button
              key={floor.floor_id}
              type="button"
              onClick={() => setSelectedFloorId(floor.floor_id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFloorId === floor.floor_id
                  ? darkMode
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-amber-500 text-slate-950 shadow-xs'
                  : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>

        {/* Category Filter Chips */}
        <div className={`flex flex-wrap items-center p-1 rounded-2xl border backdrop-blur-md ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-900/[0.03] border-slate-900/[0.06]'
        }`}>
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'locks' as const, label: `Locks (${lockEntities.length})` },
            { id: 'openings' as const, label: `Openings (${doorSensors.length + windowSensors.length})` },
            { id: 'motion' as const, label: `Motion (${motionSensors.length})` },
            { id: 'hazards' as const, label: `Safety (${leakSensors.length + smokeSensors.length})` }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? darkMode
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-emerald-600 text-white shadow-xs'
                  : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area Cards Container */}
      <div className="space-y-4">
        {filteredAreas.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center backdrop-blur-md ${
            darkMode ? 'bg-black/30 border-white/10 text-slate-400' : 'bg-white/70 border-slate-200/80 text-slate-600'
          }`}>
            <p className="text-sm font-semibold">No sensors found matching the active floor or category filter.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedFloorId('all');
                handleCategoryChange('all');
                setSearchQuery('');
              }}
              className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredAreas.map((area) => {
            const sec = areaSecurityEntitiesMap.get(area.area_id);
            if (!sec) return null;

            const openDoorsList = sec.doors.filter(d => d.state === 'on');
            const openWindowsList = sec.windows.filter(w => w.state === 'on');
            const totalOpenOpenings = openDoorsList.length + openWindowsList.length;
            const unlockedLocksList = sec.locks.filter(l => l.state === 'unlocked' || l.state === 'open');
            const activeMotionList = sec.motion.filter(m => m.state === 'on');
            const activeHazardsList = [...sec.leaks, ...sec.smoke].filter(h => h.state === 'on' || h.state === 'detected' || h.state === 'wet');

            const isAreaBreached = totalOpenOpenings > 0 || unlockedLocksList.length > 0 || activeHazardsList.length > 0;

            return (
              <div
                key={area.area_id}
                className={`rounded-3xl border backdrop-blur-md overflow-hidden transition-all duration-300 ${
                  isAreaBreached
                    ? darkMode
                      ? 'bg-black/60 border-amber-500/30'
                      : 'bg-white/85 border-amber-400/40 shadow-[0_4px_24px_-6px_rgba(245,158,11,0.15)]'
                    : darkMode
                      ? 'bg-black/40 border-white/10'
                      : 'bg-white/70 border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'
                }`}
              >
                {/* Area Header Bar with Room Picture & Status Chips */}
                <div className={`p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-b ${
                  darkMode ? 'border-white/10' : 'border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-3">
                    {area.picture ? (
                      <img
                        src={area.picture}
                        alt={area.name}
                        className={`w-10 h-10 rounded-2xl object-cover border ${darkMode ? 'border-white/10' : 'border-slate-200'}`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold ${
                        darkMode ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-slate-900/[0.04] border-slate-900/[0.08] text-slate-700'
                      }`}>
                        {area.name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">{area.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                        {area.floor_id ? area.floor_id.replace('floor_', '').replace('_', ' ') : 'Area'} • {sec.totalCount} Security Sensors
                      </p>
                    </div>
                  </div>

                  {/* Area Status Quick Summary Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Locks Status */}
                    {sec.locks.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border backdrop-blur-md ${
                        unlockedLocksList.length > 0
                          ? darkMode
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-amber-500/10 text-amber-800 border-amber-500/25'
                          : darkMode
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25'
                      }`}>
                        {unlockedLocksList.length > 0 ? <LockOpen size={12} weight="bold" /> : <Lock size={12} weight="bold" />}
                        <span>{unlockedLocksList.length > 0 ? `${unlockedLocksList.length} Unlocked` : `${sec.locks.length} Locked`}</span>
                      </span>
                    )}

                    {/* Openings Status */}
                    {(sec.doors.length > 0 || sec.windows.length > 0) && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border backdrop-blur-md ${
                        totalOpenOpenings > 0
                          ? darkMode
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-rose-500/10 text-rose-800 border-rose-500/25'
                          : darkMode
                            ? 'bg-white/5 text-slate-400 border-white/10'
                            : 'bg-slate-900/[0.04] text-slate-600 border-slate-900/[0.08]'
                      }`}>
                        {totalOpenOpenings > 0 ? <DoorOpen size={12} weight="bold" /> : <Door size={12} weight="bold" />}
                        <span>{totalOpenOpenings > 0 ? `${totalOpenOpenings} Open` : 'Closed'}</span>
                      </span>
                    )}

                    {/* Motion Status */}
                    {sec.motion.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border backdrop-blur-md ${
                        activeMotionList.length > 0
                          ? darkMode
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                            : 'bg-amber-50/95 text-amber-950 border-amber-200/90 shadow-2xs animate-pulse'
                          : darkMode
                            ? 'bg-white/5 text-slate-400 border-white/10'
                            : 'bg-slate-900/[0.04] text-slate-600 border-slate-900/[0.08]'
                      }`}>
                        <PersonSimpleWalk size={12} weight="bold" />
                        <span>{activeMotionList.length > 0 ? 'Motion' : 'Idle'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Area Sensors Grid */}
                <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* 1. Smart Locks */}
                  {(activeCategory === 'all' || activeCategory === 'locks') &&
                    sec.locks.map((lock) => {
                      const isLocked = lock.state === 'locked';
                      const isToggling = togglingLockId === lock.entity_id;
                      const battery = lock.attributes?.battery_level || lock.attributes?.battery;

                      return (
                        <div
                          key={lock.entity_id}
                          className={`p-3 rounded-2xl border backdrop-blur-md transition-all flex items-center justify-between gap-3 ${
                            isLocked
                              ? darkMode
                                ? 'bg-white/5 border-emerald-500/30'
                                : 'bg-white/80 hover:bg-white border-emerald-500/25 shadow-2xs'
                              : darkMode
                                ? 'bg-amber-500/15 border-amber-500/40'
                                : 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                              isLocked
                                ? darkMode
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700'
                                : darkMode
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                  : 'bg-amber-500/10 border-amber-500/25 text-amber-700'
                            }`}>
                              {isLocked ? <Lock size={16} weight="duotone" /> : <LockOpen size={16} weight="duotone" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold truncate text-slate-900 dark:text-white">{lock.name || lock.entity_id}</h5>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                                {battery !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 font-mono">
                                      {renderBatteryIcon(battery)}
                                      <span>{battery}%</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleLock(lock)}
                            disabled={isToggling}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer active:scale-95 shrink-0 ${
                              isLocked
                                ? darkMode
                                  ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                                  : 'bg-slate-900/[0.05] hover:bg-slate-900/[0.09] border-slate-900/[0.08] text-slate-800'
                                : 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs font-black'
                            }`}
                          >
                            {isToggling ? '...' : isLocked ? 'Unlock' : 'Lock'}
                          </button>
                        </div>
                      );
                    })}

                  {/* 2. Openings (Doors & Windows) */}
                  {(activeCategory === 'all' || activeCategory === 'openings') &&
                    [...sec.doors, ...sec.windows].map((sensor) => {
                      const isOpen = sensor.state === 'on';
                      const isDoor = sensor.attributes?.device_class === 'door' || sensor.entity_id.includes('door');
                      const battery = sensor.attributes?.battery;

                      return (
                        <div
                          key={sensor.entity_id}
                          className={`p-3 rounded-2xl border backdrop-blur-md transition-all flex items-center justify-between gap-3 ${
                            isOpen
                              ? darkMode
                                ? 'bg-rose-500/15 border-rose-500/40'
                                : 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/25 shadow-2xs'
                              : darkMode
                                ? 'bg-white/5 border-white/10'
                                : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                              isOpen
                                ? darkMode
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                  : 'bg-rose-500/10 border-rose-500/25 text-rose-700'
                                : darkMode
                                  ? 'bg-white/10 border-white/15 text-slate-400'
                                  : 'bg-slate-900/[0.04] border-slate-900/[0.08] text-slate-600'
                            }`}>
                              {isDoor ? (
                                isOpen ? <DoorOpen size={16} weight="duotone" /> : <Door size={16} weight="duotone" />
                              ) : (
                                <CheckCircle size={16} weight="duotone" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold truncate text-slate-900 dark:text-white">{sensor.name || sensor.entity_id}</h5>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span className={isOpen ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                                  {isOpen ? 'Open' : 'Closed'}
                                </span>
                                {battery !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 font-mono">
                                      {renderBatteryIcon(battery)}
                                      <span>{battery}%</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isOpen
                              ? 'bg-rose-500 text-white'
                              : darkMode
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-emerald-500/10 text-emerald-700'
                          }`}>
                            {isOpen ? 'Open' : 'Secure'}
                          </span>
                        </div>
                      );
                    })}

                  {/* 3. Motion Detectors */}
                  {(activeCategory === 'all' || activeCategory === 'motion') &&
                    sec.motion.map((motion) => {
                      const isActive = motion.state === 'on';

                      return (
                        <div
                          key={motion.entity_id}
                          className={`p-3 rounded-2xl border backdrop-blur-md transition-all flex items-center justify-between gap-3 ${
                            isActive
                              ? darkMode
                                ? 'bg-amber-500/15 border-amber-500/40'
                                : 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/25 shadow-2xs'
                              : darkMode
                                ? 'bg-white/5 border-white/10'
                                : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                              isActive
                                ? darkMode
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                  : 'bg-amber-500/10 border-amber-500/25 text-amber-700'
                                : darkMode
                                  ? 'bg-white/10 border-white/15 text-slate-400'
                                  : 'bg-slate-900/[0.04] border-slate-900/[0.08] text-slate-600'
                            }`}>
                              <PersonSimpleWalk size={16} weight="duotone" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold truncate text-slate-900 dark:text-white">{motion.name || motion.entity_id}</h5>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {isActive ? 'Active Motion' : 'Idle'}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : darkMode
                                ? 'bg-white/10 text-slate-400'
                                : 'bg-slate-900/[0.05] text-slate-600'
                          }`}>
                            {isActive ? 'Detected' : 'Clear'}
                          </span>
                        </div>
                      );
                    })}

                  {/* 4. Hazard & Safety (Leaks & Smoke) */}
                  {(activeCategory === 'all' || activeCategory === 'hazards') &&
                    [...sec.leaks, ...sec.smoke].map((hazard) => {
                      const isAlert = hazard.state === 'on' || hazard.state === 'detected' || hazard.state === 'wet';
                      const isSmoke = hazard.attributes?.device_class === 'smoke' || hazard.entity_id.includes('smoke');

                      return (
                        <div
                          key={hazard.entity_id}
                          className={`p-3 rounded-2xl border backdrop-blur-md transition-all flex items-center justify-between gap-3 ${
                            isAlert
                              ? darkMode
                                ? 'bg-rose-500/20 border-rose-500/50 animate-pulse'
                                : 'bg-rose-500/15 border-rose-500/35 animate-pulse shadow-2xs'
                              : darkMode
                                ? 'bg-white/5 border-white/10'
                                : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                              isAlert
                                ? darkMode
                                  ? 'bg-rose-500/25 border-rose-500/40 text-rose-400'
                                  : 'bg-rose-500/10 border-rose-500/25 text-rose-700'
                                : darkMode
                                  ? 'bg-white/10 border-white/15 text-slate-400'
                                  : 'bg-slate-900/[0.04] border-slate-900/[0.08] text-slate-600'
                            }`}>
                              {isSmoke ? (
                                <Flame size={16} weight="duotone" className={isAlert ? 'text-rose-500' : 'text-slate-400'} />
                              ) : (
                                <Drop size={16} weight="duotone" className={isAlert ? 'text-cyan-400' : 'text-slate-400'} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold truncate text-slate-900 dark:text-white">{hazard.name || hazard.entity_id}</h5>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {isAlert ? 'Safety Warning' : 'Normal'}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isAlert
                              ? 'bg-rose-500 text-white'
                              : darkMode
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-emerald-500/10 text-emerald-700'
                          }`}>
                            {isAlert ? 'Alert' : 'Normal'}
                          </span>
                        </div>
                      );
                    })}

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
