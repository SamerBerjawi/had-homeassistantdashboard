import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  SpeakerHigh,
  SpeakerLow,
  SpeakerSimpleSlash,
  Shuffle,
  Repeat,
  Power,
  MusicNotes,
  Disc,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface MediaPlayerControlViewProps {
  entity: HAEntity;
}

export default function MediaPlayerControlView({ entity }: MediaPlayerControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const isPlaying = entity?.state === 'playing';
  const isOff = entity?.state === 'off';
  const title = entity?.attributes?.media_title || entity?.attributes?.friendly_name || 'Media Player';
  const artist = entity?.attributes?.media_artist || entity?.attributes?.app_name || 'Home Audio';
  const album = entity?.attributes?.media_album_name || '';
  const picture = entity?.attributes?.entity_picture;
  const isMuted = Boolean(entity?.attributes?.is_volume_muted);
  const rawVolume = typeof entity?.attributes?.volume_level === 'number'
    ? Math.round(entity.attributes.volume_level * 100)
    : 45;

  const [volume, setVolume] = useState<number>(rawVolume);
  const [shuffle, setShuffle] = useState<boolean>(Boolean(entity?.attributes?.shuffle));
  const [repeat, setRepeat] = useState<string>(String(entity?.attributes?.repeat || 'off'));

  useEffect(() => {
    if (entity) {
      if (typeof entity.attributes?.volume_level === 'number') {
        setVolume(Math.round(entity.attributes.volume_level * 100));
      }
      setShuffle(Boolean(entity.attributes?.shuffle));
      setRepeat(String(entity.attributes?.repeat || 'off'));
    }
  }, [entity?.entity_id, entity?.state, entity?.attributes]);

  const sourceList: string[] = Array.isArray(entity?.attributes?.source_list)
    ? entity.attributes.source_list
    : ['Spotify', 'AirPlay', 'Bluetooth', 'TV Audio', 'Radio'];
  const currentSource = String(entity?.attributes?.source || sourceList[0] || 'Default');

  const handleTogglePower = () => {
    const nextState = isOff ? 'idle' : 'off';
    updateEntityState(entity.entity_id, nextState);
    callHAService('media_player', isOff ? 'turn_on' : 'turn_off', {}, { entity_id: entity.entity_id });
  };

  const handlePlayPause = () => {
    const nextState = isPlaying ? 'paused' : 'playing';
    updateEntityState(entity.entity_id, nextState);
    callHAService('media_player', 'media_play_pause', {}, { entity_id: entity.entity_id });
  };

  const handleNext = () => {
    callHAService('media_player', 'media_next_track', {}, { entity_id: entity.entity_id });
  };

  const handlePrevious = () => {
    callHAService('media_player', 'media_previous_track', {}, { entity_id: entity.entity_id });
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      volume_level: newVal / 100
    });
    callHAService('media_player', 'volume_set', { volume_level: newVal / 100 }, { entity_id: entity.entity_id });
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      is_volume_muted: nextMute
    });
    callHAService('media_player', 'volume_mute', { is_volume_muted: nextMute }, { entity_id: entity.entity_id });
  };

  const handleToggleShuffle = () => {
    const nextShuffle = !shuffle;
    setShuffle(nextShuffle);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      shuffle: nextShuffle
    });
    callHAService('media_player', 'shuffle_set', { shuffle: nextShuffle }, { entity_id: entity.entity_id });
  };

  const handleToggleRepeat = () => {
    const nextRepeat = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    setRepeat(nextRepeat);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      repeat: nextRepeat
    });
    callHAService('media_player', 'repeat_set', { repeat: nextRepeat }, { entity_id: entity.entity_id });
  };

  const handleSelectSource = (src: string) => {
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      source: src
    });
    callHAService('media_player', 'select_source', { source: src }, { entity_id: entity.entity_id });
  };

  return (
    <div className="space-y-6">
      {/* Artwork Hero Canvas with Dynamic Ambient Glow */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 p-5 flex flex-col items-center justify-center text-center shadow-xl">
        {/* Dynamic backdrop background image or gradient */}
        {picture ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl transform scale-125"
            style={{ backgroundImage: `url(${picture})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-purple-600/30 via-indigo-600/20 to-cyan-500/20 opacity-50 blur-xl" />
        )}

        <div className="relative z-10 flex flex-col items-center">
          {/* Album Vinyl / Art Frame */}
          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-2xl relative flex items-center justify-center mb-4 group">
            {picture ? (
              <img src={picture} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-linear-to-tr from-purple-900 via-indigo-900 to-slate-900 flex items-center justify-center text-purple-300">
                <Disc size={48} weight="duotone" className={isPlaying ? 'animate-spin [animation-duration:6s]' : ''} />
              </div>
            )}

            {/* Power Toggle Overlay Button */}
            <button
              type="button"
              onClick={handleTogglePower}
              className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer"
              title={isOff ? 'Turn On' : 'Turn Off'}
            >
              <Power size={14} weight="bold" className={isOff ? 'text-rose-400' : 'text-emerald-400'} />
            </button>
          </div>

          <h3 className="text-base font-extrabold text-white max-w-sm truncate">{title}</h3>
          <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-sm truncate">{artist}</p>
          {album && <p className="text-[11px] text-purple-300/80 font-mono mt-0.5">{album}</p>}
        </div>
      </div>

      {/* Main Transport Playback Controls */}
      <div className="p-4.5 rounded-3xl bg-slate-800/40 border border-white/10 flex items-center justify-center gap-4 sm:gap-6 backdrop-blur-md">
        {/* Shuffle Button */}
        <button
          type="button"
          onClick={handleToggleShuffle}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            shuffle ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle size={18} weight="bold" />
        </button>

        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrevious}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white transition-all cursor-pointer active:scale-95 border border-white/10"
          title="Previous Track"
        >
          <SkipBack size={20} weight="fill" />
        </button>

        {/* Big Play / Pause Button */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="w-14 h-14 rounded-3xl bg-linear-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xl shadow-purple-600/40 border border-purple-300/30"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" className="ml-0.5" />}
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white transition-all cursor-pointer active:scale-95 border border-white/10"
          title="Next Track"
        >
          <SkipForward size={20} weight="fill" />
        </button>

        {/* Repeat Button */}
        <button
          type="button"
          onClick={handleToggleRepeat}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            repeat !== 'off' ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40' : 'text-slate-400 hover:text-white'
          }`}
          title={`Repeat: ${repeat}`}
        >
          <Repeat size={18} weight="bold" />
        </button>
      </div>

      {/* Tactile Volume Control */}
      <div className="p-4.5 rounded-3xl bg-slate-800/30 border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <SpeakerSimpleSlash size={18} weight="bold" className="text-rose-400" />
              ) : volume > 50 ? (
                <SpeakerHigh size={18} weight="duotone" className="text-purple-400" />
              ) : (
                <SpeakerLow size={18} weight="duotone" className="text-purple-400" />
              )}
            </button>
            <span>Master Volume</span>
          </div>
          <span className="font-mono text-purple-400 font-extrabold text-sm">
            {isMuted ? 'MUTED' : `${volume}%`}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-700/60 rounded-full appearance-none cursor-pointer accent-purple-500 focus:outline-hidden"
        />
      </div>

      {/* Source Selector */}
      {sourceList.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Audio Input / Source</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {sourceList.map((src) => {
              const isSel = currentSource.toLowerCase() === String(src || '').toLowerCase();
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => handleSelectSource(src)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                    isSel
                      ? 'bg-purple-600 text-white shadow-md font-extrabold'
                      : 'bg-slate-800/30 hover:bg-slate-800/60 text-slate-300 border border-white/10'
                  }`}
                >
                  {src}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
