/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Music, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Volume1,
  Shuffle, 
  Repeat, 
  Radio, 
  Tv, 
  Sliders, 
  Disc, 
  ListMusic, 
  Sparkles, 
  Cast, 
  Heart, 
  Share2, 
  Layers, 
  Speaker,
  Check,
  RotateCcw
} from 'lucide-react';
import { HAEntity, Room } from '../types';

interface SpeakerZone {
  id: string;
  name: string;
  room: string;
  type: string;
  active: boolean;
  volume: number;
  muted: boolean;
  isMaster?: boolean;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number; // in seconds
  source: 'Spotify' | 'Apple Music' | 'Tidal' | 'Radio';
  format: string;
}

const PLAYLISTS: Track[] = [
  {
    id: 't1',
    title: 'After Hours (Lofi Ambient Cover)',
    artist: 'The Weekend Dreamer',
    album: 'Midnight Horizons EP',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
    duration: 218,
    source: 'Spotify',
    format: 'FLAC 24-bit / 96kHz'
  },
  {
    id: 't2',
    title: 'Solar Resonance in D Minor',
    artist: 'Aura Chill Collective',
    album: 'Sundown Sessions',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop',
    duration: 184,
    source: 'Tidal',
    format: 'Master MQA • Dolby Atmos'
  },
  {
    id: 't3',
    title: 'Warm Analog Tape Reflections',
    artist: 'Nordic Soundscapes',
    album: 'Fjord Reverie',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
    duration: 245,
    source: 'Apple Music',
    format: 'Lossless Hi-Res Audio'
  },
  {
    id: 't4',
    title: 'Chillhop Tokyo Rain Beats',
    artist: 'Shibuya Night Station',
    album: 'Metro Coffee Shop',
    artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    duration: 195,
    source: 'Spotify',
    format: 'Stereo 320kbps'
  }
];

interface MediaViewProps {
  entities: HAEntity[];
  rooms: Room[];
  onUpdateEntityState: (entityId: string, newState: string, newAttributes?: any) => void;
  darkMode: boolean;
}

