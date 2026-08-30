/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CaretLeft,
  CaretRight,
  ArrowsClockwise,
  CalendarBlank,
  Pulse
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
    <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
      {/* Left: Stream Status Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
            isLive
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>{isLive ? 'HA Energy Stream' : 'HA Offline Simulation'}</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
          Official Energy Dashboard
        </span>
      </div>

      {/* Right: Date Navigation, Period Tabs & Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Date Window Navigation: < Date Label > */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-2xl border backdrop-blur-md transition-all ${
            darkMode
              ? 'bg-white/5 border-white/10 text-white'
              : 'bg-slate-900/[0.04] border-slate-900/[0.08] text-slate-900'
          }`}
        >
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            title="Previous period"
            className="p-1 rounded-xl hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-slate-400 hover:text-white"
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          <div className="flex items-center gap-1.5 px-2 text-xs font-bold font-mono tracking-tight select-none">
            <CalendarBlank size={14} className="text-amber-500" />
            <span>{dateLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            disabled={isAtFutureLimit}
            title={isAtFutureLimit ? 'Current period (cannot go to future)' : 'Next period'}
            className={`p-1 rounded-xl transition-all cursor-pointer ${
              isAtFutureLimit
                ? 'opacity-30 cursor-not-allowed text-slate-500'
                : 'hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white'
            }`}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Period Tabs: Day / Week / Month / Year */}
        <div
          className={`flex items-center p-1 rounded-2xl border backdrop-blur-md transition-all ${
            darkMode
              ? 'bg-white/5 border-white/10'
              : 'bg-slate-900/[0.04] border-slate-900/[0.08]'
          }`}
        >
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === opt.id || (opt.id === 'day' && (period === 'today' || period === 'yesterday'))
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : darkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-700 hover:text-slate-900'
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
          className={`p-2 rounded-2xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
            darkMode
              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white'
              : 'bg-white/80 hover:bg-white border-slate-200/80 text-slate-800 hover:text-slate-900 backdrop-blur-sm'
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
