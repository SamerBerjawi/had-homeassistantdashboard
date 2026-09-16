/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EntityTemperatureSlider Component
 * High-fidelity thermal range slider control designed specifically for thermostats & climate tiles.
 * Features an integrated thermal gradient track (cyan → teal → emerald → amber → rose),
 * current vs target temp indicators, tactile +/- stepper buttons, and smooth touch/pointer scrubbing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Plus, Thermometer } from '@phosphor-icons/react';

export interface EntityTemperatureSliderProps {
  targetTemp?: number;
  currentTemp?: number;
  minTemp?: number;
  maxTemp?: number;
  step?: number;
  hvacMode?: string;
  unit?: string;
  onTempChange: (val: number) => void;
  onTempAdjust: (delta: number) => void;
  disabled?: boolean;
  darkMode?: boolean;
  className?: string;
}

export const EntityTemperatureSlider: React.FC<EntityTemperatureSliderProps> = ({
  targetTemp,
  currentTemp,
  minTemp = 16,
  maxTemp = 30,
  step = 0.5,
  hvacMode = 'heat',
  unit = '°C',
  onTempChange,
  onTempAdjust,
  disabled = false,
  darkMode = true,
  className = ''
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalValue, setInternalValue] = useState<number>(targetTemp ?? minTemp);

  useEffect(() => {
    if (!isDragging && targetTemp !== undefined) {
      setInternalValue(targetTemp);
    }
  }, [targetTemp, isDragging]);

  const isOff = hvacMode === 'off';
  const effectiveDisabled = disabled || isOff || targetTemp === undefined;

  const safeMin = Number(minTemp);
  const safeMax = Number(maxTemp) > safeMin ? Number(maxTemp) : safeMin + 10;
  const clampedVal = Math.min(safeMax, Math.max(safeMin, internalValue));
  const progressRatio = (clampedVal - safeMin) / (safeMax - safeMin);
  const percentage = Math.max(0, Math.min(100, progressRatio * 100));

  // Current ambient temp marker ratio if available
  const currentRatio =
    currentTemp !== undefined
      ? Math.max(0, Math.min(1, (currentTemp - safeMin) / (safeMax - safeMin)))
      : null;

  // Temperature to color hue mapper
  const getTempColor = (val: number): string => {
    const ratio = Math.max(0, Math.min(1, (val - safeMin) / (safeMax - safeMin)));
    if (ratio < 0.25) return '#06b6d4'; // Cyan
    if (ratio < 0.45) return '#10b981'; // Emerald
    if (ratio < 0.7) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  const activeColor = isOff ? '#64748b' : getTempColor(clampedVal);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || effectiveDisabled) return;

      const rect = track.getBoundingClientRect();
      const rawPct = (clientX - rect.left) / rect.width;
      const clampedPct = Math.max(0, Math.min(1, rawPct));
      const rawVal = safeMin + clampedPct * (safeMax - safeMin);

      // Snap to step (0.5)
      const stepped = Math.round(rawVal / step) * step;
      const rounded = Number(stepped.toFixed(1));
      const finalVal = Math.min(safeMax, Math.max(safeMin, rounded));

      setInternalValue(finalVal);
      onTempChange(finalVal);
    },
    [effectiveDisabled, safeMin, safeMax, step, onTempChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (effectiveDisabled) return;
    e.stopPropagation();
    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Browser fallback
    }

    setIsDragging(true);
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || effectiveDisabled) return;
    e.stopPropagation();
    e.preventDefault();
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.preventDefault();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Browser fallback
    }

    setIsDragging(false);
    updateFromPointer(e.clientX);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Browser fallback
    }
    setIsDragging(false);
  };

  return (
    <div
      className={`w-full flex flex-col gap-2 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Target & Current Temperature Header Strip */}
      <div className="flex items-baseline justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Target
          </span>
          <span
            style={{ color: activeColor }}
            className="text-lg sm:text-xl font-black font-mono tracking-tight transition-colors duration-200"
          >
            {targetTemp !== undefined ? `${clampedVal}${unit}` : '--'}
          </span>
        </div>

        {currentTemp !== undefined && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Thermometer size={13} weight="duotone" className="shrink-0 text-slate-400" />
            <span>Current:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {currentTemp}{unit}
            </span>
          </div>
        )}
      </div>

      {/* Stepper Buttons & Thermal Range Gradient Track */}
      <div className="flex items-center gap-2 w-full">
        {/* Decrement Stepper Button (Cool Sky Blue Tint) */}
        <button
          type="button"
          disabled={effectiveDisabled || clampedVal <= safeMin}
          onClick={() => onTempAdjust(-step)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shrink-0 ${
            effectiveDisabled || clampedVal <= safeMin
              ? 'opacity-30 cursor-not-allowed bg-black/5 dark:bg-white/5 text-slate-400'
              : 'bg-sky-500/15 hover:bg-sky-500/25 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-600 dark:text-sky-300 shadow-xs'
          }`}
          title={`Decrease by ${step}${unit}`}
        >
          <Minus size={13} weight="bold" />
        </button>

        {/* Thermal Range Gradient Scrub Track - Border Free */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            boxShadow: isOff ? undefined : '0 0 12px rgba(6, 182, 212, 0.15), 0 0 16px rgba(244, 63, 94, 0.15), inset 0 1px 2px rgba(0,0,0,0.3)'
          }}
          className={`relative flex-1 h-3.5 sm:h-4 rounded-full cursor-pointer touch-none transition-all duration-200 p-0.5 overflow-hidden ${
            effectiveDisabled
              ? 'opacity-40 cursor-not-allowed bg-black/5 dark:bg-white/5'
              : darkMode
              ? 'bg-slate-950/70'
              : 'bg-slate-200/90'
          } ${isDragging ? 'ring-2 ring-amber-400/50' : ''}`}
        >
          {/* Subtle Ambient Multi-Color Thermal Gradient Underlay */}
          <div
            className="absolute inset-0 opacity-85 dark:opacity-75 rounded-full"
            style={{
              background: isOff
                ? 'none'
                : 'linear-gradient(90deg, #06b6d4 0%, #0284c7 20%, #10b981 45%, #eab308 65%, #f97316 85%, #f43f5e 100%)'
            }}
          />

          {/* Active fill clip */}
          <div
            style={{
              width: `${percentage}%`,
              transition: isDragging ? 'none' : 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end"
          >
            {/* Luminous Target Temp Marker Thumb */}
            {!isOff && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  boxShadow: `0 0 12px ${activeColor}, 0 0 4px #ffffff, 0 0 20px ${activeColor}66`
                }}
                className={`h-full w-2.5 rounded-full transform scale-y-115 shrink-0 transition-transform ${
                  isDragging ? 'scale-125' : ''
                }`}
              />
            )}
          </div>

          {/* Current Ambient Temp Pin (if within min-max bounds) */}
          {currentRatio !== null && !isOff && (
            <div
              style={{
                left: `${currentRatio * 100}%`,
                transform: 'translateX(-50%)'
              }}
              className="absolute inset-y-0.5 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] pointer-events-none z-10 opacity-90"
              title={`Current: ${currentTemp}${unit}`}
            />
          )}
        </div>

        {/* Increment Stepper Button (Warm Amber / Rose Tint) */}
        <button
          type="button"
          disabled={effectiveDisabled || clampedVal >= safeMax}
          onClick={() => onTempAdjust(step)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shrink-0 ${
            effectiveDisabled || clampedVal >= safeMax
              ? 'opacity-30 cursor-not-allowed bg-black/5 dark:bg-white/5 text-slate-400'
              : 'bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 shadow-xs'
          }`}
          title={`Increase by ${step}${unit}`}
        >
          <Plus size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
};

export default EntityTemperatureSlider;
