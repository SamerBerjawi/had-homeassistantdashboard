import React, { useState, useEffect, useMemo } from 'react';
import {
  Fan,
  Power,
  ArrowsClockwise,
  Wind,
  ArrowsHorizontal,
  Compass,
  SlidersHorizontal,
  Moon,
  Sparkle
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectFanCapabilities,
  FanCapabilities
} from '../../../services/fanClassification';

interface FanControlViewProps {
  entity: HAEntity;
}

export default function FanControlView({ entity }: FanControlViewProps) {
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
    setSpeed(newPct);
    const nextState = newPct > 0 ? 'on' : 'off';
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      percentage: newPct
    });
    if (newPct > 0) {
      callHAService('fan', 'set_percentage', { percentage: newPct }, { entity_id: entity.entity_id });
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
    <div className="space-y-5">
      {/* 1. MASTER FAN HERO CARD WITH INTERACTIVE SPINNING BLADE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            isOn ? 'bg-teal-500/40' : 'bg-transparent'
          }`}
        />

        {/* Large Tactile Fan Button with Live Spinning Speed */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isOn
              ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-teal-500/25 ring-4 ring-teal-400/20'
              : 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
          title={isOn ? 'Turn Fan Off' : 'Turn Fan On'}
        >
          <Fan
            size={52}
            weight="duotone"
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
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {isOn ? `${speed}% Speed` : 'Fan Off'}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {isOn ? (
            <span>
              Airflow Active{isOscillating ? ' • Oscillating' : ''}
              {lastChangedStr ? ` • ${lastChangedStr}` : ''}
            </span>
          ) : (
            <span>Tap fan to activate cooling</span>
          )}
        </p>

        {/* Quick Power Toggle */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`mt-4 px-4 py-2 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-md ${
            isOn
              ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black'
              : 'bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10'
          }`}
        >
          <Power size={15} weight="bold" />
          <span>{isOn ? 'Power Off' : 'Power On'}</span>
        </button>
      </div>

      {/* 2. TACTILE SPEED SLIDER & PRESETS (Strictly if supportsSpeed) */}
      {caps.supportsSpeed && (
        <div className="space-y-3 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Wind size={15} weight="duotone" className="text-teal-400" />
              <span>Speed Level</span>
            </span>
            <span className="font-mono text-white">{isOn ? `${speed}%` : '0%'}</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step={caps.percentageStep || 1}
            value={isOn ? speed : 0}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />

          {/* Quick Speed Jump Chips */}
          <div className="flex justify-between gap-1">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleSpeedChange(pct)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                  isOn && speed === pct
                    ? 'bg-teal-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {pct === 0 ? 'Off' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. OSCILLATION CONTROLS & SWEEP ANGLES (Strictly if supportsOscillation) */}
      {caps.supportsOscillation && (
        <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowsHorizontal size={18} weight="duotone" className="text-teal-400" />
              <span className="text-xs font-bold text-slate-300">Oscillation Sweep</span>
            </div>

            <button
              type="button"
              onClick={handleToggleOscillation}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                isOscillating
                  ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10'
              }`}
            >
              {isOscillating ? 'Oscillating ON' : 'Fixed'}
            </button>
          </div>

          {/* Available Angles (e.g. DREO 30°, 60°, 90°, 120°) */}
          {caps.availableAngles.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Angle:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {caps.availableAngles.map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => handleSetAngle(angle)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                      activeAngle === angle
                        ? 'bg-teal-500 text-slate-950 font-extrabold shadow-xs'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
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

      {/* 4. PRESET MODES (Strictly if physical fan has preset modes) */}
      {caps.supportsPresetModes && caps.presetModes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Wind Preset Mode</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {caps.presetModes.map((pMode) => {
              const isSelected = activePreset?.toLowerCase() === pMode.toLowerCase();
              return (
                <button
                  key={pMode}
                  type="button"
                  onClick={() => handleSetPreset(pMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10 text-slate-300'
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
