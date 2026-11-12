import { describe, expect, it } from 'vitest';
import { DESIGNER_COLORS, TONE_PRESETS, hueToRgb, rgbToHue } from '@/services/lightColor';

describe('hueToRgb', () => {
  it('maps the primary and secondary hues to full-saturation RGB', () => {
    expect(hueToRgb(0)).toEqual([255, 0, 0]);
    expect(hueToRgb(60)).toEqual([255, 255, 0]);
    expect(hueToRgb(120)).toEqual([0, 255, 0]);
    expect(hueToRgb(180)).toEqual([0, 255, 255]);
    expect(hueToRgb(240)).toEqual([0, 0, 255]);
    expect(hueToRgb(300)).toEqual([255, 0, 255]);
  });

  it('treats 360 like 0 (red)', () => {
    expect(hueToRgb(360)).toEqual([255, 0, 0]);
  });

  it('interpolates between sectors', () => {
    expect(hueToRgb(30)).toEqual([255, 128, 0]);
    expect(hueToRgb(210)).toEqual([0, 128, 255]);
  });

  it('always returns integer channels in 0..255', () => {
    for (let h = 0; h <= 360; h += 7) {
      for (const ch of hueToRgb(h)) {
        expect(Number.isInteger(ch)).toBe(true);
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('rgbToHue', () => {
  it('returns the hue of primary colours', () => {
    expect(rgbToHue(255, 0, 0)).toBe(0);
    expect(rgbToHue(0, 255, 0)).toBe(120);
    expect(rgbToHue(0, 0, 255)).toBe(240);
  });

  it('returns 45 for any grey (no chroma)', () => {
    expect(rgbToHue(0, 0, 0)).toBe(45);
    expect(rgbToHue(128, 128, 128)).toBe(45);
    expect(rgbToHue(255, 255, 255)).toBe(45);
  });

  it('wraps negative hues into 0..360', () => {
    // Red-dominant with blue > green gives a negative raw hue
    expect(rgbToHue(255, 0, 255)).toBe(300);
    expect(rgbToHue(255, 0, 128)).toBe(330);
    expect(rgbToHue(255, 0, 1)).toBeGreaterThanOrEqual(0);
    expect(rgbToHue(255, 0, 1)).toBeLessThan(360);
  });

  it('round-trips hueToRgb within rounding error', () => {
    for (let h = 0; h < 360; h += 5) {
      const [r, g, b] = hueToRgb(h);
      const back = rgbToHue(r, g, b);
      const diff = Math.min(Math.abs(back - h), 360 - Math.abs(back - h));
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  it('round-trips the exact sector boundaries', () => {
    for (const h of [0, 60, 120, 180, 240, 300]) {
      const [r, g, b] = hueToRgb(h);
      expect(rgbToHue(r, g, b)).toBe(h);
    }
  });
});

describe('light colour presets', () => {
  it('designer swatches have matching hex and rgb values', () => {
    for (const swatch of DESIGNER_COLORS) {
      const hex = `#${swatch.rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      expect(hex).toBe(swatch.hex);
    }
  });

  it('tone presets are ordered warm to cool', () => {
    const kelvins = TONE_PRESETS.map((p) => p.kelvin);
    expect(kelvins).toEqual([...kelvins].sort((a, b) => a - b));
  });
});
