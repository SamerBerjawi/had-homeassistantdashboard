/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraFeed
 * Unified single-source-of-truth camera streaming component (Tunet architecture).
 *
 * Features:
 * 1. Pure capability-aware source plan calculation (getCameraSourcePlan)
 * 2. Flat state machine (sourceIndex 0..N) with automatic fallback
 * 3. Self-contained players:
 *    - CustomCameraPlayer (go2rtc sandboxed iframe escape hatch)
 *    - WebRtcCameraPlayer (Native Home Assistant camera/webrtc signaling)
 *    - HlsCameraPlayer (HLS.js / Safari native HLS with recovery)
 *    - CameraImage (Authenticated MJPEG stream & signed/cache-busted snapshots)
 * 4. Periodic interval or motion sensor-triggered snapshot refresh
 * 5. In-app HEVC / H.265 transcoding guidance with go2rtc snippet copy
 * 6. Per-camera settings modal integration
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Camera,
  Broadcast,
  ArrowsClockwise,
  WarningCircle,
  SpeakerHigh,
  SpeakerSlash,
  Play,
  Pause,
  ArrowsOut,
  ArrowsIn,
  SlidersHorizontal,
  Warning,
  Copy,
  Check,
  DownloadSimple
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import {
  getCameraWebRtcConfig,
  getCameraCapabilities,
  requestHACameraHlsStream,
  getHACameraMjpegUrl,
  getHACameraSnapshotUrl,
  signCameraPath,
  getCameraSettings,
  CameraEntitySettings,
  downloadCameraFrame
} from '../../services/haCameraService';
import { getHAHttpBaseUrl, resolveHAImageUrl } from '../../services/haImageService';
import { haWebSocketService } from '../../services/haWebSocket';
import { generateGo2RtcConfigSnippet } from '../../services/go2rtcService';
import CameraSettingsModal from './CameraSettingsModal';
import CameraNoSignalPlaceholder from '../ui/CameraNoSignalPlaceholder';

export type CameraEngine = 'auto' | 'go2rtc' | 'ha' | 'snapshot';
export type CameraSource = 'custom' | 'webrtc' | 'hls' | 'mjpeg' | 'snapshot';
export type CameraGo2rtcMode = 'auto' | 'webrtc' | 'mse';
export type CameraRefreshMode = 'interval' | 'motion';

export const SOURCE_TIMEOUT_MS = 15000;

// ============================================================================
// PURE HELPER FUNCTIONS
// ============================================================================

export function normalizeCameraStreamEngine(engine?: string): CameraEngine {
  if (engine === 'go2rtc' || engine === 'ha' || engine === 'snapshot') {
    return engine;
  }
  return 'auto';
}

export function resolveCameraTemplate(template: string, entityId: string): string {
  if (!template) return '';
  const objectId = entityId.replace(/^[a-zA-Z0-9_]+\./, '');
  return template
    .replace(/\{entity_id\}/g, entityId)
    .replace(/\{entity_object_id\}/g, objectId);
}

