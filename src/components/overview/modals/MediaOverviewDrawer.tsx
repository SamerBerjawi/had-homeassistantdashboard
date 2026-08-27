import React, { useState } from 'react';
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
  SpeakerSimpleHigh
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { getHAImageUrl } from '../../../lib/utils';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface MediaOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaPlayers: ResolvedEntity[];
  activeEntity?: ResolvedEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function MediaOverviewDrawer({
  isOpen,
  onClose,
  mediaPlayers,
  activeEntity,
  onUpdateEntity
}: MediaOverviewDrawerProps) {
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);
  const [selectedId, setSelectedId] = useState<string>(activeEntity?.entity_id || mediaPlayers[0]?.entity_id || '');

  const currentMedia = mediaPlayers.find(m => m.entity_id === selectedId) || activeEntity || mediaPlayers[0];
  const isPlaying = currentMedia?.state === 'playing';

  const rawArt = currentMedia?.attributes?.media_image || currentMedia?.attributes?.entity_picture;
  const albumArt = getHAImageUrl(rawArt, serverUrl);
  const title = currentMedia?.attributes?.media_title || (isPlaying ? 'Active Playback' : 'Idle / Stopped');
  const artist = currentMedia?.attributes?.media_artist || (currentMedia ? currentMedia.name : 'Unknown Artist');
  const album = currentMedia?.attributes?.media_album_name;
  const source = currentMedia?.attributes?.source || currentMedia?.attributes?.app_name;

  const currentVol = typeof currentMedia?.attributes?.volume_level === 'number' 
    ? Math.round(currentMedia.attributes.volume_level * 100) 
    : 45;

  const [volume, setVolume] = useState<number>(currentVol);
  const [isMuted, setIsMuted] = useState<boolean>(Boolean(currentMedia?.attributes?.is_volume_muted));

  React.useEffect(() => {
    if (currentMedia?.attributes?.volume_level !== undefined) {
      setVolume(Math.round(currentMedia.attributes.volume_level * 100));
    }
  }, [currentMedia]);

  const handlePlayPause = () => {
    if (!currentMedia) return;
    const nextState = isPlaying ? 'paused' : 'playing';
    onUpdateEntity(currentMedia.entity_id, nextState);
  };

  const handleVolumeChange = (val: number) => {
    if (!currentMedia) return;
    setVolume(val);
    onUpdateEntity(currentMedia.entity_id, currentMedia.state, {
      volume_level: val / 100
    });
  };

  const handleToggleMute = () => {
    if (!currentMedia) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    onUpdateEntity(currentMedia.entity_id, currentMedia.state, {
      is_volume_muted: nextMute
    });
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Audio & Media Players"
      subtitle={`${mediaPlayers.filter(m => m.state === 'playing').length} of ${mediaPlayers.length} devices active`}
      icon={<MusicNotes size={22} weight="duotone" className="text-purple-400" />}
    >
      <div className="space-y-6">
        {/* Main Currently Playing Hero Card */}
        {currentMedia && (
          <div className="p-6 rounded-3xl bg-linear-to-b from-purple-950/40 via-slate-900/80 to-black/80 border border-purple-500/25 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
            {/* Ambient Backlight */}
            <div className="absolute top-0 inset-x-0 h-32 bg-radial from-purple-500/20 to-transparent blur-2xl pointer-events-none" />

            {/* Album Artwork with Spinning Vinyl Graphic */}
            <div className="relative w-48 h-48 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/15 mb-5 shrink-0">
              {albumArt ? (
                <img
                  src={albumArt}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-purple-900 to-indigo-950 flex items-center justify-center text-purple-300">
                  <MusicNotes size={64} weight="duotone" />
                </div>
              )}

              {isPlaying && (
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <Disc size={48} weight="duotone" className="text-white/80 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="w-full max-w-sm mb-4">
              <h3 className="text-lg font-black text-white truncate">{title}</h3>
              <p className="text-sm font-semibold text-purple-300 truncate mt-0.5">{artist}</p>
              {album && <p className="text-xs text-slate-400 truncate mt-0.5">{album}</p>}
              {source && (
                <span className="inline-block mt-2 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {source}
                </span>
              )}
            </div>

            {/* Equalizer Visualizer Bars */}
            {isPlaying && (
              <div className="flex items-end gap-1.5 h-6 my-2">
                {[40, 90, 60, 100, 75, 45, 85, 30, 95, 65].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-linear-to-t from-purple-500 to-pink-400 rounded-full animate-pulse"
                    style={{ height: `${h}%`, animationDuration: `${0.4 + (i % 4) * 0.2}s` }}
                  />
                ))}
              </div>
            )}

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 my-3">
              <button
                type="button"
                onClick={() => onUpdateEntity(currentMedia.entity_id, currentMedia.state, { action: 'previous_track' })}
                className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Previous Track"
              >
                <SkipBack size={20} weight="fill" />
              </button>

              <button
                type="button"
                onClick={handlePlayPause}
                className="w-14 h-14 rounded-3xl bg-purple-500 hover:bg-purple-400 text-slate-950 flex items-center justify-center shadow-lg shadow-purple-500/30 transition-all cursor-pointer active:scale-95 hover:scale-105"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => onUpdateEntity(currentMedia.entity_id, currentMedia.state, { action: 'next_track' })}
                className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Next Track"
              >
                <SkipForward size={20} weight="fill" />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="w-full max-w-xs flex items-center gap-3 pt-4 border-t border-white/10 mt-3">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-slate-400 hover:text-white cursor-pointer transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <SpeakerSlash size={20} weight="duotone" className="text-rose-400" />
                ) : (
                  <SpeakerHigh size={20} weight="duotone" className="text-purple-400" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-purple-400 cursor-pointer"
              />

              <span className="text-xs font-bold text-slate-300 w-8 text-right shrink-0">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>
        )}

        {/* All Connected Audio Output Devices */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Available Media Players ({mediaPlayers.length})
          </div>

          {mediaPlayers.map((player) => {
            const isSel = player.entity_id === selectedId;
            const isPlayingThis = player.state === 'playing';
            const roomName = player.area?.name || 'Home';
            const playerArt = getHAImageUrl(player.attributes?.media_image || player.attributes?.entity_picture, serverUrl);

            return (
              <div
                key={player.entity_id}
                onClick={() => setSelectedId(player.entity_id)}
                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                  isSel
                    ? 'bg-purple-500/20 border-purple-500/50 shadow-md ring-1 ring-purple-500/40'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-950/60 border border-white/10 flex items-center justify-center shrink-0">
                    {playerArt ? (
                      <img src={playerArt} alt={player.name} className="w-full h-full object-cover" />
                    ) : player.attributes?.device_class === 'tv' ? (
                      <Television size={20} weight="duotone" className="text-purple-300" />
                    ) : (
                      <SpeakerSimpleHigh size={20} weight="duotone" className="text-purple-300" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{player.name}</h4>
                    <p className="text-xs text-slate-400 truncate">
                      {isPlayingThis ? (
                        <span className="text-purple-300 font-semibold truncate">
                          ▶ {player.attributes?.media_title || 'Playing'}
                        </span>
                      ) : (
                        <span>{roomName} • {player.state}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isPlayingThis
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}>
                    {player.state}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
