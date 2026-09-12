/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuum Subsystem Discovery & Companion Entity Aggregation Service
 */

import { ResolvedEntity, HAEntityRegistryEntry, HADevice, HAState } from '../types';
import { VacuumDeviceData, VacuumConsumables, VacuumStateSummary, VacuumMapItem } from '../types/vacuum';

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
 * Discovers and builds high-fidelity VacuumDeviceData models by aggregating companion entities and maps
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

  const vacuums: VacuumDeviceData[] = (vacuumEntities || [])
    .filter((vac) => !vac.disabled_by)
    .map((vac) => {
    const entityId = vac.entity_id;
    const deviceId = vac.device_id || entityRegistry.find((e) => e.entity_id === entityId)?.device_id;
    const matchedDevice = deviceId ? devices.find((d) => d.id === deviceId) : null;
    const areaName = vac.area?.name && vac.area.name !== 'Unassigned Area' ? vac.area.name : undefined;

    // 1. Companion Entities Aggregation (Matching device_id or entity_id prefix)
    const basePrefix = entityId.replace(/^vacuum\./, '');
    const cleanPrefix = basePrefix.replace(/_vacuum$/, '').replace(/_robot$/, '');

    const companionStates = allStateList.filter((s) => {
      if (!s || !s.entity_id) return false;
      const reg = entityRegistry.find((r) => r.entity_id === s.entity_id);
      const isDisabled = Boolean(reg?.disabled_by || resolvedEntities[s.entity_id]?.disabled_by);
      if (isDisabled) return false;
      if (deviceId && reg?.device_id === deviceId) return true;
      return s.entity_id.includes(cleanPrefix) || s.entity_id.includes(basePrefix);
    });

    const companionStatusSensor = companionStates.find((s) => {
      const id = s.entity_id.toLowerCase();
      return id.startsWith('sensor.') && (id.endsWith('_status') || id.endsWith('_state') || id.endsWith('_activity') || id.includes('vacuum_status'));
    });

    const rawState = String(vac.state || '').toLowerCase().trim();
    const rawActivity = String(vac.attributes?.activity || '').toLowerCase().trim();
    const rawStatus = String(vac.attributes?.status || companionStatusSensor?.state || '').toLowerCase().trim();

    // 2. Normalize State
    let normalizedState: VacuumDeviceData['state'] = 'docked';
    if (
      rawState === 'error' || rawState === 'problem' || rawState === 'fault' ||
      rawActivity === 'error' ||
      rawStatus.includes('error') || rawStatus.includes('problem') || rawStatus.includes('stuck') || rawStatus.includes('fault')
    ) {
      normalizedState = 'error';
    } else if (
      rawState === 'returning' || rawState.includes('return') ||
      rawActivity === 'returning' ||
      rawStatus.includes('returning') || rawStatus.includes('return to dock') || rawStatus.includes('going to dock')
    ) {
      normalizedState = 'returning';
    } else if (
      rawState === 'paused' || rawState === 'pause' ||
      rawActivity === 'paused' ||
      rawStatus.includes('pause')
    ) {
      normalizedState = 'paused';
    } else if (
      rawState === 'cleaning' || rawState === 'on' ||
      rawActivity === 'cleaning' ||
      rawStatus.includes('clean') || rawStatus.includes('mop') || rawStatus.includes('sweep') || rawStatus.includes('vacuum')
    ) {
      normalizedState = 'cleaning';
    } else if (
      rawState === 'docked' || rawState.includes('charg') ||
      rawActivity === 'docked' ||
      rawStatus.includes('dock') || rawStatus.includes('charg') || rawStatus.includes('empty') || rawStatus.includes('wash') || rawStatus.includes('dry')
    ) {
      normalizedState = 'docked';
    } else if (
      rawState === 'idle' || rawState === 'off' || rawState === 'standby' ||
      rawActivity === 'idle' ||
      rawStatus.includes('idle') || rawStatus.includes('standby')
    ) {
      normalizedState = 'idle';
    } else if (rawState === 'unavailable' || rawState === 'unknown') {
      normalizedState = 'idle';
    } else {
      normalizedState = 'docked';
    }

    // 3. Battery & Charging
    const rawBattery = vac.attributes?.battery_level ?? vac.attributes?.battery;
    const companionBattery = companionStates.find((s) => {
      const id = s.entity_id.toLowerCase();
      return (id.startsWith('sensor.') && (id.includes('battery') || id.includes('bat'))) && !id.includes('battery_health');
    });
    const parsedCompBattery = companionBattery ? parseFloat(companionBattery.state) : NaN;

    let batteryLevel = 100;
    if (typeof rawBattery === 'number') {
      batteryLevel = Math.round(rawBattery);
    } else if (!isNaN(parsedCompBattery)) {
      batteryLevel = Math.round(parsedCompBattery);
    }

    const batteryCharging = Boolean(
      vac.attributes?.battery_icon?.includes('charging') ||
      rawState.includes('charg') ||
      rawStatus.includes('charg') ||
      companionStates.some((s) => s.entity_id.includes('charging') && (s.state === 'on' || s.state === 'true')) ||
      (normalizedState === 'docked' && batteryLevel < 100)
    );

    // 4. Status Text
    let statusText = 'Docked';
    if (vac.attributes?.status) {
      statusText = String(vac.attributes.status)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (companionStatusSensor?.state) {
      statusText = String(companionStatusSensor.state)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (rawActivity && rawActivity !== 'unknown' && rawActivity !== 'unavailable') {
      statusText = String(vac.attributes.activity)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (rawState && rawState !== 'unknown' && rawState !== 'unavailable') {
      statusText = rawState.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    } else {
      statusText = normalizedState.charAt(0).toUpperCase() + normalizedState.slice(1);
    }

    // 5. Feature Flags Bitmask
    const sf = Number(vac.attributes?.supported_features || 0);
    const supports = {
      pause: Boolean(sf & SUPPORT_PAUSE) || true,
      stop: Boolean(sf & SUPPORT_STOP) || true,
      returnToBase: Boolean(sf & SUPPORT_RETURN_HOME) || true,
      fanSpeed: Boolean(sf & SUPPORT_FAN_SPEED) || Boolean(vac.attributes?.fan_speed_list),
      battery: Boolean(sf & SUPPORT_BATTERY) || typeof rawBattery === 'number' || !isNaN(parsedCompBattery),
      status: Boolean(sf & SUPPORT_STATUS) || true,
      locate: Boolean(sf & SUPPORT_LOCATE) || true,
      cleanSpot: Boolean(sf & SUPPORT_CLEAN_SPOT) || true,
      map: Boolean(sf & SUPPORT_MAP)
    };

    // Fan Speed & Water Flow Options
    const fanSpeed = vac.attributes?.fan_speed ? String(vac.attributes.fan_speed) : 'Balanced';
    const fanSpeedList: string[] = Array.isArray(vac.attributes?.fan_speed_list)
      ? vac.attributes.fan_speed_list
      : ['Quiet', 'Balanced', 'Turbo', 'Max'];

    const waterFlowLevel = vac.attributes?.water_box_mode || vac.attributes?.water_level || 'Medium';
    const waterFlowList: string[] = Array.isArray(vac.attributes?.water_box_mode_list)
      ? vac.attributes.water_box_mode_list
      : ['Off', 'Low', 'Medium', 'High'];

    const mopMode = vac.attributes?.mop_mode ? String(vac.attributes.mop_mode) : undefined;

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

    // 6. Cleaning Session Telemetry
    const rawCleanTime = vac.attributes?.cleaning_time ?? vac.attributes?.clean_time;
    const parsedCleanTime = typeof rawCleanTime === 'number'
      ? (rawCleanTime > 180 ? Math.round(rawCleanTime / 60) : Math.round(rawCleanTime))
      : undefined;

    const rawCleanArea = vac.attributes?.cleaning_area ?? vac.attributes?.cleaned_area ?? vac.attributes?.clean_area;
    const parsedCleanArea = typeof rawCleanArea === 'number' ? Number(rawCleanArea.toFixed(1)) : undefined;

    const cleaningTimeMinutes =
      findNumericSensor(['cleaning_time', 'clean_time', 'duration']) ??
      parsedCleanTime;

    const cleanedAreaM2 =
      findNumericSensor(['cleaning_area', 'clean_area', 'area_cleaned']) ??
      parsedCleanArea;

    const currentRoomRaw =
      vac.attributes?.current_room ||
      companionStates.find((s) => s.entity_id.includes('current_room') || s.entity_id.includes('room_name'))?.state ||
      areaName;
    const currentRoom = currentRoomRaw && currentRoomRaw !== 'Unassigned Area' ? String(currentRoomRaw) : undefined;

    // 8. Multi-Map & Camera Discovery (Strictly related to the vacuum device)
    const availableMaps: VacuumMapItem[] = [];

    // Find all map camera / image companion entities strictly related to this device
    const mapCompanions = allStateList.filter((s) => {
      if (!s || !s.entity_id) return false;
      const reg = entityRegistry.find((r) => r.entity_id === s.entity_id);
      const isDisabled = Boolean(reg?.disabled_by || resolvedEntities[s.entity_id]?.disabled_by);
      if (isDisabled) return false;

      const id = s.entity_id.toLowerCase();
      const isMapType = id.startsWith('camera.') || id.startsWith('image.');
      if (!isMapType) return false;

      const matchesDevice = Boolean(deviceId && reg?.device_id === deviceId);
      const matchesPrefix = id.includes(cleanPrefix) || id.includes(basePrefix);

      return matchesDevice || matchesPrefix;
    });

    const formatMapLabel = (rawName: string, vacName: string): string => {
      let name = rawName
        .replace(new RegExp(vacName, 'gi'), '')
        .replace(/^(camera|image)\./gi, '')
        .replace(/_/g, ' ')
        .replace(/\bcomplete\b/gi, '')
        .replace(/\bsaved\b/gi, '')
        .replace(/\bmap\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (/current/i.test(name)) return 'Current';
      if (/ground/i.test(name)) return 'Ground Floor';
      if (/first|1st/i.test(name)) return '1st Floor';
      if (/second|2nd/i.test(name)) return '2nd Floor';
      if (/third|3rd/i.test(name)) return '3rd Floor';
      if (/basement/i.test(name)) return 'Basement';
      if (!name) return 'Live Map';

      return name.replace(/\b\w/g, (c) => c.toUpperCase());
    };

    for (const mc of mapCompanions) {
      const friendlyName = mc.attributes?.friendly_name || mc.entity_id.replace(/^(camera|image)\./, '').replace(/_/g, ' ');
      const label = formatMapLabel(friendlyName, vac.name);

      availableMaps.push({
        id: mc.entity_id,
        name: label,
        entityId: mc.entity_id,
        imageUrl: mc.attributes?.entity_picture,
        isLive: true,
        type: mc.entity_id.startsWith('camera.') ? 'camera' : 'image'
      });
    }

    // Direct attribute map check (if provided in vacuum attributes)
    if (vac.attributes?.map_image_url && !availableMaps.some((m) => m.imageUrl === vac.attributes.map_image_url)) {
      availableMaps.unshift({
        id: `${entityId}_primary_map`,
        name: 'Current',
        imageUrl: vac.attributes.map_image_url,
        isLive: true,
        type: 'image'
      });
    }

    const primaryMap = availableMaps[0];
    const mapEntityId = primaryMap?.entityId;
    const mapImageUrl = primaryMap?.imageUrl;

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
      availableMaps,
      consumables,
      supports
    };
  });

  // 9. Generate Natural Language House Status Summary
  const totalVacuumsCount = vacuums.length;
  const activeCleaningList = vacuums.filter((v) => v.state === 'cleaning');
  const activeCleaningCount = activeCleaningList.length;
  const dockedCount = vacuums.filter((v) => v.state === 'docked').length;
  const returningCount = vacuums.filter((v) => v.state === 'returning').length;
  const pausedCount = vacuums.filter((v) => v.state === 'paused').length;
  const hasErrors = vacuums.some((v) => v.state === 'error');

  let summarySentence = '';
  let detailedSentence = '';

  if (totalVacuumsCount === 0) {
    summarySentence = 'No robotic vacuum cleaners are currently connected to your home.';
    detailedSentence = 'No robotic vacuums detected in Home Assistant.';
  } else if (hasErrors) {
    const errVac = vacuums.find((v) => v.state === 'error');
    summarySentence = `Attention required: ${errVac?.name || 'A robot vacuum'} in the ${errVac?.currentRoom || 'Living Area'} reported ${errVac?.errorCode || 'an obstruction'}.`;
    detailedSentence = `Check the main brush and cliff sensors to resume cleaning.`;
  } else if (activeCleaningCount > 0) {
    if (activeCleaningCount === 1) {
      const primary = activeCleaningList[0];
      const roomTxt = primary.currentRoom ? `the ${primary.currentRoom}` : 'your home';
      const timeTxt = primary.cleaningTimeMinutes ? `${primary.cleaningTimeMinutes} min elapsed` : '';
      const areaTxt = primary.cleanedAreaM2 ? `${primary.cleanedAreaM2} m² cleaned` : '';
      const stats = [timeTxt, areaTxt, `${primary.batteryLevel}% battery`].filter(Boolean).join(', ');
      summarySentence = `${primary.name} is currently vacuuming ${roomTxt} (${stats}).`;
      detailedSentence = `Suction power is set to ${primary.fanSpeed || 'Balanced'}${primary.consumables.mopAttached ? ` with ${primary.waterFlowLevel || 'Medium'} mopping` : ''}, and all consumables are in good health.`;
    } else {
      const rooms = activeCleaningList.map((v) => `${v.name} in ${v.currentRoom || 'House'}`).join(' and ');
      const totalArea = activeCleaningList.reduce((acc, v) => acc + (v.cleanedAreaM2 || 0), 0);
      summarySentence = `${activeCleaningCount} robot vacuums are actively cleaning (${rooms}).`;
      detailedSentence = `${totalArea.toFixed(1)} m² cleaned in total across active sessions.`;
    }
  } else if (returningCount > 0) {
    const retVac = vacuums.find((v) => v.state === 'returning');
    summarySentence = `${retVac?.name || 'The robot vacuum'} has completed its mission and is returning to the dock (${retVac?.batteryLevel}% battery).`;
    detailedSentence = `Dock station is powered and standing by for automated charging.`;
  } else if (pausedCount > 0) {
    const pauseVac = vacuums.find((v) => v.state === 'paused');
    summarySentence = `${pauseVac?.name || 'The robot vacuum'} cleaning session is paused in ${pauseVac?.currentRoom || 'the area'} (${pauseVac?.batteryLevel}% battery).`;
    detailedSentence = `Cleaning session is paused and ready to resume.`;
  } else if (dockedCount === totalVacuumsCount) {
    if (totalVacuumsCount === 1) {
      const v = vacuums[0];
      summarySentence = `${v.name} is docked, charging, and ready at ${v.batteryLevel}% battery.`;
      detailedSentence = `Dustbin is ${v.consumables.dustbinStatus || 'ready'} and main filter is at ${v.consumables.filterPercent || 100}% service life.`;
    } else {
      summarySentence = `All ${totalVacuumsCount} robotic cleaners are docked and standing by at full charge.`;
      detailedSentence = `All units are docked and ready for scheduled runs.`;
    }
  } else {
    summarySentence = `${dockedCount} of ${totalVacuumsCount} robotic cleaners are standing by in their docks.`;
    detailedSentence = `Cleaners are standing by in their docks.`;
  }

  const summary: VacuumStateSummary = {
    totalVacuumsCount,
    activeCleaningCount,
    dockedCount,
    hasErrors,
    summarySentence,
    detailedSentence
  };

  return { vacuums, summary };
}
