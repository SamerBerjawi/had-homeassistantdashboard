/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized Home Assistant entity and binary sensor classification utilities.
 */

import { ResolvedEntity } from '../types';

export function isDoorSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'door' ||
    dc === 'garage_door' ||
    e.entity_id.includes('door') ||
    e.entity_id.includes('garage') ||
    e.entity_id.includes('gate')
  );
}

export function isWindowSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return dc === 'window' || e.entity_id.includes('window');
}

export function isMotionSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'motion' ||
    dc === 'occupancy' ||
    dc === 'presence' ||
    e.entity_id.includes('motion') ||
    e.entity_id.includes('occupancy') ||
    e.entity_id.includes('presence')
  );
}

export function isRainOrWeatherSensor(e: { attributes?: Record<string, any>; entity_id: string; name?: string }): boolean {
  const dc = (e.attributes?.device_class || '').toLowerCase();
  const id = e.entity_id.toLowerCase();
  const name = (e.attributes?.friendly_name || (e as any).name || '').toLowerCase();
  const attr = String(e.attributes?.attribution || '').toLowerCase();

  return (
    dc === 'precipitation' ||
    dc === 'precipitation_intensity' ||
    dc === 'weather' ||
    id.includes('rain') ||
    name.includes('rain') ||
    id.includes('precip') ||
    name.includes('precip') ||
    id.includes('weather') ||
    name.includes('weather') ||
    id.includes('forecast') ||
    name.includes('forecast') ||
    id.includes('meteo') ||
    name.includes('meteo') ||
    attr.includes('weather') ||
    attr.includes('rain') ||
    id.includes('soil') ||
    name.includes('soil') ||
    id.includes('plant') ||
    name.includes('plant') ||
    id.includes('garden') ||
    name.includes('garden') ||
    id.includes('irrigation') ||
    name.includes('irrigation') ||
    id.includes('sprinkler') ||
    name.includes('sprinkler') ||
    id.includes('lawn') ||
    name.includes('lawn') ||
    id.includes('outdoor') ||
    name.includes('outdoor') ||
    id.includes('dew') ||
    name.includes('dew') ||
    id.includes('frost') ||
    name.includes('frost')
  );
}

export function isLeakSensor(e: { attributes?: Record<string, any>; entity_id: string; name?: string }): boolean {
  // If it's a rain, weather, outdoor, or soil/plant sensor, it is NOT an indoor water leak
  if (isRainOrWeatherSensor(e)) {
    return false;
  }

  const dc = (e.attributes?.device_class || '').toLowerCase();
  const id = e.entity_id.toLowerCase();
  const name = (e.attributes?.friendly_name || (e as any).name || '').toLowerCase();

  return (
    dc === 'moisture' ||
    dc === 'water' ||
    id.includes('leak') ||
    name.includes('leak') ||
    id.includes('flood') ||
    name.includes('flood') ||
    id.includes('water_leak') ||
    id.includes('water_sensor') ||
    id.includes('overflow')
  );
}

export function isSmokeSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'smoke' ||
    dc === 'gas' ||
    dc === 'carbon_monoxide' ||
    e.entity_id.includes('smoke') ||
    e.entity_id.includes('co_detector') ||
    e.entity_id.includes('gas')
  );
}

export function isOtherContactSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  if (isDoorSensor(e) || isWindowSensor(e) || isMotionSensor(e) || isLeakSensor(e) || isSmokeSensor(e)) {
    return false;
  }
  const dc = e.attributes?.device_class;
  return (
    dc === 'opening' ||
    dc === 'safety' ||
    dc === 'tamper' ||
    dc === 'lock' ||
    e.entity_id.includes('contact') ||
    e.entity_id.includes('safe') ||
    e.entity_id.includes('cabinet') ||
    e.entity_id.includes('mailbox')
  );
}

/**
 * Determines whether an entity is eligible to represent a battery level or battery notification.
 * Strictly complies with standard Home Assistant Core entity specifications:
 * - Battery percentage level MUST strictly have '%' unit of measurement.
 * - Device class must be 'battery' (or omit device class only if name/ID strictly denotes battery percentage).
 * - Rejects non-battery device classes (power, energy, voltage, current, temperature, enum, etc.).
 * - Rejects enum / options sensors and accumulator state_classes ('total', 'total_increasing').
 * Adapts dynamically and generically to any user's naming conventions and integrations.
 */
