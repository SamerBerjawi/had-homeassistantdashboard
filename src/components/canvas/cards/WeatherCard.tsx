/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Wind, Drop, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { CardConfig, WeatherBackdropType } from '../../../types/canvas';
import { HAEntity } from '../../../types';
import AnimatedWeatherBackdrop from '../../weather/AnimatedWeatherBackdrop';
import { getWeatherConditionInfo } from '../../weather/weatherIcons';
import { getDailyForecast } from '../../../lib/weatherForecast';

interface WeatherCardProps {
  config: CardConfig;
  entity?: HAEntity;
  backdropType?: WeatherBackdropType;
  darkMode?: boolean;
  onOpenModal: () => void;
}

export default function WeatherCard({
  config,
  entity,
  darkMode = true,
  onOpenModal
}: WeatherCardProps) {
  const state = entity?.state || 'partlycloudy';
  const attr: Record<string, any> = entity?.attributes || {};
  const isNight = state.toLowerCase().includes('night');
  const conditionInfo = getWeatherConditionInfo(state, isNight, 26);

  const title = config.title || attr.friendly_name || entity?.entity_id || 'Weather Radar';
  const temp = typeof attr.temperature === 'number' ? Math.round(attr.temperature) : undefined;
  const tempUnit = attr.temperature_unit || '°C';
  const humidity = typeof attr.humidity === 'number' ? attr.humidity : undefined;
  const windSpeed = typeof attr.wind_speed === 'number' ? attr.wind_speed : undefined;
  const windSpeedUnit = attr.wind_speed_unit || 'km/h';

  const dailyForecast = getDailyForecast(entity);
  const todayForecast = dailyForecast[0];
  const todayHigh = typeof todayForecast?.temperature === 'number' ? todayForecast.temperature : undefined;
  const todayLow = typeof todayForecast?.templow === 'number' ? todayForecast.templow : undefined;

  return (
    <div 
      onClick={onOpenModal}
      className={`relative w-full h-full p-4 flex flex-col justify-between overflow-hidden rounded-3xl cursor-pointer group ${
        darkMode ? 'text-white' : 'text-slate-900 shadow-slate-200/60'
      }`}
    >
      {/* Contained Animated Atmospheric Weather Backdrop */}
      <AnimatedWeatherBackdrop condition={state} isNight={isNight} darkMode={darkMode} />

      {/* Atmospheric Contrast Overlay */}
      <div className={`absolute inset-0 pointer-events-none rounded-3xl ${
        darkMode ? 'bg-black/25' : 'bg-white/10'
      }`} />

      {/* Top row */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-md border border-slate-200/40 dark:border-white/20 shadow-xs group-hover:rotate-6 transition-transform">
            {conditionInfo.icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate drop-shadow-xs">{title}</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-200 font-medium truncate drop-shadow-xs">{conditionInfo.name}</p>
          </div>
        </div>

        {/* High / Low pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/15 text-[11px] font-mono text-slate-800 dark:text-slate-200 shadow-xs">
          <span className="flex items-center text-amber-600 dark:text-amber-300 font-bold">
            <ArrowUp size={11} weight="bold" />{todayHigh !== undefined ? `${Math.round(todayHigh)}°` : '--'}
          </span>
          <span className="opacity-40">|</span>
          <span className="flex items-center text-sky-600 dark:text-cyan-300 font-bold">
            <ArrowDown size={11} weight="bold" />{todayLow !== undefined ? `${Math.round(todayLow)}°` : '--'}
          </span>
        </div>
      </div>

      {/* Center: Large temperature + 3-day forecast pills */}
      <div className="relative z-10 flex items-center justify-between my-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none drop-shadow-xs">
            {temp !== undefined ? temp : '--'}
          </span>
          <span className="text-xs text-slate-700 dark:text-slate-300 font-bold font-mono">{tempUnit}</span>
        </div>

        {/* 3-day mini forecast */}
        {dailyForecast.length > 0 && (
          <div className="flex items-center gap-1.5">
            {dailyForecast.slice(0, 3).map((f, i) => {
              const dayLabel = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : new Date(f.datetime).toLocaleDateString(undefined, { weekday: 'short' }));
              const high = Math.round(f.temperature);
              const low = Math.round(f.templow);

              return (
                <div
                  key={f.datetime || i}
                  className="flex flex-col items-center px-2 py-1 rounded-xl bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/15 text-center shadow-xs"
                >
                  <span className="text-[9px] text-slate-500 dark:text-slate-300 font-bold uppercase">{dayLabel.slice(0, 3)}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono my-0.5">{high}°</span>
                  <span className="text-[9px] text-sky-600 dark:text-slate-300 font-mono">{low}°</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom stats: Wind & Humidity */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-200 pt-1.5 border-t border-slate-200/60 dark:border-white/15">
        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
          <Wind size={13} weight="duotone" className="text-teal-600 dark:text-sky-300" /> {windSpeed !== undefined ? `${windSpeed} ${windSpeedUnit}` : '--'}
        </span>
        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
          <Drop size={13} weight="duotone" className="text-blue-600 dark:text-cyan-300" /> {humidity !== undefined ? `${humidity}% Humidity` : '--'}
        </span>
      </div>
    </div>
  );
}
