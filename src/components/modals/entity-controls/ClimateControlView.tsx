import React, { useState, useEffect, useMemo } from 'react';
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
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectClimateCapabilities,
  ClimateCapabilities
} from '../../../services/climateClassification';

interface ClimateControlViewProps {
  entity: HAEntity;
}

const HVAC_MODE_ICONS: Record<string, any> = {
  heat: Flame,
  cool: Snowflake,
  heat_cool: Sparkle,
  auto: Sparkle,
  fan_only: Fan,
  dry: Drop,
  off: Power
};

export default function ClimateControlView({ entity }: ClimateControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: ClimateCapabilities = useMemo(() => {
    return detectClimateCapabilities(entity);
  }, [entity]);

  const [targetTemp, setTargetTemp] = useState<number>(caps.targetTemp ?? 21.0);
  const [activeHvacMode, setActiveHvacMode] = useState<string>(caps.hvacMode);
  const [activeFanMode, setActiveFanMode] = useState<string>(caps.fanMode || '');
  const [activePreset, setActivePreset] = useState<string>(caps.presetMode || '');

  useEffect(() => {
    if (caps.targetTemp !== undefined) {
      setTargetTemp(caps.targetTemp);
    }
    setActiveHvacMode(caps.hvacMode);
    if (caps.fanMode) setActiveFanMode(caps.fanMode);
    if (caps.presetMode) setActivePreset(caps.presetMode);
  }, [caps]);

  const theme = useMemo(() => {
    return getClimateModeTheme(activeHvacMode, activeHvacMode === 'off' ? 'off' : 'on');
  }, [activeHvacMode]);

  // Adjust Temperature Stepper
  const handleTempAdjust = (delta: number) => {
    const nextVal = Math.max(caps.minTemp, Math.min(caps.maxTemp, Math.round((targetTemp + delta) * 10) / 10));
    setTargetTemp(nextVal);
    updateEntityState(entity.entity_id, activeHvacMode === 'off' ? 'heat' : activeHvacMode, {
      ...entity.attributes,
      temperature: nextVal
    });
    callHAService('climate', 'set_temperature', { temperature: nextVal }, { entity_id: entity.entity_id });
  };

  // Adjust Temperature Slider
  const handleTempSlider = (val: number) => {
    setTargetTemp(val);
    updateEntityState(entity.entity_id, activeHvacMode === 'off' ? 'heat' : activeHvacMode, {
      ...entity.attributes,
      temperature: val
    });
    callHAService('climate', 'set_temperature', { temperature: val }, { entity_id: entity.entity_id });
  };

  // Select HVAC Mode
  const handleHvacModeChange = (mode: string) => {
    setActiveHvacMode(mode);
    const nextState = mode === 'off' ? 'off' : mode;
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      hvac_mode: mode
    });
    callHAService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: entity.entity_id });
  };

  // Select Preset Mode
  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      preset_mode: preset
    });
    callHAService('climate', 'set_preset_mode', { preset_mode: preset }, { entity_id: entity.entity_id });
  };

  // Select Fan Mode
  const handleFanModeChange = (fanMode: string) => {
    setActiveFanMode(fanMode);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      fan_mode: fanMode
    });
    callHAService('climate', 'set_fan_mode', { fan_mode: fanMode }, { entity_id: entity.entity_id });
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);
  const ModeIcon = theme.icon;

  return (
    <div className="space-y-5">
      {/* 1. MASTER ERGONOMIC THERMOSTAT HERO CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            activeHvacMode === 'heat'
              ? 'bg-rose-500/40'
              : activeHvacMode === 'cool'
              ? 'bg-sky-500/40'
              : activeHvacMode === 'dry'
              ? 'bg-teal-500/40'
              : activeHvacMode === 'fan_only'
              ? 'bg-emerald-500/40'
              : activeHvacMode === 'auto' || activeHvacMode === 'heat_cool'
              ? 'bg-indigo-500/40'
              : 'bg-transparent'
          }`}
        />

        {/* HVAC Action & Status Badge */}
        <div className="relative mb-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
          <ModeIcon size={14} weight="duotone" className={theme.textClass} />
          <span>{caps.hvacAction ? `${caps.hvacAction.toUpperCase()}` : theme.name.toUpperCase()}</span>
          {lastChangedStr && <span className="text-slate-400 font-normal">• {lastChangedStr}</span>}
        </div>

        {/* Ergonomic Stepper Target Temperature Control */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 my-2">
          {/* Minus Button */}
          <button
            type="button"
            onClick={() => handleTempAdjust(-caps.targetTempStep)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md"
            title="Decrease Target Temperature"
          >
            <Minus size={22} weight="bold" />
          </button>

          {/* Large Target Readout */}
          <div className="text-center min-w-[120px]">
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white flex items-baseline justify-center">
              <span>{targetTemp.toFixed(1)}</span>
              <span className="text-xl sm:text-2xl font-bold ml-0.5 text-slate-400">{caps.unit}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target</span>
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={() => handleTempAdjust(caps.targetTempStep)}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md ${theme.stepperBtnBg} ${theme.stepperBtnHover}`}
            title="Increase Target Temperature"
          >
            <Plus size={22} weight="bold" />
          </button>
        </div>

        {/* Ambient Room Temperature & Humidity Telemetry */}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-300 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-white/10 font-medium">
          {caps.currentTemp !== undefined && (
            <span className="flex items-center gap-1">
              <Thermometer size={14} weight="duotone" className="text-rose-400" />
              <span>Room: </span>
              <strong className="font-mono text-white">{caps.currentTemp}°C</strong>
            </span>
          )}
          {caps.currentHumidity !== undefined && (
            <span className="flex items-center gap-1">
              <Drop size={14} weight="duotone" className="text-sky-400" />
              <span>Humidity: </span>
              <strong className="font-mono text-white">{caps.currentHumidity}%</strong>
            </span>
          )}
        </div>
      </div>

      {/* 2. SMOOTH TARGET TEMPERATURE SLIDER */}
      <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-slate-800/30 border border-white/10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Thermometer size={15} weight="duotone" />
            <span>Target Slider</span>
          </span>
          <span className="font-mono text-white">{targetTemp}°C</span>
        </div>

        <input
          type="range"
          min={caps.minTemp}
          max={caps.maxTemp}
          step={caps.targetTempStep}
          value={targetTemp}
          onChange={(e) => handleTempSlider(Number(e.target.value))}
          className={`w-full h-2.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer ${theme.sliderAccent}`}
        />

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>{caps.minTemp}°C</span>
          <span>{Math.round((caps.minTemp + caps.maxTemp) / 2)}°C</span>
          <span>{caps.maxTemp}°C</span>
        </div>
      </div>

      {/* 3. HVAC MODE SELECTOR PILLS */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 block">HVAC Operating Mode</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {caps.hvacModes.map((mode) => {
            const isSelected = activeHvacMode === mode;
            const Icon = HVAC_MODE_ICONS[mode] || Thermometer;
            const modeTheme = getClimateModeTheme(mode, mode === 'off' ? 'off' : 'on');

            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleHvacModeChange(mode)}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 text-center ${
                  isSelected
                    ? `${modeTheme.badgeBgDark} ${modeTheme.badgeBorderDark} text-white shadow-md scale-105 font-black`
                    : 'bg-slate-800/30 hover:bg-slate-800/70 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={18} weight={isSelected ? 'fill' : 'duotone'} className={isSelected ? modeTheme.textClass : ''} />
                <span className="text-[11px] font-bold capitalize truncate w-full">
                  {mode.replace(/_/g, ' ')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PRESET MODES (Strictly only if physical device has presets) */}
      {caps.presetModes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Preset Mode</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {caps.presetModes.map((preset) => {
              const isSelected = activePreset.toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-md scale-105 font-black'
                      : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10 text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. FAN SPEED MODES (Strictly only if physical device has fan speeds) */}
      {caps.fanModes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Wind size={15} weight="duotone" className="text-teal-400" />
            <span>Fan Speed</span>
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {caps.fanModes.map((fMode) => {
              const isSelected = activeFanMode.toLowerCase() === fMode.toLowerCase();
              return (
                <button
                  key={fMode}
                  type="button"
                  onClick={() => handleFanModeChange(fMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 shadow-md scale-105 font-black'
                      : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10 text-slate-300'
                  }`}
                >
                  {fMode}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
