/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * go2rtc Stream Discovery and WebRTC Signaling Service.
 * Detects streams configured directly in go2rtc (e.g., in go2rtc.yaml under `streams:`),
 * including RTSP streams without an explicit Home Assistant camera entity.
 */

import { ResolvedEntity } from '../types';

export interface Go2RtcProducer {
  url?: string;
  type?: string;
  [key: string]: any;
}

export interface Go2RtcStreamInfo {
  producers?: (Go2RtcProducer | string)[];
  consumers?: any[];
  [key: string]: any;
}

/**
 * Resolves the go2rtc HTTP and WebSocket base URLs.
 * Checks localStorage preference first ('homz_go2rtc_url'), then derives from HA serverUrl,
 * window.location.hostname, or falls back to localhost:1984.
 */
export function getGo2RtcBaseUrls(serverUrl?: string): { httpUrl: string; wsUrl: string } {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('homz_go2rtc_url');
    if (custom && custom.trim()) {
      const clean = custom
        .trim()
        .replace(/\/api\/(stream\.html|ws|webrtc|frame\.(mp4|jpeg)|stream\.(mp4|mjpeg|m3u8)).*$/i, '')
        .replace(/\/+$/, '');
      const isHttps = clean.startsWith('https://');
      const wsUrl = (isHttps ? clean.replace(/^https:\/\//i, 'wss://') : clean.replace(/^http:\/\//i, 'ws://'));
      return { httpUrl: clean, wsUrl };
    }
  }

  // Derive hostname from HA serverUrl
  let hostname = 'localhost';
  if (serverUrl) {
    try {
      const u = new URL(serverUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://'));
      if (u.hostname && !u.hostname.includes('hass.homz.internal')) {
        hostname = u.hostname;
      }
    } catch {
      // ignore
    }
  } else if (typeof window !== 'undefined' && window.location.hostname) {
    hostname = window.location.hostname;
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const httpProto = isHttps ? 'https:' : 'http:';
  const wsProto = isHttps ? 'wss:' : 'ws:';

  const httpUrl = `${httpProto}//${hostname}:1984`;
  const wsUrl = `${wsProto}//${hostname}:1984`;

  return { httpUrl, wsUrl };
}

/**
 * Checks if a stream configuration in go2rtc contains an RTSP producer.
 */
export function hasRtspProducer(streamInfo: Go2RtcStreamInfo | any): boolean {
  if (!streamInfo) return false;

  if (Array.isArray(streamInfo)) {
    return streamInfo.some(p => {
      if (typeof p === 'string') return p.toLowerCase().startsWith('rtsp://') || p.toLowerCase().startsWith('rtsps://');
      if (p && typeof p.url === 'string') return p.url.toLowerCase().startsWith('rtsp://') || p.url.toLowerCase().startsWith('rtsps://');
      return false;
    });
  }

  if (Array.isArray(streamInfo.producers)) {
    return streamInfo.producers.some((p: any) => {
      if (typeof p === 'string') return p.toLowerCase().startsWith('rtsp://') || p.toLowerCase().startsWith('rtsps://');
      if (p && typeof p.url === 'string') return p.url.toLowerCase().startsWith('rtsp://') || p.url.toLowerCase().startsWith('rtsps://');
      return false;
    });
  }

  if (typeof streamInfo.url === 'string') {
    return streamInfo.url.toLowerCase().startsWith('rtsp://') || streamInfo.url.toLowerCase().startsWith('rtsps://');
  }

  return false;
}

/**
 * Extracts the primary producer URL from a stream configuration.
 */
export function getPrimaryProducerUrl(streamInfo: Go2RtcStreamInfo | any): string {
  if (!streamInfo) return '';

  if (Array.isArray(streamInfo) && streamInfo.length > 0) {
    const first = streamInfo[0];
    return typeof first === 'string' ? first : (first?.url || '');
  }

  if (Array.isArray(streamInfo.producers) && streamInfo.producers.length > 0) {
    const first = streamInfo.producers[0];
    return typeof first === 'string' ? first : (first?.url || '');
  }

  if (typeof streamInfo.url === 'string') {
    return streamInfo.url;
  }

  return '';
}

/**
 * Formats a raw stream name (e.g., 'driveway_cam', 'backyard-rtsp') into a friendly display name.
 */
function formatStreamFriendlyName(streamName: string): string {
  return streamName
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Queries go2rtc's `/api/streams` endpoint to retrieve all active configured streams.
 * Tries direct browser fetch first, then seamlessly falls back to the backend proxy.
 */
export async function fetchGo2RtcStreams(serverUrl?: string): Promise<Record<string, Go2RtcStreamInfo>> {
  const { httpUrl } = getGo2RtcBaseUrls(serverUrl);
  const directEndpoint = `${httpUrl}/api/streams`;

  // 1. Try direct browser fetch
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(directEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    // Direct fetch failed (e.g. CORS/Private Network Access/Port mismatch). Proceed to backend proxy.
  }

  // 2. Try backend proxy
  try {
    const proxyEndpoint = `/api/go2rtc/streams?url=${encodeURIComponent(httpUrl)}`;
    const proxyResponse = await fetch(proxyEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (proxyResponse.ok) {
      const result = await proxyResponse.json();
      if (result.success && result.streams && typeof result.streams === 'object') {
        return result.streams;
      }
      if (result && typeof result === 'object' && !Array.isArray(result) && !result.error) {
        return result;
      }
    }
  } catch (err) {
    // Backend proxy query failed
  }

  return {};
}

/**
 * Tests connection to go2rtc and returns stream count and names.
 */
export async function testGo2RtcConnection(
  targetUrl?: string
): Promise<{ success: boolean; streamsCount: number; streamNames: string[]; error?: string }> {
  try {
    const streams = await fetchGo2RtcStreams(targetUrl);
    const names = Object.keys(streams);
    if (names.length >= 0) {
      return {
        success: true,
        streamsCount: names.length,
        streamNames: names
      };
    }
    return { success: false, streamsCount: 0, streamNames: [], error: 'No streams returned' };
  } catch (err: any) {
    return { success: false, streamsCount: 0, streamNames: [], error: err?.message || 'Connection failed' };
  }
}

/**
 * Detects streams in go2rtc that lack an explicit Home Assistant camera entity
 * and transforms them into synthetic `ResolvedEntity` camera objects.
 */
export function detectGo2RtcRtspStreams(
  streams: Record<string, Go2RtcStreamInfo>,
  existingCameras: ResolvedEntity[],
  serverUrl?: string
): ResolvedEntity[] {
  if (!streams || Object.keys(streams).length === 0) {
    return [];
  }

  const { httpUrl } = getGo2RtcBaseUrls(serverUrl);
  // Collect existing HA camera entity IDs in lower case
  const existingEntityMap = new Map<string, ResolvedEntity>();
  existingCameras
    .filter(c => !c.entity_id.startsWith('go2rtc.'))
    .forEach(c => {
      existingEntityMap.set(c.entity_id.toLowerCase(), c);
    });

  const detectedEntities: ResolvedEntity[] = [];

  for (const [streamName, streamInfo] of Object.entries(streams)) {
    if (!streamName || streamName.startsWith('.')) continue;

    const lowerStream = streamName.toLowerCase();
    const potentialEntityId = `camera.${lowerStream}`;

    const producerUrl = getPrimaryProducerUrl(streamInfo);
    const isRtsp = hasRtspProducer(streamInfo) || producerUrl.toLowerCase().includes('rtsp');
    const hasBackchannel = producerUrl.toLowerCase().includes('backchannel');
    const friendlyName = formatStreamFriendlyName(streamName);

    // If an existing real HA camera entity matches camera.<stream_name>, enrich its attributes and include in go2rtc cameras list
    const matchingExisting = existingEntityMap.get(potentialEntityId) || existingEntityMap.get(lowerStream);
    if (matchingExisting) {
      const enriched: ResolvedEntity = {
        ...matchingExisting,
        attributes: {
          ...matchingExisting.attributes,
          stream_source: 'go2rtc',
          go2rtc_stream: streamName,
          is_rtsp_stream: isRtsp,
          has_two_way_audio: hasBackchannel || matchingExisting.attributes?.has_two_way_audio,
          stream_type: 'webrtc',
          frontend_stream_types: ['web_rtc']
        }
      };
      detectedEntities.push(enriched);
      continue;
    }

    // Build synthetic ResolvedEntity for the detected stream
    const syntheticCamera: ResolvedEntity = {
      entity_id: `go2rtc.${streamName}`,
      domain: 'camera',
      name: `${friendlyName}${isRtsp ? ' (RTSP)' : ''}`,
      state: 'idle',
      area_id: null,
      device_id: null,
      floor_id: null,
      resolutionSource: 'unassigned',
      hidden: false,
      isDiagnostic: false,
      attributes: {
        friendly_name: `${friendlyName}${isRtsp ? ' (RTSP)' : ''}`,
        stream_source: 'go2rtc',
        go2rtc_stream: streamName,
        is_rtsp_stream: isRtsp,
        rtsp_url: producerUrl,
        has_two_way_audio: hasBackchannel,
        stream_type: 'webrtc',
        frontend_stream_types: ['web_rtc'],
        model_name: isRtsp ? 'go2rtc RTSP Stream' : 'go2rtc Live Stream',
        resolution: isRtsp ? 'HD RTSP Stream' : 'Live WebRTC',
        entity_picture: `${httpUrl}/api/frame.jpeg?src=${encodeURIComponent(streamName)}`
      }
    };

    detectedEntities.push(syntheticCamera);
  }

  return detectedEntities;
}

/**
 * Direct WebRTC negotiation with go2rtc (WebSocket with HTTP POST fallback).
 */
export async function negotiateGo2RtcWebRtcSession(
  pc: RTCPeerConnection,
  streamName: string,
  serverUrl?: string,
  onConnected?: () => void,
  onError?: (err: any) => void
): Promise<() => void> {
  const { httpUrl, wsUrl } = getGo2RtcBaseUrls(serverUrl);
  let isCleanedUp = false;
  let ws: WebSocket | null = null;

  const cleanup = () => {
    isCleanedUp = true;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        // ignore
      }
      ws = null;
    }
  };

  // HTTP POST SDP fallback
  const negotiateHttp = async () => {
    if (isCleanedUp) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait briefly for ICE gathering
      await new Promise<void>(resolve => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const handler = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', handler);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', handler);
          setTimeout(resolve, 800);
        }
      });

      if (isCleanedUp) return;

      const postUrl = `${httpUrl}/api/webrtc?src=${encodeURIComponent(streamName)}`;
      let answerSdp = '';

      try {
        const response = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: pc.localDescription?.sdp || offer.sdp
        });
        if (response.ok) {
          answerSdp = await response.text();
        }
      } catch {
        // Fallback to local server proxy endpoint
        try {
          const proxyUrl = `/api/go2rtc/webrtc?url=${encodeURIComponent(httpUrl)}&src=${encodeURIComponent(streamName)}`;
          const proxyRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: pc.localDescription?.sdp || offer.sdp
          });
          if (proxyRes.ok) {
            answerSdp = await proxyRes.text();
          }
        } catch {
          // ignore
        }
      }

      if (answerSdp && !isCleanedUp && pc.signalingState !== 'closed') {
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        onConnected?.();
      } else {
        throw new Error(`go2rtc HTTP WebRTC negotiation failed for stream "${streamName}"`);
      }
    } catch (e: any) {
      if (!isCleanedUp) {
        onError?.(e);
      }
    }
  };

  try {
    const targetWsUrl = `${wsUrl}/api/ws?src=${encodeURIComponent(streamName)}`;
    ws = new WebSocket(targetWsUrl);

    const wsTimeout = setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        try {
          ws.close();
        } catch {
          // ignore
        }
        negotiateHttp();
      }
    }, 2500);

    ws.onopen = async () => {
      clearTimeout(wsTimeout);
      if (isCleanedUp) return;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'webrtc/offer',
            value: offer.sdp
          }));
        }
      } catch (err) {
        negotiateHttp();
      }
    };

    ws.onmessage = async (event) => {
      if (isCleanedUp) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'webrtc/answer') {
          await pc.setRemoteDescription({
            type: 'answer',
            sdp: data.value
          });
          onConnected?.();
        } else if (data.type === 'webrtc/candidate' && data.value) {
          await pc.addIceCandidate({
            candidate: data.value,
            sdpMid: '',
            sdpMLineIndex: 0
          });
        }
      } catch (e) {
        console.warn('[go2rtc] Error parsing WS message:', e);
      }
    };

    // Trickle local candidates to go2rtc
    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc/candidate',
          value: event.candidate.candidate
        }));
      }
    };

    ws.onerror = () => {
      clearTimeout(wsTimeout);
      negotiateHttp();
    };
  } catch {
    negotiateHttp();
  }

  return cleanup;
}
