/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export interface DailyForecastItem {
  datetime: string;
  condition: string;
  temperature: number;
  templow: number;
  precipitation?: number;
  precipitation_probability?: number;
  wind_speed?: number;
  wind_bearing?: number;
  uv_index?: number;
  humidity?: number;
}

export interface HourlyForecastItem {
  datetime: string;
  condition: string;
  temperature: number;
  precipitation_probability?: number;
  wind_speed?: number;
}

/**
 * Deterministically generates realistic upcoming daily forecast items
 * if the live weather entity has not yet populated attributes.forecast.
 */
export function generateFallbackDailyForecast(
  currentTemp: number = 22,
  baseCondition: string = 'partlycloudy'
): DailyForecastItem[] {
  const norm = baseCondition.toLowerCase();
  const dayNames = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  
  const conditionSequence: string[] = [];
  if (norm.includes('rain') || norm.includes('pouring')) {
    conditionSequence.push(norm, 'rainy', 'cloudy', 'partlycloudy', 'sunny', 'partlycloudy', 'sunny');
  } else if (norm.includes('thunder') || norm.includes('lightning')) {
    conditionSequence.push(norm, 'rainy', 'partlycloudy', 'sunny', 'sunny', 'cloudy', 'partlycloudy');
  } else if (norm.includes('snow')) {
    conditionSequence.push(norm, 'snowy', 'cloudy', 'partlycloudy', 'sunny', 'snowy-rainy', 'cloudy');
  } else if (norm.includes('sunny') || norm.includes('clear')) {
    conditionSequence.push('sunny', 'sunny', 'partlycloudy', 'partlycloudy', 'sunny', 'rainy', 'sunny');
  } else {
    conditionSequence.push('partlycloudy', 'sunny', 'cloudy', 'rainy', 'partlycloudy', 'sunny', 'sunny');
  }

  const tempOffsets = [0, 1.5, 2.0, -1.5, -3.0, 0.5, 2.0];
  const lowOffsets = [-6, -7, -5.5, -8, -7.5, -6, -5];

  const now = new Date();

  return dayNames.map((_, idx) => {
    const d = new Date(now);
    d.setDate(now.getDate() + idx);
    const cond = conditionSequence[idx % conditionSequence.length];
    const high = Math.round(currentTemp + tempOffsets[idx]);
    const low = Math.round(high + lowOffsets[idx]);
    const isRainy = cond.includes('rain') || cond.includes('lightning');

    return {
      datetime: d.toISOString(),
      condition: cond,
      temperature: high,
      templow: low,
      precipitation: isRainy ? 3.5 + idx * 0.8 : 0,
      precipitation_probability: isRainy ? 70 + (idx % 20) : (cond.includes('cloud') ? 20 : 5),
      wind_speed: 12 + (idx % 6),
      wind_bearing: 210 + (idx * 15) % 100,
      uv_index: cond.includes('sunny') ? 7 : (isRainy ? 3 : 5),
      humidity: isRainy ? 78 : 55
    };
  });
}

/**
 * Generates 24-hour upcoming hourly forecast timeline
 */
export function generateFallbackHourlyForecast(
  currentTemp: number = 22,
  baseCondition: string = 'partlycloudy'
): HourlyForecastItem[] {
  const now = new Date();
  const hours: HourlyForecastItem[] = [];

  for (let i = 0; i < 24; i += 2) {
    const d = new Date(now.getTime() + i * 3600 * 1000);
    const hour = d.getHours();
    const isNight = hour < 6 || hour > 20;

    let cond = baseCondition;
    if (isNight && (cond === 'sunny' || cond === 'clear')) {
      cond = 'clear-night';
    } else if (isNight && cond === 'partlycloudy') {
      cond = 'partlycloudy-night';
    }

    // Daily sinusoidal temperature cycle
    const hourVariation = Math.sin(((hour - 9) / 12) * Math.PI) * 4;
    const temp = Math.round(currentTemp + hourVariation);

    hours.push({
      datetime: d.toISOString(),
      condition: cond,
      temperature: temp,
      precipitation_probability: cond.includes('rain') ? 70 : (cond.includes('cloud') ? 15 : 0),
      wind_speed: 10 + ((hour * 3) % 8)
    });
  }

  return hours;
}

/**
 * Extracts or synthesizes upcoming daily forecast from a weather entity
 */
export function getDailyForecast(entity?: HAEntity | ResolvedEntity | null): DailyForecastItem[] {
  if (!entity || !entity.attributes) {
    return generateFallbackDailyForecast(22, 'partlycloudy');
  }

  const rawForecast = entity.attributes.forecast;
  if (Array.isArray(rawForecast) && rawForecast.length > 0) {
    return rawForecast.map((f: any, idx: number) => {
      const high = typeof f.temperature === 'number' 
        ? f.temperature 
        : (typeof f.temperature_high === 'number' ? f.temperature_high : (typeof f.high_temperature === 'number' ? f.high_temperature : 22));
      const low = typeof f.templow === 'number' 
        ? f.templow 
        : (typeof f.temperature_low === 'number' ? f.temperature_low : (typeof f.low_temperature === 'number' ? f.low_temperature : (typeof f.temp_low === 'number' ? f.temp_low : high - 6)));

      return {
        datetime: f.datetime || new Date(Date.now() + idx * 86400000).toISOString(),
        condition: f.condition || entity.state || 'partlycloudy',
        temperature: high,
        templow: low,
        precipitation: typeof f.precipitation === 'number' ? f.precipitation : 0,
        precipitation_probability: typeof f.precipitation_probability === 'number' ? f.precipitation_probability : (f.condition?.includes('rain') ? 60 : 0),
        wind_speed: typeof f.wind_speed === 'number' ? f.wind_speed : 12,
        wind_bearing: typeof f.wind_bearing === 'number' ? f.wind_bearing : 220,
        uv_index: typeof f.uv_index === 'number' ? f.uv_index : 5,
        humidity: typeof f.humidity === 'number' ? f.humidity : 55
      };
    });
  }

  // Fallback generation based on current entity conditions
  const currentTemp = typeof entity.attributes.temperature === 'number' ? entity.attributes.temperature : 22;
  const baseCond = entity.state || 'partlycloudy';
  return generateFallbackDailyForecast(currentTemp, baseCond);
}

/**
 * Extracts or synthesizes upcoming hourly forecast from a weather entity
 */
export function getHourlyForecast(entity?: HAEntity | ResolvedEntity | null): HourlyForecastItem[] {
  if (!entity || !entity.attributes) {
    return generateFallbackHourlyForecast(22, 'partlycloudy');
  }

  const rawHourly = entity.attributes.hourly_forecast || entity.attributes.forecast_hourly;
  if (Array.isArray(rawHourly) && rawHourly.length > 0) {
    return rawHourly.map((f: any) => ({
      datetime: f.datetime,
      condition: f.condition || entity.state || 'partlycloudy',
      temperature: typeof f.temperature === 'number' ? f.temperature : 22,
      precipitation_probability: typeof f.precipitation_probability === 'number' ? f.precipitation_probability : 0,
      wind_speed: typeof f.wind_speed === 'number' ? f.wind_speed : 12
    }));
  }

  const currentTemp = typeof entity.attributes.temperature === 'number' ? entity.attributes.temperature : 22;
  const baseCond = entity.state || 'partlycloudy';
  return generateFallbackHourlyForecast(currentTemp, baseCond);
}
