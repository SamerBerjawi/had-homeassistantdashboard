/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  X, 
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
  BellRinging,
  PersonSimpleWalk,
  CheckCircle,
  ShieldWarning
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import HaWebRtcPlayer from './HaWebRtcPlayer';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { 
  getCameraMotionStatus, 
  executeCameraPtz, 
  toggleCameraSiren, 
  captureAndDownloadSnapshot, 
  PtzDirection 
} from '../../../services/cameraIntegrationService';

interface CameraStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  camera: ResolvedEntity | null;
  darkMode?: boolean;
  addToast?: (toast: any) => void;
}

export default function CameraStreamModal({
  isOpen,
  onClose,
  camera,
  darkMode = true,
  addToast
}: CameraStreamModalProps) {
  const { domainGroups, serverUrl } = useAutoLayoutStore();
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [activePanDirection, setActivePanDirection] = useState<string | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [ptzStatusMsg, setPtzStatusMsg] = useState<string | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !camera) return null;

  const cameraName = camera.name || camera.attributes?.friendly_name || 'Surveillance Camera';
  const modelName = camera.attributes?.model_name || 'UniFi Protect Stream';
  const resolution = camera.attributes?.resolution || '2K HD (30 FPS)';
  const motionStatus = getCameraMotionStatus(camera, domainGroups['binary_sensor'] || []);

  const handleCaptureSnapshot = async () => {
    setIsSnapshotting(true);
    const videoEl = modalContainerRef.current?.querySelector('video') || null;
    const success = await captureAndDownloadSnapshot(videoEl, camera, serverUrl);
    if (success) {
      addToast?.({
        type: 'success',
        title: 'Snapshot Saved',
        message: `High-resolution frame saved for ${cameraName}`
      });
    }
    setTimeout(() => setIsSnapshotting(false), 1200);
  };

  const handlePanTiltZoom = async (dir: PtzDirection) => {
    setActivePanDirection(dir);
    setPtzStatusMsg(`PTZ: ${dir.replace('_', ' ').toUpperCase()}`);

    try {
      const res = await executeCameraPtz(camera, dir, serverUrl, 0.5);
      if (res.success) {
        setPtzStatusMsg(`PTZ Executed (${res.serviceUsed})`);
      } else {
        setPtzStatusMsg(`PTZ Failed: ${res.error || 'Unavailable'}`);
      }
    } catch {
      setPtzStatusMsg(`PTZ: ${dir.toUpperCase()}`);
    }

    setTimeout(() => {
      setActivePanDirection(null);
      setPtzStatusMsg(null);
    }, 1500);
  };

  const handleToggleSiren = async () => {
    const nextState = !isSirenActive;
    setIsSirenActive(nextState);
    const sirens = [...(domainGroups['siren'] || []), ...(domainGroups['switch'] || [])];
    const res = await toggleCameraSiren(camera, sirens, nextState);
    if (res.success) {
      addToast?.({
        type: nextState ? 'warning' : 'info',
        title: nextState ? 'Deterrent Siren Activated' : 'Siren Silenced',
        message: nextState ? `Siren triggered on ${cameraName}` : 'Camera alarm disabled.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-black/80 animate-in fade-in duration-200">
      <div
        ref={modalContainerRef}
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          darkMode ? 'bg-slate-950/95 border-white/15 text-white backdrop-blur-md' : 'bg-white/95 border-slate-200/90 text-slate-900 backdrop-blur-md'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b ${
          darkMode ? 'border-white/10' : 'border-slate-200/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Camera size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">{cameraName}</h3>
                {(camera.attributes?.is_rtsp_stream || camera.attributes?.stream_source === 'go2rtc') && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                    go2rtc RTSP
                  </span>
                )}
                {/* Real-time Motion Badge */}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border uppercase tracking-wider backdrop-blur-md ${
                  motionStatus.isMotionActive
                    ? 'bg-rose-600/20 text-rose-400 border-rose-500/40 animate-pulse'
                    : darkMode
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
                }`}>
                  <PersonSimpleWalk size={12} weight="bold" />
                  <span>{motionStatus.isMotionActive ? 'Motion Active' : 'Motion Clear'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{modelName}</span>
                <span>•</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{resolution}</span>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{motionStatus.lastMotionText}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-slate-900/[0.04] border-slate-900/[0.08] hover:bg-slate-900/[0.08] text-slate-700'
            }`}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Video Canvas Container powered by HaWebRtcPlayer */}
        <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
          <HaWebRtcPlayer
            camera={camera}
            darkMode={darkMode}
            isIntercomActive={isMicActive}
            muted={isAudioMuted}
            showControls={true}
          />

          {/* PTZ Action Feedback Overlay */}
          {ptzStatusMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md text-cyan-400 text-xs font-bold border border-cyan-400/40 shadow-xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                <CheckCircle size={14} weight="bold" className="text-cyan-400" />
                <span>{ptzStatusMsg}</span>
              </div>
            </div>
          )}

          {/* Siren Active Overlay */}
          {isSirenActive && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-lg border border-rose-400">
              <BellRinging size={16} weight="duotone" />
              <span>Deterrent Siren Triggered</span>
            </div>
          )}

          {/* Motion Alert Active Overlay */}
          {motionStatus.isMotionActive && (
            <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-lg border border-rose-400">
              <ShieldWarning size={16} weight="duotone" />
              <span>{motionStatus.lastMotionText}</span>
            </div>
          )}
        </div>

        {/* Action Controls & PTZ Toolbar */}
        <div className={`p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-t ${
          darkMode ? 'bg-black/40 border-white/10' : 'bg-white/80 border-slate-200/80'
        }`}>
          {/* Audio & Snapshot Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 2-Way Intercom Mic */}
            <button
              type="button"
              onClick={() => setIsMicActive(!isMicActive)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                isMicActive
                  ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                  : darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    : 'bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-slate-800 border border-slate-900/[0.08]'
              }`}
            >
              {isMicActive ? <MicrophoneSlash size={16} weight="bold" /> : <Microphone size={16} weight="duotone" />}
              <span>{isMicActive ? 'Mute Intercom' : 'Hold to Speak'}</span>
            </button>

            {/* Audio Listen */}
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    : 'bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-slate-800 border border-slate-900/[0.08]'
              }`}
              title={isAudioMuted ? 'Unmute camera audio' : 'Mute camera audio'}
            >
              {isAudioMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="duotone" />}
            </button>

            {/* Archive Snapshot */}
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              disabled={isSnapshotting}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  : 'bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-slate-800 border border-slate-900/[0.08]'
              }`}
            >
              <DownloadSimple size={16} weight="duotone" className="text-cyan-500 dark:text-cyan-400" />
              <span>{isSnapshotting ? 'Saving HD Frame...' : 'Capture Snapshot'}</span>
            </button>
          </div>

          {/* Real PTZ Controls Cluster & Deterrent Siren */}
          <div className="flex items-center gap-3">
            {/* PTZ Pan/Tilt/Zoom Controller */}
            <div className={`flex items-center gap-1 p-1 rounded-2xl border ${
              darkMode ? 'bg-black/40 border-white/10' : 'bg-slate-900/[0.03] border-slate-900/[0.06]'
            }`}>
              {/* Pan Left */}
              <button
                type="button"
                onClick={() => handlePanTiltZoom('left')}
                className={`p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-all ${
                  activePanDirection === 'left' ? 'bg-cyan-500 text-black font-bold scale-110' : 'hover:bg-white/10'
                }`}
                title="Pan Left (Send PTZ command)"
              >
                <CaretLeft size={16} weight="bold" />
              </button>

              {/* Tilt Up & Down */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handlePanTiltZoom('up')}
                  className={`p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-all ${
                    activePanDirection === 'up' ? 'bg-cyan-500 text-black font-bold scale-110' : 'hover:bg-white/10'
                  }`}
                  title="Tilt Up (Send PTZ command)"
                >
                  <CaretUp size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePanTiltZoom('down')}
                  className={`p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-all ${
                    activePanDirection === 'down' ? 'bg-cyan-500 text-black font-bold scale-110' : 'hover:bg-white/10'
                  }`}
                  title="Tilt Down (Send PTZ command)"
                >
                  <CaretDown size={14} weight="bold" />
                </button>
              </div>

              {/* Pan Right */}
              <button
                type="button"
                onClick={() => handlePanTiltZoom('right')}
                className={`p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-all ${
                  activePanDirection === 'right' ? 'bg-cyan-500 text-black font-bold scale-110' : 'hover:bg-white/10'
                }`}
                title="Pan Right (Send PTZ command)"
              >
                <CaretRight size={16} weight="bold" />
              </button>

              <div className="w-[1px] h-6 bg-white/15 mx-1" />

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => handlePanTiltZoom('zoom_in')}
                className={`p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-all ${
                  activePanDirection === 'zoom_in' ? 'bg-cyan-500 text-black font-bold scale-110' : 'hover:bg-white/10'
                }`}
                title="Zoom In"
              >
                <MagnifyingGlassPlus size={16} weight="bold" />
              </button>

              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => handlePanTiltZoom('zoom_out')}
                className={`p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-all ${
                  activePanDirection === 'zoom_out' ? 'bg-cyan-500 text-black font-bold scale-110' : 'hover:bg-white/10'
                }`}
                title="Zoom Out"
              >
                <MagnifyingGlassMinus size={16} weight="bold" />
              </button>
            </div>

            {/* Siren Trigger */}
            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isSirenActive
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : darkMode
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
            >
              <BellRinging size={16} weight="duotone" />
              <span>{isSirenActive ? 'Stop Siren' : 'Trigger Siren'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
