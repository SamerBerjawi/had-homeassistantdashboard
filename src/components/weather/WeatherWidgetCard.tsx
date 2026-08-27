/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Thermometer,
  Drop,
  Wind
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity } from '../../types';
import { getWeatherConditionInfo } from './weatherIcons';
import AnimatedWeatherBackdrop from './AnimatedWeatherBackdrop';
import CustomDropdown from '../ui/CustomDropdown';
import { getDailyForecast } from '../../lib/weatherForecast';

interface WeatherWidgetCardProps {
  onOpenDrawer?: () => void;
  darkMode?: boolean;
  className?: string;
}

export default function WeatherWidgetCard({
  onOpenDrawer,
  darkMode = true,
  className = ''
}: WeatherWidgetCardProps) {
  const domainGroups = useAutoLayoutStore(s => s.domainGroups);
  const selectedWeatherEntityId = useAutoLayoutStore(s => s.selectedWeatherEntityId);
  const setSelectedWeatherEntityId = useAutoLayoutStore(s => s.setSelectedWeatherEntityId);

  const weatherEntities: ResolvedEntity[] = domainGroups['weather'] || [];
  const activeEntity: ResolvedEntity | undefined = 
    weatherEntities.find(w => w.entity_id === selectedWeatherEntityId) || 
    weatherEntities[0];

  const entityOptions = weatherEntities.map(w => ({
    value: w.entity_id,
    label: w.name || w.attributes?.friendly_name || w.entity_id
  }));

  const state = activeEntity?.state || 'partlycloudy';
  const attr: Record<string, any> = activeEntity?.attributes || {};
  const isNight = state.toLowerCase().includes('night');
  const conditionInfo = getWeatherConditionInfo(state, isNight, 28);

  const currentTemp = typeof attr.temperature === 'number' ? attr.temperature : 22.5;
  const tempUnit = attr.temperature_unit || '°C';
  const apparentTemp = typeof attr.apparent_temperature === 'number' ? attr.apparent_temperature : currentTemp - 0.6;
  const humidity = typeof attr.humidity === 'number' ? attr.humidity : 58;
  const windSpeed = typeof attr.wind_speed === 'number' ? attr.wind_speed : 14.2;

  const dailyForecast = getDailyForecast(activeEntity);
  const todayForecast = dailyForecast[0];
  const todayHigh = todayForecast?.temperature ?? Math.round(currentTemp + 3);
  const todayLow = todayForecast?.templow ?? Math.round(currentTemp - 5);

  return (
    <div
      onClick={onOpenDrawer}
      className={`group relative rounded-3xl p-5 overflow-hidden border shadow-xl transition-all duration-300 cursor-pointer hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] ${
        darkMode
          ? 'bg-slate-900/90 border-slate-700/60 hover:border-sky-500/50'
          : 'bg-white/90 border-slate-200/90 hover:border-sky-400 shadow-slate-200/60'
      } ${className}`}
    >
      {/* Dynamic Animated Condition Backdrop */}
      <AnimatedWeatherBackdrop condition={state} isNight={isNight} darkMode={darkMode} />

      {/* Main Content (Layered on top with relative z-10) */}
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Top Header: Location, Condition & Entity Selector */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-md border border-slate-200/50 dark:border-white/20 shadow-xs group-hover:rotate-6 transition-transform">
              {conditionInfo.icon}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                {activeEntity?.name || 'Local Weather'}
              </h4>
              <p className="text-xs text-sky-700 dark:text-sky-200 font-semibold">
                {conditionInfo.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {weatherEntities.length > 1 && (
              <div className="w-32">
                <CustomDropdown
                  value={activeEntity?.entity_id || weatherEntities[0].entity_id}
                  onChange={(val) => setSelectedWeatherEntityId(val)}
                  options={entityOptions}
                  size="sm"
                  placement="bottom"
                />
              </div>
            )}
          </div>
        </div>

        {/* Center Temperature & Atmospheric Metrics */}
        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter font-mono drop-shadow-xs">
                {Math.round(currentTemp)}
              </span>
              <span className="text-xl font-bold text-slate-700 dark:text-white/90">
                {tempUnit}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-white/80 mt-0.5 flex items-center gap-1">
              <Thermometer size={12} weight="duotone" className="text-amber-500 dark:text-amber-300" />
              Feels like {apparentTemp.toFixed(1)}{tempUnit}
            </p>
          </div>

          {/* Mini Atmospheric Pill Box */}
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/15 text-xs text-slate-800 dark:text-white shadow-xs">
            <div className="flex items-center gap-1 font-mono">
              <span className="text-amber-600 dark:text-amber-300 font-bold">H:{Math.round(todayHigh)}°</span>
              <span className="opacity-40">•</span>
              <span className="text-sky-600 dark:text-sky-300 font-bold">L:{Math.round(todayLow)}°</span>
            </div>
            <div className="w-px h-3 bg-slate-300 dark:bg-white/20" />
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Drop size={12} weight="duotone" className="text-blue-500 dark:text-blue-400" />
              <span>{humidity}%</span>
            </div>
            <div className="w-px h-3 bg-slate-300 dark:bg-white/20" />
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Wind size={12} weight="duotone" className="text-teal-500 dark:text-teal-400" />
              <span>{Math.round(windSpeed)}</span>
            </div>
          </div>
        </div>

        {/* 3-Day Mini Forecast Preview Bar */}
        {dailyForecast.length > 0 && (
          <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/15 grid grid-cols-3 gap-2">
            {dailyForecast.slice(0, 3).map((f, idx) => {
              const dayCond = getWeatherConditionInfo(f.condition, false, 16);
              const high = Math.round(f.temperature);
              const low = Math.round(f.templow);
              const dayLabel = idx === 0 ? 'Today' : (idx === 1 ? 'Tomorrow' : new Date(f.datetime).toLocaleDateString(undefined, { weekday: 'short' }));

              return (
                <div key={f.datetime || idx} className="p-2 rounded-xl bg-white/75 dark:bg-white/10 backdrop-blur-xs border border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs text-slate-800 dark:text-white shadow-2xs">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-300 font-medium">{dayLabel}</p>
                    <p className="font-mono font-bold text-xs">{high}° / <span className="text-sky-600 dark:text-sky-300">{low}°</span></p>
                  </div>
                  <div className="shrink-0">
                    {dayCond.icon}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
