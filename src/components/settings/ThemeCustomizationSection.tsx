/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Theme & Customization Subpage
 * Clean, compact, zero-scroll mobile-optimized layout.
 */

import React from 'react';
import {
  Sun,
  Moon,
  DeviceMobile,
  Sparkle,
  Square,
  FloppyDisk,
  CloudSun,
  SquaresFour,
  Rectangle,
  SquareSplitHorizontal,
  SunHorizon,
  CloudRain,
  MoonStars
} from '@phosphor-icons/react';
import { WeatherBackdropType } from '../../types/canvas';
import { TileLayoutMode } from '../../types/userConfig';

interface ThemeCustomizationSectionProps {
  darkMode: boolean;
  themeMode: 'auto' | 'dark' | 'light';
  setThemeMode: (mode: 'auto' | 'dark' | 'light') => void;
  backgroundStyle: 'glow' | 'flat';
  setBackgroundStyle: (style: 'glow' | 'flat') => void;
  weatherBackdrop: WeatherBackdropType;
  setWeatherBackdrop: (backdrop: WeatherBackdropType) => void;
  tileLayoutMode?: TileLayoutMode;
  setTileLayoutMode?: (mode: TileLayoutMode) => void;
  fullWidthTiles?: boolean;
  setFullWidthTiles?: (fullWidth: boolean) => void;
  handleSavePreferences: () => void;
}

export default function ThemeCustomizationSection({
  darkMode,
  themeMode,
  setThemeMode,
  backgroundStyle,
  setBackgroundStyle,
  weatherBackdrop,
  setWeatherBackdrop,
  tileLayoutMode = 'compact',
  setTileLayoutMode,
  fullWidthTiles = false,
  setFullWidthTiles,
  handleSavePreferences
}: ThemeCustomizationSectionProps) {
  const activeTileMode: TileLayoutMode =
    tileLayoutMode || (fullWidthTiles ? 'full' : 'compact');

  const handleSelectTileMode = (mode: TileLayoutMode) => {
    setTileLayoutMode?.(mode);
    setFullWidthTiles?.(mode === 'full');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 sm:space-y-4 animate-in fade-in duration-200">
      {/* Unified Compact Settings Container */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-white/30 dark:bg-black/25 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-[4px_6px_12px_rgba(0,0,0,0.1)] space-y-3.5 sm:space-y-4">
        
        {/* 1. Theme / Appearance Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Appearance
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
              {themeMode === 'auto' ? 'System Match' : themeMode}
            </span>
          </div>

          <div className="grid grid-cols-3 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 gap-1">
            <button
              type="button"
              onClick={() => setThemeMode('auto')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                themeMode === 'auto'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <DeviceMobile size={17} weight="duotone" />
              <span>Auto</span>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Moon size={17} weight="duotone" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sun size={17} weight="duotone" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* 2. Room & Area Tile Width (Mobile Only) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Tile Width <span className="text-[10px] font-normal text-slate-400">(Mobile)</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
              {activeTileMode === 'compact'
                ? 'Compact (2/row)'
                : activeTileMode === 'hybrid'
                ? 'Hybrid (Smart)'
                : 'Full (1/row)'}
            </span>
          </div>

          <div className="grid grid-cols-3 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 gap-1">
            <button
              type="button"
              onClick={() => handleSelectTileMode('compact')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTileMode === 'compact'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <SquaresFour size={17} weight="duotone" />
              <span>Compact</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTileMode('hybrid')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTileMode === 'hybrid'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <SquareSplitHorizontal size={17} weight="duotone" />
              <span>Hybrid</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTileMode('full')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTileMode === 'full'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Rectangle size={17} weight="duotone" />
              <span>Full</span>
            </button>
          </div>
        </div>

        {/* 3. Background Style */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Background Style
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
              {backgroundStyle === 'glow' ? 'Luminous Glow' : 'Flat Solid'}
            </span>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 gap-1">
            <button
              type="button"
              onClick={() => setBackgroundStyle('glow')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                backgroundStyle === 'glow'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sparkle size={16} weight="duotone" />
              <span>Ambient Glow</span>
            </button>

            <button
              type="button"
              onClick={() => setBackgroundStyle('flat')}
              className={`h-9 sm:h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                backgroundStyle === 'flat'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Square size={16} weight="duotone" />
              <span>Flat Clean</span>
            </button>
          </div>
        </div>

        {/* 4. Canvas Weather Backdrop Simulation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <CloudSun size={15} weight="duotone" className="text-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Weather Backdrop
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase">
              {weatherBackdrop}
            </span>
          </div>

          <div className="grid grid-cols-4 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 gap-1">
            {[
              { id: 'auto' as WeatherBackdropType, label: 'Auto', icon: CloudSun },
              { id: 'sunny' as WeatherBackdropType, label: 'Sunny', icon: SunHorizon },
              { id: 'rain' as WeatherBackdropType, label: 'Rain', icon: CloudRain },
              { id: 'starry-night' as WeatherBackdropType, label: 'Night', icon: MoonStars }
            ].map((b) => {
              const IconComp = b.icon;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setWeatherBackdrop(b.id)}
                  className={`h-8 sm:h-9 rounded-xl flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    weatherBackdrop === b.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <IconComp size={13} weight="bold" />
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. Save Button (Sleek full-width) */}
      <button
        type="button"
        onClick={handleSavePreferences}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/20 transition-all cursor-pointer active:scale-98"
      >
        <FloppyDisk size={17} weight="bold" />
        <span>Save Preferences</span>
      </button>
    </div>
  );
}
