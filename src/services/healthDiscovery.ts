/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Health Sensor Discovery Service
 * Automatically detects Apple Health sensors for any authenticated user
 * by stripping device-specific prefixes (e.g., `sensor.<device_id>_<suffix>`).
 * Strictly excludes generic device telemetry (battery, storage, Wi-Fi, location).
 */

import { HAState } from '../types';
import {
  HEALTH_METRIC_SUFFIXES,
  HEALTH_METRIC_FALLBACKS,
  EXCLUDED_TELEMETRY_SUFFIXES,
  HealthMetricKey,
  DiscoveredHealthDevice,
} from '../types/health';

function formatDeviceName(rawPrefix: string): string {
  if (!rawPrefix || rawPrefix === 'default' || rawPrefix === 'apple_health') {
    return 'Apple Health';
  }

  // Replace underscores and capitalize words
  return rawPrefix
    .split('_')
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'iphone') return 'iPhone';
      if (lower === 'ipad') return 'iPad';
      if (lower === 'watch') return 'Apple Watch';
      if (lower === 'samer' || lower === 'samers') return "Samer's";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Scans all HA states to identify confirmed mobile companion app device prefixes.
 * In Home Assistant, a mobile app integration registers companion entities such as:
 * - sensor.<prefix>_battery_level / battery_state
 * - sensor.<prefix>_app_version
 * - sensor.<prefix>_storage / free_storage
 * - sensor.<prefix>_geocoded_location
 * - sensor.<prefix>_connection_type
 * - sensor.<prefix>_sim_1 / sim_2 / activity
 * - device_tracker.<prefix>
 */
export function getConfirmedMobileAppPrefixes(states: Record<string, HAState>): Set<string> {
  const prefixes = new Set<string>();

  const MOBILE_APP_INDICATORS = [
    '_battery_level',
    '_battery_state',
    '_app_version',
    '_storage',
    '_free_storage',
    '_geocoded_location',
    '_connection_type',
    '_sim_1',
    '_sim_2',
    '_activity',
  ];

  for (const entityId of Object.keys(states)) {
    if (entityId.startsWith('device_tracker.')) {
      const trackerPrefix = entityId.slice(15).toLowerCase();
      // Exclude router/network trackers that are not mobile phones
      if (trackerPrefix && !trackerPrefix.includes('router') && !trackerPrefix.includes('gateway')) {
        prefixes.add(trackerPrefix);
      }
    } else if (entityId.startsWith('sensor.')) {
      const sensorName = entityId.slice(7).toLowerCase();
      for (const indicator of MOBILE_APP_INDICATORS) {
        if (sensorName.endsWith(indicator)) {
          const prefix = sensorName.slice(0, -indicator.length);
          if (prefix) {
            prefixes.add(prefix);
          }
        }
      }
    }
  }

  return prefixes;
}

/**
 * Checks whether an entity is excluded device telemetry
 */
function isExcludedTelemetry(entityId: string): boolean {
  const lower = entityId.toLowerCase();
  for (const ex of EXCLUDED_TELEMETRY_SUFFIXES) {
    if (lower.endsWith(`_${ex}`) || lower.endsWith(`.${ex}`) || lower.includes(`_${ex}_`)) {
      return true;
    }
  }
  return false;
}

/**
 * Given an entity_id like 'sensor.samers_iphone_health_steps', checks if it matches
 * any registered health metric suffix.
 *
 * Strictly enforces that sensors must either:
 * 1. Explicitly contain 'health_' or 'apple_health' in the entity_id, OR
 * 2. Belong to a verified mobile companion app device (preventing dishwashers, water meters,
 *    automotive distance sensors, or smart plugs from false-matching).
 */
