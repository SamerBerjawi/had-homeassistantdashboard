import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Sun,
  Palette,
  Sparkle,
  Moon,
  Flame,
  Lightning,
  ThermometerSimple
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectLightCapabilities,
  kelvinToRgb,
  LightCapabilities
} from '../../../services/lightClassification';
import TouchCapsuleSlider from '../../ui/TouchCapsuleSlider';

interface LightControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
}

const CHROMATIC_SWATCHES = [
  { name: 'Warm Amber', color: '#fef3c7', rgb: [254, 243, 199], temp: 2700 },
  { name: 'Cozy Candle', color: '#fed7aa', rgb: [254, 215, 170], temp: 2200 },
  { name: 'Pure Daylight', color: '#ffffff', rgb: [255, 255, 255], temp: 5000 },
  { name: 'Sunset Glow', color: '#f97316', rgb: [249, 115, 22], temp: null },
  { name: 'Ruby Red', color: '#ef4444', rgb: [239, 68, 68], temp: null },
  { name: 'Rose Quartz', color: '#f43f5e', rgb: [244, 63, 94], temp: null },
  { name: 'Cyber Purple', color: '#a855f7', rgb: [168, 85, 247], temp: null },
  { name: 'Deep Indigo', color: '#6366f1', rgb: [99, 102, 241], temp: null },
  { name: 'Ocean Cyan', color: '#06b6d4', rgb: [6, 182, 212], temp: null },
  { name: 'Emerald Forest', color: '#10b981', rgb: [16, 185, 129], temp: null },
  { name: 'Neon Lime', color: '#84cc16', rgb: [132, 204, 22], temp: null },
  { name: 'Electric Gold', color: '#eab308', rgb: [234, 179, 8], temp: null }
];

const WHITE_TEMP_PRESETS = [
  { name: 'Candle', kelvin: 2200 },
  { name: 'Warm', kelvin: 2700 },
  { name: 'Soft', kelvin: 3000 },
  { name: 'Neutral', kelvin: 4000 },
  { name: 'Daylight', kelvin: 6500 }
];

const BRIGHTNESS_PRESETS = [
  { label: '25%', val: 25 },
  { label: '50%', val: 50 },
  { label: '75%', val: 75 },
  { label: '100%', val: 100 }
];

const MOOD_PRESETS = [
  { id: 'relax', name: 'Cozy Relax', color: '#fed7aa', rgb: [254, 215, 170], brightness: 40, icon: Flame },
  { id: 'focus', name: 'Work Focus', color: '#ffffff', rgb: [255, 255, 255], brightness: 95, icon: Lightning },
  { id: 'night', name: 'Nightlight', color: '#fef3c7', rgb: [254, 243, 199], brightness: 10, icon: Moon },
  { id: 'party', name: 'Neon Glow', color: '#a855f7', rgb: [168, 85, 247], brightness: 80, icon: Sparkle }
];

