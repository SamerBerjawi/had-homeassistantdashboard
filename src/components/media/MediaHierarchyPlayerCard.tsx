/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MediaHierarchyPlayerCard:
 * Compact, highly functional media player card used in the Floor → Area hierarchy view.
 * Displays real status, active playback badge, transport toggle, and opens full detail modal.
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  Television,
  Radio,
  MusicNotes,
  Airplay,
  Power
} from '@phosphor-icons/react';
import { ResolvedEntity, HAEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useHAImage } from '../../services/haImageService';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import { resolveMediaVisual } from '../../lib/mediaVisuals';
import { detectMediaPlayerType } from '../../services/mediaPlayerClassification';

interface MediaHierarchyPlayerCardProps {
  media: ResolvedEntity;
  darkMode?: boolean;
  onOpenDetail: (media: ResolvedEntity) => void;
  callHAService: (
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: any
  ) => Promise<any>;
  updateEntityState: (
    entityId: string,
    newState: string,
    newAttributes?: Record<string, any>
  ) => void;
}

export default function MediaHierarchyPlayerCard({
  media,
  darkMode = true,
  onOpenDetail,
  callHAService,
  updateEntityState
}: MediaHierarchyPlayerCardProps) {
  const serverUrl = useAutoLayoutStore((s) => s.serverUrl);
  const devices = useAutoLayoutStore((s) => s.devices);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);

  const visual = resolveMediaVisual(media);
  const classification = detectMediaPlayerType(media as unknown as HAEntity, devices, Object.values(resolvedEntities));
  const isPlaying = media.state === 'playing';
  const isPaused = media.state === 'paused';
  const isOff = media.state === 'off' || media.state === 'standby' || media.state === 'unavailable';

  const rawArt = media.attributes?.media_image || media.attributes?.entity_picture;
  const { imageUrl: albumArt } = useHAImage(rawArt, serverUrl);

  const palette = useAlbumArtColor(albumArt || null, {
    title: visual.title,
    artist: visual.subtitle,
    darkMode
  });

  const currentVol = typeof media.attributes?.volume_level === 'number'
    ? Math.round(media.attributes.volume_level * 100)
    : 45;
  const [volume, setVolume] = useState<number>(currentVol);
  const isMuted = Boolean(media.attributes?.is_volume_muted);

  useEffect(() => {
    if (media.attributes?.volume_level !== undefined) {
      setVolume(Math.round(media.attributes.volume_level * 100));
    }
  }, [media.attributes?.volume_level]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = isPlaying ? 'paused' : 'playing';
    updateEntityState(media.entity_id, nextState);
    callHAService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, { entity_id: media.entity_id });
  };

  const handlePower = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'toggle', {}, { entity_id: media.entity_id });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setVolume(parseInt(e.target.value, 10));
  };

  const handleVolumeCommit = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'volume_set', { volume_level: volume / 100 }, { entity_id: media.entity_id });
  };

  const AppIcon = visual.appInfo?.icon || (classification.kind === 'apple_tv' ? Television : classification.kind === 'homepod' ? Radio : MusicNotes);

  return (
    <div
      onClick={() => onOpenDetail(media)}
      style={{
        clipPath: 'inset(0 round 1.5rem)',
        boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)'
      }}
      className={`group relative flex flex-col justify-between p-4 rounded-3xl border ${
        isPlaying ? 'border-purple-400/40' : 'border-slate-200/80 dark:border-white/10'
      } backdrop-blur-sm transition-all duration-200 cursor-pointer overflow-hidden isolate ${
        isPlaying
          ? 'bg-purple-500/20 text-slate-900 dark:text-white'
          : darkMode
          ? 'bg-black/20 hover:bg-black/30 text-white'
          : 'bg-white/20 hover:bg-white/30 text-slate-900'
      }`}
    >
      {/* Top Row: Thumbnail + Details + Badges */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Artwork / Icon Thumbnail */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-slate-800 flex items-center justify-center">
          {albumArt ? (
            <img src={albumArt} alt={visual.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: palette.badgeBg }}
            >
              <AppIcon size={22} weight="duotone" style={{ color: palette.light }} />
            </div>
          )}

          {/* Active status pulse */}
          {isPlaying && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: palette.light }}
              />
            </div>
          )}
        </div>

        {/* Title & Friendly Name */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4 className="text-xs sm:text-sm font-bold truncate leading-snug">
              {visual.title}
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 border ${
                isPlaying
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse'
                  : isPaused
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : isOff
                  ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {media.state}
            </span>
          </div>

          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate mt-0.5">
            {visual.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom Row: Quick Controls (Play/Pause, Power, Volume) */}
      <div
        className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/5 dark:border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={isOff}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 ${
              isPlaying
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                : darkMode
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handlePower}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              !isOff
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
                : darkMode
                ? 'bg-white/5 hover:bg-white/15 text-slate-400 border border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
            }`}
            title="Toggle Power"
          >
            <Power size={12} weight="bold" />
          </button>
        </div>

        {/* Mini Volume Bar */}
        <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
          <SpeakerHigh size={13} weight="duotone" className="text-slate-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            disabled={isOff}
            onChange={handleVolumeChange}
            onMouseUp={handleVolumeCommit}
            onTouchEnd={handleVolumeCommit}
            className="w-full h-1 rounded-lg bg-slate-200 dark:bg-white/15 appearance-none cursor-pointer accent-purple-500 disabled:opacity-30"
          />
          <span className="text-[10px] font-mono text-slate-400 shrink-0 min-w-[22px] text-right">
            {volume}%
          </span>
        </div>
      </div>
    </div>
  );
}
