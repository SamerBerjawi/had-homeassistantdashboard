/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dynamic discovery, sensor aggregation, hierarchical grouping,
 * and bulk action dispatcher hook for Home Assistant Rooms / Areas.
 * Fully integrates with customizable floor/area icons and colors from Settings.
 */

import { useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useUserConfig } from './useUserConfig';
import { ResolvedEntity, HAArea, HAFloor } from '../types';
import {
  AreaData,
  AreaEntityGroup,
  AreaSensorSummary,
  FloorData,
  HouseStateSummary
} from '../types/rooms';
import {
  isDoorSensor,
  isWindowSensor,
  isMotionSensor,
  isLeakSensor,
  isSmokeSensor
} from '../lib/entityClassifiers';

export function useRoomsData() {
  const { config } = useUserConfig();
  const {
    resolvedEntities,
    areas: storeAreas,
    floors: storeFloors,
    rawAreas,
    rawFloors,
    rawDevices,
    states,
    callHAService,
    updateEntityState
  } = useAutoLayoutStore(
    useShallow((s) => ({
      resolvedEntities: s.resolvedEntities,
      areas: s.areas,
      floors: s.floors,
      rawAreas: s.rawAreas,
      rawFloors: s.rawFloors,
      rawDevices: s.rawDevices,
      states: s.states,
      callHAService: s.callHAService,
      updateEntityState: s.updateEntityState
    }))
  );

  // Use configured areas & floors (fallback to raw if needed)
  const activeAreas = (storeAreas && storeAreas.length > 0) ? storeAreas : rawAreas || [];
  const activeFloors = (storeFloors && storeFloors.length > 0) ? storeFloors : rawFloors || [];

  // 1. Group all resolved entities by areaId (direct match or inherited from device)
  const entitiesByArea = useMemo(() => {
    const map: Record<string, ResolvedEntity[]> = {};
    const entityList = Object.values(resolvedEntities || {});

    // Create device lookup for inherited areas
    const deviceAreaMap: Record<string, string> = {};
    for (const d of rawDevices || []) {
      if (d.id && d.area_id) {
        deviceAreaMap[d.id] = d.area_id;
      }
    }

    for (const entity of entityList) {
      if (entity.hidden || entity.disabled_by) continue;

      let areaId = entity.area_id;
      if (!areaId && entity.device_id) {
        areaId = deviceAreaMap[entity.device_id] || null;
      }

      if (areaId) {
        if (!map[areaId]) {
          map[areaId] = [];
        }
        map[areaId].push(entity);
      }
    }

    return map;
  }, [resolvedEntities, rawDevices]);

  // 2. Build Floor Name Lookup (with custom icon & accent color)
  const floorMap = useMemo(() => {
    const map: Record<string, HAFloor> = {};
    for (const floor of activeFloors) {
      if (floor.floor_id) {
        map[floor.floor_id] = floor;
      }
    }
    return map;
  }, [activeFloors]);

  // 3. Build AreaData structure for all areas with real telemetry & custom styling
  const areasDataList: AreaData[] = useMemo(() => {
    const rawList: AreaData[] = activeAreas.map((area) => {
      const areaEntities = entitiesByArea[area.area_id] || [];
      const floor = area.floor_id ? floorMap[area.floor_id] : undefined;

      // Group entities by domain
      const entityGroup: AreaEntityGroup = {
        lights: [],
        switches: [],
        climates: [],
        mediaPlayers: [],
        fans: [],
        covers: [],
        locks: [],
        sensors: [],
        binarySensors: [],
        vacuums: [],
        cameras: [],
        scenes: []
      };

      for (const ent of areaEntities) {
        const domain = ent.domain;
        if (domain === 'light') {
          entityGroup.lights.push(ent);
        } else if (domain === 'switch' || domain === 'outlet') {
          entityGroup.switches.push(ent);
        } else if (domain === 'climate') {
          entityGroup.climates.push(ent);
        } else if (domain === 'media_player') {
          entityGroup.mediaPlayers.push(ent);
        } else if (domain === 'fan') {
          entityGroup.fans.push(ent);
        } else if (domain === 'cover') {
          entityGroup.covers.push(ent);
        } else if (domain === 'lock') {
          entityGroup.locks.push(ent);
        } else if (domain === 'camera') {
          entityGroup.cameras?.push(ent);
        } else if (domain === 'sensor') {
          entityGroup.sensors.push(ent);
        } else if (domain === 'binary_sensor') {
          entityGroup.binarySensors.push(ent);
        } else if (domain === 'vacuum') {
          entityGroup.vacuums.push(ent);
        } else if (domain === 'scene' || domain === 'script') {
          entityGroup.scenes?.push(ent);
        }
      }

      // 1. Primary Sensor Resolution: Check explicit temperature_entity_id / humidity_entity_id configured in HA Area Registry
      let primaryTemp: number | undefined;
      if (area.temperature_entity_id) {
        const targetEntity = states?.[area.temperature_entity_id] || resolvedEntities?.[area.temperature_entity_id];
        if (targetEntity) {
          const val = parseFloat(targetEntity.state);
          const curTemp = targetEntity.attributes?.current_temperature;
          const numVal = !isNaN(val) ? val : (typeof curTemp === 'number' && !isNaN(curTemp) ? curTemp : null);
          if (numVal !== null) {
            const uom = (targetEntity.attributes?.unit_of_measurement || '').toLowerCase();
            let tempInCelsius = numVal;
            if (uom.includes('f') && !uom.includes('c')) {
              tempInCelsius = (numVal - 32) * (5 / 9);
            }
            if (tempInCelsius >= -20 && tempInCelsius <= 60) {
              primaryTemp = tempInCelsius;
            }
          }
        }
      }

      let primaryHum: number | undefined;
      if (area.humidity_entity_id) {
        const targetEntity = states?.[area.humidity_entity_id] || resolvedEntities?.[area.humidity_entity_id];
        if (targetEntity) {
          const val = parseFloat(targetEntity.state);
          const curHum = targetEntity.attributes?.current_humidity;
          const numVal = !isNaN(val) ? val : (typeof curHum === 'number' && !isNaN(curHum) ? curHum : null);
          if (numVal !== null && numVal >= 0 && numVal <= 100) {
            primaryHum = numVal;
          }
        }
      }

      // 2. Fallback Heuristic: Scan room sensors if no primary sensor is configured or available
      let maxTemp: number | undefined;
      let maxHum: number | undefined;
      let illuminanceVal: number | undefined;
      let co2Val: number | undefined;
      let motionDetected = false;
      let presenceDetected = false;
      let doorsOpenCount = 0;
      let windowsOpenCount = 0;
      let waterLeakDetected = false;
      let smokeDetected = false;

      // Evaluate sensor telemetry - strict unit & device_class validation, ignoring internal hardware diagnostics
      for (const s of entityGroup.sensors) {
        const dc = (s.attributes?.device_class || '').toLowerCase();
        const uom = (s.attributes?.unit_of_measurement || '').toLowerCase();
        const id = s.entity_id.toLowerCase();
        const val = parseFloat(s.state);

        // Filter out hardware diagnostics (battery levels, CPU, memory, linkquality, etc.)
        const isHardwareDiagnostic =
          id.includes('battery') ||
          id.includes('cpu') ||
          id.includes('gpu') ||
          id.includes('soc') ||
          id.includes('disk') ||
          id.includes('memory') ||
          id.includes('ram') ||
          id.includes('system') ||
          id.includes('router') ||
          id.includes('nas') ||
          id.includes('chip') ||
          id.includes('core') ||
          id.includes('motherboard') ||
          id.includes('charger') ||
          id.includes('internal') ||
          id.includes('linkquality') ||
          id.includes('signal');

        if (!isHardwareDiagnostic && !isNaN(val)) {
          // Temperature fallback (only if no primary temp sensor configured)
          if (primaryTemp === undefined) {
            const isTempUnit = uom === '°c' || uom === '°f' || uom === 'c' || uom === 'f' || uom.includes('°c') || uom.includes('°f');
            const isTempSensor = dc === 'temperature' || (isTempUnit && (id.includes('temp') || id.includes('weather') || id.includes('climate')));

            if (isTempSensor) {
              let tempInCelsius = val;
              if (uom.includes('f') && !uom.includes('c')) {
                tempInCelsius = (val - 32) * (5 / 9);
              }
              // Sanity check for room environmental temp range
              if (tempInCelsius >= -20 && tempInCelsius <= 60) {
                maxTemp = maxTemp === undefined ? tempInCelsius : Math.max(maxTemp, tempInCelsius);
              }
            }
          }

          // Humidity fallback (only if no primary humidity sensor configured)
          if (primaryHum === undefined) {
            const isHumiditySensor = dc === 'humidity' || (uom === '%' && (id.includes('humidity') || id.includes('hygrometer')));
            if (isHumiditySensor) {
              // Sanity check for humidity percentage
              if (val >= 0 && val <= 100) {
                maxHum = maxHum === undefined ? val : Math.max(maxHum, val);
              }
            }
          }

          // Illuminance
          const isLuxUnit = uom === 'lx' || uom === 'lux' || uom.includes('lx') || uom.includes('lux');
          if (dc === 'illuminance' || (isLuxUnit && (id.includes('illuminance') || id.includes('lux')))) {
            illuminanceVal = val;
          }

          // CO2
          if (dc === 'carbon_dioxide' || uom.includes('ppm') || id.includes('co2')) {
            co2Val = val;
          }
        }
      }

      // If climate entities exist and no primary sensor configured, compare with climate current_temperature and current_humidity
      if (entityGroup.climates.length > 0) {
        for (const c of entityGroup.climates) {
          if (primaryTemp === undefined) {
            const curTemp = c.attributes?.current_temperature;
            if (typeof curTemp === 'number' && !isNaN(curTemp) && curTemp >= -20 && curTemp <= 60) {
              maxTemp = maxTemp === undefined ? curTemp : Math.max(maxTemp, curTemp);
            }
          }
          if (primaryHum === undefined) {
            const curHum = c.attributes?.current_humidity;
            if (typeof curHum === 'number' && !isNaN(curHum) && curHum >= 0 && curHum <= 100) {
              maxHum = maxHum === undefined ? curHum : Math.max(maxHum, curHum);
            }
          }
        }
      }

      // Evaluate binary sensors
      for (const bs of entityGroup.binarySensors) {
        const isActive = bs.state === 'on' || bs.state === 'detected' || bs.state === 'open' || bs.state === 'problem';

        if (isDoorSensor(bs)) {
          if (isActive) doorsOpenCount++;
        } else if (isWindowSensor(bs)) {
          if (isActive) windowsOpenCount++;
        } else if (isMotionSensor(bs)) {
          if (isActive) {
            motionDetected = true;
            if (bs.attributes?.device_class === 'presence' || bs.entity_id.includes('presence')) {
              presenceDetected = true;
            }
          }
        } else if (isLeakSensor(bs)) {
          if (isActive) waterLeakDetected = true;
        } else if (isSmokeSensor(bs)) {
          if (isActive) smokeDetected = true;
        }
      }

      const finalTemp = primaryTemp !== undefined ? primaryTemp : maxTemp;
      const finalHum = primaryHum !== undefined ? primaryHum : maxHum;

      const sensorSummary: AreaSensorSummary = {
        temperature: finalTemp !== undefined ? parseFloat(finalTemp.toFixed(1)) : undefined,
        humidity: finalHum !== undefined ? Math.round(finalHum) : undefined,
        illuminance: illuminanceVal,
        co2Level: co2Val,
        motionDetected,
        presenceDetected,
        doorsOpenCount,
        windowsOpenCount,
        waterLeakDetected,
        smokeDetected
      };

      // Count active entities
      const activeLightsCount = entityGroup.lights.filter((l) => l.state === 'on').length;
      const totalLightsCount = entityGroup.lights.length;
      const activeSwitchesCount = entityGroup.switches.filter((s) => s.state === 'on').length;
      const activeFansCount = entityGroup.fans.filter((f) => f.state === 'on').length;
      const activeMediaPlayersCount = entityGroup.mediaPlayers.filter((m) => m.state === 'playing').length;
      const unlockedLocksCount = entityGroup.locks.filter((l) => l.state === 'unlocked').length;
      const totalLocksCount = entityGroup.locks.length;

      // Primary Climate State
      let climateState: AreaData['climateState'] | undefined;
      if (entityGroup.climates.length > 0) {
        const prim = entityGroup.climates[0];
        climateState = {
          currentTemp: prim.attributes?.current_temperature ?? sensorSummary.temperature,
          targetTemp: prim.attributes?.temperature ?? prim.attributes?.target_temp,
          hvacMode: prim.state || 'heat'
        };
      }

      return {
        areaId: area.area_id,
        name: area.name,
        icon: area.icon || undefined,
        color: area.color || undefined,
        picture: area.picture || undefined,
        floorId: area.floor_id || undefined,
        floorName: floor?.name,
        sensors: sensorSummary,
        entities: entityGroup,
        activeLightsCount,
        totalLightsCount,
        activeSwitchesCount,
        activeFansCount,
        activeMediaPlayersCount,
        unlockedLocksCount,
        totalLocksCount,
        climateState
      };
    });

    // Apply remote config hidden areas and custom sort order if present
    const hiddenSet = new Set(config.rooms?.hiddenAreas || []);
    let filtered = rawList.filter((a) => !hiddenSet.has(a.areaId));

    if (config.rooms?.areaSortOrder && config.rooms.areaSortOrder.length > 0) {
      const orderMap = new Map(config.rooms.areaSortOrder.map((id, index) => [id, index]));
      filtered = [...filtered].sort((a, b) => {
        const orderA = orderMap.has(a.areaId) ? (orderMap.get(a.areaId) as number) : 999;
        const orderB = orderMap.has(b.areaId) ? (orderMap.get(b.areaId) as number) : 999;
        return orderA - orderB;
      });
    }

    return filtered;
  }, [activeAreas, entitiesByArea, floorMap, config.rooms]);

  // 4. Organize Areas Hierarchically by Floor (Descending Level Order) with custom floor styling
  const floorDataList: FloorData[] = useMemo(() => {
    const floors = [...activeFloors];

    // Sort floors in descending order of level (e.g. Level 2 -> Level 1 -> Level 0 -> Outdoors/Basement)
    floors.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

    const result: FloorData[] = [];
    const assignedAreaIds = new Set<string>();

    for (const floor of floors) {
      const matchingAreas = areasDataList.filter((a) => a.floorId === floor.floor_id);
      for (const a of matchingAreas) {
        assignedAreaIds.add(a.areaId);
      }

      result.push({
        floorId: floor.floor_id,
        name: floor.name,
        level: floor.level ?? 0,
        icon: floor.icon || undefined,
        color: floor.color || undefined,
        areas: matchingAreas
      });
    }

    // Capture any areas without a floor or unassigned
    const unassignedAreas = areasDataList.filter((a) => !assignedAreaIds.has(a.areaId));
    if (unassignedAreas.length > 0) {
      result.push({
        floorId: 'unassigned_floor',
        name: 'Other Areas',
        level: -99,
        icon: 'HouseLine',
        areas: unassignedAreas
      });
    }

    return result;
  }, [activeFloors, areasDataList]);

  // 5. Compute Global House State Summary & Natural Language Sentence
  const houseSummary: HouseStateSummary = useMemo(() => {
    let totalLightsOn = 0;
    let totalLightsCount = 0;
    let totalWindowsOpen = 0;
    let totalDoorsOpen = 0;
    let unlockedLocksCount = 0;
    let activeMotionAreasCount = 0;
    let activeMediaCount = 0;
    const motionAreaNames: string[] = [];
    const leakAreaNames: string[] = [];
    const smokeAreaNames: string[] = [];

    let activeVacuum: HouseStateSummary['activeVacuum'] | undefined;

    // Check vacuum entities - only register if in active or noteworthy state
    const allEntities = Object.values(resolvedEntities || {});
    for (const e of allEntities) {
      if (e.domain === 'vacuum') {
        const isCleaning = e.state === 'cleaning' || e.state === 'on';
        const isReturning = e.state === 'returning';
        const isPaused = e.state === 'paused';
        const isError = e.state === 'error';
        if (isCleaning || isReturning || isPaused || isError) {
          activeVacuum = {
            name: e.name || 'Roborock Vacuum',
            status: e.state
          };
          break;
        }
      }
    }

    for (const area of areasDataList) {
      totalLightsOn += area.activeLightsCount;
      totalLightsCount += area.totalLightsCount;
      totalWindowsOpen += area.sensors.windowsOpenCount;
      totalDoorsOpen += area.sensors.doorsOpenCount;
      unlockedLocksCount += area.unlockedLocksCount;
      activeMediaCount += area.activeMediaPlayersCount;

      if (area.sensors.motionDetected || area.sensors.presenceDetected) {
        activeMotionAreasCount++;
        motionAreaNames.push(area.name);
      }
      if (area.sensors.waterLeakDetected) {
        leakAreaNames.push(area.name);
      }
      if (area.sensors.smokeDetected) {
        smokeAreaNames.push(area.name);
      }
    }

    // Natural language house summary generator
    let summarySentence = '';

    if (smokeAreaNames.length > 0) {
      summarySentence = `Smoke or gas detected in ${smokeAreaNames.join(', ')}! Please verify safety.`;
    } else if (leakAreaNames.length > 0) {
      summarySentence = `Water moisture detected in ${leakAreaNames.join(', ')}! Immediate check recommended.`;
    } else {
      const parts: string[] = [];

      // Lights part
      if (totalLightsOn === 0) {
        parts.push(totalLightsCount > 0 ? `All ${totalLightsCount} lights are off` : 'All lights are off');
      } else {
        parts.push(`There ${totalLightsOn === 1 ? 'is 1 light' : `are ${totalLightsOn} lights`} on`);
      }

      // Windows / Doors part
      if (totalWindowsOpen > 0 && totalDoorsOpen > 0) {
        parts.push(`${totalWindowsOpen} ${totalWindowsOpen === 1 ? 'window' : 'windows'} and ${totalDoorsOpen} ${totalDoorsOpen === 1 ? 'door' : 'doors'} open`);
      } else if (totalWindowsOpen > 0) {
        parts.push(`${totalWindowsOpen} ${totalWindowsOpen === 1 ? 'window is' : 'windows are'} open`);
      } else if (totalDoorsOpen > 0) {
        parts.push(`${totalDoorsOpen} ${totalDoorsOpen === 1 ? 'door is' : 'doors are'} open`);
      } else {
        parts.push('all openings are secure');
      }

      // Vacuum or Motion part
      if (activeVacuum && activeVacuum.status === 'cleaning') {
        parts.push(`and the ${activeVacuum.name} is currently cleaning`);
      } else if (activeMotionAreasCount > 0) {
        const areaLabel = motionAreaNames.length <= 2 ? motionAreaNames.join(' and ') : `${motionAreaNames[0]} & ${motionAreaNames.length - 1} other areas`;
        parts.push(`and motion is detected in ${areaLabel}`);
      } else if (activeMediaCount > 0) {
        parts.push(`and music is playing in ${activeMediaCount} ${activeMediaCount === 1 ? 'room' : 'rooms'}`);
      } else {
        parts.push('and everything is peaceful');
      }

      // Capitalize first letter and format sentence
      if (parts.length > 0) {
        summarySentence = parts.join(', ') + '.';
        summarySentence = summarySentence.charAt(0).toUpperCase() + summarySentence.slice(1);
      } else {
        summarySentence = 'All systems normal. Your home is quiet and secure.';
      }
    }

    return {
      totalLightsOn,
      totalWindowsOpen,
      totalDoorsOpen,
      unlockedLocksCount,
      activeMotionAreasCount,
      activeMediaCount,
      activeVacuum,
      summarySentence
    };
  }, [areasDataList, resolvedEntities]);

  // 6. Bulk Action Dispatchers
  const toggleAreaLights = useCallback(
    async (areaId: string, targetState?: boolean) => {
      const area = areasDataList.find((a) => a.areaId === areaId);
      if (!area || area.entities.lights.length === 0) return;

      const shouldTurnOn = targetState !== undefined ? targetState : area.activeLightsCount === 0;
      const service = shouldTurnOn ? 'turn_on' : 'turn_off';
      const entityIds = area.entities.lights.map((l) => l.entity_id);

      for (const eid of entityIds) {
        updateEntityState(eid, shouldTurnOn ? 'on' : 'off', {
          brightness: shouldTurnOn ? 200 : 0
        });
      }

      try {
        await callHAService('light', service, {}, { entity_id: entityIds });
      } catch (e) {
        console.error(`[useRoomsData] Failed to ${service} lights in area ${areaId}:`, e);
      }
    },
    [areasDataList, callHAService, updateEntityState]
  );

  const toggleAreaSwitches = useCallback(
    async (areaId: string) => {
      const area = areasDataList.find((a) => a.areaId === areaId);
      if (!area || area.entities.switches.length === 0) return;

      const shouldTurnOn = area.activeSwitchesCount === 0;
      const service = shouldTurnOn ? 'turn_on' : 'turn_off';
      const entityIds = area.entities.switches.map((s) => s.entity_id);

      for (const eid of entityIds) {
        updateEntityState(eid, shouldTurnOn ? 'on' : 'off');
      }

      try {
        await callHAService('switch', service, {}, { entity_id: entityIds });
      } catch (e) {
        console.error(`[useRoomsData] Failed to ${service} switches in area ${areaId}:`, e);
      }
    },
    [areasDataList, callHAService, updateEntityState]
  );

  const toggleAreaFans = useCallback(
    async (areaId: string) => {
      const area = areasDataList.find((a) => a.areaId === areaId);
      if (!area || area.entities.fans.length === 0) return;

      const shouldTurnOn = area.activeFansCount === 0;
      const service = shouldTurnOn ? 'turn_on' : 'turn_off';
      const entityIds = area.entities.fans.map((f) => f.entity_id);

      for (const eid of entityIds) {
        updateEntityState(eid, shouldTurnOn ? 'on' : 'off');
      }

      try {
        await callHAService('fan', service, {}, { entity_id: entityIds });
      } catch (e) {
        console.error(`[useRoomsData] Failed to ${service} fans in area ${areaId}:`, e);
      }
    },
    [areasDataList, callHAService, updateEntityState]
  );

  const toggleAreaMedia = useCallback(
    async (areaId: string) => {
      const area = areasDataList.find((a) => a.areaId === areaId);
      if (!area || area.entities.mediaPlayers.length === 0) return;

      const isAnyPlaying = area.activeMediaPlayersCount > 0;
      const service = isAnyPlaying ? 'media_pause' : 'media_play';
      const entityIds = area.entities.mediaPlayers.map((m) => m.entity_id);

      for (const eid of entityIds) {
        updateEntityState(eid, isAnyPlaying ? 'paused' : 'playing');
      }

      try {
        await callHAService('media_player', service, {}, { entity_id: entityIds });
      } catch (e) {
        console.error(`[useRoomsData] Failed to toggle media in area ${areaId}:`, e);
      }
    },
    [areasDataList, callHAService, updateEntityState]
  );

  const toggleAreaLocks = useCallback(
    async (areaId: string) => {
      const area = areasDataList.find((a) => a.areaId === areaId);
      if (!area || area.entities.locks.length === 0) return;

      const shouldLock = area.unlockedLocksCount > 0;
      const service = shouldLock ? 'lock' : 'unlock';
      const entityIds = area.entities.locks.map((l) => l.entity_id);

      for (const eid of entityIds) {
        updateEntityState(eid, shouldLock ? 'locked' : 'unlocked');
      }

      try {
        await callHAService('lock', service, {}, { entity_id: entityIds });
      } catch (e) {
        console.error(`[useRoomsData] Failed to ${service} locks in area ${areaId}:`, e);
      }
    },
    [areasDataList, callHAService, updateEntityState]
  );

  const toggleEntityLock = useCallback(
    async (entityId: string) => {
      const entity = resolvedEntities[entityId];
      if (!entity) return;

      const isCurrentlyLocked = entity.state === 'locked';
      const service = isCurrentlyLocked ? 'unlock' : 'lock';
      const nextState = isCurrentlyLocked ? 'unlocked' : 'locked';

      updateEntityState(entityId, nextState);
      try {
        await callHAService('lock', service, {}, { entity_id: entityId });
      } catch (e) {
        console.error(`[useRoomsData] Failed to ${service} lock ${entityId}:`, e);
      }
    },
    [resolvedEntities, callHAService, updateEntityState]
  );

  const turnOffAllAreaEntities = useCallback(
    async (areaId: string) => {
      const area = areasDataList.find((a) => a.areaId === areaId);
      if (!area) return;

      const lightIds = area.entities.lights.map((l) => l.entity_id);
      const switchIds = area.entities.switches.map((s) => s.entity_id);
      const fanIds = area.entities.fans.map((f) => f.entity_id);
      const mediaIds = area.entities.mediaPlayers.map((m) => m.entity_id);

      for (const eid of [...lightIds, ...switchIds, ...fanIds]) {
        updateEntityState(eid, 'off');
      }
      for (const eid of mediaIds) {
        updateEntityState(eid, 'paused');
      }

      try {
        if (lightIds.length > 0) await callHAService('light', 'turn_off', {}, { entity_id: lightIds });
        if (switchIds.length > 0) await callHAService('switch', 'turn_off', {}, { entity_id: switchIds });
        if (fanIds.length > 0) await callHAService('fan', 'turn_off', {}, { entity_id: fanIds });
        if (mediaIds.length > 0) await callHAService('media_player', 'media_pause', {}, { entity_id: mediaIds });
      } catch (e) {
        console.error(`[useRoomsData] Failed to turn off all entities in area ${areaId}:`, e);
      }
    },
    [areasDataList, callHAService, updateEntityState]
  );

  return {
    areasDataList,
    floorDataList,
    houseSummary,
    toggleAreaLights,
    toggleAreaSwitches,
    toggleAreaFans,
    toggleAreaMedia,
    toggleAreaLocks,
    toggleEntityLock,
    turnOffAllAreaEntities,
    callHAService,
    updateEntityState
  };
}
