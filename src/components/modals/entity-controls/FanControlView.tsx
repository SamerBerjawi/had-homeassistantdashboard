import React, { useState, useEffect, useMemo } from 'react';
import {
  Fan,
  Power,
  Wind,
  ArrowsHorizontal
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectFanCapabilities,
  FanCapabilities
} from '../../../services/fanClassification';
import TouchCapsuleSlider from '../../ui/TouchCapsuleSlider';

interface FanControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
}

export default function FanControlView({ entity, darkMode = true }: FanControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: FanCapabilities = useMemo(() => {
    return detectFanCapabilities(entity as any);
  }, [entity]);

  const [speed, setSpeed] = useState<number>(caps.percentage);
  const [isOscillating, setIsOscillating] = useState<boolean>(caps.isOscillating);
  const [activeAngle, setActiveAngle] = useState<number | undefined>(caps.currentAngle);
  const [activePreset, setActivePreset] = useState<string | undefined>(caps.currentPresetMode);

  useEffect(() => {
    setSpeed(caps.percentage);
    setIsOscillating(caps.isOscillating);
    setActiveAngle(caps.currentAngle);
    setActivePreset(caps.currentPresetMode);
  }, [caps]);

  const isOn = caps.isOn;

  // Toggle Fan Master Power
  const handleTogglePower = () => {
    const nextState = isOn ? 'off' : 'on';
    const nextPct = nextState === 'on' ? (speed > 0 ? speed : 100) : 0;
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      percentage: nextPct
    });
    callHAService('fan', nextState === 'on' ? 'turn_on' : 'turn_off', nextState === 'on' ? { percentage: nextPct } : {}, { entity_id: entity.entity_id });
  };

  // Change Fan Speed Percentage
  const handleSpeedChange = (newPct: number) => {
    const safePct = Math.round(newPct);
    setSpeed(safePct);
    const nextState = safePct > 0 ? 'on' : 'off';
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      percentage: safePct
    });
    if (safePct > 0) {
      callHAService('fan', 'set_percentage', { percentage: safePct }, { entity_id: entity.entity_id });
    } else {
      callHAService('fan', 'turn_off', {}, { entity_id: entity.entity_id });
    }
  };

  // Toggle Oscillation
  const handleToggleOscillation = () => {
    const nextOsc = !isOscillating;
    setIsOscillating(nextOsc);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      oscillating: nextOsc
    });
    callHAService('fan', 'oscillate', { oscillating: nextOsc }, { entity_id: entity.entity_id });
  };

  // Set Oscillation Angle
  const handleSetAngle = (angle: number) => {
    setActiveAngle(angle);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      oscillation_angle: angle
    });
    callHAService('fan', 'set_oscillation_angle', { angle }, { entity_id: entity.entity_id });
  };

  // Set Preset Mode
  const handleSetPreset = (preset: string) => {
    setActivePreset(preset);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      preset_mode: preset
    });
    callHAService('fan', 'set_preset_mode', { preset_mode: preset }, { entity_id: entity.entity_id });
  };

  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || entity.attributes?.last_changed;
  const lastChangedStr = formatRelativeTime(lastChanged);

  // Dynamic blade spinning animation speed (faster when speed is high)
  const spinSpeedSec = isOn && speed > 0 ? Math.max(0.35, 2.2 - (speed / 100) * 1.8) : 0;

  return (
    <div className="space-y-6">
      {/* 1. MASTER FAN HERO CARD WITH INTERACTIVE SPINNING BLADE */}
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
            isOn ? 'bg-teal-500/35' : 'bg-transparent'
          }`}
        />

        {/* Large Tactile Fan Button with Live Spinning Speed */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`w-22 h-22 sm:w-26 sm:h-26 rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isOn
              ? darkMode
                ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-teal-500/30 ring-4 ring-teal-400/20'
                : 'bg-teal-100/90 border-teal-400 text-teal-600 shadow-teal-500/20 ring-4 ring-teal-400/25'
              : darkMode
              ? 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
          title={isOn ? 'Turn Fan Off' : 'Turn Fan On'}
        >
          <Fan
            size={48}
            weight={isOn ? 'fill' : 'duotone'}
            className={isOn ? 'drop-shadow-[0_0_15px_rgba(45,212,191,0.8)]' : ''}
            style={
              isOn && spinSpeedSec > 0
                ? {
                    animation: `spin ${spinSpeedSec}s linear infinite`
                  }
                : undefined
            }
          />
        </button>

        {/* Status Headline */}
        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {isOn ? `${speed}% Speed` : 'Fan Off'}
        </h3>
        <p
          className={`text-xs font-medium mt-1 flex items-center gap-1.5 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>
            {isOn
              ? isOscillating
                ? 'Airflow Active • Oscillating'
                : 'Airflow Active'
              : 'Turned Off'}
          </span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* Quick Power Toggle */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`mt-4 px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-extrabold shadow-md border ${
            isOn
              ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black border-teal-400'
              : darkMode
              ? 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          <Power size={15} weight="bold" />
          <span>{isOn ? 'Power Off' : 'Power On'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPEED CAPSULE SLIDER & PRESETS */}
      {/* ========================================================================= */}
      {caps.supportsSpeed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-teal-400' : 'text-teal-600'
              }`}
            >
              <Wind size={15} weight="duotone" />
              <span>Speed Level</span>
            </span>
            <span
              className={`font-mono text-xs font-extrabold ${
                darkMode ? 'text-teal-300' : 'text-teal-700'
              }`}
            >
              {isOn ? `${speed}%` : '0%'}
            </span>
          </div>

          <TouchCapsuleSlider
            value={isOn ? speed : 0}
            min={0}
            max={100}
            step={caps.percentageStep || 1}
            onChange={handleSpeedChange}
            icon={<Wind size={20} weight="duotone" />}
            label="Airflow Speed"
            valueFormatter={(val) => `${Math.round(val)}%`}
            fillColor="#14b8a6"
            glowColor="rgba(20, 184, 166, 0.3)"
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          {/* Quick Speed Jump Chips */}
          <div className="grid grid-cols-5 gap-2">
            {[0, 25, 50, 75, 100].map((pct) => {
              const isSelected = isOn && Math.abs(speed - pct) <= 3 && (pct > 0 || !isOn);
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleSpeedChange(pct)}
                  className={`h-11 rounded-2xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 flex items-center justify-center border ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 font-black shadow-md border-teal-400 ring-2 ring-teal-400/30'
                      : darkMode
                      ? 'bg-slate-800/50 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {pct === 0 ? 'Off' : `${pct}%`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OSCILLATION CONTROLS & SWEEP ANGLES */}
      {/* ========================================================================= */}
      {caps.supportsOscillation && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border space-y-3 ${
            darkMode
              ? 'bg-slate-800/40 border-white/10'
              : 'bg-white/70 border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowsHorizontal size={18} weight="duotone" className="text-teal-400" />
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Oscillation Sweep
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleOscillation}
              className={`h-10 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 border ${
                isOscillating
                  ? 'bg-teal-500 text-slate-950 font-black shadow-md border-teal-400 ring-2 ring-teal-400/30'
                  : darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {isOscillating ? 'Oscillation ON' : 'Fixed'}
            </button>
          </div>

          {/* Available Angles */}
          {caps.availableAngles.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Sweep Angle:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {caps.availableAngles.map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => handleSetAngle(angle)}
                    className={`h-9 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 border ${
                      activeAngle === angle
                        ? 'bg-teal-500 text-slate-950 font-black shadow-xs border-teal-400'
                        : darkMode
                        ? 'bg-slate-800/60 hover:bg-slate-800 border-white/10 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    }`}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRESET MODES */}
      {/* ========================================================================= */}
      {caps.supportsPresetModes && caps.presetModes.length > 0 && (
        <div className="space-y-2.5">
          <label
            className={`text-xs font-bold uppercase tracking-wider block px-1 ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Wind Preset Modes
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {caps.presetModes.map((pMode) => {
              const isSelected = activePreset?.toLowerCase() === pMode.toLowerCase();
              return (
                <button
                  key={pMode}
                  type="button"
                  onClick={() => handleSetPreset(pMode)}
                  className={`h-10 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 capitalize border ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 font-black shadow-md border-teal-400 ring-2 ring-teal-400/30'
                      : darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {pMode}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
