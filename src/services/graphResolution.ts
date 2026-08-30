/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HAFloor,
  HALabel,
  HAState,
  HAZone,
  ResolvedEntity,
  ResolvedArea,
  ResolvedFloor,
  AutoLayoutMetrics,
  ResolutionSource,
  HAEntity,
  HassAreaWithEntities,
  SecurityOverviewState,
  OverviewSummaryState
} from '../types';
import { classifyBinarySensors } from '../lib/entityClassifiers';


export interface GraphResolutionResult {
  resolvedEntities: Record<string, ResolvedEntity>;
  resolvedAreas: ResolvedArea[];
  areasMap: Record<string, HassAreaWithEntities>;
  resolvedFloors: ResolvedFloor[];
  resolvedZones: HAZone[];
  labels: HALabel[];
  unassignedEntities: ResolvedEntity[];
  domainGroups: Record<string, ResolvedEntity[]>;
  securityOverview: SecurityOverviewState;
  overviewSummary: OverviewSummaryState;
  metrics: AutoLayoutMetrics;
}

const AREA_ICON_MAP: Record<string, string> = {
  living_room: 'Tv',
  bedroom: 'Bed',
  kitchen: 'Utensils',
  office: 'Laptop',
  hallway: 'DoorOpen',
  patio: 'Trees',
  garage: 'Car',
  bathroom: 'Bath',
  dining_room: 'Utensils',
  unassigned: 'Boxes'
};

/**
 * Resolves the Home Assistant Entity-to-Area, Floor, Label and Zone graph automatically.
 */
