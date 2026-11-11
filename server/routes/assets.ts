/**
 * Custom asset upload (POST /api/assets): vehicle PNGs and brand logos. Admin only; file signatures are verified.
 */
import type express from 'express';
import path from 'path';
import fs from 'fs';
import { isValidImageMagicBytes } from '../lib/imageValidation';

export interface AssetRoutesDeps {
  requireHAAuth: express.RequestHandler;
  requireHAAdmin: express.RequestHandler;
  applyCorsHeaders: (req: express.Request, res: express.Response, allowMethods?: string) => void;
  assetsDir: string;
  isAssetsStorageWritable: boolean;
}

export function registerAssetRoutes(app: express.Express, deps: AssetRoutesDeps) {
  const { requireHAAuth, requireHAAdmin, applyCorsHeaders, assetsDir, isAssetsStorageWritable } = deps;

  // NAS Custom Asset Upload API (vehicle PNGs / brand logos)
  const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

  app.post('/api/assets', requireHAAuth, requireHAAdmin, async (req, res) => {
    if (!isAssetsStorageWritable) {
      return res.status(503).json({
        success: false,
        error: 'Assets storage directory is not writable or reachable'
      });
    }

    try {
      const { dataUrl, key } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid dataUrl' });
      }

      // Parse base64 DataURL (e.g. data:image/png;base64,...)
      const match = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Invalid base64 DataURL format' });
      }

      const mimeType = match[1].toLowerCase();
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Cap upload size
      if (buffer.length > MAX_ASSET_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          error: `Asset size exceeds maximum limit of 5MB (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`
        });
      }

      // Restrict uploads strictly to safe raster image formats (no SVG to prevent stored XSS)
      const ALLOWED_MIME_TYPES: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/avif': 'avif'
      };

      const ext = ALLOWED_MIME_TYPES[mimeType];
      if (!ext) {
        return res.status(400).json({
          success: false,
          error: `Unsupported image type "${mimeType}". Allowed formats: PNG, JPEG, WebP, GIF, AVIF.`
        });
      }

      // Validate magic bytes / file signature to prevent executable or polyglot masquerading
      if (!isValidImageMagicBytes(buffer, mimeType)) {
        return res.status(400).json({
          success: false,
          error: 'Corrupted image file or MIME type does not match file signature (magic bytes).'
        });
      }

      // Sanitize key and generate safe unique filename to avoid path traversal
      const safeKey = (key || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const uniqueFilename = `${safeKey}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      if (!fs.existsSync(assetsDir)) {
        await fs.promises.mkdir(assetsDir, { recursive: true });
      }

      const targetPath = path.join(assetsDir, uniqueFilename);
      const tempFile = path.join(assetsDir, `.tmp-${uniqueFilename}`);

      const handle = await fs.promises.open(tempFile, 'w');
      try {
        await handle.writeFile(buffer);
        await handle.sync(); // fsync to ensure bytes reach physical NAS drive
      } finally {
        await handle.close();
      }
      await fs.promises.rename(tempFile, targetPath);

      console.log(`[NAS Assets Audit] Uploaded asset "${uniqueFilename}" (${(buffer.length / 1024).toFixed(1)} KB) saved with atomic fsync`);

      const publicUrl = `/api/assets/${uniqueFilename}`;
      return res.json({ success: true, url: publicUrl, filename: uniqueFilename });
    } catch (err: any) {
      console.error('[NAS Assets] Error saving asset:', err);
      return res.status(500).json({ success: false, error: 'Failed to save asset to persistent volume' });
    }
  });
}
