/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Area Media Player Card:
 * - When playing:
 *   - Uses exact AudioWaveformScrubber from sidebar modal with layout='inline' (elapsed on left, waveform in center, remaining on right)
 *   - Album art on the left sized to match the full height of the song info block
 *   - Song info next to the artwork with device badge on top
 *   - Transport buttons on the right (SkipBack, Play/Pause, SkipNext)
 *   - Volume bar removed
 * - When idle / off: Minimized to 1 column wide with compact device status and toggle
 * - Clicking the card opens the full sidebar Media Overview Modal
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
  MusicNotes
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { useMediaPosition } from '../../hooks/useMediaPosition';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import AudioWaveformScrubber from '../media/AudioWaveformScrubber';
import { getHAImageUrl } from '../../lib/utils';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

interface AreaMediaCardProps {
  media: ResolvedEntity;
  darkMode?: boolean;
  onOpenDrawer: (media: ResolvedEntity) => void;
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

export default function AreaMediaCard({
  media,
  darkMode = true,
  onOpenDrawer,
  callHAService,
  updateEntityState
}: AreaMediaCardProps) {
  const serverUrl = useAutoLayoutStore((s) => s.serverUrl);
  const isPlaying = media.state === 'playing';
  const isOff = media.state === 'off' || media.state === 'standby' || media.state === 'idle';

  const { currentPosition, duration } = useMediaPosition(media);

  const title = media.attributes?.media_title || media.attributes?.app_name || (isOff ? 'Powered Off' : 'Idle / Stopped');
  const artist = media.attributes?.media_artist || media.attributes?.friendly_name || media.name;
  const album = media.attributes?.media_album_name || media.attributes?.source;

  const rawPicture = media.attributes?.entity_picture || media.attributes?.media_image;
  const albumArtUrl = rawPicture ? getHAImageUrl(rawPicture, serverUrl) : null;

  // Extract dynamic accent palette from album art
  const palette = useAlbumArtColor(albumArtUrl, {
    title,
    artist,
    darkMode
  });

  // Device classification
  const deviceName = media.attributes?.friendly_name || media.name;
  const isTv = media.attributes?.device_class === 'tv' || media.entity_id.includes('tv') || media.entity_id.includes('apple_tv');
  const isHeadphones = media.entity_id.includes('buds') || media.entity_id.includes('headphones') || media.entity_id.includes('airpods') || media.entity_id.includes('ear');

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = isPlaying ? 'paused' : 'playing';
    updateEntityState(media.entity_id, nextState);
    callHAService(
      'media_player',
      isPlaying ? 'media_pause' : 'media_play',
      {},
      { entity_id: media.entity_id }
    );
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'media_previous_track', {}, { entity_id: media.entity_id });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'media_next_track', {}, { entity_id: media.entity_id });
  };

  const handleSeek = (newSecs: number) => {
    updateEntityState(media.entity_id, media.state, {
      ...media.attributes,
      media_position: newSecs,
      media_position_updated_at: new Date().toISOString()
    });
    callHAService('media_player', 'media_seek', { seek_position: newSecs }, { entity_id: media.entity_id });
  };

  // =========================================================================
  // 1. MINIMIZED 1-COLUMN CARD (FOR IDLE / OFF PLAYERS)
  // =========================================================================
  if (isOff || !isPlaying) {
    return (
      <div
        onClick={() => onOpenDrawer(media)}
        className={`col-span-1 p-4 rounded-2xl backdrop-blur-lg border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 hover:scale-[1.01] active:scale-[0.99] shadow-xs hover:shadow-md ${
          darkMode
            ? 'bg-white/[0.04] hover:bg-white/[0.07] border-white/10 text-white'
            : 'bg-white/80 hover:bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isHeadphones ? (
            <Headphones size={24} weight="duotone" className="text-slate-400 shrink-0" />
          ) : isTv ? (
            <Television size={24} weight="duotone" className="text-slate-400 shrink-0" />
          ) : (
            <SpeakerSimpleHigh size={24} weight="duotone" className="text-slate-400 shrink-0" />
          )}
          <div className="min-w-0">
            <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {deviceName}
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
              {media.state || 'Off'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handlePlayPause}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white transition-all cursor-pointer active:scale-90"
            title="Play"
          >
            <Play size={14} weight="fill" className="ml-0.5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. EXPANDED 2-COLUMN CARD (FOR ACTIVE / PLAYING MEDIA)
  // =========================================================================
  return (
    <div
      onClick={() => onOpenDrawer(media)}
      className={`col-span-2 md:col-span-3 lg:col-span-2 group relative rounded-3xl p-4 sm:p-5 border shadow-xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 hover:scale-[1.004] active:scale-[0.995] ${
        albumArtUrl
          ? 'bg-slate-950/60 border-white/20 text-white shadow-2xl'
          : darkMode
          ? 'bg-slate-900/80 border-purple-500/30 text-white shadow-purple-950/20'
          : 'bg-white/95 border-purple-200/80 text-slate-900 shadow-slate-200/60'
      }`}
      style={{ clipPath: 'inset(0 round 1.5rem)' }}
    >
      {/* Dynamic Blurred Album Artwork Background */}
      {albumArtUrl && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
          <img
            src={albumArtUrl}
            alt=""
            className="w-full h-full object-cover scale-125 filter blur-2xl opacity-60 dark:opacity-55 transition-opacity duration-700"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 dark:block hidden"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/60 to-white/40 dark:hidden block"
          />
        </div>
      )}

      {/* Main Row: Album Artwork (Matched to height of song info) + Song Info + Transport Controls */}
      <div className="relative z-10 flex items-stretch justify-between gap-3.5 min-w-0">
        {/* Left Side: Large Album Artwork spanning full height of song info block */}
        <div className="flex items-stretch gap-3.5 min-w-0 flex-1">
          <div className="relative aspect-square w-20 sm:w-24 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/20 dark:ring-white/10 shrink-0 group/art self-stretch flex items-center justify-center">
            {albumArtUrl ? (
              <img
                src={albumArtUrl}
                alt={title}
                className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950 flex items-center justify-center text-purple-300">
                <MusicNotes size={32} weight="duotone" />
              </div>
            )}
          </div>

          {/* Song Info (Entity ID / Device + Title + Artist) */}
          <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
            {/* Device / Output Badge */}
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

            {/* Optional Album / Source */}
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
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-white flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90 hover:scale-105"
            style={{
              backgroundColor: palette.primary,
              boxShadow: `0 10px 25px -4px ${palette.glow}`,
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" className="ml-0.5" />}
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

      {/* Waveform Scrubber in the Center with Elapsed Time on Left and Remaining Time on Right */}
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
