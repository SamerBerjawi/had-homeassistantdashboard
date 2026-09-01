/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Custom Hook: Native Home Assistant WebRTC Signaling Stream
 * Communicates directly over the authenticated HA WebSocket connection (`camera/webrtc/offer`).
 * Works transparently behind Cloudflare Tunnels without opening go2rtc's port 1984.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { haWebSocketService } from '../services/haWebSocket';
import { getCameraWebRtcConfig } from '../services/haCameraService';

export interface WebRtcStreamState {
  stream: MediaStream | null;
  status: 'idle' | 'connecting' | 'connected' | 'failed' | 'fallback';
  error: string | null;
  reconnect: () => void;
}

export interface UseCameraWebRtcOptions {
  enabled?: boolean;
  timeoutMs?: number;
  enableIntercom?: boolean;
  onConnected?: () => void;
  onFallback?: (reason: string) => void;
  onError?: (err: string) => void;
}

export function useCameraWebRtc(
  entityId: string,
  options: boolean | UseCameraWebRtcOptions = true
): WebRtcStreamState {
  const opts: UseCameraWebRtcOptions = typeof options === 'boolean'
    ? { enabled: options }
    : options;

  const {
    enabled = true,
    timeoutMs = 5000,
    enableIntercom = false,
    onConnected,
    onFallback,
    onError
  } = opts;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed' | 'fallback'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const unsubscribeWsRef = useRef<(() => void) | null>(null);
  const timeoutTimerRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    if (unsubscribeWsRef.current) {
      try {
        unsubscribeWsRef.current();
      } catch (e) {
        console.debug('[useCameraWebRtc] Unsubscribe error:', e);
      }
      unsubscribeWsRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        console.debug('[useCameraWebRtc] PC close error:', e);
      }
      pcRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    setStream(null);
  }, []);

  const reconnect = useCallback(() => {
    setRetryKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !entityId) {
      cleanup();
      setStatus('idle');
      setError(null);
      return;
    }

    // Demo Mode check
    if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
      cleanup();
      setStatus('fallback');
      setError('Demo Mode / HA WebSocket disconnected');
      onFallback?.('Demo Mode / HA WebSocket disconnected');
      return;
    }

    let isAborted = false;
    let sessionId: string | null = null;
    let queuedCandidates: any[] = [];
    let isStreamReady = false;

    cleanup();
    setStatus('connecting');
    setError(null);

    // Timeout detection (5s default)
    timeoutTimerRef.current = setTimeout(() => {
      if (!isStreamReady && !isAborted) {
        const timeoutMsg = `WebRTC signaling timed out after ${timeoutMs / 1000}s`;
        console.warn(`[useCameraWebRtc] ${timeoutMsg} for ${entityId}`);
        setStatus('fallback');
        setError(timeoutMsg);
        onFallback?.(timeoutMsg);
      }
    }, timeoutMs);

    const startWebRtc = async () => {
      try {
        // 1. Fetch ICE configuration
        const rtcConfig = await getCameraWebRtcConfig(entityId);
        if (isAborted) return;

        // 2. Establish RTCPeerConnection
        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;

        // 3. Add recvonly transceivers for audio & video
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });

        // Optional 2-way microphone intercom audio track
        if (enableIntercom && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isAborted) {
              micStreamRef.current = mic;
              mic.getTracks().forEach((track) => pc.addTrack(track, mic));
            }
          } catch (e) {
            console.debug('[useCameraWebRtc] Microphone permission not granted:', e);
          }
        }

        // 4. Remote track handler
        pc.ontrack = (event) => {
          if (isAborted) return;
          if (event.streams && event.streams[0]) {
            isStreamReady = true;
            if (timeoutTimerRef.current) {
              clearTimeout(timeoutTimerRef.current);
              timeoutTimerRef.current = null;
            }
            setStream(event.streams[0]);
            setStatus('connected');
            setError(null);
            onConnected?.();
          }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
          if (isAborted) return;
          if (pc.connectionState === 'connected') {
            isStreamReady = true;
            if (timeoutTimerRef.current) {
              clearTimeout(timeoutTimerRef.current);
              timeoutTimerRef.current = null;
            }
            setStatus('connected');
            setError(null);
            onConnected?.();
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.warn(`[useCameraWebRtc] PC connectionState changed to: ${pc.connectionState}`);
            setStatus('fallback');
            const failMsg = `WebRTC peer connection ${pc.connectionState}`;
            setError(failMsg);
            onFallback?.(failMsg);
          }
        };

        // 5. Trickle ICE candidates forwarding
        pc.onicecandidate = (event) => {
          if (!event.candidate || isAborted) return;
          const candidatePayload = event.candidate.toJSON();

          if (sessionId) {
            haWebSocketService.sendRequest('camera/webrtc/candidate', {
              entity_id: entityId,
              session_id: sessionId,
              candidate: candidatePayload
            }).catch((err) => {
              console.debug('[useCameraWebRtc] Candidate send error:', err);
            });
          } else {
            queuedCandidates.push(candidatePayload);
          }
        };

        // 6. Create SDP Offer
        const offer = await pc.createOffer();
        if (isAborted) return;
        await pc.setLocalDescription(offer);

        // 7. Subscribe to camera/webrtc/offer signaling events
        const unsubscribe = await haWebSocketService.subscribeMessage(
          async (event: any) => {
            if (!event || isAborted || !pcRef.current) return;

            switch (event.type) {
              case 'session':
                sessionId = event.session_id;
                if (sessionId && queuedCandidates.length > 0) {
                  for (const cand of queuedCandidates) {
                    haWebSocketService.sendRequest('camera/webrtc/candidate', {
                      entity_id: entityId,
                      session_id: sessionId,
                      candidate: cand
                    }).catch(() => {});
                  }
                  queuedCandidates = [];
                }
                break;

              case 'answer':
                if (pc.signalingState !== 'stable' && pc.signalingState !== 'closed') {
                  try {
                    await pc.setRemoteDescription({
                      type: 'answer',
                      sdp: event.answer
                    });
                  } catch (e: any) {
                    console.error('[useCameraWebRtc] Set remote description failed:', e);
                    setStatus('fallback');
                    setError(e?.message || 'Remote description error');
                    onFallback?.(e?.message || 'Remote description error');
                  }
                }
                break;

              case 'candidate':
                if (event.candidate) {
                  try {
                    await pc.addIceCandidate(event.candidate);
                  } catch (e) {
                    console.debug('[useCameraWebRtc] Add remote ICE candidate failed:', e);
                  }
                }
                break;

              case 'error':
                console.warn('[useCameraWebRtc] Signaling error received from HA:', event);
                setStatus('fallback');
                const errMsg = event.message || event.code || 'WebRTC signaling failed';
                setError(errMsg);
                onFallback?.(errMsg);
                break;

              default:
                break;
            }
          },
          {
            type: 'camera/webrtc/offer',
            entity_id: entityId,
            offer: offer.sdp
          }
        );

        if (isAborted) {
          unsubscribe();
        } else {
          unsubscribeWsRef.current = unsubscribe;
        }
      } catch (err: any) {
        if (!isAborted) {
          console.warn('[useCameraWebRtc] WebRTC negotiation error, switching to fallback:', err);
          setStatus('fallback');
          setError(err?.message || 'WebRTC setup error');
          onFallback?.(err?.message || 'WebRTC setup error');
          onError?.(err?.message || 'WebRTC setup error');
        }
      }
    };

    startWebRtc();

    return () => {
      isAborted = true;
      cleanup();
    };
  }, [entityId, enabled, enableIntercom, timeoutMs, retryKey, cleanup, onConnected, onFallback, onError]);

  return {
    stream,
    status,
    error,
    reconnect
  };
}
