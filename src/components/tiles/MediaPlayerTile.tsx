/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MediaPlayerTile Component
 * Dynamically expands to Wide (4x2) with hero cover art when playing,
 * and collapses cleanly to Standard (2x2) / Compact (2x1) when idle, with last changed telemetry.
 */

import React from 'react';
import {
  SpeakerHigh,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  SpeakerSimpleHigh,
  SpeakerSimpleLow,
  SpeakerSimpleSlash
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, getHAImageUrl, formatRelativeTime } from '../../lib/utils';
import WideTile from './WideTile';
import CompactTile from './CompactTile';

interface MediaPlayerTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onPlayPause: (entity: ResolvedEntity) => void;
  onNext?: (entity: ResolvedEntity) => void;
  onPrevious?: (entity: ResolvedEntity) => void;
  onVolumeChange?: (entity: ResolvedEntity, volume: number) => void;
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
  onVolumeChange,
  onOpenDrawer,
  onIconClick
}) => {
  const isPlaying = entity.state === 'playing';
  const isPaused = entity.state === 'paused';
  const isActive = isPlaying || isPaused;

  const title = entity.attributes?.media_title || entity.attributes?.app_name || entity.name;
  const artist = entity.attributes?.media_artist || entity.attributes?.media_series_title || formatEntityDisplayName(entity.name, areaName);
  const rawPicture = entity.attributes?.entity_picture;
  const pictureUrl = getHAImageUrl(rawPicture);
  const volumeLevel = entity.attributes?.volume_level !== undefined ? Math.round(entity.attributes.volume_level * 100) : undefined;
  const isMuted = entity.attributes?.is_volume_muted === true;
  const lastChangedStr = formatRelativeTime(entity.last_changed || entity.last_updated);

  if (isActive) {
    const subtitle = `${artist}${lastChangedStr ? ` • ${lastChangedStr}` : ''}`;

    return (
      <WideTile
        darkMode={darkMode}
        title={title}
        subtitle={subtitle}
        backdropImage={pictureUrl}
        isActive={isPlaying}
        accentColor="#06b6d4"
        activeBorderColor="border-cyan-400/50"
        onIconClick={onIconClick || (() => onOpenDrawer && onOpenDrawer(entity))}
        icon={<SpeakerHigh size={24} weight="duotone" className={isPlaying ? 'text-cyan-400 animate-pulse' : 'text-slate-400'} />}
        headerAction={
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                isPlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-900/40 text-slate-400 border border-white/10'
              }`}
            >
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-3 w-full" onClick={(e) => e.stopPropagation()}>
            {/* Transport Controls with >= 44px hit slop */}
            <div className="flex items-center gap-1">
              {onPrevious && (
                <button
                  type="button"
                  onClick={() => onPrevious(entity)}
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-90"
                  title="Previous"
                >
                  <SkipBack size={18} weight="fill" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onPlayPause(entity)}
                className="min-w-[44px] min-h-[44px] rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90 shadow-md shadow-cyan-500/20"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" className="ml-0.5" />}
              </button>

              {onNext && (
                <button
                  type="button"
                  onClick={() => onNext(entity)}
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-90"
                  title="Next"
                >
                  <SkipForward size={18} weight="fill" />
                </button>
              )}
            </div>

            {/* Volume Slider */}
            {volumeLevel !== undefined && onVolumeChange && (
              <div className="flex items-center gap-2 flex-1 max-w-[180px] sm:max-w-[240px]">
                {isMuted ? (
                  <SpeakerSimpleSlash size={18} className="text-rose-400 shrink-0" />
                ) : volumeLevel > 50 ? (
                  <SpeakerSimpleHigh size={18} className="text-cyan-400 shrink-0" />
                ) : (
                  <SpeakerSimpleLow size={18} className="text-slate-400 shrink-0" />
                )}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumeLevel}
                  onChange={(e) => onVolumeChange(entity, Number(e.target.value) / 100)}
                  className="w-full h-1.5 bg-slate-700/50 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[11px] font-mono font-bold text-slate-400 min-w-[28px] text-right">
                  {volumeLevel}%
                </span>
              </div>
            )}
          </div>
        }
      />
    );
  }

  // Idle / Off State (Compact 2x1)
  return (
    <CompactTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={`Idle • ${lastChangedStr || 'Off'}`}
      onIconClick={onIconClick || (() => onOpenDrawer && onOpenDrawer(entity))}
      icon={<SpeakerHigh size={24} weight="duotone" className="text-slate-400" />}
      actionButton={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause(entity);
          }}
          className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
            darkMode ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-900/[0.06] text-slate-700'
          }`}
          title="Play Music"
        >
          <Play size={18} weight="fill" className="ml-0.5" />
        </button>
      }
    />
  );
};

export default MediaPlayerTile;
