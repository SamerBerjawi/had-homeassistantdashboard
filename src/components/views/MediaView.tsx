/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Media & Audio Command Center
 * Clean, modern layout featuring active "Now Playing" highlight cards,
 * floor tabs via AdaptiveSectionTabs, and responsive VirtualGrid player inventory.
 */

import React, { useState, useMemo } from 'react';
import {
  SpeakerHigh,
  MusicNotes,
  PlayCircle,
  Stack,
  Buildings,
  Tree,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';
import { ResolvedEntity, HAEntity } from '../../types';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import NowPlayingHighlightCard from '../media/NowPlayingHighlightCard';
import MediaHierarchyPlayerCard from '../media/MediaHierarchyPlayerCard';
import MediaDetailModal from '../canvas/modals/MediaDetailModal';
import { resolvedEntityToHAEntity } from '../../services/graphResolution';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

interface MediaViewProps {
  darkMode?: boolean;
}

export default function MediaView({ darkMode = true }: MediaViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const {
    areasDataList,
    floorDataList,
    callHAService,
    updateEntityState
  } = useRoomsData();

  const [selectedFloorTab, setSelectedFloorTab] = useState<string>('all');
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

  // Build Floor Tabs for AdaptiveSectionTabs
  const floorTabs: SectionTabItem[] = useMemo(() => {
    const tabs: SectionTabItem[] = [
      {
        id: 'all',
        label: 'All Floors',
        icon: Stack,
        badge: playingMediaList.length > 0 ? `${playingMediaList.length} playing` : undefined,
        badgeColor: playingMediaList.length > 0 ? 'bg-purple-500/20 text-purple-300 font-bold' : undefined
      }
    ];

    floorsWithMedia.forEach((f) => {
      tabs.push({
        id: f.floorId,
        label: f.name,
        badge: f.activeMediaPlayers > 0 ? `${f.activeMediaPlayers}` : undefined,
        badgeColor: f.activeMediaPlayers > 0 ? 'bg-purple-500/20 text-purple-300 font-bold' : undefined
      });
    });

    return tabs;
  }, [floorsWithMedia, playingMediaList]);

  const filteredFloors = useMemo(() => {
    if (selectedFloorTab === 'all') return floorsWithMedia;
    return floorsWithMedia.filter((f) => f.floorId === selectedFloorTab);
  }, [floorsWithMedia, selectedFloorTab]);

  const handleOpenDetail = (media: ResolvedEntity) => {
    setSelectedMediaForModal(resolvedEntityToHAEntity(media));
  };

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Media & Audio..."
        subtitle="Discovering smart speakers, TVs, and streaming players"
        darkMode={darkMode}
      />
    );
  }

  if (totalAllPlayers === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
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
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* ----------------------------------------------------------------- */}
      {/* 1. FLOOR SELECTOR TABS                                            */}
      {/* ----------------------------------------------------------------- */}
      {floorTabs.length > 2 && (
        <div className="sticky top-0 z-30 -mx-4 px-4 py-1 sm:static sm:mx-0 sm:px-0 sm:py-0 backdrop-blur-md">
          <AdaptiveSectionTabs
            tabs={floorTabs}
            activeTab={selectedFloorTab}
            onChange={(tab) => setSelectedFloorTab(tab)}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. NOW PLAYING HIGHLIGHT SECTION (Only when media is active)      */}
      {/* ----------------------------------------------------------------- */}
      {playingMediaList.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <PlayCircle size={20} weight="duotone" className="text-purple-400 animate-pulse" />
              <h2 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Now Playing
              </h2>
            </div>

            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {playingMediaList.length} Active {playingMediaList.length === 1 ? 'Stream' : 'Streams'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. MEDIA PLAYERS BY AREA                                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-8">
        {filteredFloors.map((floor) => {
          const isOutdoor =
            floor.level < 0 ||
            floor.name.toLowerCase().includes('outdoor') ||
            floor.name.toLowerCase().includes('garden');
          const isUpper = floor.level >= 1;
          const floorIconName = floor.icon || (isOutdoor ? 'Tree' : isUpper ? 'Buildings' : 'Stack');

          return (
            <section key={floor.floorId} className="flex flex-col gap-5">
              {/* Floor Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <DynamicPhosphorIcon
                    name={floorIconName}
                    fallback={isOutdoor ? Tree : isUpper ? Buildings : Stack}
                    size={20}
                    weight="duotone"
                    className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}
                  />
                  <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {floor.name}
                  </h3>
                </div>

                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {floor.totalMediaPlayers} {floor.totalMediaPlayers === 1 ? 'Device' : 'Devices'}
                </span>
              </div>

              {/* Area Groups */}
              <div className="flex flex-col gap-6">
                {floor.areas.map((area) => (
                  <div key={area.areaId} className="flex flex-col gap-3">
                    {/* Area Title Strip */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {area.picture ? (
                          <img src={area.picture} alt={area.name} className="w-5 h-5 rounded-md object-cover" />
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                              darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {area.name.charAt(0)}
                          </div>
                        )}
                        <h4 className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {area.name}
                        </h4>
                      </div>
                    </div>

                    {/* Area Players 2-Column Mobile Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
                      {area.mediaPlayers.map((player) => (
                        <MediaHierarchyPlayerCard
                          key={player.entity_id}
                          media={player}
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
            </section>
          );
        })}
      </div>

      {/* Media Detail Full Modal */}
      {selectedMediaForModal && (
        <MediaDetailModal
          isOpen={!!selectedMediaForModal}
          onClose={() => setSelectedMediaForModal(null)}
          entity={selectedMediaForModal}
        />
      )}
    </div>
  );
}
