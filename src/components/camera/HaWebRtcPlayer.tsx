/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integrated Native Home Assistant WebRTC Camera Stream Player (with multi-tier HLS/MJPEG fallback).
 * Operates securely over authenticated Home Assistant WebSocket signaling (`camera/webrtc/offer`).
 * Compatible with Cloudflare Tunnels and remote proxy configurations.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Broadcast,
  VideoCamera,
  ArrowsClockwise,
  WarningCircle,
  SpeakerHigh,
  SpeakerSlash,
  Camera,
  Play,
  Pause,
  ArrowsOut,
  ArrowsIn,
  Microphone,
  MicrophoneSlash
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useCameraStream, StreamProtocol } from '../../hooks/useCameraStream';
import { downloadCameraFrame, getHACameraSnapshotUrl } from '../../services/haCameraService';
import CameraNoSignalPlaceholder from '../ui/CameraNoSignalPlaceholder';

export interface HaWebRtcPlayerProps {
  camera: ResolvedEntity | { entity_id: string; name?: string; attributes?: any; state?: string };
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  isIntercomActive?: boolean;
  preferProtocol?: 'auto' | 'webrtc' | 'hls' | 'mjpeg';
  onReady?: () => void;
  onError?: (error: Error | string) => void;
  onSnapshotReady?: (canvas: HTMLCanvasElement) => void;
}

