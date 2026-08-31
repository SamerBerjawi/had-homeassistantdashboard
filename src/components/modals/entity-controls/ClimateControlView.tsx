import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Plus,
  Minus,
  Drop,
  Fan,
  Power,
  Flame,
  Snowflake,
  Sparkle,
  Wind
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { getClimateModeTheme } from '../../../utils/climateTheme';

interface ClimateControlViewProps {
  entity: HAEntity;
}

const HVAC_MODES = [
  { id: 'heat', label: 'Heat', icon: Flame },
  { id: 'cool', label: 'Cool', icon: Snowflake },
  { id: 'auto', label: 'Auto', icon: Sparkle },
  { id: 'fan_only', label: 'Fan Only', icon: Fan },
  { id: 'dry', label: 'Dry', icon: Drop },
  { id: 'off', label: 'Off', icon: Power }
];

const PRESET_MODES = ['Comfort', 'Eco', 'Boost', 'Away', 'Sleep'];
const FAN_MODES = ['Auto', 'Low', 'Medium', 'High', 'Turbo'];

export default function ClimateControlView({ entity }: ClimateControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const currentTargetTemp = Number(
    entity?.attributes?.temperature ?? entity?.attributes?.target_temp ?? 21.0
  );
  const currentAmbientTemp = Number(
    entity?.attributes?.current_temperature ?? 21.5
  );
  const currentHumidity = Number(entity?.attributes?.humidity ?? 45);
  const currentHvacMode = String(entity?.attributes?.mode || entity?.state || 'heat');
  const currentFanMode = String(entity?.attributes?.fan_mode || 'Auto');
  const currentPreset = String(entity?.attributes?.preset_mode || 'Comfort');

  const [targetTemp, setTargetTemp] = useState<number>(isNaN(currentTargetTemp) ? 21.0 : currentTargetTemp);
  const [activeHvacMode, setActiveHvacMode] = useState<string>(currentHvacMode);
  const [activeFanMode, setActiveFanMode] = useState<string>(currentFanMode);
  const [activePreset, setActivePreset] = useState<string>(currentPreset);

  useEffect(() => {
    if (entity) {
      const t = Number(entity.attributes?.temperature ?? entity.attributes?.target_temp ?? 21.0);
      setTargetTemp(isNaN(t) ? 21.0 : t);
      setActiveHvacMode(String(entity.attributes?.mode || entity.state || 'heat'));
      setActiveFanMode(String(entity.attributes?.fan_mode || 'Auto'));
      setActivePreset(String(entity.attributes?.preset_mode || 'Comfort'));
    }
  }, [entity?.entity_id, entity?.state, entity?.attributes]);

  const minTemp = Number(entity?.attributes?.min_temp ?? 10);
  const maxTemp = Number(entity?.attributes?.max_temp ?? 35);

  const theme = getClimateModeTheme(activeHvacMode, activeHvacMode === 'off' ? 'off' : 'on');

  const handleAdjustTemp = (delta: number) => {
    const next = Math.round((targetTemp + delta) * 2) / 2;
    if (next >= minTemp && next <= maxTemp) {
      setTargetTemp(next);
      const nextHvacState = activeHvacMode === 'off' ? 'heat' : entity?.state || 'heat';
      updateEntityState(entity.entity_id, nextHvacState, {
        ...entity.attributes,
        target_temp: next,
        temperature: next
      });
      callHAService(
        'climate',
        'set_temperature',
        { temperature: next, target_temp_low: next - 1, target_temp_high: next + 1 },
        { entity_id: entity.entity_id }
      );
    }
  };

  const handleSelectHvacMode = (mode: string) => {
    setActiveHvacMode(mode);
    updateEntityState(entity.entity_id, mode, {
      ...entity.attributes,
      mode
    });
    callHAService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: entity.entity_id });
  };

  const handleSelectFanMode = (fanMode: string) => {
    setActiveFanMode(fanMode);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      fan_mode: fanMode
    });
    callHAService('climate', 'set_fan_mode', { fan_mode: fanMode }, { entity_id: entity.entity_id });
  };

  const handleSelectPreset = (preset: string) => {
    setActivePreset(preset);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      preset_mode: preset
    });
    callHAService('climate', 'set_preset_mode', { preset_mode: preset }, { entity_id: entity.entity_id });
  };

  // Circular gauge percentage calculation
  const tempRange = maxTemp - minTemp || 25;
  const tempPercent = Math.min(100, Math.max(0, ((targetTemp - minTemp) / tempRange) * 100));
  const strokeDashoffset = 283 - (283 * tempPercent * 0.75) / 100;

  return (
    <div className="space-y-6">
      {/* Interactive Radial Dial Hero Card */}
      <div className={`p-6 rounded-3xl border ${theme.borderDark} ${theme.bgDark} flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md transition-all duration-300`}>
        {/* Glow ambient background aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            theme.isOff
              ? 'bg-transparent'
              : theme.id === 'heat'
              ? 'bg-orange-500/30'
              : theme.id === 'cool'
              ? 'bg-cyan-500/30'
              : theme.id === 'auto'
              ? 'bg-emerald-500/30'
              : 'bg-teal-500/30'
          }`}
        />

        {/* Circular Thermostat Visual Dial */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          {/* Radial SVG Track */}
          <svg className="w-full h-full -rotate-135 transform" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
              strokeDasharray="283"
              strokeDashoffset="70"
              strokeLinecap="round"
            />
            {/* Active Progress Arc */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${theme.iconClass} transition-all duration-300`}
            />
          </svg>

          {/* Center Temperature & Controls */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-5xl font-black font-mono tracking-tight leading-none ${theme.isOff ? 'text-slate-500' : 'text-white'}`}>
              {Number(targetTemp || 21).toFixed(1)}°
            </span>
            <span className={`text-[11px] font-extrabold uppercase tracking-widest mt-1 ${theme.textClass}`}>
              {theme.isOff ? 'Standby' : `${theme.name} Target`}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              Ambient: <strong className="text-white font-semibold">{Number(currentAmbientTemp || 21.5).toFixed(1)}°C</strong>
            </span>
          </div>

          {/* Minus & Plus Buttons Floating on Arc Sides */}
          <button
            type="button"
            onClick={() => handleAdjustTemp(-0.5)}
            className="absolute left-1 bottom-3 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/15 shadow-md"
            title="Decrease Target Temp"
          >
            <Minus size={18} weight="bold" />
          </button>

          <button
            type="button"
            onClick={() => handleAdjustTemp(0.5)}
            className={`absolute right-1 bottom-3 w-11 h-11 rounded-2xl text-white ${theme.stepperBtnBg} ${theme.stepperBtnHover} ${theme.stepperBtnShadow} flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg`}
            title="Increase Target Temp"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>

        {/* Ambient Telemetry Pills Footer */}
        <div className="w-full flex items-center justify-around mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Thermometer size={16} weight="duotone" className="text-amber-400" />
            <span>Ambient: <strong className="text-white font-mono">{Number(currentAmbientTemp || 21.5).toFixed(1)}°C</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Drop size={16} weight="duotone" className="text-cyan-400" />
            <span>Humidity: <strong className="text-white font-mono">{currentHumidity}%</strong></span>
          </div>
        </div>
      </div>

      {/* HVAC Mode Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 block">HVAC Operation Mode</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {HVAC_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeHvacMode === mode.id;
            const modeTheme = getClimateModeTheme(mode.id, mode.id === 'off' ? 'off' : 'on');
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSelectHvacMode(mode.id)}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? `${modeTheme.badgeBgDark} ${modeTheme.badgeBorderDark} ${modeTheme.badgeTextDark} border shadow-lg scale-105 font-extrabold`
                    : 'bg-slate-800/30 hover:bg-slate-800/60 border-white/10 text-slate-400'
                }`}
              >
                <Icon size={20} weight={isSelected ? 'fill' : 'duotone'} />
                <span className="text-[11px] font-bold">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fan Speed Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 block">Fan Speed</label>
        <div className="grid grid-cols-5 gap-2">
          {FAN_MODES.map((fMode) => {
            const isSelected = activeFanMode.toLowerCase() === fMode.toLowerCase();
            return (
              <button
                key={fMode}
                type="button"
                onClick={() => handleSelectFanMode(fMode)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold scale-105'
                    : 'bg-slate-800/30 hover:bg-slate-800/60 border border-white/10 text-slate-400'
                }`}
              >
                {fMode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Mode Selector */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 block">Preset Profile</label>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_MODES.map((preset) => {
            const isSelected = activePreset.toLowerCase() === preset.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold scale-105'
                    : 'bg-slate-800/30 hover:bg-slate-800/60 border border-white/10 text-slate-400'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
