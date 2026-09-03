/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EditModeContext
 * Global state management for dashboard Edit Mode.
 * Enables live in-place tile reordering, size adjustments, and 2-way mirror
 * entity / area visibility toggling across all dashboard views.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useUserConfig } from './ConfigContext';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

export interface TileLayoutOverride {
  colSpan?: 2 | 4 | 6 | 8 | 12;
  rowSpan?: 1 | 2 | 3 | 4;
  order?: number;
}

export interface EditModeContextType {
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;
  isEntityHidden: (entityId: string) => boolean;
  isAreaHidden: (areaId: string) => boolean;
  toggleEntityHidden: (entityId: string) => Promise<void>;
  toggleAreaHidden: (areaId: string) => Promise<void>;
  updateTileLayout: (id: string, layout: Partial<TileLayoutOverride>) => Promise<void>;
  cycleTileSize: (id: string, currentCols?: number, currentRows?: number) => Promise<void>;
  reorderTiles: (orderedIds: string[]) => Promise<void>;
  getTileLayout: (id: string) => TileLayoutOverride | undefined;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

// Sizing cycle states: [colSpan, rowSpan]
const SIZE_CYCLE: Array<[2 | 4 | 6 | 8 | 12, 1 | 2 | 3 | 4]> = [
  [2, 1], // Compact 2x1
  [2, 2], // Square 2x2
  [4, 2], // Wide 4x2
  [6, 2], // Panoramic 6x2
];

export const EditModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const { config, updateConfig, flushPendingSave } = useUserConfig();

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      const next = !prev;
      if (!next) {
        flushPendingSave().catch((e) => console.error('[EditMode] Failed to flush save on exit:', e));
      }
      return next;
    });
  }, [flushPendingSave]);

  const setEditMode = useCallback((enabled: boolean) => {
    setIsEditMode(enabled);
    if (!enabled) {
      flushPendingSave().catch((e) => console.error('[EditMode] Failed to flush save on exit:', e));
    }
  }, [flushPendingSave]);

  // Check if entity is hidden in master config or auto-layout store
  const isEntityHidden = useCallback((entityId: string): boolean => {
    if (!entityId) return false;
    const hiddenList = config?.entities?.hiddenEntityIds || [];
    if (hiddenList.includes(entityId)) return true;
    
    // Also check customizations dictionary if present
    const custom = config?.entities?.customizations?.[entityId];
    if (custom && custom.hidden !== undefined) return custom.hidden;

    // Check memory resolved entity
    const resolved = useAutoLayoutStore.getState().resolvedEntities?.[entityId];
    if (resolved && resolved.hidden) return true;

    return false;
  }, [config?.entities?.hiddenEntityIds, config?.entities?.customizations]);

  // Check if area is hidden in master config
  const isAreaHidden = useCallback((areaId: string): boolean => {
    if (!areaId) return false;
    const hiddenAreas = config?.rooms?.hiddenAreas || [];
    return hiddenAreas.includes(areaId);
  }, [config?.rooms?.hiddenAreas]);

  // 2-Way Mirror Toggle for Entity Visibility
  const toggleEntityHidden = useCallback(async (entityId: string) => {
    if (!entityId) return;
    const currentlyHidden = isEntityHidden(entityId);
    const nextHidden = !currentlyHidden;

    // 1. Immediately update store in memory for snappy UI response
    useAutoLayoutStore.getState().setEntityHidden(entityId, nextHidden);

    // 2. Persist to master user configuration
    await updateConfig((prev) => {
      const currentHiddenList = new Set(prev.entities?.hiddenEntityIds || []);
      if (nextHidden) {
        currentHiddenList.add(entityId);
      } else {
        currentHiddenList.delete(entityId);
      }

      return {
        ...prev,
        entities: {
          ...prev.entities,
          hiddenEntityIds: Array.from(currentHiddenList),
          customizations: {
            ...(prev.entities?.customizations || {}),
            [entityId]: {
              ...(prev.entities?.customizations?.[entityId] || {}),
              hidden: nextHidden
            }
          }
        }
      };
    });
  }, [isEntityHidden, updateConfig]);

  // 2-Way Mirror Toggle for Room / Area Visibility
  const toggleAreaHidden = useCallback(async (areaId: string) => {
    if (!areaId) return;
    const currentlyHidden = isAreaHidden(areaId);
    const nextHidden = !currentlyHidden;

    await updateConfig((prev) => {
      const currentHiddenAreas = new Set(prev.rooms?.hiddenAreas || []);
      if (nextHidden) {
        currentHiddenAreas.add(areaId);
      } else {
        currentHiddenAreas.delete(areaId);
      }

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          hiddenAreas: Array.from(currentHiddenAreas)
        }
      };
    });
  }, [isAreaHidden, updateConfig]);

  // Update layout overrides (colSpan, rowSpan, order)
  const updateTileLayout = useCallback(async (id: string, layout: Partial<TileLayoutOverride>) => {
    if (!id) return;
    await updateConfig((prev) => {
      const currentOverrides = prev.layoutOverrides || {};
      const existing = currentOverrides[id] || {};
      return {
        ...prev,
        layoutOverrides: {
          ...currentOverrides,
          [id]: {
            ...existing,
            ...layout
          }
        }
      };
    });
  }, [updateConfig]);

  // Cycle tile size between 2x1, 2x2, 4x2, 6x2
  const cycleTileSize = useCallback(async (id: string, currentCols = 2, currentRows = 1) => {
    if (!id) return;
    const existing = config?.layoutOverrides?.[id];
    const activeCols = existing?.colSpan || currentCols;
    const activeRows = existing?.rowSpan || currentRows;

    let nextIndex = 0;
    const currentIndex = SIZE_CYCLE.findIndex(
      ([c, r]) => c === activeCols && r === activeRows
    );

    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % SIZE_CYCLE.length;
    } else {
      // Find closest or default to next state
      nextIndex = 1;
    }

    const [nextCols, nextRows] = SIZE_CYCLE[nextIndex];
    await updateTileLayout(id, { colSpan: nextCols, rowSpan: nextRows });
  }, [config?.layoutOverrides, updateTileLayout]);

  // Reorder tiles via drag-and-drop
  const reorderTiles = useCallback(async (orderedIds: string[]) => {
    if (!orderedIds || orderedIds.length === 0) return;
    await updateConfig((prev) => {
      const currentOverrides = { ...(prev.layoutOverrides || {}) };
      orderedIds.forEach((id, index) => {
        currentOverrides[id] = {
          ...(currentOverrides[id] || {}),
          order: index
        };
      });

      return {
        ...prev,
        layoutOverrides: currentOverrides
      };
    });
  }, [updateConfig]);

  // Get layout overrides for an id
  const getTileLayout = useCallback((id: string): TileLayoutOverride | undefined => {
    return config?.layoutOverrides?.[id];
  }, [config?.layoutOverrides]);

  const value = useMemo<EditModeContextType>(() => ({
    isEditMode,
    setEditMode,
    toggleEditMode,
    isEntityHidden,
    isAreaHidden,
    toggleEntityHidden,
    toggleAreaHidden,
    updateTileLayout,
    cycleTileSize,
    reorderTiles,
    getTileLayout
  }), [
    isEditMode,
    setEditMode,
    toggleEditMode,
    isEntityHidden,
    isAreaHidden,
    toggleEntityHidden,
    toggleAreaHidden,
    updateTileLayout,
    cycleTileSize,
    reorderTiles,
    getTileLayout
  ]);

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = (): EditModeContextType => {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
};

export default EditModeContext;