export default function MediaView({
  entities,
  rooms,
  onUpdateEntityState,
  darkMode
}: MediaViewProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(64);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeSource, setActiveSource] = useState<'Spotify' | 'Apple Music' | 'Tidal' | 'Radio'>('Spotify');

  // Speaker zones
  const [speakerZones, setSpeakerZones] = useState<SpeakerZone[]>([
    { id: 'living_room', name: 'Living Room Sonos Arc', room: 'Living Room', type: 'Sonos Soundbar + Sub', active: true, volume: 42, muted: false, isMaster: true },
    { id: 'bedroom', name: 'Bedroom Apple HomePod', room: 'Bedroom', type: 'AirPlay 2 Stereo Pair', active: true, volume: 30, muted: false },
    { id: 'kitchen', name: 'Kitchen Echo Studio', room: 'Kitchen', type: 'Alexa Multi-room', active: false, volume: 25, muted: false },
    { id: 'patio', name: 'Patio JBL Link Outdoor', room: 'Patio & Garden', type: 'Cast Audio Zone', active: false, volume: 50, muted: false }
  ]);

  const [partyMode, setPartyMode] = useState(false);

  const currentTrack = PLAYLISTS[currentTrackIndex];

  // Simulated progress timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentTrack.duration) {
            handleNextTrack();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const handlePlayPauseToggle = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    onUpdateEntityState('media_player.living_room', nextPlay ? 'playing' : 'paused');
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex(prev => (prev + 1) % PLAYLISTS.length);
    setCurrentTime(0);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex(prev => (prev === 0 ? PLAYLISTS.length - 1 : prev - 1));
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const handleZoneVolumeChange = (zoneId: string, val: number) => {
    setSpeakerZones(prev => prev.map(z => z.id === zoneId ? { ...z, volume: val, muted: val === 0 } : z));
  };

  const handleZoneMuteToggle = (zoneId: string) => {
    setSpeakerZones(prev => prev.map(z => z.id === zoneId ? { ...z, muted: !z.muted } : z));
  };

  const handleZoneActiveToggle = (zoneId: string) => {
    setSpeakerZones(prev => prev.map(z => z.id === zoneId ? { ...z, active: !z.active } : z));
  };

  const handleTogglePartyMode = () => {
    const nextParty = !partyMode;
    setPartyMode(nextParty);
    if (nextParty) {
      setSpeakerZones(prev => prev.map(z => ({ ...z, active: true })));
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Music & Multi-Room Audio
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#7B61FF]/15 text-[#7B61FF] dark:text-[#9D8BFF] border border-[#7B61FF]/30">
              {speakerZones.filter(z => z.active).length} Zones Synced
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Lossless high-fidelity streaming, multi-room speaker zones, and playlist management
          </p>
        </div>

        {/* Source Selector & Party Mode Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`p-1 rounded-2xl flex items-center gap-1 border shadow-2xs backdrop-blur-md ${
            darkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100/90 border-slate-200/70'
          }`}>
            {(['Spotify', 'Apple Music', 'Tidal', 'Radio'] as const).map(src => (
              <button
                key={src}
                onClick={() => setActiveSource(src)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSource === src
                    ? 'bg-[#7B61FF] text-white shadow-xs'
                    : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {src}
              </button>
            ))}
          </div>

          <button
            onClick={handleTogglePartyMode}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-xs ${
              partyMode
                ? 'bg-gradient-to-r from-[#7B61FF] to-pink-500 text-white border-transparent shadow-md shadow-[#7B61FF]/30 scale-105'
                : darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sparkles size={14} className={partyMode ? 'animate-spin' : ''} />
            <span>{partyMode ? 'Party Mode Active' : 'Group All Zones'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Player Hero + Multi-Room Zones Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HERO NOW PLAYING CARD (Left/Top 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`rounded-3xl p-6 sm:p-8 border transition-all relative overflow-hidden shadow-sm ${
            darkMode ? 'bg-slate-900/80 border-white/[0.1] text-white backdrop-blur-md' : 'bg-white/80 border-black/[0.06] text-slate-800 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
          }`}>
            {/* Background Gradient Blob */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#7B61FF]/20 via-pink-500/10 to-transparent rounded-bl-full pointer-events-none blur-2xl" />

            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              {/* Vinyl Album Artwork with Rotation */}
              <div className="relative shrink-0">
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2 bg-slate-950 shadow-2xl shadow-black/50 border-4 border-slate-800 flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  {/* Center Spindle Hole */}
                  <div className="absolute w-8 h-8 bg-slate-950 rounded-full border-2 border-white/40 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  </div>
                </motion.div>
              </div>

              {/* Track Meta Details */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#7B61FF]/20 text-[#7B61FF] dark:text-[#9D8BFF] border border-[#7B61FF]/30">
                    {currentTrack.source}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {currentTrack.format}
                  </span>
                </div>

                <h3 className={`text-xl sm:text-2xl font-black tracking-tight truncate leading-tight ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  {currentTrack.title}
                </h3>
                <p className="text-sm font-semibold text-slate-400 truncate mt-0.5">
                  {currentTrack.artist} • {currentTrack.album}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isFavorite ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Speaker size={14} className="text-[#7B61FF]" />
                    <span>Living Room Sonos Arc</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrubber Slider & Timestamps */}
            <div className="mt-8 relative z-10">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>

              <input
                type="range"
                min="0"
                max={currentTrack.duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 accent-[#7B61FF] cursor-pointer"
              />
            </div>

            {/* Playback Controls Toolbar */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/80 relative z-10">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isShuffle ? 'text-[#7B61FF] bg-[#7B61FF]/10' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Shuffle"
              >
                <Shuffle size={18} />
              </button>

              <div className="flex items-center gap-3">
                {/* Prev */}
                <button
                  onClick={handlePrevTrack}
                  className={`p-3 rounded-2xl transition-all cursor-pointer ${
                    darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <SkipBack size={20} />
                </button>

                {/* Play / Pause Master */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayPauseToggle}
                  className="w-14 h-14 rounded-2xl bg-[#7B61FF] hover:bg-[#684be3] text-white flex items-center justify-center shadow-lg shadow-[#7B61FF]/40 cursor-pointer"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" fill="currentColor" />}
                </motion.button>

                {/* Next */}
                <button
                  onClick={handleNextTrack}
                  className={`p-3 rounded-2xl transition-all cursor-pointer ${
                    darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <SkipForward size={20} />
                </button>
              </div>

              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isRepeat ? 'text-[#7B61FF] bg-[#7B61FF]/10' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Repeat Playlist"
              >
                <Repeat size={18} />
              </button>
            </div>
          </div>

          {/* Quick Playlist Queue Selection */}
          <div className={`rounded-3xl p-5 border ${
            darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListMusic size={16} className="text-[#7B61FF]" />
                <h4 className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  Up Next in Queue
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-semibold">{PLAYLISTS.length} Tracks Loaded</span>
            </div>

            <div className="space-y-2">
              {PLAYLISTS.map((t, idx) => {
                const isCurrent = idx === currentTrackIndex;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setCurrentTime(0);
                      setIsPlaying(true);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#7B61FF]/15 border-[#7B61FF]/40 text-[#7B61FF] dark:text-white'
                        : darkMode
                          ? 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={t.artwork}
                        alt={t.title}
                        className="w-10 h-10 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">{t.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{t.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-slate-400">{formatTime(t.duration)}</span>
                      {isCurrent && isPlaying && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-3 bg-[#7B61FF] rounded-full animate-bounce" />
                          <span className="w-1 h-4 bg-[#7B61FF] rounded-full animate-bounce delay-75" />
                          <span className="w-1 h-2 bg-[#7B61FF] rounded-full animate-bounce delay-150" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MULTI-ROOM SPEAKER ZONES (Right 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Speaker size={18} className="text-[#7B61FF]" />
              <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Speaker Zones ({speakerZones.filter(z => z.active).length}/{speakerZones.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3.5">
            {speakerZones.map(zone => (
              <div
                key={zone.id}
                className={`rounded-2xl p-5 border transition-all ${
                  zone.active
                    ? darkMode
                      ? 'bg-slate-900/80 border-[#7B61FF]/40 shadow-xs'
                      : 'bg-white border-indigo-200 shadow-xs'
                    : darkMode
                      ? 'bg-slate-950/40 border-white/[0.05] opacity-60'
                      : 'bg-slate-100/70 border-black/[0.04] opacity-60'
                }`}
              >
                {/* Zone Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-black leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {zone.name}
                      </h4>
                      {zone.isMaster && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                          Master
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{zone.type}</p>
                  </div>

                  {/* Zone Active Toggle */}
                  <button
                    onClick={() => handleZoneActiveToggle(zone.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      zone.active
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {zone.active ? 'Active' : 'Standby'}
                  </button>
                </div>

                {/* Volume Level Control */}
                {zone.active && (
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Volume</span>
                      <span className="font-mono font-bold">{zone.muted ? '0%' : `${zone.volume}%`}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleZoneMuteToggle(zone.id)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          zone.muted ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {zone.muted || zone.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={zone.muted ? 0 : zone.volume}
                        onChange={(e) => handleZoneVolumeChange(zone.id, Number(e.target.value))}
                        className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 accent-[#7B61FF] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
