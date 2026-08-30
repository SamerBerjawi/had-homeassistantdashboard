/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Native Home Assistant WebRTC Camera Stream Player (go2rtc-backed).
 * Negotiates WebRTC directly via Home Assistant WebSocket signaling commands:
 * - camera/webrtc/get_client_config
 * - camera/webrtc/offer (subscription-style command)
 * - camera/webrtc/candidate (trickle ICE)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Broadcast, 
  VideoCamera, 
  ArrowsClockwise, 
  WarningCircle, 
  SpeakerHigh, 
  SpeakerSlash,
  Camera,
  CheckCircle,
  Microphone,
  MicrophoneSlash
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { getHAHttpBaseUrl } from '../../../services/go2rtcService';
import CameraNoSignalPlaceholder from '../../ui/CameraNoSignalPlaceholder';
import { haWebSocketService } from '../../../services/haWebSocket';
import { negotiateGo2RtcWebRtcSession } from '../../../services/go2rtcService';

export interface HaWebRtcPlayerProps {
  camera: ResolvedEntity;
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  isIntercomActive?: boolean;
  onReady?: () => void;
  onError?: (error: Error | string) => void;
  onSnapshotReady?: (canvas: HTMLCanvasElement) => void;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'demo';

export default function HaWebRtcPlayer({
  camera,
  darkMode = true,
  className = '',
  showControls = true,
  autoPlay = true,
  muted = true,
  isIntercomActive = false,
  onReady,
  onError,
  onSnapshotReady
}: HaWebRtcPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<any>(null);

  const { isLiveMode, serverUrl } = useAutoLayoutStore();

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing WebRTC...');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(muted);
  const [retryCount, setRetryCount] = useState<number>(0);

  const entityId = camera.entity_id;
  const isGo2RtcDirect =
    camera.attributes?.stream_source === 'go2rtc' ||
    entityId.startsWith('go2rtc.') ||
    !!camera.attributes?.is_rtsp_stream ||
    !entityId.startsWith('camera.');
  const cameraName = camera.name || camera.attributes?.friendly_name || entityId;
  const snapshotFallbackUrl = camera.attributes?.entity_picture || null;

  /**
   * Stop active tracks and release peer connection
   */
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
      } catch (e) {
        console.warn('[HaWebRtcPlayer] Error unsubscribing:', e);
      }
      unsubscribeRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        console.warn('[HaWebRtcPlayer] Error closing peer connection:', e);
      }
      pcRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      } catch (e) {
        // ignore
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Establish WebRTC handshake through Home Assistant WebSocket signaling
   */
  const connectStream = useCallback(async () => {
    cleanup();

    // Check if in Demo Mode or no real HA socket is available
    if (!isLiveMode || haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
      setStatus('demo');
      setStatusMessage('Demo Mode Feed Preview');
      return;
    }

    setStatus('connecting');
    setStatusMessage('Fetching WebRTC configuration from Home Assistant...');

    let sessionId: string | null = null;
    let queuedCandidates: any[] = [];
    let isConnected = false;

    // 15-second connection timeout
    timeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        const timeoutMsg = 'Connection timed out (15s). Stream server not responding.';
        setStatus('error');
        setStatusMessage(timeoutMsg);
        onError?.(timeoutMsg);
        cleanup();
      }
    }, 15000);

    try {
      // 1. Fetch ICE server and WebRTC client configuration from Home Assistant
      const clientConfig = await haWebSocketService.sendRequest<any>('camera/webrtc/get_client_config', {
        entity_id: entityId
      }).catch((err) => {
        console.warn('[HaWebRtcPlayer] Failed to get client config, using fallback STUN:', err);
        return {
          configuration: {
            iceServers: [
              { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
            ]
          }
        };
      });

      const configuration: RTCConfiguration =
        clientConfig?.configuration ||
        (clientConfig?.iceServers ? clientConfig : {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
          ]
        });

      // 2. Initialize RTCPeerConnection
      const pc = new RTCPeerConnection(configuration);
      pcRef.current = pc;

      // Optional data channel if requested by config
      if (clientConfig?.dataChannel) {
        try {
          pc.createDataChannel(clientConfig.dataChannel);
        } catch (e) {
          console.warn('[HaWebRtcPlayer] Failed to create data channel:', e);
        }
      }

      // 3. Add recvonly transceivers
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Optional 2-way microphone intercom audio track
      if (isIntercomActive && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          micStream.getTracks().forEach(track => {
            pc.addTrack(track, micStream);
          });
        } catch (e) {
          console.warn('[HaWebRtcPlayer] Microphone permission not granted:', e);
        }
      }

      // 4. Handle incoming remote stream tracks
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          isConnected = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setStatus('connected');
          setStatusMessage('HA Native WebRTC Live');
          onReady?.();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          isConnected = true;
          setStatus('connected');
          setStatusMessage('WebRTC Stream Connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn(`[HaWebRtcPlayer] Connection state: ${pc.connectionState}`);
          setStatus('error');
          setStatusMessage(`Connection ${pc.connectionState}`);
          onError?.(`WebRTC connection ${pc.connectionState}`);
        }
      };

      // 5. Trickle ICE candidates back to Home Assistant
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidatePayload = event.candidate.toJSON();

        if (sessionId) {
          haWebSocketService.sendRequest('camera/webrtc/candidate', {
            entity_id: entityId,
            session_id: sessionId,
            candidate: candidatePayload
          }).catch((err) => {
            console.warn('[HaWebRtcPlayer] Failed to trickle ICE candidate:', err);
          });
        } else {
          queuedCandidates.push(candidatePayload);
        }
      };

      // Direct go2rtc stream path (for RTSP streams configured in go2rtc without an HA entity)
      if (isGo2RtcDirect) {
        setStatusMessage('Connecting to go2rtc RTSP stream...');
        const streamName =
          camera.attributes?.go2rtc_stream ||
          entityId.replace(/^go2rtc\./, '').replace(/^camera\./, '');

        const unsubscribeGo2Rtc = await negotiateGo2RtcWebRtcSession(
          pc,
          streamName,
          serverUrl,
          () => {
            isConnected = true;
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setStatus('connected');
            setStatusMessage('go2rtc RTSP WebRTC Live');
            onReady?.();
          },
          (err) => {
            console.warn('[HaWebRtcPlayer] Direct go2rtc error:', err);
            setStatus('error');
            setStatusMessage(`go2rtc stream error: ${err?.message || err}`);
            onError?.(err);
          }
        );

        unsubscribeRef.current = unsubscribeGo2Rtc;
        return;
      }

      // 6. Create SDP offer and set local description for HA native signaling
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setStatusMessage('Negotiating SDP session with Home Assistant...');

      // 7. Subscribe to camera/webrtc/offer signaling events
      const unsubscribe = await haWebSocketService.subscribeMessage(
        async (event: any) => {
          if (!event || !pcRef.current) return;

          switch (event.type) {
            case 'session':
              sessionId = event.session_id;
              // Flush any candidates gathered before session ID was established
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
                  console.error('[HaWebRtcPlayer] Failed to set remote description:', e);
                  setStatus('error');
                  setStatusMessage(`SDP answer rejected: ${e.message}`);
                  onError?.(e);
                }
              }
              break;

            case 'candidate':
              if (event.candidate) {
                try {
                  await pc.addIceCandidate(event.candidate);
                } catch (e: any) {
                  console.warn('[HaWebRtcPlayer] Failed to add remote ICE candidate:', e);
                }
              }
              break;

            case 'error':
              console.error('[HaWebRtcPlayer] Signaling error received:', event);
              setStatus('error');
              setStatusMessage(event.message || event.code || 'Signaling error');
              onError?.(event.message || event.code || 'Signaling error');
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

      unsubscribeRef.current = unsubscribe;
    } catch (err: any) {
      console.warn('[HaWebRtcPlayer] HA native signaling error, trying go2rtc fallback:', err);

      try {
        if (pcRef.current) {
          setStatusMessage('Attempting go2rtc stream fallback...');
          const fallbackStreamName =
            camera.attributes?.go2rtc_stream ||
            entityId.replace(/^camera\./, '');

          const unsubscribeFallback = await negotiateGo2RtcWebRtcSession(
            pcRef.current,
            fallbackStreamName,
            serverUrl,
            () => {
              isConnected = true;
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setStatus('connected');
              setStatusMessage('go2rtc WebRTC Live');
              onReady?.();
            },
            (fallbackErr) => {
              console.error('[HaWebRtcPlayer] go2rtc fallback failed:', fallbackErr);
              setStatus('error');
              setStatusMessage(err?.message || 'WebRTC initialization failed');
              onError?.(err);
            }
          );
          unsubscribeRef.current = unsubscribeFallback;
          return;
        }
      } catch (fallbackError) {
        console.error('[HaWebRtcPlayer] Fallback attempt error:', fallbackError);
      }

      setStatus('error');
      setStatusMessage(err?.message || 'WebRTC initialization failed');
      onError?.(err);
      cleanup();
    }
  }, [entityId, isLiveMode, isIntercomActive, isGo2RtcDirect, serverUrl, camera.attributes?.go2rtc_stream, onReady, onError, cleanup]);

  // Trigger stream negotiation on mount, camera change, or retry
  useEffect(() => {
    connectStream();
    return () => {
      cleanup();
    };
  }, [connectStream, cleanup, retryCount]);

  // Sync mute state to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted]);

  // Snapshot generation
  const takeSnapshot = () => {
    if (!videoRef.current || !onSnapshotReady) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        onSnapshotReady(canvas);
      }
    } catch (e) {
      console.warn('[HaWebRtcPlayer] Snapshot capture failed:', e);
    }
  };

  return (
    <div className={`relative w-full h-full bg-black flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        playsInline
        muted={isAudioMuted}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          status === 'connected' ? 'opacity-100' : 'opacity-0 absolute'
        }`}
      />

      {/* Demo Mode / Fallback Snapshot Preview */}
      {(status === 'demo' || status === 'error') && (
        <div className="absolute inset-0 w-full h-full">
          {snapshotFallbackUrl ? (
            <>
              <img
                src={snapshotFallbackUrl}
                alt={cameraName}
                className="w-full h-full object-cover opacity-75 filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </>
          ) : (
            <CameraNoSignalPlaceholder title={cameraName} subtitle={status === 'error' ? statusMessage : 'No preview available'} />
          )}
        </div>
      )}

      {/* Loading Spinner HUD */}
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 px-4 text-center">
          <div className="relative flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Broadcast size={20} weight="duotone" className="text-cyan-400 absolute animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-white tracking-wide">{cameraName}</p>
          <p className="text-xs text-cyan-300/80 mt-1 max-w-xs">{statusMessage}</p>
        </div>
      )}

      {/* Error Overlay HUD with Retry Button */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-10 p-4 text-center">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-2.5">
            <WarningCircle size={22} weight="duotone" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Stream Unavailable</p>
          <p className="text-xs text-rose-300/80 max-w-xs mb-3 px-2 line-clamp-2">{statusMessage}</p>
          <button
            type="button"
            onClick={() => setRetryCount(c => c + 1)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Demo Mode Badge */}
      {status === 'demo' && (
        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Demo Snapshot Feed</span>
        </div>
      )}

      {/* Live HUD Badge when Connected */}
      {status === 'connected' && (
        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/15 text-[11px] font-semibold flex items-center gap-1.5 shadow-md pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">LIVE</span>
          <span className="text-white/40">•</span>
          <span className="text-slate-200">WebRTC</span>
        </div>
      )}

      {/* Optional Interactive Controls (Audio Mute / Snapshot) */}
      {showControls && status === 'connected' && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAudioMuted(!isAudioMuted);
            }}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
          >
            {isAudioMuted ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="duotone" className="text-cyan-400" />}
          </button>

          {onSnapshotReady && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                takeSnapshot();
              }}
              title="Capture Snapshot Frame"
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer shadow-md"
            >
              <Camera size={14} weight="duotone" className="text-cyan-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
