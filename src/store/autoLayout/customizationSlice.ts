/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AutoLayoutStoreState, SetState, GetState } from './types';

export const createCustomizationSlice = (set: SetState, get: GetState): Pick<AutoLayoutStoreState, 'applyConfigCustomizations' | 'updateEntityCustomization' | 'setEntityHidden' | 'bulkSetEntitiesHidden'> => ({
  applyConfigCustomizations: (config: any) => {
    if (!config || typeof config !== 'object') return;
    set(prev => {
      let newAreas = [...prev.areas];
      let newFloors = [...prev.floors];
      let newResolved = { ...prev.resolvedEntities };

      // 1. Process Area Overrides
      const areaOverrides = config.rooms?.areaOverrides || config.areas;
      if (areaOverrides && typeof areaOverrides === 'object') {
        newAreas = newAreas.map(a => {
          const custom = areaOverrides[a.area_id];
          if (custom) {
            return {
              ...a,
              name: custom.customName || custom.name || a.name,
              icon: custom.customIcon || custom.icon || a.icon,
              color: custom.customColor || custom.color || a.color,
              picture: custom.backgroundImageUrl || custom.picture || a.picture
            };
          }
          return a;
        });
      }

      // 2. Process Floor Overrides
      if (config.floors && typeof config.floors === 'object') {
        newFloors = newFloors.map(f => {
          const custom = config.floors[f.floor_id];
          if (custom) {
            return {
              ...f,
              name: custom.name || f.name,
              icon: custom.icon || f.icon,
              color: custom.color || f.color,
              level: custom.level !== undefined ? custom.level : f.level
            };
          }
          return f;
        });
      }

      // 2.5 Process Label Overrides
      let newLabels = [...prev.labels];
      if (config.labels && typeof config.labels === 'object') {
        newLabels = newLabels.map(l => {
          const custom = config.labels[l.label_id];
          if (custom) {
            return {
              ...l,
              name: custom.name || l.name,
              icon: custom.icon || l.icon,
              color: custom.color || l.color,
              description: custom.description || l.description
            };
          }
          return l;
        });
      }

      // 3. Process Entity Customizations
      const entityCustoms = config.entities?.customizations || config.entities;
      if (entityCustoms && typeof entityCustoms === 'object') {
        for (const [id, custom] of Object.entries(entityCustoms as Record<string, any>)) {
          if (newResolved[id] && custom) {
            newResolved[id] = {
              ...newResolved[id],
              name: custom.customName || custom.name || newResolved[id].name,
              icon: custom.customIcon || custom.icon || newResolved[id].icon,
              hidden: custom.hidden !== undefined ? custom.hidden : newResolved[id].hidden
            };
          }
        }
      }

      // Process Entity Icon Overrides
      if (config.entities?.iconOverrides && typeof config.entities.iconOverrides === 'object') {
        for (const [id, icon] of Object.entries(config.entities.iconOverrides as Record<string, string>)) {
          if (newResolved[id] && icon) {
            newResolved[id] = {
              ...newResolved[id],
              icon
            };
          }
        }
      }

      // Process Entity Name Overrides
      if (config.entities?.nameOverrides && typeof config.entities.nameOverrides === 'object') {
        for (const [id, name] of Object.entries(config.entities.nameOverrides as Record<string, string>)) {
          if (newResolved[id] && name) {
            newResolved[id] = {
              ...newResolved[id],
              name
            };
          }
        }
      }

      const nextEntityCustomizations = {
        ...prev.entityCustomizations,
        ...(typeof entityCustoms === 'object' ? entityCustoms : {})
      };

      if (Array.isArray(config.entities?.hiddenEntityIds)) {
        for (const hiddenId of config.entities.hiddenEntityIds) {
          nextEntityCustomizations[hiddenId] = {
            ...(nextEntityCustomizations[hiddenId] || {}),
            hidden: true
          };
          if (newResolved[hiddenId]) {
            newResolved[hiddenId] = {
              ...newResolved[hiddenId],
              hidden: true
            };
          }
        }
      }

      const selectedWeather = config.preferences?.selectedWeatherEntityId || prev.selectedWeatherEntityId;
      const selectedAlarm = config.preferences?.selectedAlarmEntityId || prev.selectedAlarmEntityId;
      const dismissedIds = Array.isArray(config.preferences?.dismissedNotificationIds)
        ? Array.from(new Set([...prev.dismissedNotificationIds, ...config.preferences.dismissedNotificationIds]))
        : prev.dismissedNotificationIds;

      if (typeof window !== 'undefined' && Array.isArray(config.preferences?.dismissedNotificationIds)) {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(dismissedIds));
        } catch {}
      }

      return {
        areas: newAreas,
        rawAreas: newAreas,
        floors: newFloors,
        rawFloors: newFloors,
        labels: newLabels,
        rawLabels: newLabels,
        resolvedEntities: newResolved,
        entityCustomizations: nextEntityCustomizations,
        selectedWeatherEntityId: selectedWeather,
        selectedAlarmEntityId: selectedAlarm,
        dismissedNotificationIds: dismissedIds
      };
    });
    get().recomputeGraph();
  },

  updateEntityCustomization: (
    entityId: string,
    updates: { customName?: string; customIcon?: string; icon?: string; hidden?: boolean }
  ) => {
    set(prev => {
      const nextCustomizations = {
        ...prev.entityCustomizations,
        [entityId]: {
          ...(prev.entityCustomizations[entityId] || {}),
          ...updates
        }
      };
      const nextResolved = { ...prev.resolvedEntities };
      if (nextResolved[entityId]) {
        nextResolved[entityId] = {
          ...nextResolved[entityId],
          name:
            updates.customName !== undefined
              ? updates.customName || nextResolved[entityId].name
              : nextResolved[entityId].name,
          icon: updates.customIcon || updates.icon || nextResolved[entityId].icon,
          hidden: updates.hidden !== undefined ? updates.hidden : nextResolved[entityId].hidden
        };
      }
      return { entityCustomizations: nextCustomizations, resolvedEntities: nextResolved };
    });
  },

  setEntityHidden: (entityId: string, hidden: boolean) => {
    set(prev => {
      const nextCustomizations = {
        ...prev.entityCustomizations,
        [entityId]: {
          ...(prev.entityCustomizations[entityId] || {}),
          hidden
        }
      };

      const updatedResolved = { ...prev.resolvedEntities };
      if (updatedResolved[entityId]) {
        updatedResolved[entityId] = {
          ...updatedResolved[entityId],
          hidden
        };
      }

      return {
        entityCustomizations: nextCustomizations,
        resolvedEntities: updatedResolved
      };
    });
    get().recomputeGraph();
  },

  bulkSetEntitiesHidden: (entityIds: string[], hidden: boolean) => {
    if (!entityIds || entityIds.length === 0) return;
    set(prev => {
      const nextCustomizations = { ...prev.entityCustomizations };
      const updatedResolved = { ...prev.resolvedEntities };

      for (const eid of entityIds) {
        nextCustomizations[eid] = {
          ...(nextCustomizations[eid] || {}),
          hidden
        };
        if (updatedResolved[eid]) {
          updatedResolved[eid] = {
            ...updatedResolved[eid],
            hidden
          };
        }
      }

      return {
        entityCustomizations: nextCustomizations,
        resolvedEntities: updatedResolved
      };
    });
    get().recomputeGraph();
  }
});
