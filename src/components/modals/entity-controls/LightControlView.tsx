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
import {
  detectLightCapabilities,
  kelvinToRgb,
  LightCapabilities
} from '../../../services/lightClassification';

interface LightControlViewProps {
  entity: HAEntity;
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
  { name: 'Candle', kelvin: 2200, label: '2200K' },
  { name: 'Warm', kelvin: 2700, label: '2700K' },
  { name: 'Soft', kelvin: 3000, label: '3000K' },
  { name: 'Neutral', kelvin: 4000, label: '4000K' },
  { name: 'Daylight', kelvin: 6500, label: '6500K' }
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

export default function LightControlView({ entity }: LightControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: LightCapabilities = useMemo(() => {
    return detectLightCapabilities(entity);
  }, [entity]);

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
      // Pure On/Off light
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
    setBrightness(val);
    const haBrightness255 = Math.round((val / 100) * 255);
    const nextState = val > 0 ? 'on' : 'off';

    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      brightness: haBrightness255
    });

    if (val > 0) {
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
    setColorTempKelvin(kelvin);
    const rgbStr = kelvinToRgb(kelvin);
    setSelectedColor(rgbStr);

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      color_temp_kelvin: kelvin
    });

    callHAService(
      'light',
      'turn_on',
      { color_temp_kelvin: kelvin },
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

  return (
    <div className="space-y-5">
      {/* 1. MASTER TOGGLE HERO SECTION */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient background aura */}
        <div
          className="absolute -inset-10 opacity-35 blur-3xl rounded-full transition-all duration-500 pointer-events-none"
          style={{ backgroundColor: heroAuraColor }}
        />

        {/* Large Tactile Power Toggle Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isOn
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/25 ring-4 ring-amber-400/20'
              : 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
          style={{
            borderColor: isOn && caps.supportsColor ? selectedColor : undefined,
            color: isOn && caps.supportsColor ? selectedColor : undefined
          }}
          title={isOn ? 'Click to Turn Off' : 'Click to Turn On'}
        >
          <Lightbulb
            size={40}
            weight={isOn ? 'fill' : 'duotone'}
            className={isOn ? 'drop-shadow-[0_0_15px_currentColor]' : ''}
          />
        </button>

        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {isOn
            ? caps.supportsBrightness
              ? `${brightness}% Brightness`
              : 'Turned On'
            : 'Turned Off'}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {isOn
            ? caps.type === 'color'
              ? 'Color Active & Illuminating'
              : caps.type === 'white_temp'
              ? `${colorTempKelvin}K White Light Active`
              : 'Illuminating'
            : 'Tap bulb to toggle power'}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2, 3, 4: BRIGHTNESS SLIDER & QUICK JUMP PRESETS */}
      {/* ========================================================================= */}
      {caps.supportsBrightness && (
        <div className="space-y-2.5">
          {/* Tactile Brightness Slider */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-slate-800/30 border border-white/10">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Sun size={16} weight="duotone" />
                <span>Brightness</span>
              </span>
              <span className="font-mono text-amber-300">{isOn ? `${brightness}%` : '0%'}</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={isOn ? brightness : 0}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Quick Brightness Jump Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {BRIGHTNESS_PRESETS.map((preset) => {
              const isSelected = isOn && Math.abs(brightness - preset.val) <= 5;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleBrightnessChange(preset.val)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-1 ring-amber-300'
                      : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10 text-slate-300'
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
      {/* TIER 3 & 4: WHITE TEMPERATURE CONTROL (Kelvin Slider & Presets) */}
      {/* ========================================================================= */}
      {caps.supportsColorTemp && (
        <div className="space-y-2.5">
          <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-slate-800/30 border border-white/10">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-300">
                <ThermometerSimple size={16} weight="duotone" />
                <span>White Temperature</span>
              </span>
              <span className="font-mono text-amber-200">{colorTempKelvin}K</span>
            </div>

            <input
              type="range"
              min={caps.minKelvin || 2000}
              max={caps.maxKelvin || 6500}
              step="50"
              value={colorTempKelvin}
              onChange={(e) => handleKelvinChange(Number(e.target.value))}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer border border-white/10"
              style={{
                background: 'linear-gradient(to right, #ff8a00, #ffa73b, #ffeed6, #ffffff, #c7e6ff, #99d2ff)'
              }}
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{caps.minKelvin || 2000}K (Warm)</span>
              <span>4000K (Neutral)</span>
              <span>{caps.maxKelvin || 6500}K (Cool)</span>
            </div>
          </div>

          {/* White Temperature Preset Chips */}
          <div className="grid grid-cols-5 gap-1.5">
            {WHITE_TEMP_PRESETS.map((preset) => {
              const isSelected = isOn && Math.abs(colorTempKelvin - preset.kelvin) <= 150;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleKelvinChange(preset.kelvin)}
                  className={`py-1.5 px-1 rounded-xl border flex flex-col items-center gap-0.5 text-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-md'
                      : 'border-white/10 bg-slate-800/30 hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 shadow-xs"
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
      {/* TIER 4: COLOR PALETTE & MOOD PRESETS */}
      {/* ========================================================================= */}
      {caps.supportsColor && (
        <div className="space-y-4">
          {/* Chromatic Swatches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette size={15} weight="duotone" className="text-indigo-400" />
                <span>Color Palette</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">{selectedColor}</span>
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
                    className={`w-full py-2.5 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md flex items-center justify-center text-slate-950 font-bold text-[9px] ${
                      isSelected
                        ? 'ring-3 ring-white ring-offset-2 ring-offset-slate-900 scale-105'
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

          {/* Atmosphere Mood Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkle size={15} weight="duotone" className="text-pink-400" />
              <span>Mood Presets</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOOD_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyMoodPreset(preset)}
                    className="p-2.5 rounded-2xl bg-slate-800/30 hover:bg-slate-800/70 border border-white/10 flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 text-center group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                      style={{ backgroundColor: `${preset.color}25`, color: preset.color }}
                    >
                      <Icon size={16} weight="duotone" />
                    </div>
                    <span className="text-[11px] font-bold text-white truncate w-full">{preset.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{preset.brightness}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Effects (if present) */}
          {caps.effectList.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Dynamic Effects ({caps.effectList.length})
              </label>
              <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto scrollbar-thin">
                {caps.effectList.map((eff) => {
                  const isSelected = activeEffect === eff;
                  return (
                    <button
                      key={eff}
                      type="button"
                      onClick={() => handleSelectEffect(eff)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-md scale-105 font-black'
                          : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10 text-slate-300'
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
      )}
    </div>
  );
}
