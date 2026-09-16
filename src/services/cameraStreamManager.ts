/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraStreamManager
 * Centralized singleton stream manager with reference counting and single-session deduplication:
 * 1. WebRTC via go2rtc WHEP signaling (primary, sub-second latency)
 * 2. Shared MediaStream broadcast: 1 single WebRTC peer connection shared across multiple <video> elements
 * 3. HLS fallback via hls.js (for restricted networks / non-WebRTC contexts)
 * 4. Automatic exponential backoff reconnect on stream failure
 * 5. Reference counting with 7s graceful teardown to avoid thrashing on fast navigations / modal transitions
 */

import Hls from 'hls.js';

export type StreamType = 'webrtc' | 'hls' | 'snapshot';
export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'error';

export interface CameraStreamState {
  status: StreamStatus;
  streamType: StreamType;
  mediaStream: MediaStream | null;
  hlsUrl: string | null;
  error: string | null;
  retrySecondsLeft: number;
}

export interface StreamSubscribeOptions {
  rtspUrl?: string;
  token?: string;
  preferProtocol?: 'auto' | 'webrtc' | 'hls' | 'snapshot' | 'live' | string;
  isUnavailable?: boolean;
}

interface StreamSession {
  streamId: string;
  options: StreamSubscribeOptions;
  state: CameraStreamState;
  subscribers: Set<(state: CameraStreamState) => void>;
  pc: RTCPeerConnection | null;
  iceTimeoutId: any;
  retryCount: number;
  retryTimer: any;
  countdownInterval: any;
  hls: Hls | null;
  masterVideo: HTMLVideoElement | null;
}

class CameraStreamManager {
  private sessions = new Map<string, StreamSession>();
  private teardownTimers = new Map<string, any>();

  /**
   * Get current state of a stream session, or default idle state
   */
  public getState(streamId: string): CameraStreamState {
    const session = this.sessions.get(streamId);
    if (session) {
      return { ...session.state };
    }
    return {
      status: 'idle',
      streamType: 'snapshot',
      mediaStream: null,
      hlsUrl: null,
      error: null,
      retrySecondsLeft: 0
    };
  }

  /**
   * Subscribe to a camera stream.
   * If a session already exists and is streaming, the existing MediaStream is shared immediately.
   * Returns an unsubscribe callback.
   */
  public subscribe(
    streamId: string,
    options: StreamSubscribeOptions,
    callback: (state: CameraStreamState) => void
  ): () => void {
    // 1. Cancel pending teardown if another tile/modal re-opened this camera
    const existingTeardown = this.teardownTimers.get(streamId);
    if (existingTeardown) {
      clearTimeout(existingTeardown);
      this.teardownTimers.delete(streamId);
    }

    // 2. Fetch or create session
    let session = this.sessions.get(streamId);
    if (!session) {
      session = {
        streamId,
        options,
        state: {
          status: 'idle',
          streamType: 'snapshot',
          mediaStream: null,
          hlsUrl: null,
          error: null,
          retrySecondsLeft: 0
        },
        subscribers: new Set(),
        pc: null,
        iceTimeoutId: null,
        retryCount: 0,
        retryTimer: null,
        countdownInterval: null,
        hls: null,
        masterVideo: null
      };
      this.sessions.set(streamId, session);
    } else {
      // Update options in case token or rtspUrl updated
      session.options = { ...session.options, ...options };
    }

    session.subscribers.add(callback);

    // 3. Immediately emit current state to subscriber
    callback({ ...session.state });

    // 4. If idle and eligible, initiate connection
    if (session.state.status === 'idle' && session.options.rtspUrl && !session.options.isUnavailable) {
      this.initiateConnection(session);
    }

    // 5. Return cleanup
    return () => {
      if (!session) return;
      session.subscribers.delete(callback);

      if (session.subscribers.size === 0) {
        this.scheduleTeardown(streamId);
      }
    };
  }

