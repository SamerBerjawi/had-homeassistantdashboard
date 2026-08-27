/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Utility to group ResolvedEntities by Floor and Area according to Home Assistant definitions
 * and customized user overrides (order, icon, color).
 */

import { ResolvedEntity, HAFloor, HAArea } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

export interface EntityAreaGroup {
  areaId: string | null;
  areaName: string;
  icon?: string | null;
  color?: string | null;
  order?: number | null;
  entities: ResolvedEntity[];
}

export interface EntityFloorGroup {
  floorId: string | null;
  floorName: string;
  level?: number | null;
  icon?: string | null;
  color?: string | null;
  order?: number | null;
  areaGroups: EntityAreaGroup[];
}

export interface GroupedEntitiesResult {
  hasFloors: boolean;
  hasAreas: boolean;
  groups: EntityFloorGroup[];
  totalEntities: number;
}

export function groupEntitiesByFloorAndArea(
  entities: ResolvedEntity[],
  customFloors?: HAFloor[],
  customAreas?: HAArea[]
): GroupedEntitiesResult {
  if (!entities || entities.length === 0) {
    return {
      hasFloors: false,
      hasAreas: false,
      groups: [],
      totalEntities: 0
    };
  }

  // Get active custom definitions from store if not explicitly passed
  const storeState = useAutoLayoutStore.getState();
  const allFloors: HAFloor[] = customFloors || storeState.floors || [];
  const allAreas: HAArea[] = customAreas || storeState.areas || [];

  const floorLookup = new Map<string, HAFloor>(allFloors.map(f => [f.floor_id, f]));
  const areaLookup = new Map<string, HAArea>(allAreas.map(a => [a.area_id, a]));

  const floorMap = new Map<
    string,
    {
      floorName: string;
      level?: number | null;
      icon?: string | null;
      color?: string | null;
      order?: number | null;
      areaMap: Map<string, { 
        areaName: string; 
        icon?: string | null;
        color?: string | null;
        order?: number | null;
        entities: ResolvedEntity[] 
      }>;
    }
  >();

  let hasFloors = false;
  let hasAreas = false;

  entities.forEach((entity) => {
    // Resolve Floor (with custom store overrides)
    const entityFloor = entity.floor;
    const storeFloor = entityFloor?.floor_id ? floorLookup.get(entityFloor.floor_id) : undefined;
    const floorId = storeFloor?.floor_id || entityFloor?.floor_id || 'unassigned_floor';
    const floorName = storeFloor?.name || entityFloor?.name || 'Other Areas';
    const floorIcon = storeFloor?.icon || entityFloor?.icon || 'Stairs';
    const floorColor = storeFloor?.color || entityFloor?.color || '#6366f1';
    const floorOrder = typeof storeFloor?.order === 'number' ? storeFloor.order : entityFloor?.order;
    const floorLevel = typeof storeFloor?.level === 'number' ? storeFloor.level : entityFloor?.level;

    if (floorId !== 'unassigned_floor') {
      hasFloors = true;
    }

    // Resolve Area (with custom store overrides)
    const entityArea = entity.area;
    const storeArea = entityArea?.area_id ? areaLookup.get(entityArea.area_id) : undefined;
    const areaId = storeArea?.area_id || entityArea?.area_id || 'unassigned_area';
    const areaName = storeArea?.name || entityArea?.name || 'General / Unassigned';
    const areaIcon = storeArea?.icon || entityArea?.icon || 'HouseLine';
    const areaColor = storeArea?.color || entityArea?.color || '#38bdf8';
    const areaOrder = typeof storeArea?.order === 'number' ? storeArea.order : entityArea?.order;

    if (areaId !== 'unassigned_area') {
      hasAreas = true;
    }

    if (!floorMap.has(floorId)) {
      floorMap.set(floorId, {
        floorName,
        level: floorLevel,
        icon: floorIcon,
        color: floorColor,
        order: floorOrder,
        areaMap: new Map()
      });
    }

    const floorEntry = floorMap.get(floorId)!;
    if (!floorEntry.areaMap.has(areaId)) {
      floorEntry.areaMap.set(areaId, {
        areaName,
        icon: areaIcon,
        color: areaColor,
        order: areaOrder,
        entities: []
      });
    }

    floorEntry.areaMap.get(areaId)!.entities.push(entity);
  });

  // Sort entities within each area alphabetically by name
  floorMap.forEach((fVal) => {
    fVal.areaMap.forEach((aVal) => {
      aVal.entities.sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  const resultGroups: EntityFloorGroup[] = [];

  floorMap.forEach((fVal, fId) => {
    const areaGroups: EntityAreaGroup[] = [];
    fVal.areaMap.forEach((aVal, aId) => {
      areaGroups.push({
        areaId: aId === 'unassigned_area' ? null : aId,
        areaName: aVal.areaName,
        icon: aVal.icon,
        color: aVal.color,
        order: aVal.order,
        entities: aVal.entities
      });
    });

    // Sort areas strictly by custom order if defined, placing unassigned at the end
    areaGroups.sort((a, b) => {
      if (!a.areaId) return 1;
      if (!b.areaId) return -1;
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order;
      }
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;
      return a.areaName.localeCompare(b.areaName);
    });

    resultGroups.push({
      floorId: fId === 'unassigned_floor' ? null : fId,
      floorName: fVal.floorName,
      level: fVal.level,
      icon: fVal.icon,
      color: fVal.color,
      order: fVal.order,
      areaGroups
    });
  });

  // Sort floors strictly by custom order if defined, placing unassigned at the end
  resultGroups.sort((a, b) => {
    if (!a.floorId) return 1;
    if (!b.floorId) return -1;
    if (typeof a.order === 'number' && typeof b.order === 'number') {
      return a.order - b.order;
    }
    if (typeof a.order === 'number') return -1;
    if (typeof b.order === 'number') return 1;
    if (typeof a.level === 'number' && typeof b.level === 'number') {
      return a.level - b.level;
    }
    return a.floorName.localeCompare(b.floorName);
  });

  return {
    hasFloors,
    hasAreas,
    groups: resultGroups,
    totalEntities: entities.length
  };
}
