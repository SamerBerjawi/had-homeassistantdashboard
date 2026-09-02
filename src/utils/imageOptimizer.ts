/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Client-Side Image Optimization Pipeline
 * Validates MIME types, scales high-res images, and compresses raster graphics
 * to ensure fast uploads, low memory footprint, and snappy kiosk rendering.
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml'
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface ImageOptimizationOptions {
  maxDimension?: number;    // Maximum width or height in px (default: 1920)
  maxSizeBytes?: number;    // Maximum output file size in bytes (default: 1.5MB)
  preferredFormat?: 'image/webp' | 'image/png';
  quality?: number;         // 0.1 to 1.0 (default: 0.88)
}

export interface OptimizedImageResult {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  wasCompressed: boolean;
}

/**
 * Detects MIME type from Data URL or File
 */
export function extractMimeType(fileOrDataUrl: File | string): string {
  if (typeof fileOrDataUrl === 'string') {
    const match = fileOrDataUrl.match(/^data:([^;]+);/);
    return match ? match[1].toLowerCase() : 'application/octet-stream';
  }
  return fileOrDataUrl.type ? fileOrDataUrl.type.toLowerCase() : 'application/octet-stream';
}

/**
 * Calculates byte size of a Data URL
 */
export function getDataUrlByteSize(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(',');
  if (base64Index === -1) return dataUrl.length;
  const base64Str = dataUrl.slice(base64Index + 1);
  return Math.round((base64Str.length * 3) / 4);
}

/**
 * Validates that an image matches supported MIME types
 */
export function validateImageMimeType(mimeType: string): asserts mimeType is AllowedImageMimeType {
  const isAllowed = ALLOWED_IMAGE_MIME_TYPES.some((allowed) => allowed === mimeType);
  if (!isAllowed) {
    throw new Error(
      `Unsupported image format (${mimeType}). Please upload a PNG, JPEG, WebP, or SVG file.`
    );
  }
}

/**
 * Converts a File object to Data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image from a Data URL into an HTMLImageElement
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for optimization.'));
    img.src = dataUrl;
  });
}

/**
 * Optimizes an image client-side before remote NAS upload
 */
export async function optimizeImageForUpload(
  fileOrDataUrl: File | string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxDimension = 1920,
    maxSizeBytes = 1.5 * 1024 * 1024, // 1.5 MB
    preferredFormat,
    quality = 0.88
  } = options;

  const rawDataUrl = typeof fileOrDataUrl === 'string'
    ? fileOrDataUrl
    : await fileToDataUrl(fileOrDataUrl);

  const mimeType = extractMimeType(fileOrDataUrl);
  validateImageMimeType(mimeType);

  const originalSizeBytes = typeof fileOrDataUrl === 'object' && 'size' in fileOrDataUrl
    ? fileOrDataUrl.size
    : getDataUrlByteSize(rawDataUrl);

  // SVG files are vector assets—pass through directly without rasterization
  if (mimeType === 'image/svg+xml') {
    return {
      dataUrl: rawDataUrl,
      mimeType: 'image/svg+xml',
      width: 0,
      height: 0,
      sizeBytes: originalSizeBytes,
      originalSizeBytes,
      wasCompressed: false
    };
  }

  // Load raster image
  const img = await loadImage(rawDataUrl);
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // Check if resizing or compression is required
  const needsDownscaling = origWidth > maxDimension || origHeight > maxDimension;
  const needsCompression = originalSizeBytes > maxSizeBytes;

  if (!needsDownscaling && !needsCompression && !preferredFormat) {
    return {
      dataUrl: rawDataUrl,
      mimeType,
      width: origWidth,
      height: origHeight,
      sizeBytes: originalSizeBytes,
      originalSizeBytes,
      wasCompressed: false
    };
  }

  // Calculate scaled dimensions keeping aspect ratio
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (origWidth > maxDimension || origHeight > maxDimension) {
    if (origWidth >= origHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round((origHeight * maxDimension) / origWidth);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((origWidth * maxDimension) / origHeight);
    }
  }

  // Draw to off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: true });

  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      mimeType,
      width: origWidth,
      height: origHeight,
      sizeBytes: originalSizeBytes,
      originalSizeBytes,
      wasCompressed: false
    };
  }

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Choose optimal output format
  const outFormat = preferredFormat || (mimeType === 'image/png' ? 'image/png' : 'image/webp');

  let currentQuality = quality;
  let optimizedDataUrl = canvas.toDataURL(outFormat, currentQuality);
  let optimizedSize = getDataUrlByteSize(optimizedDataUrl);

  // If output is still larger than maxSizeBytes, step down quality with WebP
  if (optimizedSize > maxSizeBytes && outFormat !== 'image/png') {
    while (optimizedSize > maxSizeBytes && currentQuality > 0.5) {
      currentQuality -= 0.1;
      optimizedDataUrl = canvas.toDataURL('image/webp', currentQuality);
      optimizedSize = getDataUrlByteSize(optimizedDataUrl);
    }
  }

  return {
    dataUrl: optimizedDataUrl,
    mimeType: outFormat,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: optimizedSize,
    originalSizeBytes,
    wasCompressed: true
  };
}
