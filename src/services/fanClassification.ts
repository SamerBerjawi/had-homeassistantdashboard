/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResolvedEntity } from '../types';

export interface FanCapabilities {
  // Power & Speed
  isOn: boolean;
  supportsSpeed: boolean;
  percentage: number;
  percentageStep: number;
  speedMode: 'discrete' | 'continuous';
  speedLevels: number[];
  
  // Oscillation
  supportsOscillation: boolean;
  isOscillating: boolean;
  
  // Oscillation Angle / Degrees (e.g. DREO 30°, 60°, 90°, 120°)
  supportsOscillationAngle: boolean;
  currentAngle?: number;
  availableAngles: number[];
  
  // Direction (e.g. Forward / Reverse for ceiling fans)
  supportsDirection: boolean;
  currentDirection?: 'forward' | 'reverse';
  
  // Preset Modes (e.g. Natural, Sleep, Auto, Turbo)
  supportsPresetModes: boolean;
  presetModes: string[];
  currentPresetMode?: string;
  
  // Temperature (e.g. Tuya / Duux heater-cooler / smart temperature target)
  supportsTemperature: boolean;
  currentTemperature?: number;
  targetTemperature?: number;
  temperatureUnit: string;
  
  // Brand or Device Classification Hint
  brandKind: 'tuya' | 'dreo' | 'duux' | 'dyson' | 'generic';
}

// Home Assistant Fan Entity Feature Flags
export const FanEntityFeature = {
  SET_SPEED: 1,
  OSCILLATE: 2,
  DIRECTION: 4,
  PRESET_MODE: 8,
  TURN_OFF: 16,
  TURN_ON: 32
};

export function detectFanCapabilities(
  fan: ResolvedEntity,
  allEntities: ResolvedEntity[] = []
): FanCapabilities {
  const attrs = fan.attributes || {};
  const feat = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
  const eid = (fan.entity_id || '').toLowerCase();
  const name = ((fan.name || attrs.friendly_name || '') + ' ' + eid).toLowerCase();

  const isOn = fan.state === 'on';

  // 1. Brand Detection
  let brandKind: FanCapabilities['brandKind'] = 'generic';
  if (name.includes('duux') || eid.includes('duux')) {
    brandKind = 'duux';
  } else if (name.includes('dreo') || eid.includes('dreo')) {
    brandKind = 'dreo';
  } else if (name.includes('tuya') || eid.includes('tuya')) {
    brandKind = 'tuya';
  } else if (name.includes('dyson') || eid.includes('dyson')) {
    brandKind = 'dyson';
  }

  // 2. Oscillation Support Detection
  // Strict rule: Only true if explicitly supported in features or attributes
  const hasOscillateFeature = (feat & FanEntityFeature.OSCILLATE) !== 0;
  const hasOscillateAttr = attrs.oscillating !== undefined;
  // If Tuya / Duux without oscillation attribute or feature, it is FALSE
  const supportsOscillation = hasOscillateFeature || hasOscillateAttr;
  const isOscillating = Boolean(attrs.oscillating);

  // 3. Oscillation Angle / Degrees Support (e.g. DREO 30°, 60°, 90°, 120°)
  const hasAngleAttr = attrs.oscillation_angle !== undefined || attrs.angle !== undefined || attrs.oscillating_angle !== undefined;
  const availableAngles: number[] = Array.isArray(attrs.available_angles)
    ? attrs.available_angles
    : Array.isArray(attrs.angles)
    ? attrs.angles
    : (supportsOscillation && (brandKind === 'dreo' || name.includes('tower') || hasAngleAttr))
    ? [30, 60, 90, 120]
    : [];

  const supportsOscillationAngle = supportsOscillation && (hasAngleAttr || availableAngles.length > 0);
  const currentAngle = typeof attrs.oscillation_angle === 'number'
    ? attrs.oscillation_angle
    : typeof attrs.angle === 'number'
    ? attrs.angle
    : availableAngles[0] || 90;

  // 4. Direction Support (Forward / Reverse)
  const hasDirectionFeature = (feat & FanEntityFeature.DIRECTION) !== 0;
  const hasDirectionAttr = attrs.direction !== undefined;
  const supportsDirection = hasDirectionFeature || hasDirectionAttr;
  const currentDirection = (attrs.direction === 'reverse' ? 'reverse' : 'forward') as 'forward' | 'reverse';

  // 5. Preset Modes (Nature, Sleep, Auto, Turbo, Normal)
  const hasPresetFeature = (feat & FanEntityFeature.PRESET_MODE) !== 0;
  const rawPresetModes = Array.isArray(attrs.preset_modes) ? attrs.preset_modes : [];
  const supportsPresetModes = (hasPresetFeature || rawPresetModes.length > 0) && rawPresetModes.length > 0;
  const presetModes = supportsPresetModes ? rawPresetModes : [];
  const currentPresetMode = attrs.preset_mode || (supportsPresetModes ? presetModes[0] : undefined);

  // 6. Speed & Percentage
  const hasSpeedFeature = (feat & FanEntityFeature.SET_SPEED) !== 0;
  const hasPercentageAttr = typeof attrs.percentage === 'number';
  const supportsSpeed = hasSpeedFeature || hasPercentageAttr || attrs.speed !== undefined || attrs.speed_list !== undefined;
  const percentage = typeof attrs.percentage === 'number' ? attrs.percentage : (isOn ? 66 : 0);
  const percentageStep = typeof attrs.percentage_step === 'number' ? attrs.percentage_step : 1;

  // Check if device uses discrete levels (e.g. Duux 1-12 or 1-3 speeds)
  const speedLevels = brandKind === 'duux' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [25, 50, 75, 100];
  const speedMode = brandKind === 'duux' ? 'discrete' : 'continuous';

  // 7. Temperature Support (Duux / Tuya smart fan with temp readout or thermostat target)
  const tempAttr = typeof attrs.temperature === 'number' ? attrs.temperature : typeof attrs.current_temperature === 'number' ? attrs.current_temperature : undefined;
  const targetTempAttr = typeof attrs.target_temperature === 'number' ? attrs.target_temperature : undefined;
  
  // Also look for paired device entities (e.g. sensor.duux_temperature or climate entity in same area)
  const pairedTempEntity = allEntities.find(e => 
    (e.entity_id.startsWith('sensor.') || e.entity_id.startsWith('number.')) &&
    (e.entity_id.includes(fan.entity_id.replace('fan.', '')) || (fan.area?.area_id && e.area?.area_id === fan.area?.area_id && e.attributes?.device_class === 'temperature'))
  );

  const currentTemperature = tempAttr ?? (typeof pairedTempEntity?.attributes?.temperature === 'number' ? pairedTempEntity.attributes.temperature : (typeof pairedTempEntity?.state === 'number' || !isNaN(Number(pairedTempEntity?.state))) ? Number(pairedTempEntity.state) : (brandKind === 'duux' ? 22 : undefined));
  const targetTemperature = targetTempAttr ?? (brandKind === 'duux' ? 21 : undefined);
  const supportsTemperature = currentTemperature !== undefined || targetTemperature !== undefined;
  const temperatureUnit = attrs.temperature_unit || '°C';

  return {
    isOn,
    supportsSpeed,
    percentage,
    percentageStep,
    speedMode,
    speedLevels,
    supportsOscillation,
    isOscillating,
    supportsOscillationAngle,
    currentAngle,
    availableAngles,
    supportsDirection,
    currentDirection,
    supportsPresetModes,
    presetModes,
    currentPresetMode,
    supportsTemperature,
    currentTemperature,
    targetTemperature,
    temperatureUnit,
    brandKind
  };
}
