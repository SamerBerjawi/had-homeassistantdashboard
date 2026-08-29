/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Robust dynamic color palette extractor for media album artwork.
 * Uses a multi-stage fetch & proxy strategy to ensure 100% canvas readability
 * without CORS or tainted canvas errors, and applies vibrant perceptual color scoring.
 */

import { useState, useEffect } from 'react';

export interface AlbumArtPalette {
  primary: string;
  light: string;
  dark: string;
  glow: string;
  glowSubtle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  waveformPlayedGradient: string;
  isExtracted: boolean;
}

interface UseAlbumArtColorOptions {
  title?: string;
  artist?: string;
  darkMode?: boolean;
  defaultHue?: number;
}

// In-memory cache to store extracted HSL palettes
const colorCache = new Map<string, { h: number; s: number; l: number }>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * Builds a complete AlbumArtPalette from extracted HSL values
 */
export function buildPaletteFromHsl(
  h: number,
  s: number,
  l: number,
  darkMode: boolean = true,
  isExtracted: boolean = true
): AlbumArtPalette {
  // Enhance saturation for UI vibrancy while maintaining tone harmony
  const saturatedS = Math.max(s, 68);
  const primaryL = Math.max(46, Math.min(58, l));

  const primaryRgb = hslToRgb(h, saturatedS, primaryL);
  const lightRgb = hslToRgb(h, Math.max(saturatedS - 5, 55), Math.min(84, primaryL + 22));
  const darkRgb = hslToRgb(h, Math.min(100, saturatedS + 10), Math.max(28, primaryL - 18));
  const textRgb = darkMode
    ? hslToRgb(h, Math.max(saturatedS - 10, 50), 78)
    : hslToRgb(h, Math.max(saturatedS, 65), 32);

  const primary = `rgb(${primaryRgb.join(', ')})`;
  const light = `rgb(${lightRgb.join(', ')})`;
  const dark = `rgb(${darkRgb.join(', ')})`;
  const badgeText = `rgb(${textRgb.join(', ')})`;
  const glow = `rgba(${primaryRgb.join(', ')}, 0.45)`;
  const glowSubtle = `rgba(${primaryRgb.join(', ')}, 0.2)`;
  const badgeBg = `rgba(${primaryRgb.join(', ')}, 0.16)`;
  const badgeBorder = `rgba(${primaryRgb.join(', ')}, 0.35)`;
  const waveformPlayedGradient = `linear-gradient(to top, ${dark}, ${primary}, ${light})`;

  return {
    primary,
    light,
    dark,
    glow,
    glowSubtle,
    badgeBg,
    badgeBorder,
    badgeText,
    waveformPlayedGradient,
    isExtracted,
  };
}

/**
 * Deterministic fallback hue from title and artist strings (defaults to purple/indigo 275°)
 */
function getDeterministicHue(title: string = '', artist: string = '', defaultHue: number = 275): number {
  const seed = `${title}-${artist}`;
  if (!seed || seed === '-') return defaultHue;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Perceptual color analysis on pixel data from canvas
 */
function extractColorsFromImageData(imageData: ImageData): { h: number; s: number; l: number } | null {
  const data = imageData.data;
  const numBuckets = 36; // 10 degree hue intervals for high fidelity
  const buckets = Array.from({ length: numBuckets }, () => ({
    count: 0,
    totalS: 0,
    totalL: 0,
    hSum: 0,
    maxS: 0,
  }));

  let validPixels = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    sumR += r;
    sumG += g;
    sumB += b;
    validPixels++;

    const [h, s, l] = rgbToHsl(r, g, b);

    // Filter out extreme pitch black, pure white glare, or completely desaturated grays
    if (l < 8 || l > 93 || s < 10) continue;

    const bucketIdx = Math.min(numBuckets - 1, Math.floor(h / (360 / numBuckets)));
    const bkt = buckets[bucketIdx];
    bkt.count++;
    bkt.totalS += s;
    bkt.totalL += l;
    bkt.hSum += h;
    if (s > bkt.maxS) bkt.maxS = s;
  }

  // Score candidate hue clusters
  let bestBucket: (typeof buckets)[0] | null = null;
  let bestScore = -1;

  for (const b of buckets) {
    if (b.count === 0) continue;
    const avgS = b.totalS / b.count;
    const avgL = b.totalL / b.count;

    // Favor saturated colors with balanced luminance (35% - 70%)
    const lumFactor = 1 - Math.abs(avgL - 52) / 52;
    const satFactor = Math.pow(avgS / 100, 1.25);
    const countFactor = Math.pow(b.count / (validPixels || 1), 0.6);
    const maxSatBonus = (b.maxS / 100) * 0.5;

    const score = countFactor * 2.5 + satFactor * 3.5 + lumFactor * 1.5 + maxSatBonus;

    if (score > bestScore) {
      bestScore = score;
      bestBucket = b;
    }
  }

  if (bestBucket && bestBucket.count > 0) {
    const avgH = bestBucket.hSum / bestBucket.count;
    const avgS = bestBucket.totalS / bestBucket.count;
    const avgL = bestBucket.totalL / bestBucket.count;
    return { h: avgH, s: avgS, l: avgL };
  }

  // Fallback if image is monochromatic or muted
  if (validPixels > 0) {
    const [h, s, l] = rgbToHsl(sumR / validPixels, sumG / validPixels, sumB / validPixels);
    return { h, s: Math.max(s, 35), l: Math.max(35, Math.min(65, l)) };
  }

  return null;
}

