/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * go2rtc Media Source Extensions (MSE) Hook:
 * Streams fragmented MP4 over a lightweight WebSocket connection directly to the browser's
 * MediaSource API.
 *
 * Advantages:
 * - Supports ALL camera entities (`camera.*` and `go2rtc.*`).
 * - Native H.264 AND H.265 (HEVC) decoding in modern browsers (Chrome, Edge, Safari 17+).
 * - Ultra-low latency (~200-400ms) with zero WebRTC SDP/ICE negotiation.
 * - Multi-candidate stream discovery: tries stripped name (`c260`), full entity ID (`camera.c260`),
 *   and Home Assistant integration source (`hass:camera.c260`).
 * - Handles circular buffer pruning to prevent memory growth or QuotaExceededError.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getGo2RtcBaseUrls } from '../services/go2rtcService';

const MSE_CODECS = [
  'avc1.640029',      // H.264 high 4.1
  'avc1.64002A',      // H.264 high 4.2
  'avc1.640033',      // H.264 high 5.1
  'hvc1.1.6.L153.B0', // H.265 main 5.1 (HEVC)
  'hvc1.1.6.L120.B0', // H.265 main 4.0 (HEVC)
  'hev1.1.6.L153.B0', // H.265 alternate
  'mp4a.40.2',        // AAC LC
  'mp4a.40.5',        // AAC HE
  'flac',             // FLAC
  'opus'              // OPUS
];

export interface UseCameraMseOptions {
  enabled?: boolean;
  serverUrl?: string;
  streamName?: string;
  muted?: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onConnected?: () => void;
  onError?: (err: string) => void;
}

export interface CameraMseResult {
  status: 'idle' | 'connecting' | 'connected' | 'failed';
  error: string | null;
  codec: string | null;
  reconnect: () => void;
}

