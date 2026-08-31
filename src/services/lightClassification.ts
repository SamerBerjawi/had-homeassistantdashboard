/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export type LightType = 'on_off' | 'brightness' | 'white_temp' | 'color';

export interface LightCapabilities {
  type: LightType;
  typeName: string;
  typeBadge: string;
  isOn: boolean;
  
  // Feature flags
  supportsBrightness: boolean;
  supportsColorTemp: boolean;
  supportsColor: boolean;
  supportsEffects: boolean;
  
  // Power & Brightness (0-100% and 0-255)
  brightnessPct: number;
  brightness255: number;
  
  // Color mode & list
  colorMode?: string;
  supportedColorModes: string[];
  
  // Color representation
  rgbColor?: [number, number, number];
  hsColor?: [number, number];
  xyColor?: [number, number];
  displayColor: string; // CSS color string (hex or rgb)
  
  // White Temperature
  colorTempKelvin?: number;
  minKelvin: number;
  maxKelvin: number;
  
  // Dynamic Effects
  effect?: string;
  effectList: string[];
  
  // Extra HA attributes
  offWithTransition?: boolean;
  offBrightness?: number;
  friendlyName: string;
  icon?: string;
}

// Home Assistant Light Entity Legacy Feature Flags
export const LightEntityFeature = {
  SUPPORT_BRIGHTNESS: 1,
  SUPPORT_COLOR_TEMP: 2,
  SUPPORT_EFFECT: 4,
  SUPPORT_FLASH: 8,
  SUPPORT_COLOR: 16,
  SUPPORT_TRANSITION: 32,
  SUPPORT_WHITE_VALUE: 128
};

/**
 * Converts a Kelvin temperature value (2000K - 6500K) to an approximate RGB string
 */
export function kelvinToRgb(kelvin: number): string {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let red: number;
  let green: number;
  let blue: number;

  if (temp <= 66) {
    red = 255;
    green = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
    if (temp <= 19) {
      blue = 0;
    } else {
      blue = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }
  } else {
    red = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    green = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    blue = 255;
  }

  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

/**
 * Converts Hue (0-360) and Saturation (0-100) to RGB [r, g, b]
 */
export function hsToRgb(h: number, s: number, v: number = 100): [number, number, number] {
  const hNorm = (h % 360) / 60;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs((hNorm % 2) - 1));
  const m = vNorm - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (hNorm >= 0 && hNorm < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hNorm >= 1 && hNorm < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hNorm >= 2 && hNorm < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hNorm >= 3 && hNorm < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hNorm >= 4 && hNorm < 5) { r1 = x; g1 = 0; b1 = c; }
  else if (hNorm >= 5 && hNorm < 6) { r1 = c; g1 = 0; b1 = x; }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255)
  ];
}

/**
 * Converts CIE XY color coordinates to RGB [r, g, b]
 */
