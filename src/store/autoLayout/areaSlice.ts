/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAArea, HAFloor, HALabel } from '../../types';
import type { AutoLayoutStoreState, SetState, GetState } from './types';

export const createAreaSlice = (set: SetState, get: GetState): Pick<AutoLayoutStoreState, 'reassignEntityArea' | 'updateFloor' | 'updateArea' | 'updateLabel' | 'reorderFloors' | 'reorderAreas' | 'addFloor' | 'addArea' | 'deleteFloor' | 'deleteArea'> => ({
  reassignEntityArea: (entityId: string, newAreaId: string | null) => {
    set(prev => {
      const updatedRegistry = prev.entityRegistry.map(e => {
        if (e.entity_id === entityId) {
          return { ...e, area_id: newAreaId };
        }
        return e;
      });

      return { entityRegistry: updatedRegistry };
    });

    get().recomputeGraph();
  },

  updateFloor: (floorId: string, updates: Partial<HAFloor>) => {
    set(prev => {
      const updatedFloors = prev.floors.map(f => {
        if (f.floor_id === floorId) {
          return { ...f, ...updates };
        }
        return f;
      });
      return { floors: updatedFloors, rawFloors: updatedFloors };
    });
    get().recomputeGraph();
  },

  updateArea: (areaId: string, updates: Partial<HAArea>) => {
    set(prev => {
      const updatedAreas = prev.areas.map(a => {
        if (a.area_id === areaId) {
          return { ...a, ...updates };
        }
        return a;
      });
      return { areas: updatedAreas, rawAreas: updatedAreas };
    });
    get().recomputeGraph();
  },

  updateLabel: (labelId: string, updates: Partial<HALabel>) => {
    set(prev => {
      const updatedLabels = prev.labels.map(l => {
        if (l.label_id === labelId) {
          return { ...l, ...updates };
        }
        return l;
      });
      return { labels: updatedLabels, rawLabels: updatedLabels };
    });
    get().recomputeGraph();
  },

  reorderFloors: (newFloors: HAFloor[]) => {
    const indexed = newFloors.map((f, idx) => ({ ...f, order: idx }));
    set({ floors: indexed, rawFloors: indexed });
    get().recomputeGraph();
  },

  reorderAreas: (newAreas: HAArea[]) => {
    const indexed = newAreas.map((a, idx) => ({ ...a, order: idx }));
    set({ areas: indexed, rawAreas: indexed });
    get().recomputeGraph();
  },

  addFloor: (floor: Partial<HAFloor>) => {
    const id = floor.floor_id || `floor_${Date.now()}`;
    const newFloor: HAFloor = {
      floor_id: id,
      name: floor.name || 'New Floor',
      level: floor.level ?? get().floors.length,
      icon: floor.icon || 'Stairs',
      color: floor.color || '#38bdf8',
      order: get().floors.length
    };
    set(prev => ({
      floors: [...prev.floors, newFloor],
      rawFloors: [...prev.rawFloors, newFloor]
    }));
    get().recomputeGraph();
  },

  addArea: (area: Partial<HAArea>) => {
    const id = area.area_id || `area_${Date.now()}`;
    const newArea: HAArea = {
      area_id: id,
      name: area.name || 'New Area',
      floor_id: area.floor_id || null,
      icon: area.icon || 'Armchair',
      color: area.color || '#38bdf8',
      order: get().areas.length
    };
    set(prev => ({
      areas: [...prev.areas, newArea],
      rawAreas: [...prev.rawAreas, newArea]
    }));
    get().recomputeGraph();
  },

  deleteFloor: (floorId: string) => {
    set(prev => {
      const remainingFloors = prev.floors.filter(f => f.floor_id !== floorId);
      const updatedAreas = prev.areas.map(a => a.floor_id === floorId ? { ...a, floor_id: null } : a);
      return {
        floors: remainingFloors,
        rawFloors: remainingFloors,
        areas: updatedAreas,
        rawAreas: updatedAreas
      };
    });
    get().recomputeGraph();
  },

  deleteArea: (areaId: string) => {
    set(prev => {
      const remainingAreas = prev.areas.filter(a => a.area_id !== areaId);
      const updatedRegistry = prev.entityRegistry.map(e => e.area_id === areaId ? { ...e, area_id: null } : e);
      return {
        areas: remainingAreas,
        rawAreas: remainingAreas,
        entityRegistry: updatedRegistry
      };
    });
    get().recomputeGraph();
  }
});
