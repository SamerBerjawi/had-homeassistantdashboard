/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  SpeakerHigh, 
  SpeakerSlash, 
  MusicNotes, 
  Disc, 
  SlidersHorizontal,
  Power
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';
import { detectMediaPlayerType, MediaPlayerService } from '../../../services/mediaPlayerClassification';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { getHAImageUrl } from '../../../lib/utils';
import AppleRemoteControl from '../../media/AppleRemoteControl';
import CustomDropdown from '../../ui/CustomDropdown';
import AudioWaveformScrubber from '../../media/AudioWaveformScrubber';
import { useMediaPosition } from '../../../hooks/useMediaPosition';

interface MediaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity?: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function MediaDetailModal({
  isOpen,
  onClose,
  entity
}: MediaDetailModalProps) {
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);
  const devices = useAutoLayoutStore(s => s.devices);
  const resolvedEntities = useAutoLayoutStore(s => s.resolvedEntities);
  const callHAService = useAutoLayoutStore(s => s.callHAService);

  const classification = detectMediaPlayerType(entity, devices, Object.values(resolvedEntities));
  const isPlaying = entity.state === 'playing';
  const friendlyName = entity.attributes?.friendly_name || entity.entity_id;
  const title = entity.attributes?.media_title || (isPlaying ? 'Active Media Playback' : 'Idle / Off');
  const artist = entity.attributes?.media_artist || friendlyName;
  const album = entity.attributes?.media_album_name;
  const source = entity.attributes?.source || entity.attributes?.app_name;
  const sourceList: string[] = entity.attributes?.source_list || [];
  const soundModeList: string[] = entity.attributes?.sound_mode_list || [];
  const soundMode = entity.attributes?.sound_mode;

  const currentVol = typeof entity.attributes?.volume_level === 'number'
    ? Math.round(entity.attributes.volume_level * 100)
    : 45;

  const [volume, setVolume] = useState<number>(currentVol);
  const [activeTab, setActiveTab] = useState<'playback' | 'remote'>('playback');
  const isMuted = Boolean(entity.attributes?.is_volume_muted);

  const rawArt = entity.attributes?.media_image || entity.attributes?.entity_picture;
  const albumArt = getHAImageUrl(rawArt, serverUrl) || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop';

  useEffect(() => {
    if (entity.attributes?.volume_level !== undefined) {
      setVolume(Math.round(entity.attributes.volume_level * 100));
    }
  }, [entity.attributes?.volume_level]);

  // ==========================================
  // PROGRESS BAR & REAL-TIME SEEK SCRUBBER (SYNCHRONIZED)
  // ==========================================
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekOverride, setSeekOverride] = useState<number | null>(null);

  const { currentPosition: playbackPos, duration: rawDuration } = useMediaPosition(
    entity,
    isSeeking,
    seekOverride
  );

  const handleSeekCommit = async (newSecs: number) => {
    setSeekOverride(newSecs);
    setIsSeeking(false);
    await callHAService('media_player', 'media_seek', { seek_position: newSecs }, { entity_id: entity.entity_id });
    setTimeout(() => {
      setSeekOverride(null);
    }, 800);
  };

  const handlePlayPause = async () => {
    await MediaPlayerService.playPause(entity.entity_id);
  };

  const handleNext = async () => {
    await MediaPlayerService.nextTrack(entity.entity_id);
  };

  const handlePrev = async () => {
    await MediaPlayerService.previousTrack(entity.entity_id);
  };

  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    await MediaPlayerService.setVolume(entity.entity_id, val);
  };

  const handleToggleMute = async () => {
    await MediaPlayerService.setMute(entity.entity_id, !isMuted);
  };

  const handleSourceSelect = async (src: string) => {
    await MediaPlayerService.selectSource(entity.entity_id, src);
  };

  const handleSoundModeSelect = async (mode: string) => {
    await MediaPlayerService.selectSoundMode(entity.entity_id, mode);
  };

  const handlePowerToggle = async () => {
    await MediaPlayerService.togglePower(entity.entity_id, classification.remoteEntityId);
  };

  const getSubtitle = () => {
    if (classification.kind === 'apple_tv') return 'Apple TV 4K • tvOS Media';
    if (classification.kind === 'homepod') return 'Apple HomePod • AirPlay 2';
    if (classification.kind === 'sonos') return 'Sonos Arc • Hi-Fi Audio';
    if (classification.kind === 'cast') return 'Google Cast • Streaming Device';
    if (classification.kind === 'smart_tv') return 'Smart TV • HDMI & Apps';
    return 'Hi-Fi Audio Output';
  };

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={friendlyName}
      subtitle={getSubtitle()}
      icon={<MusicNotes size={22} weight="duotone" className="text-pink-400" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-5 relative">
        {/* Navigation Tabs if Remote Supported */}
        {classification.hasRemote && (
          <div className="p-1 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('playback')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'playback'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MusicNotes size={14} weight="duotone" />
              <span>Now Playing</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('remote')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'remote'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={14} weight="duotone" />
              <span>{classification.isApple ? 'Siri Remote' : 'TV Remote'}</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PLAYBACK TAB                                                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'playback' && (
          <>
            {/* Unified Media Player Tile with Full-Cover Blurred Backdrop */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-black/40 border border-white/15 relative overflow-hidden space-y-4">
              {/* Blurred Album Backdrop covering the entire tile */}
              {albumArt && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                  <img
                    src={albumArt}
                    alt=""
                    className="w-full h-full object-cover scale-110 blur-2xl opacity-40 mix-blend-screen transition-opacity duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/35 backdrop-blur-xs" />
                </div>
              )}

              {/* Top Bar: State Badge & Power Button */}
              <div className="w-full flex items-center justify-between gap-2 relative z-10">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  {entity.state}
                </span>

                <button
                  type="button"
                  onClick={handlePowerToggle}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                  title="Toggle Power"
                >
                  <Power size={13} weight="bold" />
                </button>
              </div>

              {/* Actual Unblurred Album Artwork */}
              <div className="relative w-44 h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-10 group">
                <img src={albumArt} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>

              {/* Track Metadata */}
              <div className="text-center max-w-sm relative z-10">
                <h4 className="text-base font-extrabold text-white tracking-tight truncate">{title}</h4>
                <p className="text-xs text-pink-300 font-semibold mt-0.5 truncate">{artist}</p>
                {album && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{album}</p>}
              </div>

              {/* Real Audio Waveform Scrubber */}
              <div className="w-full max-w-xs relative z-10">
                <AudioWaveformScrubber
                  title={title}
                  artist={artist}
                  duration={rawDuration}
                  currentPosition={playbackPos}
                  isPlaying={isPlaying}
                  onSeek={handleSeekCommit}
                  accentColor="pink"
                  darkMode={true}
                  barCount={44}
                />
              </div>

              {/* Master Playback Controls */}
              <div className="flex items-center justify-center gap-4 relative z-10 py-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!classification.supportsNextPrev}
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
                  title="Previous Track"
                >
                  <SkipBack size={18} weight="duotone" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="w-15 h-15 rounded-3xl bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center transition-all cursor-pointer shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={26} weight="fill" /> : <Play size={26} weight="fill" className="ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!classification.supportsNextPrev}
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-md"
                  title="Next Track"
                >
                  <SkipForward size={18} weight="duotone" />
                </button>
              </div>

              {/* Volume Slider with Mute Toggle */}
              {classification.supportsVolume && (
                <div className="w-full max-w-xs flex items-center gap-3 pt-3 border-t border-white/10 relative z-10">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <SpeakerSlash size={18} weight="duotone" className="text-rose-400" /> : <SpeakerHigh size={18} weight="duotone" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-xs font-mono font-bold text-white min-w-8 text-right">
                    {isMuted ? '0%' : `${volume}%`}
                  </span>
                </div>
              )}

              {/* Modern Custom Dropdowns for Source & Sound Mode */}
              {(sourceList.length > 0 || soundModeList.length > 0) && (
                <div className="w-full max-w-xs grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10 text-left relative z-10">
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
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REMOTE TAB                                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'remote' && (
          <AppleRemoteControl
            entity={entity}
            remoteEntityId={classification.remoteEntityId}
            darkMode={true}
          />
        )}
      </div>
    </CardModalContainer>
  );
}
