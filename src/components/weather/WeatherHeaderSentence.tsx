/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WeatherHeaderSentence:
 * Renders a natural-language weather summary sentence with uniquely stylized badges:
 * - Dynamic Temperature Pill (Thermometer icon + temperature value)
 * - Condition Pill with animated weather icon
 * - Daily High / Low Forecast Pills
 * - Imminent Precipitation / Rain Alert Pill
 * - Air / Humidity / Wind Telemetry
 * - All action verbs and connective text placed outside the badge pills
 * - Fills 100% full width of container and opens full weather drawer on click.
 */

import React, { useMemo } from 'react';
import { 
  Thermometer, 
  TrendUp, 
  TrendDown, 
  CloudRain, 
  Sparkle,
  ArrowRight,
  Sun,
  Drop,
  Wind,
  Warning
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity } from '../../types';
import { getWeatherConditionInfo } from './weatherIcons';
import { getHourlyForecast, getDailyForecast } from '../../lib/weatherForecast';

import { haWebSocketService } from '../../services/haWebSocket';

interface WeatherHeaderSentenceProps {
  onOpenWeatherModal?: () => void;
  darkMode?: boolean;
  className?: string;
}

function computeWeatherData(activeEntity?: ResolvedEntity) {
  if (!activeEntity) {
    if (haWebSocketService.isDemo()) {
      return {
        temperature: 22,
        tempUnit: '°C',
        conditionText: 'Partly Cloudy',
        conditionInfo: getWeatherConditionInfo('partlycloudy', false, 15),
        humidity: 55,
        windSpeed: 12,
        windUnit: 'km/h',
        rainChance: undefined as number | undefined,
        trend: {
          prefix: 'conditions will',
          icon: <Sparkle size={14} weight="duotone" className="text-amber-400" />,
          keyword: 'remain pleasant',
          keywordClass: 'text-amber-500 dark:text-amber-300 font-bold',
          suffix: 'throughout the day'
        },
        highTemp: 25,
        lowTemp: 16,
        isUnavailable: false
      };
    }
    return {
      temperature: undefined as number | undefined,
      tempUnit: '°C',
      conditionText: 'Unavailable',
      conditionInfo: getWeatherConditionInfo('cloudy', false, 15),
      humidity: undefined as number | undefined,
      windSpeed: undefined as number | undefined,
      windUnit: 'km/h',
      rainChance: undefined as number | undefined,
      trend: {
        prefix: 'weather telemetry is',
        icon: <Warning size={14} weight="duotone" className="text-slate-400" />,
        keyword: 'currently unavailable',
        keywordClass: 'text-slate-500 dark:text-slate-400 font-bold',
        suffix: 'from Home Assistant'
      },
      highTemp: undefined as number | undefined,
      lowTemp: undefined as number | undefined,
      isUnavailable: true
    };
  }

  const state = activeEntity.state || 'partlycloudy';
  const attr = activeEntity.attributes || {};
  const isNight = state.toLowerCase().includes('night');
  const conditionInfo = getWeatherConditionInfo(state, isNight, 15);

  // 1. Resolve Current Temperature
  let rawTemp: number | undefined = undefined;
  if (typeof attr.temperature === 'number') {
    rawTemp = attr.temperature;
  } else if (typeof attr.current_temperature === 'number') {
    rawTemp = attr.current_temperature;
  } else if (typeof activeEntity.state === 'number') {
    rawTemp = activeEntity.state;
  } else if (typeof activeEntity.state === 'string' && !isNaN(Number(activeEntity.state))) {
    rawTemp = Number(activeEntity.state);
  }

  const temp = rawTemp !== undefined ? Math.round(rawTemp) : (haWebSocketService.isDemo() ? 22 : undefined);
  const rawUnit = attr.temperature_unit || '°C';
  const tempUnit = rawUnit.startsWith('°') ? rawUnit : `°${rawUnit}`;
  const humidity = typeof attr.humidity === 'number' ? Math.round(attr.humidity) : undefined;
  const windSpeed = typeof attr.wind_speed === 'number' ? Math.round(attr.wind_speed) : undefined;
  const windUnit = attr.wind_speed_unit || 'km/h';

  const hourly = getHourlyForecast(activeEntity);
  const daily = getDailyForecast(activeEntity);

  // 2. Resolve High & Low Temperatures
  const todayDaily = daily[0];

  let rawHigh: number | undefined = undefined;
  if (todayDaily && typeof todayDaily.temperature === 'number') {
    rawHigh = todayDaily.temperature;
  } else if (typeof attr.temperature_high === 'number') {
    rawHigh = attr.temperature_high;
  } else if (typeof attr.high_temperature === 'number') {
    rawHigh = attr.high_temperature;
  } else if (hourly.length > 0) {
    const next12 = hourly.slice(0, 12).map(h => h.temperature).filter(t => typeof t === 'number');
    if (next12.length > 0) rawHigh = Math.max(...next12);
  }

  let rawLow: number | undefined = undefined;
  if (todayDaily && typeof todayDaily.templow === 'number') {
    rawLow = todayDaily.templow;
  } else if (typeof attr.temperature_low === 'number') {
    rawLow = attr.temperature_low;
  } else if (typeof attr.low_temperature === 'number') {
    rawLow = attr.low_temperature;
  } else if (hourly.length > 0) {
    const next12 = hourly.slice(0, 12).map(h => h.temperature).filter(t => typeof t === 'number');
    if (next12.length > 0) rawLow = Math.min(...next12);
  }

  let highTemp = rawHigh !== undefined ? Math.round(rawHigh) : (haWebSocketService.isDemo() && temp !== undefined ? temp + 3 : undefined);
  let lowTemp = rawLow !== undefined ? Math.round(rawLow) : (haWebSocketService.isDemo() && temp !== undefined ? temp - 5 : undefined);

  if (highTemp !== undefined && temp !== undefined && highTemp < temp) {
    highTemp = temp;
  }
  if (lowTemp !== undefined && temp !== undefined && lowTemp > temp) {
    lowTemp = Math.min(temp, (highTemp ?? temp) - 2);
  }
  if (highTemp !== undefined && lowTemp !== undefined && highTemp < lowTemp) {
    const tmp = highTemp;
    highTemp = lowTemp;
    lowTemp = tmp;
  }

  // Analyze upcoming 6 hours for weather events
  const upcomingHours = hourly.slice(0, 6);
  
  // Check for imminent rain
  const rainHourIndex = upcomingHours.findIndex(
    h => (h.condition && (h.condition.includes('rain') || h.condition.includes('shower') || h.condition.includes('lightning') || h.condition.includes('storm'))) ||
         (h.precipitation_probability !== undefined && h.precipitation_probability >= 40)
  );

  const rainChance = upcomingHours[0]?.precipitation_probability ?? attr.precipitation_probability;

  let trend = {
    prefix: 'conditions will',
    icon: <Sparkle size={14} weight="duotone" className="text-emerald-400" /> as React.ReactNode,
    keyword: 'remain steady',
    keywordClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
    suffix: 'with comfortable weather'
  };

  if (rainHourIndex !== -1) {
    const hoursAway = rainHourIndex + 1;
    trend = {
      prefix: 'rain is',
      icon: <CloudRain size={14} weight="duotone" className="text-sky-400" />,
      keyword: 'expected',
      keywordClass: 'text-sky-600 dark:text-sky-300 font-bold',
      suffix: hoursAway <= 1 ? 'in the next hour' : `in the next ${hoursAway} hours`
    };
  } else {
    // Analyze temperature trajectory in next 3-4 hours
    const futureHour = upcomingHours[2] || upcomingHours[1];
    const futureTemp = futureHour?.temperature !== undefined ? Math.round(futureHour.temperature) : undefined;

    if (futureTemp !== undefined && futureTemp - temp >= 2) {
      trend = {
        prefix: 'temperatures are expected to',
        icon: <TrendUp size={14} weight="bold" className="text-amber-500 dark:text-amber-400" />,
        keyword: 'rise',
        keywordClass: 'text-amber-600 dark:text-amber-300 font-bold',
        suffix: `to ${futureTemp}${tempUnit} in the next 3 hours`
      };
    } else if (futureTemp !== undefined && temp - futureTemp >= 2) {
      trend = {
        prefix: 'temperatures are expected to',
        icon: <TrendDown size={14} weight="bold" className="text-sky-500 dark:text-sky-400" />,
        keyword: 'drop',
        keywordClass: 'text-sky-600 dark:text-sky-300 font-bold',
        suffix: `to ${futureTemp}${tempUnit} in the next 3 hours`
      };
    } else if (highTemp > temp && !isNight) {
      trend = {
        prefix: 'temperatures will',
        icon: <TrendUp size={14} weight="bold" className="text-amber-500 dark:text-amber-400" />,
        keyword: 'peak',
        keywordClass: 'text-amber-600 dark:text-amber-300 font-bold',
        suffix: `at ${highTemp}${tempUnit} today`
      };
    } else if (isNight) {
      trend = {
        prefix: 'temperatures will',
        icon: <TrendDown size={14} weight="bold" className="text-indigo-400" />,
        keyword: 'cool',
        keywordClass: 'text-indigo-600 dark:text-indigo-300 font-bold',
        suffix: `down to ${lowTemp}${tempUnit} overnight`
      };
    } else {
      trend = {
        prefix: 'conditions will',
        icon: <Sparkle size={14} weight="duotone" className="text-emerald-400" />,
        keyword: 'remain pleasant',
        keywordClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
        suffix: 'throughout the day'
      };
    }
  }

  return {
    temperature: temp,
    tempUnit,
    conditionText: conditionInfo.name,
    conditionInfo,
    humidity,
    windSpeed,
    windUnit,
    rainChance,
    trend,
    highTemp,
    lowTemp
  };
}

