/**
 * PWA Asset Generator for HOMZ Smart Home Dashboard
 * Generates favicons, app icons (192, 512, maskable, apple-touch),
 * and iOS startup splash screens.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');
const splashDir = path.join(publicDir, 'splash');

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(splashDir, { recursive: true });

// SVG template for HOMZ icon
function getHomzIconSvg(size, isMaskable = false) {
  // For maskable icon, keep a safe zone margin (~15-20% on each edge)
  const scale = isMaskable ? 0.65 : 0.85;
  const padding = (size * (1 - scale)) / 2;
  const contentSize = size * scale;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
    <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(56, 189, 248, 0.4)" />
      <stop offset="100%" stop-color="rgba(129, 140, 248, 0.1)" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${size * 0.03}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${isMaskable ? 0 : size * 0.22}" fill="url(#bgGrad)" />

  <!-- Outer ambient ring -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${contentSize * 0.42}" fill="none" stroke="url(#ringGrad)" stroke-width="${size * 0.015}" />

  <!-- Inner Sparkle Symbol -->
  <g transform="translate(${padding}, ${padding}) scale(${contentSize / 256})" filter="url(#glow)">
    <!-- Central 4-pointed sparkle star -->
    <path
      d="M128 20 C128 80 80 128 20 128 C80 128 128 176 128 236 C128 176 176 128 236 128 C176 128 128 80 128 20 Z"
      fill="url(#sparkleGrad)"
    />
    <!-- Accent mini sparkle top-right -->
    <path
      d="M196 48 C196 66 182 80 164 80 C182 80 196 94 196 112 C196 94 210 80 228 80 C210 80 196 66 196 48 Z"
      fill="#38bdf8"
      opacity="0.85"
    />
    <!-- Accent mini sparkle bottom-left -->
    <path
      d="M60 160 C60 174 49 185 35 185 C49 185 60 196 60 210 C60 196 71 185 85 185 C71 185 60 174 60 160 Z"
      fill="#818cf8"
      opacity="0.7"
    />
  </g>
</svg>
`;
}

// Splash Screen SVG generator
function getSplashScreenSvg(width, height) {
  const iconSize = Math.min(width, height) * 0.22;
  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - height * 0.04;
  const textY = iconY + iconSize + height * 0.05;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" />
      <stop offset="50%" stop-color="#020617" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
    <linearGradient id="splashSparkle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <filter id="splashGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${iconSize * 0.08}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#splashBg)" />

  <!-- Radial subtle ambient glow behind emblem -->
  <circle cx="${width / 2}" cy="${iconY + iconSize / 2}" r="${iconSize * 1.2}" fill="#38bdf8" opacity="0.08" filter="url(#splashGlow)" />

  <!-- Center Emblem -->
  <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 256})" filter="url(#splashGlow)">
    <path
      d="M128 20 C128 80 80 128 20 128 C80 128 128 176 128 236 C128 176 176 128 236 128 C176 128 128 80 128 20 Z"
      fill="url(#splashSparkle)"
    />
    <path
      d="M196 48 C196 66 182 80 164 80 C182 80 196 94 196 112 C196 94 210 80 228 80 C210 80 196 66 196 48 Z"
      fill="#38bdf8"
      opacity="0.85"
    />
    <path
      d="M60 160 C60 174 49 185 35 185 C49 185 60 196 60 210 C60 196 71 185 85 185 C71 185 60 174 60 160 Z"
      fill="#818cf8"
      opacity="0.7"
    />
  </g>

  <!-- Title Text -->
  <text x="${width / 2}" y="${textY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${Math.max(24, Math.round(width * 0.045))}" fill="#ffffff" letter-spacing="4">HOMZ</text>
  <text x="${width / 2}" y="${textY + Math.max(20, Math.round(width * 0.03))}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="${Math.max(12, Math.round(width * 0.018))}" fill="#38bdf8" letter-spacing="3">SMART HOME DASHBOARD</text>
</svg>
`;
}

async function run() {
  console.log('Generating PWA Icons...');

  // 1. Favicon SVG
  const faviconSvg = getHomzIconSvg(64, false);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg.trim());

  // 2. PNG Icons
  const iconTargets = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
    { name: 'favicon-32x32.png', size: 32, maskable: false },
  ];

  for (const target of iconTargets) {
    const svg = getHomzIconSvg(target.size, target.maskable);
    const dest = target.name.startsWith('apple') || target.name.startsWith('icon-')
      ? path.join(iconsDir, target.name)
      : path.join(publicDir, target.name);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(dest);

    // Also put apple-touch-icon.png in public root for crawlers that expect /apple-touch-icon.png
    if (target.name === 'apple-touch-icon.png') {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    }
  }

  // Generate favicon.ico from 32x32 png
  await sharp(Buffer.from(getHomzIconSvg(32, false)))
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Generating iOS Splash Screens...');
  // Standard iPhone and iPad device sizes (portrait)
  const splashScreens = [
    // iPhone 16 Pro Max / 15 Pro Max
    { name: 'splash-1290x2796.png', w: 1290, h: 2796 },
    // iPhone 16 Pro / 15 Pro / 14 Pro
    { name: 'splash-1179x2556.png', w: 1179, h: 2556 },
    // iPhone 16 / 15 / 14 / 13 / 12 Pro / 12
    { name: 'splash-1170x2532.png', w: 1170, h: 2532 },
    // iPhone 14 Plus / 13 Pro Max / 12 Pro Max
    { name: 'splash-1284x2778.png', w: 1284, h: 2778 },
    // iPhone 11 Pro Max / XS Max
    { name: 'splash-1242x2688.png', w: 1242, h: 2688 },
    // iPhone 11 / XR
    { name: 'splash-828x1792.png', w: 828, h: 1792 },
    // iPhone SE (3rd / 2nd gen) / 8 / 7
    { name: 'splash-750x1334.png', w: 750, h: 1334 },
    // iPad Pro 12.9"
    { name: 'splash-2048x2732.png', w: 2048, h: 2732 },
    // iPad Pro 11" / Air
    { name: 'splash-1668x2388.png', w: 1668, h: 2388 },
    // iPad 10.2"
    { name: 'splash-1620x2160.png', w: 1620, h: 2160 },
  ];

  for (const s of splashScreens) {
    const splashSvg = getSplashScreenSvg(s.w, s.h);
    await sharp(Buffer.from(splashSvg))
      .png({ quality: 90, compressionLevel: 8 })
      .toFile(path.join(splashDir, s.name));
  }

  console.log('PWA Assets successfully generated!');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
