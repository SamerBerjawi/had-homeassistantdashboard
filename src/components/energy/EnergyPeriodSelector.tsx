/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy Period & Live Toolbar
 * Floating stream status pill, date window stepper, smooth period selector,
 * and interactive custom date range picker popover.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  CaretLeft,
  CaretRight,
  ArrowsClockwise,
  CalendarBlank,
  X,
  Check,
  Sparkle
} from '@phosphor-icons/react';
import { EnergyHistoryPeriod } from '../../services/haEnergyStatistics';

interface EnergyPeriodSelectorProps {
  period: EnergyHistoryPeriod;
  setPeriod: (p: EnergyHistoryPeriod) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  isAtFutureLimit: boolean;
  dateLabel: string;
  customRange?: { start: Date; end: Date } | null;
  setCustomRange?: (start: Date, end: Date) => void;
  isFetchingStats: boolean;
  onRefresh: () => void;
  isLive: boolean;
  darkMode?: boolean;
}

const toInputDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromInputDate = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

type PresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear';

const getPresetDates = (preset: PresetKey) => {
  const now = new Date();
  let s = new Date(now);
  let e = new Date(now);

  if (preset === 'today') {
    // s = today, e = today
  } else if (preset === 'yesterday') {
    s.setDate(s.getDate() - 1);
    e.setDate(e.getDate() - 1);
  } else if (preset === 'last7') {
    s.setDate(s.getDate() - 6);
  } else if (preset === 'last30') {
    s.setDate(s.getDate() - 29);
  } else if (preset === 'thisMonth') {
    s = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === 'lastMonth') {
    s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    e = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (preset === 'thisYear') {
    s = new Date(now.getFullYear(), 0, 1);
  }

  return { start: toInputDate(s), end: toInputDate(e) };
};

const PRESETS: Array<{ id: PresetKey; label: string; span?: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7D' },
  { id: 'last30', label: 'Last 30D' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisYear', label: 'This Year', span: 'col-span-2' }
];

export default function EnergyPeriodSelector({
  period,
  setPeriod,
  shiftPeriod,
  isAtFutureLimit,
  dateLabel,
  customRange,
  setCustomRange,
  isFetchingStats,
  onRefresh,
  isLive,
  darkMode = true
}: EnergyPeriodSelectorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const todayStr = toInputDate(new Date());

  const [startDateInput, setStartDateInput] = useState<string>(() => {
    if (customRange?.start) return toInputDate(customRange.start);
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toInputDate(d);
  });

  const [endDateInput, setEndDateInput] = useState<string>(() => {
    if (customRange?.end) return toInputDate(customRange.end);
    return todayStr;
  });

  // Sync inputs when customRange updates externally
  useEffect(() => {
    if (customRange?.start && customRange?.end) {
      setStartDateInput(toInputDate(customRange.start));
      setEndDateInput(toInputDate(customRange.end));
    }
  }, [customRange]);

  // Determine currently active preset based on current input values
  const activePreset = useMemo<PresetKey | null>(() => {
    for (const p of PRESETS) {
      const dates = getPresetDates(p.id);
      if (dates.start === startDateInput && dates.end === endDateInput) {
        return p.id;
      }
    }
    return null;
  }, [startDateInput, endDateInput]);

  // Dismiss popover on outside click or Escape key
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPickerOpen]);

  const applyPreset = (preset: PresetKey) => {
    const dates = getPresetDates(preset);
    setStartDateInput(dates.start);
    setEndDateInput(dates.end);
  };

  const handleApply = () => {
    if (!setCustomRange) return;
    const s = fromInputDate(startDateInput);
    const e = fromInputDate(endDateInput);
    if (s > e) {
      setCustomRange(e, s);
    } else {
      setCustomRange(s, e);
    }
    setIsPickerOpen(false);
  };

  const periodOptions: Array<{ id: EnergyHistoryPeriod; label: string }> = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' }
  ];

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 pb-1 relative z-30">
      {/* Right: Date Navigation, Period Tabs & Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Window Navigation: < Date Label > with Calendar Popover */}
        <div className="relative">
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

            {/* Clickable Calendar Icon and Date Pill */}
            <button
              type="button"
              onClick={() => setIsPickerOpen((prev) => !prev)}
              title="Click calendar to select custom date range"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold font-mono tracking-tight select-none transition-all cursor-pointer active:scale-95 ${
                isPickerOpen
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 ring-1 ring-amber-500/40'
                  : darkMode
                  ? 'hover:bg-white/10 text-white'
                  : 'hover:bg-slate-200/60 text-slate-900'
              }`}
            >
              {isFetchingStats ? (
                <ArrowsClockwise size={15} weight="bold" className="text-amber-500 animate-spin shrink-0" />
              ) : (
                <CalendarBlank size={15} weight="duotone" className="text-amber-500 shrink-0" />
              )}
              <span>{dateLabel}</span>
            </button>

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

          {/* Custom Date Range Popover Dropdown */}
          {isPickerOpen && (
            <div
              ref={popoverRef}
              className={`absolute top-full right-0 mt-2.5 z-50 w-[330px] sm:w-[360px] p-5 rounded-3xl backdrop-blur-2xl border transition-all animate-fadeIn isolate overflow-hidden ${
                darkMode
                  ? 'bg-slate-950/95 border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
                  : 'bg-[#fafafa]/95 border-slate-200/80 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
              }`}
            >
              {/* Subtle ambient warm glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200/80 dark:border-white/10 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <CalendarBlank size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold tracking-tight">Select Date Range</h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Custom energy analytics period</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <X size={15} weight="bold" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="mb-4 relative z-10">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  <Sparkle size={13} className="text-amber-500" />
                  <span>Quick Presets</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {PRESETS.map((p) => {
                    const isSelected = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`${p.span || ''} px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center select-none active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs border-amber-400 ring-1 ring-amber-400'
                            : darkMode
                            ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                            : 'bg-white/80 border-slate-200/90 text-slate-700 hover:text-slate-950 hover:bg-slate-100 shadow-2xs'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start & End Date Inputs */}
              <div className="space-y-3 mb-5 relative z-10">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDateInput}
                    max={todayStr}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white [color-scheme:dark] hover:bg-white/10'
                        : 'bg-white border-slate-200 text-slate-900 [color-scheme:light] hover:border-slate-300 shadow-2xs'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDateInput}
                    min={startDateInput}
                    max={todayStr}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-2xl text-xs font-mono font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 ${
                      darkMode
                        ? 'bg-white/5 border-white/10 text-white [color-scheme:dark] hover:bg-white/10'
                        : 'bg-white border-slate-200 text-slate-900 [color-scheme:light] hover:border-slate-300 shadow-2xs'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10 relative z-10">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className={`flex-1 py-2.5 px-4 rounded-2xl font-bold text-xs border transition-all cursor-pointer text-center active:scale-95 ${
                    darkMode
                      ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                      : 'border-slate-200/90 bg-white/60 hover:bg-slate-100 text-slate-700 hover:text-slate-950 shadow-2xs'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-2.5 px-4 rounded-2xl font-extrabold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} weight="bold" />
                  <span>Apply Range</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Period Tabs: Day / Week / Month / Year + Custom */}
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

          {/* Active Custom Range Tab */}
          {period === 'custom' && (
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              title="Custom range active (click to change)"
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-amber-500 text-slate-950 font-black shadow-xs flex items-center gap-1"
            >
              <CalendarBlank size={13} weight="bold" />
              <span>Custom</span>
            </button>
          )}
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