export default function WeatherHeaderSentence({
  onOpenWeatherModal,
  darkMode = true,
  className = ''
}: WeatherHeaderSentenceProps) {
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const selectedWeatherEntityId = useAutoLayoutStore((s) => s.selectedWeatherEntityId);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);

  const weatherEntities: ResolvedEntity[] = useMemo(() => {
    const fromDomain = domainGroups['weather'] || [];
    if (fromDomain.length > 0) return fromDomain;
    return Object.values(resolvedEntities).filter(
      (e) => e.domain === 'weather' || e.entity_id.startsWith('weather.')
    );
  }, [domainGroups, resolvedEntities]);

  const activeEntity: ResolvedEntity | undefined = useMemo(() => {
    if (selectedWeatherEntityId) {
      const direct = weatherEntities.find((w) => w.entity_id === selectedWeatherEntityId) || resolvedEntities[selectedWeatherEntityId];
      if (direct) return direct;
    }
    return weatherEntities[0];
  }, [weatherEntities, selectedWeatherEntityId, resolvedEntities]);

  // Dynamically compute live weather data from active entity
  const weatherData = useMemo(() => {
    return computeWeatherData(activeEntity);
  }, [activeEntity]);

  return (
    <div 
      onClick={onOpenWeatherModal}
      className={`w-full text-xs sm:text-sm font-medium leading-7 sm:leading-8 transition-all rounded-2xl group ${
        onOpenWeatherModal ? 'cursor-pointer hover:opacity-95 active:scale-[0.995]' : ''
      } ${
        darkMode ? 'text-slate-300' : 'text-slate-600'
      } ${className}`}
      title="Click to view detailed hourly & 7-day weather forecast"
    >
      {weatherData.temperature !== undefined ? (
        <>
          {/* 1. Introductory prefix */}
          <span>It is currently</span>{' '}

          {/* 2. Temperature Badge with Thermometer icon */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold border shadow-xs transition-all align-middle mx-0.5 ${
              darkMode 
                ? 'bg-linear-to-r from-rose-500/20 to-orange-500/15 border-rose-500/35 text-rose-300 shadow-rose-500/5 group-hover:border-rose-500/50' 
                : 'bg-rose-50/90 border-rose-200 text-rose-800 group-hover:bg-rose-100'
            }`}
          >
            <Thermometer size={14} weight="fill" className="text-rose-400" />
            <span className="font-mono">{weatherData.temperature}{weatherData.tempUnit}</span>
          </span>{' '}

          <span>and</span>{' '}

          {/* 3. Condition Badge with dynamic icon */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold border shadow-xs transition-all align-middle mx-0.5 ${
              darkMode 
                ? 'bg-linear-to-r from-sky-500/20 to-cyan-500/15 border-sky-500/35 text-sky-300 shadow-sky-500/5 group-hover:border-sky-500/50' 
                : 'bg-sky-50/90 border-sky-200 text-sky-800 group-hover:bg-sky-100'
            }`}
          >
            <span className="shrink-0 group-hover:scale-110 transition-transform">
              {weatherData.conditionInfo.icon}
            </span>
            <span>{weatherData.conditionText}</span>
          </span>{' '}

          {/* 4. High & Low Forecast Badges */}
          {weatherData.highTemp !== undefined && weatherData.lowTemp !== undefined && (
            <>
              <span>with a high of</span>{' '}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold border shadow-xs transition-all align-middle mx-0.5 ${
                  darkMode 
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' 
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <TrendUp size={13} weight="bold" className="text-amber-400" />
                <span>{weatherData.highTemp}{weatherData.tempUnit}</span>
              </span>{' '}

              <span>and a low of</span>{' '}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold border shadow-xs transition-all align-middle mx-0.5 ${
                  darkMode 
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}
              >
                <TrendDown size={13} weight="bold" className="text-indigo-400" />
                <span>{weatherData.lowTemp}{weatherData.tempUnit}</span>
              </span>
            </>
          )}

          {/* 5. Humidity Badge (if available) */}
          {weatherData.humidity !== undefined && (
            <>
              <span>, humidity at</span>{' '}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold border shadow-xs transition-all align-middle mx-0.5 ${
                  darkMode 
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' 
                    : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                }`}
              >
                <Drop size={13} weight="fill" className="text-cyan-400" />
                <span>{weatherData.humidity}%</span>
              </span>
            </>
          )}

          {/* 6. Trend / Rain Trajectory Statement */}
          <span>, and </span>
          {weatherData.trend.prefix && <span>{weatherData.trend.prefix} </span>}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold border align-middle mx-0.5 ${
              weatherData.trend.keyword.toLowerCase().includes('rain') || weatherData.trend.prefix.toLowerCase().includes('rain')
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 animate-pulse'
                : darkMode
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <span className="shrink-0">{weatherData.trend.icon}</span>
            <span className={weatherData.trend.keywordClass}>{weatherData.trend.keyword}</span>
          </span>
          {weatherData.trend.suffix ? <span> {weatherData.trend.suffix}.</span> : <span>.</span>}
        </>
      ) : (
        <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Warning size={15} weight="duotone" className="text-amber-500 shrink-0" />
          <span>Weather station data currently unavailable from Home Assistant.</span>
        </span>
      )}

      {/* Subtle chevron hint on hover */}
      {onOpenWeatherModal && (
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-sky-400 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-all ml-1.5 align-middle">
          <span>Forecast</span>
          <ArrowRight size={13} weight="bold" />
        </span>
      )}
    </div>
  );
}
