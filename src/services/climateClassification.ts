/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';
import { haWebSocketService } from './haWebSocket';

export interface ClimateCapabilities {
  isOn: boolean;
  currentTemp?: number;
  targetTemp?: number;
  targetTempHigh?: number;
  targetTempLow?: number;
  isDualSetpoint: boolean;
  minTemp: number;
  maxTemp: number;
  targetTempStep: number;
  hvacMode: string;
  hvacModes: string[];
  hvacAction?: string;
  presetMode?: string;
  presetModes: string[];
  fanMode?: string;
  fanModes: string[];
  swingMode?: string;
  swingModes: string[];
  currentHumidity?: number;
  unit: string;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectClimateCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): ClimateCapabilities {
  if (!entity) {
    return {
      isOn: false,
      minTemp: 10,
      maxTemp: 35,
      targetTempStep: 0.5,
      hvacMode: 'off',
      hvacModes: ['heat', 'off'],
      presetModes: [],
      fanModes: [],
      swingModes: [],
      unit: '°C',
      isDualSetpoint: false,
      friendlyName: 'Thermostat'
    };
  }

  const attrs = entity.attributes || {};
  const stateStr = String(entity.state || 'off').toLowerCase();
  const isOn = stateStr !== 'off' && stateStr !== 'unavailable';
  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;

  // Temperature values
  const currentTemp = typeof attrs.current_temperature === 'number' ? attrs.current_temperature : undefined;
  const targetTemp = typeof attrs.temperature === 'number' ? attrs.temperature : typeof attrs.target_temp === 'number' ? attrs.target_temp : undefined;
  const targetTempHigh = typeof attrs.target_temp_high === 'number' ? attrs.target_temp_high : undefined;
  const targetTempLow = typeof attrs.target_temp_low === 'number' ? attrs.target_temp_low : undefined;
  const isDualSetpoint = targetTempHigh !== undefined && targetTempLow !== undefined;

  const minTemp = typeof attrs.min_temp === 'number' ? attrs.min_temp : 10;
  const maxTemp = typeof attrs.max_temp === 'number' ? attrs.max_temp : 35;
  const targetTempStep = typeof attrs.target_temp_step === 'number' ? attrs.target_temp_step : 0.5;

  // Modes
  const hvacMode = String(attrs.hvac_mode || entity.state || 'off').toLowerCase();
  const rawHvacModes = Array.isArray(attrs.hvac_modes) ? attrs.hvac_modes : [];
  const hvacModes = rawHvacModes.length > 0 ? rawHvacModes : ['heat', 'off'];
  const hvacAction = typeof attrs.hvac_action === 'string' ? attrs.hvac_action : undefined;

  // Optional Presets & Fan Modes (Strictly only real ones from device)
  const rawPresetModes = Array.isArray(attrs.preset_modes) ? attrs.preset_modes : [];
  const presetMode = typeof attrs.preset_mode === 'string' ? attrs.preset_mode : undefined;

  const rawFanModes = Array.isArray(attrs.fan_modes) ? attrs.fan_modes : [];
  const fanMode = typeof attrs.fan_mode === 'string' ? attrs.fan_mode : undefined;

  const rawSwingModes = Array.isArray(attrs.swing_modes) ? attrs.swing_modes : [];
  const swingMode = typeof attrs.swing_mode === 'string' ? attrs.swing_mode : undefined;

  const currentHumidity = typeof attrs.current_humidity === 'number' ? attrs.current_humidity : typeof attrs.humidity === 'number' ? attrs.humidity : undefined;
  const unit = typeof attrs.temperature_unit === 'string' ? attrs.temperature_unit : '°C';
  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    isOn,
    currentTemp,
    targetTemp: targetTemp ?? (haWebSocketService.isDemo() && !isDualSetpoint ? 21.0 : undefined),
    targetTempHigh,
    targetTempLow,
    isDualSetpoint,
    minTemp,
    maxTemp,
    targetTempStep,
    hvacMode,
    hvacModes,
    hvacAction,
    presetMode,
    presetModes: rawPresetModes,
    fanMode,
    fanModes: rawFanModes,
    swingMode,
    swingModes: rawSwingModes,
    currentHumidity,
    unit,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
