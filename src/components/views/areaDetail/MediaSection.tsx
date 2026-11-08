/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SpeakerHigh, Broom, VideoCamera, CaretRight, ArrowsOut } from '@phosphor-icons/react';
import { formatEntityDisplayName, formatRelativeTime } from '../../../lib/utils';
import SortableGrid from '../../layout/SortableGrid';
import GridTile from '../../layout/GridTile';
import { TelemetryLine } from '../../common/TelemetryBadge';
import MediaPlayerTile from '../../tiles/MediaPlayerTile';
import CompactTile from '../../tiles/CompactTile';
import { detectVacuumCapabilities } from '../../../services/vacuumClassification';
import CameraFeed from '../../camera/CameraFeed';
import type { AreaDetailState } from './useAreaDetailState';

export default function MediaSection({ s }: { s: AreaDetailState }) {
  const {
    area,
    darkMode,
    enrichedVacuums,
    entities,
    getTileSpan,
    handlePauseAllMedia,
    handleToggleMediaPlay,
    mediaVacuumSpans,
    openEntityDetails,
    setActiveMediaDrawerEntity,
    sortedCameras,
    sortedMediaPlayers,
    sortedVacuums
  } = s;
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <SpeakerHigh size={20} weight="duotone" className="text-cyan-500 dark:text-cyan-400" />
          <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Media & Entertainment
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ({entities.mediaPlayers.length + (enrichedVacuums?.length || 0) + (entities.cameras?.length || 0)})
          </span>
        </div>

        {entities.mediaPlayers.length > 0 && (
          <button
            type="button"
            onClick={handlePauseAllMedia}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
              darkMode
                ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                : 'bg-white/95 hover:bg-white text-slate-800'
            }`}
          >
            Pause All
          </button>
        )}
      </div>

      <SortableGrid items={[...sortedMediaPlayers.map((m) => m.entity_id), ...sortedVacuums.map((v) => v.entity_id), ...sortedCameras.map((c) => c.entity_id)]}>
        {sortedMediaPlayers.map((media) => {
          const isPlaying = media.state === 'playing' || media.state === 'paused';
          const isUnavailable = media.state === 'unavailable' || media.state === 'unknown';
          const span = getTileSpan(media.entity_id, mediaVacuumSpans, isPlaying ? 2 : 1);

          return (
            <GridTile
              key={media.entity_id}
              id={media.entity_id}
              colSpan={isPlaying ? 4 : span.colSpan}
              rowSpan={isPlaying ? 2 : span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={isPlaying ? 1 : span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => setActiveMediaDrawerEntity(media)}
            >
              <MediaPlayerTile
                entity={media}
                areaName={area.name}
                darkMode={darkMode}
                onPlayPause={handleToggleMediaPlay}
                onOpenDrawer={(m) => setActiveMediaDrawerEntity(m)}
                onIconClick={() => setActiveMediaDrawerEntity(media)}
              />
            </GridTile>
          );
        })}

        {sortedVacuums.map((vac) => {
          const caps = detectVacuumCapabilities(vac);
          const isUnavailable = vac.state === 'unavailable' || vac.state === 'unknown';
          const bat = vac.attributes?.battery_level;
          const lastChanged = formatRelativeTime(vac.last_changed || vac.last_updated);
          
          const subtitle = (
            <TelemetryLine
              items={[
                caps.isCleaning ? 'Cleaning' : 'Docked',
                bat !== undefined ? { isBattery: true, batteryLevel: Math.round(bat) } : null,
                lastChanged || null
              ]}
            />
          );

          const span = getTileSpan(vac.entity_id, mediaVacuumSpans, 1);
          return (
            <GridTile
              key={vac.entity_id}
              id={vac.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(vac.entity_id)}
            >
              <CompactTile
                darkMode={darkMode}
                title={formatEntityDisplayName(vac.name, area.name)}
                subtitle={subtitle}
                isActive={caps.isCleaning}
                accentColor="#0d9488"
                activeBorderColor="border-teal-400/50"
                icon={<Broom size={22} weight={caps.isCleaning ? 'fill' : 'duotone'} className={caps.isCleaning ? 'text-teal-400' : 'text-slate-400'} />}
                badge={
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                    caps.isCleaning
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                      : darkMode
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-slate-900/[0.04] text-slate-700'
                  }`}>
                    {caps.isCleaning ? 'Cleaning' : 'Docked'}
                  </span>
                }
                actionButton={
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      openEntityDetails(vac.entity_id);
                    }}
                    className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    title="Open Device Details"
                  >
                    <CaretRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  openEntityDetails(vac.entity_id);
                }}
              />
            </GridTile>
          );
        })}

        {sortedCameras.map((cam) => {
          const isUnavailable = cam.state === 'unavailable' || cam.state === 'unknown';
          const lastChanged = formatRelativeTime(cam.last_changed || cam.last_updated);
          const displayName = formatEntityDisplayName(cam.name, area.name);

          return (
            <GridTile
              key={cam.entity_id}
              id={cam.entity_id}
              colSpan={2}
              tabletColSpan={3}
              desktopColSpan={3}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(cam.entity_id)}
            >
              <div
                onClick={() => openEntityDetails(cam.entity_id)}
                className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-lg group cursor-pointer isolate hover:border-blue-500/40 transition-all duration-300"
               role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click(); } }}>
                <CameraFeed
                  camera={cam}
                  mode="preview"
                  darkMode={darkMode}
                  showControls={false}
                  autoPlay={true}
                  muted={true}
                />

                {/* Gradient Overlay for bottom text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none z-10" />

                {/* Top Right: Expand to Fullscreen Feed */}
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEntityDetails(cam.entity_id);
                    }}
                    title="Open Fullscreen Feed"
                    className="p-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-transform active:scale-95 shadow-md cursor-pointer"
                  >
                    <ArrowsOut size={12} weight="bold" />
                  </button>
                </div>

                {/* Bottom Info Bar: Camera Name + Live Status */}
                <div className="absolute bottom-2 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-cyan-400 shrink-0">
                      <VideoCamera size={13} weight="duotone" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[11px] sm:text-xs font-bold text-white truncate drop-shadow-sm">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-slate-300 truncate">
                        {isUnavailable ? 'Offline' : lastChanged ? `Active • ${lastChanged}` : 'Live'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </GridTile>
          );
        })}
      </SortableGrid>
    </section>
  );
}
