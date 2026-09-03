/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Lightning } from '@phosphor-icons/react';

interface LiquidWaveBatteryProps {
  soc: number; // 0 to 100
  isCharging?: boolean;
  powerKw?: number;
  darkMode?: boolean;
  className?: string;
}

export function LiquidWaveBattery({
  soc,
  isCharging = false,
  darkMode = true,
  className = ''
}: LiquidWaveBatteryProps) {
  const clampedSoc = Math.min(Math.max(Math.round(soc), 0), 100);

  // Available liquid height inside the rounded rectangle:
  // Container starts at y = 2, height = 126 (bottom at y = 128)
  const innerBottom = 128;
  const maxFluidHeight = 126;
  const fluidHeight = (clampedSoc / 100) * maxFluidHeight;
  const targetY = innerBottom - fluidHeight;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Subtle Underbody Ambient Glow when Charging */}
      {isCharging && (
        <motion.div
          animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl bg-emerald-700/25 blur-xl pointer-events-none"
        />
      )}

      {/* Clean Rounded Rectangle Liquid Container (No battery cap/tip, darker green) */}
      <div className="relative w-20 sm:w-22 h-32 sm:h-34 flex items-center justify-center">
        <svg
          viewBox="0 0 86 130"
          className="w-full h-full drop-shadow-md"
          fill="none"
        >
          <defs>
            {/* Pure Rounded Rectangle Clip */}
            <clipPath id="liquidRoundedRectClip">
              <rect x="2" y="2" width="82" height="126" rx="16" ry="16" />
            </clipPath>

            {/* Front Wave: Darker, Rich Forest Emerald Gradient */}
            <linearGradient id="darkGreenFrontWave" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="40%" stopColor="#059669" />
              <stop offset="80%" stopColor="#047857" />
              <stop offset="100%" stopColor="#022C22" />
            </linearGradient>

            {/* Back Wave: Deep Translucent Pine/Forest Gradient */}
            <linearGradient id="darkGreenBackWave" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#065F46" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#022C22" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Liquid Masked Group */}
          <g clipPath="url(#liquidRoundedRectClip)">
            {/* Liquid Group transitioning vertically with SoC */}
            <motion.g
              initial={{ y: innerBottom }}
              animate={{ y: targetY }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Back Wave (Offset loop) */}
              <motion.path
                animate={{ x: [-86, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                d="M -86 0 Q -64 -7, -43 0 T 0 0 Q 21 -7, 43 0 T 86 0 Q 107 -7, 129 0 T 172 0 L 172 150 L -86 150 Z"
                fill="url(#darkGreenBackWave)"
              />

              {/* Front Wave (Darker Green) */}
              <motion.path
                animate={{ x: [0, -86] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                d="M 0 0 Q 21 -6, 43 0 T 86 0 Q 107 -6, 129 0 T 172 0 Q 193 -6, 215 0 T 258 0 L 258 150 L 0 150 Z"
                fill="url(#darkGreenFrontWave)"
              />

              {/* Translucent pill highlight inside the fluid */}
              {clampedSoc > 18 && (
                <rect
                  x="12"
                  y="18"
                  width="4.5"
                  height="26"
                  rx="2.25"
                  fill="rgba(255, 255, 255, 0.22)"
                />
              )}
            </motion.g>
          </g>

          {/* Subtle Outer Glass Rounded Rectangle Shell */}
          <rect
            x="2"
            y="2"
            width="82"
            height="126"
            rx="16"
            ry="16"
            stroke={darkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(51, 65, 85, 0.22)'}
            strokeWidth="1.6"
            fill={darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'}
          />

          {/* Subtle Glass Specular Reflection Highlight (Upper Right) */}
          <rect
            x="76"
            y="14"
            width="2"
            height="16"
            rx="1"
            fill={darkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(51, 65, 85, 0.25)'}
          />
        </svg>

        {/* Centered Percentage Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          {isCharging && (
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-emerald-400 drop-shadow-md mb-0.5"
            >
              <Lightning size={16} weight="fill" />
            </motion.div>
          )}

          <span
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              clampedSoc > 40 || darkMode
                ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                : 'text-slate-800 drop-shadow-xs'
            }`}
          >
            {clampedSoc}%
          </span>
        </div>
      </div>
    </div>
  );
}
