/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Media & Audio Control View:
 * Rebuilt with:
 * 1. Adaptive natural-language subtitle sentence (MediaHeaderSentence)
 * 2. "Now Playing" hero highlight section with ambient glow & waveform scrubbers
 * 3. Complete media player inventory grouped by Floor → Area hierarchy
 * 4. Responsive design (desktop multi-column, tablet 2-column, mobile swipeable)
 * 5. Full detail modal integration
 */

import React, { useState, useMemo } from 'react';
import {
  SpeakerHigh,
  MusicNotes,
  Television,
  PlayCircle,
  Broadcast,
  Stack,
  Buildings,
  Tree,
  HouseLine,
  SlidersHorizontal,
  Sparkle
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';
import { ResolvedEntity, HAEntity } from '../../types';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import MediaHeaderSentence from '../media/MediaHeaderSentence';
import NowPlayingHighlightCard from '../media/NowPlayingHighlightCard';
import MediaHierarchyPlayerCard from '../media/MediaHierarchyPlayerCard';
import MediaDetailModal from '../canvas/modals/MediaDetailModal';
import { resolvedEntityToHAEntity } from '../../services/graphResolution';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface MediaViewProps {
  darkMode?: boolean;
}

export default function MediaView({ darkMode = true }: MediaViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const {
    areasDataList,
    floorDataList,
    houseSummary,
    callHAService,
    updateEntityState
  } = useRoomsData();

  const [selectedMediaForModal, setSelectedMediaForModal] = useState<HAEntity | null>(null);

  // 1. Gather all currently playing media players across all areas
  const playingMediaList = useMemo(() => {
    const list: Array<{
      media: ResolvedEntity;
      areaName: string;
      floorName?: string;
    }> = [];

    for (const area of areasDataList) {
      const playingInArea = (area.entities.mediaPlayers || []).filter((m) => m.state === 'playing');
      for (const player of playingInArea) {
        list.push({
          media: player,
          areaName: area.name,
          floorName: area.floorName
        });
      }
    }

    return list;
  }, [areasDataList]);

  // 2. Filter floor list to only include floors & areas that have media players
  const floorsWithMedia = useMemo(() => {
    return floorDataList
      .map((floor) => {
        const areasWithMedia = floor.areas
          .map((area) => ({
            ...area,
            mediaPlayers: area.entities.mediaPlayers || []
          }))
          .filter((area) => area.mediaPlayers.length > 0);

        return {
          ...floor,
          areas: areasWithMedia,
          totalMediaPlayers: areasWithMedia.reduce((sum, a) => sum + a.mediaPlayers.length, 0),
          activeMediaPlayers: areasWithMedia.reduce(
            (sum, a) => sum + a.mediaPlayers.filter((m) => m.state === 'playing').length,
            0
          )
        };
      })
      .filter((floor) => floor.areas.length > 0);
  }, [floorDataList]);

  const totalAllPlayers = useMemo(() => {
    return floorsWithMedia.reduce((sum, f) => sum + f.totalMediaPlayers, 0);
  }, [floorsWithMedia]);

  const handleOpenDetail = (media: ResolvedEntity) => {
    setSelectedMediaForModal(resolvedEntityToHAEntity(media));
  };

  if (isLoading) {
    return <ViewLoadingState title="Loading Media & Audio..." subtitle="Discovering smart speakers, TVs, and streaming players" darkMode={darkMode} />;
  }

  if (totalAllPlayers === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <ViewEmptyState
          icon={SpeakerHigh}
          title="No Media Players Configured"
          badgeText="Audio & Entertainment"
          description="Connect smart speakers, Apple TVs, Google Cast devices, Sonos, or media receivers in Home Assistant to view artwork, control playback, and manage multi-room audio."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-8 animate-fadeIn pb-16">
      {/* ----------------------------------------------------------------- */}
      {/* 1. NOW PLAYING HIGHLIGHT SECTION                                  */}
      {/* ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-xs">
              <PlayCircle size={18} weight="duotone" className={playingMediaList.length > 0 ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2
                className={`text-lg sm:text-xl font-black tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Now Playing
              </h2>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-400">
                {playingMediaList.length > 0
                  ? `${playingMediaList.length} active ${playingMediaList.length === 1 ? 'stream' : 'streams'} in progress`
                  : 'No active media streams across the house'}
              </p>
            </div>
          </div>

          {playingMediaList.length > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                darkMode
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>Live Audio</span>
            </span>
          )}
        </div>

        {/* Highlight Cards Grid or Empty/Idle State */}
        {playingMediaList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {playingMediaList.map(({ media, areaName, floorName }) => (
              <NowPlayingHighlightCard
                key={media.entity_id}
                media={media}
                areaName={areaName}
                floorName={floorName}
                darkMode={darkMode}
                onOpenDetail={handleOpenDetail}
                callHAService={callHAService}
                updateEntityState={updateEntityState}
              />
            ))}
          </div>
        ) : (
          <div
            className={`p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
              darkMode
                ? 'bg-white/5 border-white/10 text-white'
                : 'bg-white/80 border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              <div className="w-12 h-12 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center justify-center shrink-0">
                <MusicNotes size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  All Speakers & TVs Are Idle
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                  Select any speaker or TV from the floor list below to begin playback or resume media.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <Sparkle size={15} weight="duotone" className="text-amber-400" />
              <span>{totalAllPlayers} devices connected</span>
            </div>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. FULL MEDIA PLAYERS BY FLOOR & AREA HIERARCHY                   */}
      {/* ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-1 border-b border-white/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-xs">
              <Stack size={18} weight="duotone" />
            </div>
            <div>
              <h2
                className={`text-lg sm:text-xl font-black tracking-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                All Audio & Video Devices
              </h2>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-400">
                Organized hierarchically across {floorsWithMedia.length} {floorsWithMedia.length === 1 ? 'level' : 'levels'}
              </p>
            </div>
          </div>
        </div>

        {/* Floor Hierarchy List */}
        {floorsWithMedia.length > 0 ? (
          <div className="flex flex-col gap-8">
            {floorsWithMedia.map((floor) => {
              const isOutdoor =
                floor.level < 0 ||
                floor.name.toLowerCase().includes('outdoor') ||
                floor.name.toLowerCase().includes('garden');
              const isUpper = floor.level >= 1;
              const floorIconName = floor.icon || (isOutdoor ? 'Tree' : isUpper ? 'Buildings' : 'Stack');

              return (
                <div key={floor.floorId} className="flex flex-col gap-4">
                  {/* Floor Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2.5">
                      <DynamicPhosphorIcon
                        name={floorIconName}
                        fallback={isOutdoor ? Tree : isUpper ? Buildings : Stack}
                        size={22}
                        weight="duotone"
                        style={{ color: floor.color || undefined }}
                        className={`shrink-0 ${
                          floor.color
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
                        <p className="text-xs font-medium text-slate-400">
                          {floor.totalMediaPlayers} {floor.totalMediaPlayers === 1 ? 'Player' : 'Players'}
                          {floor.activeMediaPlayers > 0 && ` • ${floor.activeMediaPlayers} active`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Areas within Floor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {floor.areas.map((area) => (
                      <div
                        key={area.areaId}
                        style={{
                          clipPath: 'inset(0 round 1.5rem)',
                          boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)'
                        }}
                        className={`p-4 rounded-3xl border overflow-hidden isolate backdrop-blur-sm flex flex-col gap-3 transition-all ${
                          darkMode
                            ? 'bg-white/[0.03] border-white/10'
                            : 'bg-white/70 border-slate-200/90 shadow-xs'
                        }`}
                      >
                        {/* Area Title Header */}
                        <div className="flex items-center justify-between pb-1 border-b border-white/5 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <DynamicPhosphorIcon
                              name={area.icon || 'HouseLine'}
                              fallback={HouseLine}
                              size={16}
                              weight="duotone"
                              style={{ color: area.color || undefined }}
                              className={area.color ? '' : 'text-indigo-400'}
                            />
                            <span
                              className={`text-xs font-bold ${
                                darkMode ? 'text-slate-200' : 'text-slate-800'
                              }`}
                            >
                              {area.name}
                            </span>
                          </div>

                          <span className="text-[10px] font-semibold text-slate-400">
                            {area.mediaPlayers.length} {area.mediaPlayers.length === 1 ? 'device' : 'devices'}
                          </span>
                        </div>

                        {/* Players in Area */}
                        <div className="flex flex-col gap-2.5">
                          {area.mediaPlayers.map((media) => (
                            <MediaHierarchyPlayerCard
                              key={media.entity_id}
                              media={media}
                              darkMode={darkMode}
                              onOpenDetail={handleOpenDetail}
                              callHAService={callHAService}
                              updateEntityState={updateEntityState}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`p-8 rounded-3xl border text-center flex flex-col items-center justify-center gap-3 ${
              darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <SpeakerHigh size={32} weight="duotone" className="text-slate-400" />
            <h3 className="text-base font-bold">No Media Player Entities Discovered</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Connect Sonos, Apple TV, Google Cast, or HomePod integrations in Home Assistant to manage them here.
            </p>
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedMediaForModal && (
        <MediaDetailModal
          isOpen={Boolean(selectedMediaForModal)}
          onClose={() => setSelectedMediaForModal(null)}
          entity={selectedMediaForModal}
          onUpdateEntity={(entityId, newState, attrs) => {
            updateEntityState(entityId, newState, attrs);
          }}
        />
      )}
    </div>
  );
}
