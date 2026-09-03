/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Health Triple Activity Rings Component
 * Concentric animated SVG rings representing Move (Calories),
 * Exercise (Minutes), and Steps progress.
 */

import React from 'react';
import { Flame, Timer, Footprints } from '@phosphor-icons/react';
import { NumberTicker } from '../../ui/NumberTicker';

interface RingInfo {
  current: number;
  goal: number;
  unit: string;
}

interface HealthActivityRingsProps {
  move: RingInfo;
  exercise: RingInfo;
  steps: RingInfo;
  darkMode?: boolean;
}

export const HealthActivityRings: React.FC<HealthActivityRingsProps> = ({
  move,
  exercise,
  steps,
  darkMode = true,
}) => {
  // SVG dimensions
  const size = 180;
  const center = size / 2;
  const strokeWidth = 14;

  const rMove = 70;
  const rExercise = 52;
  const rSteps = 34;

  const circMove = 2 * Math.PI * rMove;
  const circExercise = 2 * Math.PI * rExercise;
  const circSteps = 2 * Math.PI * rSteps;

  const pctMove = Math.min(1.5, Math.max(0, move.current / (move.goal || 1)));
  const pctExercise = Math.min(1.5, Math.max(0, exercise.current / (exercise.goal || 1)));
  const pctSteps = Math.min(1.5, Math.max(0, steps.current / (steps.goal || 1)));

  const offsetMove = circMove * (1 - Math.min(1, pctMove));
  const offsetExercise = circExercise * (1 - Math.min(1, pctExercise));
  const offsetSteps = circSteps * (1 - Math.min(1, pctSteps));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
      {/* Concentric Rings Visual */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 filter drop-shadow-[0_0_16px_rgba(255,45,85,0.2)]"
        >
          <defs>
            <linearGradient id="moveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2D55" />
              <stop offset="100%" stopColor="#FF5E3A" />
            </linearGradient>
            <linearGradient id="exerciseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A1E833" />
              <stop offset="100%" stopColor="#30D158" />
            </linearGradient>
            <linearGradient id="stepsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#007AFF" />
              <stop offset="100%" stopColor="#5AC8FA" />
            </linearGradient>
          </defs>

          {/* Background Track Circles */}
          <circle
            cx={center}
            cy={center}
            r={rMove}
            fill="none"
            stroke={darkMode ? '#FF2D5522' : '#FF2D5515'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={rExercise}
            fill="none"
            stroke={darkMode ? '#A1E83322' : '#A1E83315'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={rSteps}
            fill="none"
            stroke={darkMode ? '#007AFF22' : '#007AFF15'}
            strokeWidth={strokeWidth}
          />

          {/* Active Progress Rings */}
          <circle
            cx={center}
            cy={center}
            r={rMove}
            fill="none"
            stroke="url(#moveGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circMove}
            strokeDashoffset={offsetMove}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <circle
            cx={center}
            cy={center}
            r={rExercise}
            fill="none"
            stroke="url(#exerciseGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circExercise}
            strokeDashoffset={offsetExercise}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <circle
            cx={center}
            cy={center}
            r={rSteps}
            fill="none"
            stroke="url(#stepsGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circSteps}
            strokeDashoffset={offsetSteps}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Sparkle / Pulse */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Activity
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {Math.round(pctMove * 100)}%
          </span>
        </div>
      </div>

      {/* Ring Legend & Metrics Detail */}
      <div className="flex-1 grid grid-cols-1 gap-3 w-full">
        {/* Move / Active Energy */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF2D55]/15 text-[#FF2D55] border border-[#FF2D55]/30 flex items-center justify-center shrink-0">
              <Flame size={20} weight="fill" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Move (Active)
              </div>
              <div className="flex items-baseline gap-1">
                <NumberTicker
                  value={move.current}
                  className="text-lg font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-medium text-slate-400">
                  / {move.goal} {move.unit}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[#FF2D55]">
              {Math.round(pctMove * 100)}%
            </span>
          </div>
        </div>

        {/* Exercise / Minutes */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#A1E833]/15 text-[#A1E833] border border-[#A1E833]/30 flex items-center justify-center shrink-0">
              <Timer size={20} weight="fill" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Exercise Time
              </div>
              <div className="flex items-baseline gap-1">
                <NumberTicker
                  value={exercise.current}
                  className="text-lg font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-medium text-slate-400">
                  / {exercise.goal} {exercise.unit}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[#A1E833]">
              {Math.round(pctExercise * 100)}%
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 flex items-center justify-center shrink-0">
              <Footprints size={20} weight="fill" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Daily Steps
              </div>
              <div className="flex items-baseline gap-1">
                <NumberTicker
                  value={steps.current}
                  className="text-lg font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-medium text-slate-400">
                  / {steps.goal.toLocaleString()} {steps.unit}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-[#007AFF]">
              {Math.round(pctSteps * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
