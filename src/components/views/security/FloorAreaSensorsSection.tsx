/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Displays all security sensors, locks, contacts, and hazard detectors
 * organized by Floor and Area with 2-column mobile layout, clean room headers (no heavy container borders),
 * companion battery pairing & deduplication, and zero filler text.
 */

import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  LockOpen, 
  DoorOpen, 
  PersonSimpleWalk, 
  Flame, 
  MagnifyingGlass, 
  Stack
} from '@phosphor-icons/react';
import { ResolvedEntity, ResolvedArea, ResolvedFloor } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';
import { formatEntityDisplayName, formatRelativeTime } from '../../../lib/utils';
import SensorTile from '../../tiles/SensorTile';
import CompactTile from '../../tiles/CompactTile';
import { TelemetryLine } from '../../common/TelemetryBadge';
import AdaptiveSectionTabs, { SectionTabItem } from '../../common/AdaptiveSectionTabs';

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

  const { openEntityDetails } = useEntityPopup();
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);

  const activeCategory = controlledCategory !== undefined ? controlledCategory : internalCategory;

  const handleCategoryChange = (cat: SecurityCategoryType) => {
    setInternalCategory(cat);
    onSelectCategory?.(cat);
  };

  // Group all security entities by area_id with battery companion matching
  const areaSecurityEntitiesMap = useMemo(() => {
    const map = new Map<string, {
      locks: ResolvedEntity[];
      doors: ResolvedEntity[];
      windows: ResolvedEntity[];
      motion: ResolvedEntity[];
      leaks: ResolvedEntity[];
      smoke: ResolvedEntity[];
      allEntities: ResolvedEntity[];
      totalCount: number;
    }>();

    const addEntity = (
      entity: ResolvedEntity,
      type: 'locks' | 'doors' | 'windows' | 'motion' | 'leaks' | 'smoke'
    ) => {
      const areaId = entity.area_id || 'unassigned';
      if (!map.has(areaId)) {
        map.set(areaId, {
          locks: [],
          doors: [],
          windows: [],
          motion: [],
          leaks: [],
          smoke: [],
          allEntities: [],
          totalCount: 0
        });
      }
      const entry = map.get(areaId)!;
      entry[type].push(entity);
      entry.allEntities.push(entity);
      entry.totalCount++;
    };

    lockEntities.forEach((e) => addEntity(e, 'locks'));
    doorSensors.forEach((e) => addEntity(e, 'doors'));
    windowSensors.forEach((e) => addEntity(e, 'windows'));
    motionSensors.forEach((e) => addEntity(e, 'motion'));
    leakSensors.forEach((e) => addEntity(e, 'leaks'));
    smokeSensors.forEach((e) => addEntity(e, 'smoke'));

    return map;
  }, [lockEntities, doorSensors, windowSensors, motionSensors, leakSensors, smokeSensors]);

  // Build Floor Tabs for AdaptiveSectionTabs
  const floorTabs: SectionTabItem[] = useMemo(() => {
    const tabs: SectionTabItem[] = [
      { id: 'all', label: 'All Floors', icon: Stack }
    ];

    if (resolvedFloors.length > 0) {
      resolvedFloors.forEach((f) => {
        tabs.push({ id: f.floor_id, label: f.name });
      });
    }

    return tabs;
  }, [resolvedFloors]);

  // Filter areas based on floor, category, and search query
  const filteredAreas = useMemo(() => {
    return resolvedAreas.filter((area) => {
      if (selectedFloorId !== 'all' && area.floor_id !== selectedFloorId) {
        return false;
      }
      const secData = areaSecurityEntitiesMap.get(area.area_id);
      if (!secData) return false;

      if (activeCategory === 'locks' && secData.locks.length === 0) return false;
      if (activeCategory === 'openings' && secData.doors.length === 0 && secData.windows.length === 0) return false;
      if (activeCategory === 'motion' && secData.motion.length === 0) return false;
      if (activeCategory === 'hazards' && secData.leaks.length === 0 && secData.smoke.length === 0) return false;
      if (activeCategory === 'all' && secData.totalCount === 0) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = area.name.toLowerCase().includes(q);
        const matchDevice = secData.allEntities.some((d) => (d.name || d.entity_id).toLowerCase().includes(q));
        return matchName || matchDevice;
      }
      return true;
    });
  }, [resolvedAreas, selectedFloorId, areaSecurityEntitiesMap, activeCategory, searchQuery]);

  const handleToggleLock = async (lock: ResolvedEntity) => {
    const isCurrentlyLocked = lock.state === 'locked';
    const nextService = isCurrentlyLocked ? 'unlock' : 'lock';
    const nextState = isCurrentlyLocked ? 'unlocked' : 'locked';

    updateEntityState(lock.entity_id, nextState);
    try {
      await callHAService('lock', nextService, {}, { entity_id: lock.entity_id });
    } catch (e) {
      console.error('Failed to toggle lock:', e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Floor & Filter Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {floorTabs.length > 2 && (
          <AdaptiveSectionTabs
            tabs={floorTabs}
            activeTab={selectedFloorId}
            onChange={(tab) => setSelectedFloorId(tab)}
            darkMode={darkMode}
          />
        )}

        {/* Quick Search */}
        <div
          className={`relative flex items-center px-3 py-1.5 rounded-2xl text-xs sm:ml-auto backdrop-blur-xl border border-slate-200/50 dark:border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
            darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
          }`}
        >
          <MagnifyingGlass size={15} className="text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search security devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-36 sm:w-48"
          />
        </div>
      </div>

      {/* Area Groups (Without heavy container borders for max space) */}
      <div className="space-y-6">
        {filteredAreas.length === 0 ? (
          <div
            className={`p-8 rounded-3xl text-center backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
              darkMode ? 'bg-black/20 text-slate-300' : 'bg-white/20 text-slate-700'
            }`}
          >
            <p className="text-sm font-semibold">No security sensors found for this filter.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedFloorId('all');
                handleCategoryChange('all');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 text-xs font-bold hover:bg-sky-500/30 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredAreas.map((area) => {
            const sec = areaSecurityEntitiesMap.get(area.area_id);
            if (!sec) return null;

            const openDoorsList = sec.doors.filter((d) => d.state === 'on');
            const openWindowsList = sec.windows.filter((w) => w.state === 'on');
            const totalOpenOpenings = openDoorsList.length + openWindowsList.length;
            const unlockedLocksList = sec.locks.filter((l) => l.state === 'unlocked' || l.state === 'open');
            const activeMotionList = sec.motion.filter((m) => m.state === 'on');
            const activeHazardsList = [...sec.leaks, ...sec.smoke].filter(
              (h) => h.state === 'on' || h.state === 'detected' || h.state === 'wet'
            );

            // Collect active items to render based on category filter
            const entitiesToRender: ResolvedEntity[] = [];
            if (activeCategory === 'all' || activeCategory === 'locks') entitiesToRender.push(...sec.locks);
            if (activeCategory === 'all' || activeCategory === 'openings') entitiesToRender.push(...sec.doors, ...sec.windows);
            if (activeCategory === 'all' || activeCategory === 'motion') entitiesToRender.push(...sec.motion);
            if (activeCategory === 'all' || activeCategory === 'hazards') entitiesToRender.push(...sec.leaks, ...sec.smoke);

            if (entitiesToRender.length === 0) return null;

            return (
              <section key={area.area_id} className="flex flex-col gap-3">
                {/* Header: Area Name & Live Status Badges */}
                <div className="flex items-center justify-between gap-3 pb-1">
                  <div className="flex items-center gap-2.5">
                    {area.picture ? (
                      <img src={area.picture} alt={area.name} className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {area.name.charAt(0)}
                      </div>
                    )}
                    <h3 className={`text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {area.name}
                    </h3>
                  </div>

                  {/* Glanceable Room State Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sec.locks.length > 0 && (
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${
                          unlockedLocksList.length > 0
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {unlockedLocksList.length > 0 ? <LockOpen size={12} weight="bold" /> : <Lock size={12} weight="bold" />}
                        <span>{unlockedLocksList.length > 0 ? `${unlockedLocksList.length} Unlocked` : 'Locked'}</span>
                      </span>
                    )}
                    {totalOpenOpenings > 0 && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border bg-amber-500/20 text-amber-300 border-amber-500/40">
                        <DoorOpen size={12} weight="bold" />
                        <span>{totalOpenOpenings} Open</span>
                      </span>
                    )}
                    {activeMotionList.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse">
                        <PersonSimpleWalk size={12} weight="bold" />
                        <span>Motion</span>
                      </span>
                    )}
                    {activeHazardsList.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse">
                        <Flame size={12} weight="fill" />
                        <span>Hazard</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2-Column Mobile Grid accommodating 2 tiles per row on mobile, scaling to 2/3/4 on larger screens */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-2 ${
                    activeCategory === 'all' ? 'lg:grid-cols-2' : 'md:grid-cols-3 lg:grid-cols-4'
                  } gap-2.5 sm:gap-3 items-stretch`}
                >
                  {entitiesToRender.map((ent) => {
                    const isLock = ent.domain === 'lock';

                    if (isLock) {
                      const isLocked = ent.state === 'locked';
                      const rawBattery = ent.attributes?.battery_level ?? ent.attributes?.battery;
                      const lastChanged = formatRelativeTime(ent.last_changed || ent.last_updated);
                      const subtitle = (
                        <TelemetryLine
                          items={[
                            isLocked ? 'Locked' : 'Unlocked',
                            rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                            lastChanged || null
                          ]}
                        />
                      );

                      return (
                        <div key={ent.entity_id} className="w-full">
                          <CompactTile
                            darkMode={darkMode}
                            title={formatEntityDisplayName(ent.name, area.name)}
                            subtitle={subtitle}
                            isActive={!isLocked}
                            accentColor={isLocked ? '#10b981' : '#f59e0b'}
                            activeBorderColor={isLocked ? 'border-emerald-500/40' : 'border-amber-400/50'}
                            onIconClick={() => openEntityDetails(ent.entity_id)}
                            icon={
                              isLocked ? (
                                <Lock size={22} weight="fill" className="text-emerald-500 dark:text-emerald-400" />
                              ) : (
                                <LockOpen size={22} weight="bold" className="text-amber-500 dark:text-amber-400 animate-pulse" />
                              )
                            }
                            actionButton={
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLock(ent);
                                }}
                                className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                                  isLocked
                                    ? darkMode
                                      ? 'bg-white/10 text-slate-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                }`}
                              >
                                {isLocked ? 'Unlock' : 'Lock'}
                              </button>
                            }
                            onClick={() => handleToggleLock(ent)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              openEntityDetails(ent.entity_id);
                            }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={ent.entity_id} className="w-full">
                        <SensorTile
                          entity={ent}
                          areaName={area.name}
                          darkMode={darkMode}
                          onIconClick={() => openEntityDetails(ent.entity_id)}
                          onContextMenu={() => openEntityDetails(ent.entity_id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
