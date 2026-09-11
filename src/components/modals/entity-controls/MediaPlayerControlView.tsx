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
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
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
  darkMode?: boolean;
  customIcon?: string | null;
}

import TouchCapsuleSlider from '../../ui/TouchCapsuleSlider';

export default function MediaPlayerControlView({
  entity,
  darkMode = true,
  customIcon
}: MediaPlayerControlViewProps) {
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

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const isTv = caps.isTv;
  const isPlaying = caps.isPlaying;

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW (Health Section Header Pattern)                         */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl backdrop-blur-xl flex items-center justify-between transition-all ${bentoStaticCardStyle}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
            style={{
              backgroundColor: !caps.isOff
                ? isTv
                  ? 'rgba(14, 165, 233, 0.15)'
                  : 'rgba(168, 85, 247, 0.15)'
                : 'rgba(100, 116, 139, 0.12)',
              borderColor: !caps.isOff
                ? isTv
                  ? 'rgba(14, 165, 233, 0.35)'
                  : 'rgba(168, 85, 247, 0.35)'
                : 'rgba(100, 116, 139, 0.25)',
              color: !caps.isOff ? (isTv ? '#0ea5e9' : '#a855f7') : '#94a3b8'
            }}
          >
            {customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight="duotone" />
            ) : isTv ? (
              <Television size={18} weight="duotone" />
            ) : (
              <MusicNotes size={18} weight="duotone" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || (isTv ? 'TELEVISION & VIDEO' : 'AUDIO & MEDIA')}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || (isTv ? 'Smart TV' : 'Media Player')}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Master Power Button */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isPlaying
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                : !caps.isOff
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying
                  ? 'bg-purple-500 animate-pulse'
                  : !caps.isOff
                  ? 'bg-sky-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>{isPlaying ? 'Playing' : !caps.isOff ? 'Idle' : 'Off'}</span>
          </div>

          <button
            type="button"
            onClick={handleTogglePower}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
              !caps.isOff
                ? 'bg-purple-500 text-white border-purple-400 shadow-xs'
                : darkMode
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-xs'
            }`}
            aria-label={caps.isOff ? 'Turn Player On' : 'Turn Player Off'}
          >
            <Power size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPEAKER / AUDIO STREAMER LAYOUT                                        */}
      {/* ========================================================================= */}
      {!caps.isTv ? (
        <>
          {/* Master Media Hero Card */}
          <div
            className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
          >
            {/* Subtle Ambient Glow Aura */}
            <div
              className={`absolute -inset-10 opacity-20 blur-3xl rounded-full transition-all duration-700 pointer-events-none ${
                isPlaying ? 'bg-purple-500/35' : 'bg-transparent'
              }`}
            />

            {/* Album Art or Vinyl Disc */}
            <div className="relative mb-3 group">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-[4px_6px_12px_rgba(0,0,0,0.15)] relative flex items-center justify-center border ${
                  darkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-slate-200/60'
                } ${isPlaying ? 'ring-4 ring-purple-500/30' : ''}`}
              >
                {albumArtUrl ? (
                  <img
                    src={albumArtUrl}
                    alt={caps.mediaTitle || 'Album Art'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Disc
                      size={48}
                      weight="duotone"
                      className={isPlaying ? 'text-purple-500 animate-spin' : ''}
                      style={{ animationDuration: '6s' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info (Health Typography) */}
            <h3 className="text-lg sm:text-xl font-black tracking-tight line-clamp-1 max-w-[280px] text-slate-900 dark:text-white">
              {caps.mediaTitle || (caps.isOff ? 'Speaker Off' : 'Ready to Stream')}
            </h3>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5 line-clamp-1">
              {caps.mediaArtist || caps.appName || (caps.isOff ? 'Standby' : 'AirPlay / Spotify')}
            </p>
            {caps.mediaAlbum && (
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                {caps.mediaAlbum}
              </p>
            )}

            {/* Transport Bar in Health Sub-well */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-5">
              <button
                type="button"
                onClick={handleToggleShuffle}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer active:scale-90 border ${
                  shuffle
                    ? 'bg-purple-500 text-white font-black border-purple-400 shadow-xs'
                    : darkMode
                    ? 'bg-black/20 text-slate-400 hover:text-white border-white/5'
                    : 'bg-white/40 text-slate-600 hover:text-slate-900 border-slate-200/50'
                }`}
                title="Shuffle"
              >
                <Shuffle size={16} weight="bold" />
              </button>

              <button
                type="button"
                onClick={handlePrevious}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border ${
                  darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                    : 'bg-white/40 hover:bg-white/60 text-slate-800 border-slate-200/50 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                }`}
                title="Previous Track"
              >
                <SkipBack size={18} weight="fill" />
              </button>

              {/* Master Play / Pause Button */}
              <button
                type="button"
                onClick={handlePlayPause}
                className="w-14 h-14 rounded-3xl bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-[4px_6px_12px_rgba(168,85,247,0.35)]"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={24} weight="fill" />
                ) : (
                  <Play size={24} weight="fill" className="ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border ${
                  darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                    : 'bg-white/40 hover:bg-white/60 text-slate-800 border-slate-200/50 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                }`}
                title="Next Track"
              >
                <SkipForward size={18} weight="fill" />
              </button>

              <button
                type="button"
                onClick={handleToggleRepeat}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer active:scale-90 border ${
                  repeat !== 'off'
                    ? 'bg-purple-500 text-white font-black border-purple-400 shadow-xs'
                    : darkMode
                    ? 'bg-black/20 text-slate-400 hover:text-white border-white/5'
                    : 'bg-white/40 text-slate-600 hover:text-slate-900 border-slate-200/50'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Repeat size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Volume Slider Bento Card */}
          <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
                    caps.isMuted
                      ? 'bg-rose-500 text-white border-rose-400 shadow-xs'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5'
                      : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
                  }`}
                  title={caps.isMuted ? 'Unmute' : 'Mute'}
                >
                  {caps.isMuted ? <SpeakerSimpleSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Speaker Volume
                </span>
              </div>
              <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400">
                {caps.isMuted ? 'Muted' : `${volume}%`}
              </span>
            </div>

            <TouchCapsuleSlider
              value={volume}
              min={0}
              max={100}
              onChange={handleVolumeChange}
              icon={<SpeakerHigh size={20} weight="fill" />}
              label="Volume Level"
              fillColor="#a855f7"
              fillGradient="linear-gradient(to right, #a855f7, #ec4899)"
              glowColor="rgba(168, 85, 247, 0.25)"
              darkMode={darkMode}
              heightClass="h-14 sm:h-15"
            />

            {/* Quick Volume Presets */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {[20, 40, 60, 80, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleVolumeChange(v)}
                  className={`h-10 rounded-2xl text-xs font-mono font-black transition-all cursor-pointer active:scale-95 text-center border ${
                    volume === v
                      ? 'bg-purple-500 text-white shadow-[4px_6px_12px_rgba(168,85,247,0.25)] border-purple-400'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                      : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
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
        /* 3. TELEVISION / DISPLAY REMOTE CONTROLLER LAYOUT                          */
        /* ========================================================================= */
        <>
          {/* TV Master Screen Card */}
          <div
            className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
          >
            {/* Subtle Ambient Glow Aura */}
            <div
              className={`absolute -inset-10 opacity-20 blur-3xl rounded-full transition-all duration-700 pointer-events-none ${
                !caps.isOff ? 'bg-sky-500/30' : 'bg-transparent'
              }`}
            />

            {/* TV Screen Display Mock */}
            <div
              className={`w-full max-w-[240px] aspect-video rounded-3xl border flex flex-col items-center justify-center p-3 relative shadow-[4px_6px_12px_rgba(0,0,0,0.15)] mb-3 ${
                darkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-slate-200/60'
              }`}
            >
              <Television size={32} weight="duotone" className={!caps.isOff ? 'text-sky-400' : 'text-slate-400'} />
              <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate max-w-full">
                {!caps.isOff ? caps.currentSource || caps.appName || 'TV Active' : 'Powered Off'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                {!caps.isOff ? `Vol ${volume}%` : 'Standby'}
              </span>
            </div>

            {/* Power Toggle Button */}
            <button
              type="button"
              onClick={handleTogglePower}
              className={`h-11 px-6 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-black shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border ${
                !caps.isOff
                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-[4px_6px_12px_rgba(16,185,129,0.25)]'
              }`}
            >
              <Power size={16} weight="bold" />
              <span>{!caps.isOff ? 'Turn Off TV' : 'Turn On TV'}</span>
            </button>
          </div>

          {/* Directional D-Pad Navigation */}
          <div
            className={`p-6 rounded-3xl flex flex-col items-center justify-center transition-all ${bentoStaticCardStyle}`}
          >
            <div
              className={`w-48 h-48 rounded-full border p-2 relative flex items-center justify-center ${
                darkMode ? 'bg-black/30 border-white/10' : 'bg-white/40 border-slate-200/60 shadow-inner'
              }`}
            >
              {/* Up */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('up')}
                className={`absolute top-2 w-12 h-10 rounded-2xl flex items-center justify-center cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-white border-white/5' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50 shadow-xs'
                }`}
                title="Up"
              >
                <CaretUp size={20} weight="bold" />
              </button>

              {/* Down */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('down')}
                className={`absolute bottom-2 w-12 h-10 rounded-2xl flex items-center justify-center cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-white border-white/5' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50 shadow-xs'
                }`}
                title="Down"
              >
                <CaretDown size={20} weight="bold" />
              </button>

              {/* Left */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('left')}
                className={`absolute left-2 w-10 h-12 rounded-2xl flex items-center justify-center cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-white border-white/5' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50 shadow-xs'
                }`}
                title="Left"
              >
                <CaretLeft size={20} weight="bold" />
              </button>

              {/* Right */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('right')}
                className={`absolute right-2 w-10 h-12 rounded-2xl flex items-center justify-center cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-white border-white/5' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50 shadow-xs'
                }`}
                title="Right"
              >
                <CaretRight size={20} weight="bold" />
              </button>

              {/* Center OK / Select */}
              <button
                type="button"
                onClick={() => sendRemoteCommand('select')}
                className="w-16 h-16 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(14,165,233,0.3)] hover:bg-sky-400 transition-transform"
              >
                OK
              </button>
            </div>

            {/* TV Navigation Aux Bar */}
            <div className="flex items-center gap-3 sm:gap-4 mt-5">
              <button
                type="button"
                onClick={() => sendRemoteCommand('back')}
                className={`h-10 px-4 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5' : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
                }`}
              >
                <ArrowUUpLeft size={16} weight="bold" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handlePlayPause}
                className={`h-10 px-4 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5' : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
                }`}
              >
                {caps.isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                <span>{caps.isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={() => sendRemoteCommand('home')}
                className={`h-10 px-4 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5' : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
                }`}
              >
                <House size={16} weight="bold" />
                <span>Home</span>
              </button>
            </div>
          </div>

          {/* TV Volume Bar */}
          <div
            className={`p-4 sm:p-5 rounded-3xl flex items-center justify-between gap-3 transition-all ${bentoStaticCardStyle}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
                  caps.isMuted
                    ? 'bg-rose-500 text-white border-rose-400'
                    : darkMode
                    ? 'bg-black/20 text-slate-300 border-white/5'
                    : 'bg-white/40 text-slate-700 border-slate-200/50'
                }`}
              >
                {caps.isMuted ? <SpeakerSimpleSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
              </button>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  TV Volume
                </span>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {caps.isMuted ? 'Muted' : `${volume}%`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.max(0, volume - 5))}
                className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center cursor-pointer active:scale-90 border ${
                  darkMode ? 'bg-black/20 hover:bg-black/30 text-white border-white/5' : 'bg-white/40 hover:bg-white/60 text-slate-800 border-slate-200/50'
                }`}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleVolumeChange(Math.min(100, volume + 5))}
                className="w-10 h-10 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black flex items-center justify-center cursor-pointer active:scale-90 shadow-[4px_6px_12px_rgba(14,165,233,0.25)]"
              >
                +
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. INPUT / SOURCE LIST (Strictly only if physical sourceList is provided) */}
      {/* ========================================================================= */}
      {caps.sourceList.length > 0 && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Input Source
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400">
              {caps.sourceList.length} sources
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {caps.sourceList.map((src) => {
              const isSelected = caps.currentSource?.toLowerCase() === src.toLowerCase();
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => handleSelectSource(src)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                    isSelected
                      ? 'bg-purple-500 text-white shadow-[4px_6px_12px_rgba(168,85,247,0.25)] font-black border-purple-400'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700'
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
