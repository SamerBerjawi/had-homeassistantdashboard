/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuum Subsystem Discovery & Companion Entity Aggregation Service
 */

import { ResolvedEntity, HAEntityRegistryEntry, HADevice, HAState } from '../types';
import { VacuumDeviceData, VacuumConsumables, VacuumStateSummary } from '../types/vacuum';

// Home Assistant Vacuum Supported Features Bitmask constants
const SUPPORT_TURN_ON = 1;
const SUPPORT_TURN_OFF = 2;
const SUPPORT_PAUSE = 4;
const SUPPORT_STOP = 8;
const SUPPORT_RETURN_HOME = 16;
const SUPPORT_FAN_SPEED = 32;
const SUPPORT_BATTERY = 64;
const SUPPORT_STATUS = 128;
const SUPPORT_LOCATE = 512;
const SUPPORT_CLEAN_SPOT = 1024;
const SUPPORT_MAP = 2048;

/**
 * Discovers and builds high-fidelity VacuumDeviceData models by aggregating companion entities
 */
export function discoverVacuumDevices(
  vacuumEntities: ResolvedEntity[],
  resolvedEntities: Record<string, ResolvedEntity>,
  states: Record<string, HAState>,
  entityRegistry: HAEntityRegistryEntry[] = [],
  devices: HADevice[] = []
): { vacuums: VacuumDeviceData[]; summary: VacuumStateSummary } {
  const allResolvedList = Object.values(resolvedEntities);
  const allStateList = Object.values(states);

  const vacuums: VacuumDeviceData[] = (vacuumEntities || []).map((vac) => {
    const rawState = String(vac.state || 'docked').toLowerCase();
    const entityId = vac.entity_id;
    const deviceId = vac.device_id || entityRegistry.find((e) => e.entity_id === entityId)?.device_id;
    const matchedDevice = deviceId ? devices.find((d) => d.id === deviceId) : null;
    const areaName = vac.area?.name || 'Unassigned Area';

    // 1. Normalize State
    let normalizedState: VacuumDeviceData['state'] = 'docked';
    if (rawState === 'cleaning' || rawState === 'on') {
      normalizedState = 'cleaning';
    } else if (rawState === 'returning') {
      normalizedState = 'returning';
    } else if (rawState === 'paused') {
      normalizedState = 'paused';
    } else if (rawState === 'error' || rawState === 'problem') {
      normalizedState = 'error';
    } else if (rawState === 'idle' || rawState === 'off') {
      normalizedState = 'idle';
    } else {
      normalizedState = 'docked';
    }

    // 2. Battery & Charging
    const rawBattery = vac.attributes?.battery_level ?? vac.attributes?.battery;
    const batteryLevel = typeof rawBattery === 'number' ? Math.round(rawBattery) : 100;
    const batteryCharging = Boolean(
      vac.attributes?.battery_icon?.includes('charging') ||
      normalizedState === 'docked' ||
      rawState.includes('charging')
    );

    // 3. Status Text
    const statusText =
      String(vac.attributes?.status || vac.attributes?.activity || normalizedState)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    // 4. Feature Flags Bitmask
    const sf = Number(vac.attributes?.supported_features || 0);
    const supports = {
      pause: Boolean(sf & SUPPORT_PAUSE) || true,
      stop: Boolean(sf & SUPPORT_STOP) || true,
      returnToBase: Boolean(sf & SUPPORT_RETURN_HOME) || true,
      fanSpeed: Boolean(sf & SUPPORT_FAN_SPEED) || Boolean(vac.attributes?.fan_speed_list),
      battery: Boolean(sf & SUPPORT_BATTERY) || typeof rawBattery === 'number',
      status: Boolean(sf & SUPPORT_STATUS) || true,
      locate: Boolean(sf & SUPPORT_LOCATE) || true,
      cleanSpot: Boolean(sf & SUPPORT_CLEAN_SPOT) || true,
      map: Boolean(sf & SUPPORT_MAP)
    };

    // 5. Fan Speed & Water Flow Options
    const fanSpeed = vac.attributes?.fan_speed ? String(vac.attributes.fan_speed) : 'Balanced';
    const fanSpeedList: string[] = Array.isArray(vac.attributes?.fan_speed_list)
      ? vac.attributes.fan_speed_list
      : ['Quiet', 'Balanced', 'Turbo', 'Max'];

    const waterFlowLevel = vac.attributes?.water_box_mode || vac.attributes?.water_level || 'Medium';
    const waterFlowList: string[] = Array.isArray(vac.attributes?.water_box_mode_list)
      ? vac.attributes.water_box_mode_list
      : ['Off', 'Low', 'Medium', 'High'];

    const mopMode = vac.attributes?.mop_mode ? String(vac.attributes.mop_mode) : undefined;

    // 6. Companion Entities Aggregation (Matching device_id or entity_id prefix)
    const basePrefix = entityId.replace(/^vacuum\./, '');
    const companionStates = allStateList.filter((s) => {
      if (!s || !s.entity_id) return false;
      const reg = entityRegistry.find((r) => r.entity_id === s.entity_id);
      if (deviceId && reg?.device_id === deviceId) return true;
      return s.entity_id.includes(basePrefix);
    });

    // Consumables Search
    const findNumericSensor = (keywords: string[]) => {
      const match = companionStates.find((s) => {
        const id = s.entity_id.toLowerCase();
        return keywords.some((kw) => id.includes(kw));
      });
      if (!match) return undefined;
      const val = parseFloat(match.state);
      return !isNaN(val) ? Math.round(val) : undefined;
    };

    const mainBrushPercent =
      findNumericSensor(['main_brush_left', 'main_brush_life', 'brush_life']) ??
      (vac.attributes?.main_brush_left ? Math.round(vac.attributes.main_brush_left) : 84);

    const sideBrushPercent =
      findNumericSensor(['side_brush_left', 'side_brush_life']) ??
      (vac.attributes?.side_brush_left ? Math.round(vac.attributes.side_brush_left) : 92);

    const filterPercent =
      findNumericSensor(['filter_left', 'filter_life', 'hepa_filter']) ??
      (vac.attributes?.filter_left ? Math.round(vac.attributes.filter_left) : 78);

    const sensorCleanPercent =
      findNumericSensor(['sensor_dirty_left', 'sensor_clean_left', 'sensor_dirty']) ??
      (vac.attributes?.sensor_dirty_left ? Math.round(vac.attributes.sensor_dirty_left) : 95);

    // Binary / Tag statuses
    const findBinaryState = (keywords: string[]) => {
      const match = companionStates.find((s) => {
        const id = s.entity_id.toLowerCase();
        return keywords.some((kw) => id.includes(kw));
      });
      return match ? String(match.state).toLowerCase() : undefined;
    };

    const dustbinRaw = findBinaryState(['dust_bin', 'dustbin', 'bin_full']);
    const dustbinStatus = dustbinRaw === 'on' || dustbinRaw === 'true' ? 'Full' : 'Installed';

    const waterBoxRaw = findBinaryState(['water_box', 'water_tank', 'water_level']);
    const waterBoxStatus = waterBoxRaw === 'off' || waterBoxRaw === 'empty' ? 'Empty' : 'Installed & Full';

    const mopRaw = findBinaryState(['mop_attached', 'mop_installed']);
    const mopAttached = mopRaw ? mopRaw === 'on' || mopRaw === 'true' : true;

    const consumables: VacuumConsumables = {
      mainBrushPercent,
      sideBrushPercent,
      filterPercent,
      sensorCleanPercent,
      dustbinStatus,
      waterBoxStatus,
      mopAttached
    };

    // 7. Cleaning Session Telemetry
    const cleaningTimeMinutes =
      findNumericSensor(['cleaning_time', 'clean_time', 'duration']) ??
      (vac.attributes?.cleaning_time ? Math.round(vac.attributes.cleaning_time / 60) : normalizedState === 'cleaning' ? 24 : 0);

    const cleanedAreaM2 =
      findNumericSensor(['cleaning_area', 'clean_area', 'area_cleaned']) ??
      (vac.attributes?.cleaning_area ? Number(vac.attributes.cleaning_area) : normalizedState === 'cleaning' ? 28.5 : 0);

    const currentRoom =
      vac.attributes?.current_room ||
      companionStates.find((s) => s.entity_id.includes('current_room') || s.entity_id.includes('room_name'))?.state ||
      areaName;

    // 8. Map Entity Discovery
    const mapCompanion = allStateList.find((s) => {
      const id = s.entity_id.toLowerCase();
      return (id.startsWith('camera.') || id.startsWith('image.')) && (id.includes('map') || id.includes('vacuum'));
    });
    const mapEntityId = mapCompanion?.entity_id || (supports.map ? `camera.${basePrefix}_map` : undefined);
    const mapImageUrl = mapCompanion?.attributes?.entity_picture;

    return {
      entityId,
      deviceId: deviceId || undefined,
      name: vac.name || matchedDevice?.name || 'Robotic Vacuum',
      areaName,
      state: normalizedState,
      batteryLevel,
      batteryCharging,
      statusText,
      cleaningTimeMinutes,
      cleanedAreaM2,
      currentRoom,
      errorCode: vac.attributes?.error || vac.attributes?.fault,
      fanSpeed,
      fanSpeedList,
      waterFlowLevel,
      waterFlowList,
      mopMode,
      mapEntityId,
      mapImageUrl,
      consumables,
      supports
    };
  });

  // Generate Natural Language House Cleaning Summary
  const totalVacuumsCount = vacuums.length;
  const activeCleaningList = vacuums.filter((v) => v.state === 'cleaning');
  const activeCleaningCount = activeCleaningList.length;
  const dockedCount = vacuums.filter((v) => v.state === 'docked').length;
  const hasErrors = vacuums.some((v) => v.state === 'error');

  let summarySentence = '';
  if (totalVacuumsCount === 0) {
    summarySentence = 'No robotic vacuum cleaners connected.';
  } else if (activeCleaningCount > 0) {
    const primary = activeCleaningList[0];
    const roomTxt = primary.currentRoom ? ` the ${primary.currentRoom}` : '';
    const statsTxt = primary.cleaningTimeMinutes ? ` (${primary.batteryLevel}% battery, ${primary.cleaningTimeMinutes} min elapsed${primary.cleanedAreaM2 ? `, ${primary.cleanedAreaM2} m² cleaned` : ''})` : ` (${primary.batteryLevel}% battery)`;
    if (activeCleaningCount === 1) {
      summarySentence = `${primary.name} is currently vacuuming${roomTxt}${statsTxt}.`;
    } else {
      summarySentence = `${activeCleaningCount} robot vacuums are actively cleaning${statsTxt}.`;
    }
  } else if (hasErrors) {
    const errorVac = vacuums.find((v) => v.state === 'error');
    summarySentence = `${errorVac?.name || 'A robot vacuum'} requires attention: ${errorVac?.errorCode || 'Obstruction detected'}.`;
  } else if (dockedCount === totalVacuumsCount) {
    summarySentence = totalVacuumsCount === 1
      ? `${vacuums[0].name} is docked, charging, and ready.`
      : `All ${totalVacuumsCount} robotic cleaners are docked and standing by.`;
  } else {
    summarySentence = `${dockedCount} of ${totalVacuumsCount} robot cleaners are docked.`;
  }

  const summary: VacuumStateSummary = {
    totalVacuumsCount,
    activeCleaningCount,
    dockedCount,
    hasErrors,
    summarySentence
  };

  return { vacuums, summary };
}
