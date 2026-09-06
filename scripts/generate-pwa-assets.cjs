/**
 * PWA Asset Generator for HAD - Home Assistant Dashboard
 * Generates favicons, app icons (192, 512, maskable, apple-touch),
 * and iOS startup splash screens from the official icon artwork.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const iconsDir = path.join(publicDir, 'icons');
const splashDir = path.join(publicDir, 'splash');

// Candidate source image paths
const sourceCandidates = [
  path.join(publicDir, 'app-icon.png'),
  '/Users/samerberjawi/.gemini/antigravity-ide/brain/a4ae9ad5-7f5b-44cf-8f5a-7a1636482957/.user_uploaded/media_1788726790610.jpg',
  path.join(rootDir, 'media_1788726790610.jpg')
];

let sourceImgPath = sourceCandidates.find(p => fs.existsSync(p));

if (!sourceImgPath) {
  console.error('Source image not found in candidate paths!');
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(splashDir, { recursive: true });

// Helper to create ICO binary buffer containing PNG images
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const dirEntries = [];
  for (const img of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size
    entry.writeUInt32LE(offset, 12); // Image offset
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(img => img.buffer)]);
}

async function run() {
  console.log('Using source image:', sourceImgPath);

  // 1. Generate master square 1024x1024 PNG
  const masterBuffer = await sharp(sourceImgPath)
    .resize(1024, 1024, { fit: 'cover', position: 'center' })
    .png({ quality: 100 })
    .toBuffer();

  // Save official high-res app icon in public folder
  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), masterBuffer);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), masterBuffer);

  console.log('Generated master app-icon.png (1024x1024)');

  // 2. Generate Favicons (16x16, 32x32, 48x48) & ICO
  console.log('Generating Favicons...');
  const fav16 = await sharp(masterBuffer).resize(16, 16).sharpen({ sigma: 0.8 }).png().toBuffer();
  const fav32 = await sharp(masterBuffer).resize(32, 32).sharpen({ sigma: 0.6 }).png().toBuffer();
  const fav48 = await sharp(masterBuffer).resize(48, 48).sharpen({ sigma: 0.5 }).png().toBuffer();
  const fav64 = await sharp(masterBuffer).resize(64, 64).png().toBuffer();

  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), fav16);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), fav32);

  // Favicon.ico multi-resolution
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 },
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // Favicon.svg embedding base64 high-resolution image
  const svgFavicon = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <image width="64" height="64" href="data:image/png;base64,${fav64.toString('base64')}" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon.trim());

  // 3. Generate Touch Icons and PWA Icons
  console.log('Generating PWA Icons...');
  const iconTargets = [
    { dest: path.join(publicDir, 'apple-touch-icon.png'), size: 180 },
    { dest: path.join(iconsDir, 'apple-touch-icon.png'), size: 180 },
    { dest: path.join(iconsDir, 'apple-touch-icon-180x180.png'), size: 180 },
    { dest: path.join(iconsDir, 'icon-192x192.png'), size: 192 },
    { dest: path.join(iconsDir, 'icon-512x512.png'), size: 512 },
  ];

  for (const t of iconTargets) {
    await sharp(masterBuffer)
      .resize(t.size, t.size)
      .png({ quality: 95 })
      .toFile(t.dest);
  }

  // 4. Maskable 512x512 Icon with Android safe zone padding (~75% scale inside dark canvas)
  console.log('Generating Maskable Icon...');
  const innerSize = Math.round(512 * 0.76); // ~389px
  const innerIcon = await sharp(masterBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 8, g: 15, b: 29, alpha: 1 } // Deep slate-dark background matching icon
    }
  })
    .composite([{ input: innerIcon, gravity: 'center' }])
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  // 5. iOS Splash Screens
  console.log('Generating iOS Splash Screens...');
  const splashScreens = [
    { name: 'splash-1290x2796.png', w: 1290, h: 2796 },
    { name: 'splash-1179x2556.png', w: 1179, h: 2556 },
    { name: 'splash-1170x2532.png', w: 1170, h: 2532 },
    { name: 'splash-1284x2778.png', w: 1284, h: 2778 },
    { name: 'splash-1242x2688.png', w: 1242, h: 2688 },
    { name: 'splash-828x1792.png', w: 828, h: 1792 },
    { name: 'splash-750x1334.png', w: 750, h: 1334 },
    { name: 'splash-2048x2732.png', w: 2048, h: 2732 },
    { name: 'splash-1668x2388.png', w: 1668, h: 2388 },
    { name: 'splash-1620x2160.png', w: 1620, h: 2160 },
  ];

  for (const s of splashScreens) {
    const iconSize = Math.round(Math.min(s.w, s.h) * 0.26);
    const iconX = Math.round((s.w - iconSize) / 2);
    const iconY = Math.round((s.h - iconSize) / 2 - s.h * 0.04);
    const textY = iconY + iconSize + Math.round(s.h * 0.055);
    const subTextY = textY + Math.max(22, Math.round(s.w * 0.032));
    const titleFontSize = Math.max(28, Math.round(s.w * 0.048));
    const subFontSize = Math.max(12, Math.round(s.w * 0.019));

    // Resize emblem icon for splash
    const emblem = await sharp(masterBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    const textOverlaySvg = Buffer.from(`
      <svg width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" xmlns="http://www.w3.org/2000/svg">
        <text x="${s.w / 2}" y="${textY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${titleFontSize}" fill="#ffffff" letter-spacing="4">HAD</text>
        <text x="${s.w / 2}" y="${subTextY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="${subFontSize}" fill="#38bdf8" letter-spacing="3">HOME ASSISTANT DASHBOARD</text>
      </svg>
    `);

    // Ambient background gradient
    const bgSvg = Buffer.from(`
      <svg width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stop-color="#030712" />
            <stop offset="50%" stop-color="#090e1f" />
            <stop offset="100%" stop-color="#02040a" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="${s.w}" height="${s.h}" fill="url(#bg)" />
        <circle cx="${s.w / 2}" cy="${iconY + iconSize / 2}" r="${iconSize * 1.3}" fill="url(#glow)" />
      </svg>
    `);

    await sharp(bgSvg)
      .composite([
        { input: emblem, left: iconX, top: iconY },
        { input: textOverlaySvg, left: 0, top: 0 }
      ])
      .png({ quality: 90, compressionLevel: 8 })
      .toFile(path.join(splashDir, s.name));
  }

  console.log('✅ All PWA assets, favicons, and splash screens successfully generated!');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
