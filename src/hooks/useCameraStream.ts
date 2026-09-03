/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multi-Tier Camera Stream Pipeline Orchestrator Hook:
 *
 * Modes:
 * - Preview Mode ('preview'): Lightweight periodic snapshot polling (every 3-6s), zero WebRTC/HLS negotiation load.
 * - Live Mode ('live'): Full multi-tier streaming pipeline gated by StreamConcurrencyManager:
 *   Tier 1: Native HA WebRTC via duplex WebSocket signaling (4s timeout budget)
 *   Tier 2: HA HLS Stream via `camera/get_stream` with hls.js / native WebKit HLS (6s timeout budget)
 *   Tier 3: Authenticated MJPEG Proxy Stream (`/api/camera_proxy_stream`)
 *   Tier 4: Static Snapshot fallback
 *
 * Includes session-tier memory to avoid repeated WebRTC timeouts on cameras known to land on HLS/MJPEG.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { haWebSocketService } from '../services/haWebSocket';
import {
  requestHACameraHlsStream,
  getHACameraMjpegUrl,
  getHACameraSnapshotUrl,
  getHACameraPreviewSnapshotUrl,
  getCameraCodecPreference,
  CameraCodecMode
} from '../services/haCameraService';
import { useCameraWebRtc } from './useCameraWebRtc';
import { useCameraMse } from './useCameraMse';
import { getActiveHAToken } from '../services/haAuth';
import { streamConcurrencyManager } from '../services/streamConcurrencyManager';

export const WEBRTC_TIMEOUT_MS = 4000;
export const HLS_SETUP_TIMEOUT_MS = 6000;
export const PREVIEW_REFRESH_INTERVAL_MS = 4000;

export type StreamProtocol = 'mse' | 'webrtc' | 'hls' | 'mjpeg' | 'snapshot' | 'demo' | 'none';
export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'fallback' | 'failed' | 'paused' | 'demo';
export type StreamMode = 'preview' | 'live';

// In-memory session tier memory (remembers successful tier per entity for the active session: 0=MSE, 1=WebRTC, 2=HLS, 3=MJPEG)
const sessionTierMemory = new Map<string, 0 | 1 | 2 | 3>();

/**
 * Resets the in-memory tier memory for an entity or all entities, forcing Tier 1 on next live stream open.
 */
export function resetCameraTierMemory(entityId?: string): void {
  if (entityId) {
    sessionTierMemory.delete(entityId);
  } else {
    sessionTierMemory.clear();
  }
}

export interface UseCameraStreamOptions {
  mode?: StreamMode;
  enabled?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  enableIntercom?: boolean;
  serverUrl?: string;
  streamName?: string;
  preferProtocol?: 'auto' | 'mse' | 'webrtc' | 'hls' | 'mjpeg';
  codecMode?: CameraCodecMode;
  previewIntervalMs?: number;
  elementRef?: React.RefObject<HTMLElement | null>;
  onStreamReady?: (protocol: StreamProtocol) => void;
  onError?: (err: string) => void;
}

export interface CameraStreamResult {
  mode: StreamMode;
  status: StreamStatus;
  protocol: StreamProtocol;
  mediaStream: MediaStream | null;
  hlsUrl: string | null;
  mjpegUrl: string | null;
  snapshotUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
  isCodecMismatch: boolean;
  isPaused: boolean;
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
  togglePause: () => void;
  reconnect: () => void;
  retryFromWebRtc: () => void;
}

