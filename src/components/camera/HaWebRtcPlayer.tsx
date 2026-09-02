/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integrated Native Home Assistant WebRTC Camera Stream Player (with multi-tier HLS/MJPEG fallback).
 *
 * Supports two distinct modes:
 * 1. Preview Mode ('preview'): Grid tiles and dashboard overviews. Renders lightweight,
 *    periodically-refreshed snapshots (every 4s) without initiating heavy WebRTC or HLS negotiations.
 * 2. Live Mode ('live'): Detail views and modals. Runs the full multi-tier WebRTC -> HLS -> MJPEG
 *    cascade with codec mismatch detection and stream concurrency management.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Broadcast,
  ArrowsClockwise,
  WarningCircle,
  SpeakerHigh,
  SpeakerSlash,
  Camera,
  Play,
  Pause,
  ArrowsOut,
  ArrowsIn,
  Copy,
  Check,
  Warning,
  Sparkle
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useCameraStream, StreamProtocol, StreamMode } from '../../hooks/useCameraStream';
import { downloadCameraFrame, getHACameraSnapshotUrl, CameraCodecMode } from '../../services/haCameraService';
import { generateGo2RtcConfigSnippet } from '../../services/go2rtcService';
import { resolveHAImageUrl } from '../../services/haImageService';
import CameraNoSignalPlaceholder from '../ui/CameraNoSignalPlaceholder';

export interface HaWebRtcPlayerProps {
  camera: ResolvedEntity | { entity_id: string; name?: string; attributes?: any; state?: string };
  mode?: StreamMode;
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  isIntercomActive?: boolean;
  preferProtocol?: 'auto' | 'webrtc' | 'hls' | 'mjpeg';
  codecMode?: CameraCodecMode;
  previewIntervalMs?: number;
  onReady?: () => void;
  onError?: (error: Error | string) => void;
  onSnapshotReady?: (canvas: HTMLCanvasElement) => void;
  onGoLive?: () => void;
}

