/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraFeed
 * Production-ready camera component with multi-tier streaming pipeline:
 * 1. WebRTC via go2rtc WHEP signaling (primary, sub-second latency)
 * 2. HLS fallback via hls.js (for restricted networks / non-WebRTC contexts)
 * 3. Still snapshot poster fallback from Home Assistant entity_picture
 * 4. Automatic exponential backoff reconnect on stream failure
 * 5. Surface clear "camera offline" and "stream interrupted" states with manual retry
 */

import React, { useRef, useState, useEffect } from 'react';
import { VideoCamera, WarningCircle, Broadcast, ArrowsClockwise, ArrowClockwise, WifiSlash } from '@phosphor-icons/react';
import Hls from 'hls.js';
import { ResolvedEntity, HAEntity } from '../../types';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { cameraStreamManager, CameraStreamState } from '../../services/cameraStreamManager';

export type CameraEngine = 'auto' | 'webrtc' | 'hls' | 'snapshot';

export interface CameraFeedProps {
  camera: ResolvedEntity | HAEntity | { entity_id: string; name?: string; attributes?: any; state?: string };
  mode?: 'live' | 'preview';
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  preferProtocol?: 'auto' | 'webrtc' | 'hls';
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
  preferProtocol,
  onReady,
  onError,
  onGoLive
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { config } = useUserConfig();
  const { authState } = useAuth();
  const token = authState.tokens?.access_token || '';

  const cameraId = camera.entity_id;
  const cameraName = ('name' in camera ? camera.name : undefined) || 
    camera.attributes?.friendly_name || 
    camera.entity_id || 
    'Camera';
  const state = String(camera.state || 'idle').toLowerCase();
  const isUnavailable = state === 'unavailable' || state === 'off';
  const entityPicture = camera.attributes?.entity_picture;

  // Check if camera has an RTSP source configured
  const configuredSource =
    config.cameras?.sources?.[cameraId] ||
    Object.values(config.cameras?.sources || {}).find(
      (s) =>
        s.id === cameraId ||
        s.haEntityId === cameraId ||
        (s.id && `camera.${s.id}` === cameraId) ||
        (cameraId.startsWith('camera.') && s.id === cameraId.replace('camera.', ''))
    );
  const targetStreamId = configuredSource?.id || cameraId;
  const rtspUrl = configuredSource?.rtspUrl;
  const effectiveProtocol = preferProtocol || configuredSource?.liveType || config.cameras?.defaultStreamType || 'auto';

  const [streamState, setStreamState] = useState<CameraStreamState>(() =>
    cameraStreamManager.getState(targetStreamId)
  );

  // Subscribe to centralized camera stream pool
  useEffect(() => {
    onReady?.();
    const unsubscribe = cameraStreamManager.subscribe(
      targetStreamId,
      {
        rtspUrl,
        token,
        preferProtocol: effectiveProtocol,
        isUnavailable
      },
      (newState) => {
        setStreamState(newState);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [targetStreamId, rtspUrl, token, effectiveProtocol, isUnavailable, onReady]);

  // Bind video element to shared MediaStream or direct HLS fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (streamState.mediaStream) {
      if (video.srcObject !== streamState.mediaStream) {
        video.srcObject = streamState.mediaStream;
        if (autoPlay) {
          video.play().catch(() => {});
        }
      }
    } else if (streamState.streamType === 'hls' && streamState.hlsUrl) {
      // Fallback for browsers where captureStream is not supported
      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr) => {
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          },
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60
        });
        hls.loadSource(streamState.hlsUrl);
        hls.attachMedia(video);
        if (autoPlay) {
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
        }
        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamState.hlsUrl;
        if (autoPlay) {
          video.play().catch(() => {});
        }
      }
    } else {
      video.srcObject = null;
      video.removeAttribute('src');
    }
  }, [streamState.mediaStream, streamState.streamType, streamState.hlsUrl, autoPlay, token]);

  // Notify parent component on state changes
  useEffect(() => {
    if (streamState.status === 'streaming') {
      onGoLive?.();
    } else if (streamState.status === 'error' && streamState.error) {
      onError?.(streamState.error);
    }
  }, [streamState.status, streamState.error, onGoLive, onError]);

  const isStreaming = streamState.status === 'streaming';
  const isConnecting = streamState.status === 'connecting';
  const streamError = streamState.error;
  const retrySecondsLeft = streamState.retrySecondsLeft;
  const streamType = streamState.streamType;

  // Manual retry handler
  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraStreamManager.retry(targetStreamId);
  };

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 select-none ${className}`}
      onClick={mode === 'preview' ? onGoLive : undefined}
    >
      {/* 1. Live Video Viewport */}
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls={showControls && mode === 'live' && isStreaming}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isStreaming ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none hidden'
        }`}
      />

      {/* 2. Snapshot Poster Fallback (rendered while connecting or if no RTSP stream configured) */}
      {(!isStreaming || isConnecting) && entityPicture && !isUnavailable && (
        <img
          src={entityPicture}
          alt={cameraName}
          className="absolute inset-0 w-full h-full object-cover opacity-80 z-0"
          onError={() => onError?.('Failed to load snapshot')}
        />
      )}

      {/* 3. Offline / Disconnected / Interrupted Overlay (surfaces clear feedback instead of silent black screen) */}
      {!isStreaming && (
        <div className="relative z-10 flex flex-col items-center justify-center gap-2.5 p-4 text-center max-w-xs">
          <div className={`p-3.5 rounded-2xl transition-all shadow-lg ${
            isUnavailable 
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
              : streamError
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : isConnecting
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              : 'bg-white/5 text-slate-300 border border-white/10 backdrop-blur-md'
          }`}>
            {isUnavailable ? (
              <WifiSlash size={28} weight="duotone" />
            ) : streamError ? (
              <WarningCircle size={28} weight="duotone" />
            ) : isConnecting ? (
              <ArrowsClockwise size={28} weight="duotone" className="animate-spin" />
            ) : (
              <VideoCamera size={28} weight="duotone" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-white tracking-wide">{cameraName}</span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isUnavailable
                  ? 'bg-rose-500'
                  : streamError
                  ? 'bg-amber-400'
                  : isConnecting
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-emerald-400'
              }`} />
              <span className="font-medium">
                {isUnavailable
                  ? 'Camera Offline'
                  : isConnecting
                  ? 'Connecting Live Stream...'
                  : streamError
                  ? retrySecondsLeft > 0
                    ? `Disconnected • Retrying in ${retrySecondsLeft}s`
                    : streamError
                  : rtspUrl
                  ? 'Stream Ready'
                  : 'Snapshot Feed'}
              </span>
            </div>
          </div>

          {/* Action buttons for offline/disconnected feeds */}
          {streamError && !isUnavailable && (
            <button
              onClick={handleManualRetry}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all active:scale-95 shadow-md"
            >
              <ArrowClockwise size={13} weight="bold" />
              <span>Retry Now</span>
            </button>
          )}

          {mode === 'preview' && (
            <span className="mt-0.5 text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono">
              {camera.entity_id}
            </span>
          )}
        </div>
      )}

      {/* 4. Live Protocol Badge in top corner when streaming in live mode */}
      {isStreaming && mode === 'live' && (
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="uppercase tracking-wider">{streamType === 'webrtc' ? 'LIVE • WebRTC' : 'LIVE • HLS'}</span>
        </div>
      )}

      {/* Ambient gradient vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10" />
    </div>
  );
}
