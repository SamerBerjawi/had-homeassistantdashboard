/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MediaPlayerTile Component
 * Immersive area media player card:
 * - When playing / active:
 *   - Dynamic blurred album art background with ambient glass gradients
 *   - High-resolution square album artwork
 *   - Device output badge, song title, and dynamic artist palette styling
 *   - Full transport controls (Previous, Glowing Play/Pause, Next)
 *   - Embedded AudioWaveformScrubber with live track elapsed/remaining time
 * - When idle / off:
 *   - Clean compact format with device classification icon, telemetry, and play toggle
 * - Long-press or card tap opens full media modal/drawer
 */

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Television,
  SpeakerSimpleHigh,
  Headphones,
  MusicNotes,
  SpeakerHigh
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { useMediaPosition } from '../../hooks/useMediaPosition';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import AudioWaveformScrubber from '../media/AudioWaveformScrubber';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useHAImage } from '../../services/haImageService';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import CompactTile from './CompactTile';

interface MediaPlayerTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onPlayPause?: (entity: ResolvedEntity) => void;
  onNext?: (entity: ResolvedEntity) => void;
  onPrevious?: (entity: ResolvedEntity) => void;
  onOpenDrawer?: (entity: ResolvedEntity) => void;
  onIconClick?: () => void;
}

