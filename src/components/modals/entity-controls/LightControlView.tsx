import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Power,
  Sun,
  Palette,
  Sparkle,
  Moon,
  Flame,
  Lightning,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface LightControlViewProps {
  entity: HAEntity;
}

const COLOR_SWATCHES = [
  { name: 'Warm Amber', color: '#fef3c7', temp: 2700 },
  { name: 'Cozy Candle', color: '#fed7aa', temp: 2200 },
  { name: 'Pure Daylight', color: '#ffffff', temp: 5000 },
  { name: 'Sunset Glow', color: '#f97316', temp: null },
  { name: 'Rose Quartz', color: '#f43f5e', temp: null },
  { name: 'Cyber Purple', color: '#a855f7', temp: null },
  { name: 'Deep Indigo', color: '#6366f1', temp: null },
  { name: 'Ocean Cyan', color: '#06b6d4', temp: null },
  { name: 'Emerald Forest', color: '#10b981', temp: null }
];

const PRESETS = [
  { id: 'relax', name: 'Cozy Relax', color: '#fed7aa', brightness: 40, icon: Flame },
  { id: 'focus', name: 'Work Focus', color: '#ffffff', brightness: 95, icon: Lightning },
  { id: 'night', name: 'Nightlight', color: '#fef3c7', brightness: 10, icon: Moon },
  { id: 'party', name: 'Neon Glow', color: '#a855f7', brightness: 80, icon: Sparkle }
];

