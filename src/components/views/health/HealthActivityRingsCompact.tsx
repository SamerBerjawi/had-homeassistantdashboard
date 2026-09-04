/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compact Apple Health Activity Rings Component
 * Concentric animated SVG rings fitted directly next to Move, Exercise, and Stand statistics
 * without redundant containers or large titles.
 */

import React from 'react';
import { Flame, Timer, Footprints } from '@phosphor-icons/react';
import { NumberTicker } from '../../ui/NumberTicker';

interface RingInfo {
  current: number;
  goal: number;
  unit: string;
}

interface HealthActivityRingsCompactProps {
  move: RingInfo;
  exercise: RingInfo;
  steps: RingInfo;
  darkMode?: boolean;
}

export const HealthActivityRingsCompact: React.FC<HealthActivityRingsCompactProps> = ({
  move,
  exercise,
  steps,
  darkMode = true,
}) => {
  // SVG Ring Dimensions: 114px diameter
  const size = 114;
  const center = size / 2;
  const strokeWidth = 9.5;

  const rMove = 47;
  const rExercise = 35;
  const rSteps = 23;

  const circMove = 2 * Math.PI * rMove;
  const circExercise = 2 * Math.PI * rExercise;
  const circSteps = 2 * Math.PI * rSteps;

  const pctMove = Math.min(2, Math.max(0, move.current / (move.goal || 1)));
  const pctExercise = Math.min(2, Math.max(0, exercise.current / (exercise.goal || 1)));
  const pctSteps = Math.min(2, Math.max(0, steps.current / (steps.goal || 1)));

  const offsetMove = circMove * (1 - Math.min(1, pctMove));
  const offsetExercise = circExercise * (1 - Math.min(1, pctExercise));
  const offsetSteps = circSteps * (1 - Math.min(1, pctSteps));

  return (
    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 w-full py-1">
      {/* Concentric Activity Rings (Compact) */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(255,45,85,0.25)]"
        >
          <defs>
            <linearGradient id="compactMoveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2D55" />
              <stop offset="100%" stopColor="#FF6B8B" />
            </linearGradient>
            <linearGradient id="compactExerciseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A3F900" />
              <stop offset="100%" stopColor="#30D158" />
            </linearGradient>
            <linearGradient id="compactStepsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#04C7DD" />
              <stop offset="100%" stopColor="#007AFF" />
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
            stroke={darkMode ? '#A3F90022' : '#A3F90015'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={rSteps}
            fill="none"
            stroke={darkMode ? '#04C7DD22' : '#04C7DD15'}
            strokeWidth={strokeWidth}
          />

          {/* Animated Progress Arcs */}
          <circle
            cx={center}
            cy={center}
            r={rMove}
            fill="none"
            stroke="url(#compactMoveGrad)"
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
            stroke="url(#compactExerciseGrad)"
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
            stroke="url(#compactStepsGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circSteps}
            strokeDashoffset={offsetSteps}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Move Percentage */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-black text-slate-900 dark:text-white">
            {Math.round(pctMove * 100)}%
          </span>
        </div>
      </div>

      {/* Side-by-side Statistics Rows */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Move Row */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#FF2D55] shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">Move</span>
          </div>
          <div className="flex items-baseline gap-1 text-right shrink-0">
            <span className="text-xs font-black text-[#FF2D55]">
              {move.current.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              /{move.goal} {move.unit}
            </span>
          </div>
        </div>

        {/* Exercise Row */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#A3F900] shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">Exercise</span>
          </div>
          <div className="flex items-baseline gap-1 text-right shrink-0">
            <span className="text-xs font-black text-[#A3F900]">
              {exercise.current}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              /{exercise.goal} {exercise.unit}
            </span>
          </div>
        </div>

        {/* Stand / Steps Row */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#04C7DD] shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">Steps</span>
          </div>
          <div className="flex items-baseline gap-1 text-right shrink-0">
            <span className="text-xs font-black text-[#04C7DD]">
              {steps.current.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              /{steps.goal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
