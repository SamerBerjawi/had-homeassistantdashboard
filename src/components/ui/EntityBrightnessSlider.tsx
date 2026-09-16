/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EntityBrightnessSlider Component
 * Ultra-modern, tactile continuous glass capsule brightness slider for light entity tiles.
 * Features full pointer/touch scrubbing with pointer capture, dynamic RGB color adaptation,
 * luminous leading edge glow, and live percentage readout.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface EntityBrightnessSliderProps {
  value: number; // 0 to 100
  onChange: (val: number) => void;
  onCommit?: (val: number) => void;
  color?: string; // Optional custom RGB/hex color from light attributes
  isOn?: boolean;
  disabled?: boolean;
  darkMode?: boolean;
  className?: string;
  showPercentText?: boolean;
}

function parseColorToRgba(colorStr: string, opacity: number): string {
  if (!colorStr) return `rgba(245, 158, 11, ${opacity})`;
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (trimmed.startsWith('rgb')) {
    const match = trimmed.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})`;
    }
  }
  return trimmed;
}

export const EntityBrightnessSlider: React.FC<EntityBrightnessSliderProps> = ({
  value,
  onChange,
  onCommit,
  color,
  isOn = true,
  disabled = false,
  darkMode = true,
  className = '',
  showPercentText = true
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize internal value when not actively dragging
  useEffect(() => {
    if (!isDragging) {
      setInternalValue(value);
    }
  }, [value, isDragging]);

  const clampedValue = isOn ? Math.min(100, Math.max(0, internalValue)) : 0;

  // Color theme calculation
  const hasCustomColor = Boolean(color && color.trim().length > 0);
  const activeColor = hasCustomColor ? color! : '#f59e0b';
  const activeGradient = hasCustomColor
    ? `linear-gradient(90deg, ${parseColorToRgba(activeColor, 0.75)} 0%, ${activeColor} 100%)`
    : 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 60%, #fef08a 100%)';
  const glowShadow = `0 0 10px rgba(255, 255, 255, 0.9), 0 0 16px ${parseColorToRgba(activeColor, 0.7)}`;

  const trackBgStyle = isOn && clampedValue > 0
    ? {
        backgroundColor: parseColorToRgba(activeColor, 0.16),
        boxShadow: `0 0 12px ${parseColorToRgba(activeColor, 0.2)}`
      }
    : undefined;

  const handleSliderChange = (newVal: number) => {
    setInternalValue(newVal);
    onChange(newVal);
  };

  const handleSliderCommit = (newVal: number) => {
    setIsDragging(false);
    if (onCommit) {
      onCommit(newVal);
    }
  };

  return (
    <div
      className={`relative w-full flex items-center gap-2.5 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Capsule Track - Border Free */}
      <div
        style={trackBgStyle}
        className={`relative flex-1 h-3 sm:h-3.5 rounded-full overflow-hidden transition-all duration-200 ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-black/5 dark:bg-white/5'
            : !isOn || clampedValue === 0
            ? darkMode
              ? 'bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]'
              : 'bg-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]'
            : darkMode
            ? 'bg-white/[0.08]'
            : 'bg-slate-200/70'
        } ${isDragging ? 'ring-2 ring-amber-400/50' : ''}`}
      >
        {/* Fill Bar */}
        <div
          style={{
            width: `${clampedValue}%`,
            background: isOn ? activeGradient : 'transparent',
            boxShadow: isOn && clampedValue > 0 ? `0 0 8px ${parseColorToRgba(activeColor, 0.45)}` : 'none',
            transition: isDragging ? 'none' : 'width 150ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end pointer-events-none"
        >
          {/* Luminous Leading Edge Indicator */}
          {isOn && clampedValue > 0 && (
            <div
              style={{
                boxShadow: glowShadow,
                backgroundColor: '#ffffff'
              }}
              className="h-full w-2.5 rounded-full transform scale-y-110 shrink-0 transition-opacity duration-200 opacity-95"
            />
          )}
        </div>

        {/* Native Touch & Pointer Range Input Overlay */}
        {!disabled && (
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={clampedValue}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
            title={`Brightness: ${clampedValue}%`}
          />
        )}
      </div>

      {/* Numerical Percentage Readout */}
      {showPercentText && (
        <span
          style={{
            color: isOn && clampedValue > 0 ? activeColor : undefined
          }}
          className={`text-[11px] sm:text-xs font-mono font-bold tracking-tight min-w-[32px] text-right shrink-0 transition-colors duration-200 ${
            !isOn || clampedValue === 0
              ? 'text-slate-400 dark:text-slate-500'
              : isDragging
              ? 'scale-105'
              : ''
          }`}
        >
          {isOn ? `${clampedValue}%` : 'Off'}
        </span>
      )}
    </div>
  );
};

export default EntityBrightnessSlider;
