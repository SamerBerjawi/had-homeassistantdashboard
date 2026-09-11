/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FanControlView:
 * Ultra-refined air-circulator interface styled with Apple Health / BentoCard aesthetics:
 * - Clean frosted glassmorphism: backdrop-blur-xl bg-white/20 dark:bg-black/20 with subtle border strokes.
 * - Zero artificial glow effects / neon smudges: calm, crisp, premium elegance.
 * - Bold typographic hierarchy matching HealthMetricCard (font-black numbers, uppercase tracking-wider labels).
 * - Health-style squircle icon containers with soft color tint & border.
 * - Fluid Airflow Wave Slider with clean SVG laminar streamline track.
 * - Connected dual-capsule precision steppers ([-] and [+]).
 * - Bento action deck (Oscillation, Mode/Preset, Direction, Room Sensor) - redundant power button removed.
 * - Genuine Home Assistant entity telemetry only.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Fan,
  Power,
  Wind,
  ArrowsHorizontal,
  ArrowsClockwise,
  Sparkle,
  Moon,
  Lightning,
  Plus,
  Minus,
  ThermometerSimple,
  Compass,
  ArrowDown,
  ArrowUp
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import {
  detectFanCapabilities,
  FanCapabilities
} from '../../../services/fanClassification';

interface FanControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
}

// Preset mode icon resolver
const getPresetIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('sleep') || n.includes('night')) return Moon;
  if (n.includes('nature') || n.includes('breeze') || n.includes('natural')) return Wind;
  if (n.includes('turbo') || n.includes('boost') || n.includes('strong')) return Lightning;
  if (n.includes('smart') || n.includes('auto') || n.includes('eco')) return Sparkle;
  return Fan;
};