export function xyToRgb(x: number, y: number, brightness: number = 255): [number, number, number] {
  if (y === 0) return [255, 255, 255];
  const z = 1.0 - x - y;
  const Y = brightness / 255;
  const X = (Y / y) * x;
  const Z = (Y / y) * z;

  // Convert to sRGB D65
  let r = X * 3.2406 - Y * 1.5372 - Z * 0.4986;
  let g = -X * 0.9689 + Y * 1.8758 + Z * 0.0415;
  let b = X * 0.0557 - Y * 0.2040 + Z * 1.0570;

  // Gamma correction
  const gammaCorrect = (c: number) => {
    return c <= 0.0031308
      ? 12.92 * c
      : (1.0 + 0.055) * Math.pow(c, 1.0 / 2.4) - 0.055;
  };

  r = Math.max(0, Math.min(1, gammaCorrect(r)));
  g = Math.max(0, Math.min(1, gammaCorrect(g)));
  b = Math.max(0, Math.min(1, gammaCorrect(b)));

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Accurately detects light capabilities and classifies into 4 types:
 * 1. 'on_off': Binary switch light only
 * 2. 'brightness': Dimmable light only (no temperature / color)
 * 3. 'white_temp': Tunable white light (temperature + brightness, no RGB)
 * 4. 'color': Full color RGB/HS/XY light (with color + brightness + optional temp)
 */
export function detectLightCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): LightCapabilities {
  if (!entity) {
    return {
      type: 'on_off',
      typeName: 'On / Off Light',
      typeBadge: 'ON / OFF',
      isOn: false,
      supportsBrightness: false,
      supportsColorTemp: false,
      supportsColor: false,
      supportsEffects: false,
      brightnessPct: 0,
      brightness255: 0,
      supportedColorModes: ['onoff'],
      displayColor: '#f59e0b',
      minKelvin: 2000,
      maxKelvin: 6500,
      effectList: [],
      friendlyName: 'Light'
    };
  }

  const attrs = entity.attributes || {};
  const isOn = entity.state === 'on';
  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;
  const feat = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;

  // Supported Color Modes array (HA standard since 2021.4)
  const rawColorModes = Array.isArray(attrs.supported_color_modes)
    ? (attrs.supported_color_modes as string[])
    : [];

  const colorMode = typeof attrs.color_mode === 'string' ? attrs.color_mode : undefined;

  // 1. Determine Support Flags
  // Color support (rgb, rgbw, rgbww, hs, xy)
  const hasColorInModes = rawColorModes.some((m) =>
    ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m.toLowerCase())
  );
  const hasColorInFeat = (feat & LightEntityFeature.SUPPORT_COLOR) !== 0;
  const hasColorAttrs = Boolean(
    (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3) ||
    (Array.isArray(attrs.hs_color) && attrs.hs_color.length >= 2) ||
    (Array.isArray(attrs.xy_color) && attrs.xy_color.length >= 2) ||
    attrs.color
  );
  const supportsColor = hasColorInModes || hasColorInFeat || hasColorAttrs;

  // White Temp support (color_temp)
  const hasTempInModes = rawColorModes.some((m) => m.toLowerCase() === 'color_temp');
  const hasTempInFeat = (feat & LightEntityFeature.SUPPORT_COLOR_TEMP) !== 0;
  const hasTempAttrs = Boolean(attrs.color_temp_kelvin !== undefined || attrs.color_temp !== undefined);
  const supportsColorTemp = hasTempInModes || hasTempInFeat || hasTempAttrs;

  // Brightness support (brightness, or any mode that is not strictly onoff)
  const hasBrightnessInModes = rawColorModes.some((m) =>
    ['brightness', 'color_temp', 'rgb', 'rgbw', 'rgbww', 'hs', 'xy', 'white'].includes(m.toLowerCase())
  );
  const hasBrightnessInFeat = (feat & LightEntityFeature.SUPPORT_BRIGHTNESS) !== 0;
  const hasBrightnessAttr = typeof attrs.brightness === 'number';
  const isOnlyOnOffMode = rawColorModes.length === 1 && rawColorModes[0].toLowerCase() === 'onoff';
  
  const supportsBrightness =
    !isOnlyOnOffMode &&
    (hasBrightnessInModes || hasBrightnessInFeat || hasBrightnessAttr || supportsColor || supportsColorTemp);

  // 2. Classify into one of the 4 strict types
  let type: LightType = 'on_off';
  let typeName = 'On / Off Light';
  let typeBadge = 'ON / OFF';

  if (supportsColor) {
    type = 'color';
    typeName = 'Color Light';
    typeBadge = 'FULL COLOR';
  } else if (supportsColorTemp) {
    type = 'white_temp';
    typeName = 'Tunable White Light';
    typeBadge = 'TUNABLE WHITE';
  } else if (supportsBrightness) {
    type = 'brightness';
    typeName = 'Dimmable Light';
    typeBadge = 'DIMMABLE';
  } else {
    type = 'on_off';
    typeName = 'On / Off Light';
    typeBadge = 'ON / OFF';
  }

  // 3. Brightness Calculation (0-255 HA standard)
  let brightness255 = 0;
  let brightnessPct = 0;

  if (typeof attrs.brightness === 'number') {
    brightness255 = Math.max(0, Math.min(255, attrs.brightness));
    brightnessPct = Math.round((brightness255 / 255) * 100);
  } else if (isOn) {
    brightnessPct = 100;
    brightness255 = 255;
  }

  // 4. White Temperature Calculation (Kelvin & Mireds)
  let colorTempKelvin: number | undefined;
  let minKelvin = 2000;
  let maxKelvin = 6500;

  if (typeof attrs.min_color_temp_kelvin === 'number') {
    minKelvin = attrs.min_color_temp_kelvin;
  } else if (typeof attrs.max_mireds === 'number' && attrs.max_mireds > 0) {
    minKelvin = Math.round(1000000 / attrs.max_mireds);
  }

  if (typeof attrs.max_color_temp_kelvin === 'number') {
    maxKelvin = attrs.max_color_temp_kelvin;
  } else if (typeof attrs.min_mireds === 'number' && attrs.min_mireds > 0) {
    maxKelvin = Math.round(1000000 / attrs.min_mireds);
  }

  if (typeof attrs.color_temp_kelvin === 'number') {
    colorTempKelvin = attrs.color_temp_kelvin;
  } else if (typeof attrs.color_temp === 'number' && attrs.color_temp > 0) {
    colorTempKelvin = Math.round(1000000 / attrs.color_temp);
  } else if (supportsColorTemp) {
    colorTempKelvin = 3500; // default comfortable neutral white
  }

  // 5. RGB / HS / XY Colors
  let rgbColor: [number, number, number] | undefined;
  let hsColor: [number, number] | undefined;
  let xyColor: [number, number] | undefined;

  if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3) {
    rgbColor = [attrs.rgb_color[0], attrs.rgb_color[1], attrs.rgb_color[2]];
  }
  if (Array.isArray(attrs.hs_color) && attrs.hs_color.length >= 2) {
    hsColor = [attrs.hs_color[0], attrs.hs_color[1]];
    if (!rgbColor) {
      rgbColor = hsToRgb(hsColor[0], hsColor[1]);
    }
  }
  if (Array.isArray(attrs.xy_color) && attrs.xy_color.length >= 2) {
    xyColor = [attrs.xy_color[0], attrs.xy_color[1]];
    if (!rgbColor) {
      rgbColor = xyToRgb(xyColor[0], xyColor[1], brightness255);
    }
  }

  // 6. Compute Display CSS Color
  let displayColor = '#f59e0b'; // warm amber fallback
  if (isOn) {
    if (type === 'color') {
      if (rgbColor) {
        displayColor = `rgb(${rgbColor.join(',')})`;
      } else if (typeof attrs.color === 'string') {
        displayColor = attrs.color;
      } else if (colorTempKelvin) {
        displayColor = kelvinToRgb(colorTempKelvin);
      }
    } else if (type === 'white_temp') {
      if (colorTempKelvin) {
        displayColor = kelvinToRgb(colorTempKelvin);
      } else {
        displayColor = '#fed7aa'; // warm white default
      }
    } else {
      displayColor = '#f59e0b'; // standard warm amber
    }
  }

  // 7. Dynamic Effects
  const effectList: string[] = Array.isArray(attrs.effect_list) ? attrs.effect_list : [];
  const supportsEffects = (feat & LightEntityFeature.SUPPORT_EFFECT) !== 0 || effectList.length > 0;
  const effect = typeof attrs.effect === 'string' ? attrs.effect : undefined;

  return {
    type,
    typeName,
    typeBadge,
    isOn,
    supportsBrightness,
    supportsColorTemp,
    supportsColor,
    supportsEffects,
    brightnessPct,
    brightness255,
    colorMode,
    supportedColorModes: rawColorModes,
    rgbColor,
    hsColor,
    xyColor,
    displayColor,
    colorTempKelvin,
    minKelvin,
    maxKelvin,
    effect,
    effectList,
    offWithTransition: typeof attrs.off_with_transition === 'boolean' ? attrs.off_with_transition : undefined,
    offBrightness: typeof attrs.off_brightness === 'number' ? attrs.off_brightness : undefined,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined
  };
}