export const MediaPlayerTile: React.FC<MediaPlayerTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onPlayPause,
  onNext,
  onPrevious,
  onOpenDrawer,
  onIconClick
}) => {
  const serverUrl = useAutoLayoutStore((s) => s.serverUrl);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);

  const isPlaying = entity.state === 'playing';
  const isPaused = entity.state === 'paused';
  const isActive = isPlaying || isPaused;

  const { currentPosition, duration } = useMediaPosition(entity);

  const title = entity.attributes?.media_title || entity.attributes?.app_name || (isActive ? 'Media Playing' : 'Idle / Stopped');
  const rawArtist = entity.attributes?.media_artist || entity.attributes?.friendly_name || entity.name;
  const artist = formatEntityDisplayName(rawArtist, areaName);
  const album = entity.attributes?.media_album_name || entity.attributes?.source;

  const rawPicture = entity.attributes?.entity_picture || entity.attributes?.media_image;
  const { imageUrl: albumArtUrl } = useHAImage(rawPicture, serverUrl);

  // Extract dynamic accent palette from album art
  const palette = useAlbumArtColor(albumArtUrl || null, {
    title,
    artist,
    darkMode
  });

  // Device classification
  const rawDeviceName = entity.attributes?.friendly_name || entity.name;
  const deviceName = formatEntityDisplayName(rawDeviceName, areaName);
  const isTv = entity.attributes?.device_class === 'tv' || entity.entity_id.includes('tv') || entity.entity_id.includes('apple_tv');
  const isHeadphones = entity.entity_id.includes('buds') || entity.entity_id.includes('headphones') || entity.entity_id.includes('airpods') || entity.entity_id.includes('ear');
  const lastChangedStr = formatRelativeTime(entity.last_changed || entity.last_updated);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlayPause) {
      onPlayPause(entity);
      return;
    }
    const nextState = isPlaying ? 'paused' : 'playing';
    updateEntityState(entity.entity_id, nextState);
    callHAService(
      'media_player',
      isPlaying ? 'media_pause' : 'media_play',
      {},
      { entity_id: entity.entity_id }
    );
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPrevious) {
      onPrevious(entity);
      return;
    }
    callHAService('media_player', 'media_previous_track', {}, { entity_id: entity.entity_id });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNext) {
      onNext(entity);
      return;
    }
    callHAService('media_player', 'media_next_track', {}, { entity_id: entity.entity_id });
  };

  const handleSeek = (newSecs: number) => {
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      media_position: newSecs,
      media_position_updated_at: new Date().toISOString()
    });
    callHAService('media_player', 'media_seek', { seek_position: newSecs }, { entity_id: entity.entity_id });
  };

  // =========================================================================
  // 1. EXPANDED IMMERSIVE CARD (FOR ACTIVE / PLAYING MEDIA)
  // =========================================================================
  if (isActive) {
    return (
      <div
        onClick={() => onOpenDrawer ? onOpenDrawer(entity) : onIconClick?.()}
        style={{
          boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)'
        }}
        className={`w-full h-full group relative rounded-3xl p-4 sm:p-5 border border-purple-500/40 overflow-hidden isolate backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 ${
          albumArtUrl
            ? 'bg-slate-950/60 text-white'
            : darkMode
            ? 'bg-black/20 text-white'
            : 'bg-white/20 text-slate-900'
        }`}
      >
        {/* Dynamic Blurred Album Artwork Background */}
        {albumArtUrl && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
            <img
              src={albumArtUrl}
              alt=""
              className="w-full h-full object-cover scale-125 filter blur-2xl opacity-60 dark:opacity-55 transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 dark:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/60 to-white/40 dark:hidden block" />
          </div>
        )}

        {/* Main Row: Album Artwork + Song Info + Transport Controls */}
        <div className="relative z-10 flex items-stretch justify-between gap-3.5 min-w-0">
          {/* Left Side: Large Album Artwork spanning full height */}
          <div className="flex items-stretch gap-3.5 min-w-0 flex-1">
            <div className="relative aspect-square w-16 sm:w-20 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/20 dark:ring-white/10 shrink-0 group/art self-stretch flex items-center justify-center">
              {albumArtUrl ? (
                <img
                  src={albumArtUrl}
                  alt={title}
                  className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950 flex items-center justify-center text-purple-300">
                  <MusicNotes size={28} weight="duotone" />
                </div>
              )}
            </div>

            {/* Song Info */}
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
              {/* Device Output Badge */}
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 truncate max-w-[150px] transition-colors duration-300"
                  style={{
                    backgroundColor: palette.badgeBg,
                    borderColor: palette.badgeBorder,
                    color: palette.badgeText
                  }}
                >
                  {isHeadphones ? (
                    <Headphones size={11} weight="bold" />
                  ) : isTv ? (
                    <Television size={11} weight="bold" />
                  ) : (
                    <SpeakerSimpleHigh size={11} weight="bold" />
                  )}
                  <span className="truncate">{deviceName}</span>
                </span>
              </div>

              {/* Song Title */}
              <h4 className={`text-sm sm:text-base font-black truncate tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h4>

              {/* Artist Name */}
              <p
                className="text-xs font-semibold truncate transition-colors duration-300"
                style={{ color: darkMode ? palette.light : palette.primary }}
              >
                {artist}
              </p>

              {album && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {album}
                </p>
              )}
            </div>
          </div>

          {/* Right Side: Playback Transport Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handlePrev}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs"
              title="Previous Track"
            >
              <SkipBack size={15} weight="fill" />
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl text-white flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90 hover:scale-105"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 8px 20px -4px ${palette.glow}`,
              }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-xs"
              title="Next Track"
            >
              <SkipForward size={15} weight="fill" />
            </button>
          </div>
        </div>

        {/* Waveform Scrubber with Inline Layout */}
        <div className="relative z-10 w-full pt-1" onClick={(e) => e.stopPropagation()}>
          <AudioWaveformScrubber
            title={title}
            artist={artist}
            duration={duration}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            palette={palette}
            darkMode={darkMode}
            barCount={56}
            layout="inline"
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. IDLE / OFF COMPACT FORMAT
  // =========================================================================
  return (
    <CompactTile
      darkMode={darkMode}
      title={deviceName}
      subtitle={`Idle • ${lastChangedStr || 'Off'}`}
      onIconClick={onIconClick || (() => onOpenDrawer && onOpenDrawer(entity))}
      icon={
        isHeadphones ? (
          <Headphones size={22} weight="duotone" className="text-slate-400" />
        ) : isTv ? (
          <Television size={22} weight="duotone" className="text-slate-400" />
        ) : (
          <SpeakerSimpleHigh size={22} weight="duotone" className="text-slate-400" />
        )}
      actionButton={
        <button
          type="button"
          onClick={handlePlayPause}
          className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
            darkMode ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-900/[0.06] text-slate-700'
          }`}
          title="Play"
        >
          <Play size={18} weight="fill" className="ml-0.5" />
        </button>
      }
      onClick={() => onOpenDrawer ? onOpenDrawer(entity) : onIconClick?.()}
    />
  );
};

export default MediaPlayerTile;