export function useCameraMse(
  entityId: string,
  options: UseCameraMseOptions
): CameraMseResult {
  const {
    enabled = true,
    serverUrl,
    streamName: customStreamName,
    muted = true,
    videoRef,
    onConnected,
    onError
  } = options;

  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [codec, setCodec] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const msRef = useRef<MediaSource | null>(null);
  const sbRef = useRef<SourceBuffer | null>(null);
  const timeoutTimerRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (sbRef.current) {
      try {
        sbRef.current.abort();
      } catch {
        // ignore
      }
      sbRef.current = null;
    }

    if (msRef.current) {
      try {
        if (msRef.current.readyState === 'open') {
          msRef.current.endOfStream();
        }
      } catch {
        // ignore
      }
      msRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.src = '';
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }
      } catch {
        // ignore
      }
    }
  }, [videoRef]);

  const reconnect = useCallback(() => {
    setRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !entityId) {
      cleanup();
      setStatus('idle');
      return;
    }

    // Check browser MediaSource support
    const MS: typeof MediaSource | undefined =
      typeof window !== 'undefined'
        ? (window as any).ManagedMediaSource || window.MediaSource
        : undefined;

    if (!MS) {
      const err = 'MediaSource (MSE) is not supported in this browser environment.';
      setStatus('failed');
      setError(err);
      onError?.(err);
      return;
    }

    let isAborted = false;
    cleanup();
    setStatus('connecting');
    setError(null);

    const { wsUrl } = getGo2RtcBaseUrls(serverUrl);

    // Multi-candidate stream discovery:
    // 1. Explicitly provided streamName (e.g. from attributes)
    // 2. Stripped short name (e.g. 'c260')
    // 3. Full entity ID (e.g. 'camera.c260')
    // 4. Home Assistant integration provider (e.g. 'hass:camera.c260')
    const strippedName = entityId.startsWith('go2rtc.')
      ? entityId.replace(/^go2rtc\./, '')
      : entityId.replace(/^camera\./, '');

    const candidateNames = Array.from(new Set([
      customStreamName,
      strippedName,
      entityId,
      entityId.startsWith('camera.') ? `hass:${entityId}` : `hass:camera.${entityId}`
    ])).filter(Boolean) as string[];

    let currentCandidateIdx = 0;

    const ms = new MS();
    msRef.current = ms;

    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      if ('ManagedMediaSource' in window) {
        (video as any).disableRemotePlayback = true;
        (video as any).srcObject = ms;
      } else {
        video.src = URL.createObjectURL(ms);
        video.srcObject = null;
      }
    }

    // 2MB staging buffer for incoming chunks
    const stagingBuf = new Uint8Array(2 * 1024 * 1024);
    let stagingLen = 0;

    const connectCandidate = (streamName: string) => {
      if (isAborted) return;

      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }

      // Connection timeout safeguard (4s per candidate)
      timeoutTimerRef.current = setTimeout(() => {
        if (!isAborted && status !== 'connected') {
          tryNextCandidate();
        }
      }, 4000);

      const targetWsUrl = `${wsUrl}/api/ws?src=${encodeURIComponent(streamName)}`;

      try {
        if (wsRef.current) {
          try { wsRef.current.close(); } catch { /* ignore */ }
          wsRef.current = null;
        }

        const ws = new WebSocket(targetWsUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          if (isAborted) return;
          const supported = MSE_CODECS.filter(c => {
            try {
              return MS.isTypeSupported(`video/mp4; codecs="${c}"`);
            } catch {
              return false;
            }
          }).join(',');

          ws.send(JSON.stringify({ type: 'mse', value: supported }));
        };

        ws.onmessage = (event) => {
          if (isAborted) return;

          // 1. Text control messages (SDP/Codec descriptor or error)
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'mse' && msg.value) {
                setCodec(msg.value);

                if (ms.readyState !== 'open') return;
                const sb = ms.addSourceBuffer(msg.value);
                sb.mode = 'segments';
                sbRef.current = sb;

                sb.addEventListener('updateend', () => {
                  if (isAborted) return;

                  // Append buffered overflow data if available
                  if (!sb.updating && stagingLen > 0) {
                    try {
                      const chunk = stagingBuf.slice(0, stagingLen);
                      sb.appendBuffer(chunk);
                      stagingLen = 0;
                    } catch (err) {
                      console.debug('[useCameraMse] Buffer append error:', err);
                    }
                  }

                  // Prune old buffer segments to prevent memory bloat and QuotaExceededError
                  if (!sb.updating && sb.buffered && sb.buffered.length > 0) {
                    try {
                      const end = sb.buffered.end(sb.buffered.length - 1);
                      const start = end - 5; // keep last 5 seconds of live buffer
                      const start0 = sb.buffered.start(0);

                      if (start > start0) {
                        sb.remove(start0, start);
                        if ('setLiveSeekableRange' in ms) {
                          (ms as any).setLiveSeekableRange(start, end);
                        }
                      }

                      // Keep playback at live edge (sub-300ms latency)
                      if (video && video.currentTime < start) {
                        video.currentTime = start;
                      }
                      if (video) {
                        const gap = end - video.currentTime;
                        video.playbackRate = gap > 0.1 ? gap : 0.1;
                      }
                    } catch {
                      // ignore
                    }
                  }
                });

                if (timeoutTimerRef.current) {
                  clearTimeout(timeoutTimerRef.current);
                  timeoutTimerRef.current = null;
                }

                setStatus('connected');
                setError(null);
                onConnected?.();

                // Start playback
                if (video) {
                  video.play().catch(async (playErr) => {
                    if (playErr?.name === 'NotAllowedError' && !video.muted) {
                      video.muted = true;
                      await video.play().catch(() => {});
                    }
                  });
                }
              } else if (msg.type === 'error') {
                console.info(`[useCameraMse] Candidate "${streamName}" returned error: ${msg.value}`);
                tryNextCandidate();
              }
            } catch (err) {
              console.warn('[useCameraMse] Error parsing message:', err);
            }
          }
          // 2. Binary media fragments (fMP4 chunks)
          else if (event.data instanceof ArrayBuffer) {
            const sb = sbRef.current;
            if (!sb) return;

            if (sb.updating || stagingLen > 0) {
              const b = new Uint8Array(event.data);
              if (stagingLen + b.byteLength <= stagingBuf.byteLength) {
                stagingBuf.set(b, stagingLen);
                stagingLen += b.byteLength;
              }
            } else {
              try {
                sb.appendBuffer(event.data);
              } catch {
                // ignore
              }
            }
          }
        };

        ws.onerror = () => {
          if (!isAborted && status !== 'connected') {
            tryNextCandidate();
          }
        };

        ws.onclose = () => {
          if (isAborted) return;
          if (status === 'connected') {
            console.info('[useCameraMse] Stream closed, retrying...');
            setStatus('connecting');
            setTimeout(() => {
              if (!isAborted) reconnect();
            }, 2000);
          } else {
            tryNextCandidate();
          }
        };
      } catch {
        tryNextCandidate();
      }
    };

    const tryNextCandidate = () => {
      currentCandidateIdx++;
      if (currentCandidateIdx < candidateNames.length && !isAborted) {
        connectCandidate(candidateNames[currentCandidateIdx]);
      } else if (!isAborted) {
        const timeoutMsg = `go2rtc MSE stream not available for "${entityId}"`;
        setStatus('failed');
        setError(timeoutMsg);
        onError?.(timeoutMsg);
        cleanup();
      }
    };

    ms.addEventListener('sourceopen', () => {
      if (isAborted) return;
      connectCandidate(candidateNames[0]);
    }, { once: true });

    return () => {
      isAborted = true;
      cleanup();
    };
  }, [entityId, enabled, customStreamName, muted, serverUrl, retryKey, cleanup, onConnected, onError, videoRef]);

  return {
    status,
    error,
    codec,
    reconnect
  };
}
