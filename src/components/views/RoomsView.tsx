/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Main Rooms & Living Areas Subsystem View.
 * Rendered in 2-column mobile virtual grid with clean floating floor tabs.
 */

import React, { useState, useMemo } from 'react';
import {
  Stack,
  Buildings,
  Tree,
  HouseLine,
  SquaresFour
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';
import AreaTile from '../rooms/AreaTile';
import AreaDetailView from './AreaDetailView';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';
import VirtualGrid from '../layout/VirtualGrid';
import SortableGrid from '../layout/SortableGrid';
import GridTile from '../layout/GridTile';
import { sortTilesForBento } from '../../utils/bentoLayout';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useEditMode } from '../../contexts/EditModeContext';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

interface RoomsViewProps {
  darkMode?: boolean;
}

export default function RoomsView({ darkMode = true }: RoomsViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const { config } = useUserConfig();
  const { isEditMode } = useEditMode();
  const {
    areasDataList = [],
    floorDataList = [],
    toggleAreaLights,
    toggleAreaSwitches,
    toggleAreaFans,
    toggleAreaMedia,
    toggleAreaLocks,
    toggleEntityLock,
    turnOffAllAreaEntities,
    callHAService,
    updateEntityState
  } = useRoomsData();

  const selectedAreaId = useAutoLayoutStore((s) => s.selectedAreaId);
  const setSelectedAreaId = useAutoLayoutStore((s) => s.setSelectedAreaId);

  // Active Floor Tab Filter for dense Mobile Navigation: 'all' | floorId
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all');

  // Selected Area for Drill-down View
  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return (areasDataList || []).find((a) => a.areaId === selectedAreaId) || null;
  }, [selectedAreaId, areasDataList]);

  // Filtered Floors list based on selectedFloorId
  const visibleFloors = useMemo(() => {
    if (selectedFloorId === 'all') return floorDataList || [];
    return (floorDataList || []).filter((f) => f.floorId === selectedFloorId);
  }, [floorDataList, selectedFloorId]);

  // Floor tab items for AdaptiveSectionTabs
  const floorTabs = useMemo<SectionTabItem[]>(() => {
    const tabs: SectionTabItem[] = [
      {
        id: 'all',
        label: 'All Floors',
        icon: SquaresFour,
        badge: (areasDataList || []).length
      }
    ];

    (floorDataList || []).forEach((floor) => {
      const isOutdoor =
        floor.level < 0 ||
        floor.name.toLowerCase().includes('outdoor') ||
        floor.name.toLowerCase().includes('garden') ||
        floor.name.toLowerCase().includes('perimeter');
      const isUpper = floor.level >= 1;
      const Icon = isOutdoor ? Tree : isUpper ? Buildings : Stack;
      const activeLights = (floor.areas || []).reduce((sum, a) => sum + (a.activeLightsCount || 0), 0);

      tabs.push({
        id: floor.floorId,
        label: floor.name,
        icon: Icon,
        badge: activeLights > 0 ? `${activeLights} on` : (floor.areas || []).length,
        badgeColor: activeLights > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold' : undefined
      });
    });

    return tabs;
  }, [floorDataList, areasDataList]);

  // If user drilled down into a specific room, render AreaDetailView
  if (selectedArea) {
    return (
      <AreaDetailView
        area={selectedArea}
        darkMode={darkMode}
        onBack={() => setSelectedAreaId(null)}
        onToggleLights={toggleAreaLights}
        onToggleLocks={toggleAreaLocks}
        onToggleEntityLock={toggleEntityLock}
        onTurnOffAll={turnOffAllAreaEntities}
        callHAService={callHAService}
        updateEntityState={updateEntityState}
      />
    );
  }

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Living Areas..."
        subtitle="Fetching areas, floors, and room entities from Home Assistant"
        darkMode={darkMode}
      />
    );
  }

  if (!floorDataList || floorDataList.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <ViewEmptyState
          icon={HouseLine}
          title="No Areas Configured"
          badgeText="Rooms & Living Spaces"
          description="Organize your smart home devices by creating areas and floors in Home Assistant. Assigned devices will automatically populate your room view."
          configPath="Settings → Areas & Zones → Areas"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-5 animate-fadeIn pb-16">
      {/* Clean Floating Floor Filter Tabs (No grey container) */}
      {floorDataList.length > 1 && (
        <div className="sticky top-0 z-30 -mx-4 px-4 py-1 sm:static sm:mx-0 sm:px-0 sm:py-0 backdrop-blur-md">
          <AdaptiveSectionTabs
            tabs={floorTabs}
            activeTab={selectedFloorId}
            onChange={setSelectedFloorId}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* Hierarchical Floor Sections in VirtualGrid */}
      <div className="flex flex-col gap-8">
        {visibleFloors.map((floor) => {
          const isOutdoor =
            floor.level < 0 ||
            floor.name.toLowerCase().includes('outdoor') ||
            floor.name.toLowerCase().includes('garden') ||
            floor.name.toLowerCase().includes('perimeter');
          const isUpper = floor.level >= 1;

          const floorIconName = floor.icon || (isOutdoor ? 'Tree' : isUpper ? 'Buildings' : 'Stack');
          const floorAccentColor = floor.color || undefined;

          return (
            <section key={floor.floorId} className="flex flex-col gap-3.5">
              {/* Floor Section Header (when multiple floors shown) */}
              {visibleFloors.length > 1 && (
                <div className="flex items-center justify-between pb-0.5">
                  <div className="flex items-center gap-2.5">
                    <DynamicPhosphorIcon
                      name={floorIconName}
                      fallback={isOutdoor ? Tree : isUpper ? Buildings : Stack}
                      size={22}
                      weight="duotone"
                      style={{ color: floorAccentColor || undefined }}
                      className={`shrink-0 ${
                        floorAccentColor
                          ? ''
                          : darkMode
                          ? 'text-indigo-400'
                          : 'text-indigo-600'
                      }`}
                    />

                    <div>
                      <h3
                        className={`text-base font-black tracking-tight ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {floor.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {floor.areas.length} {floor.areas.length === 1 ? 'Area' : 'Areas'}
                        {floor.areas.reduce((sum, a) => sum + a.activeLightsCount, 0) > 0 &&
                          ` • ${floor.areas.reduce((sum, a) => sum + a.activeLightsCount, 0)} lights active`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2-Grid Mobile Layout for Room Tiles with SortableGrid */}
              {(() => {
                const hiddenAreasSet = new Set(config?.rooms?.hiddenAreas || []);
                const sortedAreas = sortTilesForBento({
                  items: floor.areas,
                  getId: (a) => a.areaId,
                  layoutOverrides: config?.layoutOverrides,
                  isEditMode
                });

                return (
                  <SortableGrid items={sortedAreas.map((a) => a.areaId)}>
                    {sortedAreas.map((area) => {
                      const isGhosted = hiddenAreasSet.has(area.areaId);

                      return (
                        <GridTile
                          key={area.areaId}
                          id={area.areaId}
                          areaId={area.areaId}
                          isGhosted={isGhosted}
                          colSpan={2}
                          tabletColSpan={3}
                          desktopColSpan={3}
                        >
                          <AreaTile
                            area={area}
                            darkMode={darkMode}
                            onSelectArea={(areaId) => setSelectedAreaId(areaId)}
                            onToggleLights={toggleAreaLights}
                            onToggleSwitches={toggleAreaSwitches}
                            onToggleFans={toggleAreaFans}
                            onToggleMedia={toggleAreaMedia}
                            onToggleLocks={toggleAreaLocks}
                          />
                        </GridTile>
                      );
                    })}
                  </SortableGrid>
                );
              })()}
            </section>
          );
        })}
      </div>
    </div>
  );
}
