/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MusicNotes, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  SpeakerHigh, 
  SpeakerSlash, 
  Disc, 
  Radio, 
  Television, 
  SpeakerSimpleHigh,
  SlidersHorizontal,
  Airplay,
  Power
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { getHAImageUrl } from '../../../lib/utils';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { detectMediaPlayerType, MediaPlayerService, ClassifiedMediaPlayer } from '../../../services/mediaPlayerClassification';
import AppleRemoteControl from '../../media/AppleRemoteControl';
import CustomDropdown from '../../ui/CustomDropdown';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import AudioWaveformScrubber from '../../media/AudioWaveformScrubber';
import { useMediaPosition } from '../../../hooks/useMediaPosition';
import { useAlbumArtColor } from '../../../hooks/useAlbumArtColor';
import { useHAImage } from '../../../services/haImageService';
import { Stairs, HouseLine } from '@phosphor-icons/react';

interface MediaOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaPlayers: ResolvedEntity[];
  activeEntity?: ResolvedEntity;
  onUpdateEntity?: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function MediaOverviewDrawer({
  isOpen,
  onClose,
  mediaPlayers,
  activeEntity,
  darkMode = true
}: MediaOverviewDrawerProps) {
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);
  const devices = useAutoLayoutStore(s => s.devices);
  const floors = useAutoLayoutStore(s => s.floors);
  const areas = useAutoLayoutStore(s => s.areas);
  const resolvedEntities = useAutoLayoutStore(s => s.resolvedEntities);
  const callHAService = useAutoLayoutStore(s => s.callHAService);

  // Selected player ID - initialize once on open and do not override when user picks an idle/off player
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'playback' | 'remote'>('playback');

  useEffect(() => {
    if (isOpen) {
      if (activeEntity?.entity_id && !selectedId) {
        setSelectedId(activeEntity.entity_id);
      } else if (!selectedId && mediaPlayers.length > 0) {
        const firstPlaying = mediaPlayers.find(m => m.state === 'playing');
        setSelectedId(firstPlaying?.entity_id || mediaPlayers[0].entity_id);
      }
    }
  }, [isOpen, activeEntity]);

  // Always resolve latest state from store's resolvedEntities or mediaPlayers array
  const currentMedia: ResolvedEntity | undefined = 
    resolvedEntities[selectedId] ||
    mediaPlayers.find(m => m.entity_id === selectedId) ||
    activeEntity ||
    mediaPlayers[0];

  const isPlaying = currentMedia?.state === 'playing';

  // Device Classification
  const classification: ClassifiedMediaPlayer = currentMedia 
    ? detectMediaPlayerType(currentMedia, devices, Object.values(resolvedEntities))
    : {
        kind: 'generic',
        isApple: false,
        hasRemote: false,
        supportsVolume: true,
        supportsPlayPause: true,
        supportsNextPrev: true,
        supportsMute: true,
        supportsTurnOn: true,
        supportsTurnOff: true,
        supportsSource: false,
        supportsSoundMode: false,
        supportsGrouping: false,
        supportedFeatures: 0
      };

  const rawArt = currentMedia?.attributes?.media_image || currentMedia?.attributes?.entity_picture;
  const { imageUrl: albumArt } = useHAImage(rawArt, serverUrl);
  const title = currentMedia?.attributes?.media_title || (isPlaying ? 'Active Playback' : 'Idle / Stopped');
  const artist = currentMedia?.attributes?.media_artist || (currentMedia ? currentMedia.name : 'Unknown Artist');
  const album = currentMedia?.attributes?.media_album_name;
  const source = currentMedia?.attributes?.source || currentMedia?.attributes?.app_name;
  const sourceList: string[] = currentMedia?.attributes?.source_list || [];
  const soundModeList: string[] = currentMedia?.attributes?.sound_mode_list || [];
  const soundMode = currentMedia?.attributes?.sound_mode;

  // Extract dynamic accent palette from album art
  const palette = useAlbumArtColor(albumArt || null, {
    title,
    artist,
    darkMode
  });

  // Volume state
  const currentVol = typeof currentMedia?.attributes?.volume_level === 'number' 
    ? Math.round(currentMedia.attributes.volume_level * 100) 
    : 45;

  const [volume, setVolume] = useState<number>(currentVol);
  const isMuted = Boolean(currentMedia?.attributes?.is_volume_muted);

  useEffect(() => {
    if (currentMedia?.attributes?.volume_level !== undefined) {
      setVolume(Math.round(currentMedia.attributes.volume_level * 100));
    }
  }, [currentMedia?.attributes?.volume_level]);

  // ==========================================
  // PROGRESS BAR & REAL-TIME SEEK SCRUBBER (SYNCHRONIZED)
  // ==========================================
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekOverride, setSeekOverride] = useState<number | null>(null);

  const { currentPosition: playbackPos, duration: rawDuration } = useMediaPosition(
    currentMedia,
    isSeeking,
    seekOverride,
    isOpen
  );

  const handleSeekCommit = async (newSecs: number) => {
    setSeekOverride(newSecs);
    setIsSeeking(false);
    if (!currentMedia) return;
    await callHAService('media_player', 'media_seek', { seek_position: newSecs }, { entity_id: currentMedia.entity_id });
    // Clear seek override after a short debounce to allow HA to acknowledge
    setTimeout(() => {
      setSeekOverride(null);
    }, 800);
  };

  // Handle Playback Services
  const handlePlayPause = async () => {
    if (!currentMedia) return;
    await MediaPlayerService.playPause(currentMedia.entity_id);
  };

  const handleNext = async () => {
    if (!currentMedia) return;
    await MediaPlayerService.nextTrack(currentMedia.entity_id);
  };

  const handlePrev = async () => {
    if (!currentMedia) return;
    await MediaPlayerService.previousTrack(currentMedia.entity_id);
  };

  const handleVolumeChange = async (val: number) => {
    if (!currentMedia) return;
    setVolume(val);
    await MediaPlayerService.setVolume(currentMedia.entity_id, val);
  };

  const handleToggleMute = async () => {
    if (!currentMedia) return;
    await MediaPlayerService.setMute(currentMedia.entity_id, !isMuted);
  };

  const handleSourceSelect = async (src: string) => {
    if (!currentMedia) return;
    await MediaPlayerService.selectSource(currentMedia.entity_id, src);
  };

  const handleSoundModeSelect = async (mode: string) => {
    if (!currentMedia) return;
    await MediaPlayerService.selectSoundMode(currentMedia.entity_id, mode);
  };

  const handlePowerToggle = async () => {
    if (!currentMedia) return;
    await MediaPlayerService.togglePower(currentMedia.entity_id, classification.remoteEntityId);
  };

  // Helper Badge for Device Kind
  const renderDeviceKindBadge = (kind: string, isApple: boolean) => {
    if (kind === 'apple_tv') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
          <Television size={11} weight="duotone" /> Apple TV 4K
        </span>
      );
    }
    if (kind === 'homepod') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Radio size={11} weight="duotone" /> HomePod AirPlay
        </span>
      );
    }
    if (kind === 'sonos') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
          <SpeakerHigh size={11} weight="duotone" /> Sonos Arc Hi-Fi
        </span>
      );
    }
    if (kind === 'cast') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <Airplay size={11} weight="duotone" /> Google Cast
        </span>
      );
    }
    if (kind === 'smart_tv') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
          <Television size={11} weight="duotone" /> Smart TV
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10">
        Media Output
      </span>
    );
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Audio & Media Players"
      subtitle={`${mediaPlayers.filter(m => m.state === 'playing').length} of ${mediaPlayers.length} devices active`}
      icon={<MusicNotes size={22} weight="duotone" className="text-purple-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-5">
        {/* Device Selection Bar / Tab Navigation */}
        {currentMedia && classification.hasRemote && (
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('playback')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'playback'
                  ? 'text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              style={
                activeTab === 'playback'
                  ? { backgroundColor: palette.primary, color: '#ffffff' }
                  : undefined
              }
            >
              <MusicNotes size={14} weight="duotone" />
              <span>Now Playing</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('remote')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'remote'
                  ? 'bg-white text-slate-900 dark:bg-sky-500 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal size={14} weight="duotone" />
              <span>{classification.isApple ? 'Apple TV Remote' : 'Device Remote'}</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW A: NOW PLAYING / TRACK CONTROLS                           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'playback' && currentMedia && (
          <div className={`p-6 rounded-3xl border shadow-xl relative flex flex-col items-center text-center transition-all duration-300 ${
            darkMode
              ? 'bg-slate-900/80 border-purple-500/25'
              : 'bg-white/95 border-purple-200/80 shadow-slate-200/60'
          }`}>
            {/* Blurred Album Artwork covering the entire tile */}
            {albumArt ? (
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                <img
                  src={albumArt}
                  alt=""
                  className={`w-full h-full object-cover scale-110 blur-xl transition-opacity duration-700 ${
                    darkMode ? 'opacity-35' : 'opacity-20'
                  }`}
                />
                <div className={`absolute inset-0 backdrop-blur-xs ${
                  darkMode
                    ? 'bg-gradient-to-t from-black/90 via-black/60 to-black/35'
                    : 'bg-gradient-to-t from-white/95 via-white/80 to-white/60'
                }`} />
              </div>
            ) : (
              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                <div className={`absolute top-0 inset-x-0 h-32 blur-xl ${
                  darkMode ? 'bg-radial from-purple-500/20 to-transparent' : 'bg-radial from-purple-400/15 to-transparent'
                }`} />
              </div>
            )}

            {/* Top Device Header with Classification Badge & Power Toggle */}
            <div className="w-full flex items-center justify-between gap-2 mb-4 relative z-10">
              <div className="flex items-center gap-2">
                {renderDeviceKindBadge(classification.kind, classification.isApple)}
              </div>

              <button
                type="button"
                onClick={handlePowerToggle}
                className="w-8 h-8 rounded-xl bg-slate-100/80 hover:bg-rose-100 dark:bg-white/10 dark:hover:bg-rose-500/20 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200/80 dark:border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-2xs backdrop-blur-md"
                title="Toggle Device Power"
              >
                <Power size={14} weight="bold" />
              </button>
            </div>

            {/* Actual Unblurred Album Artwork */}
            <div className="relative w-44 h-44 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/20 dark:ring-white/10 mb-4 shrink-0 z-10 group">
              {albumArt ? (
                <img
                  src={albumArt}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-950 flex items-center justify-center text-purple-300">
                  <MusicNotes size={56} weight="duotone" />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="w-full max-w-sm mb-2 relative z-10">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{title}</h3>
              <p
                className="text-xs font-semibold truncate mt-0.5 transition-colors duration-300"
                style={{ color: darkMode ? palette.light : palette.primary }}
              >
                {artist}
              </p>
              {album && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{album}</p>}
            </div>

            {/* REAL AUDIO WAVEFORM SCRUBBER (DYNAMIC ARTWORK ACCENT COLOR) */}
            <div className="w-full max-w-xs z-10">
              <AudioWaveformScrubber
                title={title}
                artist={artist}
                duration={rawDuration}
                currentPosition={playbackPos}
                isPlaying={isPlaying}
                onSeek={handleSeekCommit}
                palette={palette}
                darkMode={darkMode}
                barCount={44}
              />
            </div>

            {/* Playback Controls (Live HA WebSocket Service Calls) */}
            <div className="flex items-center justify-center gap-4 my-2 relative z-10">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!classification.supportsNextPrev}
                className="w-11 h-11 rounded-2xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs backdrop-blur-md"
                title="Previous Track"
              >
                <SkipBack size={18} weight="fill" />
              </button>

              <button
                type="button"
                onClick={handlePlayPause}
                className="w-14 h-14 rounded-3xl text-white flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 hover:scale-105"
                style={{
                  backgroundColor: palette.primary,
                  boxShadow: `0 12px 28px -4px ${palette.glow}`,
                }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!classification.supportsNextPrev}
                className="w-11 h-11 rounded-2xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs backdrop-blur-md"
                title="Next Track"
              >
                <SkipForward size={18} weight="fill" />
              </button>
            </div>

            {/* Volume Slider (Live HA volume_set) */}
            {classification.supportsVolume && (
              <div className="w-full max-w-xs flex items-center gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2 relative z-10">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <SpeakerSlash size={18} weight="duotone" className="text-rose-500" />
                  ) : (
                    <SpeakerHigh size={18} weight="duotone" style={{ color: palette.primary }} />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  style={{ accentColor: palette.primary }}
                  className="w-full h-1.5 rounded-lg appearance-none bg-slate-300 dark:bg-white/20 cursor-pointer"
                />

                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-8 text-right shrink-0 font-mono">
                  {isMuted ? '0%' : `${volume}%`}
                </span>
              </div>
            )}

            {/* Modern Custom Dropdowns for Source & Sound Mode */}
            {(sourceList.length > 0 || soundModeList.length > 0) && (
              <div className="w-full max-w-xs grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-3 text-left relative z-10">
                {sourceList.length > 0 && (
                  <div>
                    <CustomDropdown
                      label="Source Input"
                      value={source || sourceList[0]}
                      onChange={handleSourceSelect}
                      options={sourceList}
                      size="sm"
                      placement="top"
                    />
                  </div>
                )}

                {soundModeList.length > 0 && (
                  <div>
                    <CustomDropdown
                      label="Sound Mode"
                      value={soundMode || soundModeList[0]}
                      onChange={handleSoundModeSelect}
                      options={soundModeList}
                      size="sm"
                      placement="top"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW B: APPLE REMOTE D-PAD / TV REMOTE                        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'remote' && currentMedia && (
          <div className="space-y-4">
            <AppleRemoteControl
              entity={currentMedia}
              remoteEntityId={classification.remoteEntityId}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ALL CONNECTED MEDIA OUTPUT DEVICES LIST (GROUPED BY FLOOR & AREA) */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Available Media Players ({mediaPlayers.length})
          </div>

          {(() => {
            const grouped = groupEntitiesByFloorAndArea(mediaPlayers, floors, areas);
            return (
              <div className="space-y-6">
                {grouped.groups.map((floorGroup) => (
                  <div key={floorGroup.floorId || 'no-floor'} className="space-y-3">
                    {/* Floor Header */}
                    {grouped.hasFloors && (
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                        <div 
                          className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                          style={{
                            backgroundColor: `${floorGroup.color || '#a855f7'}1a`,
                            borderColor: `${floorGroup.color || '#a855f7'}40`,
                            color: floorGroup.color || '#a855f7'
                          }}
                        >
                          <DynamicPhosphorIcon 
                            name={floorGroup.icon} 
                            fallback={Stairs} 
                            size={15} 
                            weight="duotone" 
                            style={{ color: floorGroup.color || '#a855f7' }}
                          />
                        </div>
                        <h4 
                          className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
                          style={{ color: floorGroup.color || undefined }}
                        >
                          {floorGroup.floorName}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          ({floorGroup.areaGroups.reduce((acc, a) => acc + a.entities.length, 0)})
                        </span>
                      </div>
                    )}

                    {/* Area Groups */}
                    <div className="space-y-3">
                      {floorGroup.areaGroups.map((areaGroup) => (
                        <div key={areaGroup.areaId || 'no-area'} className="space-y-2">
                          {/* Area Header */}
                          {(grouped.hasAreas || grouped.hasFloors) && (
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-5 h-5 rounded-lg flex items-center justify-center border shrink-0"
                                  style={{
                                    backgroundColor: `${areaGroup.color || '#a855f7'}1a`,
                                    borderColor: `${areaGroup.color || '#a855f7'}40`,
                                    color: areaGroup.color || '#a855f7'
                                  }}
                                >
                                  <DynamicPhosphorIcon 
                                    name={areaGroup.icon} 
                                    fallback={HouseLine} 
                                    size={12} 
                                    weight="duotone" 
                                    style={{ color: areaGroup.color || '#a855f7' }}
                                  />
                                </div>
                                <span 
                                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                                  style={{ color: areaGroup.color || undefined }}
                                >
                                  {areaGroup.areaName}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                {areaGroup.entities.filter(e => e.state === 'playing').length}/{areaGroup.entities.length} playing
                              </span>
                            </div>
                          )}

                          {/* Players in Area */}
                          <div className="space-y-2">
                            {areaGroup.entities.map((player) => {
                              const isSel = player.entity_id === (currentMedia?.entity_id || selectedId);
                              const isPlayingThis = player.state === 'playing';
                              const roomName = player.area?.name || 'Home';
                              const playerArt = getHAImageUrl(player.attributes?.media_image || player.attributes?.entity_picture, serverUrl);
                              const playerClass = detectMediaPlayerType(player, devices, Object.values(resolvedEntities));

                              return (
                                <div
                                  key={player.entity_id}
                                  onClick={() => setSelectedId(player.entity_id)}
                                  className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                                    isSel
                                      ? 'bg-purple-500/15 border-purple-500/50 shadow-md ring-1 ring-purple-500/40'
                                      : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-100 dark:bg-purple-950/60 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                      {playerArt ? (
                                        <img src={playerArt} alt={player.name} className="w-full h-full object-cover" />
                                      ) : playerClass.isApple ? (
                                        <Television size={20} weight="duotone" className="text-sky-500 dark:text-sky-300" />
                                      ) : player.attributes?.device_class === 'tv' ? (
                                        <Television size={20} weight="duotone" className="text-purple-500 dark:text-purple-300" />
                                      ) : (
                                        <SpeakerSimpleHigh size={20} weight="duotone" className="text-purple-500 dark:text-purple-300" />
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{player.name}</h4>
                                      </div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {isPlayingThis ? (
                                          <span className="text-purple-600 dark:text-purple-300 font-semibold truncate">
                                            ▶ {player.attributes?.media_title || 'Playing'}
                                          </span>
                                        ) : (
                                          <span>{roomName} • {player.state}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-2">
                                    {renderDeviceKindBadge(playerClass.kind, playerClass.isApple)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
