/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WeatherHeaderSentence:
 * Renders a friendly, fun, natural-language weather summary sentence with dynamic inline icons.
 *
 * Example:
 * "The temperature today is 🌡️ 22°, it is currently ☀️ Sunny. Temperatures are expected to rise to 25° in the next 3 hours."
 */

import React, { useMemo } from 'react';
import { 
  ThermometerSimple, 
  TrendUp, 
  TrendDown, 
  CloudRain, 
  Sparkle,
  ArrowRight
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity } from '../../types';
import { getWeatherConditionInfo } from './weatherIcons';
import { getHourlyForecast, getDailyForecast } from '../../lib/weatherForecast';

interface WeatherHeaderSentenceProps {
  onOpenWeatherModal?: () => void;
  darkMode?: boolean;
  className?: string;
}

export default function WeatherHeaderSentence({
  onOpenWeatherModal,
  darkMode = true,
  className = ''
}: WeatherHeaderSentenceProps) {
  const domainGroups = useAutoLayoutStore(s => s.domainGroups);
  const selectedWeatherEntityId = useAutoLayoutStore(s => s.selectedWeatherEntityId);

  const weatherEntities: ResolvedEntity[] = domainGroups['weather'] || [];
  const activeEntity: ResolvedEntity | undefined = 
    weatherEntities.find(w => w.entity_id === selectedWeatherEntityId) || 
    weatherEntities[0];

  const weatherData = useMemo(() => {
    // Default fallback
    if (!activeEntity) {
      return {
        temperature: 22,
        tempUnit: '°C',
        conditionText: 'Partly Cloudy',
        conditionInfo: getWeatherConditionInfo('partlycloudy', false, 16),
        trend: {
          prefix: 'Conditions will',
          icon: <Sparkle size={15} weight="duotone" className="text-amber-400" />,
          keyword: 'remain pleasant',
          keywordClass: 'text-amber-500 dark:text-amber-300 font-bold',
          suffix: 'throughout the day.'
        },
        highTemp: 25,
        lowTemp: 16
      };
    }

    const state = activeEntity.state || 'partlycloudy';
    const attr = activeEntity.attributes || {};
    const isNight = state.toLowerCase().includes('night');
    const conditionInfo = getWeatherConditionInfo(state, isNight, 16);

    const temp = typeof attr.temperature === 'number' ? Math.round(attr.temperature) : 22;
    const rawUnit = attr.temperature_unit || '°';
    const tempUnit = rawUnit.startsWith('°') ? rawUnit : `°${rawUnit}`;

    const hourly = getHourlyForecast(activeEntity);
    const daily = getDailyForecast(activeEntity);

    const todayDaily = daily[0];
    const highTemp = todayDaily?.temperature ?? temp + 3;
    const lowTemp = todayDaily?.templow ?? temp - 5;

    // Analyze upcoming 6 hours for weather events
    const upcomingHours = hourly.slice(0, 6);
    
    // Check for imminent rain
    const rainHourIndex = upcomingHours.findIndex(
      h => (h.condition && (h.condition.includes('rain') || h.condition.includes('shower') || h.condition.includes('lightning') || h.condition.includes('storm'))) ||
           (h.precipitation_probability !== undefined && h.precipitation_probability >= 40)
    );

    let trend = {
      prefix: 'Temperatures will',
      icon: <Sparkle size={15} weight="duotone" className="text-emerald-400" /> as React.ReactNode,
      keyword: 'remain steady',
      keywordClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
      suffix: 'with comfortable conditions.'
    };

    if (rainHourIndex !== -1) {
      const hoursAway = rainHourIndex + 1;
      trend = {
        prefix: '',
        icon: <CloudRain size={15} weight="duotone" className="text-sky-400 animate-bounce" />,
        keyword: 'Rain',
        keywordClass: 'text-sky-600 dark:text-sky-400 font-bold',
        suffix: hoursAway <= 1 ? 'is expected in the next hour.' : `is expected in the next ${hoursAway} hours.`
      };
    } else {
      // Analyze temperature trajectory in next 3-4 hours
      const futureHour = upcomingHours[2] || upcomingHours[1];
      const futureTemp = futureHour?.temperature;

      if (futureTemp !== undefined && futureTemp - temp >= 2) {
        trend = {
          prefix: 'Temperatures are expected to',
          icon: <TrendUp size={15} weight="bold" className="text-amber-500 dark:text-amber-400" />,
          keyword: 'rise',
          keywordClass: 'text-amber-600 dark:text-amber-300 font-bold',
          suffix: `to ${futureTemp}${tempUnit} in the next 3 hours.`
        };
      } else if (futureTemp !== undefined && temp - futureTemp >= 2) {
        trend = {
          prefix: 'Temperatures are expected to',
          icon: <TrendDown size={15} weight="bold" className="text-sky-500 dark:text-sky-400" />,
          keyword: 'drop',
          keywordClass: 'text-sky-600 dark:text-sky-300 font-bold',
          suffix: `to ${futureTemp}${tempUnit} in the next 3 hours.`
        };
      } else if (highTemp > temp && !isNight) {
        trend = {
          prefix: 'Temperatures are expected to',
          icon: <TrendUp size={15} weight="bold" className="text-amber-500 dark:text-amber-400" />,
          keyword: 'rise',
          keywordClass: 'text-amber-600 dark:text-amber-300 font-bold',
          suffix: `to reach a high of ${highTemp}${tempUnit} today.`
        };
      } else if (isNight) {
        trend = {
          prefix: 'Temperatures are expected to',
          icon: <TrendDown size={15} weight="bold" className="text-indigo-400" />,
          keyword: 'drop',
          keywordClass: 'text-indigo-600 dark:text-indigo-300 font-bold',
          suffix: `to ${lowTemp}${tempUnit} overnight.`
        };
      } else {
        trend = {
          prefix: 'Temperatures will',
          icon: <Sparkle size={15} weight="duotone" className="text-emerald-400" />,
          keyword: 'remain steady',
          keywordClass: 'text-emerald-600 dark:text-emerald-400 font-bold',
          suffix: 'with comfortable conditions.'
        };
      }
    }

    return {
      temperature: temp,
      tempUnit,
      conditionText: conditionInfo.name,
      conditionInfo,
      trend,
      highTemp,
      lowTemp
    };
  }, [activeEntity]);

  return (
    <div 
      onClick={onOpenWeatherModal}
      className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed transition-all rounded-2xl group ${
        onOpenWeatherModal ? 'cursor-pointer hover:opacity-95 active:scale-[0.99]' : ''
      } ${
        darkMode ? 'text-slate-300' : 'text-slate-600'
      } ${className}`}
      title="Click to view complete hourly & 7-day weather forecast"
    >
      {/* 1. Introductory prefix */}
      <span>The temperature today is</span>

      {/* 2. Temperature Badge with Thermometer icon */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold border transition-colors shadow-xs ${
        darkMode 
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 group-hover:bg-amber-500/25' 
          : 'bg-amber-50 border-amber-200 text-amber-800 group-hover:bg-amber-100'
      }`}>
        <ThermometerSimple size={14} weight="bold" className="text-amber-500" />
        <span className="font-mono">{weatherData.temperature}{weatherData.tempUnit}</span>
      </span>

      <span>, it is currently</span>

      {/* 3. Condition Badge with animated condition icon */}
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold border transition-colors shadow-xs ${
        darkMode 
          ? 'bg-sky-500/15 border-sky-500/30 text-sky-300 group-hover:bg-sky-500/25' 
          : 'bg-sky-50 border-sky-200 text-sky-800 group-hover:bg-sky-100'
      }`}>
        <span className="shrink-0 group-hover:scale-110 transition-transform">
          {weatherData.conditionInfo.icon}
        </span>
        <span>{weatherData.conditionText}</span>
      </span>

      <span>.</span>

      {/* 4. Forecast Trend Statement with Icon before the word (rise/drop/rain/steady) */}
      <span className="inline-flex flex-wrap items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
        {weatherData.trend.prefix && <span>{weatherData.trend.prefix}</span>}
        <span className="inline-flex items-center gap-1">
          <span className="shrink-0">{weatherData.trend.icon}</span>
          <span className={weatherData.trend.keywordClass}>{weatherData.trend.keyword}</span>
        </span>
        {weatherData.trend.suffix && <span>{weatherData.trend.suffix}</span>}
      </span>

      {/* Subtle chevron hint on hover */}
      {onOpenWeatherModal && (
        <span className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-500/80 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all ml-1">
          <span>More</span>
          <ArrowRight size={12} weight="bold" />
        </span>
      )}
    </div>
  );
}
