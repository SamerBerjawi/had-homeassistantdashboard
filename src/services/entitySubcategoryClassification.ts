/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Buckets binary sensors and sensors into the sub-categories used by the Devices & Visibility
 * filters. Pure functions of the entity's device class, unit, id and name.
 */

import type { ResolvedEntity } from '../types';
import { isRainOrWeatherSensor } from '../lib/entityClassifiers';

// --- Subcategory Definitions for Binary Sensors ---
export type BinarySensorSubcategory =
  | 'all'
  | 'door'
  | 'window'
  | 'motion'
  | 'presence'
  | 'safety'
  | 'moisture'
  | 'connectivity'
  | 'power_binary'
  | 'other_binary';


// --- Subcategory Definitions for Sensors ---
export type SensorSubcategory =
  | 'all'
  | 'temperature'
  | 'humidity'
  | 'environmental'
  | 'energy'
  | 'battery'
  | 'network'
  | 'other_sensor';

export function classifyBinarySensor(entity: ResolvedEntity): BinarySensorSubcategory {
  const rawClass = String(entity.attributes?.device_class || '').toLowerCase();
  const eid = entity.entity_id.toLowerCase();
  const fn = (entity.name || entity.attributes?.friendly_name || '').toLowerCase();

  if (rawClass === 'door' || rawClass === 'garage_door' || rawClass === 'opening' || eid.includes('door') || fn.includes('door') || eid.includes('garage') || fn.includes('garage') || eid.includes('gate') || fn.includes('gate')) {
    return 'door';
  }
  if (rawClass === 'window' || eid.includes('window') || fn.includes('window') || eid.includes('skylight')) {
    return 'window';
  }
  if (rawClass === 'motion' || eid.includes('motion') || fn.includes('motion') || eid.includes('pir') || fn.includes('movement')) {
    return 'motion';
  }
  if (rawClass === 'occupancy' || rawClass === 'presence' || eid.includes('presence') || fn.includes('presence') || eid.includes('occupancy') || fn.includes('occupancy') || eid.includes('person')) {
    return 'presence';
  }
  if (rawClass === 'smoke' || rawClass === 'gas' || rawClass === 'carbon_monoxide' || rawClass === 'safety' || rawClass === 'tamper' || rawClass === 'problem' || eid.includes('smoke') || eid.includes('gas') || eid.includes('co_') || eid.includes('fire') || eid.includes('tamper')) {
    return 'safety';
  }
  if (isRainOrWeatherSensor(entity)) {
    return 'other_binary';
  }
  if (rawClass === 'moisture' || eid.includes('leak') || fn.includes('leak') || eid.includes('moisture') || eid.includes('flood') || fn.includes('water')) {
    return 'moisture';
  }
  if (rawClass === 'connectivity' || eid.includes('connectivity') || eid.includes('ping') || eid.includes('online') || fn.includes('status') || eid.includes('connected')) {
    return 'connectivity';
  }
  if (rawClass === 'battery_charging' || rawClass === 'plug' || rawClass === 'power' || eid.includes('charging') || eid.includes('plugged') || fn.includes('power')) {
    return 'power_binary';
  }
  return 'other_binary';
}

export function classifySensor(entity: ResolvedEntity): SensorSubcategory {
  const rawClass = String(entity.attributes?.device_class || '').toLowerCase();
  const unit = String(entity.attributes?.unit_of_measurement || '');
  const eid = entity.entity_id.toLowerCase();
  const fn = (entity.name || entity.attributes?.friendly_name || '').toLowerCase();

  // 1. Battery percentage
  if (rawClass === 'battery' || eid.includes('battery') || fn.includes('battery') || (unit === '%' && (eid.includes('batt') || fn.includes('batt')))) {
    return 'battery';
  }
  // 2. Temperature
  if (rawClass === 'temperature' || unit.includes('°C') || unit.includes('°F') || unit === 'K' || eid.includes('temperature') || eid.includes('_temp') || fn.includes('temp')) {
    return 'temperature';
  }
  // 3. Humidity
  if (rawClass === 'humidity' || (unit === '%' && (eid.includes('humidity') || fn.includes('humidity') || eid.includes('hygro')))) {
    return 'humidity';
  }
  // 4. Energy & Electricity
  if (
    rawClass === 'energy' ||
    rawClass === 'power' ||
    rawClass === 'current' ||
    rawClass === 'voltage' ||
    rawClass === 'monetary' ||
    unit.toLowerCase() === 'w' ||
    unit.toLowerCase() === 'kw' ||
    unit.toLowerCase() === 'kwh' ||
    unit.toLowerCase() === 'wh' ||
    unit.toLowerCase() === 'v' ||
    unit.toLowerCase() === 'a' ||
    unit.toLowerCase() === 'ma' ||
    eid.includes('power') ||
    eid.includes('energy') ||
    eid.includes('kwh') ||
    eid.includes('watt') ||
    eid.includes('voltage') ||
    eid.includes('current') ||
    fn.includes('energy') ||
    fn.includes('power') ||
    fn.includes('consumption')
  ) {
    return 'energy';
  }
  // 5. Environmental & Air Quality
  if (
    rawClass === 'atmospheric_pressure' ||
    rawClass === 'carbon_dioxide' ||
    rawClass === 'carbon_monoxide' ||
    rawClass === 'pm25' ||
    rawClass === 'pm10' ||
    rawClass === 'volatile_organic_compounds' ||
    rawClass === 'illuminance' ||
    rawClass === 'uv_index' ||
    rawClass === 'air_quality' ||
    rawClass === 'aqi' ||
    unit.toLowerCase().includes('ppm') ||
    unit.toLowerCase().includes('lx') ||
    unit.toLowerCase().includes('lux') ||
    unit.toLowerCase().includes('hpa') ||
    unit.toLowerCase().includes('bar') ||
    unit.toLowerCase().includes('µg/m³') ||
    eid.includes('co2') ||
    eid.includes('air_quality') ||
    fn.includes('air quality') ||
    eid.includes('pressure') ||
    eid.includes('illuminance')
  ) {
    return 'environmental';
  }
  // 6. Network & Signal
  if (
    rawClass === 'signal_strength' ||
    rawClass === 'data_rate' ||
    rawClass === 'data_size' ||
    unit.toLowerCase().includes('dbm') ||
    unit.toLowerCase().includes('db') ||
    unit.toLowerCase().includes('mbps') ||
    unit.toLowerCase().includes('kbps') ||
    unit.toLowerCase().includes('ms') ||
    eid.includes('wifi') ||
    eid.includes('rssi') ||
    eid.includes('signal') ||
    eid.includes('ping') ||
    eid.includes('bandwidth') ||
    eid.includes('lqi') ||
    eid.includes('linkquality') ||
    fn.includes('signal') ||
    fn.includes('ping')
  ) {
    return 'network';
  }
  return 'other_sensor';
}
