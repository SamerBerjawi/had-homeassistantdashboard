/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TouchCapsuleSlider Component
 * Ultra-modern, tactile capsule slider engineered for touch screens and desktop interaction.
 * Features smooth continuous scrubbing with PointerEvents, animated gradient fill,
 * integrated icon, label, live value readout, and dual light/dark glassmorphic design.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface TouchCapsuleSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  onCommit?: (val: number) => void;
  icon?: React.ReactNode;
  label?: string;
  valueFormatter?: (val: number) => string;
  fillColor?: string;
  fillGradient?: string;
  glowColor?: string;
  darkMode?: boolean;
  disabled?: boolean;
  className?: string;
  heightClass?: string;
}

export const TouchCapsuleSlider: React.FC<TouchCapsuleSliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onCommit,
  icon,
  label,
  valueFormatter = (val) => `${Math.round(val)}%`,
  fillColor = '#f59e0b',
  fillGradient,
  glowColor,
  darkMode = true,
  disabled = false,
  className = '',
  heightClass = 'h-13 sm:h-14'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalVal, setInternalVal] = useState(value);

  // Sync internal value when not actively scrubbing
  useEffect(() => {
    if (!isDragging) {
      setInternalVal(value);
    }
  }, [value, isDragging]);

  const clampedVal = Math.min(Math.max(internalVal, min), max);
  const percentage = Math.max(0, Math.min(100, ((clampedVal - min) / (max - min)) * 100));

  const calculateValueFromPointer = useCallback(
    (clientX: number): number => {
      const el = containerRef.current;
      if (!el) return min;
      const rect = el.getBoundingClientRect();
      const rawPct = (clientX - rect.left) / rect.width;
      const clampedPct = Math.max(0, Math.min(1, rawPct));
      const rawVal = min + clampedPct * (max - min);

      // Snap to step
      if (step > 0) {
        const stepped = Math.round(rawVal / step) * step;
        const precision = step.toString().split('.')[1]?.length || 0;
        return Number(Math.min(Math.max(stepped, min), max).toFixed(precision));
      }
      return Math.min(Math.max(rawVal, min), max);
    },
    [min, max, step]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    setIsDragging(true);
    const nextVal = calculateValueFromPointer(e.clientX);
    setInternalVal(nextVal);
    onChange(nextVal);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const nextVal = calculateValueFromPointer(e.clientX);
    setInternalVal(nextVal);
    onChange(nextVal);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const nextVal = calculateValueFromPointer(e.clientX);
    setInternalVal(nextVal);
    onChange(nextVal);
    if (onCommit) {
      onCommit(nextVal);
    }
  };

  const handlePointerCancel = () => {
    if (isDragging) {
      setIsDragging(false);
      if (onCommit) {
        onCommit(internalVal);
      }
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      delta = step;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      delta = -step;
    } else if (e.key === 'PageUp') {
      delta = step * 5;
    } else if (e.key === 'PageDown') {
      delta = -step * 5;
    } else if (e.key === 'Home') {
      onChange(min);
      if (onCommit) onCommit(min);
      return;
    } else if (e.key === 'End') {
      onChange(max);
      if (onCommit) onCommit(max);
      return;
    }

    if (delta !== 0) {
      e.preventDefault();
      const nextVal = Math.min(Math.max(clampedVal + delta, min), max);
      setInternalVal(nextVal);
      onChange(nextVal);
      if (onCommit) onCommit(nextVal);
    }
  };

  const activeBackgroundStyle: React.CSSProperties = {
    width: `${percentage}%`,
    ...(fillGradient
      ? { backgroundImage: fillGradient }
      : { backgroundColor: fillColor })
  };

  const glowStyle: React.CSSProperties = glowColor
    ? { boxShadow: `0 0 16px ${glowColor}` }
    : {};

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-valuenow={clampedVal}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      className={`group relative w-full ${heightClass} rounded-2xl sm:rounded-3xl select-none overflow-hidden touch-none transition-all duration-150 isolate border ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-white/5 border-transparent'
          : isDragging
          ? 'cursor-grabbing scale-[1.01] shadow-lg ring-2 ring-white/20'
          : 'cursor-grab hover:scale-[1.005] active:scale-[0.995]'
      } ${
        darkMode
          ? 'bg-slate-800/80 hover:bg-slate-800/95 border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]'
          : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]'
      } ${className}`}
    >
      {/* Active Fill Track */}
      <div
        style={{ ...activeBackgroundStyle, ...glowStyle }}
        className={`absolute top-0 bottom-0 left-0 rounded-2xl sm:rounded-3xl transition-[width] duration-75 ease-out ${
          isDragging ? 'opacity-100' : 'opacity-95'
        }`}
      />

      {/* Leading Edge Pip / Line */}
      {percentage > 0 && percentage < 100 && (
        <div
          style={{ left: `${percentage}%` }}
          className="absolute top-2 bottom-2 w-1 -ml-0.5 rounded-full bg-white/70 shadow-sm pointer-events-none transition-[left] duration-75"
        />
      )}

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full flex items-center justify-between px-4 pointer-events-none">
        {/* Left: Icon and Optional Label */}
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div
              className={`shrink-0 flex items-center justify-center transition-transform ${
                isDragging ? 'scale-110' : ''
              } ${
                percentage > 25
                  ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                  : darkMode
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            >
              {icon}
            </div>
          )}
          {label && (
            <span
              className={`text-xs sm:text-sm font-bold truncate tracking-tight transition-colors ${
                percentage > 40
                  ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                  : darkMode
                  ? 'text-slate-200'
                  : 'text-slate-800'
              }`}
            >
              {label}
            </span>
          )}
        </div>

        {/* Right: Value Readout */}
        <div className="shrink-0 flex items-center">
          <span
            className={`font-mono text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
              percentage > 70
                ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                : darkMode
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            {valueFormatter(clampedVal)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TouchCapsuleSlider;