export default function LightControlView({ entity }: LightControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const isOn = entity?.state === 'on';
  const rawBrightness = entity?.attributes?.brightness;
  
  // Home Assistant native brightness is 0-255
  const initialBrightness = typeof rawBrightness === 'number'
    ? rawBrightness > 100
      ? Math.round((rawBrightness / 255) * 100)
      : Math.round(rawBrightness)
    : isOn
    ? 100
    : 0;

  const rawRgb = entity?.attributes?.rgb_color;
  const formattedColor = Array.isArray(rawRgb) && rawRgb.length >= 3
    ? `rgb(${rawRgb.slice(0, 3).join(',')})`
    : typeof entity?.attributes?.color === 'string'
    ? entity.attributes.color
    : '#ffffff';

  const [brightness, setBrightness] = useState<number>(initialBrightness);
  const [selectedColor, setSelectedColor] = useState<string>(formattedColor);
  const [colorTempKelvin, setColorTempKelvin] = useState<number>(
    Number(entity?.attributes?.color_temp_kelvin) || 3500
  );
  const [activeEffect, setActiveEffect] = useState<string>(
    String(entity?.attributes?.effect || '')
  );

  useEffect(() => {
    if (entity) {
      const b = typeof entity.attributes?.brightness === 'number'
        ? entity.attributes.brightness > 100
          ? Math.round((entity.attributes.brightness / 255) * 100)
          : Math.round(entity.attributes.brightness)
        : entity.state === 'on' ? 100 : 0;
      setBrightness(b);

      if (Array.isArray(entity.attributes?.rgb_color) && entity.attributes.rgb_color.length >= 3) {
        setSelectedColor(`rgb(${entity.attributes.rgb_color.slice(0, 3).join(',')})`);
      }
      if (entity.attributes?.color_temp_kelvin) {
        setColorTempKelvin(Number(entity.attributes.color_temp_kelvin));
      }
      if (entity.attributes?.effect) {
        setActiveEffect(String(entity.attributes.effect));
      }
    }
  }, [entity?.entity_id, entity?.state, entity?.attributes]);

  const effectList: string[] = Array.isArray(entity?.attributes?.effect_list)
    ? entity.attributes.effect_list
    : [];
  const supportedColorModes: string[] = Array.isArray(entity?.attributes?.supported_color_modes)
    ? entity.attributes.supported_color_modes
    : [];

  const supportsColor =
    supportedColorModes.includes('rgb') ||
    supportedColorModes.includes('rgbw') ||
    supportedColorModes.includes('rgbww') ||
    supportedColorModes.includes('xy') ||
    supportedColorModes.includes('hs') ||
    Boolean(entity?.attributes?.rgb_color || entity?.attributes?.color);

  const supportsColorTemp =
    supportedColorModes.includes('color_temp') ||
    Boolean(entity?.attributes?.color_temp || entity?.attributes?.color_temp_kelvin);

  const handleToggle = () => {
    const nextState = isOn ? 'off' : 'on';
    const nextBrightnessPct = nextState === 'on' ? Math.max(brightness, 30) : 0;
    const haBrightness255 = Math.round((nextBrightnessPct / 100) * 255);

    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      brightness: haBrightness255
    });

    callHAService(
      'light',
      nextState === 'on' ? 'turn_on' : 'turn_off',
      nextState === 'on' ? { brightness: haBrightness255 } : {},
      { entity_id: entity.entity_id }
    );
  };

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

  const handleKelvinChange = (kelvin: number) => {
    setColorTempKelvin(kelvin);
    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      color_temp_kelvin: kelvin
    });
    callHAService('light', 'turn_on', { color_temp_kelvin: kelvin }, { entity_id: entity.entity_id });
  };

  const handleSelectSwatch = (swatch: (typeof COLOR_SWATCHES)[0]) => {
    setSelectedColor(swatch.color);
    if (swatch.temp) {
      setColorTempKelvin(swatch.temp);
      handleKelvinChange(swatch.temp);
    } else {
      const hex = swatch.color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 255;
      const g = parseInt(hex.substring(2, 4), 16) || 255;
      const b = parseInt(hex.substring(4, 6), 16) || 255;
      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        rgb_color: [r, g, b]
      });
      callHAService('light', 'turn_on', { rgb_color: [r, g, b] }, { entity_id: entity.entity_id });
    }
  };

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setBrightness(preset.brightness);
    setSelectedColor(preset.color);
    const haBrightness255 = Math.round((preset.brightness / 100) * 255);
    const hex = preset.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 255;
    const g = parseInt(hex.substring(2, 4), 16) || 255;
    const b = parseInt(hex.substring(4, 6), 16) || 255;

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      brightness: haBrightness255,
      rgb_color: [r, g, b]
    });

    callHAService(
      'light',
      'turn_on',
      { brightness: haBrightness255, rgb_color: [r, g, b] },
      { entity_id: entity.entity_id }
    );
  };

  const handleSelectEffect = (effect: string) => {
    setActiveEffect(effect);
    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      effect
    });
    callHAService('light', 'turn_on', { effect }, { entity_id: entity.entity_id });
  };

  return (
    <div className="space-y-6">
      {/* Power & Live Brightness Hero Section */}
      <div className="p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient background aura */}
        <div
          className="absolute -inset-10 opacity-35 blur-3xl rounded-full transition-all duration-500 pointer-events-none"
          style={{
            backgroundColor: isOn ? (supportsColor ? selectedColor : '#f59e0b') : 'transparent'
          }}
        />

        {/* Large Power Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-4 border ${
            isOn
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/25 ring-4 ring-amber-400/20'
              : 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
          style={{
            borderColor: isOn && supportsColor ? selectedColor : undefined,
            color: isOn && supportsColor ? selectedColor : undefined
          }}
        >
          <Lightbulb
            size={44}
            weight={isOn ? 'fill' : 'duotone'}
            className={isOn ? 'drop-shadow-[0_0_15px_currentColor]' : ''}
          />
        </button>

        <h3 className="text-2xl font-black text-white tracking-tight">
          {isOn ? `${brightness}% Brightness` : 'Turned Off'}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {isOn ? 'Active & Illuminating' : 'Tap bulb icon to turn on'}
        </p>
      </div>

      {/* Tactile Brightness Slider */}
      <div className="space-y-2 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Sun size={16} weight="duotone" />
            <span>Brightness Level</span>
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
          <span>0% (Off)</span>
          <span>50%</span>
          <span>100% (Max)</span>
        </div>
      </div>

      {/* Mood Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 block">Quick Presets</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="p-3 rounded-2xl bg-slate-800/30 hover:bg-slate-800/70 border border-white/10 flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center group"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                  style={{ backgroundColor: `${preset.color}25`, color: preset.color }}
                >
                  <Icon size={18} weight="duotone" />
                </div>
                <span className="text-xs font-bold text-white truncate w-full">{preset.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{preset.brightness}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Temperature Slider (if supported) */}
      {supportsColorTemp && (
        <div className="space-y-2 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Flame size={16} weight="duotone" />
              <span>Color Temperature</span>
            </span>
            <span className="font-mono text-amber-200">{colorTempKelvin}K</span>
          </div>

          <input
            type="range"
            min="2000"
            max="6500"
            step="100"
            value={colorTempKelvin}
            onChange={(e) => handleKelvinChange(Number(e.target.value))}
            className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-linear-to-r from-orange-400 via-amber-200 to-sky-200"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>2000K (Warm)</span>
            <span>4000K (Neutral)</span>
            <span>6500K (Cool)</span>
          </div>
        </div>
      )}

      {/* Color Palette Swatches */}
      {supportsColor && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Color Palette</label>
          <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
            {COLOR_SWATCHES.map((swatch) => {
              const isSelected = selectedColor.toLowerCase() === swatch.color.toLowerCase();
              return (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => handleSelectSwatch(swatch)}
                  style={{ backgroundColor: swatch.color }}
                  className={`w-full aspect-square rounded-2xl transition-all cursor-pointer hover:scale-110 shadow-md ${
                    isSelected
                      ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-900 scale-105'
                      : 'opacity-90 hover:opacity-100'
                  }`}
                  title={swatch.name}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Lighting Effects (if supported) */}
      {effectList.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Lighting Dynamic Effects</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {effectList.map((eff) => {
              const isSelected = activeEffect === eff;
              return (
                <button
                  key={eff}
                  type="button"
                  onClick={() => handleSelectEffect(eff)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
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
  );
}
