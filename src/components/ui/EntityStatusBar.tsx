/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EntityStatusBar Component
 * Ultra-sleek, modern status and progress bar designed for entity tiles (sensors, battery, humidity, power).
 * Features dynamic semantic threshold colors, ambient glowing fill, optional charging shimmer,
 * and high-contrast monospace typography.
 */

import React from 'react';
import { Lightning } from '@phosphor-icons/react';

export interface EntityStatusBarProps {
  value: number;
  min?: number;
  max?: number;
  variant?: 'battery' | 'humidity' | 'power' | 'generic' | 'alert' | 'accent';
  color?: string;
  label?: React.ReactNode;
  valueText?: React.ReactNode;
  showValueText?: boolean;
  isCharging?: boolean;
  isAlert?: boolean;
  darkMode?: boolean;
  className?: string;
  trackHeightClass?: string;
}

export const EntityStatusBar: React.FC<EntityStatusBarProps> = ({
  value,
  min = 0,
  max = 100,
  variant = 'generic',
  color,
  label,
  valueText,
  showValueText = true,
  isCharging = false,
  isAlert = false,
  darkMode = true,
  className = '',
  trackHeightClass = 'h-2 sm:h-2.5'
}) => {
  const safeMin = Number(min);
  const safeMax = Number(max) > safeMin ? Number(max) : safeMin + 1;
  const clampedVal = Math.min(safeMax, Math.max(safeMin, Number(value || 0)));
  const percentage = Math.max(0, Math.min(100, ((clampedVal - safeMin) / (safeMax - safeMin)) * 100));

  // Determine semantic color and glow based on variant and value
  const getThemeConfig = () => {
    if (color) {
      return {
        gradient: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
        glow: `0 0 8px ${color}66`,
        textColor: color
      };
    }

    if (isAlert || variant === 'alert') {
      return {
        gradient: 'linear-gradient(90deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)',
        glow: '0 0 10px rgba(244, 63, 94, 0.55)',
        textColor: '#f43f5e'
      };
    }

    if (variant === 'battery') {
      if (clampedVal < 20) {
        return {
          gradient: 'linear-gradient(90deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)',
          glow: '0 0 10px rgba(244, 63, 94, 0.6)',
          textColor: '#f43f5e'
        };
      }
      if (clampedVal < 50) {
        return {
          gradient: 'linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
          glow: '0 0 10px rgba(245, 158, 11, 0.5)',
          textColor: '#f59e0b'
        };
      }
      return {
        gradient: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
        glow: '0 0 10px rgba(16, 185, 129, 0.5)',
        textColor: '#10b981'
      };
    }

    if (variant === 'humidity') {
      return {
        gradient: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #7dd3fc 100%)',
        glow: '0 0 10px rgba(56, 189, 248, 0.55)',
        textColor: '#38bdf8'
      };
    }

    if (variant === 'power') {
      return {
        gradient: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #c084fc 100%)',
        glow: '0 0 10px rgba(168, 85, 247, 0.55)',
        textColor: '#a855f7'
      };
    }

    // Default generic / accent (amber / gold)
    return {
      gradient: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fef08a 100%)',
      glow: '0 0 10px rgba(245, 158, 11, 0.45)',
      textColor: '#fbbf24'
    };
  };

  const theme = getThemeConfig();
  const displayValue = valueText !== undefined ? valueText : `${Math.round(clampedVal)}%`;

  return (
    <div className={`w-full flex items-center gap-2.5 select-none ${className}`}>
      {/* Optional Label on Left */}
      {label && (
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
          {label}
        </span>
      )}

      {/* Recessed Capsule Track - Border Free */}
      <div
        className={`relative flex-1 ${trackHeightClass} rounded-full overflow-hidden p-0.5 ${
          darkMode
            ? 'bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]'
            : 'bg-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]'
        }`}
      >
        {/* Animated Fill Bar */}
        <div
          style={{
            width: `${percentage}%`,
            background: theme.gradient,
            boxShadow: percentage > 0 ? theme.glow : 'none'
          }}
          className="relative h-full rounded-full transition-all duration-500 ease-out"
        >
          {/* Subtle Shimmer Animation for Charging State */}
          {isCharging && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Value Pill on Right */}
      {showValueText && (
        <div className="flex items-center gap-1 shrink-0">
          {isCharging && (
            <Lightning size={12} weight="fill" className="text-amber-400 animate-pulse shrink-0" />
          )}
          <span
            style={{ color: theme.textColor }}
            className="text-[11px] sm:text-xs font-mono font-bold tracking-tight"
          >
            {displayValue}
          </span>
        </div>
      )}
    </div>
  );
};

export default EntityStatusBar;