export function useCameraStream(
  entityId: string,
  options: UseCameraStreamOptions = {}
): CameraStreamResult {
  const {
    mode = 'live',
    enabled = true,
    autoPlay = true,
    muted = true,
    enableIntercom = false,
    serverUrl,
    streamName,
    preferProtocol = 'auto',
    codecMode,
    previewIntervalMs = PREVIEW_REFRESH_INTERVAL_MS,
    elementRef,
    onStreamReady,
    onError
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const concurrencyReleaseRef = useRef<(() => void) | null>(null);

  const [isVisible, setIsVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(muted);
  const [hasNegotiationSlot, setHasNegotiationSlot] = useState(false);

  // Derive initial tier from session memory or preferences: 0 = MSE, 1 = WebRTC, 2 = HLS, 3 = MJPEG, 4 = Snapshot
  const getInitialTier = useCallback((): 0 | 1 | 2 | 3 | 4 => {
    if (preferProtocol === 'mse') return 0;
    if (preferProtocol === 'webrtc') return 1;
    if (preferProtocol === 'hls') return 2;
    if (preferProtocol === 'mjpeg') return 3;
    const remembered = sessionTierMemory.get(entityId);
    if (remembered !== undefined) return remembered as any;
    // Default to MSE (Tier 0) for ALL camera entities (both camera.* and go2rtc.*)
    return 0;
  }, [entityId, preferProtocol]);

  // Active protocol state: 0 = MSE, 1 = WebRTC, 2 = HLS, 3 = MJPEG, 4 = Snapshot fallback
  const [activeTier, setActiveTier] = useState<0 | 1 | 2 | 3 | 4>(getInitialTier);
  const [protocol, setProtocol] = useState<StreamProtocol>(mode === 'preview' ? 'snapshot' : 'none');
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCodecMismatch, setIsCodecMismatch] = useState(false);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [mjpegUrl, setMjpegUrl] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(() => {
    return getHACameraSnapshotUrl(entityId, serverUrl);
  });
  const [retryCounter, setRetryCounter] = useState(0);

  // Sync activeTier dynamically if preferProtocol changes
  useEffect(() => {
    if (preferProtocol === 'mse') {
      setActiveTier(0);
    } else if (preferProtocol === 'webrtc') {
      setActiveTier(1);
    } else if (preferProtocol === 'hls') {
      setActiveTier(2);
    } else if (preferProtocol === 'mjpeg') {
      setActiveTier(3);
    }
  }, [preferProtocol]);

  const isStreamActive = enabled && isVisible && isTabActive && !isPaused;
  const effectiveCodecMode = codecMode || getCameraCodecPreference(entityId);

  // Helper to release concurrency slot
  const releaseConcurrencySlot = useCallback(() => {
    if (concurrencyReleaseRef.current) {
      concurrencyReleaseRef.current();
      concurrencyReleaseRef.current = null;
    }
    setHasNegotiationSlot(false);
  }, []);

  // 1. IntersectionObserver to detect when tile is visible in viewport
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    let targetElement = elementRef?.current || videoRef.current;
    if (!targetElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry) {
          if (entry.boundingClientRect.width === 0 && entry.boundingClientRect.height === 0) {
            setIsVisible(true);
          } else {
            setIsVisible(entry.isIntersecting);
          }
        }
      },
      { threshold: [0, 0.05] }
    );

    observer.observe(targetElement);
    return () => {
      observer.disconnect();
    };
  }, [elementRef]);

  // 2. Tab Visibility Listener
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // -------------------------------------------------------------
  // PREVIEW MODE: Periodic snapshot polling, zero live negotiation
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'preview') return;

    // Set initial snapshot URL
    setSnapshotUrl(getHACameraPreviewSnapshotUrl(entityId, serverUrl, undefined, Date.now()));
    setProtocol('snapshot');
    setStatus('connected');
    setErrorMessage(null);

    if (!isStreamActive) return;

    const intervalTimer = setInterval(() => {
      setSnapshotUrl(getHACameraPreviewSnapshotUrl(entityId, serverUrl, undefined, Date.now()));
    }, previewIntervalMs);

    return () => {
      clearInterval(intervalTimer);
    };
  }, [mode, entityId, serverUrl, isStreamActive, previewIntervalMs, retryCounter]);

  // -------------------------------------------------------------
  // LIVE MODE: Concurrency Limiter Slot Acquisition
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'live' || !isStreamActive || (activeTier !== 1 && activeTier !== 2)) {
      releaseConcurrencySlot();
      return;
    }

    let isCancelled = false;
    setStatus('connecting');
    setErrorMessage('Acquiring stream slot...');

    streamConcurrencyManager.acquireSlot(entityId, 1, 12000).then((release) => {
      if (isCancelled) {
        release();
        return;
      }
      concurrencyReleaseRef.current = release;
      setHasNegotiationSlot(true);
      setErrorMessage(null);
    });

    return () => {
      isCancelled = true;
      releaseConcurrencySlot();
    };
  }, [mode, entityId, isStreamActive, activeTier, retryCounter, releaseConcurrencySlot]);

  // -------------------------------------------------------------
  // LIVE MODE - TIER 0: go2rtc MSE (Media Source Extensions)
  // -------------------------------------------------------------
  const isMseEligible =
    mode === 'live' &&
    isStreamActive &&
    activeTier === 0 &&
    preferProtocol !== 'hls' &&
    preferProtocol !== 'mjpeg';

  const mse = useCameraMse(entityId, {
    enabled: isMseEligible,
    serverUrl,
    streamName,
    muted: isAudioMuted,
    videoRef,
    onConnected: () => {
      setProtocol('mse');
      setStatus('connected');
      setErrorMessage(null);
      setIsCodecMismatch(false);
      sessionTierMemory.set(entityId, 0);
      releaseConcurrencySlot();
      onStreamReady?.('mse');
    },
    onError: (err) => {
      console.warn(`[useCameraStream] MSE failed for ${entityId}: ${err}, stepping to next tier`);
      if (preferProtocol === 'mse') {
        setActiveTier(2);
      } else {
        setActiveTier(1);
      }
    }
  });

  useEffect(() => {
    if (activeTier === 0 && mse.status === 'connected') {
      setProtocol('mse');
      setStatus('connected');
    }
  }, [activeTier, mse.status]);

  // -------------------------------------------------------------
  // LIVE MODE - TIER 1: WebRTC
  // -------------------------------------------------------------
  const isWebRtcEligible =
    mode === 'live' &&
    isStreamActive &&
    hasNegotiationSlot &&
    activeTier === 1 &&
    preferProtocol !== 'hls' &&
    preferProtocol !== 'mjpeg';

  const webrtc = useCameraWebRtc(entityId, {
    enabled: isWebRtcEligible,
    enableIntercom,
    timeoutMs: WEBRTC_TIMEOUT_MS,
    codecMode: effectiveCodecMode,
    onConnected: () => {
      setProtocol('webrtc');
      setStatus('connected');
      setErrorMessage(null);
      setIsCodecMismatch(false);
      sessionTierMemory.set(entityId, 1);
      releaseConcurrencySlot();
      onStreamReady?.('webrtc');
    },
    onFallback: (reason, isCodecIssue) => {
      console.warn(`[useCameraStream] WebRTC fallback triggered for ${entityId}: ${reason}`);
      if (isCodecIssue) {
        setIsCodecMismatch(true);
      }
      // Step up to Tier 2 (HLS)
      setActiveTier(2);
    },
    onError: (err) => {
      onError?.(err);
    }
  });

  // Attach WebRTC stream to HTMLVideoElement when available and monitor for black screen
  useEffect(() => {
    if (mode !== 'live' || activeTier !== 1 || !webrtc.stream || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.srcObject !== webrtc.stream) {
      video.srcObject = webrtc.stream;
    }

    // Ensure muted is true initially to satisfy browser autoplay policy
    video.muted = isAudioMuted;
    video.play().catch(async (err) => {
      // If browser blocked unmuted autoplay, mute and retry immediately
      if (err?.name === 'NotAllowedError' && !video.muted) {
        video.muted = true;
        setIsAudioMuted(true);
        await video.play().catch(() => {});
      }
    });

    setProtocol('webrtc');
    setStatus('connected');

    // Black-frame / codec-incompatibility watchdog:
    // If after 3.5s the video element has not decoded any visual frames (videoWidth === 0 or readyState < 2),
    // WebRTC connection succeeded on network but browser decoder cannot render the stream (e.g. H.265).
    // Automatically step down to Tier 2 (HLS) or Tier 3 (MJPEG).
    const frameCheckTimer = setTimeout(() => {
      if (!video) return;
      const isBlank = video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2;
      if (isBlank) {
        console.warn(`[useCameraStream] WebRTC connected but no video frames rendered after 3.5s for ${entityId}. Triggering automatic fallback to HLS/MJPEG.`);
        setIsCodecMismatch(true);
        setActiveTier(2);
      } else {
        sessionTierMemory.set(entityId, 1);
      }
    }, 3500);

    return () => {
      clearTimeout(frameCheckTimer);
    };
  }, [mode, activeTier, webrtc.stream, entityId, isAudioMuted]);

  // -------------------------------------------------------------
  // LIVE MODE - TIER 2: HLS Stream
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'live' || !isStreamActive || activeTier !== 2 || preferProtocol === 'mjpeg') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    let isCancelled = false;
    let hlsTimeoutTimer: any = null;

    setStatus('connecting');
    setErrorMessage('Initiating Home Assistant HLS stream...');

    // HLS Setup Timeout Budget (6s)
    hlsTimeoutTimer = setTimeout(() => {
      if (!isCancelled) {
        console.warn(`[useCameraStream] HLS setup timed out after ${HLS_SETUP_TIMEOUT_MS / 1000}s for ${entityId}, stepping to Tier 3 (MJPEG)`);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        releaseConcurrencySlot();
        setActiveTier(3);
      }
    }, HLS_SETUP_TIMEOUT_MS);

    const setupHls = async () => {
      try {
        const streamResult = await requestHACameraHlsStream(entityId, serverUrl);
        if (isCancelled) return;

        if (!streamResult || !streamResult.hlsUrl) {
          console.warn(`[useCameraStream] HLS stream request returned empty URL for ${entityId}. Stepping to Tier 3 (MJPEG)`);
          if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
          releaseConcurrencySlot();
          setActiveTier(3);
          return;
        }

        const activeToken = haWebSocketService.getCurrentToken() || getActiveHAToken();
        let authenticatedHlsUrl = streamResult.hlsUrl;
        if (activeToken && !authenticatedHlsUrl.includes('token=')) {
          authenticatedHlsUrl += (authenticatedHlsUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(activeToken)}`;
        }

        setHlsUrl(authenticatedHlsUrl);
        const video = videoRef.current;
        if (!video) return;

        if (video.srcObject) {
          video.srcObject = null;
        }

        // Native Safari / iOS WebKit HLS
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = authenticatedHlsUrl;
          video.addEventListener('loadedmetadata', () => {
            if (isCancelled) return;
            if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
            video.play().catch(() => {});
            setProtocol('hls');
            setStatus('connected');
            setErrorMessage(null);
            sessionTierMemory.set(entityId, 2);
            releaseConcurrencySlot();
            onStreamReady?.('hls');
          }, { once: true });
          return;
        }

        // Hls.js for Chrome, Firefox, Edge, Android
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 5,
            xhrSetup: (xhr) => {
              if (activeToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
              }
            }
          });

          hlsRef.current = hls;
          hls.loadSource(authenticatedHlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isCancelled) return;
            if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
            video.play().catch(() => {});
            setProtocol('hls');
            setStatus('connected');
            setErrorMessage(null);
            sessionTierMemory.set(entityId, 2);
            releaseConcurrencySlot();
            onStreamReady?.('hls');
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (isCancelled) return;
            if (data.fatal) {
              console.warn('[useCameraStream] Fatal HLS error, falling back to MJPEG:', data.details);
              if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
              hls.destroy();
              hlsRef.current = null;
              releaseConcurrencySlot();
              setActiveTier(3);
            }
          });
        } else {
          if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
          releaseConcurrencySlot();
          setActiveTier(3);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[useCameraStream] HLS initialization error:', err);
          if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
          releaseConcurrencySlot();
          setActiveTier(3);
        }
      }
    };

    setupHls();

    return () => {
      isCancelled = true;
      if (hlsTimeoutTimer) clearTimeout(hlsTimeoutTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [mode, entityId, isStreamActive, activeTier, preferProtocol, serverUrl, retryCounter, onStreamReady, releaseConcurrencySlot]);

  // -------------------------------------------------------------
  // LIVE MODE - TIER 3: MJPEG Proxy
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'live' || !isStreamActive || activeTier !== 3) {
      setMjpegUrl(null);
      return;
    }

    releaseConcurrencySlot();
    const mjpegStreamUrl = getHACameraMjpegUrl(entityId, serverUrl);
    setMjpegUrl(mjpegStreamUrl);
    setProtocol('mjpeg');
    setStatus('connected');
    setErrorMessage(null);
    sessionTierMemory.set(entityId, 3);
    onStreamReady?.('mjpeg');
  }, [mode, entityId, isStreamActive, activeTier, serverUrl, retryCounter, onStreamReady, releaseConcurrencySlot]);

  // -------------------------------------------------------------
  // LIVE MODE - TIER 4: Snapshot Fallback
  // -------------------------------------------------------------
  useEffect(() => {
    if (mode === 'live' && activeTier === 4) {
      releaseConcurrencySlot();
      const snapUrl = getHACameraSnapshotUrl(entityId, serverUrl);
      setSnapshotUrl(snapUrl);
      setProtocol('snapshot');
      setStatus('connected');
    }
  }, [mode, entityId, activeTier, serverUrl, retryCounter, releaseConcurrencySlot]);

  // -------------------------------------------------------------
  // Demo Mode Handling
  // -------------------------------------------------------------
  useEffect(() => {
    if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
      setStatus('demo');
      setProtocol('demo');
    }
  }, [retryCounter]);

  // Sync mute state to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted]);

  // Reconnection action
  const reconnect = useCallback(() => {
    setActiveTier(getInitialTier());
    setErrorMessage(null);
    setStatus('connecting');
    setRetryCounter((c) => c + 1);
    webrtc.reconnect();
  }, [getInitialTier, webrtc]);

  // Manual retry from WebRTC (clears session memory)
  const retryFromWebRtc = useCallback(() => {
    sessionTierMemory.delete(entityId);
    setActiveTier(1);
    setErrorMessage(null);
    setStatus('connecting');
    setRetryCounter((c) => c + 1);
    webrtc.reconnect();
  }, [entityId, webrtc]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next && videoRef.current) {
        videoRef.current.pause();
      } else if (!next && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      return next;
    });
  }, []);

  return {
    mode,
    status: !isStreamActive && isPaused ? 'paused' : status,
    protocol,
    mediaStream: webrtc.stream,
    hlsUrl,
    mjpegUrl,
    snapshotUrl,
    videoRef,
    error: errorMessage || webrtc.error,
    isCodecMismatch: isCodecMismatch || webrtc.isCodecMismatch || false,
    isPaused,
    isAudioMuted,
    setIsAudioMuted,
    togglePause,
    reconnect,
    retryFromWebRtc
  };
}