export function resolveHAGraph(
  areas: HAArea[],
  devices: HADevice[],
  entityRegistry: HAEntityRegistryEntry[],
  floors: HAFloor[],
  states: Record<string, HAState>,
  labels: HALabel[] = [],
  options: { includeDiagnostics?: boolean } = {}
): GraphResolutionResult {
  const areaMap = new Map<string, HAArea>(areas.map(a => [a.area_id, a]));
  const deviceMap = new Map<string, HADevice>(devices.map(d => [d.id, d]));
  const floorMap = new Map<string, HAFloor>(floors.map(f => [f.floor_id, f]));

  // Index entities from registry
  const registryMap = new Map<string, HAEntityRegistryEntry>(entityRegistry.map(e => [e.entity_id, e]));

  // Also catch any live states that might not be in entity registry
  const allEntityIds = new Set<string>([
    ...entityRegistry.map(e => e.entity_id),
    ...Object.keys(states)
  ]);

  const resolvedEntities: Record<string, ResolvedEntity> = {};
  const areaEntitiesMap = new Map<string, ResolvedEntity[]>();
  const unassignedEntities: ResolvedEntity[] = [];

  // Metrics counters
  let directCount = 0;
  let inheritedCount = 0;
  let unassignedCount = 0;
  let disabledCount = 0;
  let diagnosticCount = 0;
  let totalLightsOn = 0;
  let totalPowerWatts = 0;
  let criticalBatteryCount = 0;
  let securityAlertsCount = 0;

  // Index all dedicated battery sensors from HA states to pair with devices
  const deviceBatteryMap = new Map<string, number>();
  for (const [eid, st] of Object.entries(states)) {
    if (eid.startsWith('sensor.')) {
      const isBatteryClass = st.attributes?.device_class === 'battery' || eid.endsWith('_battery') || eid.endsWith('_battery_level');
      if (isBatteryClass) {
        const val = parseFloat(st.state);
        if (!isNaN(val)) {
          const reg = registryMap.get(eid);
          if (reg?.device_id) {
            deviceBatteryMap.set(reg.device_id, val);
          }
        }
      }
    }
  }

  for (const entityId of allEntityIds) {
    const regEntry = registryMap.get(entityId);
    const liveState = states[entityId] || {
      entity_id: entityId,
      state: 'unavailable',
      attributes: {}
    };

    // 1. Check if disabled
    if (regEntry?.disabled_by) {
      disabledCount++;
      continue; // Filter out disabled entities completely
    }

    const domain = entityId.split('.')[0];
    const isDiag = regEntry?.entity_category === 'diagnostic';
    if (isDiag) diagnosticCount++;

    // 2. Resolve Area: Direct match vs Inherited match vs Unassigned
    let assignedAreaId: string | null = null;
    let resolutionSource: ResolutionSource = 'unassigned';
    let matchedDevice: HADevice | null = null;

    if (regEntry?.device_id && deviceMap.has(regEntry.device_id)) {
      matchedDevice = deviceMap.get(regEntry.device_id)!;
    }

    if (regEntry?.area_id && areaMap.has(regEntry.area_id)) {
      // Direct entity match
      assignedAreaId = regEntry.area_id;
      resolutionSource = 'direct_entity_area';
      directCount++;
    } else if (matchedDevice?.area_id && areaMap.has(matchedDevice.area_id)) {
      // Inherited device match
      assignedAreaId = matchedDevice.area_id;
      resolutionSource = 'inherited_device_area';
      inheritedCount++;
    } else if (liveState.attributes.room) {
      // Fallback to state room attribute if matches area name or id
      const matchedArea = areas.find(
        a => a.name.toLowerCase() === liveState.attributes.room?.toLowerCase() || a.area_id === liveState.attributes.room
      );
      if (matchedArea) {
        assignedAreaId = matchedArea.area_id;
        resolutionSource = 'direct_entity_area';
        directCount++;
      } else {
        resolutionSource = 'unassigned';
        unassignedCount++;
      }
    } else {
      resolutionSource = 'unassigned';
      unassignedCount++;
    }

    const assignedArea = assignedAreaId ? areaMap.get(assignedAreaId) || null : null;
    const assignedFloorId = assignedArea?.floor_id || null;
    const assignedFloor = assignedFloorId ? floorMap.get(assignedFloorId) || null : null;

    // Determine friendly name
    const friendlyName =
      regEntry?.name ||
      regEntry?.original_name ||
      liveState.attributes.friendly_name ||
      entityId;

    // Parse attributes
    const powerWatts =
      typeof liveState.attributes.power === 'number'
        ? liveState.attributes.power
        : domain === 'sensor' && liveState.attributes.device_class === 'power'
          ? parseFloat(liveState.state) || 0
          : 0;

    // Accurate Battery Resolution strictly from Home Assistant data
    let batteryPct: number | undefined = undefined;
    if (typeof liveState.attributes.battery === 'number') {
      batteryPct = liveState.attributes.battery;
    } else if (typeof liveState.attributes.battery_level === 'number') {
      batteryPct = liveState.attributes.battery_level;
    } else if (typeof liveState.attributes.battery === 'string') {
      const parsed = parseFloat(liveState.attributes.battery);
      if (!isNaN(parsed)) batteryPct = parsed;
    } else if (regEntry?.device_id && deviceBatteryMap.has(regEntry.device_id)) {
      batteryPct = deviceBatteryMap.get(regEntry.device_id);
    } else if (domain === 'sensor' && (liveState.attributes.device_class === 'battery' || entityId.includes('battery'))) {
      const parsed = parseFloat(liveState.state);
      if (!isNaN(parsed)) batteryPct = parsed;
    } else if (domain === 'person') {
      const personKey = entityId.replace('person.', '');
      const linkedSensor = states[`sensor.${personKey}_battery`] || 
                           states[`sensor.${personKey}_phone_battery`] || 
                           states[`sensor.${personKey}_battery_level`];
      if (linkedSensor) {
        const parsed = parseFloat(linkedSensor.state);
        if (!isNaN(parsed)) batteryPct = parsed;
      }
    }

    if (batteryPct !== undefined && batteryPct <= 20) {
      criticalBatteryCount++;
    }

    if (domain === 'light' && liveState.state === 'on') {
      totalLightsOn++;
    }

    if (powerWatts > 0) {
      totalPowerWatts += powerWatts;
    }

    if (
      (domain === 'binary_sensor' && (liveState.attributes.device_class === 'door' || liveState.attributes.device_class === 'window') && liveState.state === 'on') ||
      (domain === 'lock' && liveState.state === 'unlocked')
    ) {
      securityAlertsCount++;
    }

    const resolved: ResolvedEntity = {
      entity_id: entityId,
      domain,
      name: friendlyName,
      state: liveState.state,
      attributes: liveState.attributes,
      area_id: assignedAreaId,
      device_id: regEntry?.device_id || null,
      floor_id: assignedFloorId,
      device: matchedDevice,
      area: assignedArea,
      floor: assignedFloor,
      resolutionSource,
      entity_category: regEntry?.entity_category || null,
      disabled_by: regEntry?.disabled_by || null,
      hidden: Boolean(regEntry?.hidden_by),
      isDiagnostic: isDiag,
      powerWatts,
      batteryPct,
      icon: regEntry?.icon || liveState.attributes.icon,
      labels: regEntry?.labels || liveState.attributes.labels || matchedDevice?.labels || []
    };

    resolvedEntities[entityId] = resolved;

    // Filter diagnostics from standard views unless option is enabled
    if (isDiag && !options.includeDiagnostics) {
      continue;
    }

    if (assignedAreaId) {
      if (!areaEntitiesMap.has(assignedAreaId)) {
        areaEntitiesMap.set(assignedAreaId, []);
      }
      areaEntitiesMap.get(assignedAreaId)!.push(resolved);
    } else {
      unassignedEntities.push(resolved);
    }
  }

  // 3. Build Resolved Areas
  const resolvedAreas: ResolvedArea[] = areas.map(area => {
    const areaEntities = areaEntitiesMap.get(area.area_id) || [];
    const areaDevices = devices.filter(d => d.area_id === area.area_id);
    const floor = area.floor_id ? floorMap.get(area.floor_id) || null : null;

    // Group entities by domain
    const entitiesByDomain: Record<string, ResolvedEntity[]> = {};
    for (const ent of areaEntities) {
      if (!entitiesByDomain[ent.domain]) {
        entitiesByDomain[ent.domain] = [];
      }
      entitiesByDomain[ent.domain].push(ent);
    }

    // Compute Area Summary Metrics
    const lights = entitiesByDomain['light'] || [];
    const lightsOn = lights.filter(l => l.state === 'on').length;

    const climates = entitiesByDomain['climate'] || [];
    const climatesActive = climates.filter(c => c.state !== 'off' && c.state !== 'unavailable').length;

    const mediaPlayers = entitiesByDomain['media_player'] || [];
    const activeMedia = mediaPlayers.filter(m => m.state === 'playing' || m.state === 'on').length;

    const cleaners = entitiesByDomain['vacuum'] || [];
    const activeCleaners = cleaners.filter(v => v.state === 'cleaning' || v.state === 'on').length;

    const switches = entitiesByDomain['switch'] || [];
    const activeSwitches = switches.filter(s => s.state === 'on').length;

    // Temperature & Humidity averages
    const tempSensors = areaEntities.filter(
      e =>
        (e.domain === 'sensor' && e.attributes.device_class === 'temperature') ||
        (e.domain === 'climate' && typeof e.attributes.current_temperature === 'number')
    );
    let tempSum = 0;
    let tempCount = 0;
    for (const s of tempSensors) {
      const val =
        s.domain === 'climate'
          ? s.attributes.current_temperature
          : parseFloat(s.state);
      if (!isNaN(val) && val > -30 && val < 60) {
        tempSum += val;
        tempCount++;
      }
    }
    const currentTempAvg = tempCount > 0 ? parseFloat((tempSum / tempCount).toFixed(1)) : undefined;

    // Humidity average
    const humSensors = areaEntities.filter(
      e =>
        (e.domain === 'sensor' && e.attributes.device_class === 'humidity') ||
        (e.domain === 'climate' && typeof e.attributes.current_humidity === 'number')
    );
    let humSum = 0;
    let humCount = 0;
    for (const s of humSensors) {
      const val =
        s.domain === 'climate'
          ? s.attributes.current_humidity
          : parseFloat(s.state);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        humSum += val;
        humCount++;
      }
    }
    const currentHumidityAvg = humCount > 0 ? Math.round(humSum / humCount) : undefined;

    // Power calculation
    let areaPower = 0;
    for (const ent of areaEntities) {
      if (ent.powerWatts) areaPower += ent.powerWatts;
    }

    // Security contacts & motion
    const openContacts = areaEntities.filter(
      e =>
        e.domain === 'binary_sensor' &&
        (e.attributes.device_class === 'door' || e.attributes.device_class === 'window' || e.attributes.device_class === 'garage_door') &&
        e.state === 'on'
    ).length;

    const motionDetected = areaEntities.some(
      e =>
        e.domain === 'binary_sensor' &&
        e.attributes.device_class === 'motion' &&
        e.state === 'on'
    );

    const lowBatteryCount = areaEntities.filter(e => e.batteryPct !== undefined && e.batteryPct <= 20).length;

    const icon = area.icon || AREA_ICON_MAP[area.area_id] || 'Home';
    const bannerImage = area.picture || null;

    return {
      area_id: area.area_id,
      name: area.name,
      icon,
      picture: area.picture,
      floor_id: area.floor_id,
      floor,
      color: area.color || null,
      order: area.order,
      devices: areaDevices,
      entities: areaEntities,
      entitiesByDomain,
      summary: {
        totalEntities: areaEntities.length,
        lightsOn,
        totalLights: lights.length,
        climatesActive,
        totalClimates: climates.length,
        currentTempAvg: currentTempAvg ?? 21.5,
        targetTempAvg: climates[0]?.attributes.temperature || climates[0]?.attributes.target_temp || 21.0,
        currentHumidityAvg: currentHumidityAvg ?? 48,
        activeMediaPlayers: activeMedia,
        totalMediaPlayers: mediaPlayers.length,
        totalPowerWatts: Math.round(areaPower),
        openContacts,
        motionDetected,
        lowBatteryCount,
        activeCleaners,
        activeSwitches
      },
      bannerImage
    };
  });

  // Sort resolvedAreas by order if defined, otherwise alphabetically
  resolvedAreas.sort((a, b) => {
    if (typeof a.order === 'number' && typeof b.order === 'number') {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });

  // 4. Build Resolved Floors
  const resolvedFloors: ResolvedFloor[] = floors.map(floor => {
    const floorAreas = resolvedAreas.filter(a => a.floor_id === floor.floor_id);

    let floorLightsOn = 0;
    let floorTotalLights = 0;
    let floorPower = 0;
    let tempSum = 0;
    let tempCount = 0;
    let breaches = 0;

    for (const a of floorAreas) {
      floorLightsOn += a.summary.lightsOn;
      floorTotalLights += a.summary.totalLights;
      floorPower += a.summary.totalPowerWatts;
      if (a.summary.currentTempAvg) {
        tempSum += a.summary.currentTempAvg;
        tempCount++;
      }
      breaches += a.summary.openContacts;
    }

    return {
      floor_id: floor.floor_id,
      name: floor.name,
      level: floor.level ?? 0,
      icon: floor.icon || 'Stairs',
      color: floor.color || null,
      order: floor.order,
      areas: floorAreas,
      totalLightsOn: floorLightsOn,
      totalLights: floorTotalLights,
      totalPowerWatts: floorPower,
      averageTemp: tempCount > 0 ? parseFloat((tempSum / tempCount).toFixed(1)) : undefined,
      securityBreaches: breaches
    };
  });

  // Sort floors by order if defined, otherwise level
  resolvedFloors.sort((a, b) => {
    if (typeof a.order === 'number' && typeof b.order === 'number') {
      return a.order - b.order;
    }
    return b.level - a.level;
  });

  // Build areasMap
  const areasMap: Record<string, HassAreaWithEntities> = {};
  for (const a of resolvedAreas) {
    areasMap[a.area_id] = a;
  }

  // Build global domainGroups
  const domainGroups: Record<string, ResolvedEntity[]> = {};
  for (const ent of Object.values(resolvedEntities)) {
    if (ent.isDiagnostic && !options.includeDiagnostics) continue;
    if (!domainGroups[ent.domain]) {
      domainGroups[ent.domain] = [];
    }
    domainGroups[ent.domain].push(ent);
  }

  // Contact Sensors & Openings Classification (Doors, Windows, and Other Contacts)
  const allBinary = domainGroups['binary_sensor'] || [];
  const {
    doorSensors,
    windowSensors,
    otherContactSensors,
    motionSensors
  } = classifyBinarySensors(allBinary);

  const openDoorsWindows = [...doorSensors, ...windowSensors, ...otherContactSensors].filter(e => e.state === 'on');
  const activeMotionSensors = motionSensors.filter(e => e.state === 'on');
  const alarmPanel = domainGroups['alarm_control_panel']?.[0];
  const locks = domainGroups['lock'] || [];
  const cameras = domainGroups['camera'] || [];


  const securityOverview: SecurityOverviewState = {
    alarmPanel,
    locks,
    openDoorsWindows,
    activeMotionSensors,
    cameras
  };

  // Build overviewSummary
  const personEntities = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])];
  const peopleHome = personEntities.length > 0 ? personEntities.filter(p => p.state === 'home').length : 0;
  const peopleAway = personEntities.filter(p => p.state === 'not_home' || p.state === 'away').length;
  const totalPeople = personEntities.length;

  const totalLightsList = domainGroups['light'] || [];
  const totalLightsCount = totalLightsList.length;

  const fanEntities = domainGroups['fan'] || [];
  const fansOnCount = fanEntities.filter(f => f.state === 'on').length;
  const totalFansCount = fanEntities.length;

  const doorsOpenCount = doorSensors.filter(e => e.state === 'on').length;
  const totalDoorsCount = doorSensors.length;

  const windowsOpenCount = windowSensors.filter(e => e.state === 'on').length;
  const totalWindowsCount = windowSensors.length;

  const activeMediaPlayers = domainGroups['media_player'] || [];
  const activeMediaCount = activeMediaPlayers.filter(m => m.state === 'playing').length;
  const totalMediaCount = activeMediaPlayers.length;

  const activeClimatesCount = (domainGroups['climate'] || []).filter(c => c.state !== 'off' && c.state !== 'unavailable').length;
  const activeSwitchesCount = (domainGroups['switch'] || []).filter(s => s.state === 'on').length;
  const currentAlarmState = alarmPanel?.state || 'disarmed';

  const overviewSummary: OverviewSummaryState = {
    peopleHome,
    peopleAway,
    totalPeople,
    lightsOnCount: totalLightsOn,
    totalLightsCount,
    fansOnCount,
    totalFansCount,
    doorsOpenCount,
    totalDoorsCount,
    windowsOpenCount,
    totalWindowsCount,
    openOpeningsCount: openDoorsWindows.length,
    alarmState: currentAlarmState,
    activeMediaCount,
    totalMediaCount,
    activeClimatesCount,
    activeSwitchesCount,
    totalPowerWatts: Math.round(totalPowerWatts)
  };

  const metrics: AutoLayoutMetrics = {
    totalFloors: floors.length,
    totalAreas: areas.length,
    totalDevices: devices.length,
    totalEntities: allEntityIds.size,
    resolvedDirectCount: directCount,
    resolvedInheritedCount: inheritedCount,
    unassignedEntitiesCount: unassignedEntities.length,
    filteredDisabledCount: disabledCount,
    diagnosticEntitiesCount: diagnosticCount,
    totalLightsOn,
    totalPowerWatts: Math.round(totalPowerWatts),
    criticalBatteryCount,
    securityAlertsCount,
    lastResolvedAt: new Date().toISOString()
  };

  // 5. Build Resolved Zones
  const resolvedZones: HAZone[] = [];
  for (const [eid, st] of Object.entries(states)) {
    if (eid.startsWith('zone.')) {
      const zoneName = st.attributes.friendly_name || eid.replace('zone.', '');
      const personsInZone = Object.values(states)
        .filter(p => p.entity_id.startsWith('person.') && p.state.toLowerCase() === zoneName.toLowerCase())
        .map(p => p.attributes.friendly_name || p.entity_id);

      resolvedZones.push({
        entity_id: eid,
        name: zoneName,
        latitude: st.attributes.latitude ?? 0,
        longitude: st.attributes.longitude ?? 0,
        radius: st.attributes.radius ?? 100,
        icon: st.attributes.icon || 'House',
        passive: Boolean(st.attributes.passive),
        personsInZone,
        personsCount: personsInZone.length
      });
    }
  }

  return {
    resolvedEntities,
    resolvedAreas,
    areasMap,
    resolvedFloors,
    resolvedZones,
    labels,
    unassignedEntities,
    domainGroups,
    securityOverview,
    overviewSummary,
    metrics
  };
}

/**
 * Adapter helper to convert ResolvedArea to legacy Room interface if needed by older components
 */
export function resolvedAreaToRoom(area: ResolvedArea) {
  return {
    id: area.area_id,
    name: area.name,
    icon: area.icon,
    temperature: area.summary.currentTempAvg ?? 21.5,
    humidity: area.summary.currentHumidityAvg ?? 48,
    devicesCount: area.entities.length,
    entityIds: area.entities.map(e => e.entity_id),
    bannerImage: area.bannerImage
  };
}

/**
 * Adapter helper to convert ResolvedEntity to HAEntity
 */
export function resolvedEntityToHAEntity(resolved: ResolvedEntity): HAEntity {
  return {
    entity_id: resolved.entity_id,
    state: resolved.state,
    attributes: {
      friendly_name: resolved.name,
      room: resolved.area?.name || 'Unassigned',
      power: resolved.powerWatts,
      battery: resolved.batteryPct,
      ...resolved.attributes
    }
  };
}