export function applyGo2rtcMode(url: string, mode?: 'auto' | 'webrtc' | 'mse'): string {
  if (!url || !mode || mode === 'auto') return url;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    parsed.searchParams.set('mode', mode);
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}mode=${mode}`;
  }
}

export function getCameraSourcePlan(options: {
  engine?: string;
  customUrl?: string;
  capabilities?: string[] | null;
  isSynthetic?: boolean;
}): CameraSource[] {
  const engine = normalizeCameraStreamEngine(options.engine);
  const hasCustom = Boolean(options.customUrl && options.customUrl.trim());

  if (engine === 'snapshot') {
    return ['snapshot'];
  }

  if (engine === 'go2rtc') {
    return hasCustom
      ? ['custom', 'webrtc', 'hls', 'mjpeg', 'snapshot']
      : ['webrtc', 'hls', 'mjpeg', 'snapshot'];
  }

  if (engine === 'ha') {
    if (options.capabilities?.includes('web_rtc')) {
      return ['webrtc', 'hls', 'mjpeg', 'snapshot'];
    }
    if (options.capabilities?.includes('hls')) {
      return ['hls', 'mjpeg', 'snapshot'];
    }
    return ['mjpeg', 'snapshot'];
  }

  // 'auto' default
  if (hasCustom) {
    return ['custom', 'webrtc', 'hls', 'mjpeg', 'snapshot'];
  }
  if (options.capabilities?.includes('web_rtc')) {
    return ['webrtc', 'hls', 'mjpeg', 'snapshot'];
  }
  if (options.capabilities?.includes('hls')) {
    return ['hls', 'mjpeg', 'snapshot'];
  }
  return ['webrtc', 'hls', 'mjpeg', 'snapshot'];
}

// ============================================================================
// SUB-PLAYER 1: CUSTOM GO2RTC IFRAME PLAYER
// ============================================================================

interface CustomCameraPlayerProps {
  url: string;
  onReady: () => void;
  onError: (reason: string) => void;
  muted?: boolean;
}

export function CustomCameraPlayer({ url, onReady, onError }: CustomCameraPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onError('go2rtc iframe connection timed out');
    }, SOURCE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [onError]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title="go2rtc Live Stream"
      className="w-full h-full border-0 bg-black"
      allow="autoplay; fullscreen; microphone; camera"
      sandbox="allow-scripts allow-same-origin allow-forms"
      onLoad={() => {
        // Small delay to allow canvas / video in iframe to initialize
        setTimeout(onReady, 400);
      }}
      onError={() => onError('Failed to load go2rtc iframe')}
    />
  );
}

// ============================================================================
// SUB-PLAYER 2: NATIVE HOME ASSISTANT WEBRTC PLAYER
// ============================================================================

interface WebRtcCameraPlayerProps {
  entityId: string;
  serverUrl?: string;
  onReady: () => void;
  onError: (reason: string) => void;
  muted?: boolean;
  autoPlay?: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function WebRtcCameraPlayer({
  entityId,
  onReady,
  onError,
  muted = true,
  autoPlay = true,
  videoRef
}: WebRtcCameraPlayerProps) {
  useEffect(() => {
    let pc: RTCPeerConnection | null = null;
    let isCleanedUp = false;

    const timeoutTimer = setTimeout(() => {
      if (!isCleanedUp) {
        onError('WebRTC handshake timed out (15s)');
      }
    }, SOURCE_TIMEOUT_MS);

    async function startWebRtc() {
      try {
        if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
          onError('HA offline or in demo mode');
          return;
        }

        // 1. Get ICE config
        const rtcConfig = await getCameraWebRtcConfig(entityId);
        if (isCleanedUp) return;

        pc = new RTCPeerConnection(rtcConfig);

        // 2. Setup transceivers
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        // 3. Handle incoming stream
        pc.ontrack = (event) => {
          if (isCleanedUp) return;
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            videoRef.current.play().catch(() => {});
            clearTimeout(timeoutTimer);
            onReady();
          }
        };

        // 4. Handle ICE candidate trickle
        pc.onicecandidate = (event) => {
          if (isCleanedUp || !event.candidate) return;
          haWebSocketService
            .sendRequest('camera/webrtc/candidate', {
              entity_id: entityId,
              candidate: event.candidate.candidate
            })
            .catch(() => {});
        };

        // 5. Handle connection state changes
        pc.onconnectionstatechange = () => {
          if (isCleanedUp || !pc) return;
          if (pc.connectionState === 'connected') {
            clearTimeout(timeoutTimer);
            onReady();
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            onError(`WebRTC connection state: ${pc.connectionState}`);
          }
        };

        // 6. Create & send offer
        const offer = await pc.createOffer();
        if (isCleanedUp) return;
        await pc.setLocalDescription(offer);

        const response = await haWebSocketService.sendRequest<{ answer: string }>(
          'camera/webrtc/offer',
          {
            entity_id: entityId,
            offer: offer.sdp
          }
        );

        if (isCleanedUp) return;

        if (response?.answer) {
          await pc.setRemoteDescription({
            type: 'answer',
            sdp: response.answer
          });
        } else {
          onError('Empty SDP answer received from Home Assistant');
        }
      } catch (err: any) {
        if (!isCleanedUp) {
          onError(err?.message || 'WebRTC initiation failed');
        }
      }
    }

    startWebRtc();

    return () => {
      isCleanedUp = true;
      clearTimeout(timeoutTimer);
      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        try {
          pc.getSenders().forEach((s) => s.track?.stop());
          pc.close();
        } catch {
          // ignore
        }
        pc = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [entityId, onError, onReady, videoRef]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      autoPlay={autoPlay}
      playsInline
      className="w-full h-full object-cover bg-black"
    />
  );
}

// ============================================================================
// SUB-PLAYER 3: HLS STREAM PLAYER (Native Safari or HLS.js)
// ============================================================================

interface HlsCameraPlayerProps {
  entityId: string;
  serverUrl?: string;
  onReady: () => void;
  onError: (reason: string) => void;
  muted?: boolean;
  autoPlay?: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function HlsCameraPlayer({
  entityId,
  serverUrl,
  onReady,
  onError,
  muted = true,
  autoPlay = true,
  videoRef
}: HlsCameraPlayerProps) {
  useEffect(() => {
    let hls: Hls | null = null;
    let isCleanedUp = false;
    let networkRetry = 0;
    let mediaRetry = 0;

    const timeoutTimer = setTimeout(() => {
      if (!isCleanedUp) {
        onError('HLS stream initialization timed out (15s)');
      }
    }, SOURCE_TIMEOUT_MS);

    async function initHls() {
      try {
        const streamInfo = await requestHACameraHlsStream(entityId, serverUrl);
        if (isCleanedUp) return;

        if (!streamInfo?.hlsUrl) {
          onError('Failed to acquire HLS stream URL from Home Assistant');
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        const hlsUrl = streamInfo.hlsUrl;

        // Native Safari / iOS HLS
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
          video.onloadedmetadata = () => {
            if (isCleanedUp) return;
            video.play().catch(() => {});
            clearTimeout(timeoutTimer);
            onReady();
          };
          video.onerror = () => {
            if (!isCleanedUp) onError('Safari native HLS video error');
          };
          return;
        }

        // HLS.js with resilient recovery
        if (Hls.isSupported()) {
          hls = new Hls({
            liveSyncDurationCount: 2,
            maxLiveSyncPlaybackRate: 1.5,
            maxBufferLength: 4,
            enableWorker: true
          });

          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isCleanedUp) return;
            video.play().catch(() => {});
            clearTimeout(timeoutTimer);
            onReady();
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (isCleanedUp || !hls) return;
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  if (networkRetry < 1) {
                    networkRetry++;
                    hls.startLoad();
                  } else {
                    onError('HLS network error');
                  }
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  if (mediaRetry < 1) {
                    mediaRetry++;
                    hls.recoverMediaError();
                  } else {
                    onError('HLS media decode error');
                  }
                  break;
                default:
                  onError(`Fatal HLS error: ${data.details}`);
                  break;
              }
            }
          });
        } else {
          onError('HLS is not supported in this browser');
        }
      } catch (e: any) {
        if (!isCleanedUp) onError(e?.message || 'HLS setup failed');
      }
    }

    initHls();

    return () => {
      isCleanedUp = true;
      clearTimeout(timeoutTimer);
      if (hls) {
        hls.destroy();
        hls = null;
      }
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.onerror = null;
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, [entityId, serverUrl, onError, onReady, videoRef]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      autoPlay={autoPlay}
      playsInline
      className="w-full h-full object-cover bg-black"
    />
  );
}

// ============================================================================
// SUB-PLAYER 4: IMAGE / MJPEG / SNAPSHOT PLAYER
// ============================================================================

interface CameraImageProps {
  entityId: string;
  source: 'mjpeg' | 'snapshot';
  serverUrl?: string;
  refreshMode?: CameraRefreshMode;
  refreshInterval?: number;
  motionSensor?: string;
  onReady: () => void;
  onError: (reason: string) => void;
}

export function CameraImage({
  entityId,
  source,
  serverUrl,
  refreshMode = 'interval',
  refreshInterval = 10,
  motionSensor,
  onReady,
  onError
}: CameraImageProps) {
  const [snapshotSrc, setSnapshotSrc] = useState<string>('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  // Function to request a fresh snapshot URL (signed path or proxy with ts)
  const refreshSnapshot = useCallback(async () => {
    try {
      const signed = await signCameraPath(`/api/camera_proxy/${entityId}`);
      if (signed) {
        const baseUrl = getHAHttpBaseUrl(serverUrl || haWebSocketService.getCurrentUrl());
        const full = signed.startsWith('http') ? signed : `${baseUrl}${signed}`;
        setSnapshotSrc(`${full}&_ts=${Date.now()}`);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback to standard authenticated proxy snapshot URL
    const fallbackUrl = getHACameraSnapshotUrl(entityId, serverUrl);
    const sep = fallbackUrl.includes('?') ? '&' : '?';
    setSnapshotSrc(`${fallbackUrl}${sep}_ts=${Date.now()}`);
  }, [entityId, serverUrl]);

  // Initial load
  useEffect(() => {
    if (source === 'mjpeg') {
      const mjpegUrl = getHACameraMjpegUrl(entityId, serverUrl);
      setSnapshotSrc(mjpegUrl);
    } else {
      refreshSnapshot();
    }
  }, [source, entityId, serverUrl, refreshSnapshot]);

  // Interval-based refresh
  useEffect(() => {
    if (source !== 'snapshot' || refreshMode !== 'interval') return;
    const intervalMs = Math.max(2, refreshInterval) * 1000;
    const intervalTimer = setInterval(refreshSnapshot, intervalMs);
    return () => clearInterval(intervalTimer);
  }, [source, refreshMode, refreshInterval, refreshSnapshot]);

  // Motion sensor-triggered refresh
  useEffect(() => {
    if (source !== 'snapshot' || refreshMode !== 'motion' || !motionSensor) return;

    let previousState = useAutoLayoutStore.getState().rawStates?.[motionSensor]?.state;

    const unsubscribe = useAutoLayoutStore.subscribe((state) => {
      const currentSensor = state.rawStates?.[motionSensor];
      const currentState = currentSensor?.state;
      if (currentState === 'on' && previousState !== 'on') {
        refreshSnapshot();
      }
      previousState = currentState;
    });

    return () => {
      unsubscribe();
    };
  }, [source, refreshMode, motionSensor, refreshSnapshot]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      {snapshotSrc && (
        <img
          src={snapshotSrc}
          alt={entityId}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isImgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            setIsImgLoaded(true);
            onReady();
          }}
          onError={() => {
            onError(source === 'mjpeg' ? 'MJPEG stream failed' : 'Snapshot load failed');
          }}
        />
      )}
      {!isImgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <ArrowsClockwise size={24} className="text-cyan-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: CAMERA FEED
// ============================================================================

export interface CameraFeedProps {
  camera: ResolvedEntity | { entity_id: string; name?: string; attributes?: any; state?: string };
  mode?: 'live' | 'preview';
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  preferProtocol?: CameraEngine;
  onReady?: () => void;
  onError?: (err: string) => void;
}

export default function CameraFeed({
  camera,
  mode = 'live',
  darkMode = true,
  className = '',
  showControls = true,
  autoPlay = true,
  muted: defaultMuted = true,
  preferProtocol,
  onReady,
  onError
}: CameraFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { serverUrl } = useAutoLayoutStore();
  const entityId = camera?.entity_id || '';
  const cameraName =
    (camera as any)?.name || (camera as any)?.attributes?.friendly_name || entityId || 'Camera';
  const rtspUrl = (camera as any)?.attributes?.rtsp_url;
  const isRtsp =
    (camera as any)?.attributes?.is_rtsp_stream ||
    (camera as any)?.attributes?.stream_source === 'go2rtc' ||
    entityId.startsWith('go2rtc.');

  // Per-camera settings
  const [settings, setSettings] = useState<CameraEntitySettings>(() => getCameraSettings(entityId));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Capabilities
  const [capabilities, setCapabilities] = useState<string[] | null>(null);

  // State Machine
  const [sourceIndex, setSourceIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  // Playback controls
  const [isMuted, setIsMuted] = useState(defaultMuted);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Listen to external settings changes
  useEffect(() => {
    const handleSettingsChanged = (e: any) => {
      if (e.detail?.entityId === entityId) {
        setSettings(e.detail.settings);
        setSourceIndex(0); // Reset state machine on settings update
      }
    };
    window.addEventListener('homz_camera_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('homz_camera_settings_changed', handleSettingsChanged);
  }, [entityId]);

  // Load capabilities on mount
  useEffect(() => {
    if (!entityId) return;
    getCameraCapabilities(entityId).then((caps) => {
      setCapabilities(caps);
    });
  }, [entityId]);

  // Derive source plan
  const effectiveEngine = preferProtocol || (mode === 'preview' ? 'snapshot' : settings.cameraStreamEngine);
  const sourcePlan = useMemo(() => {
    return getCameraSourcePlan({
      engine: effectiveEngine,
      customUrl: settings.cameraWebrtcUrl,
      capabilities,
      isSynthetic: entityId.startsWith('go2rtc.')
    });
  }, [effectiveEngine, settings.cameraWebrtcUrl, capabilities, entityId]);

  const activeSource: CameraSource | undefined = sourcePlan[sourceIndex];

  // Resolve custom go2rtc iframe URL if custom source active
  const resolvedCustomUrl = useMemo(() => {
    if (activeSource !== 'custom' || !settings.cameraWebrtcUrl) return '';
    const raw = resolveCameraTemplate(settings.cameraWebrtcUrl, entityId);
    return applyGo2rtcMode(raw, settings.cameraGo2rtcMode);
  }, [activeSource, settings.cameraWebrtcUrl, entityId, settings.cameraGo2rtcMode]);

  // Advance state machine on error
  const handlePlayerError = useCallback(
    (reason: string) => {
      console.warn(`[CameraFeed] ${entityId} source "${activeSource}" failed: ${reason}`);
      setIsReady(false);
      if (sourceIndex + 1 < sourcePlan.length) {
        setSourceIndex((prev) => prev + 1);
      } else {
        setErrorReason(reason);
        onError?.(reason);
      }
    },
    [entityId, activeSource, sourceIndex, sourcePlan.length, onError]
  );

  const handlePlayerReady = useCallback(() => {
    setIsReady(true);
    setErrorReason(null);
    onReady?.();
  }, [onReady]);

  // Reset to source 0
  const handleRetry = () => {
    setErrorReason(null);
    setSourceIndex(0);
    setIsReady(false);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Capture frame
  const handleSnapshotDownload = async () => {
    setIsDownloading(true);
    const video = videoRef.current;
    await downloadCameraFrame(video, camera as ResolvedEntity);
    setTimeout(() => setIsDownloading(false), 1000);
  };

  // Copy HEVC config snippet
  const handleCopySnippet = async () => {
    const snippet = generateGo2RtcConfigSnippet(entityId, rtspUrl);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // ignore
    }
  };

  // Protocol label badge helper
  const protocolBadge = useMemo(() => {
    switch (activeSource) {
      case 'custom':
        return { label: 'GO2RTC IFRAME', color: 'bg-purple-500/80 text-purple-100 border-purple-400' };
      case 'webrtc':
        return { label: 'WEBRTC', color: 'bg-emerald-500/80 text-emerald-950 font-black border-emerald-400' };
      case 'hls':
        return { label: 'HLS STREAM', color: 'bg-sky-500/80 text-sky-950 font-black border-sky-400' };
      case 'mjpeg':
        return { label: 'MJPEG PROXY', color: 'bg-amber-500/80 text-amber-950 font-black border-amber-400' };
      case 'snapshot':
        return { label: 'SNAPSHOT', color: 'bg-slate-700/80 text-slate-100 border-slate-500' };
      default:
        return { label: 'OFFLINE', color: 'bg-rose-500/80 text-white border-rose-400' };
    }
  }, [activeSource]);

  // Show HEVC advice if RTSP/Eufy camera failed WebRTC or HLS
  const showHevcNotice =
    (isRtsp || entityId.includes('eufy') || entityId.includes('rtsp')) &&
    (activeSource === 'mjpeg' || activeSource === 'snapshot' || Boolean(errorReason));

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none isolate ${className}`}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTIVE SOURCE PLAYER                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {errorReason ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950">
          <CameraNoSignalPlaceholder
            title={cameraName}
            subtitle={`All stream protocols exhausted: ${errorReason}`}
            compact={mode === 'preview'}
          />
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : activeSource === 'custom' && resolvedCustomUrl ? (
        <CustomCameraPlayer
          url={resolvedCustomUrl}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          muted={isMuted}
        />
      ) : activeSource === 'webrtc' ? (
        <WebRtcCameraPlayer
          entityId={entityId}
          serverUrl={serverUrl}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          muted={isMuted}
          autoPlay={autoPlay && !isPaused}
          videoRef={videoRef}
        />
      ) : activeSource === 'hls' ? (
        <HlsCameraPlayer
          entityId={entityId}
          serverUrl={serverUrl}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          muted={isMuted}
          autoPlay={autoPlay && !isPaused}
          videoRef={videoRef}
        />
      ) : activeSource === 'mjpeg' || activeSource === 'snapshot' ? (
        <CameraImage
          entityId={entityId}
          source={activeSource}
          serverUrl={serverUrl}
          refreshMode={settings.cameraRefreshMode}
          refreshInterval={settings.cameraRefreshInterval}
          motionSensor={settings.cameraMotionSensor}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <ArrowsClockwise size={24} className="text-cyan-400 animate-spin" />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HUD OVERLAYS & CONTROLS                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showControls && (
        <>
          {/* Top Row: Protocol Status Badge & Settings Toggle */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none">
            <div className="flex items-center gap-2">
              <div
                className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase border backdrop-blur-md shadow-md flex items-center gap-1.5 ${protocolBadge.color}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{protocolBadge.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                title="Camera Stream Settings"
                className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-md"
              >
                <SlidersHorizontal size={14} weight="bold" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-md"
              >
                {isFullscreen ? <ArrowsIn size={14} weight="bold" /> : <ArrowsOut size={14} weight="bold" />}
              </button>
            </div>
          </div>

          {/* Bottom Bar: Action Toolbar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Play/Pause (for WebRTC/HLS) */}
              {(activeSource === 'webrtc' || activeSource === 'hls') && (
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPaused) {
                        videoRef.current.play().catch(() => {});
                        setIsPaused(false);
                      } else {
                        videoRef.current.pause();
                        setIsPaused(true);
                      }
                    }
                  }}
                  className="p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-md"
                >
                  {isPaused ? <Play size={15} weight="fill" /> : <Pause size={15} weight="fill" />}
                </button>
              )}

              {/* Mute/Unmute */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-md"
              >
                {isMuted ? <SpeakerSlash size={15} weight="bold" /> : <SpeakerHigh size={15} weight="bold" />}
              </button>

              {/* Snapshot Download */}
              <button
                type="button"
                onClick={handleSnapshotDownload}
                title="Download snapshot"
                className="p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-md"
              >
                <DownloadSimple size={15} weight="bold" className={isDownloading ? 'animate-bounce' : ''} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HEVC / H.265 COMPATIBILITY BANNER                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showHevcNotice && mode === 'live' && (
        <div className="absolute bottom-3 left-3 right-3 z-30 p-2.5 rounded-2xl bg-amber-950/90 border border-amber-500/40 text-amber-200 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Warning size={16} weight="fill" className="text-amber-400 shrink-0" />
            <span className="truncate">
              RTSP stream likely using H.265/HEVC. Add <code className="font-bold text-white bg-black/40 px-1 rounded">#video=h264</code> in go2rtc.yaml for hardware WebRTC.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopySnippet}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0 flex items-center gap-1 transition-colors cursor-pointer shadow-sm hover:bg-amber-400"
          >
            {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedSnippet ? 'Copied' : 'Copy Config'}</span>
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CAMERA SETTINGS MODAL                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <CameraSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        entityId={entityId}
        cameraName={cameraName}
        rtspUrl={rtspUrl}
        darkMode={darkMode}
        onSettingsSaved={(newSettings) => {
          setSettings(newSettings);
          setSourceIndex(0);
        }}
      />
    </div>
  );
}
