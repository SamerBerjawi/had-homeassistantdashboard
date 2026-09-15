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

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoCamera, WarningCircle, Broadcast, ArrowsClockwise, ArrowClockwise, WifiSlash } from '@phosphor-icons/react';
import Hls from 'hls.js';
import { ResolvedEntity, HAEntity } from '../../types';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';

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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const retryCountRef = useRef<number>(0);

  const { config } = useUserConfig();
  const { authState } = useAuth();
  const token = authState.tokens?.access_token || '';

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamType, setStreamType] = useState<'webrtc' | 'hls' | 'snapshot'>('snapshot');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [retrySecondsLeft, setRetrySecondsLeft] = useState<number>(0);

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

  // Stop active streams and timers
  const cleanupStream = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
    }
    setIsStreaming(false);
  }, []);

  // Forward declarations for mutual referencing in reconnect cycle
  const scheduleReconnect = useCallback((errorMsg: string) => {
    cleanupStream();
    setIsConnecting(false);
    setStreamError(errorMsg);
    onError?.(errorMsg);

    if (isUnavailable) return;

    // Exponential backoff: 3s, 5.5s, 10s, 18s, max 30s
    retryCountRef.current += 1;
    const backoffMs = Math.min(Math.round(3000 * Math.pow(1.8, Math.min(retryCountRef.current - 1, 4))), 30000);
    const seconds = Math.ceil(backoffMs / 1000);
    setRetrySecondsLeft(seconds);

    // Countdown interval
    const countdownTimer = setInterval(() => {
      setRetrySecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    reconnectTimeoutRef.current = setTimeout(() => {
      clearInterval(countdownTimer);
      setRetrySecondsLeft(0);
      initiateStreamConnection();
    }, backoffMs);
  }, [cleanupStream, isUnavailable, onError]);

  // Connect via HLS (Fallback path)
  const connectHls = useCallback(() => {
    cleanupStream();
    setIsConnecting(true);
    setStreamError(null);

    const hlsUrl = `/api/cameras/${encodeURIComponent(targetStreamId)}/hls/stream.m3u8?mp4`;

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

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);

      if (videoRef.current) {
        hls.attachMedia(videoRef.current);
      }

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsConnecting(false);
        setIsStreaming(true);
        setStreamType('hls');
        setStreamError(null);
        retryCountRef.current = 0;
        onGoLive?.();
        if (autoPlay) {
          videoRef.current?.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn(`[CameraFeed] HLS fatal error on ${cameraId}:`, data.details);
          scheduleReconnect('HLS Stream Error');
        }
      });
    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      const video = videoRef.current;
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsConnecting(false);
        setIsStreaming(true);
        setStreamType('hls');
        setStreamError(null);
        retryCountRef.current = 0;
        onGoLive?.();
        if (autoPlay) {
          video.play().catch(() => {});
        }
      }, { once: true });
      video.addEventListener('error', () => {
        scheduleReconnect('Native HLS Error');
      }, { once: true });
    } else {
      setIsConnecting(false);
      setStreamError('HLS not supported in browser');
      onError?.('HLS not supported');
    }
  }, [targetStreamId, token, autoPlay, cleanupStream, onGoLive, scheduleReconnect, onError]);

  // Connect via WebRTC (Primary low-latency path)
  const connectWebRtc = useCallback(async () => {
    cleanupStream();
    setIsConnecting(true);
    setStreamError(null);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;

      // Add receive-only transceivers for audio and video
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      let iceTimeoutId: NodeJS.Timeout | null = null;

      pc.ontrack = (event) => {
        if (iceTimeoutId) {
          clearTimeout(iceTimeoutId);
          iceTimeoutId = null;
        }
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setIsConnecting(false);
          setIsStreaming(true);
          setStreamType('webrtc');
          setStreamError(null);
          retryCountRef.current = 0;
          onGoLive?.();
          if (autoPlay) {
            videoRef.current?.play().catch(() => {});
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn(`[CameraFeed] WebRTC ICE connection failed on ${targetStreamId}. Falling back to HLS.`);
          cleanupStream();
          connectHls();
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for local ICE gathering with 1000ms safety timeout
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkIce = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkIce);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkIce);
          setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkIce);
            resolve();
          }, 1000);
        }
      });

      const sdpPayload = pc.localDescription?.sdp || offer.sdp;

      // Send offer to HAD backend go2rtc proxy
      const res = await fetch(`/api/cameras/${encodeURIComponent(targetStreamId)}/webrtc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sdp: sdpPayload, type: 'offer' })
      });

      if (!res.ok) {
        throw new Error(`WebRTC negotiation returned ${res.status}`);
      }

      const answerData = await res.json();
      if (!answerData?.sdp) {
        throw new Error('Missing SDP answer from server');
      }

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerData.sdp
      }));

      // Cloudflare Tunnel / UDP firewall watchdog:
      // If WebRTC media packets don't arrive within 4.5s (common when remote behind Cloudflare Tunnel without UDP routing),
      // seamlessly fall back to HTTP-based HLS stream
      iceTimeoutId = setTimeout(() => {
        if (pc.connectionState !== 'connected') {
          console.info(`[CameraFeed] WebRTC ICE check timed out after 4.5s on ${targetStreamId} (likely behind Cloudflare Tunnel / restricted NAT). Seamlessly failing over to HLS.`);
          cleanupStream();
          connectHls();
        }
      }, 4500);
    } catch (err: any) {
      console.warn(`[CameraFeed] WebRTC negotiation failed for ${targetStreamId}: ${err?.message}. Falling back to HLS.`);
      // Automatic fallback to HLS
      connectHls();
    }
  }, [targetStreamId, token, autoPlay, cleanupStream, connectHls, onGoLive]);

  const initiateStreamConnection = useCallback(() => {
    if (!rtspUrl || isUnavailable) {
      return;
    }
    if (effectiveProtocol === 'hls') {
      connectHls();
    } else {
      connectWebRtc();
    }
  }, [rtspUrl, isUnavailable, effectiveProtocol, connectHls, connectWebRtc]);

  // Manual retry handler
  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    retryCountRef.current = 0;
    setRetrySecondsLeft(0);
    cleanupStream();
    initiateStreamConnection();
  };

  // Initiate stream connection when appropriate
  useEffect(() => {
    onReady?.();
    initiateStreamConnection();

    return () => {
      cleanupStream();
    };
  }, [cameraId, rtspUrl, isUnavailable, effectiveProtocol, initiateStreamConnection, cleanupStream, onReady]);

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
