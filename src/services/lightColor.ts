// Pure colour helpers and preset constants for the light control view.
// Moved verbatim from LightControlView.tsx.

// Convert Hue (0-360) to RGB
function hueToRgb(h: number): [number, number, number] {
  const s = 1;
  const v = 1;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// Convert RGB [r, g, b] to approximate Hue (0-360)
function rgbToHue(r: number, g: number, b: number): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 45;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

const DESIGNER_COLORS = [
  { name: 'Warm Amber', hex: '#f59e0b', rgb: [245, 158, 11] },
  { name: 'Sunset Glow', hex: '#f97316', rgb: [249, 115, 22] },
  { name: 'Ruby Red', hex: '#ef4444', rgb: [239, 68, 68] },
  { name: 'Rose Pink', hex: '#f43f5e', rgb: [244, 63, 94] },
  { name: 'Cyber Purple', hex: '#a855f7', rgb: [168, 85, 247] },
  { name: 'Ocean Cyan', hex: '#06b6d4', rgb: [6, 182, 212] },
  { name: 'Emerald', hex: '#10b981', rgb: [16, 185, 129] }
];

const TONE_PRESETS = [
  { name: 'Candle', kelvin: 2000 },
  { name: 'Warm', kelvin: 3000 },
  { name: 'Natural', kelvin: 4200 },
  { name: 'Daylight', kelvin: 6500 }
];

export { hueToRgb, rgbToHue, DESIGNER_COLORS, TONE_PRESETS };
