/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export type SwitchDeviceClass = 'outlet' | 'switch' | 'relay' | 'power_strip' | 'generic';

export interface SwitchCapabilities {
  isOn: boolean;
  deviceClass: SwitchDeviceClass;
  deviceClassLabel: string;
  hasPowerMonitoring: boolean;
  currentPowerWatts?: number;
  hasEnergyMonitoring: boolean;
  energyKwh?: number;
  voltage?: number;
  currentAmps?: number;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

/**
 * Detects switch capabilities and power telemetry from Home Assistant attributes
 */
export function detectSwitchCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): SwitchCapabilities {
  if (!entity) {
    return {
      isOn: false,
      deviceClass: 'generic',
      deviceClassLabel: 'Switch',
      hasPowerMonitoring: false,
      hasEnergyMonitoring: false,
      friendlyName: 'Switch'
    };
  }

  const attrs = entity.attributes || {};
  const isOn = entity.state === 'on';
  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;

  // 1. Device Class
  let deviceClass: SwitchDeviceClass = 'generic';
  let deviceClassLabel = 'Switch';

  const rawClass = String(attrs.device_class || '').toLowerCase();
  const eid = entity.entity_id.toLowerCase();

  if (rawClass === 'outlet' || eid.includes('outlet') || eid.includes('plug') || eid.includes('socket')) {
    deviceClass = 'outlet';
    deviceClassLabel = 'Smart Outlet';
  } else if (rawClass === 'switch' || eid.includes('switch') || eid.includes('relay')) {
    deviceClass = 'switch';
    deviceClassLabel = 'Power Switch';
  }

  // 2. Power Consumption Telemetry (Watts)
  let currentPowerWatts: number | undefined;
  const rawPower =
    attrs.current_power_w ??
    attrs.power ??
    attrs.power_consumption ??
    attrs.current_power ??
    ('powerWatts' in entity ? (entity as any).powerWatts : undefined);

  if (typeof rawPower === 'number' && !isNaN(rawPower)) {
    currentPowerWatts = Math.round(rawPower * 10) / 10;
  } else if (typeof rawPower === 'string') {
    const p = parseFloat(rawPower);
    if (!isNaN(p)) currentPowerWatts = Math.round(p * 10) / 10;
  }

  const hasPowerMonitoring = currentPowerWatts !== undefined;

  // 3. Cumulative Energy Telemetry (kWh)
  let energyKwh: number | undefined;
  const rawEnergy =
    attrs.energy ??
    attrs.total_energy_kwh ??
    attrs.today_energy_kwh ??
    attrs.energy_kwh;

  if (typeof rawEnergy === 'number' && !isNaN(rawEnergy)) {
    energyKwh = Math.round(rawEnergy * 100) / 100;
  } else if (typeof rawEnergy === 'string') {
    const e = parseFloat(rawEnergy);
    if (!isNaN(e)) energyKwh = Math.round(e * 100) / 100;
  }

  const hasEnergyMonitoring = energyKwh !== undefined;

  // 4. Voltage & Current
  const voltage = typeof attrs.voltage === 'number' ? attrs.voltage : typeof attrs.voltage_v === 'number' ? attrs.voltage_v : undefined;
  const currentAmps = typeof attrs.current === 'number' ? attrs.current : typeof attrs.current_a === 'number' ? attrs.current_a : undefined;

  // 5. Last Changed Timestamp
  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    isOn,
    deviceClass,
    deviceClassLabel,
    hasPowerMonitoring,
    currentPowerWatts,
    hasEnergyMonitoring,
    energyKwh,
    voltage,
    currentAmps,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
