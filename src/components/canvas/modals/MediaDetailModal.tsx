import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, SpeakerHigh, SpeakerSlash, MusicNotes, Airplay, Disc } from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';

interface MediaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

const SPEAKERS = [
  { id: 'living_room', name: 'Sonos Arc (Living Room)', active: true },
  { id: 'bedroom', name: 'Sonos One (Bedroom)', active: false },
  { id: 'kitchen', name: 'Sonos Era 100 (Kitchen)', active: true }
];

export default function MediaDetailModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: MediaDetailModalProps) {
  const isPlaying = entity.state === 'playing';
  const title = entity.attributes?.media_title || 'After Hours (Lofi Cover)';
  const artist = entity.attributes?.media_artist || 'The Weekend Dreamer';
  const initialVol = entity.attributes?.volume_level ?? 45;
  const [volume, setVolume] = useState<number>(initialVol);
  const [progress, setProgress] = useState<number>(38);
  const [isMuted, setIsMuted] = useState(false);

  const albumArt = entity.attributes?.media_image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop';

  const handlePlayPause = () => {
    onUpdateEntity(entity.entity_id, isPlaying ? 'paused' : 'playing');
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    onUpdateEntity(entity.entity_id, entity.state, { volume_level: val });
  };

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={entity.attributes?.friendly_name || 'Multi-Room Audio'}
      subtitle="AirPlay 2 & Spotify Connect"
      icon={<MusicNotes size={22} weight="duotone" className="text-pink-400" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {/* Album Artwork & Spinning Vinyl Graphic */}
        <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-black/40 border border-white/10 relative overflow-hidden">
          <div className="relative w-44 h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img src={albumArt} alt={title} className="w-full h-full object-cover" />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Disc size={48} weight="duotone" className="text-white/80 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            )}
          </div>

          <div className="text-center mt-4">
            <h4 className="text-base font-extrabold text-white tracking-tight">{title}</h4>
            <p className="text-xs text-pink-300 font-semibold mt-0.5">{artist}</p>
          </div>

          {/* Track Progress Scrubber */}
          <div className="w-full mt-5 space-y-1">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1:24</span>
              <span>3:42</span>
            </div>
          </div>
        </div>

        {/* Master Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setProgress(0)}
            className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105"
            title="Previous"
          >
            <SkipBack size={18} weight="duotone" />
          </button>

          <button
            onClick={handlePlayPause}
            className="w-16 h-16 rounded-3xl bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" className="ml-1" />}
          </button>

          <button
            onClick={() => setProgress(15)}
            className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105"
            title="Next"
          >
            <SkipForward size={18} weight="duotone" />
          </button>
        </div>

        {/* Volume Slider with Mute Toggle */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            {isMuted ? <SpeakerSlash size={18} weight="duotone" className="text-rose-400" /> : <SpeakerHigh size={18} weight="duotone" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <span className="text-xs font-mono font-bold text-white min-w-8 text-right">
            {isMuted ? '0%' : `${volume}%`}
          </span>
        </div>

        {/* Multi-Room Speaker Grouping */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Airplay size={15} weight="duotone" className="text-indigo-400" /> Multi-Room Synchronized Output
          </div>
          <div className="space-y-1.5">
            {SPEAKERS.map((spk) => (
              <div
                key={spk.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="text-xs font-medium text-slate-200">{spk.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  spk.active ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-white/5 text-slate-500'
                }`}>
                  {spk.active ? 'Grouped' : 'Standby'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