export function isBatteryEntity(e: { attributes?: Record<string, any>; entity_id: string; domain?: string; name?: string; device?: any }): boolean {
  const domain = e.domain || e.entity_id.split('.')[0];
  const attrs = e.attributes || {};
  const dc = (attrs.device_class || '').toLowerCase().trim();
  const eid = e.entity_id.toLowerCase();
  const name = (e.name || attrs.friendly_name || '').toLowerCase();
  const uom = (attrs.unit_of_measurement || '').toLowerCase().trim();

  // 1. Battery percentage level MUST strictly have '%' unit of measurement.
  // Sensors without '%' (e.g. empty unit, W, kW, kWh, V, A, °C, status codes) are never battery percentages.
  if (uom !== '%') {
    return false;
  }

  // 2. Reject if the entity is an enum / select / categorical sensor
  if (Array.isArray(attrs.options) || dc === 'enum') {
    return false;
  }

  // 3. Reject non-battery device classes according to Home Assistant Core specifications
  const nonBatteryDeviceClasses = new Set([
    'power', 'energy', 'voltage', 'current', 'apparent_power', 'reactive_power',
    'temperature', 'humidity', 'illuminance', 'co2', 'carbon_dioxide', 'carbon_monoxide',
    'pm25', 'pm10', 'aqi', 'pressure', 'atmospheric_pressure', 'speed', 'distance',
    'duration', 'timestamp', 'date', 'monetary', 'gas', 'water', 'volume',
    'volume_flow_rate', 'volume_storage', 'weight', 'signal_strength', 'sound_pressure',
    'enum', 'status'
  ]);
  if (nonBatteryDeviceClasses.has(dc)) {
    return false;
  }

  // 4. Reject if state_class indicates accumulation/metering rather than point measurement
  const sc = (attrs.state_class || '').toLowerCase().trim();
  if (sc === 'total' || sc === 'total_increasing') {
    return false;
  }

  // 5. Sensor domain evaluation
  if (domain === 'sensor') {
    // If device_class is explicitly battery and unit is %, it is a valid battery level sensor
    if (dc === 'battery') {
      return true;
    }

    // Fallback if device_class is omitted: must have a clear battery identifier
    const isBatteryNamed =
      eid.endsWith('_battery') ||
      eid.endsWith('_battery_level') ||
      eid.endsWith('_battery_percentage') ||
      eid.endsWith('_bat') ||
      name.endsWith('battery') ||
      name.endsWith('battery level');

    return isBatteryNamed;
  }

  // Non-sensor entities (lock, climate, binary_sensor, vacuum, etc.)
  // represent physical smart home devices that can report internal battery telemetry.
  return true;
}

export interface ClassifiedBinarySensors {
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  motionSensors: ResolvedEntity[];
  leakSensors: ResolvedEntity[];
  smokeSensors: ResolvedEntity[];
  otherContactSensors: ResolvedEntity[];
}

/**
 * Classifies a list of binary sensors in a single pass.
 */
export function classifyBinarySensors(binarySensors: ResolvedEntity[]): ClassifiedBinarySensors {
  const doorSensors: ResolvedEntity[] = [];
  const windowSensors: ResolvedEntity[] = [];
  const motionSensors: ResolvedEntity[] = [];
  const leakSensors: ResolvedEntity[] = [];
  const smokeSensors: ResolvedEntity[] = [];
  const otherContactSensors: ResolvedEntity[] = [];

  for (const sensor of binarySensors) {
    if (isDoorSensor(sensor)) {
      doorSensors.push(sensor);
    } else if (isWindowSensor(sensor)) {
      windowSensors.push(sensor);
    } else if (isMotionSensor(sensor)) {
      motionSensors.push(sensor);
    } else if (isSmokeSensor(sensor)) {
      smokeSensors.push(sensor);
    } else if (isOtherContactSensor(sensor)) {
      otherContactSensors.push(sensor);
    }
  }

  return {
    doorSensors,
    windowSensors,
    motionSensors,
    leakSensors,
    smokeSensors,
    otherContactSensors
  };
}

/**
 * Determines if a camera entity is a real security/surveillance camera,
 * filtering out robot vacuum map renderers, cleaning trajectories, and generic static maps.
 */
export function isSurveillanceCamera(cam: { attributes?: Record<string, any>; entity_id: string; name?: string }): boolean {
  const id = (cam.entity_id || '').toLowerCase();
  const name = ((cam.name || cam.attributes?.friendly_name || '') as string).toLowerCase();
  const dc = ((cam.attributes?.device_class || '') as string).toLowerCase();
  const model = ((cam.attributes?.model_name || '') as string).toLowerCase();

  // Filter out vacuum floor maps and cleaning trajectory cameras
  if (
    dc === 'map' ||
    dc === 'vacuum_map' ||
    id.endsWith('_map') ||
    id.includes('_cleaning_map') ||
    id.includes('valetudo') ||
    id.includes('roborock_map') ||
    id.includes('dreame_map') ||
    (id.includes('vacuum') && (id.includes('map') || id.includes('camera'))) ||
    (name.includes('vacuum') && name.includes('map')) ||
    name.endsWith(' map') ||
    name.includes('cleaning map') ||
    name.includes('floor map') ||
    model.includes('vacuum') ||
    model.includes('robot')
  ) {
    return false;
  }

  return true;
}
