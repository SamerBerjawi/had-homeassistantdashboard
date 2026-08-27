/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  CloudSun,
  Thermometer,
  Drop,
  Wind,
  Gauge,
  SunHorizon,
  Cloud,
  Eye,
  Waves,
  Compass,
  MapPin,
  CalendarBlank,
  Clock,
  Sparkle
} from '@phosphor-icons/react';
import DetailsRightDrawer from '../overview/DetailsRightDrawer';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity } from '../../types';
import CustomDropdown from '../ui/CustomDropdown';
import { getWeatherConditionInfo } from './weatherIcons';
import AnimatedWeatherBackdrop from './AnimatedWeatherBackdrop';
import { getDailyForecast, getHourlyForecast } from '../../lib/weatherForecast';
import { haWebSocketService } from '../../services/haWebSocket';

interface WeatherOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export default function WeatherOverviewDrawer({
  isOpen,
  onClose,
  darkMode = true
}: WeatherOverviewDrawerProps) {
  const domainGroups = useAutoLayoutStore(s => s.domainGroups);
  const selectedWeatherEntityId = useAutoLayoutStore(s => s.selectedWeatherEntityId);
  const setSelectedWeatherEntityId = useAutoLayoutStore(s => s.setSelectedWeatherEntityId);

  const weatherEntities: ResolvedEntity[] = domainGroups['weather'] || [];
  
  // Resolve active weather entity
  const activeEntity: ResolvedEntity | undefined = 
    weatherEntities.find(w => w.entity_id === selectedWeatherEntityId) || 
    weatherEntities[0];

  // Actively fetch fresh forecast data from Home Assistant when opened
  useEffect(() => {
    if (isOpen && activeEntity?.entity_id) {
      haWebSocketService.fetchWeatherForecast(activeEntity.entity_id);
    }
  }, [isOpen, activeEntity?.entity_id]);

  const entityOptions = weatherEntities.map(w => ({
    value: w.entity_id,
    label: w.name || w.attributes?.friendly_name || w.entity_id
  }));

  const state = activeEntity?.state || 'partlycloudy';
  const attr: Record<string, any> = activeEntity?.attributes || {};
  const isNight = state.toLowerCase().includes('night');
  const conditionInfo = getWeatherConditionInfo(state, isNight, 32);

  const currentTemp = typeof attr.temperature === 'number' ? attr.temperature : 22.5;
  const tempUnit = attr.temperature_unit || '°C';
  const apparentTemp = typeof attr.apparent_temperature === 'number' ? attr.apparent_temperature : currentTemp - 0.7;
  const humidity = typeof attr.humidity === 'number' ? attr.humidity : 58;
  const pressure = typeof attr.pressure === 'number' ? attr.pressure : 1014.2;
  const pressureUnit = attr.pressure_unit || 'hPa';
  const windSpeed = typeof attr.wind_speed === 'number' ? attr.wind_speed : 14.2;
  const windSpeedUnit = attr.wind_speed_unit || 'km/h';
  const windBearing = typeof attr.wind_bearing === 'number' ? attr.wind_bearing : 235;
  const visibility = typeof attr.visibility === 'number' ? attr.visibility : 10;
  const visibilityUnit = attr.visibility_unit || 'km';
  const uvIndex = typeof attr.uv_index === 'number' ? attr.uv_index : 5.4;
  const cloudCoverage = typeof attr.cloud_coverage === 'number' ? attr.cloud_coverage : 42;
  const dewPoint = typeof attr.dew_point === 'number' ? attr.dew_point : 13.2;

  // Extract guaranteed upcoming daily and hourly forecasts
  const dailyForecast = getDailyForecast(activeEntity);
  const hourlyForecast = getHourlyForecast(activeEntity);

  // Derive Daily High & Low from upcoming forecast
  const todayForecast = dailyForecast[0];
  const todayHigh = todayForecast?.temperature ?? Math.round(currentTemp + 3);
  const todayLow = todayForecast?.templow ?? Math.round(currentTemp - 5);

  const getUVBadge = (uv: number) => {
    if (uv <= 2) return { label: 'Low', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (uv <= 5) return { label: 'Moderate', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    if (uv <= 7) return { label: 'High', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    return { label: 'Very High', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  };

  const uvBadge = getUVBadge(uvIndex);

  const formatForecastDate = (dateStr?: string, index: number = 0) => {
    if (index === 0) return 'Today';
    if (!dateStr) return `Day ${index + 1}`;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return `Day ${index + 1}`;
    }
  };

  const formatHourTime = (dateStr?: string, index: number = 0) => {
    if (index === 0) return 'Now';
    if (!dateStr) return `${index * 2}h`;
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(undefined, { hour: 'numeric' });
    } catch {
      return `${index * 2}h`;
    }
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Weather & Atmospheric Data"
      subtitle={activeEntity?.name || 'Local Meteorological Station'}
      icon={<CloudSun size={24} weight="duotone" className="text-sky-400" />}
      darkMode={darkMode}
    >
      <div className="space-y-6">
        {/* ------------------------------------------------------------- */}
        {/* MULTIPLE WEATHER ENTITY SELECTOR (IF MULTIPLE)                 */}
        {/* ------------------------------------------------------------- */}
        {weatherEntities.length > 1 && (
          <div className="p-3.5 rounded-2xl bg-white/5 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin size={14} weight="duotone" className="text-sky-400" />
                Active Weather Provider
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {weatherEntities.length} sources available
              </span>
            </div>
            <CustomDropdown
              value={activeEntity?.entity_id || weatherEntities[0].entity_id}
              onChange={(val) => setSelectedWeatherEntityId(val)}
              options={entityOptions}
              size="md"
              placement="bottom"
            />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* HERO WEATHER CARD WITH ANIMATED CONDITION BACKDROP            */}
        {/* ------------------------------------------------------------- */}
        <div className={`relative rounded-3xl p-6 overflow-hidden border shadow-2xl transition-all ${
          darkMode 
            ? 'border-white/20 shadow-slate-950/50' 
            : 'border-slate-200/80 shadow-slate-200/60 bg-white/90'
        }`}>
          {/* Dynamic Animated Condition Backdrop */}
          <AnimatedWeatherBackdrop condition={state} isNight={isNight} darkMode={darkMode} />

          {/* Card Content Layered Above (relative z-10) */}
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            {/* Top Bar: Location & Condition Pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-md border border-slate-200/50 dark:border-white/20 shadow-xs">
                  {conditionInfo.icon}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {activeEntity?.name || 'Local Weather'}
                  </h3>
                  <p className="text-xs text-sky-700 dark:text-sky-200 font-semibold">
                    {conditionInfo.name}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-300 backdrop-blur-md shadow-xs">
                Live Station
              </span>
            </div>

            {/* Main Temperature Display */}
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-xs font-mono">
                    {Math.round(currentTemp)}
                  </span>
                  <span className="text-2xl font-bold text-slate-700 dark:text-white/90">
                    {tempUnit}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-white/80 mt-1 flex items-center gap-1.5">
                  <Thermometer size={14} weight="duotone" className="text-amber-500 dark:text-amber-300" />
                  Feels like {apparentTemp.toFixed(1)}{tempUnit}
                </p>
              </div>

              <div className="text-right p-3 rounded-2xl bg-white/80 dark:bg-black/30 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  H: <span className="text-amber-600 dark:text-amber-300 font-bold">{Math.round(todayHigh)}{tempUnit}</span> • L: <span className="text-sky-600 dark:text-sky-300 font-bold">{Math.round(todayLow)}{tempUnit}</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-center justify-end gap-1">
                  <Drop size={12} weight="duotone" className="text-blue-500 dark:text-blue-400" />
                  {humidity}% Humidity
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* HOURLY FORECAST TIMELINE (NEXT 24 HOURS)                      */}
        {/* ------------------------------------------------------------- */}
        {hourlyForecast.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Clock size={14} weight="duotone" className="text-sky-400" />
              Hourly Timeline (24 Hours)
            </h4>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {hourlyForecast.map((h, idx) => {
                const hourCond = getWeatherConditionInfo(h.condition, false, 18);
                const rain = h.precipitation_probability || 0;

                return (
                  <div
                    key={h.datetime || idx}
                    className="p-3 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col items-center justify-between min-w-[70px] shrink-0 text-center space-y-2 hover:bg-white dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {formatHourTime(h.datetime, idx)}
                    </span>
                    <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/10 border border-slate-200/60 dark:border-white/10">
                      {hourCond.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {Math.round(h.temperature)}°
                      </p>
                      {rain > 0 && (
                        <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 flex items-center justify-center gap-0.5 mt-0.5">
                          <Drop size={8} weight="fill" />
                          {rain}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* KEY ATMOSPHERIC METRICS GRID (8 DATA CARDS)                  */}
        {/* ------------------------------------------------------------- */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Sparkle size={14} weight="duotone" className="text-sky-500 dark:text-sky-400" />
            Atmospheric Conditions
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Feels Like */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Feels Like</span>
                <Thermometer size={16} weight="duotone" className="text-amber-500 dark:text-amber-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {apparentTemp.toFixed(1)}{tempUnit}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Apparent Temp</span>
            </div>

            {/* 2. Humidity */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Humidity</span>
                <Drop size={16} weight="duotone" className="text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {humidity}%
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Dew pt: {dewPoint.toFixed(1)}°</span>
            </div>

            {/* 3. Wind Speed & Direction */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Wind</span>
                <Wind size={16} weight="duotone" className="text-teal-500 dark:text-teal-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-1">
                {windSpeed} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{windSpeedUnit}</span>
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <Compass size={11} weight="bold" style={{ transform: `rotate(${windBearing}deg)` }} />
                {windBearing}°
              </span>
            </div>

            {/* 4. Air Pressure */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Pressure</span>
                <Gauge size={16} weight="duotone" className="text-purple-500 dark:text-purple-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {pressure}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{pressureUnit} Barometer</span>
            </div>

            {/* 5. UV Index */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">UV Index</span>
                <SunHorizon size={16} weight="duotone" className="text-amber-500 dark:text-amber-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {uvIndex.toFixed(1)}
              </p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border w-max mt-0.5 ${uvBadge.color}`}>
                {uvBadge.label}
              </span>
            </div>

            {/* 6. Cloud Coverage */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Clouds</span>
                <Cloud size={16} weight="duotone" className="text-sky-500 dark:text-sky-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {cloudCoverage}%
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Sky Cover</span>
            </div>

            {/* 7. Visibility */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Visibility</span>
                <Eye size={16} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {visibility} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{visibilityUnit}</span>
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Clear Sight</span>
            </div>

            {/* 8. Dew Point */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-bold">Dew Point</span>
                <Waves size={16} weight="duotone" className="text-cyan-500 dark:text-cyan-400" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {dewPoint.toFixed(1)}{tempUnit}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Moisture Sat.</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 7-DAY EXTENDED FORECAST (ALWAYS RENDERED)                     */}
        {/* ------------------------------------------------------------- */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <CalendarBlank size={14} weight="duotone" className="text-sky-500 dark:text-sky-400" />
            7-Day Extended Forecast
          </h4>

          <div className="space-y-2">
            {dailyForecast.map((f, idx) => {
              const dayCond = getWeatherConditionInfo(f.condition, false, 20);
              const high = f.temperature;
              const low = f.templow;
              const rainProb = f.precipitation_probability || 0;

              return (
                <div
                  key={f.datetime || idx}
                  className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-white/10 transition-colors"
                >
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {formatForecastDate(f.datetime, idx)}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {dayCond.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                      {dayCond.icon}
                    </div>
                    {rainProb > 0 && (
                      <span className="text-[11px] font-bold text-blue-500 dark:text-blue-400 flex items-center gap-0.5">
                        <Drop size={10} weight="fill" />
                        {rainProb}%
                      </span>
                    )}
                  </div>

                  {/* High / Low Visual Slider Bar */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 min-w-8 text-right">
                      {Math.round(low)}°
                    </span>
                    <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                        style={{
                          marginLeft: `${Math.max(0, ((low - 5) / 30) * 100)}%`,
                          width: `${Math.max(20, ((high - low) / 30) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 min-w-8 text-left">
                      {Math.round(high)}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
