/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Main Rooms & Living Areas Subsystem View.
 * Strict Responsive Grid: 4 columns in desktop (lg/xl), 3 in tablet (md), and 2 on mobile.
 */

import React, { useState, useMemo } from 'react';
import {
  Stack,
  Buildings,
  Tree,
  HouseLine
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';
import AreaTile from '../rooms/AreaTile';
import AreaDetailView from './AreaDetailView';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

interface RoomsViewProps {
  darkMode?: boolean;
}

export default function RoomsView({ darkMode = true }: RoomsViewProps) {
  const {
    areasDataList,
    floorDataList,
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

  // Selected Area for Drill-down View
  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areasDataList.find((a) => a.areaId === selectedAreaId) || null;
  }, [selectedAreaId, areasDataList]);

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

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Hierarchical Floor Sections */}
      <div className="flex flex-col gap-8">
        {floorDataList.map((floor) => {
          const isOutdoor =
            floor.level < 0 ||
            floor.name.toLowerCase().includes('outdoor') ||
            floor.name.toLowerCase().includes('garden') ||
            floor.name.toLowerCase().includes('perimeter');
          const isUpper = floor.level >= 1;

          // Custom floor styling from Settings
          const floorIconName = floor.icon || (isOutdoor ? 'Tree' : isUpper ? 'Buildings' : 'Stack');
          const floorAccentColor = floor.color || undefined;

          return (
            <section key={floor.floorId} className="flex flex-col gap-3.5">
              {/* Floor Header - Clean unboxed icon without container or borders */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <DynamicPhosphorIcon
                    name={floorIconName}
                    fallback={isOutdoor ? Tree : isUpper ? Buildings : Stack}
                    size={24}
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
                      className={`text-base sm:text-lg font-black tracking-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {floor.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {floor.areas.length} {floor.areas.length === 1 ? 'Area' : 'Areas'}
                      {floor.areas.reduce((sum, a) => sum + a.activeLightsCount, 0) > 0 &&
                        ` • ${floor.areas.reduce((sum, a) => sum + a.activeLightsCount, 0)} lights active`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsive Area Tile Grid:
                  - Desktop: 4 columns (`lg:grid-cols-4`)
                  - Tablet: 3 columns (`md:grid-cols-3`)
                  - Mobile: 2 columns (`grid-cols-2`)
              */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {floor.areas.map((area) => (
                  <AreaTile
                    key={area.areaId}
                    area={area}
                    darkMode={darkMode}
                    onSelectArea={(areaId) => setSelectedAreaId(areaId)}
                    onToggleLights={toggleAreaLights}
                    onToggleSwitches={toggleAreaSwitches}
                    onToggleFans={toggleAreaFans}
                    onToggleMedia={toggleAreaMedia}
                    onToggleLocks={toggleAreaLocks}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
