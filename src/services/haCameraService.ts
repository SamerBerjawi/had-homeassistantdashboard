/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Home Assistant Camera Service
 * Multi-tier media streaming provider:
 * 1. Native WebRTC client configuration query (`camera/webrtc/get_client_config`)
 * 2. HLS stream generation via HA Core (`camera/get_stream`)
 * 3. Authenticated MJPEG proxy stream URLs (`/api/camera_proxy_stream/${entityId}`)
 * 4. Authenticated camera snapshots & canvas extraction
 */

import { haWebSocketService } from './haWebSocket';
import { getActiveHAToken } from './haAuth';
import { getHAHttpBaseUrl, resolveHAImageUrl } from './haImageService';
import { getGo2RtcBaseUrls } from './go2rtcService';
import { ResolvedEntity } from '../types';

export interface WebRtcClientConfig {
  configuration?: RTCConfiguration;
  iceServers?: RTCIceServer[];
  dataChannel?: string;
  [key: string]: any;
}

export interface HlsStreamResult {
  url: string;
  hlsUrl: string;
}

/**
 * Fetch ICE server and WebRTC client configuration from Home Assistant.
 * Falls back to Google public STUN servers if unsupported by the backend.
 */
export async function getCameraWebRtcConfig(entityId: string): Promise<RTCConfiguration> {
  const defaultIceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ];

  if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
    return { iceServers: defaultIceServers };
  }

  try {
    const res = await haWebSocketService.sendRequest<WebRtcClientConfig>(
      'camera/webrtc/get_client_config',
      { entity_id: entityId }
    );

    if (res?.configuration) {
      return res.configuration;
    }

    if (res?.iceServers && Array.isArray(res.iceServers)) {
      return { iceServers: res.iceServers };
    }
  } catch (err) {
    console.debug('[haCameraService] get_client_config not supported or error:', err);
  }

  return { iceServers: defaultIceServers };
}

/**
 * Request an HLS stream URL from Home Assistant Core (`camera/get_stream`).
 */
export async function requestHACameraHlsStream(
  entityId: string,
  serverUrl?: string
): Promise<HlsStreamResult | null> {
  if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
    return null;
  }

  try {
    const res = await haWebSocketService.sendRequest<{ url: string }>(
      'camera/get_stream',
      { entity_id: entityId, format: 'hls' }
    );

    if (res && typeof res.url === 'string') {
      const baseUrl = getHAHttpBaseUrl(serverUrl || haWebSocketService.getCurrentUrl());
      const fullUrl = res.url.startsWith('http://') || res.url.startsWith('https://')
        ? res.url
        : `${baseUrl}${res.url.startsWith('/') ? '' : '/'}${res.url}`;

      return {
        url: res.url,
        hlsUrl: fullUrl
      };
    }
  } catch (err) {
    console.debug('[haCameraService] camera/get_stream failed:', err);
  }

  return null;
}

/**
 * Builds an authenticated MJPEG proxy stream URL for a camera entity.
 */
export function getHACameraMjpegUrl(
  entityId: string,
  serverUrl?: string,
  token?: string
): string {
  if (entityId.startsWith('go2rtc.')) {
    const streamName = entityId.replace(/^go2rtc\./, '');
    const { httpUrl } = getGo2RtcBaseUrls(serverUrl);
    return `${httpUrl}/api/stream.mjpeg?src=${encodeURIComponent(streamName)}`;
  }

  const baseUrl = getHAHttpBaseUrl(serverUrl || haWebSocketService.getCurrentUrl());
  const activeToken = token || haWebSocketService.getCurrentToken() || getActiveHAToken();
  const tokenParam = activeToken ? `?token=${encodeURIComponent(activeToken)}` : '';

  if (!baseUrl) {
    return `/api/camera_proxy_stream/${encodeURIComponent(entityId)}${tokenParam}`;
  }

  return `${baseUrl}/api/camera_proxy_stream/${encodeURIComponent(entityId)}${tokenParam}`;
}

/**
 * Builds an authenticated snapshot URL for a camera entity.
 */
export function getHACameraSnapshotUrl(
  entityId: string,
  serverUrl?: string,
  token?: string
): string {
  if (entityId.startsWith('go2rtc.')) {
    const streamName = entityId.replace(/^go2rtc\./, '');
    const { httpUrl } = getGo2RtcBaseUrls(serverUrl);
    return `${httpUrl}/api/frame.jpeg?src=${encodeURIComponent(streamName)}`;
  }

  const baseUrl = getHAHttpBaseUrl(serverUrl || haWebSocketService.getCurrentUrl());
  const activeToken = token || haWebSocketService.getCurrentToken() || getActiveHAToken();
  const tokenParam = activeToken ? `?token=${encodeURIComponent(activeToken)}` : '';

  if (!baseUrl) {
    return `/api/camera_proxy/${encodeURIComponent(entityId)}${tokenParam}`;
  }

  return `${baseUrl}/api/camera_proxy/${encodeURIComponent(entityId)}${tokenParam}`;
}

/**
 * Captures a high-resolution frame from a playing video element or snapshot URL and triggers file download.
 */
export async function downloadCameraFrame(
  videoElement: HTMLVideoElement | null,
  camera: ResolvedEntity | { entity_id: string; name?: string },
  fallbackUrl?: string | null
): Promise<boolean> {
  const camName = (camera as any).name || (camera as any).attributes?.friendly_name || camera.entity_id;
  const safeName = camName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `snapshot_${safeName}_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;

  // 1. Try canvas extraction from HTMLVideoElement
  if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        return new Promise<boolean>((resolve) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(false);
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve(true);
          }, 'image/jpeg', 0.95);
        });
      }
    } catch (e) {
      console.warn('[haCameraService] Direct video canvas capture error:', e);
    }
  }

  // 2. Fallback to image snapshot URL fetch
  const targetUrl = fallbackUrl || getHACameraSnapshotUrl(camera.entity_id);
  try {
    const res = await fetch(targetUrl);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.warn('[haCameraService] Fallback snapshot fetch failed:', err);
  }

  return false;
}
