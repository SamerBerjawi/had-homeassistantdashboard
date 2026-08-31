/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export const VacuumEntityFeature = {
  TURN_ON: 1,
  TURN_OFF: 2,
  PAUSE: 4,
  STOP: 8,
  RETURN_HOME: 16,
  FAN_SPEED: 32,
  BATTERY: 64,
  STATUS: 128,
  SEND_COMMAND: 256,
  LOCATE: 512,
  CLEAN_SPOT: 1024,
  MAP: 2048,
  STATE: 4096,
  START: 8192
};

export interface VacuumCapabilities {
  state: string;
  isCleaning: boolean;
  isReturning: boolean;
  isPaused: boolean;
  isDocked: boolean;
  isError: boolean;
  batteryLevel?: number;
  isCharging: boolean;
  fanSpeed?: string;
  fanSpeedList: string[];
  waterFlowLevel?: string;
  waterFlowList: string[];
  mainBrushLeft?: number;
  sideBrushLeft?: number;
  filterLeft?: number;
  sensorDirtyLeft?: number;
  hasConsumables: boolean;
  supportsStart: boolean;
  supportsPause: boolean;
  supportsReturnHome: boolean;
  supportsLocate: boolean;
  supportsCleanSpot: boolean;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectVacuumCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): VacuumCapabilities {
  if (!entity) {
    return {
      state: 'docked',
      isCleaning: false,
      isReturning: false,
      isPaused: false,
      isDocked: true,
      isError: false,
      isCharging: true,
      batteryLevel: 100,
      fanSpeedList: [],
      waterFlowList: [],
      hasConsumables: false,
      supportsStart: true,
      supportsPause: true,
      supportsReturnHome: true,
      supportsLocate: true,
      supportsCleanSpot: false,
      friendlyName: 'Robot Vacuum'
    };
  }

  const attrs = entity.attributes || {};
  const state = String(entity.state || 'docked').toLowerCase();
  const isCleaning = state === 'cleaning' || state === 'on';
  const isReturning = state === 'returning';
  const isPaused = state === 'paused';
  const isDocked = state === 'docked';
  const isError = state === 'error';

  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;

  // Supported Features
  const sf = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
  const hasFeature = (flag: number) => (sf & flag) !== 0 || sf === 0;

  const supportsStart = hasFeature(VacuumEntityFeature.START) || hasFeature(VacuumEntityFeature.TURN_ON);
  const supportsPause = hasFeature(VacuumEntityFeature.PAUSE);
  const supportsReturnHome = hasFeature(VacuumEntityFeature.RETURN_HOME);
  const supportsLocate = hasFeature(VacuumEntityFeature.LOCATE);
  const supportsCleanSpot = hasFeature(VacuumEntityFeature.CLEAN_SPOT);

  // Battery
  const rawBattery = attrs.battery_level ?? attrs.battery ?? ('batteryPct' in entity ? (entity as any).batteryPct : undefined);
  const batteryLevel = typeof rawBattery === 'number' ? Math.round(rawBattery) : undefined;
  const isCharging = Boolean(
    attrs.battery_icon?.includes('charging') ||
    isDocked ||
    state.includes('charging')
  );

  // Fan Speed
  const fanSpeed = typeof attrs.fan_speed === 'string' ? attrs.fan_speed : undefined;
  const fanSpeedList = Array.isArray(attrs.fan_speed_list) ? attrs.fan_speed_list : [];

  // Water Flow / Mop
  const waterFlowLevel = typeof attrs.water_box_mode === 'string' ? attrs.water_box_mode : typeof attrs.water_level === 'string' ? attrs.water_level : undefined;
  const waterFlowList = Array.isArray(attrs.water_box_mode_list) ? attrs.water_box_mode_list : Array.isArray(attrs.water_level_list) ? attrs.water_level_list : [];

  // Consumables (Strictly only real ones from device)
  const mainBrushLeft = typeof attrs.main_brush_left === 'number' ? Math.round(attrs.main_brush_left) : undefined;
  const sideBrushLeft = typeof attrs.side_brush_left === 'number' ? Math.round(attrs.side_brush_left) : undefined;
  const filterLeft = typeof attrs.filter_left === 'number' ? Math.round(attrs.filter_left) : undefined;
  const sensorDirtyLeft = typeof attrs.sensor_dirty_left === 'number' ? Math.round(attrs.sensor_dirty_left) : undefined;

  const hasConsumables =
    mainBrushLeft !== undefined ||
    sideBrushLeft !== undefined ||
    filterLeft !== undefined ||
    sensorDirtyLeft !== undefined;

  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    state,
    isCleaning,
    isReturning,
    isPaused,
    isDocked,
    isError,
    batteryLevel,
    isCharging,
    fanSpeed,
    fanSpeedList,
    waterFlowLevel,
    waterFlowList,
    mainBrushLeft,
    sideBrushLeft,
    filterLeft,
    sensorDirtyLeft,
    hasConsumables,
    supportsStart,
    supportsPause,
    supportsReturnHome,
    supportsLocate,
    supportsCleanSpot,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