/**
 * Loads an image from URL via direct fetch, proxy, or Image element to safely extract ImageData
 */
async function extractPaletteFromUrl(url: string): Promise<{ h: number; s: number; l: number } | null> {
  // Step 1: Obtain a safe Blob URL to bypass CORS and canvas tainting
  let safeObjectUrl = '';
  let needRevoke = false;

  try {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      safeObjectUrl = url;
    } else {
      // Try direct fetch first
      const activeToken = typeof window !== 'undefined' ? localStorage.getItem('ha_token') : null;
      const headers: Record<string, string> = {};
      if (activeToken && url.includes('/api/')) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      let res: Response | null = null;
      try {
        res = await fetch(url, { headers, mode: 'cors' });
      } catch {
        // Direct fetch failed (CORS or network), use server image proxy
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
        res = await fetch(proxyUrl, { headers });
      }

      if (res && res.ok) {
        const blob = await res.blob();
        safeObjectUrl = URL.createObjectURL(blob);
        needRevoke = true;
      }
    }
  } catch {
    // If fetch failed completely, attempt standard image element with fallback
    safeObjectUrl = url.startsWith('http') ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;
  }

  if (!safeObjectUrl) return null;

  return new Promise<{ h: number; s: number; l: number } | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          if (needRevoke) URL.revokeObjectURL(safeObjectUrl);
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const result = extractColorsFromImageData(imageData);
        if (needRevoke) URL.revokeObjectURL(safeObjectUrl);
        resolve(result);
      } catch (err) {
        if (needRevoke) URL.revokeObjectURL(safeObjectUrl);
        resolve(null);
      }
    };

    img.onerror = () => {
      if (needRevoke) URL.revokeObjectURL(safeObjectUrl);
      resolve(null);
    };

    img.src = safeObjectUrl;
  });
}

/**
 * Custom React hook to extract and cache album art color palette.
 */
export function useAlbumArtColor(
  albumArtUrl?: string | null,
  options: UseAlbumArtColorOptions = {}
): AlbumArtPalette {
  const { title = '', artist = '', darkMode = true, defaultHue = 275 } = options;

  const fallbackHue = getDeterministicHue(title, artist, defaultHue);
  const defaultPalette = buildPaletteFromHsl(fallbackHue, 75, 52, darkMode, false);

  const [palette, setPalette] = useState<AlbumArtPalette>(() => {
    if (albumArtUrl && colorCache.has(albumArtUrl)) {
      const cached = colorCache.get(albumArtUrl)!;
      return buildPaletteFromHsl(cached.h, cached.s, cached.l, darkMode, true);
    }
    return defaultPalette;
  });

  useEffect(() => {
    if (!albumArtUrl) {
      setPalette(buildPaletteFromHsl(fallbackHue, 75, 52, darkMode, false));
      return;
    }

    if (colorCache.has(albumArtUrl)) {
      const cached = colorCache.get(albumArtUrl)!;
      setPalette(buildPaletteFromHsl(cached.h, cached.s, cached.l, darkMode, true));
      return;
    }

    let isMounted = true;

    extractPaletteFromUrl(albumArtUrl).then((extracted) => {
      if (!isMounted) return;
      if (extracted) {
        colorCache.set(albumArtUrl, extracted);
        setPalette(buildPaletteFromHsl(extracted.h, extracted.s, extracted.l, darkMode, true));
      } else {
        setPalette(buildPaletteFromHsl(fallbackHue, 75, 52, darkMode, false));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [albumArtUrl, fallbackHue, darkMode]);

  return palette;
}
