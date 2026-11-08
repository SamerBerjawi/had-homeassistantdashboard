/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lightbulb, Power, CaretRight, Moon, Sun } from '@phosphor-icons/react';
import type { TileProps } from './types';

export default function LightsTile({ s, is2x }: TileProps) {
  const {
    darkMode,
    handleToggleLightBatch,
    handleToggleSingleLight,
    lightEntities,
    onLights,
    tileBaseClass
  } = s;

  const onLightsCount = onLights.length;
  const totalLightsCount = lightEntities.length;
  const isAnyLightOn = onLightsCount > 0;
  const onRatio = totalLightsCount > 0 ? onLightsCount / totalLightsCount : 0;

  const lightsWithBrightness = onLights.filter(
    (l) => typeof l.attributes?.brightness === 'number'
  );
  const avgBrightnessPct = lightsWithBrightness.length > 0
    ? Math.round(
        lightsWithBrightness.reduce(
          (acc, l) => acc + (Number(l.attributes.brightness) / 255) * 100,
          0
        ) / lightsWithBrightness.length
      )
    : null;

  if (is2x) {
    return (
      <div
        className={tileBaseClass(
          isAnyLightOn,
          darkMode
            ? 'bg-gradient-to-br from-amber-500/25 via-amber-600/10 to-transparent text-white border-amber-500/35 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.25)]'
            : 'bg-gradient-to-br from-amber-50/90 via-amber-100/50 to-white/80 text-slate-900 border-amber-300/80 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.2)]',
          false,
          true
        )}
      >
        {/* Ambient Amber Glow Backdrop */}
        {isAnyLightOn && (
          <div className="absolute -top-8 -left-8 w-44 h-44 bg-amber-400/20 dark:bg-amber-400/20 rounded-full blur-3xl pointer-events-none transition-opacity duration-700" />
        )}

        <div className="relative z-10 flex items-stretch h-full gap-3 sm:gap-4">
          {/* Left Column: Master status, metric, and ratio progress */}
          <div className="flex-1 flex flex-col justify-between min-w-0 pr-1 sm:pr-2 border-r border-slate-200/50 dark:border-white/10">
            {/* Top: Icon + Title + Master Power Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  {isAnyLightOn && (
                    <div className="absolute inset-0 rounded-xl bg-amber-400/40 dark:bg-amber-400/30 blur-sm" />
                  )}
                  <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isAnyLightOn
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 ring-1 ring-amber-300/50 shadow-xs'
                      : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Lightbulb size={17} weight={isAnyLightOn ? 'fill' : 'duotone'} />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Lighting
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {isAnyLightOn ? `${onLightsCount} active` : 'All off'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleLightBatch}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isAnyLightOn
                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/40 ring-1 ring-amber-500/30'
                    : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
                }`}
                title={isAnyLightOn ? 'Turn all off' : 'Turn lights on'}
              >
                <Power size={13} weight="bold" />
              </button>
            </div>

            {/* Middle: Big count + average brightness pill */}
            <div className="flex items-baseline justify-between my-auto">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                  {onLightsCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                  / {totalLightsCount} On
                </span>
              </div>
              {isAnyLightOn && avgBrightnessPct !== null && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Sun size={10} weight="fill" className="text-amber-500" />
                  {avgBrightnessPct}%
                </span>
              )}
            </div>

            {/* Bottom: Progress ratio bar & drawer trigger hint */}
            <div className="space-y-1.5">
              <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                  style={{ width: `${Math.max(onRatio * 100, isAnyLightOn ? 8 : 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Manage all</span>
                <CaretRight size={11} weight="bold" className="group-hover:translate-x-0.5 group-hover:text-amber-500 transition-all" />
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Active Light Chips or Calm Off State */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {isAnyLightOn ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    Active Lamps
                  </span>
                  {onLights.length > 2 && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300">
                      +{onLights.length - 2} more
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 justify-center flex-1">
                  {onLights.slice(0, 2).map((light) => {
                    const lightBrightness = typeof light.attributes?.brightness === 'number'
                      ? Math.round((Number(light.attributes.brightness) / 255) * 100)
                      : null;
                    const cleanName = light.name
                      .replace(/light/gi, '')
                      .replace(/lamp/gi, '')
                      .trim() || light.name;

                    return (
                      <div
                        key={light.entity_id}
                        onClick={(e) => handleToggleSingleLight(e, light)}
                        role="button"
                        tabIndex={0}
                        className="group/chip flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-amber-500/20 dark:hover:bg-amber-500/20 border border-black/5 dark:border-white/5 hover:border-amber-500/30 transition-all cursor-pointer shadow-xs"
                        title={`Click to turn off ${light.name}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {cleanName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {lightBrightness !== null && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {lightBrightness}%
                            </span>
                          )}
                          <div className="w-5 h-5 rounded-lg bg-amber-500/20 group-hover/chip:bg-amber-500 group-hover/chip:text-slate-950 flex items-center justify-center text-amber-600 dark:text-amber-300 transition-colors">
                            <Power size={10} weight="bold" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate pt-1 text-right">
                  Tap chip to toggle
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-1">
                  <Moon size={16} weight="duotone" />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  All Lights Off
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {totalLightsCount} lamps ready
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 1x Compact Version
  return (
    <div
      className={tileBaseClass(
        isAnyLightOn,
        darkMode
          ? 'bg-gradient-to-br from-amber-500/25 via-amber-600/15 to-transparent text-white border-amber-500/35 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.25)]'
          : 'bg-gradient-to-br from-amber-50/90 via-amber-100/60 to-white/70 text-slate-900 border-amber-300/80 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.2)]',
        false,
        false
      )}
    >
      {/* Luminous Glow Backdrop */}
      {isAnyLightOn && (
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-amber-400/20 dark:bg-amber-400/25 rounded-full blur-2xl pointer-events-none transition-opacity duration-700" />
      )}

      <div className="flex items-center justify-between relative z-10">
        <div className="relative">
          {isAnyLightOn && (
            <div className="absolute inset-0 rounded-2xl bg-amber-400/40 dark:bg-amber-400/30 blur-md" />
          )}
          <div className={`relative w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
            isAnyLightOn
              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-300/50'
              : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
          }`}>
            <Lightbulb size={19} weight={isAnyLightOn ? 'fill' : 'duotone'} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleLightBatch}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isAnyLightOn
              ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
          }`}
          title={isAnyLightOn ? 'Turn all off' : 'Turn lights on'}
        >
          <Power size={13} weight="bold" />
        </button>
      </div>

      <div className="relative z-10 my-0.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
            {onLightsCount}
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
            / {totalLightsCount} On
          </span>
        </div>
        {isAnyLightOn && avgBrightnessPct !== null && (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Sun size={10} weight="fill" className="text-amber-500" />
            {avgBrightnessPct}%
          </span>
        )}
      </div>

      {/* Ratio Progress Glow Bar */}
      <div className="relative z-10 w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
          style={{ width: `${Math.max(onRatio * 100, isAnyLightOn ? 8 : 0)}%` }}
        />
      </div>

      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Lighting
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span>{isAnyLightOn ? `${onLightsCount} active` : 'All lights off'}</span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