export default function FanControlView({ entity, darkMode = true }: FanControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: FanCapabilities = useMemo(() => {
    return detectFanCapabilities(entity as any);
  }, [entity]);

  const [speed, setSpeed] = useState<number>(caps.percentage);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOscillating, setIsOscillating] = useState<boolean>(caps.isOscillating);
  const [activeAngle, setActiveAngle] = useState<number | undefined>(caps.currentAngle);
  const [activePreset, setActivePreset] = useState<string | undefined>(caps.currentPresetMode);
  const [showAngleSelector, setShowAngleSelector] = useState<boolean>(false);
  const [showPresetSelector, setShowPresetSelector] = useState<boolean>(false);

  // Sync internal state with HA updates when not dragging
  useEffect(() => {
    if (!isDragging) {
      setSpeed(caps.percentage);
    }
    setIsOscillating(caps.isOscillating);
    setActiveAngle(caps.currentAngle);
    setActivePreset(caps.currentPresetMode);
  }, [caps, isDragging]);

  const isOn = caps.isOn;
  const currentDir = caps.currentDirection || 'forward';

  // Toggle Fan Master Power (Header switch)
  const handleTogglePower = () => {
    const nextState = isOn ? 'off' : 'on';
    const nextPct = nextState === 'on' ? (speed > 0 ? speed : 50) : 0;
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      percentage: nextPct
    });
    callHAService(
      'fan',
      nextState === 'on' ? 'turn_on' : 'turn_off',
      nextState === 'on' ? { percentage: nextPct } : {},
      { entity_id: entity.entity_id }
    );
  };

  // Commit Speed to Home Assistant
  const commitSpeed = (newPct: number) => {
    const safePct = Math.max(0, Math.min(100, Math.round(newPct)));
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

  // Step Speed by Delta
  const handleStep = (delta: number) => {
    const next = Math.max(0, Math.min(100, speed + delta));
    commitSpeed(next);
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
    setShowAngleSelector(false);
  };

  // Set Preset Mode
  const handleSetPreset = (preset: string) => {
    setActivePreset(preset);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      preset_mode: preset
    });
    callHAService('fan', 'set_preset_mode', { preset_mode: preset }, { entity_id: entity.entity_id });
    setShowPresetSelector(false);
  };

  // Toggle Ceiling Fan Direction
  const handleToggleDirection = () => {
    const nextDir = currentDir === 'reverse' ? 'forward' : 'reverse';
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      direction: nextDir
    });
    callHAService('fan', 'set_direction', { direction: nextDir }, { entity_id: entity.entity_id });
  };

  // Dynamic animation speeds based on speed percentage
  const flowAnimDuration = isOn && speed > 0 ? Math.max(0.6, 2.8 - (speed / 100) * 2.0) : 0;

  // Genuine Speed Level Calculation (e.g. Level 3 of 4)
  const speedLevelInfo = useMemo(() => {
    if (!isOn || speed === 0) return null;
    const step = caps.percentageStep > 1 ? caps.percentageStep : 25;
    const currentLvl = Math.max(1, Math.round(speed / step));
    const totalLvls = Math.round(100 / step);
    return { current: currentLvl, total: totalLvls };
  }, [isOn, speed, caps.percentageStep]);

  // Refined Status Subtitle
  const statusSubtitle = useMemo(() => {
    if (!isOn || speed === 0) return 'Standby • Off';
    const parts: string[] = [];
    if (activePreset) {
      parts.push(activePreset.charAt(0).toUpperCase() + activePreset.slice(1));
    }
    if (speedLevelInfo) {
      parts.push(`Speed ${speedLevelInfo.current}/${speedLevelInfo.total}`);
    } else {
      parts.push(`${speed}% Flow`);
    }
    if (isOscillating) {
      parts.push(activeAngle ? `${activeAngle}° Sweep` : 'Oscillating');
    }
    return parts.join(' • ');
  }, [isOn, speed, activePreset, speedLevelInfo, isOscillating, activeAngle]);

  // ============================================================================
  // FLUID AIRFLOW WAVE SLIDER CONTROLLER
  // ============================================================================
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const calculatePctFromPointer = useCallback((clientX: number) => {
    if (!sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(fraction * 100);
  }, []);

  const onSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const newPct = calculatePctFromPointer(e.clientX);
    setSpeed(newPct);
  };

  const onSliderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const newPct = calculatePctFromPointer(e.clientX);
      setSpeed(newPct);
    }
  };

  const onSliderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const newPct = calculatePctFromPointer(e.clientX);
      commitSpeed(newPct);
    }
  };

  const effectivePct = isOn ? speed : 0;
  const ActivePresetIcon = activePreset ? getPresetIcon(activePreset) : Wind;

  // Shared Bento card style from Crystal Design System
  const bentoCardStyle = darkMode
    ? 'bg-white/[0.025] border border-white/5 text-white shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
    : 'bg-white/45 border border-black/5 text-slate-900 shadow-xs backdrop-blur-md';

  // Dynamic capability cards count for layout grid
  const hasOscillation = caps.supportsOscillation;
  const hasPresets = caps.supportsPresetModes && caps.presetModes.length > 0;
  const hasDirection = caps.supportsDirection;
  const hasAngle = caps.supportsOscillationAngle && caps.availableAngles.length > 0 && !hasDirection;
  const hasTemp = caps.supportsTemperature && caps.currentTemperature !== undefined;

  const activeCardsCount = [hasOscillation, hasPresets, hasDirection || hasAngle, hasTemp].filter(Boolean).length;

  return (
    <div className="space-y-4 select-none">
      {/* Clean keyframe animations for fluid wave streamlines */}
      <style>{`
        @keyframes healthLaminarFlow1 {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes healthLaminarFlow2 {
          0% { stroke-dashoffset: 160; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW (Health Section Header Pattern)                         */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl backdrop-blur-xl flex items-center justify-between transition-all ${bentoCardStyle}`}>
        <div className="flex items-center gap-3">
          {/* Health-style icon container */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: isOn ? 'rgba(6, 182, 212, 0.15)' : 'rgba(100, 116, 139, 0.12)',
              borderColor: isOn ? 'rgba(6, 182, 212, 0.35)' : 'rgba(100, 116, 139, 0.25)',
              color: isOn ? '#06b6d4' : '#94a3b8'
            }}
          >
            <Wind size={18} weight="duotone" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || 'CLIMATE & AIR'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              {entity.attributes.friendly_name || 'Air Circulator'}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Master Power Button */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isOn
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-cyan-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isOn ? 'Active' : 'Standby'}</span>
          </div>

          <button
            type="button"
            onClick={handleTogglePower}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
              isOn
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs'
                : darkMode
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-xs'
            }`}
            aria-label={isOn ? 'Turn Fan Off' : 'Turn Fan On'}
          >
            <Power size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO DISPLAY: BENTO VALUE & STEPPERS (Health Metric Card Typography)   */}
      {/* ========================================================================= */}
      <div
        className={`p-6 sm:p-7 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all ${bentoCardStyle}`}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Target Speed
        </span>

        {/* Large Metric Number & Unit */}
        <div className="flex items-baseline justify-center gap-1 my-1">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
            {isOn ? speed : 0}
          </span>
          <span className="text-xl font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            %
          </span>
        </div>

        {/* Genuine Status Subtitle */}
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          {statusSubtitle}
        </p>

        {/* Connected Precision Stepper Pill */}
        <div
          className={`inline-flex items-center rounded-2xl border p-1 mt-4 backdrop-blur-md transition-all ${
            darkMode ? 'bg-black/40 border-white/10' : 'bg-white/80 border-slate-200 shadow-xs'
          }`}
        >
          <button
            type="button"
            onClick={() => handleStep(-5)}
            disabled={!isOn || speed <= 0}
            aria-label="Decrease fan speed"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              darkMode
                ? 'hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'
                : 'hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <Minus size={16} weight="bold" />
          </button>

          <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-2" />

          <span className="w-12 text-center font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">
            {isOn ? `${speed}%` : 'OFF'}
          </span>

          <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-2" />

          <button
            type="button"
            onClick={() => handleStep(5)}
            disabled={!isOn || speed >= 100}
            aria-label="Increase fan speed"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              darkMode
                ? 'hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'
                : 'hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FLUID AIRFLOW WAVE SLIDER (Bento Frosted Channel)                      */}
      {/* ========================================================================= */}
      {caps.supportsSpeed && (
        <div className="space-y-2.5">
          {/* Interactive Wave Slider Container */}
          <div
            ref={sliderRef}
            onPointerDown={onSliderPointerDown}
            onPointerMove={onSliderPointerMove}
            onPointerUp={onSliderPointerUp}
            className={`w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-between px-4 cursor-pointer touch-none relative overflow-hidden backdrop-blur-xl transition-all ${bentoCardStyle}`}
          >
            {/* Active Airflow Channel Fill */}
            <div
              className="absolute top-0 bottom-0 left-0 transition-all duration-75 overflow-hidden flex items-center pointer-events-none"
              style={{ width: `${effectivePct}%` }}
            >
              <div className="absolute inset-0 bg-cyan-500/15 dark:bg-cyan-500/20" />
            </div>

            {/* Left Minimalist Wind Icon */}
            <div className="shrink-0 mr-3 text-cyan-600 dark:text-cyan-400 pointer-events-none relative z-10">
              <Wind size={20} weight="bold" />
            </div>

            {/* Clean SVG Laminar Wave Track */}
            <div className="flex-1 h-full relative overflow-hidden pointer-events-none flex items-center">
              <svg
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 400 60"
              >
                <defs>
                  <linearGradient id="healthWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity={isOn ? 0.8 : 0.15} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={isOn ? 0.9 : 0.2} />
                  </linearGradient>
                  <linearGradient id="healthWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1" />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity={isOn ? 0.6 : 0.1} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={isOn ? 0.8 : 0.15} />
                  </linearGradient>
                </defs>

                {/* Primary Streamline */}
                <path
                  d="M 0 30 Q 50 16, 100 30 T 200 30 T 300 30 T 400 30"
                  fill="none"
                  stroke="url(#healthWaveGrad1)"
                  strokeWidth={isOn ? 2.5 : 1}
                  strokeDasharray="24 12"
                  style={
                    isOn && flowAnimDuration > 0
                      ? { animation: `healthLaminarFlow1 ${flowAnimDuration}s linear infinite` }
                      : undefined
                  }
                />

                {/* Harmonic Streamline */}
                <path
                  d="M 0 30 Q 50 44, 100 30 T 200 30 T 300 30 T 400 30"
                  fill="none"
                  stroke="url(#healthWaveGrad2)"
                  strokeWidth={isOn ? 2 : 1}
                  strokeDasharray="32 16"
                  style={
                    isOn && flowAnimDuration > 0
                      ? { animation: `healthLaminarFlow2 ${flowAnimDuration * 0.85}s linear infinite` }
                      : undefined
                  }
                />
              </svg>
            </div>

            {/* Right Numeric Readout */}
            <div className="shrink-0 ml-3 font-mono text-xs font-black text-cyan-600 dark:text-cyan-400 pointer-events-none relative z-10">
              {isOn ? `${speed}%` : '0%'}
            </div>

            {/* Vertical Divider Cursor */}
            {isOn && (
              <div
                className="absolute top-1.5 bottom-1.5 -translate-x-1/2 w-1 rounded-full pointer-events-none bg-cyan-500 transition-transform"
                style={{ left: `${effectivePct}%` }}
              />
            )}
          </div>

          {/* 5 Quick Velocity Step Stops (Health-style Segmented Chips) */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'Off', pct: 0 },
              { label: '25%', pct: 25 },
              { label: '50%', pct: 50 },
              { label: '75%', pct: 75 },
              { label: 'Max', pct: 100 }
            ].map((st) => {
              const isSelected = (st.pct === 0 && !isOn) || (isOn && Math.abs(speed - st.pct) <= 12 && st.pct > 0);
              return (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => commitSpeed(st.pct)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 border text-center ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black border-cyan-500/40 shadow-xs'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 text-slate-400 hover:text-white border-white/5'
                      : 'bg-white/40 hover:bg-white/60 text-slate-600 hover:text-slate-900 border-slate-200/50 shadow-xs'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ACTION DECK (Only genuine supported cards; redundant Power removed)   */}
      {/* ========================================================================= */}
      {activeCardsCount > 0 && (
        <div
          className={`grid gap-2.5 ${
            activeCardsCount === 1
              ? 'grid-cols-1'
              : activeCardsCount === 2
              ? 'grid-cols-2'
              : activeCardsCount === 3
              ? 'grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {/* Tile 1: Oscillation */}
          {hasOscillation && (
            <button
              type="button"
              onClick={handleToggleOscillation}
              className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${bentoCardStyle} ${
                isOscillating
                  ? 'border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/15'
                  : ''
              }`}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
                style={{
                  backgroundColor: isOscillating ? 'rgba(6, 182, 212, 0.18)' : 'rgba(100, 116, 139, 0.12)',
                  borderColor: isOscillating ? 'rgba(6, 182, 212, 0.35)' : 'rgba(100, 116, 139, 0.25)',
                  color: isOscillating ? '#06b6d4' : '#94a3b8'
                }}
              >
                <ArrowsHorizontal size={16} weight="duotone" className={isOscillating ? 'animate-pulse' : ''} />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full">
                Oscillate
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isOscillating ? (activeAngle ? `${activeAngle}°` : 'Active') : 'Off'}
              </span>
            </button>
          )}

          {/* Tile 2: Mode / Preset Profile */}
          {hasPresets && (
            <button
              type="button"
              onClick={() => setShowPresetSelector(!showPresetSelector)}
              className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${bentoCardStyle} ${
                showPresetSelector || activePreset
                  ? 'border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/15'
                  : ''
              }`}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
                style={{
                  backgroundColor: activePreset ? 'rgba(6, 182, 212, 0.18)' : 'rgba(100, 116, 139, 0.12)',
                  borderColor: activePreset ? 'rgba(6, 182, 212, 0.35)' : 'rgba(100, 116, 139, 0.25)',
                  color: activePreset ? '#06b6d4' : '#94a3b8'
                }}
              >
                <ActivePresetIcon size={16} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full">
                Mode
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate max-w-full capitalize">
                {activePreset || 'Normal'}
              </span>
            </button>
          )}

          {/* Tile 3: Direction (Ceiling Fan) */}
          {hasDirection && (
            <button
              type="button"
              onClick={handleToggleDirection}
              className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${bentoCardStyle}`}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
                style={{
                  backgroundColor: currentDir === 'forward' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                  borderColor: currentDir === 'forward' ? 'rgba(6, 182, 212, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                  color: currentDir === 'forward' ? '#06b6d4' : '#f59e0b'
                }}
              >
                {currentDir === 'forward' ? (
                  <ArrowDown size={16} weight="bold" />
                ) : (
                  <ArrowUp size={16} weight="bold" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full">
                Direction
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 capitalize">
                {currentDir === 'forward' ? 'Down' : 'Up'}
              </span>
            </button>
          )}

          {/* Tile 4: Oscillation Angle (if angle supported without direction) */}
          {hasAngle && (
            <button
              type="button"
              onClick={() => setShowAngleSelector(!showAngleSelector)}
              className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${bentoCardStyle} ${
                showAngleSelector ? 'border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/15' : ''
              }`}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.18)',
                  borderColor: 'rgba(6, 182, 212, 0.35)',
                  color: '#06b6d4'
                }}
              >
                <Compass size={16} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full">
                Angle
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {activeAngle ? `${activeAngle}°` : 'Default'}
              </span>
            </button>
          )}

          {/* Tile 5: Real Ambient Temperature */}
          {hasTemp && (
            <div className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center ${bentoCardStyle}`}>
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.18)',
                  borderColor: 'rgba(6, 182, 212, 0.35)',
                  color: '#06b6d4'
                }}
              >
                <ThermometerSimple size={16} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full">
                Room Temp
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {caps.currentTemperature}{caps.temperatureUnit || '°C'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INLINE PRESET SELECTOR (Health-style Bento Card)                       */}
      {/* ========================================================================= */}
      {showPresetSelector && caps.supportsPresetModes && caps.presetModes.length > 0 && (
        <div className={`p-4 rounded-3xl backdrop-blur-xl space-y-3 transition-all animate-in fade-in zoom-in-95 duration-200 ${bentoCardStyle}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Airflow Profiles
            </span>
            <button
              type="button"
              onClick={() => setShowPresetSelector(false)}
              className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {caps.presetModes.map((pMode) => {
              const isSelected = activePreset?.toLowerCase() === pMode.toLowerCase();
              const IconComp = getPresetIcon(pMode);

              return (
                <button
                  key={pMode}
                  type="button"
                  onClick={() => handleSetPreset(pMode)}
                  className={`p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center justify-center gap-1.5 active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black border-cyan-500/40'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300 hover:text-white'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700'
                  }`}
                >
                  <IconComp size={16} weight={isSelected ? 'fill' : 'duotone'} />
                  <span>{pMode}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. INLINE OSCILLATION ANGLE SELECTOR (Health-style Bento Card)            */}
      {/* ========================================================================= */}
      {showAngleSelector && caps.supportsOscillationAngle && caps.availableAngles.length > 0 && (
        <div className={`p-4 rounded-3xl backdrop-blur-xl space-y-3 transition-all animate-in fade-in zoom-in-95 duration-200 ${bentoCardStyle}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Oscillation Sweep Angle
            </span>
            <button
              type="button"
              onClick={() => setShowAngleSelector(false)}
              className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex items-center gap-2">
            {caps.availableAngles.map((angle) => {
              const isSelected = activeAngle === angle;
              return (
                <button
                  key={angle}
                  type="button"
                  onClick={() => handleSetAngle(angle)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 border text-center ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black border-cyan-500/40'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700'
                  }`}
                >
                  {angle}°
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
