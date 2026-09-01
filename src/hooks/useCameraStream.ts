/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multi-Tier Camera Stream Pipeline Orchestrator Hook:
 * Tier 1: Native HA WebRTC via duplex WebSocket signaling (`camera/webrtc/offer`)
 * Tier 2: HA HLS Stream via `camera/get_stream` with hls.js / native WebKit HLS
 * Tier 3: Authenticated MJPEG Proxy Stream (`/api/camera_proxy_stream`)
 *
 * Includes automatic bandwidth/CPU conservation:
 * - IntersectionObserver to disconnect when scrolled out of view
 * - document.visibilityState watcher to pause when browser tab is hidden
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { haWebSocketService } from '../services/haWebSocket';
import { requestHACameraHlsStream, getHACameraMjpegUrl, getHACameraSnapshotUrl } from '../services/haCameraService';
import { useCameraWebRtc } from './useCameraWebRtc';
import { getActiveHAToken } from '../services/haAuth';

export type StreamProtocol = 'webrtc' | 'hls' | 'mjpeg' | 'snapshot' | 'demo' | 'none';
export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'fallback' | 'failed' | 'paused' | 'demo';

export interface UseCameraStreamOptions {
  enabled?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  enableIntercom?: boolean;
  serverUrl?: string;
  preferProtocol?: 'auto' | 'webrtc' | 'hls' | 'mjpeg';
  elementRef?: React.RefObject<HTMLElement | null>;
  onStreamReady?: (protocol: StreamProtocol) => void;
  onError?: (err: string) => void;
}

export interface CameraStreamResult {
  status: StreamStatus;
  protocol: StreamProtocol;
  mediaStream: MediaStream | null;
  hlsUrl: string | null;
  mjpegUrl: string | null;
  snapshotUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
  isPaused: boolean;
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
  togglePause: () => void;
  reconnect: () => void;
}

