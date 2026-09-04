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
import { getCameraCodecPreference, setCameraCodecPreference, CameraCodecMode } from '../../../services/haCameraService';

interface CameraControlViewProps {
  entity: HAEntity;
}

export default function CameraControlView({ entity }: CameraControlViewProps) {
  const { serverUrl, domainGroups } = useAutoLayoutStore();
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [activePanDirection, setActivePanDirection] = useState<string | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [ptzStatusMsg, setPtzStatusMsg] = useState<string | null>(null);
  const [codecMode, setCodecMode] = useState<CameraCodecMode>(() => {
    return getCameraCodecPreference(entity.entity_id);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const caps: CameraCapabilities = useMemo(() => {
    return detectCameraCapabilities(entity);
  }, [entity]);

  // Convert HAEntity to ResolvedEntity for HaWebRtcPlayer compatibility
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

  const handleCodecChange = (mode: CameraCodecMode) => {
    setCodecMode(mode);
    setCameraCodecPreference(entity.entity_id, mode);
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  return (
    <div ref={containerRef} className="space-y-4">
      {/* 1. HERO LIVE WEBRTC VIDEO STREAM CARD */}
      <div className="relative rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-video max-h-[360px] flex items-center justify-center isolate">
        <CameraFeed
          camera={resolvedCamera}
          mode="live"
          muted={isAudioMuted}
          showControls={true}
        />

        {/* Live Status Overlay Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-[10px] font-bold text-white shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono uppercase tracking-wider">
              {caps.isOffline ? 'OFFLINE' : 'LIVE'}
            </span>
            <span className="text-slate-400 font-normal">• {caps.resolution}</span>
          </div>
        </div>

        {/* Snapshot Loading Indicator Overlay */}
        {isSnapshotting && (
          <div className="absolute inset-0 bg-white/30 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none transition-opacity duration-300">
            <div className="px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-bold flex items-center gap-2 shadow-2xl">
              <Camera size={18} weight="fill" className="text-emerald-400 animate-pulse" />
              <span>Capturing HD Snapshot...</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. MASTER CAMERA ACTION BAR */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-800/40 border border-white/10 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Snapshot Capture Button */}
          <button
            type="button"
            onClick={handleCaptureSnapshot}
            disabled={isSnapshotting}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-white/10 shadow-xs"
            title="Download Snapshot Frame"
          >
            <DownloadSimple size={15} weight="bold" />
            <span>Snapshot</span>
          </button>

          {/* 2-Way Microphone Audio Intercom */}
          <button
            type="button"
            onClick={() => setIsMicActive(!isMicActive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs ${
              isMicActive
                ? 'bg-rose-500 text-white font-black animate-pulse shadow-rose-500/20'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
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
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              isAudioMuted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
          </button>

          {/* Codec Mode Selector for RTSP cameras */}
          {(resolvedCamera.attributes?.is_rtsp_stream || resolvedCamera.attributes?.stream_source === 'go2rtc' || resolvedCamera.entity_id?.startsWith('go2rtc.')) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-700/50 border border-amber-500/30 text-[11px] font-bold">
              <span className="text-amber-400">Codec:</span>
              <select
                value={codecMode}
                onChange={(e) => handleCodecChange(e.target.value as CameraCodecMode)}
                className="bg-transparent text-white font-mono text-[11px] outline-none cursor-pointer"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto</option>
                <option value="h264" className="bg-slate-900 text-amber-300">Force H.264</option>
                <option value="copy" className="bg-slate-900 text-white">Copy (Passthrough)</option>
              </select>
            </div>
          )}
        </div>

        {/* Emergency Siren (Strictly if supportsSiren) */}
        {caps.supportsSiren && (
          <button
            type="button"
            onClick={handleToggleSiren}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              isSirenActive
                ? 'bg-rose-600 text-white animate-bounce shadow-lg'
                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
            }`}
          >
            <BellRinging size={15} weight="bold" />
            <span>{isSirenActive ? 'Siren Active!' : 'Sound Siren'}</span>
          </button>
        )}
      </div>

      {/* 3. PTZ CONTROLS D-PAD (Strictly only if physical camera supports PTZ) */}
      {caps.supportsPtz && (
        <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">PTZ Pan / Tilt / Zoom Controls</span>
            {ptzStatusMsg && (
              <span className="text-[10px] font-mono text-cyan-400 animate-pulse">{ptzStatusMsg}</span>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 py-2">
            {/* Directional D-Pad */}
            <div className="grid grid-cols-3 gap-1.5 w-32 h-32">
              <div />
              <button
                type="button"
                onClick={() => handlePtzMove('up')}
                className={`flex items-center justify-center rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all active:scale-90 cursor-pointer ${
                  activePanDirection === 'up' ? 'bg-cyan-500 text-slate-950 font-bold' : ''
                }`}
              >
                <CaretUp size={20} weight="bold" />
              </button>
              <div />

              <button
                type="button"
                onClick={() => handlePtzMove('left')}
                className={`flex items-center justify-center rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all active:scale-90 cursor-pointer ${
                  activePanDirection === 'left' ? 'bg-cyan-500 text-slate-950 font-bold' : ''
                }`}
              >
                <CaretLeft size={20} weight="bold" />
              </button>

              <div className="rounded-xl bg-slate-800/50 flex items-center justify-center text-[9px] font-bold text-slate-500">
                PTZ
              </div>

              <button
                type="button"
                onClick={() => handlePtzMove('right')}
                className={`flex items-center justify-center rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all active:scale-90 cursor-pointer ${
                  activePanDirection === 'right' ? 'bg-cyan-500 text-slate-950 font-bold' : ''
                }`}
              >
                <CaretRight size={20} weight="bold" />
              </button>

              <div />
              <button
                type="button"
                onClick={() => handlePtzMove('down')}
                className={`flex items-center justify-center rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all active:scale-90 cursor-pointer ${
                  activePanDirection === 'down' ? 'bg-cyan-500 text-slate-950 font-bold' : ''
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
                className="p-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="Zoom In"
              >
                <MagnifyingGlassPlus size={16} weight="bold" />
                <span>Zoom In</span>
              </button>

              <button
                type="button"
                onClick={() => handlePtzMove('zoom_out')}
                className="p-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
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