export function matchHealthMetricSuffix(
  entityId: string,
  confirmedMobilePrefixes?: Set<string>
): { metricKey: HealthMetricKey; devicePrefix: string } | null {
  if (!entityId.startsWith('sensor.')) return null;
  if (isExcludedTelemetry(entityId)) return null;

  const rawWithoutDomain = entityId.slice(7); // Remove 'sensor.'
  const lowerWithoutDomain = rawWithoutDomain.toLowerCase();
  const hasExplicitHealthKeyword = lowerWithoutDomain.includes('health_') || lowerWithoutDomain.includes('apple_health');

  // 1. Check primary suffixes from registry first
  for (const [keyStr, suffix] of Object.entries(HEALTH_METRIC_SUFFIXES)) {
    const key = keyStr as HealthMetricKey;
    const targetSuffix = `_${suffix}`;

    if (rawWithoutDomain.endsWith(targetSuffix)) {
      const prefix = rawWithoutDomain.slice(0, -targetSuffix.length);
      const cleanPrefix = (prefix || 'default').toLowerCase();

      // Only match if explicit health keyword is present OR device is a confirmed mobile companion app
      if (hasExplicitHealthKeyword || (confirmedMobilePrefixes && confirmedMobilePrefixes.has(cleanPrefix)) || cleanPrefix === 'apple_health') {
        return { metricKey: key, devicePrefix: prefix || 'default' };
      }
    }

    if (rawWithoutDomain === suffix) {
      if (hasExplicitHealthKeyword || !confirmedMobilePrefixes || confirmedMobilePrefixes.size === 0) {
        return { metricKey: key, devicePrefix: 'default' };
      }
    }
  }

  // 2. Check fallback suffixes
  for (const [keyStr, fallbacks] of Object.entries(HEALTH_METRIC_FALLBACKS)) {
    const key = keyStr as HealthMetricKey;
    if (!fallbacks) continue;

    for (const fb of fallbacks) {
      const targetSuffix = `_${fb}`;
      if (rawWithoutDomain.endsWith(targetSuffix)) {
        const prefix = rawWithoutDomain.slice(0, -targetSuffix.length);
        const cleanPrefix = (prefix || 'default').toLowerCase();

        // Stricter check for fallbacks (e.g. 'steps', 'distance', 'floors'):
        // Must have confirmed mobile prefix or explicit health keyword
        if (hasExplicitHealthKeyword || (confirmedMobilePrefixes && confirmedMobilePrefixes.has(cleanPrefix))) {
          return { metricKey: key, devicePrefix: prefix || 'default' };
        }
      }

      if (rawWithoutDomain === fb) {
        if (hasExplicitHealthKeyword) {
          return { metricKey: key, devicePrefix: 'default' };
        }
      }
    }
  }

  return null;
}

/**
 * Discovers all user mobile companion app devices exposing Apple Health metrics in Home Assistant.
 * Strictly excludes any non-mobile devices (such as smart plugs, water meters, EVs, or room sensors).
 */
export function discoverHealthDevices(
  states: Record<string, HAState>
): DiscoveredHealthDevice[] {
  const confirmedMobilePrefixes = getConfirmedMobileAppPrefixes(states);
  const devicesMap = new Map<string, DiscoveredHealthDevice>();

  for (const [entityId, stateObj] of Object.entries(states)) {
    if (!stateObj || typeof entityId !== 'string') continue;

    const match = matchHealthMetricSuffix(entityId, confirmedMobilePrefixes);
    if (!match) continue;

    const { metricKey, devicePrefix } = match;
    const lowerPrefix = devicePrefix.toLowerCase();

    // Verify device is mobile companion or has explicit health sensors
    const isMobileConfirmed = confirmedMobilePrefixes.has(lowerPrefix) || lowerPrefix.includes('iphone') || lowerPrefix.includes('watch') || lowerPrefix.includes('phone') || lowerPrefix === 'apple_health' || lowerPrefix === 'default';

    if (!isMobileConfirmed && confirmedMobilePrefixes.size > 0) {
      continue;
    }

    if (!devicesMap.has(devicePrefix)) {
      devicesMap.set(devicePrefix, {
        deviceId: devicePrefix,
        deviceName: formatDeviceName(devicePrefix),
        sensorCount: 0,
        matchedMetrics: {},
      });
    }

    const dev = devicesMap.get(devicePrefix)!;
    // Prefer primary suffix over fallback if multiple match
    if (!dev.matchedMetrics[metricKey]) {
      dev.matchedMetrics[metricKey] = entityId;
      dev.sensorCount += 1;
    }
  }

  // Return sorted with the device with the most health sensors first
  return Array.from(devicesMap.values()).sort((a, b) => b.sensorCount - a.sensorCount);
}

/**
 * Resolves active health sensors for a specific device, or the primary discovered device
 */
export function resolveHealthSensorsForDevice(
  states: Record<string, HAState>,
  selectedDeviceId?: string
): {
  devices: DiscoveredHealthDevice[];
  activeDevice: DiscoveredHealthDevice | null;
  metricsMap: Partial<Record<HealthMetricKey, HAState>>;
  totalFound: number;
} {
  const devices = discoverHealthDevices(states);
  if (devices.length === 0) {
    return {
      devices: [],
      activeDevice: null,
      metricsMap: {},
      totalFound: 0,
    };
  }

  const activeDevice =
    (selectedDeviceId && devices.find((d) => d.deviceId === selectedDeviceId)) ||
    devices[0];

  const metricsMap: Partial<Record<HealthMetricKey, HAState>> = {};
  let totalFound = 0;

  for (const [keyStr, entityId] of Object.entries(activeDevice.matchedMetrics)) {
    const key = keyStr as HealthMetricKey;
    if (entityId && states[entityId]) {
      metricsMap[key] = states[entityId];
      totalFound += 1;
    }
  }

  return {
    devices,
    activeDevice,
    metricsMap,
    totalFound,
  };
}
