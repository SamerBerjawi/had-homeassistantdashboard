/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, SkipForward, SpeakerHigh, MusicNotes, Television, Radio, Airplay } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';
import { detectMediaPlayerType, MediaPlayerService } from '../../../services/mediaPlayerClassification';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { getHAImageUrl } from '../../../lib/utils';
import { useAlbumArtColor } from '../../../hooks/useAlbumArtColor';

interface MediaPlayerCardProps {
  config: CardConfig;
  entity: HAEntity;
  onToggle?: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function MediaPlayerCard({
  config,
  entity,
  onOpenModal
}: MediaPlayerCardProps) {
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);
  const devices = useAutoLayoutStore(s => s.devices);
  const resolvedEntities = useAutoLayoutStore(s => s.resolvedEntities);

  const classification = detectMediaPlayerType(entity, devices, Object.values(resolvedEntities));
  const isPlaying = entity.state === 'playing';
  const title = entity.attributes?.media_title || (isPlaying ? 'Active Media' : 'Idle / Off');
  const artist = entity.attributes?.media_artist || entity.attributes?.friendly_name || 'Media Player';
  const volumePct = typeof entity.attributes?.volume_level === 'number'
    ? Math.round(entity.attributes.volume_level * 100)
    : 45;

  const rawArt = entity.attributes?.media_image || entity.attributes?.entity_picture;
  const albumArt = getHAImageUrl(rawArt, serverUrl) || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop';

  const palette = useAlbumArtColor(albumArt, {
    title,
    artist,
    darkMode: true
  });

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await MediaPlayerService.playPause(entity.entity_id);
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await MediaPlayerService.nextTrack(entity.entity_id);
  };

  const renderBadge = () => {
    if (classification.kind === 'apple_tv') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 text-[10px] font-bold">
          <Television size={12} weight="duotone" />
          <span>{isPlaying ? 'Apple TV' : 'Idle'}</span>
        </div>
      );
    }
    if (classification.kind === 'homepod') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-bold">
          <Radio size={12} weight="duotone" />
          <span>HomePod</span>
        </div>
      );
    }
    if (classification.kind === 'sonos') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[10px] font-bold">
          <MusicNotes size={12} weight="duotone" className={isPlaying ? 'animate-bounce' : ''} />
          <span>{isPlaying ? 'Sonos Live' : 'Sonos'}</span>
        </div>
      );
    }
    if (classification.kind === 'cast') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
          <Airplay size={12} weight="duotone" />
          <span>Google Cast</span>
        </div>
      );
    }
    return (
      <div 
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors duration-300"
        style={{
          backgroundColor: palette.badgeBg,
          borderColor: palette.badgeBorder,
          color: palette.badgeText
        }}
      >
        <MusicNotes size={12} weight="duotone" />
        <span>{isPlaying ? 'Live Audio' : 'Paused'}</span>
      </div>
    );
  };

  return (
    <div 
      onClick={onOpenModal}
      className="relative w-full h-full flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Ambient Artwork Glow */}
      <div 
        className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-cover bg-center blur-xl opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${albumArt})` }}
      />

      {/* Top row: Track Title & Badge */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/20 shadow-md shrink-0">
            <img src={albumArt} alt={title} className="w-full h-full object-cover" />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span 
                  className="w-2 h-2 rounded-full animate-ping" 
                  style={{ backgroundColor: palette.light }}
                />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h4>
            <p 
              className="text-[11px] font-medium truncate transition-colors duration-300"
              style={{ color: palette.light }}
            >
              {artist}
            </p>
          </div>
        </div>

        {/* Live Audio / Device Badge */}
        {renderBadge()}
      </div>

      {/* Playback Controls & Progress/Volume Bar */}
      <div className="my-1.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayPause}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
                !isPlaying 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-white/15 dark:hover:bg-white/25 dark:text-white dark:border-transparent'
                  : 'text-white'
              }`}
              style={
                isPlaying
                  ? {
                      backgroundColor: palette.primary,
                      boxShadow: `0 4px 14px 0 ${palette.glow}`,
                    }
                  : undefined
              }
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!classification.supportsNextPrev}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
              title="Next Track"
            >
              <SkipForward size={14} weight="duotone" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs font-mono">
            <SpeakerHigh size={15} weight="duotone" className="text-slate-500 dark:text-slate-400" />
            <span>{volumePct}%</span>
          </div>
        </div>
      </div>

      {/* Volume / Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-black/40 overflow-hidden border border-slate-300 dark:border-white/10 relative z-10">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${volumePct}%`,
            background: `linear-gradient(to right, ${palette.dark}, ${palette.primary}, ${palette.light})` 
          }}
        />
      </div>
    </div>
  );
}