export default function LightControlView({ entity, darkMode = true }: LightControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: LightCapabilities = useMemo(() => {
    return detectLightCapabilities(entity);
  }, [entity]);

  const lastChangedStr = formatRelativeTime(entity.last_changed || (entity as any).last_updated);

  const isOn = caps.isOn;
  const [brightness, setBrightness] = useState<number>(caps.brightnessPct);
  const [selectedColor, setSelectedColor] = useState<string>(caps.displayColor);
  const [colorTempKelvin, setColorTempKelvin] = useState<number>(caps.colorTempKelvin || 3500);
  const [activeEffect, setActiveEffect] = useState<string>(caps.effect || '');

  // Synchronize state with entity updates
  useEffect(() => {
    setBrightness(caps.brightnessPct);
    setSelectedColor(caps.displayColor);
    if (caps.colorTempKelvin) {
      setColorTempKelvin(caps.colorTempKelvin);
    }
    if (caps.effect) {
      setActiveEffect(caps.effect);
    }
  }, [caps]);

  // Master Power Toggle
  const handleToggle = () => {
    const nextState = isOn ? 'off' : 'on';
    const nextBrightnessPct = nextState === 'on' ? (brightness > 0 ? brightness : 80) : 0;
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
  };

  // Adjust Brightness
  const handleBrightnessChange = (val: number) => {
    const safeVal = Math.round(val);
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

  // Select Chromatic Swatch
  const handleSelectChromaticSwatch = (swatch: (typeof CHROMATIC_SWATCHES)[0]) => {
    setSelectedColor(swatch.color);
    if (swatch.temp && caps.supportsColorTemp) {
      setColorTempKelvin(swatch.temp);
      handleKelvinChange(swatch.temp);
    } else if (swatch.rgb) {
      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        rgb_color: swatch.rgb
      });
      callHAService('light', 'turn_on', { rgb_color: swatch.rgb }, { entity_id: entity.entity_id });
    }
  };

  // Apply Mood Atmosphere Preset
  const handleApplyMoodPreset = (preset: (typeof MOOD_PRESETS)[0]) => {
    setBrightness(preset.brightness);
    setSelectedColor(preset.color);
    const haBrightness255 = Math.round((preset.brightness / 100) * 255);

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      brightness: haBrightness255,
      rgb_color: preset.rgb
    });

    callHAService(
      'light',
      'turn_on',
      { brightness: haBrightness255, rgb_color: preset.rgb },
      { entity_id: entity.entity_id }
    );
  };

  // Select Dynamic Effect
  const handleSelectEffect = (effect: string) => {
    setActiveEffect(effect);
    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      effect
    });
    callHAService('light', 'turn_on', { effect }, { entity_id: entity.entity_id });
  };

  // Determine ambient glow color
  const heroAuraColor = isOn
    ? caps.type === 'color'
      ? selectedColor
      : caps.type === 'white_temp'
      ? kelvinToRgb(colorTempKelvin)
      : '#f59e0b'
    : 'transparent';

  const hasCustomColor = isOn && caps.supportsColor && Boolean(selectedColor);

  return (
    <div className="space-y-6">
      {/* 1. MASTER TOGGLE HERO SECTION */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          darkMode
            ? 'bg-slate-800/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.36)]'
            : 'bg-white/70 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
        }`}
      >
        {/* Glow ambient background aura */}
        <div
          className="absolute -inset-10 opacity-35 blur-3xl rounded-full transition-all duration-500 pointer-events-none"
          style={{ backgroundColor: heroAuraColor }}
        />

        {/* Large Tactile Power Toggle Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-22 h-22 sm:w-26 sm:h-26 rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isOn
              ? darkMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/30 ring-4 ring-amber-400/20'
                : 'bg-amber-100/90 border-amber-400 text-amber-600 shadow-amber-500/20 ring-4 ring-amber-400/25'
              : darkMode
              ? 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
          style={{
            borderColor: isOn && hasCustomColor ? selectedColor : undefined,
            color: isOn && hasCustomColor ? selectedColor : undefined
          }}
          title={isOn ? 'Click to Turn Off' : 'Click to Turn On'}
        >
          <Lightbulb
            size={44}
            weight={isOn ? 'fill' : 'duotone'}
            className={isOn ? 'drop-shadow-[0_0_15px_currentColor]' : ''}
          />
        </button>

        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {isOn
            ? caps.supportsBrightness
              ? `${brightness}% Brightness`
              : 'Turned On'
            : 'Turned Off'}
        </h3>
        <p
          className={`text-xs font-medium mt-1 flex items-center gap-1.5 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>
            {isOn
              ? caps.type === 'color'
                ? 'Color Active'
                : caps.type === 'white_temp'
                ? `${colorTempKelvin}K White Light`
                : 'Light Active'
              : 'Off'}
          </span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. BRIGHTNESS CAPSULE SLIDER & PRESETS */}
      {/* ========================================================================= */}
      {caps.supportsBrightness && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-amber-400' : 'text-amber-600'
              }`}
            >
              <Sun size={15} weight="duotone" />
              <span>Brightness</span>
            </span>
            <span
              className={`font-mono text-xs font-extrabold ${
                darkMode ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              {isOn ? `${brightness}%` : '0%'}
            </span>
          </div>

          <TouchCapsuleSlider
            value={isOn ? brightness : 0}
            min={0}
            max={100}
            step={1}
            onChange={handleBrightnessChange}
            icon={<Sun size={20} weight={isOn ? 'fill' : 'duotone'} />}
            label="Drag to Adjust"
            valueFormatter={(val) => `${Math.round(val)}%`}
            fillColor={hasCustomColor ? selectedColor : '#f59e0b'}
            glowColor={hasCustomColor ? `${selectedColor}44` : 'rgba(245, 158, 11, 0.3)'}
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          {/* Quick Brightness Jump Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {BRIGHTNESS_PRESETS.map((preset) => {
              const isSelected = isOn && Math.abs(brightness - preset.val) <= 5;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleBrightnessChange(preset.val)}
                  className={`h-11 rounded-2xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 flex items-center justify-center border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/40 border-amber-400'
                      : darkMode
                      ? 'bg-slate-800/50 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WHITE TEMPERATURE CONTROL (Kelvin Capsule Slider & Presets) */}
      {/* ========================================================================= */}
      {caps.supportsColorTemp && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              <ThermometerSimple size={15} weight="duotone" />
              <span>Color Temperature</span>
            </span>
            <span
              className={`font-mono text-xs font-extrabold ${
                darkMode ? 'text-amber-200' : 'text-amber-800'
              }`}
            >
              {colorTempKelvin}K
            </span>
          </div>

          <TouchCapsuleSlider
            value={colorTempKelvin}
            min={caps.minKelvin || 2000}
            max={caps.maxKelvin || 6500}
            step={50}
            onChange={handleKelvinChange}
            icon={<ThermometerSimple size={20} weight="duotone" />}
            label="Warm to Daylight"
            valueFormatter={(val) => `${Math.round(val)}K`}
            fillGradient="linear-gradient(to right, #ff8a00, #ffa73b, #ffeed6, #ffffff, #c7e6ff, #99d2ff)"
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          {/* White Temperature Preset Chips */}
          <div className="grid grid-cols-5 gap-1.5">
            {WHITE_TEMP_PRESETS.map((preset) => {
              const isSelected = isOn && Math.abs(colorTempKelvin - preset.kelvin) <= 150;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleKelvinChange(preset.kelvin)}
                  className={`h-14 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/30 text-amber-500 font-black shadow-md'
                      : darkMode
                      ? 'border-white/10 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs"
                    style={{ backgroundColor: kelvinToRgb(preset.kelvin) }}
                  />
                  <span className="text-[10px] font-bold truncate w-full">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CHROMATIC COLOR PALETTE */}
      {/* ========================================================================= */}
      {caps.supportsColor && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}
            >
              <Palette size={15} weight="duotone" />
              <span>Color Palette</span>
            </span>
            <span
              className={`font-mono text-[10px] font-bold ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {selectedColor}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {CHROMATIC_SWATCHES.map((swatch) => {
              const isSelected =
                isOn && selectedColor.toLowerCase() === swatch.color.toLowerCase();
              return (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => handleSelectChromaticSwatch(swatch)}
                  style={{ backgroundColor: swatch.color }}
                  className={`h-11 rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md flex items-center justify-center text-slate-950 font-extrabold text-[10px] border border-black/10 ${
                    isSelected
                      ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105 font-black'
                      : 'opacity-90 hover:opacity-100'
                  }`}
                  title={swatch.name}
                >
                  <span className="drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] truncate px-1">
                    {swatch.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ATMOSPHERE MOOD PRESETS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <span
          className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-1 ${
            darkMode ? 'text-pink-400' : 'text-pink-600'
          }`}
        >
          <Sparkle size={15} weight="duotone" />
          <span>Mood Atmospheres</span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MOOD_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyMoodPreset(preset)}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center group ${
                  darkMode
                    ? 'bg-slate-800/40 hover:bg-slate-800/80 border-white/10'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200/80'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                  style={{ backgroundColor: `${preset.color}33`, color: preset.color }}
                >
                  <Icon size={18} weight="duotone" />
                </div>
                <span
                  className={`text-xs font-extrabold truncate w-full ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {preset.name}
                </span>
                <span
                  className={`text-[10px] font-mono font-medium ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {preset.brightness}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. DYNAMIC EFFECTS */}
      {/* ========================================================================= */}
      {caps.effectList.length > 0 && (
        <div className="space-y-2.5">
          <label
            className={`text-xs font-bold uppercase tracking-wider block px-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Dynamic Lighting Effects ({caps.effectList.length})
          </label>
          <div className="flex items-center gap-2 flex-wrap max-h-32 overflow-y-auto scrollbar-thin">
            {caps.effectList.map((eff) => {
              const isSelected = activeEffect === eff;
              return (
                <button
                  key={eff}
                  type="button"
                  onClick={() => handleSelectEffect(eff)}
                  className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black border-amber-400 ring-2 ring-amber-400/30'
                      : darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {eff}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
