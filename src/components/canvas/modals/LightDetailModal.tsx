/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lightbulb, Power, Sun, Palette, Sparkles, Moon, Flame, Zap } from 'lucide-react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';

interface LightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

const COLOR_SWATCHES = [
  { name: 'Warm Amber', color: '#fef3c7', temp: 2700 },
  { name: 'Cozy Candle', color: '#fed7aa', temp: 2200 },
  { name: 'Pure Daylight', color: '#ffffff', temp: 5000 },
  { name: 'Cyber Purple', color: '#7B61FF', temp: null },
  { name: 'Ocean Cyan', color: '#06b6d4', temp: null },
  { name: 'Emerald Glow', color: '#10b981', temp: null },
  { name: 'Sunset Rose', color: '#f43f5e', temp: null }
];

const PRESETS = [
  { id: 'relax', name: 'Cozy Relax', color: '#fef3c7', brightness: 40, icon: Flame },
  { id: 'focus', name: 'Work Focus', color: '#ffffff', brightness: 90, icon: Zap },
  { id: 'night', name: 'Nightlight', color: '#fed7aa', brightness: 12, icon: Moon },
  { id: 'party', name: 'Neon Party', color: '#7B61FF', brightness: 75, icon: Sparkles }
];

export default function LightDetailModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: LightDetailModalProps) {
  const isOn = entity.state === 'on';
  const currentBrightness = typeof entity.attributes?.brightness === 'number' ? entity.attributes.brightness : isOn ? 100 : 0;
  const currentColor = entity.attributes?.color || '#ffffff';

  const [brightness, setBrightness] = useState<number>(currentBrightness);
  const [selectedColor, setSelectedColor] = useState<string>(currentColor);
  const [colorTemp, setColorTemp] = useState<number>(3500);

  const handleToggle = () => {
    const nextState = isOn ? 'off' : 'on';
    onUpdateEntity(entity.entity_id, nextState, {
      brightness: nextState === 'on' ? (brightness || 80) : 0,
      color: selectedColor
    });
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    if (!isOn && val > 0) {
      onUpdateEntity(entity.entity_id, 'on', { brightness: val, color: selectedColor });
    } else {
      onUpdateEntity(entity.entity_id, val > 0 ? 'on' : 'off', { brightness: val, color: selectedColor });
    }
  };

  const handleSelectColor = (hex: string) => {
    setSelectedColor(hex);
    onUpdateEntity(entity.entity_id, 'on', { color: hex, brightness: Math.max(brightness, 20) });
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setSelectedColor(preset.color);
    setBrightness(preset.brightness);
    onUpdateEntity(entity.entity_id, 'on', {
      color: preset.color,
      brightness: preset.brightness
    });
  };

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={entity.attributes?.friendly_name || 'Light Controls'}
      subtitle={entity.entity_id}
      icon={<Lightbulb size={22} className={isOn ? 'text-amber-400 fill-amber-400' : 'text-slate-400'} />}
    >
      <div className="space-y-6">
        {/* Top Control Bar: Master Power Toggle & Status */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isOn ? 'shadow-lg' : 'bg-white/10 text-slate-400'
              }`}
              style={{
                backgroundColor: isOn ? selectedColor : undefined,
                color: isOn ? '#000' : undefined
              }}
            >
              <Lightbulb size={24} className={isOn ? 'fill-current' : ''} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isOn ? 'Light is Illuminated' : 'Light is Switched Off'}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {isOn ? `${brightness}% Output • ${selectedColor}` : '0% Power Output'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggle}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
              isOn
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/30'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            <Power size={20} />
          </button>
        </div>

        {/* Brightness Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sun size={14} className="text-amber-400" /> Brightness Level
            </span>
            <span className="font-mono text-white text-sm">{brightness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
            className="w-full h-3 bg-black/40 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-white/10"
          />
        </div>

        {/* Color Temperature Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Color Temperature</span>
            <span className="font-mono text-white text-xs">{colorTemp}K</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="2000"
              max="6500"
              step="100"
              value={colorTemp}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setColorTemp(val);
                if (val < 3000) handleSelectColor('#fed7aa');
                else if (val < 4500) handleSelectColor('#fef3c7');
                else handleSelectColor('#ffffff');
              }}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer border border-white/10"
              style={{
                background: 'linear-gradient(to right, #ff9e42, #ffeed6, #ffffff, #d8eeff)'
              }}
            />
          </div>
        </div>

        {/* Color Palette Swatches */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Palette size={14} className="text-indigo-400" /> Chromatic Palette
          </div>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.name}
                onClick={() => handleSelectColor(swatch.color)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  selectedColor === swatch.color
                    ? 'border-white bg-white/20 shadow-md scale-105'
                    : 'border-white/10 bg-white/5 hover:bg-white/15'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs shrink-0"
                  style={{ backgroundColor: swatch.color }}
                />
                <span className="text-slate-200">{swatch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Mood Presets */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Sparkles size={14} className="text-pink-400" /> Atmosphere Presets
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESETS.map((preset) => {
              const IconComponent = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 flex flex-col items-center gap-2 text-center transition-all cursor-pointer hover:scale-105"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <IconComponent size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">{preset.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{preset.brightness}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
