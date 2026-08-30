/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Microphone, MicrophoneSlash, DownloadSimple, Broadcast } from '@phosphor-icons/react';
import CardModalContainer from './CardModalContainer';
import CameraNoSignalPlaceholder from '../../ui/CameraNoSignalPlaceholder';

interface CameraDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraName?: string;
  snapshotUrl?: string | null;
}

export default function CameraDetailModal({
  isOpen,
  onClose,
  cameraName = 'Surveillance Camera',
  snapshotUrl = null
}: CameraDetailModalProps) {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const handleCaptureSnapshot = () => {
    setIsSnapshotting(true);
    setTimeout(() => setIsSnapshotting(false), 1200);
  };

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={cameraName}
      subtitle="WebRTC Real-time 2K Stream (30 FPS)"
      icon={<Camera size={22} weight="duotone" className="text-cyan-400" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Fullscreen Camera Stream Frame */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl">
          {snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt={cameraName}
              className="w-full h-full object-cover"
            />
          ) : (
            <CameraNoSignalPlaceholder title={cameraName} subtitle="Live stream unavailable" />
          )}

          {/* Flash animation on snapshot */}
          {isSnapshotting && (
            <div className="absolute inset-0 bg-white animate-ping opacity-75 pointer-events-none" />
          )}

          {/* Stream Overlay HUD */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              LIVE WebRTC
            </span>
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono border border-white/10">
              1080p • 4.2 Mbps
            </span>
          </div>

          {/* Timestamp in HUD */}
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-slate-200 text-[10px] font-mono border border-white/10">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2.5">
            {/* 2-Way Intercom Mic */}
            <button
              onClick={() => setIsMicActive(!isMicActive)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isMicActive
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {isMicActive ? <MicrophoneSlash size={16} weight="duotone" /> : <Microphone size={16} weight="duotone" />}
              <span>{isMicActive ? 'Mute Intercom' : 'Hold to Talk'}</span>
            </button>

            {/* Snapshot Archive Button */}
            <button
              onClick={handleCaptureSnapshot}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-white/10"
            >
              <DownloadSimple size={16} weight="duotone" />
              <span>{isSnapshotting ? 'Saving Frame...' : 'Archive Snapshot'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <Broadcast size={15} weight="duotone" className="animate-pulse" />
            <span>Encrypted Tunnel</span>
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
