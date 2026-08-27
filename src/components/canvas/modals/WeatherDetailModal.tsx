/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  CalendarBlank,
  MapPin,
  Sparkle
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';
import { getWeatherConditionInfo } from '../../weather/weatherIcons';
import AnimatedWeatherBackdrop from '../../weather/AnimatedWeatherBackdrop';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import CustomDropdown from '../../ui/CustomDropdown';
import { getDailyForecast } from '../../../lib/weatherForecast';

interface WeatherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity?: HAEntity | null;
}

export default function WeatherDetailModal({
  isOpen,
  onClose,
  entity
}: WeatherDetailModalProps) {
  const domainGroups = useAutoLayoutStore(s => s.domainGroups);
  const selectedWeatherEntityId = useAutoLayoutStore(s => s.selectedWeatherEntityId);
  const setSelectedWeatherEntityId = useAutoLayoutStore(s => s.setSelectedWeatherEntityId);

  const weatherEntities = domainGroups['weather'] || [];
  const activeEntity = entity || weatherEntities.find(w => w.entity_id === selectedWeatherEntityId) || weatherEntities[0];

  const state = activeEntity?.state || 'partlycloudy';
  const attr: Record<string, any> = activeEntity?.attributes || {};
  const isNight = state.toLowerCase().includes('night');
  const conditionInfo = getWeatherConditionInfo(state, isNight, 28);

  const entityOptions = weatherEntities.map(w => ({
    value: w.entity_id,
    label: w.name || w.attributes?.friendly_name || w.entity_id
  }));

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

  const dailyForecast = getDailyForecast(activeEntity);
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

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={activeEntity?.attributes?.friendly_name || activeEntity?.entity_id || 'Atmospheric Radar'}
      subtitle="Meteorological Station & 7-Day Forecast"
      icon={<CloudSun size={24} weight="duotone" className="text-sky-400" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Multiple Weather Provider Selector */}
        {weatherEntities.length > 1 && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1 text-left">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin size={13} weight="duotone" className="text-sky-400" />
              Weather Source
            </span>
            <CustomDropdown
              value={activeEntity?.entity_id || weatherEntities[0].entity_id}
              onChange={(val) => setSelectedWeatherEntityId(val)}
              options={entityOptions}
              size="sm"
              placement="bottom"
            />
          </div>
        )}

        {/* Hero Card with Animated Backdrop */}
        <div className="relative rounded-3xl p-5 overflow-hidden border border-white/15 shadow-xl">
          <AnimatedWeatherBackdrop condition={state} isNight={isNight} />

          <div className="relative z-10 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                  {conditionInfo.icon}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">{activeEntity?.attributes?.friendly_name || 'Weather'}</h4>
                  <p className="text-xs text-sky-200">{conditionInfo.name}</p>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${conditionInfo.badgeBg}`}>
                {state.toUpperCase()}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white font-mono tracking-tighter">
                    {Math.round(currentTemp)}
                  </span>
                  <span className="text-xl font-bold text-white/90">{tempUnit}</span>
                </div>
                <p className="text-xs font-semibold text-white/80 mt-0.5 flex items-center gap-1">
                  <Thermometer size={13} weight="duotone" className="text-amber-300" />
                  Feels {apparentTemp.toFixed(1)}{tempUnit}
                </p>
              </div>

              <div className="text-right p-2.5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 text-xs text-white">
                <div>H: <span className="text-amber-300 font-bold">{Math.round(todayHigh)}°</span> • L: <span className="text-sky-300 font-bold">{Math.round(todayLow)}°</span></div>
                <div className="text-[11px] text-slate-300 mt-0.5 flex items-center justify-end gap-1">
                  <Drop size={11} weight="duotone" className="text-blue-400" />
                  {humidity}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Conditions Quick Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[10px] font-bold">Humidity</span>
              <Drop size={14} weight="duotone" className="text-blue-400" />
            </div>
            <p className="text-sm font-extrabold text-white font-mono">{humidity}%</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[10px] font-bold">Wind</span>
              <Wind size={14} weight="duotone" className="text-teal-400" />
            </div>
            <p className="text-sm font-extrabold text-white font-mono">{windSpeed} {windSpeedUnit}</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[10px] font-bold">Pressure</span>
              <Gauge size={14} weight="duotone" className="text-purple-400" />
            </div>
            <p className="text-sm font-extrabold text-white font-mono">{pressure}</p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-0.5">
              <span className="text-[10px] font-bold">UV</span>
              <SunHorizon size={14} weight="duotone" className="text-amber-400" />
            </div>
            <p className="text-sm font-extrabold text-white font-mono">{uvIndex.toFixed(1)}</p>
          </div>
        </div>

        {/* 7-Day Forecast */}
        {dailyForecast.length > 0 && (
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CalendarBlank size={13} weight="duotone" className="text-sky-400" />
              7-Day Forecast
            </span>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dailyForecast.map((f, idx) => {
                const dayCond = getWeatherConditionInfo(f.condition, false, 18);
                const high = Math.round(f.temperature);
                const low = Math.round(f.templow);
                const rainProb = f.precipitation_probability || 0;

                return (
                  <div key={f.datetime || idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                    <div className="w-20">
                      <p className="text-xs font-bold text-white">{formatForecastDate(f.datetime, idx)}</p>
                      <p className="text-[10px] text-slate-400 truncate">{dayCond.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {dayCond.icon}
                      {rainProb > 0 && (
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-0.5">
                          <Drop size={9} weight="fill" />
                          {rainProb}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-sky-300 font-bold">{low}°</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-amber-300 font-bold">{high}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </CardModalContainer>
  );
}