export default function HaWebRtcPlayer({
  camera,
  mode = 'live',
  darkMode = true,
  className = '',
  showControls = true,
  autoPlay = true,
  muted = true,
  isIntercomActive = false,
  preferProtocol = 'auto',
  codecMode,
  previewIntervalMs = 4000,
  onReady,
  onError,
  onSnapshotReady,
  onGoLive
}: HaWebRtcPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isMjpegFailed, setIsMjpegFailed] = useState(false);
  const [isSnapshotFailed, setIsSnapshotFailed] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showCodecModal, setShowCodecModal] = useState(false);

  const { serverUrl } = useAutoLayoutStore();
  const entityId = camera?.entity_id || '';
  const cameraName = (camera as any)?.name || (camera as any)?.attributes?.friendly_name || entityId;
  const rawEntityPic = (camera as any)?.attributes?.entity_picture;
  const rtspUrl = (camera as any)?.attributes?.rtsp_url;
  const isRtsp = (camera as any)?.attributes?.is_rtsp_stream || (camera as any)?.attributes?.stream_source === 'go2rtc';

  const snapshotFallbackUrl = rawEntityPic
    ? resolveHAImageUrl(rawEntityPic, serverUrl)
    : getHACameraSnapshotUrl(entityId, serverUrl);

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Reset states on entity change
  useEffect(() => {
    setIsSnapshotFailed(false);
    setIsMjpegFailed(false);
    setIsVideoPlaying(false);
    setShowCodecModal(false);
    setCopiedSnippet(false);
  }, [entityId]);

  // Multi-tier stream lifecycle hook
  const {
    status,
    protocol,
    mjpegUrl,
    snapshotUrl,
    videoRef,
    error,
    isCodecMismatch,
    isPaused,
    isAudioMuted,
    setIsAudioMuted,
    togglePause,
    reconnect,
    retryFromWebRtc
  } = useCameraStream(entityId, {
    mode,
    enabled: Boolean(entityId),
    autoPlay,
    muted,
    enableIntercom: isIntercomActive,
    serverUrl,
    preferProtocol,
    codecMode,
    previewIntervalMs,
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

  const handleCopyYaml = () => {
    const snippet = generateGo2RtcConfigSnippet(entityId, rtspUrl);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2500);
    });
  };

  const isVideoActive = (protocol === 'webrtc' || protocol === 'hls') && status === 'connected';

  // =========================================================================
  // PREVIEW MODE RENDER (Lightweight Periodic Snapshot Tile)
  // =========================================================================
  if (mode === 'preview') {
    return (
      <div
        ref={containerRef}
        onClick={onGoLive}
        className={`relative w-full h-full bg-slate-950 flex items-center justify-center select-none overflow-hidden group ${className}`}
      >
        {/* Periodic Preview Snapshot */}
        {(snapshotUrl || snapshotFallbackUrl) && !isSnapshotFailed ? (
          <>
            <img
              key={snapshotUrl}
              src={snapshotUrl || snapshotFallbackUrl}
              alt={cameraName}
              onError={() => setIsSnapshotFailed(true)}
              className="w-full h-full object-cover transition-opacity duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
          </>
        ) : (
          <CameraNoSignalPlaceholder
            title={cameraName}
            subtitle={error || (status === 'demo' ? 'Demo Mode Feed' : 'Preview Unavailable')}
          />
        )}

        {/* Top Left Preview Badge */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-2 pointer-events-none">
          <div className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/15 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Preview</span>
          </div>
          {isRtsp && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
              RTSP
            </span>
          )}
        </div>

        {/* Center Hover "Tap to Go Live" Affordance */}
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transform scale-95 group-hover:scale-100 transition-transform">
            <Play size={13} weight="fill" className="text-cyan-400" />
            <span>Tap for Live Stream</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIVE MODE RENDER (Full Multi-Tier Interactive Streaming Player)
  // =========================================================================
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
        className={`w-full h-full object-cover z-10 transition-opacity duration-300 ${
          isVideoActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
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

      {/* Fallback Snapshot / Background Preview when video is not active */}
      {!isVideoActive && (
        <div className="absolute inset-0 w-full h-full z-0">
          {(snapshotFallbackUrl || snapshotUrl) && !isSnapshotFailed ? (
            <>
              <img
                src={snapshotUrl || snapshotFallbackUrl}
                alt={cameraName}
                onError={() => setIsSnapshotFailed(true)}
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
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {protocol === 'webrtc' && status === 'connected' && (
          <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">WebRTC</span>
            <span className="text-white/40">•</span>
            <span className="text-slate-300">Ultra-low latency</span>
          </div>
        )}

        {protocol === 'hls' && status === 'connected' && (
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 font-bold">HLS Stream</span>
              <span className="text-white/40">•</span>
              <span className="text-slate-300">Buffered</span>
            </div>
            <button
              type="button"
              onClick={retryFromWebRtc}
              title="Force retry WebRTC tier"
              className="px-2 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              <ArrowsClockwise size={11} weight="bold" />
              <span>Retry WebRTC</span>
            </button>
          </div>
        )}

        {protocol === 'mjpeg' && status === 'connected' && (
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-bold">MJPEG Proxy</span>
            </div>
            <button
              type="button"
              onClick={retryFromWebRtc}
              title="Force retry WebRTC tier"
              className="px-2 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              <ArrowsClockwise size={11} weight="bold" />
              <span>Retry WebRTC</span>
            </button>
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

      {/* Codec Warning Pill (If H.265 / HEVC mismatch detected) */}
      {isCodecMismatch && (
        <div className="absolute top-12 left-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCodecModal(true)}
            className="px-2.5 py-1 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 shadow-lg border border-amber-300 transition-all cursor-pointer animate-pulse"
          >
            <Warning size={14} weight="fill" />
            <span>H.265 Codec Detected (Fix Available)</span>
          </button>
        </div>
      )}

      {/* Codec Guidance Modal Overlay */}
      {showCodecModal && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md p-4 flex flex-col justify-between animate-in fade-in duration-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <WarningCircle size={18} weight="fill" />
                <span>H.265 / HEVC RTSP Codec Incompatibility</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCodecModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/10"
              >
                Close
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Browsers require <strong>H.264</strong> video for ultra-low latency WebRTC. This camera sends H.265 video without a transcode directive. Add <code className="text-amber-300 bg-black/60 px-1 py-0.5 rounded font-mono">#video=h264</code> to your go2rtc stream configuration.
            </p>

            <div className="relative p-2.5 rounded-xl bg-black/80 border border-amber-500/30 font-mono text-[10px] text-amber-200 overflow-x-auto">
              <pre>{generateGo2RtcConfigSnippet(entityId, rtspUrl)}</pre>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyYaml}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedSnippet ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
              <span>{copiedSnippet ? 'Copied to Clipboard!' : 'Copy go2rtc YAML'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Spinner during connection */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs z-10 p-4 text-center">
          <div className="relative flex items-center justify-center mb-2.5">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Broadcast size={16} weight="duotone" className="text-cyan-400 absolute animate-pulse" />
          </div>
          <p className="text-xs font-bold text-white tracking-wide drop-shadow-md">{cameraName}</p>
          <p className="text-[11px] text-cyan-300 mt-0.5 drop-shadow-md">
            {error || 'Negotiating Camera Stream...'}
          </p>
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
