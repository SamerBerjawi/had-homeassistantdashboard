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

export interface CameraEntitySettings {
  cameraStreamEngine: 'auto' | 'go2rtc' | 'ha' | 'snapshot';
  cameraWebrtcUrl?: string; // template URL with {entity_id} and {entity_object_id}
  cameraGo2rtcMode?: 'auto' | 'webrtc' | 'mse';
  cameraRefreshMode?: 'interval' | 'motion';
  cameraRefreshInterval?: number; // seconds, min 2, default 10
  cameraMotionSensor?: string; // binary_sensor entity id
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
 * Query camera frontend streaming capabilities from Home Assistant (`camera/capabilities`).
 * Returns an array of supported stream types (e.g. ['web_rtc', 'hls']) or null.
 */
export async function getCameraCapabilities(entityId: string): Promise<string[] | null> {
  if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
    return ['web_rtc', 'hls'];
  }

  try {
    const res = await haWebSocketService.sendRequest<{ frontend_stream_types: string[] }>(
      'camera/capabilities',
      { entity_id: entityId }
    );
    if (res?.frontend_stream_types && Array.isArray(res.frontend_stream_types)) {
      return res.frontend_stream_types;
    }
  } catch (err) {
    console.debug('[haCameraService] camera/capabilities not supported or error:', err);
  }

  return null;
}

/**
 * Request a short-lived signed path for a media or camera proxy resource (`auth/sign_path`).
 */
export async function signCameraPath(path: string, expiresIn: number = 30): Promise<string | null> {
  if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
    return null;
  }

  try {
    const res = await haWebSocketService.sendRequest<{ path: string }>(
      'auth/sign_path',
      { path, expires_in: expiresIn }
    );
    if (res?.path && typeof res.path === 'string') {
      return res.path;
    }
  } catch (err) {
    console.debug('[haCameraService] auth/sign_path error:', err);
  }

  return null;
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
 * Builds an authenticated preview snapshot URL with a cache-busting query parameter.
 */
export function getHACameraPreviewSnapshotUrl(
  entityId: string,
  serverUrl?: string,
  token?: string,
  timestamp: number = Date.now()
): string {
  const baseSnapUrl = getHACameraSnapshotUrl(entityId, serverUrl, token);
  const separator = baseSnapUrl.includes('?') ? '&' : '?';
  return `${baseSnapUrl}${separator}_ts=${timestamp}`;
}

export type CameraCodecMode = 'auto' | 'h264' | 'copy';

/**
 * Retrieves stored codec mode preference for a camera entity.
 */
export function getCameraCodecPreference(entityId: string): CameraCodecMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = localStorage.getItem(`homz_camera_codec_${entityId}`);
    if (stored === 'h264' || stored === 'copy' || stored === 'auto') {
      return stored as CameraCodecMode;
    }
  } catch {
    // ignore
  }
  return 'auto';
}

/**
 * Saves codec mode preference for a camera entity.
 */
export function setCameraCodecPreference(entityId: string, mode: CameraCodecMode): void {
  if (typeof window === 'undefined') return;
  try {
    if (mode === 'auto') {
      localStorage.removeItem(`homz_camera_codec_${entityId}`);
    } else {
      localStorage.setItem(`homz_camera_codec_${entityId}`, mode);
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves per-camera streaming settings from local storage.
 */
export function getCameraSettings(entityId: string): CameraEntitySettings {
  const defaultSettings: CameraEntitySettings = {
    cameraStreamEngine: 'auto',
    cameraGo2rtcMode: 'auto',
    cameraRefreshMode: 'interval',
    cameraRefreshInterval: 10
  };

  if (typeof window === 'undefined' || !entityId) return defaultSettings;

  try {
    const raw = localStorage.getItem(`homz_camera_settings_${entityId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch {
    // ignore
  }

  return defaultSettings;
}

/**
 * Saves per-camera streaming settings to local storage and dispatches a notification event.
 */
export function saveCameraSettings(entityId: string, settings: Partial<CameraEntitySettings>): void {
  if (typeof window === 'undefined' || !entityId) return;

  try {
    const current = getCameraSettings(entityId);
    const updated = { ...current, ...settings };
    localStorage.setItem(`homz_camera_settings_${entityId}`, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('homz_camera_settings_changed', {
        detail: { entityId, settings: updated }
      })
    );
  } catch (err) {
    console.error('[haCameraService] saveCameraSettings error:', err);
  }
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
