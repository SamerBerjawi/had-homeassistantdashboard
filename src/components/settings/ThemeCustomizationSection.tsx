/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Theme & Customization Subpage (Responsive Mobile & Desktop)
 */

import React from 'react';
import {
  Palette,
  Sun,
  Moon,
  Desktop,
  DeviceMobile,
  Sparkle,
  FloppyDisk,
  Clock,
  Thermometer,
  CloudSun
} from '@phosphor-icons/react';
import { WeatherBackdropType } from '../../types/canvas';

interface ThemeCustomizationSectionProps {
  darkMode: boolean;
  themeMode: 'auto' | 'dark' | 'light';
  setThemeMode: (mode: 'auto' | 'dark' | 'light') => void;
  tempUnit: 'C' | 'F';
  setTempUnit: (unit: 'C' | 'F') => void;
  clockFormat: '24h' | '12h';
  setClockFormat: (format: '24h' | '12h') => void;
  weatherBackdrop: WeatherBackdropType;
  setWeatherBackdrop: (backdrop: WeatherBackdropType) => void;
  handleSavePreferences: () => void;
}

export default function ThemeCustomizationSection({
  darkMode,
  themeMode,
  setThemeMode,
  tempUnit,
  setTempUnit,
  clockFormat,
  setClockFormat,
  weatherBackdrop,
  setWeatherBackdrop,
  handleSavePreferences
}: ThemeCustomizationSectionProps) {
  return (
    <div className="space-y-5 w-full animate-in fade-in duration-200">
      {/* Visual Mode Selector: Auto vs Dark vs Light */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3 shadow-xs">
        <div>
          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Appearance & Visual Mode
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose how your dashboard appears across all device screens.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Auto Mode */}
          <button
            type="button"
            onClick={() => setThemeMode('auto')}
            className={`p-4 rounded-2xl border flex items-center sm:flex-col sm:items-start gap-3.5 text-left transition-all cursor-pointer ${
              themeMode === 'auto'
                ? 'bg-sky-500/15 border-sky-500 text-sky-950 dark:text-white font-bold shadow-md shadow-sky-500/10'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              themeMode === 'auto' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-sky-500'
            }`}>
              <DeviceMobile size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>Auto / System</span>
                {themeMode === 'auto' && <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Matches your device's system dark/light mode
              </div>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`p-4 rounded-2xl border flex items-center sm:flex-col sm:items-start gap-3.5 text-left transition-all cursor-pointer ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-sky-500 text-white font-bold shadow-md shadow-sky-500/10'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              themeMode === 'dark' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-sky-400'
            }`}>
              <Moon size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>OLED Dark</span>
                {themeMode === 'dark' && <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Luminous dark glassmorphism with high contrast
              </div>
            </div>
          </button>

          {/* Light Mode */}
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`p-4 rounded-2xl border flex items-center sm:flex-col sm:items-start gap-3.5 text-left transition-all cursor-pointer ${
              themeMode === 'light'
                ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-white font-bold shadow-md'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              themeMode === 'light' ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-amber-500'
            }`}>
              <Sun size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>Daylight Light</span>
                {themeMode === 'light' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Crisp frosted daylight glass with refined clarity
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Measurement Units & Formatting (2 Clean Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Thermometer size={20} weight="duotone" className="text-sky-500" />
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Temperature Unit</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTempUnit('C')}
              className={`py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                tempUnit === 'C'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              Celsius (°C)
            </button>
            <button
              type="button"
              onClick={() => setTempUnit('F')}
              className={`py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                tempUnit === 'F'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock size={20} weight="duotone" className="text-indigo-500" />
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Time Format</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setClockFormat('24h')}
              className={`py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                clockFormat === '24h'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              24-Hour (18:45)
            </button>
            <button
              type="button"
              onClick={() => setClockFormat('12h')}
              className={`py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                clockFormat === '12h'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              12-Hour (6:45 PM)
            </button>
          </div>
        </div>
      </div>

      {/* Weather Backdrop Simulation */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun size={20} weight="duotone" className="text-amber-500" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Canvas Weather Simulation
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase">
            {weatherBackdrop}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'auto' as WeatherBackdropType, label: 'Auto HA Entity' },
            { id: 'sunny' as WeatherBackdropType, label: 'Sunny Day' },
            { id: 'rain' as WeatherBackdropType, label: 'Rain Streaks' },
            { id: 'starry-night' as WeatherBackdropType, label: 'Starry Night' }
          ].map((backdrop) => (
            <button
              key={backdrop.id}
              type="button"
              onClick={() => setWeatherBackdrop(backdrop.id)}
              className={`py-3 px-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer text-center ${
                weatherBackdrop === backdrop.id
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              {backdrop.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSavePreferences}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-md shadow-sky-500/20 transition-all cursor-pointer active:scale-98"
        >
          <FloppyDisk size={18} weight="bold" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
}
