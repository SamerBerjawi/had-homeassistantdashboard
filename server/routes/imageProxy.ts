/**
 * GET /api/image-proxy: fetches artwork for the browser (CORS / private-network workaround).
 * SSRF-sensitive: every redirect hop is re-checked and DNS answers are filtered
 * (publicOnlyDispatcher). The HA token is only ever forwarded to the trusted HA instance.
 */
import dns from 'node:dns';
import type express from 'express';
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici';
import { isPrivateOrLocalHost, isSameOriginHost } from '../lib/network';
import { errorCode, errorMessage } from '../lib/errors';

export interface ImageProxyDeps {
  requireHAAuth: express.RequestHandler;
  applyCorsHeaders: (req: express.Request, res: express.Response, allowMethods?: string) => void;
  getTrustedHaBase: () => string | null;
  resolveTargetHaBase: (haUrl?: string) => string;
  haDispatcher: UndiciAgent;
}

export function registerImageProxyRoutes(app: express.Express, deps: ImageProxyDeps) {
  const { requireHAAuth, applyCorsHeaders, getTrustedHaBase, resolveTargetHaBase, haDispatcher } = deps;

  // Universal Image Proxy to bypass CORS / Private Network restrictions for artwork color extraction
  const MAX_PROXY_IMAGE_BYTES = 10 * 1024 * 1024;
  const MAX_PROXY_REDIRECTS = 3;

  // Resolves DNS itself and refuses private addresses, so a public hostname that resolves (or
  // re-resolves via DNS rebinding) to a LAN or cloud-metadata IP can't be reached through the proxy.
  const publicOnlyDispatcher = new UndiciAgent({
    connect: {
      lookup: (hostname, opts, cb) => {
        dns.lookup(hostname, opts as dns.LookupOptions, (err, address: string | dns.LookupAddress[], family) => {
          if (err) return cb(err, address, family);
          const addresses: string[] = Array.isArray(address) ? address.map((a: dns.LookupAddress) => a.address) : [address];
          if (addresses.some((a) => isPrivateOrLocalHost(a))) {
            const blocked = Object.assign(new Error(`Refusing to proxy ${hostname}: resolves to a private address`), { code: 'EPRIVATEADDR' });
            return cb(blocked, address, family);
          }
          cb(null, address, family);
        });
      }
    }
  });

  app.options('/api/image-proxy', (req, res) => {
    applyCorsHeaders(req, res, 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.sendStatus(204);
  });

  app.get('/api/image-proxy', requireHAAuth, async (req, res) => {
    applyCorsHeaders(req, res, 'GET, OPTIONS');

    const rawUrl = (req.query.url as string) || '';
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const token: string = req.haToken ?? '';
    const haBase = getTrustedHaBase() || resolveTargetHaBase(req.clientHaUrl);

    let currentUrl: URL;
    try {
      // Relative paths (/api/media_player_proxy/..., /local/...) resolve against Home Assistant
      currentUrl = new URL(rawUrl, `${haBase}/`);
    } catch {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    try {
      let response: Awaited<ReturnType<typeof undiciFetch>>;
      let isTargetHa = false;

      // Follow redirects manually so every hop gets the same protocol and private-network checks
      for (let hop = 0; ; hop++) {
        if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
          return res.status(400).json({ error: 'Only http and https protocols are supported' });
        }

        isTargetHa = isSameOriginHost(currentUrl.toString(), haBase);
        if (!isTargetHa && isPrivateOrLocalHost(currentUrl.hostname)) {
          return res.status(403).json({ error: 'Access to private, local, or cloud metadata network addresses is prohibited' });
        }

        const headers: Record<string, string> = {
          'User-Agent': 'HomeAssistantDashboard/1.0',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        };
        // ONLY forward the Home Assistant token to the Home Assistant instance itself
        if (isTargetHa) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        response = await undiciFetch(currentUrl.toString(), {
          headers,
          redirect: 'manual',
          dispatcher: isTargetHa ? haDispatcher : publicOnlyDispatcher,
          signal: AbortSignal.timeout(6000),
        });

        const location = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && location) {
          await response.body?.cancel().catch(() => {});
          if (hop >= MAX_PROXY_REDIRECTS) {
            return res.status(502).json({ error: 'Too many redirects' });
          }
          currentUrl = new URL(location, currentUrl);
          continue;
        }
        break;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        return res.status(response.status).json({ error: `Remote image fetch failed with status ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        await response.body?.cancel().catch(() => {});
        return res.status(400).json({ error: 'Remote URL did not return an image content-type' });
      }

      const declaredLength = Number(response.headers.get('content-length') || 0);
      if (declaredLength > MAX_PROXY_IMAGE_BYTES) {
        await response.body?.cancel().catch(() => {});
        return res.status(413).json({ error: 'Remote image is too large' });
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      if (response.body) {
        for await (const chunk of response.body) {
          totalBytes += chunk.length;
          if (totalBytes > MAX_PROXY_IMAGE_BYTES) {
            return res.status(413).json({ error: 'Remote image is too large' });
          }
          chunks.push(Buffer.from(chunk));
        }
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Only reachable with a valid token, so keep it out of shared caches
      res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
      return res.send(Buffer.concat(chunks, totalBytes));
    } catch (err: unknown) {
      if (errorCode(err) === 'EPRIVATEADDR') {
        return res.status(403).json({ error: 'Access to private, local, or cloud metadata network addresses is prohibited' });
      }
      console.warn('[Image Proxy] Upstream fetch failed:', errorMessage(err));
      return res.status(502).json({ error: 'Failed to proxy image' });
    }
  });
}
