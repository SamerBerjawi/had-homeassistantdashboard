/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HAFloor,
  HAState,
  ResolvedEntity,
  ResolvedArea,
  ResolvedFloor,
  AutoLayoutMetrics,
  ResolutionSource,
  HAEntity
} from '../types';

export interface GraphResolutionResult {
  resolvedEntities: Record<string, ResolvedEntity>;
  resolvedAreas: ResolvedArea[];
  resolvedFloors: ResolvedFloor[];
  unassignedEntities: ResolvedEntity[];
  metrics: AutoLayoutMetrics;
}

const DEFAULT_ROOM_IMAGES: Record<string, string> = {
  living_room: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop',
  bedroom: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1000&auto=format&fit=crop',
  kitchen: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1000&auto=format&fit=crop',
  office: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop',
  hallway: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop',
  patio: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop',
  garage: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1000&auto=format&fit=crop',
  unassigned: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1000&auto=format&fit=crop'
};

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
 * Resolves the Home Assistant Entity-to-Area and Floor graph as specified by HAPulse.
 */
export function resolveHAGraph(
  areas: HAArea[],
  devices: HADevice[],
  entityRegistry: HAEntityRegistryEntry[],
  floors: HAFloor[],
  states: Record<string, HAState>,
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

    const batteryPct =
      typeof liveState.attributes.battery === 'number'
        ? liveState.attributes.battery
        : typeof liveState.attributes.battery_level === 'number'
          ? liveState.attributes.battery_level
          : domain === 'sensor' && (liveState.attributes.device_class === 'battery' || entityId.includes('battery'))
            ? parseFloat(liveState.state) || undefined
            : undefined;

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
      icon: regEntry?.icon || liveState.attributes.icon
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
    const bannerImage = area.picture || DEFAULT_ROOM_IMAGES[area.area_id] || DEFAULT_ROOM_IMAGES.unassigned;

    return {
      area_id: area.area_id,
      name: area.name,
      icon,
      picture: area.picture,
      floor_id: area.floor_id,
      floor,
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
      icon: floor.icon || 'Layers',
      areas: floorAreas,
      totalLightsOn: floorLightsOn,
      totalLights: floorTotalLights,
      totalPowerWatts: floorPower,
      averageTemp: tempCount > 0 ? parseFloat((tempSum / tempCount).toFixed(1)) : undefined,
      securityBreaches: breaches
    };
  });

  // Sort floors by level descending (e.g. 1, 0, -1)
  resolvedFloors.sort((a, b) => b.level - a.level);

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

  return {
    resolvedEntities,
    resolvedAreas,
    resolvedFloors,
    unassignedEntities,
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
