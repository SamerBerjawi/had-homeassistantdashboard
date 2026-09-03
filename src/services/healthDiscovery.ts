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
 * any registered health metric suffix. If matched, returns { metricKey, devicePrefix }.
 */
export function matchHealthMetricSuffix(
  entityId: string
): { metricKey: HealthMetricKey; devicePrefix: string } | null {
  if (!entityId.startsWith('sensor.')) return null;
  if (isExcludedTelemetry(entityId)) return null;

  const rawWithoutDomain = entityId.slice(7); // Remove 'sensor.'

  // 1. Check primary suffixes from registry first
  for (const [keyStr, suffix] of Object.entries(HEALTH_METRIC_SUFFIXES)) {
    const key = keyStr as HealthMetricKey;
    const targetSuffix = `_${suffix}`;

    if (rawWithoutDomain.endsWith(targetSuffix)) {
      const prefix = rawWithoutDomain.slice(0, -targetSuffix.length);
      return { metricKey: key, devicePrefix: prefix || 'default' };
    }

    if (rawWithoutDomain === suffix) {
      return { metricKey: key, devicePrefix: 'default' };
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
        return { metricKey: key, devicePrefix: prefix || 'default' };
      }

      if (rawWithoutDomain === fb) {
        return { metricKey: key, devicePrefix: 'default' };
      }
    }
  }

  return null;
}

/**
 * Discovers all devices exposing Apple Health metrics in Home Assistant
 */
export function discoverHealthDevices(
  states: Record<string, HAState>
): DiscoveredHealthDevice[] {
  const devicesMap = new Map<string, DiscoveredHealthDevice>();

  for (const [entityId, stateObj] of Object.entries(states)) {
    if (!stateObj || typeof entityId !== 'string') continue;

    const match = matchHealthMetricSuffix(entityId);
    if (!match) continue;

    const { metricKey, devicePrefix } = match;

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