export function useCameraStream(
  entityId: string,
  options: UseCameraStreamOptions = {}
): CameraStreamResult {
  const {
    enabled = true,
    autoPlay = true,
    muted = true,
    enableIntercom = false,
    serverUrl,
    preferProtocol = 'auto',
    elementRef,
    onStreamReady,
    onError
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isVisible, setIsVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(muted);

  // Active protocol state: 1 = WebRTC, 2 = HLS, 3 = MJPEG, 4 = Snapshot fallback
  const [activeTier, setActiveTier] = useState<1 | 2 | 3 | 4>(
    preferProtocol === 'hls' ? 2 : preferProtocol === 'mjpeg' ? 3 : 1
  );
  const [protocol, setProtocol] = useState<StreamProtocol>('none');
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [mjpegUrl, setMjpegUrl] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  const isStreamActive = enabled && isVisible && isTabActive && !isPaused;

  // 1. IntersectionObserver to detect when tile is visible in viewport
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    let targetElement = elementRef?.current || videoRef.current;
    if (!targetElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry) {
          // If bounding rect is 0 (e.g. during initial modal transition), keep visible
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

  // 3. WebRTC Sub-Hook (Tier 1)
  const isWebRtcEligible = isStreamActive && activeTier === 1 && preferProtocol !== 'hls' && preferProtocol !== 'mjpeg';
  const webrtc = useCameraWebRtc(entityId, {
    enabled: isWebRtcEligible,
    enableIntercom,
    timeoutMs: 5000,
    onConnected: () => {
      setProtocol('webrtc');
      setStatus('connected');
      setErrorMessage(null);
      onStreamReady?.('webrtc');
    },
    onFallback: (reason) => {
      console.warn(`[useCameraStream] WebRTC fallback triggered for ${entityId}: ${reason}`);
      // Step up to Tier 2 (HLS)
      setActiveTier(2);
    }
  });

  // Attach WebRTC stream to HTMLVideoElement when available
  useEffect(() => {
    if (activeTier === 1 && webrtc.stream && videoRef.current) {
      if (videoRef.current.srcObject !== webrtc.stream) {
        videoRef.current.srcObject = webrtc.stream;
      }
      videoRef.current.play().catch(() => {});
      setProtocol('webrtc');
      setStatus('connected');
    }
  }, [activeTier, webrtc.stream]);

  // 4. HLS Stream (Tier 2)
  useEffect(() => {
    if (!isStreamActive || activeTier !== 2 || preferProtocol === 'mjpeg') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    let isCancelled = false;
    setStatus('connecting');
    setErrorMessage('Initiating Home Assistant HLS stream...');

    const setupHls = async () => {
      try {
        const streamResult = await requestHACameraHlsStream(entityId, serverUrl);
        if (isCancelled) return;

        if (!streamResult || !streamResult.hlsUrl) {
          console.warn(`[useCameraStream] HLS stream request returned empty URL for ${entityId}. Stepping to Tier 3 (MJPEG)`);
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

        // Clear any previous WebRTC srcObject
        if (video.srcObject) {
          video.srcObject = null;
        }

        // If native HLS is supported (Safari / iOS WebKit)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = authenticatedHlsUrl;
          video.addEventListener('loadedmetadata', () => {
            if (isCancelled) return;
            video.play().catch(() => {});
            setProtocol('hls');
            setStatus('connected');
            setErrorMessage(null);
            onStreamReady?.('hls');
          }, { once: true });
          return;
        }

        // If Hls.js is supported (Chrome, Firefox, Edge, Android)
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
            video.play().catch(() => {});
            setProtocol('hls');
            setStatus('connected');
            setErrorMessage(null);
            onStreamReady?.('hls');
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (isCancelled) return;
            if (data.fatal) {
              console.warn('[useCameraStream] Fatal HLS error, falling back to MJPEG:', data.details);
              hls.destroy();
              hlsRef.current = null;
              setActiveTier(3);
            }
          });
        } else {
          setActiveTier(3);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[useCameraStream] HLS initialization error:', err);
          setActiveTier(3);
        }
      }
    };

    setupHls();

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [entityId, isStreamActive, activeTier, preferProtocol, serverUrl, retryCounter, onStreamReady]);

  // 5. MJPEG Proxy (Tier 3)
  useEffect(() => {
    if (!isStreamActive || activeTier !== 3) {
      setMjpegUrl(null);
      return;
    }

    const mjpegStreamUrl = getHACameraMjpegUrl(entityId, serverUrl);
    setMjpegUrl(mjpegStreamUrl);
    setProtocol('mjpeg');
    setStatus('connected');
    setErrorMessage(null);
    onStreamReady?.('mjpeg');
  }, [entityId, isStreamActive, activeTier, serverUrl, retryCounter, onStreamReady]);

  // 6. Snapshot Fallback (Tier 4)
  useEffect(() => {
    if (activeTier === 4) {
      const snapUrl = getHACameraSnapshotUrl(entityId, serverUrl);
      setSnapshotUrl(snapUrl);
      setProtocol('snapshot');
      setStatus('connected');
    }
  }, [entityId, activeTier, serverUrl, retryCounter]);

  // 7. Demo Mode Handling
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
    setActiveTier(preferProtocol === 'hls' ? 2 : preferProtocol === 'mjpeg' ? 3 : 1);
    setErrorMessage(null);
    setStatus('connecting');
    setRetryCounter((c) => c + 1);
    webrtc.reconnect();
  }, [preferProtocol, webrtc]);

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
    status: !isStreamActive && isPaused ? 'paused' : status,
    protocol,
    mediaStream: webrtc.stream,
    hlsUrl,
    mjpegUrl,
    snapshotUrl,
    videoRef,
    error: errorMessage || webrtc.error,
    isPaused,
    isAudioMuted,
    setIsAudioMuted,
    togglePause,
    reconnect
  };
}
