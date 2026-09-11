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
import TouchCapsuleSlider from '../../ui/TouchCapsuleSlider';

interface ClimateControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
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

export default function ClimateControlView({ entity, darkMode = true }: ClimateControlViewProps) {
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
    const rounded = Math.round(val * 10) / 10;
    setTargetTemp(rounded);
    updateEntityState(entity.entity_id, activeHvacMode === 'off' ? 'heat' : activeHvacMode, {
      ...entity.attributes,
      temperature: rounded
    });
    callHAService('climate', 'set_temperature', { temperature: rounded }, { entity_id: entity.entity_id });
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

  const modeSliderFillColor =
    activeHvacMode === 'heat'
      ? '#f97316'
      : activeHvacMode === 'cool'
      ? '#06b6d4'
      : activeHvacMode === 'dry'
      ? '#f59e0b'
      : activeHvacMode === 'fan_only'
      ? '#14b8a6'
      : activeHvacMode === 'auto' || activeHvacMode === 'heat_cool'
      ? '#10b981'
      : '#64748b';

  return (
    <div className="space-y-6">
      {/* 1. MASTER ERGONOMIC THERMOSTAT HERO CARD */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          darkMode
            ? 'bg-slate-800/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.36)]'
            : 'bg-white/70 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
        }`}
      >
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            activeHvacMode === 'heat'
              ? 'bg-orange-500/35'
              : activeHvacMode === 'cool'
              ? 'bg-sky-500/35'
              : activeHvacMode === 'dry'
              ? 'bg-amber-500/35'
              : activeHvacMode === 'fan_only'
              ? 'bg-teal-500/35'
              : activeHvacMode === 'auto' || activeHvacMode === 'heat_cool'
              ? 'bg-emerald-500/35'
              : 'bg-transparent'
          }`}
        />

        {/* HVAC Action & Status Badge */}
        <div
          className={`relative mb-3 flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wider ${
            darkMode
              ? 'bg-white/5 border-white/10 text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <ModeIcon size={15} weight="duotone" className={theme.textClass} />
          <span>{caps.hvacAction ? `${caps.hvacAction.toUpperCase()}` : theme.name.toUpperCase()}</span>
          {lastChangedStr && (
            <span className={darkMode ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal'}>
              • {lastChangedStr}
            </span>
          )}
        </div>

        {/* Ergonomic Stepper Target Temperature Control */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 my-2">
          {/* Minus Button */}
          <button
            type="button"
            onClick={() => handleTempAdjust(-caps.targetTempStep)}
            className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${
              darkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 border-white/15 text-slate-200 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Decrease Target Temperature"
          >
            <Minus size={24} weight="bold" />
          </button>

          {/* Large Target Readout */}
          <div className="text-center min-w-[130px]">
            <div
              className={`text-4xl sm:text-5xl font-black font-mono tracking-tight flex items-baseline justify-center ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span>{targetTemp.toFixed(1)}</span>
              <span
                className={`text-xl sm:text-2xl font-bold ml-1 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {caps.unit}
              </span>
            </div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider block mt-0.5 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Target Temp
            </span>
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={() => handleTempAdjust(caps.targetTempStep)}
            className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${theme.stepperBtnBg} ${theme.stepperBtnHover}`}
            title="Increase Target Temperature"
          >
            <Plus size={24} weight="bold" />
          </button>
        </div>

        {/* Ambient Room Temperature & Humidity Telemetry */}
        <div
          className={`mt-3 flex items-center gap-3.5 text-xs px-4 py-1.5 rounded-full border font-medium ${
            darkMode
              ? 'text-slate-300 bg-slate-900/60 border-white/10'
              : 'text-slate-700 bg-slate-100/90 border-slate-200/80'
          }`}
        >
          {caps.currentTemp !== undefined && (
            <span className="flex items-center gap-1.5">
              <Thermometer size={15} weight="duotone" className="text-rose-500" />
              <span>Room:</span>
              <strong className={`font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {caps.currentTemp}°C
              </strong>
            </span>
          )}
          {caps.currentHumidity !== undefined && (
            <span className="flex items-center gap-1.5">
              <Drop size={15} weight="duotone" className="text-sky-500" />
              <span>Humidity:</span>
              <strong className={`font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {caps.currentHumidity}%
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOUCH-FRIENDLY TEMPERATURE CAPSULE SLIDER */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span
            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <Thermometer size={15} weight="duotone" />
            <span>Target Temperature Slider</span>
          </span>
          <span
            className={`font-mono text-xs font-extrabold ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {targetTemp.toFixed(1)}°C
          </span>
        </div>

        <TouchCapsuleSlider
          value={targetTemp}
          min={caps.minTemp}
          max={caps.maxTemp}
          step={caps.targetTempStep}
          onChange={handleTempSlider}
          icon={<Thermometer size={20} weight="duotone" />}
          label="Adjust Setpoint"
          valueFormatter={(val) => `${val.toFixed(1)}°C`}
          fillColor={modeSliderFillColor}
          darkMode={darkMode}
          heightClass="h-14 sm:h-15"
        />

        <div
          className={`flex justify-between text-[11px] font-mono px-1 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>Min: {caps.minTemp}°C</span>
          <span>Mid: {((caps.minTemp + caps.maxTemp) / 2).toFixed(1)}°C</span>
          <span>Max: {caps.maxTemp}°C</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HVAC MODE SELECTOR PILLS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <label
          className={`text-xs font-bold uppercase tracking-wider block px-1 ${
            darkMode ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          HVAC Operating Mode
        </label>
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
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center min-h-[64px] ${
                  isSelected
                    ? darkMode
                      ? `${modeTheme.badgeBgDark} ${modeTheme.badgeBorderDark} text-white shadow-md font-black ring-2 ring-white/20`
                      : `${modeTheme.badgeBgLight} ${modeTheme.badgeBorderLight} text-slate-950 shadow-md font-black ring-2 ring-slate-900/10`
                    : darkMode
                    ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Icon
                  size={20}
                  weight={isSelected ? 'fill' : 'duotone'}
                  className={isSelected ? modeTheme.textClass : ''}
                />
                <span className="text-xs font-bold capitalize truncate w-full">
                  {mode === 'fan_only' ? 'Fan' : mode.replace(/_/g, ' ')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PRESET MODES */}
      {/* ========================================================================= */}
      {caps.presetModes.length > 0 && (
        <div className="space-y-2.5">
          <label
            className={`text-xs font-bold uppercase tracking-wider block px-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Climate Preset Mode
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {caps.presetModes.map((preset) => {
              const isSelected = activePreset.toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-md font-black border-orange-400 ring-2 ring-orange-400/30'
                      : darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FAN SPEED MODES */}
      {/* ========================================================================= */}
      {caps.fanModes.length > 0 && (
        <div className="space-y-2.5">
          <label
            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-1 ${
              darkMode ? 'text-teal-400' : 'text-teal-600'
            }`}
          >
            <Wind size={15} weight="duotone" />
            <span>Fan Speed</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {caps.fanModes.map((fMode) => {
              const isSelected = activeFanMode.toLowerCase() === fMode.toLowerCase();
              return (
                <button
                  key={fMode}
                  type="button"
                  onClick={() => handleFanModeChange(fMode)}
                  className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 shadow-md font-black border-teal-400 ring-2 ring-teal-400/30'
                      : darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
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
