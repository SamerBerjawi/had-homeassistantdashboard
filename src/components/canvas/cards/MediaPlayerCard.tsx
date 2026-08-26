/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, SkipForward, Volume2, Music } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface MediaPlayerCardProps {
  config: CardConfig;
  entity: HAEntity;
  onToggle: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function MediaPlayerCard({
  config,
  entity,
  onToggle,
  onOpenModal
}: MediaPlayerCardProps) {
  const isPlaying = entity.state === 'playing';
  const title = entity.attributes?.media_title || 'No Media Playing';
  const artist = entity.attributes?.media_artist || entity.attributes?.friendly_name || 'Media Player';
  const volume = entity.attributes?.volume_level ?? 45;
  const albumArt = entity.attributes?.media_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop';
  const cardTitle = config.title || entity.attributes?.friendly_name || 'Audio Stream';

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, isPlaying ? 'paused' : 'playing');
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, 'playing', {
      media_title: 'Midnight City (Remix)',
      media_artist: 'M83 • Synthwave'
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Blurred album artwork ambient glow in the background */}
      <div 
        className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-cover bg-center blur-2xl opacity-30 pointer-events-none"
        style={{ backgroundImage: `url(${albumArt})` }}
      />

      {/* Top row: Track Title & Speaker icon */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/20 shadow-md shrink-0">
            <img src={albumArt} alt={title} className="w-full h-full object-cover" />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-pink-300 font-medium truncate">{artist}</p>
          </div>
        </div>

        {/* Live Audio Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-[10px] font-bold">
          <Music size={11} className={isPlaying ? 'animate-bounce' : ''} />
          <span>{isPlaying ? 'Sonos Live' : 'Paused'}</span>
        </div>
      </div>

      {/* Playback Controls & Progress/Volume Bar */}
      <div className="my-1.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isPlaying 
                  ? 'bg-pink-500 hover:bg-pink-400 text-white shadow-pink-500/30' 
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-xs font-mono">
            <Volume2 size={14} className="text-slate-400" />
            <span>{volume}%</span>
          </div>
        </div>
      </div>

      {/* Volume / Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden border border-white/10 relative z-10">
        <div 
          className="h-full rounded-full bg-linear-to-r from-pink-500 to-purple-400"
          style={{ width: `${volume}%` }}
        />
      </div>
    </div>
  );
}
