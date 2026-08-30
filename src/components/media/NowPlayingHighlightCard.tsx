/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NowPlayingHighlightCard:
 * Premium hero card for actively playing media players.
 * Features ambient glow, dynamic palette extraction, waveform scrubber,
 * responsive transport controls, volume slider, and room/floor context.
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
  Television,
  Radio,
  MusicNotes,
  Airplay,
  Power,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { ResolvedEntity, HAEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useHAImage } from '../../services/haImageService';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import { resolveMediaVisual } from '../../lib/mediaVisuals';
import { detectMediaPlayerType, MediaPlayerService } from '../../services/mediaPlayerClassification';
import AudioWaveformScrubber from './AudioWaveformScrubber';
import { useMediaPosition } from '../../hooks/useMediaPosition';

interface NowPlayingHighlightCardProps {
  media: ResolvedEntity;
  areaName?: string;
  floorName?: string;
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

export default function NowPlayingHighlightCard({
  media,
  areaName,
  floorName,
  darkMode = true,
  onOpenDetail,
  callHAService,
  updateEntityState
}: NowPlayingHighlightCardProps) {
  const serverUrl = useAutoLayoutStore((s) => s.serverUrl);
  const devices = useAutoLayoutStore((s) => s.devices);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);

  const visual = resolveMediaVisual(media);
  const classification = detectMediaPlayerType(media as unknown as HAEntity, devices, Object.values(resolvedEntities));
  const isPlaying = media.state === 'playing';

  const rawArt = media.attributes?.media_image || media.attributes?.entity_picture;
  const { imageUrl: albumArt } = useHAImage(rawArt, serverUrl);

  const palette = useAlbumArtColor(albumArt || null, {
    title: visual.title,
    artist: visual.subtitle,
    darkMode
  });

  // Volume state
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

