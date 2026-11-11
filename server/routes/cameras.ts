/**
 * Camera status, WebRTC signaling, HLS relay and camera deletion via go2rtc.
 * Depends on go2rtc (GO2RTC_URL); see scripts/test-camera-pipeline.ts.
 */
import type express from 'express';
import { Readable } from 'node:stream';
import {
  redactCredentialsInText,
  resolveHlsSubpath,
  validateCameraSourceUrl,
  HLS_FORWARDED_QUERY_KEYS
} from '../lib/security';
import type { ConfigStore } from '../services/configStore';

export interface CameraRoutesDeps {
  requireHAAuth: express.RequestHandler;
  requireHAAdmin: express.RequestHandler;
  applyCorsHeaders: (req: express.Request, res: express.Response, allowMethods?: string) => void;
  configStore: ConfigStore;
  broadcastConfigUpdate: (serverVersion: number) => void;
}

export function registerCameraRoutes(app: express.Express, deps: CameraRoutesDeps) {
  const { requireHAAuth, requireHAAdmin, applyCorsHeaders, configStore, broadcastConfigUpdate } = deps;

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Camera RTSP Streaming & go2rtc Proxy Layer
  // -------------------------------------------------------------
  const isDev = process.env.NODE_ENV !== 'production';
  const hasExplicitGo2RtcUrl = Boolean(process.env.GO2RTC_URL);
  // In development environments, do not attempt to contact or proxy go2rtc unless explicitly configured
  const GO2RTC_ENABLED = !isDev || hasExplicitGo2RtcUrl;
  const GO2RTC_URL = (process.env.GO2RTC_URL || (isDev ? '' : 'http://127.0.0.1:1984')).replace(/\/+$/, '');
  const registeredGo2RtcStreams = new Map<string, string>(); // streamName -> rtspUrl

  function getCameraStreamName(cameraId: string): string {
    return cameraId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function getCameraRtspConfig(cameraId: string): { streamName: string; rtspUrl: string } | null {
    const sources = configStore.cachedConfig?.cameras?.sources;
    if (!sources || typeof sources !== 'object') return null;
    const entry =
      sources[cameraId] ||
      Object.values(sources).find(
        (s: any) =>
          s?.id === cameraId ||
          s?.haEntityId === cameraId ||
          (s?.id && `camera.${s.id}` === cameraId) ||
          (cameraId.startsWith('camera.') && s?.id === cameraId.replace('camera.', ''))
      );
    if (!entry || !entry.rtspUrl) return null;
    const streamName = getCameraStreamName(entry.id || cameraId);
    return { streamName, rtspUrl: String(entry.rtspUrl).trim() };
  }

  /**
   * Registers every configured camera with go2rtc ahead of time, so the first viewer's WebRTC
   * request doesn't also pay for stream registration. Runs at startup and after config saves.
   */
  async function prewarmCameraStreams(): Promise<void> {
    if (!GO2RTC_ENABLED || !GO2RTC_URL) return;
    if (!configStore.cachedConfig) {
      await configStore.readPersistentConfig().catch(() => null);
    }
    const sources = configStore.cachedConfig?.cameras?.sources;
    if (!sources || typeof sources !== 'object') return;
    await Promise.all(
      Object.entries(sources).map(([key, entry]: [string, any]) => {
        if (!entry?.rtspUrl) return Promise.resolve(false);
        return ensureGo2RtcStream(getCameraStreamName(entry.id || key), String(entry.rtspUrl).trim());
      })
    );
  }

  let lastGo2RtcWarnTime = 0;
  function logGo2RtcUnreachable(errMessage: string) {
    if (!GO2RTC_ENABLED) return;
    const now = Date.now();
    if (now - lastGo2RtcWarnTime > 30000) {
      lastGo2RtcWarnTime = now;
      console.warn(`[go2rtc Proxy] go2rtc relay is unreachable at ${GO2RTC_URL} (${errMessage}). Ensure the go2rtc container is running or set GO2RTC_URL in your environment.`);
    }
  }

  async function ensureGo2RtcStream(streamName: string, rtspUrl: string): Promise<boolean> {
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return false;
    }
    if (registeredGo2RtcStreams.get(streamName) === rtspUrl) {
      return true;
    }
    // Defense in depth for configs saved before server-side validation existed (SEC-003)
    const sourceError = validateCameraSourceUrl(rtspUrl);
    if (sourceError) {
      console.warn(`[go2rtc Proxy] Refusing to register stream "${streamName}": ${sourceError}`);
      return false;
    }
    try {
      const targetUrl = `${GO2RTC_URL}/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(rtspUrl)}`;
      let res = await fetch(targetUrl, {
        method: 'PUT',
        signal: AbortSignal.timeout(4000)
      });
      if (res.status === 405 || !res.ok) {
        res = await fetch(targetUrl, {
          method: 'POST',
          signal: AbortSignal.timeout(4000)
        });
      }
      if (res.ok || res.status === 201) {
        registeredGo2RtcStreams.set(streamName, rtspUrl);
        return true;
      }
      console.warn(`[go2rtc Proxy] Failed to register stream "${streamName}": status ${res.status}`);
      return false;
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return false;
    }
  }

  // Camera streaming status check
  app.get('/api/cameras/status', requireHAAuth, async (req, res) => {
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return res.json({
        success: true,
        go2rtcOnline: false,
        devDisabled: true,
        error: 'go2rtc is disabled in development environment'
      });
    }
    try {
      const ping = await fetch(`${GO2RTC_URL}/api/streams`, { signal: AbortSignal.timeout(3000) });
      if (ping.ok) {
        const streams = JSON.parse(redactCredentialsInText(JSON.stringify(await ping.json())));
        return res.json({ success: true, go2rtcOnline: true, streams });
      }
      return res.json({ success: true, go2rtcOnline: false, error: `go2rtc returned status ${ping.status}` });
    } catch (err: any) {
      return res.json({ success: true, go2rtcOnline: false, error: 'go2rtc unreachable' });
    }
  });

  // WebRTC WHEP signaling proxy
  app.post('/api/cameras/:cameraId/webrtc', requireHAAuth, async (req, res) => {
    const { cameraId } = req.params;
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return res.status(503).json({
        success: false,
        devDisabled: true,
        error: 'go2rtc streaming is disabled in development environment'
      });
    }
    const config = getCameraRtspConfig(cameraId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Camera "${cameraId}" has no configured RTSP source URL`
      });
    }

    await ensureGo2RtcStream(config.streamName, config.rtspUrl);

    try {
      let clientSdp = '';
      if (typeof req.body === 'string') {
        clientSdp = req.body;
      } else if (req.body && typeof req.body.sdp === 'string') {
        clientSdp = req.body.sdp;
      } else {
        return res.status(400).json({ error: 'Missing client SDP offer in request body' });
      }

      const go2rtcRes = await fetch(`${GO2RTC_URL}/api/webrtc?src=${encodeURIComponent(config.streamName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'User-Agent': 'HomeAssistantDashboard/1.0'
        },
        body: clientSdp,
        signal: AbortSignal.timeout(6000)
      });

      if (!go2rtcRes.ok) {
        console.warn(`[go2rtc Proxy] WebRTC signaling failed (${go2rtcRes.status}): ${(await go2rtcRes.text()).slice(0, 200)}`);
        return res.status(go2rtcRes.status).json({
          error: `go2rtc WebRTC signaling failed (${go2rtcRes.status})`
        });
      }

      const answerSdp = await go2rtcRes.text();
      res.setHeader('Content-Type', 'application/json');
      applyCorsHeaders(req, res, 'POST, OPTIONS');
      return res.json({
        type: 'answer',
        sdp: answerSdp
      });
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return res.status(502).json({
        error: 'Failed to negotiate WebRTC stream with go2rtc'
      });
    }
  });

  // HLS stream and media segment proxy
  app.all('/api/cameras/:cameraId/hls*', requireHAAuth, async (req, res) => {
    // Playlist and segment fetches only (SEC-002): never relay other methods to go2rtc
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    const { cameraId } = req.params;
    if (!GO2RTC_ENABLED || !GO2RTC_URL) {
      return res.status(503).send('go2rtc streaming is disabled in development environment');
    }
    const config = getCameraRtspConfig(cameraId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Camera "${cameraId}" has no configured RTSP source URL`
      });
    }

    await ensureGo2RtcStream(config.streamName, config.rtspUrl);

    try {
      const subpath = resolveHlsSubpath(req.params[0]);
      if (!subpath) {
        return res.status(400).json({ success: false, error: 'Invalid HLS resource path' });
      }

      const urlObj = new URL(`${GO2RTC_URL}/api${subpath}`);
      urlObj.searchParams.set('src', config.streamName);
      for (const [k, v] of Object.entries(req.query)) {
        if (HLS_FORWARDED_QUERY_KEYS.has(k) && typeof v === 'string') {
          urlObj.searchParams.set(k, v);
        }
      }

      const go2rtcRes = await fetch(urlObj.toString(), {
        method: req.method,
        headers: {
          'User-Agent': 'HomeAssistantDashboard/1.0',
          Accept: '*/*'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!go2rtcRes.ok) {
        return res.status(go2rtcRes.status).send(`go2rtc HLS upstream error: ${go2rtcRes.status}`);
      }

      const contentType = go2rtcRes.headers.get('content-type') ||
        (subpath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T');
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS');

      if (subpath.endsWith('.m3u8')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      // PERF-009: stream the upstream body instead of buffering whole segments in memory
      if (req.method === 'HEAD' || !go2rtcRes.body) {
        return res.end();
      }
      const upstream = Readable.fromWeb(go2rtcRes.body as any);
      upstream.on('error', () => res.destroy());
      res.on('close', () => upstream.destroy());
      return void upstream.pipe(res);
    } catch (err: any) {
      logGo2RtcUnreachable(err?.message);
      return res.status(502).json({
        error: 'Failed to fetch HLS stream from go2rtc'
      });
    }
  });

  // Delete camera source endpoint
  app.delete('/api/cameras/:cameraId', requireHAAuth, requireHAAdmin, async (req, res) => {
    const { cameraId } = req.params;
    console.log(`[Camera API] Deleting camera stream source "${cameraId}"...`);

    try {
      const result = await configStore.withConfigWriteLock(async () => {
        const existing = await configStore.readPersistentConfig();
        const baseConfig = existing?.config || configStore.cachedConfig || null;
        const currentServerVersion = existing?.serverVersion || configStore.cachedVersion || 1;

        if (!baseConfig?.cameras?.sources || !baseConfig.cameras.sources[cameraId]) {
          return { nextVersion: null as number | null, removed: false };
        }

        // Work on a copy so a failed write leaves the cached config untouched (REL-002)
        const nextConfig = JSON.parse(JSON.stringify(baseConfig));
        delete nextConfig.cameras.sources[cameraId];

        const nextVersion = currentServerVersion + 1;
        await configStore.writeConfigFileAtomic(
          configStore.configFilePath,
          JSON.stringify({ serverVersion: nextVersion, config: nextConfig }, null, 2)
        );
        configStore.setCache(nextConfig, nextVersion);

        // Only after the config is durable: drop the stream from go2rtc
        const streamName = getCameraStreamName(cameraId);
        registeredGo2RtcStreams.delete(streamName);
        if (GO2RTC_ENABLED && GO2RTC_URL) {
          try {
            await fetch(`${GO2RTC_URL}/api/streams?src=${encodeURIComponent(streamName)}`, {
              method: 'DELETE',
              signal: AbortSignal.timeout(3000)
            });
            console.log(`[Camera API] Removed stream "${streamName}" from go2rtc`);
          } catch (err: any) {
            console.warn(`[Camera API] Could not delete stream "${streamName}" from go2rtc:`, err?.message);
          }
        }

        return { nextVersion, removed: true };
      });

      if (result.nextVersion) {
        broadcastConfigUpdate(result.nextVersion);
      }

      applyCorsHeaders(req, res, 'DELETE, OPTIONS');
      return res.json({ success: true, cameraId, removed: result.removed });
    } catch (err: any) {
      console.error(`[Camera API] Failed to delete camera "${cameraId}":`, err);
      return res.status(500).json({ success: false, error: 'Failed to delete camera source' });
    }
  });

  return { prewarmCameraStreams };
}
