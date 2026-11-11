/**
 * Serves the SPA: Vite middleware in development, precompressed dist/ with SPA fallback in production.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { errorMessage } from './lib/errors';

export async function registerFrontend(app: express.Express) {
  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/data/assets/**', '**/data/config/**']
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const setStaticCacheHeaders = (res: express.Response, filePath: string) => {
      const fileName = path.basename(filePath);
      if (['sw.js', 'registerSW.js', 'manifest.json', 'favicon.svg', 'index.html'].includes(fileName)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
      } else if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    };

    // dist/ also holds the server bundle and its source map; never serve them as static files
    app.use((req, res, next) => {
      let normalizedPath = req.path;
      try {
        // Normalize like the static handler does, so /assets/../server.cjs is caught too
        normalizedPath = path.posix.normalize(decodeURIComponent(req.path));
      } catch {
        return res.status(400).end();
      }
      if (/^\/server\.cjs/i.test(normalizedPath)) return res.status(404).end();
      next();
    });

    // Serve the .br/.gz copies written at build time (scripts/compress-dist.cjs). The index is
    // built once at startup so requests don't hit the disk to look for variants.
    const precompressed = new Set<string>();
    const indexPrecompressed = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) indexPrecompressed(full);
        else if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) precompressed.add(full);
      }
    };
    try {
      indexPrecompressed(distPath);
    } catch (err: unknown) {
      console.warn('[HAD Server] Could not index precompressed assets:', errorMessage(err));
    }

    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || precompressed.size === 0) return next();
      let filePath: string;
      try {
        filePath = path.join(distPath, decodeURIComponent(req.path));
      } catch {
        return next();
      }
      if (!filePath.startsWith(distPath + path.sep)) return next();

      const acceptEncoding = String(req.headers['accept-encoding'] || '');
      const variant = /\bbr\b/.test(acceptEncoding) && precompressed.has(`${filePath}.br`)
        ? { encoding: 'br', file: `${filePath}.br` }
        : /\bgzip\b/.test(acceptEncoding) && precompressed.has(`${filePath}.gz`)
          ? { encoding: 'gzip', file: `${filePath}.gz` }
          : null;
      if (!variant) return next();

      res.setHeader('Content-Encoding', variant.encoding);
      res.setHeader('Vary', 'Accept-Encoding');
      res.type(path.extname(filePath));
      setStaticCacheHeaders(res, filePath);
      res.sendFile(variant.file, (err) => {
        if (err && !res.headersSent) next();
      });
    });

    app.use(express.static(distPath, { setHeaders: setStaticCacheHeaders }));
    app.get('*', (req, res) => {
      // A missing file (e.g. a chunk from a previous deployment) must 404, not get index.html
      // with a 200: the browser would fail on the HTML as a script and the client would reload in a loop.
      if (req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) {
        return res.status(404).end();
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}
