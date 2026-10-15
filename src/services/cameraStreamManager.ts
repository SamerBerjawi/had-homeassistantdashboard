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

import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import type Hls from 'hls.js';
import { loadHls } from '../lib/loadHls';

// When WebRTC media can't get through on this network (e.g. remote access via a tunnel that
// blocks UDP), every camera would wait for the 4.5s watchdog before falling back. Remember it
// and go straight to HLS for a while; cleared on a successful WebRTC stream or network change.
const WEBRTC_UNREACHABLE_KEY = 'had_webrtc_unreachable_until';
const WEBRTC_UNREACHABLE_MS = 30 * 60 * 1000;
// Stop streaming when the page has been hidden (screen off, app in background) for this long
const HIDDEN_PAUSE_DELAY_MS = 15000;
// Send the WebRTC offer this long after the first local ICE candidate instead of waiting for
// public STUN servers; host candidates are enough to reach go2rtc on the LAN
const ICE_GATHER_GRACE_MS = 150;
const ICE_GATHER_MAX_MS = 1000;

function isWebRtcKnownUnreachable(): boolean {
  try {
    return Number(localStorage.getItem(WEBRTC_UNREACHABLE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function setWebRtcUnreachable(unreachable: boolean) {
  try {
    if (unreachable) localStorage.setItem(WEBRTC_UNREACHABLE_KEY, String(Date.now() + WEBRTC_UNREACHABLE_MS));
    else localStorage.removeItem(WEBRTC_UNREACHABLE_KEY);
  } catch {}
}

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
  /** Bumped on every HLS attempt and cleanup, so a slow hls.js load can't attach to a stale session. */
  hlsAttempt: number;
}

class CameraStreamManager {
  private sessions = new Map<string, StreamSession>();
  private teardownTimers = new Map<string, any>();
  private hiddenPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedForHidden = new Set<StreamSession>();

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }
    if (typeof window !== 'undefined') {
      // A different network may let WebRTC through again
      window.addEventListener('online', () => setWebRtcUnreachable(false));
    }
  }

  /** Pause streams while nobody can see them, and resume when the page is visible again. */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      if (this.hiddenPauseTimer) return;
      this.hiddenPauseTimer = setTimeout(() => {
        this.hiddenPauseTimer = null;
        for (const session of this.sessions.values()) {
          if (session.state.status === 'idle') continue;
          this.clearTimers(session);
          this.cleanupActiveConnection(session);
          session.state = { ...session.state, status: 'idle', streamType: 'snapshot', error: null, retrySecondsLeft: 0 };
          this.pausedForHidden.add(session);
          this.broadcast(session);
        }
      }, HIDDEN_PAUSE_DELAY_MS);
      return;
    }

    if (this.hiddenPauseTimer) {
      clearTimeout(this.hiddenPauseTimer);
      this.hiddenPauseTimer = null;
    }
    for (const session of this.pausedForHidden) {
      if (this.sessions.get(session.streamId) === session && session.subscribers.size > 0 && session.state.status === 'idle') {
        session.retryCount = 0;
        this.initiateConnection(session);
      }
    }
    this.pausedForHidden.clear();
  }

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
        masterVideo: null,
        hlsAttempt: 0
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
    session.hlsAttempt++;
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
    if (protocol === 'hls' || (protocol === 'auto' && isWebRtcKnownUnreachable())) {
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

      let mediaArrived = false;
      pc.ontrack = (event) => {
        mediaArrived = true;
        setWebRtcUnreachable(false);
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
          // Only a connection that never delivered media says this network blocks WebRTC;
          // a working one that drops (Wi-Fi blip) doesn't
          if (!mediaArrived) setWebRtcUnreachable(true);
          this.cleanupPeerConnection(session);
          this.connectHls(session);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait briefly for local ICE candidates (go2rtc's WHEP endpoint isn't trickle): until
      // gathering completes, a short grace after the first candidate, or the overall cap
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        let graceTimer: ReturnType<typeof setTimeout> | null = null;
        const finish = () => {
          pc.removeEventListener('icegatheringstatechange', onStateChange);
          pc.removeEventListener('icecandidate', onCandidate);
          if (graceTimer) clearTimeout(graceTimer);
          clearTimeout(maxTimer);
          resolve();
        };
        const onStateChange = () => {
          if (pc.iceGatheringState === 'complete') finish();
        };
        const onCandidate = (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate && !graceTimer) graceTimer = setTimeout(finish, ICE_GATHER_GRACE_MS);
        };
        const maxTimer = setTimeout(finish, ICE_GATHER_MAX_MS);
        pc.addEventListener('icegatheringstatechange', onStateChange);
        pc.addEventListener('icecandidate', onCandidate);
      });

      const sdpPayload = pc.localDescription?.sdp || offer.sdp;
      const token = session.options.token;

      const res = await fetchWithTimeout(`/api/cameras/${encodeURIComponent(session.streamId)}/webrtc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sdp: sdpPayload, type: 'offer' })
      }, 12000);

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        if (res.status === 503 && (errJson?.devDisabled || errJson?.error?.includes('disabled in development'))) {
          // In development environments, go2rtc is disabled by default: fallback cleanly to snapshot poster without retrying
          session.state = {
            status: 'idle',
            streamType: 'snapshot',
            mediaStream: null,
            hlsUrl: null,
            error: null,
            retrySecondsLeft: 0
          };
          this.broadcast(session);
          return;
        }
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
          if (!mediaArrived) setWebRtcUnreachable(true);
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
    const attempt = session.hlsAttempt;

    loadHls()
      .then((Hls) => {
        if (this.sessions.get(session.streamId) !== session || session.hlsAttempt !== attempt) return;
        this.attachHls(session, Hls, hlsUrl, token);
      })
      .catch((err) => {
        if (this.sessions.get(session.streamId) !== session || session.hlsAttempt !== attempt) return;
        console.warn(`[CameraStreamManager] Could not load HLS player for ${session.streamId}:`, err);
        this.scheduleReconnect(session, 'HLS player failed to load');
      });
  }

  private attachHls(session: StreamSession, Hls: typeof import('hls.js').default, hlsUrl: string, token?: string): void {
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
