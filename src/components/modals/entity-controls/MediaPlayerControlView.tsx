import React, { useState, useEffect, useMemo } from 'react';
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
  Television,
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  House,
  ArrowUUpLeft,
  SlidersHorizontal,
  DotsThreeVertical
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useHAImage } from '../../../services/haImageService';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectMediaCapabilities,
  MediaCapabilities
} from '../../../services/mediaClassification';

interface MediaPlayerControlViewProps {
  entity: HAEntity;
}

export default function MediaPlayerControlView({ entity }: MediaPlayerControlViewProps) {
  const { callHAService, updateEntityState, serverUrl } = useAutoLayoutStore();

  const caps: MediaCapabilities = useMemo(() => {
    return detectMediaCapabilities(entity);
  }, [entity]);

  const [volume, setVolume] = useState<number>(caps.volumePct);
  const [shuffle, setShuffle] = useState<boolean>(caps.shuffle);
  const [repeat, setRepeat] = useState<string>(caps.repeat);

  useEffect(() => {
    setVolume(caps.volumePct);
    setShuffle(caps.shuffle);
    setRepeat(caps.repeat);
  }, [caps]);

  const { imageUrl: albumArtUrl } = useHAImage(caps.entityPicture, serverUrl);

  const handleTogglePower = () => {
    const nextState = caps.isOff ? 'idle' : 'off';
    updateEntityState(entity.entity_id, nextState);
    callHAService('media_player', caps.isOff ? 'turn_on' : 'turn_off', {}, { entity_id: entity.entity_id });
  };

  const handlePlayPause = () => {
    const nextState = caps.isPlaying ? 'paused' : 'playing';
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
    const nextMute = !caps.isMuted;
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

  // TV Remote Commands
  const sendRemoteCommand = (cmd: string) => {
    // Try media_player service or remote service
    if (cmd === 'play_pause') handlePlayPause();
    else if (cmd === 'volume_up') handleVolumeChange(Math.min(100, volume + 5));
    else if (cmd === 'volume_down') handleVolumeChange(Math.max(0, volume - 5));
    else if (cmd === 'mute') handleToggleMute();
    else {
      // Send as generic media or key command
      callHAService('remote', 'send_command', { command: cmd }, { entity_id: entity.entity_id });
    }
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* 1. SPEAKER / AUDIO STREAMER LAYOUT */}
      {/* ========================================================================= */}
      {!caps.isTv ? (
        <>
          {/* Master Media Hero Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
            {/* Dynamic ambient glow aura */}
            <div
              className={`absolute -inset-10 opacity-35 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
                caps.isPlaying ? 'bg-brand-purple/40' : 'bg-transparent'
              }`}
            />

            {/* Album Art or Vinyl Disc */}
            <div className="relative mb-4 group">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-2xl border border-white/20 relative flex items-center justify-center bg-slate-900 ${
                  caps.isPlaying ? 'ring-4 ring-purple-500/30' : ''
                }`}
              >
                {albumArtUrl ? (
                  <img
                    src={albumArtUrl}
                    alt={caps.mediaTitle || 'Album Art'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Disc
                      size={48}
                      weight="duotone"
                      className={caps.isPlaying ? 'text-purple-400 animate-spin' : ''}
                      style={{ animationDuration: '6s' }}
                    />
                  </div>
                )}
              </div>

              {/* Power Toggle Badge on corner */}
              <button
                type="button"
                onClick={handleTogglePower}
                className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg border ${
                  !caps.isOff
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'
                }`}
                title={caps.isOff ? 'Turn Speaker On' : 'Turn Speaker Off'}
              >
                <Power size={14} weight="bold" />
              </button>
            </div>

            {/* Track Info */}
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight line-clamp-1 max-w-[280px]">
              {caps.mediaTitle || (caps.isOff ? 'Speaker Off' : 'Ready to Stream')}
            </h3>
            <p className="text-xs text-purple-300 font-semibold mt-0.5 line-clamp-1">
              {caps.mediaArtist || caps.appName || (caps.isOff ? 'Standby' : 'AirPlay / Spotify')}
            </p>
            {caps.mediaAlbum && (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{caps.mediaAlbum}</p>
            )}

            {/* Transport Bar */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-5">
              <button
                type="button"
                onClick={handleToggleShuffle}
                className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  shuffle ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle size={16} weight="bold" />
              </button>

              <button
                type="button"
                onClick={handlePrevious}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                title="Previous Track"
              >
                <SkipBack size={18} weight="fill" />
              </button>

              {/* Master Play / Pause Button */}
              <button
                type="button"
                onClick={handlePlayPause}
                className="w-14 h-14 rounded-3xl bg-purple-500 hover:bg-purple-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/30"
                title={caps.isPlaying ? 'Pause' : 'Play'}
              >
                {caps.isPlaying ? (
                  <Pause size={24} weight="fill" />
                ) : (
                  <Play size={24} weight="fill" className="ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                title="Next Track"
              >
                <SkipForward size={18} weight="fill" />
              </button>

              <button
                type="button"
                onClick={handleToggleRepeat}
                className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  repeat !== 'off' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Repeat size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Volume Slider Card */}
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    caps.isMuted
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/10 text-slate-300 hover:text-white'
                  }`}
                  title={caps.isMuted ? 'Unmute' : 'Mute'}
                >
                  {caps.isMuted ? <SpeakerSimpleSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
                </button>
                <span className="text-xs font-bold text-slate-300">Volume</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">{caps.isMuted ? 'Muted' : `${volume}%`}</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />

            {/* Quick Volume Presets */}
            <div className="flex justify-between gap-1">
              {[20, 40, 60, 80, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleVolumeChange(v)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                    volume === v
                      ? 'bg-purple-500 text-white font-extrabold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* 2. TELEVISION / DISPLAY REMOTE CONTROLLER LAYOUT */
        /* ========================================================================= */
        <>
          {/* TV Master Screen Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
            {/* Dynamic ambient glow aura */}
            <div
              className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
                !caps.isOff ? 'bg-sky-500/40' : 'bg-transparent'
              }`}
            />

            {/* TV Screen Display Mock */}
            <div className="w-full max-w-[240px] aspect-video rounded-2xl bg-slate-950 border-2 border-slate-700 flex flex-col items-center justify-center p-3 relative shadow-2xl mb-4">
              <Television size={32} weight="duotone" className={!caps.isOff ? 'text-sky-400' : 'text-slate-600'} />
              <span className="text-xs font-bold text-white mt-1 truncate max-w-full">
                {!caps.isOff ? caps.currentSource || caps.appName || 'TV Active' : 'Powered Off'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {!caps.isOff ? `Vol ${volume}%` : 'Standby'}
              </span>
            </div>

            {/* Power Toggle Button */}
            <button
              type="button"
              onClick={handleTogglePower}
              className={`px-4 py-2 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-md ${
                !caps.isOff
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500 text-slate-950 font-black'
              }`}
            >
              <Power size={16} weight="bold" />
              <span>{!caps.isOff ? 'Turn Off TV' : 'Turn On TV'}</span>
            </button>
          </div>

          {/* Directional D-Pad Navigation */}
          <div className="p-5 rounded-3xl bg-slate-800/30 border border-white/10 flex flex-col items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-slate-900/80 border border-white/15 p-2 relative flex items-center justify-center shadow-inner">
              {/* Up */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('up')}
                className="absolute top-2 w-12 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                title="Up"
              >
                <CaretUp size={20} weight="bold" />
              </button>

              {/* Down */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('down')}
                className="absolute bottom-2 w-12 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                title="Down"
              >
                <CaretDown size={20} weight="bold" />
              </button>

              {/* Left */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('left')}
                className="absolute left-2 w-10 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                title="Left"
              >
                <CaretLeft size={20} weight="bold" />
              </button>

              {/* Right */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('right')}
                className="absolute right-2 w-10 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer active:scale-90"
                title="Right"
              >
                <CaretRight size={20} weight="bold" />
              </button>

              {/* Center OK / Select */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('select')}
                className="w-16 h-16 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 shadow-lg shadow-sky-500/30"
              >
                OK
              </button>
            </div>

            {/* TV Navigation Aux Bar */}
            <div className="flex items-center gap-4 mt-4">
              <button
                type="button"
                onClick={() => sendRemoteCommand('back')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-90"
              >
                <ArrowUUpLeft size={16} weight="bold" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handlePlayPause}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-90"
              >
                {caps.isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                <span>{caps.isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={() => sendRemoteCommand('home')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-90"
              >
                <House size={16} weight="bold" />
                <span>Home</span>
              </button>
            </div>
          </div>

          {/* TV Volume Bar */}
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  caps.isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-300'
                }`}
              >
                {caps.isMuted ? <SpeakerSimpleSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
              </button>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-300 block">TV Volume</span>
                <span className="text-[11px] font-mono text-slate-400">{caps.isMuted ? 'Muted' : `${volume}%`}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.max(0, volume - 5))}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold flex items-center justify-center cursor-pointer active:scale-90"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.min(100, volume + 5))}
                className="w-9 h-9 rounded-xl bg-sky-500 text-slate-950 font-bold flex items-center justify-center cursor-pointer active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. INPUT / SOURCE LIST (Strictly only if physical sourceList is provided) */}
      {/* ========================================================================= */}
      {caps.sourceList.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Input Source</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {caps.sourceList.map((src) => {
              const isSelected = caps.currentSource?.toLowerCase() === src.toLowerCase();
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => handleSelectSource(src)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-purple-500 text-white shadow-md scale-105 font-black'
                      : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10 text-slate-300'
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