export default function HaWebRtcPlayer({
  camera,
  darkMode = true,
  className = '',
  showControls = true,
  autoPlay = true,
  muted = true,
  isIntercomActive = false,
  preferProtocol = 'auto',
  onReady,
  onError,
  onSnapshotReady
}: HaWebRtcPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isMjpegFailed, setIsMjpegFailed] = useState(false);

  const { serverUrl } = useAutoLayoutStore();
  const entityId = camera?.entity_id || '';
  const cameraName = (camera as any)?.name || (camera as any)?.attributes?.friendly_name || entityId;
  const snapshotFallbackUrl = (camera as any)?.attributes?.entity_picture || getHACameraSnapshotUrl(entityId, serverUrl);

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Multi-tier stream lifecycle hook
  const {
    status,
    protocol,
    mjpegUrl,
    snapshotUrl,
    videoRef,
    error,
    isPaused,
    isAudioMuted,
    setIsAudioMuted,
    togglePause,
    reconnect
  } = useCameraStream(entityId, {
    enabled: Boolean(entityId),
    autoPlay,
    muted,
    enableIntercom: isIntercomActive,
    serverUrl,
    preferProtocol,
    elementRef: containerRef,
    onStreamReady: () => {
      onReady?.();
    },
    onError: (err) => {
      onError?.(err);
    }
  });

  // Reset isVideoPlaying when stream reconnects or protocol changes
  useEffect(() => {
    if (status !== 'connected') {
      setIsVideoPlaying(false);
    }
  }, [status, protocol]);

  // Snapshot trigger
  const handleTakeSnapshot = useCallback(async () => {
    setIsSnapshotting(true);
    const video = videoRef.current;

    if (onSnapshotReady && video && video.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          onSnapshotReady(canvas);
        }
      } catch (e) {
        console.warn('[HaWebRtcPlayer] Snapshot canvas extraction failed:', e);
      }
    } else {
      await downloadCameraFrame(video, camera as ResolvedEntity, snapshotFallbackUrl);
    }

    setTimeout(() => setIsSnapshotting(false), 1000);
  }, [camera, onSnapshotReady, snapshotFallbackUrl, videoRef]);

  // Fullscreen container toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const isVideoActive = (protocol === 'webrtc' || protocol === 'hls') && status === 'connected';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-950 flex items-center justify-center select-none overflow-hidden group ${className}`}
    >
      {/* Video Element for WebRTC and HLS Tiers */}
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        playsInline
        muted={isAudioMuted}
        onPlaying={() => setIsVideoPlaying(true)}
        onLoadedData={() => setIsVideoPlaying(true)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth > 0 && !isVideoPlaying) {
            setIsVideoPlaying(true);
          }
        }}
        onError={() => setIsVideoPlaying(false)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoActive && isVideoPlaying ? 'opacity-100 z-10' : 'opacity-0 absolute pointer-events-none'
        }`}
      />

      {/* MJPEG Proxy Stream Image */}
      {protocol === 'mjpeg' && mjpegUrl && !isMjpegFailed && (
        <img
          src={mjpegUrl}
          alt={cameraName}
          onLoad={() => setIsVideoPlaying(true)}
          onError={() => setIsMjpegFailed(true)}
          className="w-full h-full object-cover z-10"
        />
      )}

      {/* Fallback Snapshot / Background Preview when video is not actively rendering frames */}
      {(!isVideoActive || !isVideoPlaying) && (
        <div className="absolute inset-0 w-full h-full z-0">
          {snapshotFallbackUrl || snapshotUrl ? (
            <>
              <img
                src={snapshotUrl || snapshotFallbackUrl}
                alt={cameraName}
                className="w-full h-full object-cover opacity-80 filter brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            </>
          ) : (
            <CameraNoSignalPlaceholder
              title={cameraName}
              subtitle={error || (status === 'demo' ? 'Demo Mode Feed' : status === 'connecting' ? 'Loading Camera Stream...' : 'No signal')}
            />
          )}
        </div>
      )}

      {/* Snapshot flash effect */}
      {isSnapshotting && (
        <div className="absolute inset-0 bg-white animate-ping opacity-60 z-30 pointer-events-none" />
      )}

      {/* Top Left Protocol & Connection Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        {protocol === 'webrtc' && status === 'connected' && (
          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">WebRTC</span>
            <span className="text-white/40">•</span>
            <span className="text-slate-300">Ultra-low latency</span>
          </div>
        )}

        {protocol === 'hls' && status === 'connected' && (
          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 font-bold">HLS Stream</span>
            <span className="text-white/40">•</span>
            <span className="text-slate-300">Buffered</span>
          </div>
        )}

        {protocol === 'mjpeg' && status === 'connected' && (
          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-300 font-bold">MJPEG Proxy</span>
          </div>
        )}

        {status === 'demo' && (
          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Demo Mode</span>
          </div>
        )}

        {status === 'connecting' && (
          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Connecting...</span>
          </div>
        )}
      </div>

      {/* Loading Spinner during connection */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs z-10 p-4 text-center">
          <div className="relative flex items-center justify-center mb-2.5">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Broadcast size={16} weight="duotone" className="text-cyan-400 absolute animate-pulse" />
          </div>
          <p className="text-xs font-bold text-white tracking-wide drop-shadow-md">{cameraName}</p>
          <p className="text-[11px] text-cyan-300 mt-0.5 drop-shadow-md">Connecting WebRTC Stream...</p>
        </div>
      )}

      {/* Stream Failed / Error Retry HUD */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs z-10 p-4 text-center">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-2">
            <WarningCircle size={20} weight="duotone" />
          </div>
          <p className="text-xs font-bold text-white mb-0.5">Stream Offline</p>
          <p className="text-[11px] text-rose-300/80 max-w-xs mb-3 line-clamp-2">{error || 'Connection failed'}</p>
          <button
            type="button"
            onClick={reconnect}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <ArrowsClockwise size={13} weight="bold" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Interactive Controls Overlay */}
      {showControls && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Pause / Play Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePause();
            }}
            title={isPaused ? 'Resume Live Stream' : 'Pause Stream'}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
          >
            {isPaused ? <Play size={14} weight="fill" className="text-emerald-400" /> : <Pause size={14} weight="bold" />}
          </button>

          {/* Mute / Unmute Audio */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAudioMuted(!isAudioMuted);
            }}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
          >
            {isAudioMuted ? (
              <SpeakerSlash size={14} weight="bold" className="text-slate-400" />
            ) : (
              <SpeakerHigh size={14} weight="duotone" className="text-cyan-400" />
            )}
          </button>

          {/* Snapshot Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTakeSnapshot();
            }}
            title="Download Snapshot Frame"
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
          >
            <Camera size={14} weight="duotone" className={isSnapshotting ? 'text-emerald-400 animate-spin' : 'text-cyan-400'} />
          </button>

          {/* Reconnect / Refresh */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reconnect();
            }}
            title="Refresh Connection"
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
          >
            <ArrowsClockwise size={14} weight="bold" className="text-slate-300" />
          </button>

          {/* Fullscreen Expand */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
          >
            {isFullscreen ? <ArrowsIn size={14} weight="bold" /> : <ArrowsOut size={14} weight="bold" />}
          </button>
        </div>
      )}
    </div>
  );
}
