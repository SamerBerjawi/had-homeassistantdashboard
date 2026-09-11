import React, { useState, useRef, useMemo } from 'react';
import {
  VideoCamera,
  Camera,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  DownloadSimple,
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Warning,
  CheckCircle,
  BellRinging
} from '@phosphor-icons/react';
import { HAEntity, ResolvedEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import CameraFeed from '../../camera/CameraFeed';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import {
  detectCameraCapabilities,
  CameraCapabilities
} from '../../../services/cameraClassification';
import {
  executeCameraPtz,
  toggleCameraSiren,
  captureAndDownloadSnapshot,
  PtzDirection
} from '../../../services/cameraIntegrationService';

interface CameraControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
  customIcon?: string | null;
}

export default function CameraControlView({ entity, darkMode = true, customIcon }: CameraControlViewProps) {
  const { serverUrl, domainGroups } = useAutoLayoutStore();
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [activePanDirection, setActivePanDirection] = useState<string | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [ptzStatusMsg, setPtzStatusMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const caps: CameraCapabilities = useMemo(() => {
    return detectCameraCapabilities(entity);
  }, [entity]);

  // Convert HAEntity to ResolvedEntity for camera feed display
  const resolvedCamera = entity as ResolvedEntity;

  const handleCaptureSnapshot = async () => {
    setIsSnapshotting(true);
    const videoEl = containerRef.current?.querySelector('video') || null;
    await captureAndDownloadSnapshot(videoEl, resolvedCamera, serverUrl);
    setTimeout(() => setIsSnapshotting(false), 1200);
  };

  const handlePtzMove = async (dir: PtzDirection) => {
    setActivePanDirection(dir);
    setPtzStatusMsg(`Moving PTZ: ${dir.toUpperCase()}`);
    await executeCameraPtz(resolvedCamera, dir, serverUrl);
    setTimeout(() => {
      setActivePanDirection(null);
      setPtzStatusMsg(null);
    }, 1000);
  };

  const handleToggleSiren = async () => {
    const nextState = !isSirenActive;
    setIsSirenActive(nextState);
    await toggleCameraSiren(resolvedCamera, Object.values(domainGroups).flat(), nextState);
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  return (
    <div ref={containerRef} className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW (Health Section Header Pattern)                         */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl backdrop-blur-xl flex items-center justify-between transition-all ${bentoStaticCardStyle}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
            style={{
              backgroundColor: !caps.isOffline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.12)',
              borderColor: !caps.isOffline ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.25)',
              color: !caps.isOffline ? '#10b981' : '#94a3b8'
            }}
          >
            {customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight="duotone" />
            ) : (
              <VideoCamera size={18} weight="duotone" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || 'SECURITY & VIDEO'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || 'Live Camera Feed'}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Resolution */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              !caps.isOffline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${!caps.isOffline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <span>{!caps.isOffline ? 'LIVE' : 'OFFLINE'}</span>
            {caps.resolution && <span className="opacity-60 text-[10px]">• {caps.resolution}</span>}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO LIVE VIDEO STREAM CARD                                            */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl overflow-hidden bg-black/80 border border-slate-200/50 dark:border-white/10 shadow-[4px_6px_12px_rgba(0,0,0,0.25)] aspect-video max-h-[360px] flex items-center justify-center isolate">
        <CameraFeed
          camera={resolvedCamera}
          mode="live"
          muted={isAudioMuted}
          showControls={true}
        />

        {/* Snapshot Loading Indicator Overlay */}
        {isSnapshotting && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none transition-opacity duration-300">
            <div className="px-3.5 py-2 rounded-2xl bg-black/80 text-white text-xs font-black flex items-center gap-2 shadow-2xl border border-white/20">
              <Camera size={18} weight="fill" className="text-emerald-400 animate-pulse" />
              <span>Capturing Frame Snapshot...</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MASTER CAMERA ACTION DECK                                              */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl flex items-center justify-between gap-2 flex-wrap ${bentoStaticCardStyle}`}>
        <div className="flex items-center gap-2">
          {/* Snapshot Capture Button */}
          <button
            type="button"
            onClick={handleCaptureSnapshot}
            disabled={isSnapshotting}
            className={`h-10 px-4 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
              darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                : 'bg-white/40 hover:bg-white/60 text-slate-800 border-slate-200/50 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
            }`}
            title="Download Snapshot Frame"
          >
            <DownloadSimple size={15} weight="bold" />
            <span>Snapshot</span>
          </button>

          {/* 2-Way Microphone Audio Intercom */}
          <button
            type="button"
            onClick={() => setIsMicActive(!isMicActive)}
            className={`h-10 px-4 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
              isMicActive
                ? 'bg-rose-500 text-white animate-pulse border-rose-400 shadow-[4px_6px_12px_rgba(244,63,94,0.3)]'
                : darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
                : 'bg-white/40 hover:bg-white/60 text-slate-800 border-slate-200/50'
            }`}
            title="2-Way Audio Intercom"
          >
            {isMicActive ? (
              <>
                <Microphone size={15} weight="fill" />
                <span>Speaking...</span>
              </>
            ) : (
              <>
                <MicrophoneSlash size={15} weight="bold" />
                <span>Talk</span>
              </>
            )}
          </button>

          {/* Audio Mute/Unmute */}
          <button
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
              isAudioMuted
                ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/30'
                : darkMode
                ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5'
                : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
            }`}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
          </button>
        </div>

        {/* Emergency Siren (Strictly if supportsSiren) */}
        {caps.supportsSiren && (
          <button
            type="button"
            onClick={handleToggleSiren}
            className={`h-10 px-4 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
              isSirenActive
                ? 'bg-rose-600 text-white animate-bounce border-rose-500 shadow-lg'
                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 dark:text-rose-300 border-rose-500/30'
            }`}
          >
            <BellRinging size={15} weight="bold" />
            <span>{isSirenActive ? 'Siren Active!' : 'Sound Siren'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. PTZ CONTROLS D-PAD (Strictly only if physical camera supports PTZ)     */}
      {/* ========================================================================= */}
      {caps.supportsPtz && (
        <div className={`p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              PTZ Pan / Tilt / Zoom Controls
            </span>
            {ptzStatusMsg && (
              <span className="text-[10px] font-mono text-cyan-500 dark:text-cyan-400 animate-pulse font-bold">
                {ptzStatusMsg}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 py-2">
            {/* Directional D-Pad */}
            <div className="grid grid-cols-3 gap-1.5 w-32 h-32">
              <div />
              <button
                type="button"
                onClick={() => handlePtzMove('up')}
                className={`flex items-center justify-center rounded-2xl transition-all active:scale-90 cursor-pointer border ${
                  activePanDirection === 'up'
                    ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-xs'
                    : darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
                    : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50'
                }`}
              >
                <CaretUp size={20} weight="bold" />
              </button>
              <div />

              <button
                type="button"
                onClick={() => handlePtzMove('left')}
                className={`flex items-center justify-center rounded-2xl transition-all active:scale-90 cursor-pointer border ${
                  activePanDirection === 'left'
                    ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-xs'
                    : darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
                    : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50'
                }`}
              >
                <CaretLeft size={20} weight="bold" />
              </button>

              <div className="rounded-2xl flex items-center justify-center text-[9px] font-mono font-black text-slate-400 border border-transparent">
                PTZ
              </div>

              <button
                type="button"
                onClick={() => handlePtzMove('right')}
                className={`flex items-center justify-center rounded-2xl transition-all active:scale-90 cursor-pointer border ${
                  activePanDirection === 'right'
                    ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-xs'
                    : darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
                    : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50'
                }`}
              >
                <CaretRight size={20} weight="bold" />
              </button>

              <div />
              <button
                type="button"
                onClick={() => handlePtzMove('down')}
                className={`flex items-center justify-center rounded-2xl transition-all active:scale-90 cursor-pointer border ${
                  activePanDirection === 'down'
                    ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-xs'
                    : darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
                    : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50'
                }`}
              >
                <CaretDown size={20} weight="bold" />
              </button>
              <div />
            </div>

            {/* Zoom In / Out */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handlePtzMove('zoom_in')}
                className={`h-11 px-4 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer border ${
                  darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                    : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                }`}
                title="Zoom In"
              >
                <MagnifyingGlassPlus size={16} weight="bold" />
                <span>Zoom In</span>
              </button>

              <button
                type="button"
                onClick={() => handlePtzMove('zoom_out')}
                className={`h-11 px-4 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer border ${
                  darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                    : 'bg-white/60 hover:bg-white text-slate-800 border-slate-200/50 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                }`}
                title="Zoom Out"
              >
                <MagnifyingGlassMinus size={16} weight="bold" />
                <span>Zoom Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
