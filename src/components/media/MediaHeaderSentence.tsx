/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MediaHeaderSentence:
 * Renders an adaptive natural-language media summary sentence with dynamic inline Phosphor icons
 * and highlighted badges, styled consistently with RoomsHeaderSentence.
 */

import React, { useMemo } from 'react';
import {
  SpeakerHigh,
  MusicNotes,
  Television,
  CheckCircle,
  Play,
  Broadcast,
  Pause
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';

interface MediaHeaderSentenceProps {
  darkMode?: boolean;
  className?: string;
}

export default function MediaHeaderSentence({
  darkMode = true,
  className = ''
}: MediaHeaderSentenceProps) {
  const { houseSummary, areasDataList } = useRoomsData();
  const { activeMediaCount } = houseSummary;

  // Aggregate active playing media players across all rooms
  const activePlayersInfo = useMemo(() => {
    const list: Array<{
      entityId: string;
      areaId: string;
      areaName: string;
      title: string;
      artist: string;
      isTv: boolean;
    }> = [];

    for (const area of areasDataList) {
      const playingInArea = (area.entities.mediaPlayers || []).filter((m) => m.state === 'playing');
      for (const player of playingInArea) {
        const isTv = player.attributes?.device_class === 'tv' || player.entity_id.includes('tv') || player.entity_id.includes('apple_tv');
        const title = player.attributes?.media_title || player.attributes?.app_name || player.name || 'Media';
        const artist = player.attributes?.media_artist || area.name;
        list.push({
          entityId: player.entity_id,
          areaId: area.areaId,
          areaName: area.name,
          title,
          artist,
          isTv
        });
      }
    }

    return list;
  }, [areasDataList]);

  const activeRoomsCount = useMemo(() => {
    const roomIds = new Set(activePlayersInfo.map((p) => p.areaId));
    return roomIds.size;
  }, [activePlayersInfo]);

  // If no media players are playing
  if (activeMediaCount === 0 || activePlayersInfo.length === 0) {
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Currently,</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
            darkMode
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <CheckCircle size={13} weight="fill" className="text-emerald-400" />
          <span>All media players are idle</span>
        </span>
        <span>across all living areas.</span>
      </div>
    );
  }

  // If active media players are playing
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
        darkMode ? 'text-slate-300' : 'text-slate-600'
      } ${className}`}
    >
      {/* 1. Introductory prefix */}
      <span>Currently,</span>

      {/* 2. Active Speakers Count Badge */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
          darkMode
            ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
            : 'bg-purple-50 border-purple-200 text-purple-800'
        }`}
      >
        <SpeakerHigh size={13} weight="fill" className="text-purple-400" />
        <span>{activeMediaCount} {activeMediaCount === 1 ? 'player' : 'players'} active</span>
      </span>

      <span>playing across</span>

      {/* 3. Rooms Count Badge */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
          darkMode
            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}
      >
        <span>{activeRoomsCount} {activeRoomsCount === 1 ? 'room' : 'rooms'}</span>
      </span>

      {/* 4. Named Track / Room Badges if <= 3 */}
      {activePlayersInfo.length <= 3 ? (
        <>
          <span>including</span>
          {activePlayersInfo.map((p, idx) => (
            <React.Fragment key={p.entityId}>
              {idx > 0 && <span>and</span>}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs max-w-[200px] truncate ${
                  darkMode
                    ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                    : 'bg-pink-50 border-pink-200 text-pink-800'
                }`}
                title={`${p.areaName}: ${p.title}`}
              >
                {p.isTv ? (
                  <Television size={13} weight="duotone" className="shrink-0 text-sky-400" />
                ) : (
                  <MusicNotes size={13} weight="duotone" className="shrink-0 text-pink-400" />
                )}
                <span className="truncate">{p.areaName}: {p.title}</span>
              </span>
            </React.Fragment>
          ))}
        </>
      ) : (
        <span>with synchronized playback in progress.</span>
      )}
    </div>
  );
}
