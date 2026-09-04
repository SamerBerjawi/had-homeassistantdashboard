/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * go2rtc Stream Discovery and WebRTC Signaling Service.
 * Detects streams configured directly in go2rtc (e.g., in go2rtc.yaml under `streams:`),
 * including RTSP streams without an explicit Home Assistant camera entity.
 */

import { ResolvedEntity } from '../types';
import { haWebSocketService } from './haWebSocket';

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

export interface Go2RtcHealthStatus {
  tested: boolean;
  loading: boolean;
  reachable: boolean;
  latencyMs: number | null;
  streamsCount: number;
  streamNames: string[];
  baseUrl: string;
  error?: string;
}

let lastHealthStatus: Go2RtcHealthStatus = {
  tested: false,
  loading: false,
  reachable: false,
  latencyMs: null,
  streamsCount: 0,
  streamNames: [],
  baseUrl: ''
};

const healthListeners: Set<(status: Go2RtcHealthStatus) => void> = new Set();

/**
 * Resolves the go2rtc HTTP and WebSocket base URLs.
 * Checks localStorage preference first ('homz_go2rtc_url'), then derives from HA serverUrl,
 * haWebSocketService connection URL, window.location.hostname, or falls back to localhost:1984.
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

  // 1. Derive hostname from HA serverUrl or active HA WebSocket URL
  const effectiveHaUrl = serverUrl || haWebSocketService.getCurrentUrl() || '';
  let hostname = '';

  if (effectiveHaUrl) {
    try {
      const u = new URL(effectiveHaUrl.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://'));
      if (u.hostname && !u.hostname.includes('hass.homz.internal')) {
        hostname = u.hostname;
      }
    } catch {
      // ignore
    }
  }

  // 2. Fallback to browser's current hostname if not localhost or if HA url wasn't set
  if (!hostname && typeof window !== 'undefined' && window.location.hostname) {
    hostname = window.location.hostname;
  }

  if (!hostname) {
    hostname = 'localhost';
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
  } catch {
    // Direct fetch failed (e.g. CORS/Private Network Access/Port mismatch). Proceed to backend proxy.
  }

  // 2. Try backend proxy
  try {
    const proxyEndpoint = `/api/go2rtc/streams?url=${encodeURIComponent(httpUrl)}`;
    const proxyResponse = await fetch(proxyEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000)
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
  } catch {
    // Backend proxy query failed
  }

  return {};
}

/**
 * Tests connection to go2rtc, measures round-trip latency, and updates global health state.
 */
export async function testGo2RtcConnection(
  targetUrl?: string
): Promise<{ success: boolean; streamsCount: number; streamNames: string[]; latencyMs: number | null; error?: string }> {
  const startTime = Date.now();
  const { httpUrl } = getGo2RtcBaseUrls(targetUrl);

  try {
    const streams = await fetchGo2RtcStreams(targetUrl);
    const names = Object.keys(streams);
    const latency = Date.now() - startTime;

    if (names.length >= 0) {
      const status: Go2RtcHealthStatus = {
        tested: true,
        loading: false,
        reachable: true,
        latencyMs: latency,
        streamsCount: names.length,
        streamNames: names,
        baseUrl: httpUrl
      };
      updateGo2RtcHealth(status);

      return {
        success: true,
        streamsCount: names.length,
        streamNames: names,
        latencyMs: latency
      };
    }

    const failedStatus: Go2RtcHealthStatus = {
      tested: true,
      loading: false,
      reachable: false,
      latencyMs: null,
      streamsCount: 0,
      streamNames: [],
      baseUrl: httpUrl,
      error: 'No streams returned'
    };
    updateGo2RtcHealth(failedStatus);

    return { success: false, streamsCount: 0, streamNames: [], latencyMs: null, error: 'No streams returned' };
  } catch (err: any) {
    const errMsg = err?.message || 'Connection failed';
    const failedStatus: Go2RtcHealthStatus = {
      tested: true,
      loading: false,
      reachable: false,
      latencyMs: null,
      streamsCount: 0,
      streamNames: [],
      baseUrl: httpUrl,
      error: errMsg
    };
    updateGo2RtcHealth(failedStatus);

    return { success: false, streamsCount: 0, streamNames: [], latencyMs: null, error: errMsg };
  }
}

/**
 * Subscribe to go2rtc health changes.
 */
export function subscribeGo2RtcHealth(listener: (status: Go2RtcHealthStatus) => void): () => void {
  healthListeners.add(listener);
  listener(lastHealthStatus);
  return () => {
    healthListeners.delete(listener);
  };
}

/**
 * Get current cached go2rtc health status.
 */
export function getGo2RtcHealth(): Go2RtcHealthStatus {
  return lastHealthStatus;
}

function updateGo2RtcHealth(status: Go2RtcHealthStatus): void {
  lastHealthStatus = status;
  for (const listener of healthListeners) {
    try {
      listener(status);
    } catch (e) {
      console.error('[go2rtc] Health listener error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homz_go2rtc_health_changed', { detail: status }));
  }
}

/**
 * Generates an actionable go2rtc.yaml `streams:` configuration snippet for H.265 transcode.
 */
export function generateGo2RtcConfigSnippet(streamName: string, rtspUrl?: string): string {
  const safeStreamName = streamName.replace(/^go2rtc\./, '').replace(/^camera\./, '') || 'camera_feed';
  const sampleUrl = rtspUrl || 'rtsp://admin:password@192.168.1.100:554/live/ch0';
  return `streams:
  ${safeStreamName}:
    - ${sampleUrl}#video=h264`;
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

