/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Microphone, 
  MicrophoneSlash, 
  SpeakerHigh, 
  SpeakerSlash, 
  DownloadSimple, 
  Broadcast, 
  WarningCircle, 
  CaretUp, 
  CaretDown, 
  CaretLeft, 
  CaretRight, 
  ArrowsOut, 
  ArrowsIn,
  BellRinging,
  Sliders
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import Go2RtcPlayer from './Go2RtcPlayer';

interface CameraStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  camera: ResolvedEntity | null;
  darkMode?: boolean;
}

export default function CameraStreamModal({
  isOpen,
  onClose,
  camera,
  darkMode = true
}: CameraStreamModalProps) {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [activePanDirection, setActivePanDirection] = useState<string | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);

  if (!isOpen || !camera) return null;

  const cameraName = camera.name || camera.attributes?.friendly_name || 'Surveillance Camera';
  const modelName = camera.attributes?.model_name || 'UniFi Protect Stream';
  const resolution = camera.attributes?.resolution || '2K HD (30 FPS)';
  const streamType = (camera.attributes?.stream_type || 'WebRTC').toUpperCase();
  const snapshotUrl =
    camera.attributes?.entity_picture ||
    'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&q=80&w=1400';

  const handleCaptureSnapshot = () => {
    setIsSnapshotting(true);
    setTimeout(() => setIsSnapshotting(false), 1200);
  };

  const handlePan = (dir: string) => {
    setActivePanDirection(dir);
    setTimeout(() => setActivePanDirection(null), 400);
  };

  const handleToggleSiren = () => {
    setIsSirenActive(!isSirenActive);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/75 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          darkMode ? 'bg-slate-950/95 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Camera size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">{cameraName}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{modelName}</span>
                <span>•</span>
                <span className="text-cyan-400 font-semibold">{resolution}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Video Canvas Container powered by Go2RtcPlayer */}
        <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
          <Go2RtcPlayer
            camera={camera}
            darkMode={darkMode}
            isIntercomActive={isMicActive}
            muted={isAudioMuted}
            showControls={true}
          />

          {/* PTZ Indicator Feedback */}
          {activePanDirection && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md text-cyan-400 text-sm font-bold border border-cyan-400/40 animate-pulse">
                PTZ Pan: {activePanDirection.toUpperCase()}
              </div>
            </div>
          )}

          {/* Siren Active Overlay */}
          {isSirenActive && (
            <div className="absolute top-16 left-4 z-20 px-3 py-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-lg">
              <BellRinging size={16} weight="duotone" />
              <span>Deterrent Siren Triggered</span>
            </div>
          )}
        </div>

        {/* Action Controls & PTZ Toolbar */}
        <div className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-t ${
          darkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Audio & Snapshot Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 2-Way Intercom Mic */}
            <button
              type="button"
              onClick={() => setIsMicActive(!isMicActive)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                isMicActive
                  ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                  : darkMode
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
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
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
              title={isAudioMuted ? 'Unmute camera audio' : 'Mute camera audio'}
            >
              {isAudioMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="duotone" />}
            </button>

            {/* Archive Snapshot */}
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <DownloadSimple size={16} weight="duotone" className="text-cyan-400" />
              <span>{isSnapshotting ? 'Saving HD Frame...' : 'Capture Snapshot'}</span>
            </button>
          </div>

          {/* PTZ Joystick & Deterrent Siren */}
          <div className="flex items-center gap-4">
            {/* PTZ D-Pad */}
            <div className="flex items-center gap-1 bg-black/20 dark:bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => handlePan('left')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                title="Pan Left"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handlePan('up')}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                  title="Tilt Up"
                >
                  <CaretUp size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePan('down')}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                  title="Tilt Down"
                >
                  <CaretDown size={14} weight="bold" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handlePan('right')}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                title="Pan Right"
              >
                <CaretRight size={16} weight="bold" />
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
