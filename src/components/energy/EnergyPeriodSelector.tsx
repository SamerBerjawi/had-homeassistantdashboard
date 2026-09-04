/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy Period & Live Toolbar
 * Floating stream status pill, date window stepper, and smooth period selector.
 */

import React from 'react';
import {
  CaretLeft,
  CaretRight,
  ArrowsClockwise,
  CalendarBlank
} from '@phosphor-icons/react';
import { EnergyHistoryPeriod } from '../../services/haEnergyStatistics';

interface EnergyPeriodSelectorProps {
  period: EnergyHistoryPeriod;
  setPeriod: (p: EnergyHistoryPeriod) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  isAtFutureLimit: boolean;
  dateLabel: string;
  isFetchingStats: boolean;
  onRefresh: () => void;
  isLive: boolean;
  darkMode?: boolean;
}

export default function EnergyPeriodSelector({
  period,
  setPeriod,
  shiftPeriod,
  isAtFutureLimit,
  dateLabel,
  isFetchingStats,
  onRefresh,
  isLive,
  darkMode = true
}: EnergyPeriodSelectorProps) {
  const periodOptions: Array<{ id: EnergyHistoryPeriod; label: string }> = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' }
  ];

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 pb-1">

      {/* Right: Date Navigation, Period Tabs & Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Window Navigation: < Date Label > */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-2xl backdrop-blur-xl border transition-all shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
            darkMode
              ? 'bg-black/20 text-white border-white/5'
              : 'bg-white/20 text-slate-900 border-slate-200/50'
          }`}
        >
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            title="Previous period"
            className={`p-1 rounded-xl active:scale-95 transition-all cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <div className="flex items-center gap-1.5 px-2 text-xs font-bold font-mono tracking-tight select-none">
            <CalendarBlank size={14} className="text-amber-500" />
            <span className={darkMode ? 'text-white' : 'text-slate-900'}>{dateLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            disabled={isAtFutureLimit}
            title="Next period"
            className={`p-1 rounded-xl active:scale-95 transition-all cursor-pointer ${
              isAtFutureLimit
                ? 'opacity-30 cursor-not-allowed text-slate-600'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Period Tabs: Day / Week / Month / Year */}
        <div
          className={`flex items-center p-1 rounded-2xl backdrop-blur-xl border transition-all shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
            darkMode
              ? 'bg-black/20 border-white/5'
              : 'bg-white/20 border-slate-200/50'
          }`}
        >
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === opt.id || (opt.id === 'day' && (period === 'today' || period === 'yesterday'))
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : darkMode
                  ? 'text-slate-400 hover:text-white hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetchingStats}
          title="Refresh energy statistics"
          className={`p-2 rounded-2xl text-xs font-bold transition-all shadow-[4px_6px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl border cursor-pointer ${
            darkMode
              ? 'bg-black/20 hover:bg-black/30 text-slate-200 hover:text-white border-white/5'
              : 'bg-white/20 hover:bg-white/30 text-slate-700 hover:text-slate-900 border-slate-200/50'
          }`}
        >
          <ArrowsClockwise
            size={16}
            weight="bold"
            className={`text-amber-500 ${isFetchingStats ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
