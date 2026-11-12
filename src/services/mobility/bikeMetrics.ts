/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BikeMetrics } from '../../types/mobility';
import type { HAZone } from '../../types';
import { findEntity, parseNumOptional, resolveZone } from './entityLookup';

export interface BikeMetricsInput {
  states: Record<string, any>;
  resolvedZones: HAZone[];
  isDemo: boolean;
  customBrandLogo?: string;
  customBikeImage?: string;
}

/** Pure derivation of e-bike metrics from the HA entity map (no React, no side effects). */
export function deriveBikeMetrics(input: BikeMetricsInput): BikeMetrics {
  const { states, resolvedZones, isDemo } = input;
  const effectiveBikeLogo = input.customBrandLogo;
  const effectiveBikeImage = input.customBikeImage;
  const homeZone = resolvedZones.find(
    (z) => z.entity_id === 'zone.home' || z.name.toLowerCase() === 'home'
  );
  const battEntity = findEntity(states, 'sensor', ['sensor.cowboy_battery', 'dark_avenger_remaining_battery', 'dark_avenger_battery', 'ebike_battery', 'bike_battery']);
  const pcbEntity = findEntity(states, 'sensor', ['sensor.cowboy_pcb_battery', 'dark_avenger_remaining_battery_internal_pcb', 'internal_pcb_battery', 'bike_tracker_battery']);
  const rangeEntity = findEntity(states, 'sensor', ['sensor.cowboy_range', 'dark_avenger_remaining_range', 'bike_range', 'remaining_range']);
  const healthEntity = findEntity(states, 'sensor', ['sensor.cowboy_battery_health', 'dark_avenger_battery_health', 'bike_battery_health']);
  const mileageEntity = findEntity(states, 'sensor', ['sensor.cowboy_total_distance', 'cowboy_odometer', 'dark_avenger_mileage', 'bike_mileage', 'bike_odometer']);
  const distanceTodayEntity = findEntity(states, 'sensor', ['sensor.cowboy_distance_today', 'dark_avenger_distance_today', 'bike_distance_today']);
  const timeDrivenEntity = findEntity(states, 'sensor', ['sensor.cowboy_duration', 'dark_avenger_time_driven', 'bike_time_driven']);
  const co2Entity = findEntity(states, 'sensor', ['sensor.cowboy_co2_saved', 'dark_avenger_saved_co2', 'bike_co2_saved']);

  const lockEntity = findEntity(states, 'lock', ['lock.cowboy_lock', 'cowboy_lock', 'cowboy', 'ebike_lock', 'bike_lock']);
  const stolenEntity = findEntity(states, 'binary_sensor', ['binary_sensor.cowboy_stolen', 'dark_avenger_stolen', 'bike_stolen']);
  const crashedEntity = findEntity(states, 'binary_sensor', ['binary_sensor.cowboy_crash', 'dark_avenger_crashed', 'bike_crashed']);
  const autoLockEntity = findEntity(states, 'sensor', ['sensor.cowboy_auto_lock', 'dark_avenger_auto_lock', 'bike_auto_lock']);
  const lastSeenEntity = findEntity(states, 'sensor', ['sensor.cowboy_last_seen', 'dark_avenger_last_seen', 'bike_last_seen']);
  const speedLimitEntity = findEntity(states, 'sensor', ['sensor.cowboy_speed_limit', 'dark_avenger_speed_limit', 'bike_speed_limit']);

  const lastTripTitle = findEntity(states, 'sensor', ['cowboy_last_trip_title', 'dark_avenger_last_trip_title'])?.state;
  const lastTripDistSensor = findEntity(states, 'sensor', ['cowboy_last_trip_distance', 'dark_avenger_last_trip_distance']);
  const lastTripDurationSensor = findEntity(states, 'sensor', ['cowboy_last_trip_duration', 'dark_avenger_last_trip_duration']);
  const lastTripCo2Sensor = findEntity(states, 'sensor', ['cowboy_last_trip_co2', 'dark_avenger_last_trip_co2_saved']);
  const lastTripCalSensor = findEntity(states, 'sensor', ['cowboy_last_trip_calories', 'dark_avenger_last_trip_calories']);
  const lastTripEnded = findEntity(states, 'sensor', ['cowboy_last_trip_ended', 'dark_avenger_last_trip_ended'])?.state;
  const lastTripRideMode = findEntity(states, 'sensor', ['cowboy_ride_mode', 'dark_avenger_last_ride_mode'])?.state;

  const hasBikeLastTrip = Boolean(
    lastTripTitle || lastTripDistSensor || lastTripEnded
  );

  const gpsTracker = findEntity(states, 'device_tracker', ['cowboy', 'dark_avenger', 'ebike_tracker', 'bike_tracker'])
    || findEntity(states, 'sensor', ['cowboy_gps', 'dark_avenger_gps', 'bike_gps']);

  let latitude = homeZone?.latitude ?? 0;
  let longitude = homeZone?.longitude ?? 0;
  if (isDemo && latitude === 0 && longitude === 0) {
    latitude = 37.7785;
    longitude = -122.4142;
  }
  if (gpsTracker?.attributes?.latitude && gpsTracker?.attributes?.longitude) {
    latitude = Number(gpsTracker.attributes.latitude);
    longitude = Number(gpsTracker.attributes.longitude);
  } else if (typeof gpsTracker?.state === 'string' && gpsTracker.state.includes(',')) {
    const parts = gpsTracker.state.split(',').map((s: string) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      latitude = parts[0];
      longitude = parts[1];
    }
  }

  const { zoneName, isAtHome } = resolveZone(latitude, longitude, gpsTracker?.state, resolvedZones);

  const isLocked = lockEntity ? (
    lockEntity.state === 'locked' || lockEntity.state === 'on'
  ) : (isDemo ? true : false);

  const base: BikeMetrics = {
    customBrandLogo: effectiveBikeLogo,
    customBikeImage: effectiveBikeImage,

    batteryPercent: parseNumOptional(battEntity?.state) ?? (isDemo ? 78 : undefined),
    internalPcbBattery: parseNumOptional(pcbEntity?.state) ?? (isDemo ? 98 : undefined),
    remainingRangeKm: parseNumOptional(rangeEntity?.state) ?? (isDemo ? 64 : undefined),
    batteryHealthPercent: parseNumOptional(healthEntity?.state) ?? (isDemo ? 97 : undefined),
    mileageKm: parseNumOptional(mileageEntity?.state) ?? (isDemo ? 1540 : undefined),
    distanceTodayKm: parseNumOptional(distanceTodayEntity?.state) ?? (isDemo ? 12.4 : undefined),
    totalTimeDrivenHours: parseNumOptional(timeDrivenEntity?.state) ?? (isDemo ? 64.2 : undefined),
    totalSavedCo2Kg: parseNumOptional(co2Entity?.state) ?? (isDemo ? 192.8 : undefined),

    isLocked,
    isStolen: stolenEntity ? stolenEntity.state === 'on' : false,
    isCrashed: crashedEntity ? crashedEntity.state === 'on' : false,
    autoLockStatus: autoLockEntity?.state || (isLocked ? 'Armed & Auto-Locked' : 'Unlocked & Ready'),
    lastSeen: lastSeenEntity?.state || (isDemo ? 'Connected (BLE + GPS)' : 'Unavailable'),
    speedLimitKmh: parseNumOptional(speedLimitEntity?.state) ?? (isDemo ? 25 : undefined),

    lastTrip: (hasBikeLastTrip || isDemo) ? {
      title: String(lastTripTitle || (isDemo ? 'Downtown Scenic & Marina Loop' : 'Recent Trip')),
      distanceKm: parseNumOptional(lastTripDistSensor?.state) ?? (isDemo ? 12.4 : undefined),
      durationMinutes: parseNumOptional(lastTripDurationSensor?.state) ?? (isDemo ? 34 : undefined),
      co2SavedKg: parseNumOptional(lastTripCo2Sensor?.state) ?? (isDemo ? 2.15 : undefined),
      caloriesBurned: parseNumOptional(lastTripCalSensor?.state) ?? (isDemo ? 410 : undefined),
      endedAt: String(lastTripEnded || (isDemo ? 'Today, 08:35 AM' : '')),
      rideMode: String(lastTripRideMode || (isDemo ? 'Turbo Boost' : 'Standard'))
    } : undefined,

    gps: { latitude, longitude },
    locationZone: zoneName,
    isAtHome,

    controls: {
      lockEntityId: lockEntity?.entity_id || 'lock.cowboy_lock',
      autoLockSwitchId: findEntity(states, 'switch', ['cowboy_auto_lock', 'dark_avenger_auto_lock'])?.entity_id,
      refreshButtonId: findEntity(states, 'button', ['cowboy_refresh', 'dark_avenger_refresh'])?.entity_id
    }
  };
  return base;
}
