/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClimateControlView:
 * Ultra-modern, tactile climate control interface styled with Apple Health / BentoCard aesthetics:
 * - Clean frosted glassmorphism: backdrop-blur-xl bg-white/20 dark:bg-black/20 with subtle border strokes.
 * - Zero artificial glow effects / neon smudges: calm, crisp, premium elegance.
 * - Bold typographic hierarchy matching HealthMetricCard (font-black numbers, uppercase tracking-wider labels).
 * - Health-style squircle icon containers with soft color tint & border.
 * - Dynamic capability-strict mode bar: only shows modes supported by this HA entity.
 * - Precision circular arc thermostat dial with constellation ticks and connected stepper ([-] and [+]).
 * - Bento telemetry cards (Outside, Power, Inside).
 * - Airflow / fan speed bar & presets strictly rendered only when available.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Flame,
  Snowflake,
  Sparkle,
  Fan,
  Drop,
  Power,
  ThermometerSimple,
  Sun,
  CloudSun,
  Wind,
  Plus,
  Minus
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import {
  detectClimateCapabilities,
  ClimateCapabilities
} from '../../../services/climateClassification';

interface ClimateControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
}

// Mode display definitions
interface ModeDefinition {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  activeColor: string;
  gradientStart: string;
  gradientEnd: string;
}

const MODE_DEFINITIONS: Record<string, ModeDefinition> = {
  heat: {
    id: 'heat',
    label: 'Heating',
    icon: Sun,
    activeColor: '#f97316',
    gradientStart: '#f97316',
    gradientEnd: '#ef4444'
  },
  cool: {
    id: 'cool',
    label: 'Cooling',
    icon: Snowflake,
    activeColor: '#0284c7',
    gradientStart: '#0284c7',
    gradientEnd: '#06b6d4'
  },
  dry: {
    id: 'dry',
    label: 'Dry',
    icon: Drop,
    activeColor: '#d97706',
    gradientStart: '#d97706',
    gradientEnd: '#f59e0b'
  },
  fan_only: {
    id: 'fan_only',
    label: 'Airwave',
    icon: Wind,
    activeColor: '#0d9488',
    gradientStart: '#0d9488',
    gradientEnd: '#14b8a6'
  },
  auto: {
    id: 'auto',
    label: 'Auto',
    icon: Sparkle,
    activeColor: '#10b981',
    gradientStart: '#10b981',
    gradientEnd: '#059669'
  },
  heat_cool: {
    id: 'heat_cool',
    label: 'Auto',
    icon: Sparkle,
    activeColor: '#10b981',
    gradientStart: '#10b981',
    gradientEnd: '#059669'
  },
  off: {
    id: 'off',
    label: 'Off',
    icon: Power,
    activeColor: '#64748b',
    gradientStart: '#64748b',
    gradientEnd: '#475569'
  }
};

