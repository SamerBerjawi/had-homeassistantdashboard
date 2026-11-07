/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaretRight, Drop, Wind, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { getWeatherConditionInfo } from '../../weather/weatherIcons';
import AnimatedWeatherBackdrop from '../../weather/AnimatedWeatherBackdrop';
import type { TileProps } from './types';

export default function WeatherTile({ s, is2x }: TileProps) {
  const {
    activeWeather,
    currentTemp,
    dailyForecast,
    darkMode,
    humidity,
    isNight,
    tempUnit,
    tileBaseClass,
    weatherCondInfo,
    weatherCondition,
    weatherHigh,
    weatherLow
  } = s;

  const windSpeed = activeWeather?.attributes?.wind_speed;
  const windUnit = activeWeather?.attributes?.wind_speed_unit || 'km/h';
  const precip = activeWeather?.attributes?.precipitation;

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        <AnimatedWeatherBackdrop condition={weatherCondition} isNight={isNight} darkMode={darkMode} />
        <div className={`absolute inset-0 pointer-events-none rounded-3xl ${darkMode ? 'bg-black/25' : 'bg-white/10'}`} />

        <div className="relative z-10 flex items-stretch h-full gap-2.5 sm:gap-3.5">
          {/* Left Column: Current Weather Hero */}
          <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
            {/* Top: Icon + Title (No condition pill) */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/80 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0">
                {weatherCondInfo.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Weather
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium capitalize truncate">
                  {weatherCondition.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            {/* Middle: Big Temp + High / Low */}
            <div className="flex items-baseline gap-2.5 my-auto">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                {Math.round(currentTemp)}{tempUnit}
              </span>
              <div className="flex flex-col text-[11px] font-mono font-bold leading-tight">
                <span className="text-amber-500 flex items-center gap-0.5">
                  <ArrowUp size={10} weight="bold" />{Math.round(weatherHigh)}°
                </span>
                <span className="text-sky-500 flex items-center gap-0.5">
                  <ArrowDown size={10} weight="bold" />{Math.round(weatherLow)}°
                </span>
              </div>
            </div>

            {/* Bottom: Live Telemetry Row */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10 shrink-0">
                <Drop size={11} weight="fill" className="text-sky-400 shrink-0" />
                <span>{humidity}%</span>
              </span>
              {typeof windSpeed === 'number' && (
                <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10 truncate">
                  <Wind size={11} weight="bold" className="text-teal-400 shrink-0" />
                  <span className="truncate">{Math.round(windSpeed)} {windUnit}</span>
                </span>
              )}
              {typeof precip === 'number' && precip > 0 && (
                <span className="hidden sm:flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10 shrink-0">
                  <span>{precip}mm</span>
                </span>
              )}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-black/5 dark:bg-white/10 my-0.5 shrink-0" />

          {/* Right Column: 3-Day Forecast Strip */}
          <div className="flex-[1.1] sm:flex-[1.2] flex flex-col justify-between min-w-0 pl-1">
            {/* Header: Forecast label + CaretRight */}
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                3-Day Forecast
              </span>
              <div className="flex items-center gap-0.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                <CaretRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* 3 mini forecast cards (Next 3 Days: Tomorrow onwards) */}
            <div className="flex items-center gap-1 sm:gap-1.5 w-full my-auto">
              {dailyForecast.slice(1, 4).map((f, i) => {
                const dayLabel = i === 0 
                  ? 'Tomorrow' 
                  : new Date(f.datetime).toLocaleDateString(undefined, { weekday: 'short' });
                const dayIcon = getWeatherConditionInfo(f.condition, false, 18).icon;
                const high = Math.round(f.temperature);
                const low = Math.round(f.templow);

                return (
                  <div
                    key={f.datetime || i}
                    className="flex-1 min-w-0 py-1.5 px-0.5 sm:px-1 rounded-2xl bg-white/40 dark:bg-white/[0.06] hover:bg-white/60 dark:hover:bg-white/[0.1] backdrop-blur-md border border-white/40 dark:border-white/10 flex flex-col items-center justify-between text-center transition-all shadow-2xs group/card"
                  >
                    <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-tight truncate w-full">
                      {i === 0 ? (
                        <>
                          <span className="hidden sm:inline">Tomorrow</span>
                          <span className="sm:hidden">Tmw</span>
                        </>
                      ) : (
                        dayLabel
                      )}
                    </span>
                    <div className="my-1 scale-90 sm:scale-100 flex items-center justify-center">
                      {dayIcon}
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 font-mono text-[11px] sm:text-[11px] leading-tight font-bold">
                      <span className="text-slate-900 dark:text-white font-black">{high}°</span>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px] sm:text-[11px]">{low}°</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini summary footer */}
            <div className="text-[11px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate flex items-center justify-between">
              <span>{dailyForecast.length > 3 ? '7-day outlook' : 'Daily forecast'}</span>
              <span className="text-sky-500 dark:text-sky-400 font-bold">Details →</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1x Compact mode
  return (
    <div className={tileBaseClass(false, '', false, false)}>
      <AnimatedWeatherBackdrop condition={weatherCondition} isNight={isNight} darkMode={darkMode} />
      <div className={`absolute inset-0 pointer-events-none rounded-3xl ${darkMode ? 'bg-black/20' : 'bg-white/10'}`} />

      {/* Top row: Weather icon on left, Condition Badge on right */}
      <div className="flex items-center justify-between relative z-10">
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/80 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0">
          {weatherCondInfo.icon}
        </div>

        <span className={`text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full backdrop-blur-md border shadow-2xs ${weatherCondInfo.badgeBg}`}>
          {weatherCondInfo.name}
        </span>
      </div>

      {/* Center: Temp + High/Low pill */}
      <div className="relative z-10 my-auto py-0.5 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
          {Math.round(currentTemp)}{tempUnit}
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-black/5 dark:border-white/10 text-[11px] font-mono font-bold">
          <span className="text-amber-500 flex items-center gap-0.5">
            <ArrowUp size={10} weight="bold" />{Math.round(weatherHigh)}°
          </span>
          <span className="opacity-30">|</span>
          <span className="text-sky-500 flex items-center gap-0.5">
            <ArrowDown size={10} weight="bold" />{Math.round(weatherLow)}°
          </span>
        </div>
      </div>

      {/* Bottom: Title & Telemetry summary with Chevron */}
      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Weather
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span className="flex items-center gap-1.5 truncate">
            <Drop size={11} weight="fill" className="text-sky-400 shrink-0" />
            <span>{humidity}%</span>
            {typeof windSpeed === 'number' && (
              <>
                <span>•</span>
                <Wind size={11} weight="bold" className="text-teal-400 shrink-0" />
                <span className="truncate">{Math.round(windSpeed)} {windUnit}</span>
              </>
            )}
          </span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
