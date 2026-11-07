/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AutoLayoutStoreState, SetState, GetState } from './types';

export const createSelectionSlice = (set: SetState, get: GetState): Pick<AutoLayoutStoreState, 'setSelectedFloorId' | 'setSelectedAreaId' | 'setSelectedSettingsSection' | 'setSelectedWeatherEntityId' | 'setSelectedAlarmEntityId' | 'setShowDiagnosticEntities' | 'setSearchQuery'> => ({
  setSelectedFloorId: (floorId: string | 'all') => set({ selectedFloorId: floorId }),
  setSelectedAreaId: (areaId: string | null) => set({ selectedAreaId: areaId }),
  setSelectedSettingsSection: (section: string | null) => set({ selectedSettingsSection: section }),

  setSelectedWeatherEntityId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem('ha_selected_weather_id', id);
        } else {
          localStorage.removeItem('ha_selected_weather_id');
        }
      } catch {}
    }
    set({ selectedWeatherEntityId: id });
  },

  setSelectedAlarmEntityId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem('ha_selected_alarm_id', id);
        } else {
          localStorage.removeItem('ha_selected_alarm_id');
        }
      } catch {}
    }
    set({ selectedAlarmEntityId: id });
  },

  setShowDiagnosticEntities: (show: boolean) => {
    set({ showDiagnosticEntities: show });
    get().recomputeGraph();
  },

  setSearchQuery: (query: string) => set({ searchQuery: query })
});