  // Waveform progress scrubber
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekOverride, setSeekOverride] = useState<number | null>(null);

  const { currentPosition, duration } = useMediaPosition(
    media as unknown as HAEntity,
    isSeeking,
    seekOverride,
    true
  );

  const handleSeek = async (seconds: number) => {
    setSeekOverride(seconds);
    setIsSeeking(false);
    await callHAService('media_player', 'media_seek', { seek_position: seconds }, { entity_id: media.entity_id });
    setTimeout(() => setSeekOverride(null), 800);
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = isPlaying ? 'paused' : 'playing';
    updateEntityState(media.entity_id, nextState);
    callHAService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, { entity_id: media.entity_id });
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'media_previous_track', {}, { entity_id: media.entity_id });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'media_next_track', {}, { entity_id: media.entity_id });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
  };

  const handleVolumeCommit = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    callHAService(
      'media_player',
      'volume_set',
      { volume_level: volume / 100 },
      { entity_id: media.entity_id }
    );
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService(
      'media_player',
      'volume_mute',
      { is_volume_muted: !isMuted },
      { entity_id: media.entity_id }
    );
  };

  const handlePower = (e: React.MouseEvent) => {
    e.stopPropagation();
    callHAService('media_player', 'toggle', {}, { entity_id: media.entity_id });
  };

  const AppIcon = visual.appInfo?.icon || (classification.kind === 'apple_tv' ? Television : MusicNotes);

  return (
    <div
      onClick={() => onOpenDetail(media)}
      className={`group relative overflow-hidden isolate rounded-3xl backdrop-blur-md transition-all duration-300 cursor-pointer shadow-xs ${
        darkMode
          ? 'bg-slate-900/60 hover:bg-slate-900/80 text-white'
          : 'bg-white/60 hover:bg-white/80 text-slate-900'
      }`}
      style={{
        boxShadow: darkMode
          ? `0 10px 30px -10px ${palette.glowSubtle}`
          : `0 10px 25px -10px ${palette.glowSubtle}`
      }}
    >
      {/* Ambient background bloom with strict containment */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        {albumArt ? (
          <div
            className="absolute -right-8 -top-8 w-56 h-56 rounded-full bg-cover bg-center blur-2xl opacity-25 dark:opacity-35 pointer-events-none transition-opacity duration-700 group-hover:opacity-45"
            style={{ backgroundImage: `url(${albumArt})` }}
          />
        ) : (
          <div
            className="absolute -right-8 -top-8 w-56 h-56 rounded-full blur-2xl opacity-20 pointer-events-none transition-opacity duration-700"
            style={{ backgroundColor: palette.primary }}
          />
        )}
      </div>

      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between gap-5">
        {/* Header Row: Room/Floor context + Classification Badge + Power */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {areaName && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors shadow-xs ${
                  darkMode
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}
              >
                {areaName}
              </span>
            )}
            {floorName && (
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                {floorName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Device / App Badge */}
            {visual.appInfo ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors"
                style={{
                  backgroundColor: visual.appInfo.badgeBg,
                  borderColor: visual.appInfo.badgeBorder,
                  color: visual.appInfo.badgeText
                }}
              >
                <AppIcon size={13} weight="duotone" />
                <span>{visual.appInfo.name}</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors"
                style={{
                  backgroundColor: palette.badgeBg,
                  borderColor: palette.badgeBorder,
                  color: palette.badgeText
                }}
              >
                <MusicNotes size={13} weight="duotone" className="animate-pulse" />
                <span>{isPlaying ? 'Now Playing' : 'Paused'}</span>
              </div>
            )}

            {/* Quick Power Button */}
            <button
              type="button"
              onClick={handlePower}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                darkMode
                  ? 'bg-white/5 hover:bg-rose-500/20 border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300'
                  : 'bg-slate-100 hover:bg-rose-100 border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600'
              }`}
              title="Power Toggle"
            >
              <Power size={13} weight="bold" />
            </button>
          </div>
        </div>

        {/* Main Content Row: Artwork + Track Details */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Artwork / App Visual */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/20 shadow-md shrink-0 bg-slate-800 flex items-center justify-center">
            {albumArt ? (
              <img
                src={albumArt}
                alt={visual.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: palette.badgeBg }}
              >
                <AppIcon size={36} weight="duotone" style={{ color: palette.light }} />
              </div>
            )}

            {/* Live Audio Glow Pulse */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                <span
                  className="w-3 h-3 rounded-full animate-ping"
                  style={{ backgroundColor: palette.light }}
                />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="min-w-0 flex-1">
            <h3
              className={`text-base sm:text-lg font-black tracking-tight truncate ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {visual.title}
            </h3>
            <p
              className="text-xs sm:text-sm font-semibold truncate transition-colors duration-300 mt-0.5"
              style={{ color: palette.light }}
            >
              {visual.subtitle}
            </p>
            {visual.album && (
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {visual.album}
              </p>
            )}
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
              {media.attributes?.friendly_name || media.name}
            </p>
          </div>
        </div>

        {/* Audio Waveform Scrubber */}
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          <AudioWaveformScrubber
            title={visual.title}
            artist={visual.subtitle}
            duration={duration}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            palette={palette}
            darkMode={darkMode}
            barCount={36}
          />
        </div>

        {/* Controls Row: Transport Buttons + Volume Slider */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5 dark:border-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Transport buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!classification.supportsNextPrev}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border disabled:opacity-40 ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Previous Track"
            >
              <SkipBack size={15} weight="duotone" />
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer text-white shadow-md active:scale-95"
              style={{
                backgroundColor: palette.primary,
                boxShadow: `0 4px 14px 0 ${palette.glow}`
              }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!classification.supportsNextPrev}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border disabled:opacity-40 ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Next Track"
            >
              <SkipForward size={15} weight="duotone" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 min-w-[140px] sm:min-w-[170px]">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isMuted
                  ? 'text-rose-400 bg-rose-500/20'
                  : darkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="duotone" />}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              onMouseUp={handleVolumeCommit}
              onTouchEnd={handleVolumeCommit}
              className="w-full h-1.5 rounded-lg bg-slate-200 dark:bg-white/15 appearance-none cursor-pointer accent-indigo-500"
              style={{
                accentColor: palette.primary
              }}
            />

            <span className="text-[11px] font-mono font-semibold text-slate-400 min-w-[28px] text-right">
              {volume}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
