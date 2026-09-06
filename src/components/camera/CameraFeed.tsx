/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraFeed
 * Baseline camera component displaying camera entity state, metadata, and a clean
 * video viewport ready for building camera streaming from the ground up.
 */

import React, { useRef, useEffect } from 'react';
import { VideoCamera, Camera, WarningCircle } from '@phosphor-icons/react';
import { ResolvedEntity, HAEntity } from '../../types';

export type CameraEngine = 'auto' | 'custom' | 'snapshot';

export interface CameraFeedProps {
  camera: ResolvedEntity | HAEntity | { entity_id: string; name?: string; attributes?: any; state?: string };
  mode?: 'live' | 'preview';
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  preferProtocol?: any;
  onReady?: () => void;
  onError?: (error: Error | string) => void;
  onGoLive?: () => void;
}

export default function CameraFeed({
  camera,
  mode = 'preview',
  darkMode = true,
  className = '',
  showControls = true,
  autoPlay = true,
  muted = true,
  onReady,
  onError,
  onGoLive
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraName = ('name' in camera ? camera.name : undefined) || 
    camera.attributes?.friendly_name || 
    camera.entity_id || 
    'Camera';
  const state = String(camera.state || 'idle').toLowerCase();
  const isUnavailable = state === 'unavailable' || state === 'off';
  const entityPicture = camera.attributes?.entity_picture;

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <div
      className={`relative w-full h-full min-h-[140px] flex items-center justify-center overflow-hidden bg-slate-950 select-none ${className}`}
      onClick={mode === 'preview' ? onGoLive : undefined}
    >
      {/* Ready video element hook for streaming from the ground up */}
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls={showControls && mode === 'live'}
        className="w-full h-full object-cover hidden"
      />

      {/* Snapshot poster fallback if available */}
      {entityPicture && !isUnavailable ? (
        <img
          src={entityPicture}
          alt={cameraName}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          onError={() => onError?.('Failed to load snapshot')}
        />
      ) : null}

      {/* Clean Viewport Overlay & Baseline Placeholder */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className={`p-3 rounded-2xl ${
          isUnavailable 
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
            : 'bg-white/5 text-slate-300 border border-white/10 backdrop-blur-md'
        }`}>
          {isUnavailable ? (
            <WarningCircle size={28} weight="duotone" />
          ) : (
            <VideoCamera size={28} weight="duotone" className="text-cyan-400" />
          )}
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-white tracking-wide">{cameraName}</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full ${
              isUnavailable ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'
            }`} />
            <span className="capitalize">{isUnavailable ? 'Offline' : state || 'Ready'}</span>
          </div>
        </div>

        {mode === 'preview' && (
          <span className="mt-1 text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
            {camera.entity_id}
          </span>
        )}
      </div>

      {/* Ambient gradient vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/20" />
    </div>
  );
}
