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
  CalendarBlank,
  Lightning
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
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all backdrop-blur-md ${
            isLive
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : darkMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <Lightning size={14} weight="fill" className={isLive ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} />
          <span>{isLive ? 'Live Energy Feed' : 'Historical Data'}</span>
        </span>
      </div>

      {/* Right: Date Navigation, Period Tabs & Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Window Navigation: < Date Label > */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-2xl border backdrop-blur-md transition-all ${
            darkMode
              ? 'bg-black/40 border-white/10 text-white'
              : 'bg-slate-100 border-slate-200 text-slate-900'
          }`}
        >
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            title="Previous period"
            className={`p-1 rounded-xl active:scale-95 transition-all cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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
            title={isAtFutureLimit ? 'Current period (cannot go to future)' : 'Next period'}
            className={`p-1 rounded-xl transition-all cursor-pointer ${
              isAtFutureLimit
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/10 active:scale-95'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 active:scale-95'
            }`}
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Period Tabs: Day / Week / Month / Year */}
        <div
          className={`flex items-center p-1 rounded-2xl border backdrop-blur-md transition-all ${
            darkMode
              ? 'bg-black/40 border-white/10'
              : 'bg-slate-100 border-slate-200'
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
          className={`p-2 rounded-2xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
            darkMode
              ? 'bg-black/40 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
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
