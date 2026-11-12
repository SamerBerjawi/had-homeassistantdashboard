/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure helpers for Home Assistant weather forecasts delivered through `weather/subscribe_forecast`.
 */

import type { HAState } from '../types';

// Weather entity feature bits (WeatherEntityFeature)
const WEATHER_FORECAST_DAILY = 1;
const WEATHER_FORECAST_HOURLY = 2;
const WEATHER_FORECAST_TWICE_DAILY = 4;

export type ForecastSlot = 'daily' | 'hourly';
export interface ForecastSubscription {
  type: 'daily' | 'twice_daily' | 'hourly';
  slot: ForecastSlot;
}
export type CachedForecast = Partial<Record<ForecastSlot, unknown[]>>;

/**
 * Which forecast subscriptions an entity supports. When `supported_features` is unknown we try
 * the daily forecast (the most widely supported one) and skip hourly.
 */
export function forecastSubscriptionsFor(supportedFeatures: unknown): ForecastSubscription[] {
  const features = Number(supportedFeatures);
  const knowsFeatures = Number.isFinite(features);
  const out: ForecastSubscription[] = [];
  if (!knowsFeatures || features & WEATHER_FORECAST_DAILY) {
    out.push({ type: 'daily', slot: 'daily' });
  } else if (features & WEATHER_FORECAST_TWICE_DAILY) {
    out.push({ type: 'twice_daily', slot: 'daily' });
  }
  if (knowsFeatures && features & WEATHER_FORECAST_HOURLY) {
    out.push({ type: 'hourly', slot: 'hourly' });
  }
  return out;
}

/** Merges the cached forecast into a weather state's attributes (state unchanged when nothing cached). */
export function withCachedForecast(state: HAState, cached: CachedForecast | undefined): HAState {
  if (!cached) return state;
  return {
    ...state,
    attributes: {
      ...state.attributes,
      ...(cached.daily ? { forecast: cached.daily } : {}),
      ...(cached.hourly ? { hourly_forecast: cached.hourly } : {})
    }
  };
}
