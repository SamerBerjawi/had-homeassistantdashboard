import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sun,
  Palette,
  Sparkle,
  Moon,
  Flame,
  ThermometerSimple,
  Minus,
  Plus,
  Power
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import {
  detectLightCapabilities,
  kelvinToRgb,
  LightCapabilities
} from '../../../services/lightClassification';

interface LightControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
  customIcon?: string | null;
}

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

const SCENE_PRESETS = [
  { id: 'natural', name: 'Natural', desc: 'Daylight Read', icon: Sun, kelvin: 4500, brightness: 80, rgb: [255, 245, 230] },
  { id: 'cozy', name: 'Cozy', desc: 'Warm Evening', icon: Flame, kelvin: 2400, brightness: 50, rgb: [254, 215, 170] },
  { id: 'night', name: 'Night', desc: 'Soft Restful', icon: Moon, kelvin: 2000, brightness: 15, rgb: [254, 243, 199] },
  { id: 'party', name: 'Party', desc: 'Vibrant Accent', icon: Sparkle, kelvin: null, brightness: 85, rgb: [168, 85, 247] }
];

interface TabOption {
  id: 'tone' | 'color' | 'scenes';
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: any; className?: string }>;
}

export default function LightControlView({ entity, darkMode = true, customIcon }: LightControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: LightCapabilities = useMemo(() => {
    return detectLightCapabilities(entity);
  }, [entity]);

  // Strict capability detection:
  // - Warmth: only if light supports color temperature
  // - Color: only if light supports color (RGB, HS, XY)
  // - Scenes: only if light supports effects or native scene presets
  const supportsWarmth = caps.supportsColorTemp;
  const supportsColor = caps.supportsColor;
  const supportsScenes = Boolean(caps.supportsEffects && caps.effectList && caps.effectList.length > 0);

  const availableTabs = useMemo<TabOption[]>(() => {
    const tabs: TabOption[] = [];
    if (supportsWarmth) {
      tabs.push({ id: 'tone', label: 'Warmth', icon: ThermometerSimple });
    }
    if (supportsColor) {
      tabs.push({ id: 'color', label: 'Color', icon: Palette });
    }
    if (supportsScenes) {
      tabs.push({ id: 'scenes', label: 'Scenes', icon: Sparkle });
    }
    return tabs;
  }, [supportsWarmth, supportsColor, supportsScenes]);

  const isOn = caps.isOn;
  const [brightness, setBrightness] = useState<number>(caps.brightnessPct);
  const [selectedColor, setSelectedColor] = useState<string>(caps.displayColor);
  const [colorTempKelvin, setColorTempKelvin] = useState<number>(caps.colorTempKelvin || 3500);
  const [activeEffect, setActiveEffect] = useState<string>(caps.effect || '');

  // Active sub-control tab: automatically default to first available tab
  const [activeTab, setActiveTab] = useState<'tone' | 'color' | 'scenes'>(() => {
    if (supportsWarmth) return 'tone';
    if (supportsColor) return 'color';
    if (supportsScenes) return 'scenes';
    return 'tone';
  });

  // Track dragging state for modern scale animations
  const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);
  const [isDraggingKelvin, setIsDraggingKelvin] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  // Fallback tab if current active tab is not in available tabs
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Current hue (0-360) for rainbow spectrum slider
  const [currentHue, setCurrentHue] = useState<number>(() => {
    if (caps.rgbColor) {
      return rgbToHue(caps.rgbColor[0], caps.rgbColor[1], caps.rgbColor[2]);
    }
    return 40;
  });

  // Sync state with HA entity updates
  useEffect(() => {
    setBrightness(caps.brightnessPct);
    setSelectedColor(caps.displayColor);
    if (caps.colorTempKelvin) {
      setColorTempKelvin(caps.colorTempKelvin);
    }
    if (caps.rgbColor) {
      setCurrentHue(rgbToHue(caps.rgbColor[0], caps.rgbColor[1], caps.rgbColor[2]));
    }
    if (caps.effect) {
      setActiveEffect(caps.effect);
    }
  }, [caps]);

  // Dynamic light color for lamp illustration & ambient glows
  const lampIlluminationColor = useMemo(() => {
    if (!isOn) return 'transparent';
    if (caps.supportsColor && selectedColor) return selectedColor;
    if (caps.supportsColorTemp && colorTempKelvin) return kelvinToRgb(colorTempKelvin);
    return '#f59e0b'; // Warm amber default
  }, [isOn, caps, selectedColor, colorTempKelvin]);

  // Master Power Toggle
  const handleToggle = useCallback(() => {
    const nextState = isOn ? 'off' : 'on';
    const nextBrightnessPct = nextState === 'on' ? (brightness > 0 ? brightness : 75) : 0;
    const haBrightness255 = Math.round((nextBrightnessPct / 100) * 255);

    if (caps.supportsBrightness) {
      updateEntityState(entity.entity_id, nextState, {
        ...entity.attributes,
        brightness: nextState === 'on' ? haBrightness255 : 0
      });

      callHAService(
        'light',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        nextState === 'on' ? { brightness: haBrightness255 } : {},
        { entity_id: entity.entity_id }
      );
    } else {
      updateEntityState(entity.entity_id, nextState, {
        ...entity.attributes
      });

      callHAService(
        'light',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        {},
        { entity_id: entity.entity_id }
      );
    }
  }, [isOn, brightness, caps, entity, updateEntityState, callHAService]);

  // Adjust Brightness
  const handleBrightnessChange = useCallback((val: number) => {
    const safeVal = Math.max(0, Math.min(100, Math.round(val)));
    setBrightness(safeVal);
    const haBrightness255 = Math.round((safeVal / 100) * 255);
    const nextState = safeVal > 0 ? 'on' : 'off';

    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      brightness: haBrightness255
    });

    if (safeVal > 0) {
      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255 },
        { entity_id: entity.entity_id }
      );
    } else {
      callHAService('light', 'turn_off', {}, { entity_id: entity.entity_id });
    }
  }, [entity, updateEntityState, callHAService]);

  // Stepper increment / decrement
  const handleStepBrightness = (delta: number) => {
    const target = Math.max(0, Math.min(100, brightness + delta));
    handleBrightnessChange(target);
  };

  // Adjust White Temperature (Kelvin)
  const handleKelvinChange = (kelvin: number) => {
    const safeKelvin = Math.round(kelvin);
    setColorTempKelvin(safeKelvin);
    const rgbStr = kelvinToRgb(safeKelvin);
    setSelectedColor(rgbStr);

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      color_temp_kelvin: safeKelvin
    });

    callHAService(
      'light',
      'turn_on',
      { color_temp_kelvin: safeKelvin },
      { entity_id: entity.entity_id }
    );
  };

  // Adjust Rainbow Hue
  const handleHueChange = (hue: number) => {
    const safeHue = Math.max(0, Math.min(360, Math.round(hue)));
    setCurrentHue(safeHue);
    const [r, g, b] = hueToRgb(safeHue);
    const rgbHex = `rgb(${r}, ${g}, ${b})`;
    setSelectedColor(rgbHex);

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      rgb_color: [r, g, b]
    });

    callHAService('light', 'turn_on', { rgb_color: [r, g, b] }, { entity_id: entity.entity_id });
  };

  // Select Designer Color Swatch
  const handleSelectColorSwatch = (swatch: (typeof DESIGNER_COLORS)[0]) => {
    setSelectedColor(swatch.hex);
    setCurrentHue(rgbToHue(swatch.rgb[0], swatch.rgb[1], swatch.rgb[2]));

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      rgb_color: swatch.rgb
    });

    callHAService('light', 'turn_on', { rgb_color: swatch.rgb }, { entity_id: entity.entity_id });
  };

  // Apply Effect / Scene
  const handleSelectEffect = (effect: string) => {
    setActiveEffect(effect);
    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      effect
    });
    callHAService('light', 'turn_on', { effect }, { entity_id: entity.entity_id });
  };

  // Apply Scene Preset
  const handleApplyScene = (scene: (typeof SCENE_PRESETS)[0]) => {
    setBrightness(scene.brightness);
    const haBrightness255 = Math.round((scene.brightness / 100) * 255);

    if (scene.kelvin && caps.supportsColorTemp) {
      setColorTempKelvin(scene.kelvin);
      const rgbStr = kelvinToRgb(scene.kelvin);
      setSelectedColor(rgbStr);

      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        brightness: haBrightness255,
        color_temp_kelvin: scene.kelvin
      });

      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255, color_temp_kelvin: scene.kelvin },
        { entity_id: entity.entity_id }
      );
    } else if (scene.rgb && caps.supportsColor) {
      setSelectedColor(`rgb(${scene.rgb.join(',')})`);
      setCurrentHue(rgbToHue(scene.rgb[0], scene.rgb[1], scene.rgb[2]));

      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        brightness: haBrightness255,
        rgb_color: scene.rgb
      });

      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255, rgb_color: scene.rgb },
        { entity_id: entity.entity_id }
      );
    } else {
      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        brightness: haBrightness255
      });

      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255 },
        { entity_id: entity.entity_id }
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Ultra-Modern Slider Pointer Scrubbing Logic
  // ---------------------------------------------------------------------------
  const brightnessTrackRef = useRef<HTMLDivElement>(null);
  const kelvinTrackRef = useRef<HTMLDivElement>(null);
  const hueTrackRef = useRef<HTMLDivElement>(null);

  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    trackRef: React.RefObject<HTMLDivElement | null>,
    callback: (ratio: number) => void,
    setDragState: (dragging: boolean) => void
  ) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState(true);
    const track = trackRef.current;
    if (!track) return;

    const updateFromPointer = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      callback(ratio);
    };

    updateFromPointer(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromPointer(ev.clientX);
    };

    const onPointerUp = (ev: PointerEvent) => {
      setDragState(false);
      try {
        e.currentTarget.releasePointerCapture(ev.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Glass card tokens
  const glassCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const roomName = entity.attributes.room || entity.attributes.area || 'Living Room';
  const lightName = entity.attributes.friendly_name || 'Smart Pendant Lamp';

  // Dynamic beam opacity mapped with brightness
  const beamOpacity = isOn ? Math.max(0.18, (brightness / 100) * 0.72) : 0;

  // Has any sub-control sections available
  const hasSubControls = availableTabs.length > 0;

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP MINIMALIST HEADER & POWER SWITCH                                   */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          {customIcon && (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 transition-colors shadow-xs"
              style={{
                backgroundColor: isOn ? 'rgba(251, 191, 36, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                borderColor: isOn ? 'rgba(251, 191, 36, 0.35)' : 'rgba(100, 116, 139, 0.25)',
                color: isOn ? '#fbbf24' : '#94a3b8'
              }}
            >
              <DynamicPhosphorIcon name={customIcon} size={22} weight="duotone" />
            </div>
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              {roomName}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {lightName}
            </h2>
          </div>
        </div>

        {/* Tactile Power Switch Pill */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOn ? 'Turn Light Off' : 'Turn Light On'}
          className={`h-11 px-3 rounded-full flex items-center gap-2 border transition-all duration-300 cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
            isOn
              ? darkMode
                ? 'bg-black/40 border-amber-400/40 text-amber-300'
                : 'bg-white border-amber-400/60 text-amber-800 shadow-xs'
              : darkMode
              ? 'bg-black/20 border-white/10 text-slate-400'
              : 'bg-slate-100/90 border-slate-300/80 text-slate-700'
          }`}
        >
          <span className="text-xs font-black uppercase tracking-wider pl-1">
            {isOn ? 'On' : 'Off'}
          </span>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
              isOn
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-105'
                : 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
            }`}
            style={{
              backgroundColor: isOn && lampIlluminationColor !== 'transparent' ? lampIlluminationColor : undefined
            }}
          >
            <Power size={15} weight="bold" />
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. PENDANT LAMP HERO WITH CONICAL LIGHT BEAM                              */}
      {/* ========================================================================= */}
      <div
        className={`relative overflow-hidden rounded-3xl p-4 flex flex-col items-center justify-center min-h-[210px] transition-all duration-500 cursor-pointer ${glassCardStyle}`}
        onClick={handleToggle}
        title={isOn ? 'Click lamp to turn off' : 'Click lamp to turn on'}
      >
        {/* Ambient background bloom */}
        <div
          className="absolute -top-10 inset-x-0 h-48 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none"
          style={{
            backgroundColor: lampIlluminationColor,
            opacity: isOn ? (brightness / 100) * 0.35 : 0
          }}
        />

        {/* SVG Pendant Lamp & Conical Light Beam */}
        <svg
          viewBox="0 0 240 210"
          className="w-56 sm:w-64 h-auto overflow-visible select-none drop-shadow-md"
        >
          <defs>
            <linearGradient id="shadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="35%" stopColor="#334155" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="brassTrim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <linearGradient id="lightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lampIlluminationColor} stopOpacity="0.85" />
              <stop offset="40%" stopColor={lampIlluminationColor} stopOpacity="0.45" />
              <stop offset="100%" stopColor={lampIlluminationColor} stopOpacity="0.0" />
            </linearGradient>

            <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="45%" stopColor={lampIlluminationColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={lampIlluminationColor} stopOpacity="0.3" />
            </radialGradient>
          </defs>

          {/* Conical Light Beam */}
          <polygon
            points="65,95 175,95 230,205 10,205"
            fill="url(#lightBeam)"
            className="transition-opacity duration-500 ease-out pointer-events-none"
            style={{ opacity: beamOpacity }}
          />

          {/* Hanging Cord */}
          <line
            x1="120"
            y1="0"
            x2="120"
            y2="38"
            stroke={darkMode ? '#94a3b8' : '#64748b'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Brass Socket Fixture */}
          <rect
            x="113"
            y="36"
            width="14"
            height="12"
            rx="2"
            fill="url(#brassTrim)"
          />

          {/* Pendant Lamp Bell / Flared Shade */}
          <path
            d="M 112 48 C 112 66, 68 82, 54 94 C 50 97, 51 98, 62 98 L 178 98 C 189 98, 190 97, 186 94 C 172 82, 128 66, 128 48 Z"
            fill="url(#shadeGrad)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* Brass Metallic Accent Rim at Shade Base */}
          <ellipse
            cx="120"
            cy="98"
            rx="60"
            ry="7"
            fill="url(#brassTrim)"
          />

          {/* Diffuser Lens */}
          <ellipse
            cx="120"
            cy="98"
            rx="54"
            ry="5"
            fill={isOn ? 'url(#bulbGlow)' : '#1e293b'}
            className="transition-all duration-300"
          />

          {/* Core Hotspot Glow */}
          {isOn && (
            <ellipse
              cx="120"
              cy="98"
              rx="30"
              ry="3"
              fill="#ffffff"
              opacity={Math.min(1, (brightness / 100) * 0.9 + 0.1)}
              className="transition-opacity duration-300 pointer-events-none"
            />
          )}
        </svg>

        {/* State Subtitle */}
        <div className="mt-2 text-center">
          <span
            className={`text-xs font-bold tracking-wide transition-colors ${
              isOn
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {isOn
              ? caps.supportsBrightness
                ? `Illuminated • ${brightness}% Brightness`
                : 'Illuminated • Active'
              : 'Standby • Tap to Turn On'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODERN CONTROLS CARD (Modern Sliders & Strict Feature Display)         */}
      {/* ========================================================================= */}
      <div className={`p-5 rounded-3xl space-y-5 ${glassCardStyle}`}>
        {/* Brightness Section (only if light supports brightness) */}
        {caps.supportsBrightness && (
          <div className="space-y-3">
            {/* Header: Label & Numerical Value */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Light Brightness
              </span>
              <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                {isOn ? `${brightness}%` : '0%'}
              </span>
            </div>

            {/* Modern Glass Capsule Slider */}
            <div
              ref={brightnessTrackRef}
              onPointerDown={(e) =>
                startDrag(
                  e,
                  brightnessTrackRef,
                  (ratio) => handleBrightnessChange(Math.round(ratio * 100)),
                  setIsDraggingBrightness
                )
              }
              className={`h-12 rounded-2xl relative cursor-pointer flex items-center px-3.5 border transition-all duration-200 select-none shadow-inner ${
                darkMode
                  ? 'bg-black/40 hover:bg-black/50 border-white/10'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-300/80'
              }`}
            >
              {/* Inner track layer with overflow-hidden for fill & tick marks */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                {/* Tick Marks at 25%, 50%, 75% */}
                <div className="absolute inset-0 flex justify-between items-center px-12 opacity-25">
                  <span className="w-0.5 h-3.5 rounded-full bg-current" />
                  <span className="w-0.5 h-3.5 rounded-full bg-current" />
                  <span className="w-0.5 h-3.5 rounded-full bg-current" />
                </div>

                {/* Illuminated Fill Bar with Gradient & Soft Glow */}
                <div
                  className="absolute left-1.5 top-1.5 bottom-1.5 rounded-xl transition-all duration-75 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  style={{
                    width: isOn
                      ? `calc(18px + (${Math.max(0, Math.min(100, brightness)) / 100} * (100% - 36px)))`
                      : '0%',
                    background:
                      lampIlluminationColor !== 'transparent'
                        ? `linear-gradient(90deg, ${lampIlluminationColor}88 0%, ${lampIlluminationColor} 100%)`
                        : 'linear-gradient(90deg, #f59e0b88 0%, #f59e0b 100%)',
                    opacity: 0.9
                  }}
                />
              </div>

              {/* Dim Sun Glyph (Left Anchor) */}
              <Sun
                size={16}
                weight="duotone"
                className="text-slate-500 shrink-0 z-10 pointer-events-none"
              />

              {/* Modern Tactile Thumb Handle - Never Clipped, Always On Top */}
              {isOn && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.35)] border-2 border-white/90 flex items-center justify-center pointer-events-none transition-transform duration-100 z-30 ${
                    isDraggingBrightness ? 'scale-115 shadow-[0_6px_20px_rgba(0,0,0,0.45)]' : ''
                  }`}
                  style={{
                    left: `calc(18px + (${Math.max(0, Math.min(100, brightness)) / 100} * (100% - 36px)))`
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        lampIlluminationColor !== 'transparent' ? lampIlluminationColor : '#f59e0b'
                    }}
                  />
                </div>
              )}

              {/* Radiant Sun Glyph (Right Anchor) */}
              <Sun
                size={18}
                weight="fill"
                className={`ml-auto shrink-0 z-10 pointer-events-none transition-colors drop-shadow-xs ${
                  isOn ? 'text-amber-500' : 'text-slate-400'
                }`}
              />
            </div>

            {/* Quick Stepper Capsule ([-] 60% [+]) */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => handleStepBrightness(-5)}
                disabled={!isOn || brightness <= 0}
                aria-label="Decrease brightness 5%"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 border ${
                  darkMode
                    ? 'bg-black/30 hover:bg-black/50 border-white/10 text-slate-200'
                    : 'bg-slate-200/90 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-xs'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Minus size={16} weight="bold" />
              </button>

              <div className="min-w-20 text-center">
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  {isOn ? `${brightness}%` : '0%'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStepBrightness(+5)}
                disabled={!isOn || brightness >= 100}
                aria-label="Increase brightness 5%"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${
                  darkMode
                    ? 'bg-white text-slate-950 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SUB-CONTROLS: ONLY VISIBLE IF ENTITY SUPPORTS WARMTH, COLOR, OR SCENES*/}
        {/* ===================================================================== */}
        {hasSubControls && (
          <div className="border-t border-slate-200/60 dark:border-white/5 pt-4 space-y-4">
            {/* Mode Tab Bar: only shown if MORE THAN 1 mode is supported */}
            {availableTabs.length > 1 && (
              <div
                className={`p-1 rounded-2xl flex items-center gap-1 border backdrop-blur-md ${
                  darkMode ? 'bg-black/30 border-white/5' : 'bg-white/40 border-white/50'
                }`}
              >
                {availableTabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const isTabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isTabActive
                          ? darkMode
                            ? 'bg-white/15 text-white shadow-xs'
                            : 'bg-white text-slate-950 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-bold'
                      }`}
                    >
                      <TabIcon size={14} weight="duotone" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 1: WHITE TEMPERATURE (Only if light supports Color Temp) */}
            {(activeTab === 'tone' || availableTabs.length === 1 && supportsWarmth) && supportsWarmth && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    White Temperature
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {colorTempKelvin}K
                  </span>
                </div>

                {/* Modern Kelvin Color-Bar Slider */}
                <div
                  ref={kelvinTrackRef}
                  onPointerDown={(e) => {
                    const min = caps.minKelvin || 2000;
                    const max = caps.maxKelvin || 6500;
                    startDrag(
                      e,
                      kelvinTrackRef,
                      (ratio) => {
                        const kelvin = Math.round(min + ratio * (max - min));
                        handleKelvinChange(kelvin);
                      },
                      setIsDraggingKelvin
                    );
                  }}
                  className="h-11 rounded-2xl relative cursor-pointer shadow-inner border border-black/10 select-none flex items-center px-3"
                >
                  {/* Background gradient container with rounded-2xl and overflow-hidden */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none flex items-center px-3"
                    style={{
                      background:
                        'linear-gradient(to right, #ff7e1d 0%, #ffa54f 25%, #ffd5a6 50%, #ffffff 75%, #bcdcff 100%)'
                    }}
                  >
                    {/* Embedded Kelvin Range Labels */}
                    <span className="text-[10px] font-black uppercase text-amber-950/80 pointer-events-none drop-shadow-xs">
                      Warm
                    </span>
                    <span className="ml-auto text-[10px] font-black uppercase text-sky-950/80 pointer-events-none drop-shadow-xs">
                      Cool
                    </span>
                  </div>

                  {/* Modern Floating Color-Core Thumb - Never Clipped, Always On Top */}
                  {(() => {
                    const min = caps.minKelvin || 2000;
                    const max = caps.maxKelvin || 6500;
                    const ratio = Math.max(0, Math.min(1, (colorTempKelvin - min) / (max - min)));
                    return (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.35)] border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-100 z-30 ${
                          isDraggingKelvin ? 'scale-115' : ''
                        }`}
                        style={{ left: `calc(18px + (${ratio} * (100% - 36px)))` }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: kelvinToRgb(colorTempKelvin) }}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Tone Presets Row */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {TONE_PRESETS.map((preset) => {
                    const isSelected = Math.abs(colorTempKelvin - preset.kelvin) <= 250;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleKelvinChange(preset.kelvin)}
                        className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-xs'
                            : darkMode
                            ? 'bg-black/20 hover:bg-black/40 border-white/5 text-slate-300'
                            : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-800 font-bold shadow-xs'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: kelvinToRgb(preset.kelvin) }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CHROMATIC COLOR (Only if light supports Color) */}
            {(activeTab === 'color' || availableTabs.length === 1 && supportsColor) && supportsColor && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Spectrum Palette
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                      {selectedColor}
                    </span>
                  </div>
                </div>

                {/* Modern Full Spectrum 360° Rainbow Slider Track */}
                <div
                  ref={hueTrackRef}
                  onPointerDown={(e) =>
                    startDrag(
                      e,
                      hueTrackRef,
                      (ratio) => {
                        const hue = Math.round(ratio * 360);
                        handleHueChange(hue);
                      },
                      setIsDraggingHue
                    )
                  }
                  className="h-11 rounded-2xl relative cursor-pointer shadow-inner border border-black/10 select-none flex items-center px-3"
                >
                  {/* Background rainbow container with rounded-2xl and overflow-hidden */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(to right, #ff0000 0%, #ff8000 14%, #ffff00 28%, #00ff00 42%, #00ffff 57%, #0000ff 71%, #8000ff 85%, #ff00ff 93%, #ff0000 100%)'
                    }}
                  />

                  {/* Modern Floating Rainbow Core Thumb - Never Clipped, Always On Top */}
                  {(() => {
                    const ratio = Math.max(0, Math.min(1, currentHue / 360));
                    return (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.35)] border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-100 z-30 ${
                          isDraggingHue ? 'scale-115' : ''
                        }`}
                        style={{ left: `calc(18px + (${ratio} * (100% - 36px)))` }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: selectedColor }}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Designer Curated Color Dots */}
                <div className="flex items-center justify-between gap-2 pt-1 px-1">
                  {DESIGNER_COLORS.map((swatch) => {
                    const isSelected =
                      selectedColor.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => handleSelectColorSwatch(swatch)}
                        className={`w-9 h-9 rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md flex items-center justify-center border ${
                          isSelected
                            ? 'ring-3 ring-white ring-offset-2 ring-offset-black/40 scale-110 border-white'
                            : 'border-black/15 opacity-90 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.name}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: SCENES & DYNAMIC EFFECTS (Only if light supports Effects/Scenes) */}
            {(activeTab === 'scenes' || availableTabs.length === 1 && supportsScenes) && supportsScenes && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Lighting Scenes & Effects
                  </span>
                  {activeEffect && (
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {activeEffect}
                    </span>
                  )}
                </div>

                {/* Native Home Assistant Light Effects Chips */}
                {caps.effectList && caps.effectList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {caps.effectList.map((eff) => {
                      const isSelected = activeEffect.toLowerCase() === eff.toLowerCase();
                      return (
                        <button
                          key={eff}
                          type="button"
                          onClick={() => handleSelectEffect(eff)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                            isSelected
                              ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                              : darkMode
                              ? 'bg-black/20 hover:bg-black/40 border-white/5 text-slate-300'
                              : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-800 font-bold shadow-xs'
                          }`}
                        >
                          {eff}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Atmosphere Presets (if entity also supports color/temp) */}
                {(supportsColor || supportsWarmth) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {SCENE_PRESETS.map((scene) => {
                      const Icon = scene.icon;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => handleApplyScene(scene)}
                          className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.10)] ${
                            darkMode
                              ? 'bg-black/20 hover:bg-black/40 border-white/5 text-white'
                              : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-900 shadow-xs'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                            <Icon size={18} weight="duotone" />
                          </div>
                          <div>
                            <span className="text-xs font-black block">{scene.name}</span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold block">
                              {scene.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
