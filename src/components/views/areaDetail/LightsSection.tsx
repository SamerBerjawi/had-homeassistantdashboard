/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lightbulb, Power } from '@phosphor-icons/react';
import SortableGrid from '../../layout/SortableGrid';
import GridTile from '../../layout/GridTile';
import LightTile from '../../tiles/LightTile';
import { detectLightCapabilities } from '../../../services/lightClassification';
import type { AreaDetailState } from './useAreaDetailState';

export default function LightsSection({ s }: { s: AreaDetailState }) {
  const {
    activeLightsCount,
    area,
    darkMode,
    getTileSpan,
    handleBrightnessChange,
    handleToggleLight,
    lightSpans,
    onToggleLights,
    openEntityDetails,
    sortedLights,
    totalLightsCount
  } = s;
  return (
    <section className="flex flex-col gap-3.5">
      {/* Category Title & Bulk Action Button */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <Lightbulb size={20} weight="duotone" className="text-amber-500 dark:text-amber-400" />
          <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Lighting & Ambience
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ({activeLightsCount > 0 ? `${activeLightsCount}/${totalLightsCount} on` : `${totalLightsCount}`})
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleLights(area.areaId, activeLightsCount === 0)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm ${
            activeLightsCount > 0
              ? darkMode
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
              : darkMode
              ? 'bg-white/5 hover:bg-white/10 text-slate-300'
              : 'bg-white/95 hover:bg-white text-slate-800'
          }`}
        >
          <Power size={14} weight="bold" />
          <span>{activeLightsCount > 0 ? 'All Off' : 'All On'}</span>
        </button>
      </div>

      <SortableGrid items={sortedLights.map((l) => l.entity_id)}>
        {sortedLights.map((light) => {
          const isUnavailable = light.state === 'unavailable' || light.state === 'unknown';
          const caps = detectLightCapabilities(light);
          const isDimmable = caps.supportsBrightness;
          const span = getTileSpan(light.entity_id, lightSpans);

          return (
            <GridTile
              key={light.entity_id}
              id={light.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(light.entity_id)}
            >
              <LightTile
                entity={light}
                areaName={area.name}
                darkMode={darkMode}
                onToggle={handleToggleLight}
                onBrightnessChange={handleBrightnessChange}
                onChevronClick={() => openEntityDetails(light.entity_id)}
                onContextMenu={() => openEntityDetails(light.entity_id)}
              />
            </GridTile>
          );
        })}
      </SortableGrid>
    </section>
  );
}
