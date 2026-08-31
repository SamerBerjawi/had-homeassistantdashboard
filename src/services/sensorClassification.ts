/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export type SensorKind =
  | 'temperature'
  | 'humidity'
  | 'illuminance'
  | 'co2'
  | 'air_quality'
  | 'power'
  | 'energy'
  | 'voltage'
  | 'current'
  | 'battery'
  | 'door'
  | 'window'
  | 'motion'
  | 'presence'
  | 'smoke'
  | 'moisture'
  | 'gas'
  | 'generic_binary'
  | 'generic_numeric';

export interface SensorCapabilities {
  kind: SensorKind;
  isBinary: boolean;
  isNumeric: boolean;
  rawState: string;
  formattedValue: string;
  numericValue?: number;
  unit: string;
  isActiveAlert: boolean;
  alertLabel: string;
  batteryPct?: number;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectSensorCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): SensorCapabilities {
  if (!entity) {
    return {
      kind: 'generic_numeric',
      isBinary: false,
      isNumeric: true,
      rawState: '0',
      formattedValue: '0',
      unit: '',
      isActiveAlert: false,
      alertLabel: 'Normal',
      friendlyName: 'Sensor'
    };
  }

  const attrs = entity.attributes || {};
  const stateStr = String(entity.state || '').trim();
  const rawState = stateStr.toLowerCase();
  const numValue = parseFloat(stateStr);
  const isNum = !isNaN(numValue) && stateStr !== '';

  const domain = entity.entity_id ? entity.entity_id.split('.')[0] : 'sensor';
  const rawClass = String(attrs.device_class || '').toLowerCase();
  const eid = entity.entity_id.toLowerCase();
  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;
  const fn = friendlyName.toLowerCase();
  const unit = String(attrs.unit_of_measurement || '');

  // Determine Sensor Kind with strict priority
  let kind: SensorKind = 'generic_numeric';

  const isBattery =
    rawClass === 'battery' ||
    eid.includes('battery') ||
    fn.includes('battery') ||
    (unit === '%' && (eid.includes('batt') || fn.includes('batt')));

  if (isBattery) {
    kind = 'battery';
  } else if (
    rawClass === 'temperature' ||
    unit.includes('°C') ||
    unit.includes('°F') ||
    (rawClass === '' && (eid.endsWith('_temperature') || eid.endsWith('_temp') || eid.includes('temperature_sensor')))
  ) {
    kind = 'temperature';
  } else if (
    rawClass === 'humidity' ||
    (unit === '%' && (eid.includes('humidity') || fn.includes('humidity') || eid.includes('hygro')))
  ) {
    kind = 'humidity';
  } else if (rawClass === 'illuminance' || unit.toLowerCase().includes('lx') || unit.toLowerCase().includes('lux')) {
    kind = 'illuminance';
  } else if (rawClass === 'carbon_dioxide' || rawClass === 'co2' || unit.toLowerCase().includes('ppm')) {
    kind = 'co2';
  } else if (rawClass === 'pm25' || rawClass === 'aqi' || rawClass === 'volatile_organic_compounds' || fn.includes('air quality')) {
    kind = 'air_quality';
  } else if (rawClass === 'power' || unit.toLowerCase() === 'w' || unit.toLowerCase() === 'kw') {
    kind = 'power';
  } else if (rawClass === 'energy' || unit.toLowerCase() === 'kwh' || unit.toLowerCase() === 'wh') {
    kind = 'energy';
  } else if (rawClass === 'voltage' || unit.toLowerCase() === 'v' || eid.includes('voltage') || fn.includes('voltage')) {
    kind = 'voltage';
  } else if (rawClass === 'current' || unit.toLowerCase() === 'a' || unit.toLowerCase() === 'ma' || eid.includes('current') || fn.includes('current')) {
    kind = 'current';
  } else if (rawClass === 'door' || eid.includes('door') || fn.includes('door')) {
    kind = 'door';
  } else if (rawClass === 'window' || eid.includes('window') || fn.includes('window')) {
    kind = 'window';
  } else if (rawClass === 'motion' || eid.includes('motion') || fn.includes('motion')) {
    kind = 'motion';
  } else if (rawClass === 'occupancy' || rawClass === 'presence' || eid.includes('presence')) {
    kind = 'presence';
  } else if (rawClass === 'smoke' || eid.includes('smoke')) {
    kind = 'smoke';
  } else if (rawClass === 'moisture' || eid.includes('leak') || eid.includes('moisture') || fn.includes('water')) {
    kind = 'moisture';
  } else if (rawClass === 'gas' || eid.includes('gas')) {
    kind = 'gas';
  } else if (domain === 'binary_sensor' || rawState === 'on' || rawState === 'off' || rawState === 'open' || rawState === 'closed') {
    kind = 'generic_binary';
  }

  const isBinary =
    domain === 'binary_sensor' ||
    kind === 'door' ||
    kind === 'window' ||
    kind === 'motion' ||
    kind === 'presence' ||
    kind === 'smoke' ||
    kind === 'moisture' ||
    kind === 'gas' ||
    kind === 'generic_binary';

  const isNumeric = !isBinary && isNum;

  // Alert condition evaluation (binary entities)
  let isActiveAlert = false;
  let alertLabel = 'Normal';

  if (isBinary) {
    if (kind === 'door' || kind === 'window') {
      isActiveAlert = rawState === 'on' || rawState === 'open';
      alertLabel = isActiveAlert ? 'Open' : 'Closed';
    } else if (kind === 'motion' || kind === 'presence') {
      isActiveAlert = rawState === 'on' || rawState === 'detected';
      alertLabel = isActiveAlert ? 'Motion Detected' : 'Clear';
    } else if (kind === 'smoke') {
      isActiveAlert = rawState === 'on' || rawState === 'detected';
      alertLabel = isActiveAlert ? 'Smoke Alert' : 'Clear';
    } else if (kind === 'moisture') {
      isActiveAlert = rawState === 'on' || rawState === 'detected';
      alertLabel = isActiveAlert ? 'Water Leak Detected' : 'Dry & Safe';
    } else if (kind === 'gas') {
      isActiveAlert = rawState === 'on' || rawState === 'detected';
      alertLabel = isActiveAlert ? 'Gas Detected' : 'Clear';
    } else {
      isActiveAlert = rawState === 'on';
      alertLabel = isActiveAlert ? 'Active' : 'Off';
    }
  }

  // Format value: for numeric sensors always include the formatted number + unit
  let formattedValue = '';
  if (isNumeric) {
    const rounded = Math.abs(numValue) < 10 && numValue % 1 !== 0
      ? Math.round(numValue * 100) / 100
      : Math.round(numValue * 10) / 10;
    formattedValue = `${rounded}${unit ? ` ${unit}` : ''}`;
  } else if (!isBinary && stateStr && stateStr !== 'unknown' && stateStr !== 'unavailable') {
    formattedValue = `${stateStr}${unit ? ` ${unit}` : ''}`;
  } else {
    formattedValue = alertLabel;
  }

  // Battery
  const rawBattery = attrs.battery_level ?? attrs.battery ?? ('batteryPct' in entity ? (entity as any).batteryPct : undefined);
  const batteryPct = typeof rawBattery === 'number' ? Math.round(rawBattery) : (kind === 'battery' && isNum ? Math.round(numValue) : undefined);

  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    kind,
    isBinary,
    isNumeric,
    rawState,
    formattedValue,
    numericValue: isNumeric ? numValue : undefined,
    unit,
    isActiveAlert,
    alertLabel,
    batteryPct,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