  /**
   * Manual retry for a given streamId
   */
  public retry(streamId: string): void {
    const session = this.sessions.get(streamId);
    if (!session) return;

    this.clearTimers(session);
    session.retryCount = 0;
    this.cleanupActiveConnection(session);
    this.initiateConnection(session);
  }

  /**
   * Graceful teardown when all subscribers unmount (7s grace window)
   */
  private scheduleTeardown(streamId: string): void {
    const existing = this.teardownTimers.get(streamId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.teardownTimers.delete(streamId);
      const session = this.sessions.get(streamId);
      if (session && session.subscribers.size === 0) {
        this.cleanupSession(session);
        this.sessions.delete(streamId);
      }
    }, 7000);

    this.teardownTimers.set(streamId, timer);
  }

  private broadcast(session: StreamSession): void {
    const state = { ...session.state };
    session.subscribers.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error(`[CameraStreamManager] Error notifying subscriber for ${session.streamId}:`, err);
      }
    });
  }

  private clearTimers(session: StreamSession): void {
    if (session.iceTimeoutId) {
      clearTimeout(session.iceTimeoutId);
      session.iceTimeoutId = null;
    }
    if (session.retryTimer) {
      clearTimeout(session.retryTimer);
      session.retryTimer = null;
    }
    if (session.countdownInterval) {
      clearInterval(session.countdownInterval);
      session.countdownInterval = null;
    }
  }

  private cleanupPeerConnection(session: StreamSession): void {
    if (session.iceTimeoutId) {
      clearTimeout(session.iceTimeoutId);
      session.iceTimeoutId = null;
    }
    if (session.pc) {
      try {
        session.pc.close();
      } catch {}
      session.pc = null;
    }
  }

  private cleanupHls(session: StreamSession): void {
    if (session.hls) {
      try {
        session.hls.destroy();
      } catch {}
      session.hls = null;
    }
    if (session.masterVideo) {
      session.masterVideo.srcObject = null;
      session.masterVideo.removeAttribute('src');
      session.masterVideo = null;
    }
  }

  private cleanupActiveConnection(session: StreamSession): void {
    this.cleanupPeerConnection(session);
    this.cleanupHls(session);
    session.state.mediaStream = null;
    session.state.hlsUrl = null;
  }

  private cleanupSession(session: StreamSession): void {
    this.clearTimers(session);
    this.cleanupActiveConnection(session);
    session.state.status = 'idle';
  }

  private initiateConnection(session: StreamSession): void {
    if (!session.options.rtspUrl || session.options.isUnavailable) {
      return;
    }

    const protocol = session.options.preferProtocol || 'auto';
    if (protocol === 'snapshot') {
      return;
    }
    if (protocol === 'hls') {
      this.connectHls(session);
    } else {
      this.connectWebRtc(session);
    }
  }

  private async connectWebRtc(session: StreamSession): Promise<void> {
    this.cleanupActiveConnection(session);
    session.state.status = 'connecting';
    session.state.error = null;
    session.state.retrySecondsLeft = 0;
    this.broadcast(session);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      session.pc = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        if (session.iceTimeoutId) {
          clearTimeout(session.iceTimeoutId);
          session.iceTimeoutId = null;
        }
        const incomingStream = event.streams[0];
        if (incomingStream) {
          session.retryCount = 0;
          session.state = {
            status: 'streaming',
            streamType: 'webrtc',
            mediaStream: incomingStream,
            hlsUrl: null,
            error: null,
            retrySecondsLeft: 0
          };
          this.broadcast(session);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn(`[CameraStreamManager] WebRTC ICE failed on ${session.streamId}. Failing over to HLS.`);
          this.cleanupPeerConnection(session);
          this.connectHls(session);
        }
      };

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
      const token = session.options.token;

      const res = await fetch(`/api/cameras/${encodeURIComponent(session.streamId)}/webrtc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sdp: sdpPayload, type: 'offer' })
      });

      if (!res.ok) {
        throw new Error(`WebRTC negotiation returned HTTP ${res.status}`);
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
      // If WebRTC media packets don't arrive within 4.5s, seamlessly fail over to HLS
      session.iceTimeoutId = setTimeout(() => {
        if (pc.connectionState !== 'connected') {
          console.info(`[CameraStreamManager] WebRTC ICE check timed out after 4.5s on ${session.streamId}. Failing over to HLS.`);
          this.cleanupPeerConnection(session);
          this.connectHls(session);
        }
      }, 4500);
    } catch (err: any) {
      console.warn(`[CameraStreamManager] WebRTC negotiation failed for ${session.streamId}: ${err?.message}. Failing over to HLS.`);
      this.cleanupPeerConnection(session);
      this.connectHls(session);
    }
  }

  private connectHls(session: StreamSession): void {
    this.cleanupActiveConnection(session);
    session.state.status = 'connecting';
    session.state.error = null;
    this.broadcast(session);

    const hlsUrl = `/api/cameras/${encodeURIComponent(session.streamId)}/hls/stream.m3u8?mp4`;
    const token = session.options.token;

    if (Hls.isSupported()) {
      const masterVideo = document.createElement('video');
      masterVideo.muted = true;
      masterVideo.playsInline = true;
      masterVideo.autoplay = true;
      session.masterVideo = masterVideo;

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

      session.hls = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(masterVideo);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        masterVideo.play().catch(() => {});
        session.retryCount = 0;

        let capturedStream: MediaStream | null = null;
        if (typeof (masterVideo as any).captureStream === 'function') {
          capturedStream = (masterVideo as any).captureStream();
        } else if (typeof (masterVideo as any).mozCaptureStream === 'function') {
          capturedStream = (masterVideo as any).mozCaptureStream();
        }

        session.state = {
          status: 'streaming',
          streamType: 'hls',
          mediaStream: capturedStream,
          hlsUrl,
          error: null,
          retrySecondsLeft: 0
        };
        this.broadcast(session);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn(`[CameraStreamManager] HLS fatal error on ${session.streamId}:`, data.details);
          this.scheduleReconnect(session, 'HLS Stream Error');
        }
      });
    } else {
      // Native Safari HLS or HLS direct URL fallback
      session.state = {
        status: 'streaming',
        streamType: 'hls',
        mediaStream: null,
        hlsUrl,
        error: null,
        retrySecondsLeft: 0
      };
      this.broadcast(session);
    }
  }

  private scheduleReconnect(session: StreamSession, errorMsg: string): void {
    this.clearTimers(session);
    this.cleanupActiveConnection(session);

    if (session.options.isUnavailable) {
      session.state = {
        status: 'error',
        streamType: 'snapshot',
        mediaStream: null,
        hlsUrl: null,
        error: errorMsg,
        retrySecondsLeft: 0
      };
      this.broadcast(session);
      return;
    }

    session.retryCount += 1;
    const backoffMs = Math.min(Math.round(3000 * Math.pow(1.8, Math.min(session.retryCount - 1, 4))), 30000);
    const seconds = Math.ceil(backoffMs / 1000);

    session.state = {
      status: 'error',
      streamType: 'snapshot',
      mediaStream: null,
      hlsUrl: null,
      error: errorMsg,
      retrySecondsLeft: seconds
    };
    this.broadcast(session);

    session.countdownInterval = setInterval(() => {
      if (session.state.retrySecondsLeft <= 1) {
        if (session.countdownInterval) {
          clearInterval(session.countdownInterval);
          session.countdownInterval = null;
        }
        session.state.retrySecondsLeft = 0;
        this.broadcast(session);
      } else {
        session.state.retrySecondsLeft -= 1;
        this.broadcast(session);
      }
    }, 1000);

    session.retryTimer = setTimeout(() => {
      if (session.countdownInterval) {
        clearInterval(session.countdownInterval);
        session.countdownInterval = null;
      }
      session.state.retrySecondsLeft = 0;
      this.initiateConnection(session);
    }, backoffMs);
  }
}

export const cameraStreamManager = new CameraStreamManager();
