/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Thermometer, Fan, CaretRight } from '@phosphor-icons/react';
import { formatEntityDisplayName, formatRelativeTime } from '../../../lib/utils';
import SortableGrid from '../../layout/SortableGrid';
import GridTile from '../../layout/GridTile';
import { TelemetryLine } from '../../common/TelemetryBadge';
import ClimateTile from '../../tiles/ClimateTile';
import CompactTile from '../../tiles/CompactTile';
import type { AreaDetailState } from './useAreaDetailState';

export default function ClimateFansSection({ s }: { s: AreaDetailState }) {
  const {
    area,
    climateAndFanSpans,
    darkMode,
    enrichedClimates,
    enrichedFans,
    getTileSpan,
    handleHvacModeChange,
    handleTempAdjust,
    handleTempSlider,
    handleToggleAllFans,
    handleToggleClimate,
    handleToggleFan,
    openEntityDetails,
    sortedClimates,
    sortedFans
  } = s;
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Thermometer size={20} weight="duotone" className="text-rose-500 dark:text-rose-400" />
          <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Climate & Air Comfort
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ({enrichedClimates.length + enrichedFans.length})
          </span>
        </div>

        {enrichedFans.length > 0 && (
          <button
            type="button"
            onClick={handleToggleAllFans}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
              darkMode
                ? 'bg-white/10 hover:bg-white/20 text-slate-300'
                : 'bg-white/40 hover:bg-white/60 text-slate-700 shadow-xs'
            }`}
          >
            <Fan size={14} weight="bold" />
            <span>Toggle Fans</span>
          </button>
        )}
      </div>

      <SortableGrid items={[...sortedClimates.map((c) => c.entity_id), ...sortedFans.map((f) => f.entity_id)]}>
        {sortedClimates.map((climate) => {
          const isUnavailable = climate.state === 'unavailable' || climate.state === 'unknown';
          const span = getTileSpan(climate.entity_id, climateAndFanSpans, 2);
          return (
            <GridTile
              key={climate.entity_id}
              id={climate.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(climate.entity_id)}
            >
              <ClimateTile
                entity={climate}
                areaName={area.name}
                darkMode={darkMode}
                onTempAdjust={handleTempAdjust}
                onTempSlider={handleTempSlider}
                onModeChange={handleHvacModeChange}
                onToggle={handleToggleClimate}
                onChevronClick={() => openEntityDetails(climate.entity_id)}
                onContextMenu={() => openEntityDetails(climate.entity_id)}
              />
            </GridTile>
          );
        })}

        {sortedFans.map((fan) => {
          const isUnavailable = fan.state === 'unavailable' || fan.state === 'unknown';
          const isOn = fan.state === 'on';
          const speed = fan.attributes?.percentage;
          const rawPower = fan.attributes?.current_power_w ?? fan.attributes?.power;
          const rawBattery = fan.attributes?.battery_level ?? fan.attributes?.battery;
          const lastChanged = formatRelativeTime(fan.last_changed || fan.last_updated);
          
          const subtitle = (
            <TelemetryLine
              items={[
                isOn ? (speed ? `${speed}%` : 'Fan Active') : 'Off',
                rawPower && isOn ? { text: `${Math.round(rawPower)}W`, isPower: true } : null,
                rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                lastChanged || null
              ]}
            />
          );

          const span = getTileSpan(fan.entity_id, climateAndFanSpans, 1);
          return (
            <GridTile
              key={fan.entity_id}
              id={fan.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(fan.entity_id)}
            >
              <CompactTile
                darkMode={darkMode}
                title={formatEntityDisplayName(fan.name, area.name)}
                subtitle={subtitle}
                isActive={isOn}
                accentColor="#14b8a6"
                activeBorderColor="border-teal-400/50"
                onIconClick={() => handleToggleFan(fan)}
                icon={
                  <Fan
                    size={22}
                    weight={isOn ? 'fill' : 'duotone'}
                    className={isOn ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.85)] animate-spin' : 'text-slate-400'}
                  />
                }
                actionButton={
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      openEntityDetails(fan.entity_id);
                    }}
                    className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    title="Open Device Details"
                  >
                    <CaretRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                }
                onClick={() => handleToggleFan(fan)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openEntityDetails(fan.entity_id);
                }}
              />
            </GridTile>
          );
        })}
      </SortableGrid>
    </section>
  );
}