export default function ClimateControlView({ entity, darkMode = true }: ClimateControlViewProps) {
  const { callHAService, updateEntityState, states } = useAutoLayoutStore();

  const caps: ClimateCapabilities = useMemo(() => {
    return detectClimateCapabilities(entity);
  }, [entity]);

  // Target temperature state
  const [targetTemp, setTargetTemp] = useState<number>(caps.targetTemp ?? 21.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Sync internal state when entity updates from HA (unless user is currently dragging)
  useEffect(() => {
    if (!isDragging && caps.targetTemp !== undefined) {
      setTargetTemp(caps.targetTemp);
    }
  }, [caps.targetTemp, isDragging]);

  // Resolve outside temperature from HA Weather entities
  const outsideTemp = useMemo(() => {
    const weatherEntity = Object.values(states).find((e) =>
      e.entity_id.startsWith('weather.')
    );
    if (weatherEntity && typeof weatherEntity.attributes.temperature === 'number') {
      return weatherEntity.attributes.temperature;
    }
    const outdoorSensor = Object.values(states).find(
      (e) =>
        e.entity_id.startsWith('sensor.') &&
        (e.entity_id.includes('outdoor') || e.entity_id.includes('outside')) &&
        (e.attributes.device_class === 'temperature' || e.entity_id.includes('temperature'))
    );
    if (outdoorSensor && !isNaN(Number(outdoorSensor.state))) {
      return Number(outdoorSensor.state);
    }
    return undefined;
  }, [states]);

  // Capability-strict HVAC modes
  const rawModes = entity.attributes.hvac_modes || ['off', 'heat', 'cool'];
  const modeOrder = ['heat', 'dry', 'cool', 'fan_only', 'auto', 'heat_cool', 'off'];
  const availableModes = useMemo(() => {
    return modeOrder.filter((m) => rawModes.includes(m));
  }, [rawModes]);

  // Capability-strict Fan Modes
  const rawFanModes = entity.attributes.fan_modes || [];
  const availableFanModes = useMemo(() => {
    return Array.isArray(rawFanModes) ? rawFanModes : [];
  }, [rawFanModes]);

  // Capability-strict Preset Modes
  const rawPresetModes = entity.attributes.preset_modes || [];
  const availablePresetModes = useMemo(() => {
    return Array.isArray(rawPresetModes) ? rawPresetModes : [];
  }, [rawPresetModes]);

  const hvacMode = entity.state || 'off';
  const isOff = hvacMode === 'off';
  const activeModeKey = isOff ? 'off' : hvacMode;
  const currentModeDef: ModeDefinition =
    MODE_DEFINITIONS[activeModeKey] || MODE_DEFINITIONS.heat;

  // Temperature boundary parameters
  const minTemp = caps.minTemp ?? 16;
  const maxTemp = caps.maxTemp ?? 30;
  const step = caps.targetTempStep ?? 0.5;

  // Stepper handlers
  const handleStepTemp = (delta: number) => {
    const nextVal = Math.max(minTemp, Math.min(maxTemp, Math.round((targetTemp + delta) * 10) / 10));
    setTargetTemp(nextVal);
    commitTemperature(nextVal);
  };

  const commitTemperature = (newVal: number) => {
    const modeToSend = isOff ? (availableModes.find((m) => m !== 'off') || 'heat') : hvacMode;
    updateEntityState(entity.entity_id, modeToSend, {
      ...entity.attributes,
      temperature: newVal
    });
    callHAService('climate', 'set_temperature', { temperature: newVal }, { entity_id: entity.entity_id });
  };

  // HVAC Mode change handler
  const handleSelectMode = (mode: string) => {
    updateEntityState(entity.entity_id, mode, {
      ...entity.attributes,
      hvac_mode: mode
    });
    callHAService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: entity.entity_id });
  };

  // Power Toggle handler (Toggles between Off and first active mode)
  const handleTogglePower = () => {
    if (isOff) {
      const targetMode = availableModes.find((m) => m !== 'off') || 'heat';
      handleSelectMode(targetMode);
    } else {
      handleSelectMode('off');
    }
  };

  // Fan Mode change handler
  const handleSelectFanMode = (fanMode: string) => {
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      fan_mode: fanMode
    });
    callHAService('climate', 'set_fan_mode', { fan_mode: fanMode }, { entity_id: entity.entity_id });
  };

  // Preset Mode change handler
  const handleSelectPreset = (preset: string) => {
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      preset_mode: preset
    });
    callHAService('climate', 'set_preset_mode', { preset_mode: preset }, { entity_id: entity.entity_id });
  };

  // ============================================================================
  // CIRCULAR ARC THERMOSTAT GAUGE GEOMETRY & INTERACTION
  // ============================================================================
  const svgRef = useRef<SVGSVGElement | null>(null);

  const cx = 160;
  const cy = 160;
  const radius = 112;
  const startAngle = 235; // Bottom left (near 7:30 o'clock)
  const endAngle = 485;   // Bottom right (near 4:30 o'clock)
  const totalSweep = endAngle - startAngle;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, startA);
    const end = polarToCartesian(x, y, r, endA);
    const sweep = endA - startA;
    const largeArcFlag = sweep > 180 ? '1' : '0';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 1, end.x, end.y].join(' ');
  };

  const tempToAngle = useCallback(
    (temp: number) => {
      const fraction = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
      return startAngle + fraction * totalSweep;
    },
    [minTemp, maxTemp, startAngle, totalSweep]
  );

  const angleToTemp = useCallback(
    (angleDeg: number) => {
      let normalized = angleDeg - startAngle;
      while (normalized < 0) normalized += 360;
      while (normalized > 360) normalized -= 360;
      const fraction = Math.max(0, Math.min(1, normalized / totalSweep));
      const rawTemp = minTemp + fraction * (maxTemp - minTemp);
      return Math.round(rawTemp * 2) / 2;
    },
    [minTemp, maxTemp, startAngle, totalSweep]
  );

  const currentNeedleAngle = tempToAngle(targetTemp);
  const needlePos = polarToCartesian(cx, cy, radius, currentNeedleAngle);

  const handlePointerScrub = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - (rect.left + rect.width / 2);
      const y = clientY - (rect.top + rect.height / 2);

      let rad = Math.atan2(y, x);
      let deg = (rad * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;

      let gaugeDeg = deg;
      if (gaugeDeg < 180) {
        gaugeDeg += 360;
      }

      if (gaugeDeg < startAngle) gaugeDeg = startAngle;
      if (gaugeDeg > endAngle) gaugeDeg = endAngle;

      const newTemp = angleToTemp(gaugeDeg);
      setTargetTemp(newTemp);
    },
    [angleToTemp, startAngle, endAngle]
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handlePointerScrub(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      handlePointerScrub(e.clientX, e.clientY);
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      commitTemperature(targetTemp);
    }
  };

  // Outer Constellation Tick Marks
  const tickDots = useMemo(() => {
    const dots = [];
    const count = 36;
    for (let i = 0; i <= count; i++) {
      const angle = startAngle + (i / count) * totalSweep;
      const pos = polarToCartesian(cx, cy, radius + 22, angle);
      const isPassed = angle <= currentNeedleAngle;
      dots.push({ id: i, ...pos, isPassed });
    }
    return dots;
  }, [startAngle, totalSweep, currentNeedleAngle, cx, cy, radius]);

  // Exact Health page backdrop colors for outer containers and inner tiles
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/20 hover:bg-white/30 text-slate-900 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-slate-200/50 backdrop-blur-xl';

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HVAC MODE BAR: Health Page Segmented Control Bar                   */}
      {/* ========================================================================= */}
      {availableModes.length > 0 && (
        <div className="flex bg-white/20 dark:bg-black/20 p-1 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-xl">
          {availableModes.map((modeKey) => {
            const def = MODE_DEFINITIONS[modeKey] || {
              id: modeKey,
              label: modeKey.charAt(0).toUpperCase() + modeKey.slice(1),
              icon: Power,
              activeColor: '#64748b',
              gradientStart: '#64748b',
              gradientEnd: '#475569'
            };
            const isSelected = hvacMode === modeKey;
            const IconComp = def.icon;

            return (
              <button
                key={modeKey}
                type="button"
                onClick={() => handleSelectMode(modeKey)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 ${
                  isSelected
                    ? 'bg-white/40 dark:bg-white/10 text-slate-900 dark:text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <IconComp
                  size={15}
                  weight={isSelected ? 'fill' : 'duotone'}
                  style={{ color: isSelected ? def.activeColor : undefined }}
                />
                <span>{def.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MASTER CIRCULAR ARC THERMOSTAT DIAL (Crystal BentoCard Aesthetics)     */}
      {/* ========================================================================= */}
      <div
        className={`p-6 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden transition-all ${bentoCardStyle}`}
      >
        {/* SVG Arc Gauge */}
        <div className="relative w-68 h-68 sm:w-76 sm:h-76 flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox="0 0 320 320"
            className="w-full h-full cursor-pointer touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <defs>
              {/* Dynamic Linear Gradient for active arc fill */}
              <linearGradient id="climateArcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={currentModeDef.gradientStart} />
                <stop offset="100%" stopColor={currentModeDef.gradientEnd} />
              </linearGradient>
            </defs>

            {/* Outer Constellation Tick Dots */}
            {tickDots.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={dot.isPassed && !isOff ? 2.5 : 1.75}
                fill={
                  dot.isPassed && !isOff
                    ? currentModeDef.activeColor
                    : darkMode
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(0,0,0,0.12)'
                }
                className="transition-all duration-150"
              />
            ))}

            {/* Background Muted Track Arc */}
            <path
              d={describeArc(cx, cy, radius, startAngle, endAngle)}
              fill="none"
              stroke={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
              strokeWidth={14}
              strokeLinecap="round"
            />

            {/* Active Colored Arc */}
            {!isOff && (
              <path
                d={describeArc(
                  cx,
                  cy,
                  radius,
                  startAngle,
                  Math.max(startAngle + 0.1, currentNeedleAngle)
                )}
                fill="none"
                stroke="url(#climateArcGradient)"
                strokeWidth={14}
                strokeLinecap="round"
              />
            )}

            {/* Rotating Needle Thumb Knob */}
            {!isOff && (
              <circle
                cx={needlePos.x}
                cy={needlePos.y}
                r={12}
                fill="#ffffff"
                stroke={currentModeDef.activeColor}
                strokeWidth={4}
                className="transition-transform duration-75 cursor-grab active:cursor-grabbing shadow-sm"
              />
            )}
          </svg>

          {/* Center Digital Readout & Connected Steppers */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              {!isOff ? currentModeDef.label : 'Thermostat Off'}
            </span>

            {/* Big Temperature Display */}
            <div className="flex items-start justify-center leading-none my-1">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                {!isOff ? targetTemp.toFixed(step === 0.5 ? 1 : 0) : '--'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500 ml-1">
                {caps.unit || '°'}
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
              {caps.currentTemp !== undefined ? `Current ${caps.currentTemp}°` : ''}
            </span>

            {/* Connected Precision Stepper Pill */}
            <div
              className={`inline-flex items-center rounded-2xl border p-1 pointer-events-auto backdrop-blur-md transition-all ${
                darkMode ? 'bg-black/20 border-white/10' : 'bg-white/40 border-slate-200/60 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => handleStepTemp(-step)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                  darkMode
                    ? 'hover:bg-white/10 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Decrease setpoint"
              >
                <Minus size={16} weight="bold" />
              </button>

              <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-2" />

              <span className="w-10 text-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                {step === 0.5 ? '0.5°' : '1.0°'}
              </span>

              <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-2" />

              <button
                type="button"
                onClick={() => handleStepTemp(step)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                  darkMode
                    ? 'hover:bg-white/10 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Increase setpoint"
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Min and Max Range Indicators */}
          <div className="absolute bottom-2 inset-x-8 flex justify-between text-xs font-mono font-bold text-slate-400 pointer-events-none">
            <span>{minTemp}{caps.unit || '°'}</span>
            <span>{maxTemp}{caps.unit || '°'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TELEMETRY & POWER CAPSULE CARDS (Health BentoCard Aesthetics)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Card 1: Outside Temp (From HA Weather Entity) */}
        <div
          className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all ${bentoCardStyle}`}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              color: '#f59e0b'
            }}
          >
            <CloudSun size={16} weight="duotone" />
          </div>
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {outsideTemp !== undefined ? `${Math.round(outsideTemp)}°` : '--'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Outside
          </span>
        </div>

        {/* Card 2: Vertical Power Pill */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${bentoCardStyle} ${
            !isOff ? 'border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/15' : ''
          }`}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
            style={{
              backgroundColor: !isOff ? `${currentModeDef.activeColor}20` : 'rgba(100, 116, 139, 0.12)',
              borderColor: !isOff ? `${currentModeDef.activeColor}40` : 'rgba(100, 116, 139, 0.25)',
              color: !isOff ? currentModeDef.activeColor : '#94a3b8'
            }}
          >
            <Power size={16} weight="bold" />
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tight uppercase" style={{ color: !isOff ? currentModeDef.activeColor : undefined }}>
            {!isOff ? 'ON' : 'OFF'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Power
          </span>
        </button>

        {/* Card 3: Inside Room Temp */}
        <div
          className={`p-3.5 rounded-3xl backdrop-blur-xl flex flex-col items-center justify-center text-center transition-all ${bentoCardStyle}`}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 shrink-0 border"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              borderColor: 'rgba(6, 182, 212, 0.35)',
              color: '#06b6d4'
            }}
          >
            <ThermometerSimple size={16} weight="duotone" />
          </div>
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {caps.currentTemp !== undefined ? `${caps.currentTemp}°` : '--'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Inside
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. AIRFLOW / FAN CONTROLLER: STRICTLY ONLY IF SUPPORTED                   */}
      {/* ========================================================================= */}
      {availableFanModes.length > 0 && (
        <div
          className={`p-4 rounded-3xl backdrop-blur-xl space-y-2.5 transition-all ${bentoCardStyle}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  borderColor: 'rgba(6, 182, 212, 0.35)',
                  color: '#06b6d4'
                }}
              >
                <Wind size={16} weight="duotone" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Fan &amp; Airflow
              </span>
            </div>
            <span className="text-[11px] font-bold capitalize text-cyan-600 dark:text-cyan-400 font-mono">
              {caps.fanMode || 'Auto'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {availableFanModes.map((fm) => {
              const isSelected = caps.fanMode?.toLowerCase() === fm.toLowerCase();
              return (
                <button
                  key={fm}
                  type="button"
                  onClick={() => handleSelectFanMode(fm)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 capitalize border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black border-cyan-500/40'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700'
                  }`}
                >
                  {fm}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRESETS: STRICTLY ONLY IF SUPPORTED                                   */}
      {/* ========================================================================= */}
      {availablePresetModes.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
            Presets
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availablePresetModes.map((preset) => {
              const isSelected = caps.presetMode?.toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-black'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700'
                  }`}
                >
                  <Sparkle size={16} weight={isSelected ? 'fill' : 'duotone'} className="mb-1" />
                  <span className="text-xs truncate max-w-full">{preset}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auxiliary Humidity Badge */}
      {caps.currentHumidity !== undefined && (
        <div
          className={`p-3 rounded-2xl backdrop-blur-xl border flex items-center justify-between text-xs ${bentoCardStyle}`}
        >
          <div className="flex items-center gap-2">
            <Drop size={16} weight="duotone" className="text-cyan-500" />
            <span className="text-slate-600 dark:text-slate-300">Relative Humidity</span>
          </div>
          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{caps.currentHumidity}%</span>
        </div>
      )}
    </div>
  );
}
