/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Thermometer, Drop, Power, Door, PersonSimpleWalk, BatteryMedium, Lightning, Warning, Gear } from '@phosphor-icons/react';
import SortableGrid from '../../layout/SortableGrid';
import GridTile from '../../layout/GridTile';
import SensorTile from '../../tiles/SensorTile';
import type { AreaDetailState } from './useAreaDetailState';

export default function SensorsSection({ s }: { s: AreaDetailState }) {
  const {
    area,
    batterySpans,
    contactSensors,
    contactSpans,
    darkMode,
    energySensors,
    energySpans,
    environmentalSensors,
    environmentalSpans,
    generalSensors,
    generalSpans,
    getTileSpan,
    hazardSensors,
    hazardSpans,
    motionSensors,
    motionSpans,
    openEntityDetails,
    sensorsCount,
    sortedBatterySensors,
    sortedContactSensors,
    sortedEnergySensors,
    sortedEnvironmentalSensors,
    sortedGeneralSensors,
    sortedHazardSensors,
    sortedMotionSensors,
    unclaimedBatterySensors
  } = s;
  return (
    <div className="flex flex-col gap-6">
      {/* Main Category Header */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <Drop size={20} weight="duotone" className="text-teal-500 dark:text-teal-400" />
          <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Sensors & Telemetry
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ({sensorsCount} Total)
          </span>
        </div>
      </div>

      {/* 5A. Entry & Perimeter (Doors & Windows) */}
      {contactSensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Door size={16} weight="duotone" className="text-amber-500" />
            <span>Entry & Openings ({contactSensors.length})</span>
          </div>
          <SortableGrid items={sortedContactSensors.map((cs) => cs.entity_id)}>
            {sortedContactSensors.map((cs) => {
              const isUnavailable = cs.state === 'unavailable' || cs.state === 'unknown';
              const span = getTileSpan(cs.entity_id, contactSpans);
              return (
                <GridTile
                  key={cs.entity_id}
                  id={cs.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(cs.entity_id)}
                >
                  <SensorTile
                    entity={cs}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(cs.entity_id)}
                    onContextMenu={() => openEntityDetails(cs.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}

      {/* 5B. Motion & Presence */}
      {motionSensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <PersonSimpleWalk size={16} weight="duotone" className="text-emerald-500" />
            <span>Motion & Occupancy ({motionSensors.length})</span>
          </div>
          <SortableGrid items={sortedMotionSensors.map((ms) => ms.entity_id)}>
            {sortedMotionSensors.map((ms) => {
              const isUnavailable = ms.state === 'unavailable' || ms.state === 'unknown';
              const span = getTileSpan(ms.entity_id, motionSpans);
              return (
                <GridTile
                  key={ms.entity_id}
                  id={ms.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(ms.entity_id)}
                >
                  <SensorTile
                    entity={ms}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(ms.entity_id)}
                    onContextMenu={() => openEntityDetails(ms.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}

      {/* 5C. Environmental & Climate */}
      {environmentalSensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Thermometer size={16} weight="duotone" className="text-rose-500" />
            <span>Environmental & Air Quality ({environmentalSensors.length})</span>
          </div>
          <SortableGrid items={sortedEnvironmentalSensors.map((sensor) => sensor.entity_id)}>
            {sortedEnvironmentalSensors.map((sensor) => {
              const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';
              const span = getTileSpan(sensor.entity_id, environmentalSpans);
              return (
                <GridTile
                  key={sensor.entity_id}
                  id={sensor.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(sensor.entity_id)}
                >
                  <SensorTile
                    entity={sensor}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(sensor.entity_id)}
                    onContextMenu={() => openEntityDetails(sensor.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}

      {/* 5D. Safety & Hazard */}
      {hazardSensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-500 dark:text-rose-400">
            <Warning size={16} weight="fill" />
            <span>Safety & Hazards ({hazardSensors.length})</span>
          </div>
          <SortableGrid items={sortedHazardSensors.map((hs) => hs.entity_id)}>
            {sortedHazardSensors.map((hs) => {
              const isUnavailable = hs.state === 'unavailable' || hs.state === 'unknown';
              const span = getTileSpan(hs.entity_id, hazardSpans);
              return (
                <GridTile
                  key={hs.entity_id}
                  id={hs.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(hs.entity_id)}
                >
                  <SensorTile
                    entity={hs}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(hs.entity_id)}
                    onContextMenu={() => openEntityDetails(hs.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}

      {/* 5E. Power & Energy */}
      {energySensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Lightning size={16} weight="duotone" className="text-emerald-500" />
            <span>Power & Energy ({energySensors.length})</span>
          </div>
          <SortableGrid items={sortedEnergySensors.map((sensor) => sensor.entity_id)}>
            {sortedEnergySensors.map((sensor) => {
              const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';
              const span = getTileSpan(sensor.entity_id, energySpans);
              return (
                <GridTile
                  key={sensor.entity_id}
                  id={sensor.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(sensor.entity_id)}
                >
                  <SensorTile
                    entity={sensor}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(sensor.entity_id)}
                    onContextMenu={() => openEntityDetails(sensor.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}

      {/* 5F. Unclaimed Standalone Battery Sensors (only if any remain unclaimed) */}
      {unclaimedBatterySensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <BatteryMedium size={16} weight="duotone" className="text-amber-500" />
            <span>Standalone Batteries ({unclaimedBatterySensors.length})</span>
          </div>
          <SortableGrid items={sortedBatterySensors.map((bs) => bs.entity_id)}>
            {sortedBatterySensors.map((bs) => {
              const isUnavailable = bs.state === 'unavailable' || bs.state === 'unknown';
              const span = getTileSpan(bs.entity_id, batterySpans);
              return (
                <GridTile
                  key={bs.entity_id}
                  id={bs.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(bs.entity_id)}
                >
                  <SensorTile
                    entity={bs}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(bs.entity_id)}
                    onContextMenu={() => openEntityDetails(bs.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}

      {/* 5G. General Diagnostics */}
      {generalSensors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Gear size={16} weight="duotone" className="text-slate-500" />
            <span>Diagnostics & Status ({generalSensors.length})</span>
          </div>
          <SortableGrid items={sortedGeneralSensors.map((sensor) => sensor.entity_id)}>
            {sortedGeneralSensors.map((sensor) => {
              const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';
              const span = getTileSpan(sensor.entity_id, generalSpans);
              return (
                <GridTile
                  key={sensor.entity_id}
                  id={sensor.entity_id}
                  colSpan={span.colSpan}
                  rowSpan={span.rowSpan}
                  tabletColSpan={span.tabletColSpan}
                  desktopColSpan={span.desktopColSpan}
                  colStart={span.colStart}
                  tabletColStart={span.tabletColStart}
                  desktopColStart={span.desktopColStart}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(sensor.entity_id)}
                >
                  <SensorTile
                    entity={sensor}
                    areaName={area.name}
                    darkMode={darkMode}
                    onIconClick={() => openEntityDetails(sensor.entity_id)}
                    onContextMenu={() => openEntityDetails(sensor.entity_id)}
                  />
                </GridTile>
              );
            })}
          </SortableGrid>
        </div>
      )}
    </div>
  );
}
