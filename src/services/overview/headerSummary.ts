/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Status summaries behind the Overview header tiles and badges: weather readings, alarm state,
 * playing media, vacuum state and whether any badge is active.
 */

import type { ResolvedEntity } from '../../types';
import type { VacuumDeviceData } from '../../types/vacuum';
import type { DailyForecastItem } from '../../lib/weatherForecast';

// Active Weather Resolution
export function resolveActiveWeather(weatherEntities: ResolvedEntity[], selectedWeatherEntityId: string | null | undefined) {
  return weatherEntities.find((w) => w.entity_id === selectedWeatherEntityId) || weatherEntities[0];
}

export function deriveWeatherReadings(activeWeather: ResolvedEntity | undefined, sunState: string | undefined) {
  const weatherCondition = activeWeather?.state || 'partlycloudy';
  const isNight = weatherCondition.toLowerCase().includes('night') || sunState === 'below_horizon';
  const currentTemp = typeof activeWeather?.attributes?.temperature === 'number' ? activeWeather.attributes.temperature : 22;
  const tempUnit = activeWeather?.attributes?.temperature_unit || '°C';
  const humidity = activeWeather?.attributes?.humidity ?? 55;
  return { weatherCondition, isNight, currentTemp, tempUnit, humidity };
}

export function deriveWeatherHighLow(
  todayForecast: DailyForecastItem | undefined,
  activeWeather: ResolvedEntity | undefined,
  currentTemp: number
) {
  const weatherHigh = typeof todayForecast?.temperature === 'number'
    ? todayForecast.temperature
    : (activeWeather?.attributes?.forecast?.[0]?.temperature ?? Math.round(currentTemp + 3));
  const weatherLow = typeof todayForecast?.templow === 'number'
    ? todayForecast.templow
    : (activeWeather?.attributes?.forecast?.[0]?.templow ?? Math.round(currentTemp - 4));
  return { weatherHigh, weatherLow };
}

// Armed-like states only; unknown/unavailable is neither armed nor disarmed
export function isAlarmArmedState(alarmEntity: ResolvedEntity | undefined) {
  return Boolean(
    alarmEntity?.state &&
      (alarmEntity.state.startsWith('armed_') || ['triggered', 'arming', 'pending'].includes(alarmEntity.state))
  );
}

export function getAlarmBadgeDetailsFor(alarmEntity: ResolvedEntity | undefined) {
  switch (alarmEntity?.state) {
    case 'armed_home':
      return { label: 'Armed Home', bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300' };
    case 'armed_away':
      return { label: 'Armed Away', bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-300' };
    case 'armed_night':
      return { label: 'Armed Night', bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300' };
    case 'triggered':
      return { label: 'Triggered', bg: 'bg-rose-600/20', text: 'text-rose-700 dark:text-rose-300' };
    case 'arming':
    case 'pending':
      return { label: 'Arming…', bg: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-300' };
    case 'disarmed':
      return { label: 'Disarmed', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' };
    default:
      // Unknown, unavailable, or no state yet (e.g. before Home Assistant reports it): never
      // claim "Disarmed" without Home Assistant saying so
      return { label: 'Unavailable', bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-300' };
  }
}

export function summarizePlayingMedia(playingMediaEntities: ResolvedEntity[]) {
  const isPlayingMedia = playingMediaEntities.length > 0;
  const singlePlayingMedia = playingMediaEntities.length === 1 ? playingMediaEntities[0] : null;
  const playingSongTitle = singlePlayingMedia?.attributes?.media_title || singlePlayingMedia?.attributes?.app_name || singlePlayingMedia?.name;
  return { isPlayingMedia, singlePlayingMedia, playingSongTitle };
}

export function summarizeVacuums(discoveredVacuums: VacuumDeviceData[], vacuumEntities: ResolvedEntity[]) {
  const activeVacuumDevice = discoveredVacuums[0];
  const firstVacuum = vacuumEntities[0];
  const isVacuumCleaning = discoveredVacuums.some((v) => v.state === 'cleaning');
  const vacuumBattery = activeVacuumDevice?.batteryLevel ?? (firstVacuum?.attributes?.battery_level ?? firstVacuum?.attributes?.battery);
  const isVacuumCharging = activeVacuumDevice?.batteryCharging;
  return { activeVacuumDevice, firstVacuum, isVacuumCleaning, vacuumBattery, isVacuumCharging };
}

export interface ActiveBadgeInputs {
  activeZoneUsers: ResolvedEntity[];
  onLights: ResolvedEntity[];
  onSwitches: ResolvedEntity[];
  activeFans: ResolvedEntity[];
  isVacuumCleaning: boolean;
  isPlayingMedia: boolean;
  isAlarmArmed: boolean;
  openDoors: ResolvedEntity[];
  openWindows: ResolvedEntity[];
  activeMotion: ResolvedEntity[];
  activeLeaks: ResolvedEntity[];
  activeSmoke: ResolvedEntity[];
}

export function hasAnyActiveOverviewBadge(p: ActiveBadgeInputs) {
  const {
    activeZoneUsers, onLights, onSwitches, activeFans, isVacuumCleaning, isPlayingMedia, isAlarmArmed,
    openDoors, openWindows, activeMotion, activeLeaks, activeSmoke
  } = p;
  return (
    activeZoneUsers.length > 0 ||
    onLights.length > 0 ||
    onSwitches.length > 0 ||
    activeFans.length > 0 ||
    isVacuumCleaning ||
    isPlayingMedia ||
    isAlarmArmed ||
    openDoors.length > 0 ||
    openWindows.length > 0 ||
    activeMotion.length > 0 ||
    activeLeaks.length > 0 ||
    activeSmoke.length > 0
  );
}
