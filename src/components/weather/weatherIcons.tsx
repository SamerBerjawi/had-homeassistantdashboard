/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sun,
  MoonStars,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  CloudFog,
  Sparkle
} from '@phosphor-icons/react';

export interface WeatherConditionInfo {
  code: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bgGradient: string;
  badgeBg: string;
  isDarkTheme?: boolean;
}

export function getWeatherConditionInfo(
  condition?: string | null,
  isNight: boolean = false,
  iconSize: number = 24
): WeatherConditionInfo {
  const norm = (condition || '').toLowerCase().trim().replace(/_/g, '-');

  switch (norm) {
    case 'sunny':
    case 'clear':
      if (isNight) {
        return {
          code: 'clear-night',
          name: 'Clear Night',
          icon: <MoonStars size={iconSize} weight="duotone" className="text-indigo-300" />,
          color: '#818cf8',
          gradient: 'from-indigo-950 via-slate-900 to-slate-950',
          bgGradient: 'from-indigo-900/40 via-slate-900/40 to-slate-950/60',
          badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
        };
      }
      return {
        code: 'sunny',
        name: 'Sunny & Clear',
        icon: <Sun size={iconSize} weight="duotone" className="text-amber-400" />,
        color: '#f59e0b',
        gradient: 'from-amber-500/30 via-orange-500/20 to-sky-900/40',
        bgGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      };

    case 'clear-night':
      return {
        code: 'clear-night',
        name: 'Clear Night',
        icon: <MoonStars size={iconSize} weight="duotone" className="text-indigo-300" />,
        color: '#818cf8',
        gradient: 'from-indigo-950 via-slate-900 to-slate-950',
        bgGradient: 'from-indigo-900/40 via-slate-900/40 to-slate-950/60',
        badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      };

    case 'partlycloudy':
    case 'partly-cloudy':
    case 'partly-cloudy-day':
      if (isNight) {
        return {
          code: 'partlycloudy-night',
          name: 'Partly Cloudy Night',
          icon: <CloudMoon size={iconSize} weight="duotone" className="text-indigo-300" />,
          color: '#818cf8',
          gradient: 'from-slate-900 via-indigo-950 to-slate-950',
          bgGradient: 'from-indigo-900/30 via-slate-900/30 to-transparent',
          badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
        };
      }
      return {
        code: 'partlycloudy',
        name: 'Partly Cloudy',
        icon: <CloudSun size={iconSize} weight="duotone" className="text-sky-400" />,
        color: '#38bdf8',
        gradient: 'from-sky-500/25 via-indigo-500/15 to-slate-900/40',
        bgGradient: 'from-sky-500/20 via-slate-800/30 to-transparent',
        badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      };

    case 'cloudy':
    case 'overcast':
      return {
        code: 'cloudy',
        name: 'Cloudy / Overcast',
        icon: <Cloud size={iconSize} weight="duotone" className="text-slate-300" />,
        color: '#94a3b8',
        gradient: 'from-slate-800/60 via-slate-900/80 to-slate-950',
        bgGradient: 'from-slate-700/30 via-slate-800/30 to-transparent',
        badgeBg: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
      };

    case 'rainy':
    case 'rain':
    case 'drizzle':
    case 'showers':
      return {
        code: 'rainy',
        name: 'Rain Showers',
        icon: <CloudRain size={iconSize} weight="duotone" className="text-blue-400" />,
        color: '#3b82f6',
        gradient: 'from-blue-900/50 via-slate-900/80 to-slate-950',
        bgGradient: 'from-blue-600/25 via-slate-900/40 to-transparent',
        badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      };

    case 'pouring':
    case 'heavy-rain':
      return {
        code: 'pouring',
        name: 'Heavy Downpour',
        icon: <CloudRain size={iconSize} weight="fill" className="text-blue-400" />,
        color: '#2563eb',
        gradient: 'from-blue-950 via-slate-950 to-black',
        bgGradient: 'from-blue-700/30 via-slate-950/60 to-transparent',
        badgeBg: 'bg-blue-600/20 text-blue-200 border-blue-500/40'
      };

    case 'lightning':
    case 'lightning-rainy':
    case 'thunderstorm':
      return {
        code: 'thunderstorm',
        name: 'Thunderstorm',
        icon: <CloudLightning size={iconSize} weight="duotone" className="text-amber-400" />,
        color: '#f59e0b',
        gradient: 'from-purple-950/70 via-slate-950 to-black',
        bgGradient: 'from-amber-500/20 via-purple-900/40 to-slate-950/80',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      };

    case 'snowy':
    case 'snow':
    case 'snowy-rainy':
    case 'flurries':
      return {
        code: 'snowy',
        name: 'Snow Flurries',
        icon: <CloudSnow size={iconSize} weight="duotone" className="text-cyan-200" />,
        color: '#a5f3fc',
        gradient: 'from-cyan-900/40 via-slate-900 to-slate-950',
        bgGradient: 'from-cyan-500/20 via-slate-800/40 to-transparent',
        badgeBg: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30'
      };

    case 'windy':
    case 'wind':
    case 'breezy':
      return {
        code: 'windy',
        name: 'Breezy & Windy',
        icon: <Wind size={iconSize} weight="duotone" className="text-teal-300" />,
        color: '#2dd4bf',
        gradient: 'from-teal-900/30 via-slate-900 to-slate-950',
        bgGradient: 'from-teal-500/20 via-slate-800/30 to-transparent',
        badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
      };

    case 'fog':
    case 'mist':
    case 'haze':
    case 'smoke':
      return {
        code: 'fog',
        name: 'Misty & Foggy',
        icon: <CloudFog size={iconSize} weight="duotone" className="text-slate-400" />,
        color: '#94a3b8',
        gradient: 'from-slate-800/70 via-slate-900 to-slate-950',
        bgGradient: 'from-slate-500/20 via-slate-900/40 to-transparent',
        badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      };

    default:
      return {
        code: 'partlycloudy',
        name: condition ? condition.charAt(0).toUpperCase() + condition.slice(1) : 'Fair Weather',
        icon: <Sparkle size={iconSize} weight="duotone" className="text-sky-400" />,
        color: '#38bdf8',
        gradient: 'from-sky-950/40 via-slate-900 to-slate-950',
        bgGradient: 'from-sky-500/20 via-slate-900/30 to-transparent',
        badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      };
  }
}
