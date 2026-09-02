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
import { negotiateGo2RtcWebRtcSession } from '../services/go2rtcService';

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
        try {
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });
        } catch (e) {
          console.debug('[useCameraWebRtc] Add transceiver warning:', e);
        }

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
          isStreamReady = true;
          if (timeoutTimerRef.current) {
            clearTimeout(timeoutTimerRef.current);
            timeoutTimerRef.current = null;
          }

          if (event.streams && event.streams[0]) {
            setStream(event.streams[0]);
          } else if (event.track) {
            setStream(new MediaStream([event.track]));
          }

          setStatus('connected');
          setError(null);
          onConnected?.();
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
            console.warn(`[useCameraWebRtc] PC connectionState: ${pc.connectionState}`);
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

        // If direct go2rtc stream entity (go2rtc.<stream_name>)
        const isGo2RtcDirect = entityId.startsWith('go2rtc.');
        const go2rtcStreamName = isGo2RtcDirect 
          ? entityId.replace(/^go2rtc\./, '') 
          : entityId.replace(/^camera\./, '');

        if (isGo2RtcDirect) {
          const go2rtcCleanup = await negotiateGo2RtcWebRtcSession(
            pc,
            go2rtcStreamName,
            undefined,
            () => {
              isStreamReady = true;
              if (timeoutTimerRef.current) {
                clearTimeout(timeoutTimerRef.current);
                timeoutTimerRef.current = null;
              }
              setStatus('connected');
              setError(null);
              onConnected?.();
            },
            (err) => {
              console.warn(`[useCameraWebRtc] go2rtc direct negotiation failed for ${entityId}:`, err);
              setStatus('fallback');
              setError(err?.message || 'go2rtc WebRTC negotiation failed');
              onFallback?.(err?.message || 'go2rtc WebRTC negotiation failed');
            }
          );
          if (isAborted) {
            go2rtcCleanup();
          } else {
            unsubscribeWsRef.current = go2rtcCleanup;
          }
          return;
        }

        // 6. Create SDP Offer for Home Assistant native WebRTC
        const offer = await pc.createOffer();
        if (isAborted) return;
        await pc.setLocalDescription(offer);

        // Wait briefly (up to 300ms) for initial ICE gathering to embed candidates in offer SDP for non-trickle servers
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            const checkGathering = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', checkGathering);
                resolve();
              }
            };
            pc.addEventListener('icegatheringstatechange', checkGathering);
            setTimeout(() => {
              pc.removeEventListener('icegatheringstatechange', checkGathering);
              resolve();
            }, 300);
          }
        });

        if (isAborted) return;

        const offerSdp = pc.localDescription?.sdp || offer.sdp;

        // Try secondary go2rtc negotiation if HA signaling reports error.
        // IMPORTANT: Create a fresh RTCPeerConnection — the original PC is in a
        // stale signaling state (have-local-offer or worse) from the failed HA
        // flow, so reusing it for a new createOffer/setLocalDescription will
        // throw InvalidStateError and silently kill the fallback.
        const tryGo2RtcFallback = async (reason: string) => {
          if (isAborted) return;
          console.info(`[useCameraWebRtc] HA WebRTC failed (${reason}), creating fresh PC for go2rtc fallback for ${go2rtcStreamName}...`);
          try {
            // Close the stale HA-path PeerConnection
            if (pcRef.current) {
              try { pcRef.current.close(); } catch { /* ignore */ }
            }

            // Create a fresh PeerConnection with the same ICE config
            const freshPc = new RTCPeerConnection(rtcConfig);
            pcRef.current = freshPc;

            // Re-add recvonly transceivers on the fresh PC
            try {
              freshPc.addTransceiver('video', { direction: 'recvonly' });
              freshPc.addTransceiver('audio', { direction: 'recvonly' });
            } catch (e) {
              console.debug('[useCameraWebRtc] Fresh PC add transceiver warning:', e);
            }

            // Wire up track and connection state handlers on the fresh PC
            freshPc.ontrack = (event) => {
              if (isAborted) return;
              isStreamReady = true;
              if (timeoutTimerRef.current) {
                clearTimeout(timeoutTimerRef.current);
                timeoutTimerRef.current = null;
              }
              if (event.streams && event.streams[0]) {
                setStream(event.streams[0]);
              } else if (event.track) {
                setStream(new MediaStream([event.track]));
              }
              setStatus('connected');
              setError(null);
              onConnected?.();
            };

            freshPc.onconnectionstatechange = () => {
              if (isAborted) return;
              if (freshPc.connectionState === 'connected') {
                isStreamReady = true;
                if (timeoutTimerRef.current) {
                  clearTimeout(timeoutTimerRef.current);
                  timeoutTimerRef.current = null;
                }
                setStatus('connected');
                setError(null);
                onConnected?.();
              } else if (freshPc.connectionState === 'failed' || freshPc.connectionState === 'disconnected') {
                console.warn(`[useCameraWebRtc] go2rtc fallback PC connectionState: ${freshPc.connectionState}`);
                setStatus('fallback');
                setError(`WebRTC peer connection ${freshPc.connectionState}`);
                onFallback?.(`WebRTC peer connection ${freshPc.connectionState}`);
              }
            };

            const go2rtcCleanup = await negotiateGo2RtcWebRtcSession(
              freshPc,
              go2rtcStreamName,
              undefined,
              () => {
                isStreamReady = true;
                if (timeoutTimerRef.current) {
                  clearTimeout(timeoutTimerRef.current);
                  timeoutTimerRef.current = null;
                }
                setStatus('connected');
                setError(null);
                onConnected?.();
              },
              (fallbackErr) => {
                console.warn(`[useCameraWebRtc] Secondary go2rtc fallback also failed:`, fallbackErr);
                setStatus('fallback');
                setError(fallbackErr?.message || reason);
                onFallback?.(fallbackErr?.message || reason);
              }
            );
            if (!isAborted) {
              unsubscribeWsRef.current = go2rtcCleanup;
            }
          } catch (e: any) {
            console.warn('[useCameraWebRtc] go2rtc fallback PC creation failed:', e);
            setStatus('fallback');
            setError(reason);
            onFallback?.(reason);
          }
        };

        // 7. Process answer or session messages from HA
        const handleSignalingPayload = async (payload: any) => {
          if (!payload || isAborted || !pcRef.current) return;

          // Check for Session ID
          if (payload.type === 'session' && payload.session_id) {
            sessionId = payload.session_id;
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
          } else if (payload.session_id) {
            sessionId = payload.session_id;
          }

          // Check for Remote SDP Answer
          const rawAnswer =
            (typeof payload === 'string' && payload.startsWith('v='))
              ? payload
              : payload.answer ||
                payload.sdp ||
                payload.value ||
                payload.result?.answer ||
                (typeof payload.result === 'string' && payload.result.startsWith('v=') ? payload.result : null);

          if (rawAnswer && pc.signalingState !== 'stable' && pc.signalingState !== 'closed') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: rawAnswer
              }));
              isStreamReady = true;
            } catch (e: any) {
              console.error('[useCameraWebRtc] Set remote description failed:', e);
              await tryGo2RtcFallback(e?.message || 'Remote description error');
            }
          }

          // Check for trickle candidate from remote
          if (payload.type === 'candidate' && payload.candidate) {
            try {
              await pc.addIceCandidate(payload.candidate);
            } catch (e) {
              console.debug('[useCameraWebRtc] Add remote ICE candidate failed:', e);
            }
          }

          // Check for signaling error
          if (payload.type === 'error' || payload.error) {
            console.warn('[useCameraWebRtc] Signaling error received from HA:', payload);
            const errMsg = payload.message || payload.error?.message || payload.code || 'WebRTC signaling failed';
            await tryGo2RtcFallback(errMsg);
          }
        };

        // 8. Subscribe to camera/webrtc/offer signaling events
        const unsubscribe = await haWebSocketService.subscribeMessage(
          (event: any) => {
            handleSignalingPayload(event);
          },
          {
            type: 'camera/webrtc/offer',
            entity_id: entityId,
            offer: offerSdp
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
