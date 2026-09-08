/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EditModeContext
 * Global state management for dashboard Edit Mode with independent multi-device layouts.
 * Enables live in-place tile reordering, size adjustments, and visibility toggling
 * across distinct screen sizes: Desktop (>=1024px), Laptop/Tablet (640-1023px), and Mobile (<640px).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUserConfig } from './ConfigContext';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { LayoutBreakpoint, BreakpointLayoutOverride } from '../types/userConfig';

export type { LayoutBreakpoint, BreakpointLayoutOverride };

export interface TileLayoutOverride extends BreakpointLayoutOverride {}

export interface EditModeContextType {
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;
  detectedBreakpoint: LayoutBreakpoint;
  activeBreakpoint: LayoutBreakpoint;
  editingBreakpoint: LayoutBreakpoint;
  setEditingBreakpoint: (bp: LayoutBreakpoint) => void;
  activeLayoutOverrides: Record<string, BreakpointLayoutOverride>;
  isEntityHidden: (entityId: string) => boolean;
  isAreaHidden: (areaId: string) => boolean;
  toggleEntityHidden: (entityId: string) => Promise<void>;
  toggleAreaHidden: (areaId: string) => Promise<void>;
  updateTileLayout: (id: string, layout: Partial<BreakpointLayoutOverride>, breakpoint?: LayoutBreakpoint) => Promise<void>;
  setTileDimensions: (id: string, colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12, rowSpan: 1 | 2 | 3 | 4, breakpoint?: LayoutBreakpoint) => Promise<void>;
  setTileWidth: (id: string, colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12, breakpoint?: LayoutBreakpoint) => Promise<void>;
  cycleTileSize: (id: string, currentCols?: number, currentRows?: number, breakpoint?: LayoutBreakpoint) => Promise<void>;
  reorderTiles: (orderedIds: string[], breakpoint?: LayoutBreakpoint) => Promise<void>;
  getTileLayout: (id: string, breakpoint?: LayoutBreakpoint) => BreakpointLayoutOverride | undefined;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

// Device detection helper
export function getDeviceBreakpoint(): LayoutBreakpoint {
  if (typeof window === 'undefined') return 'mobile';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'laptop';
  return 'desktop';
}

// Breakpoint-specific horizontal column widths
export const BREAKPOINT_ALLOWED_COLUMNS: Record<LayoutBreakpoint, Array<1 | 2 | 3 | 4 | 6 | 8 | 12>> = {
  mobile: [1, 2, 4],
  laptop: [2, 3, 4, 6],
  desktop: [3, 4, 6, 8, 12]
};

// Breakpoint-specific sizing cycle states focusing on horizontal grid width
const BREAKPOINT_SIZE_CYCLES: Record<LayoutBreakpoint, Array<[1 | 2 | 3 | 4 | 6 | 8 | 12, 1 | 2 | 3 | 4]>> = {
  mobile: [
    [1, 1], // Mini 1-col (¼ width)
    [2, 1], // Standard 2-col (½ width)
    [4, 1]  // Full 4-col (100% width)
  ],
  laptop: [
    [2, 1], // 2-col (⅓ width)
    [3, 1], // 3-col (½ width)
    [4, 1], // 4-col (⅔ width)
    [6, 1]  // Full 6-col (100% width)
  ],
  desktop: [
    [3, 1], // 3-col (¼ width)
    [4, 1], // 4-col (⅓ width)
    [6, 1], // 6-col (½ width)
    [8, 1], // 8-col (⅔ width)
    [12, 1] // Full 12-col (100% width)
  ]
};

export const EditModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const { config, updateConfig, flushPendingSave } = useUserConfig();

  // Track physical device breakpoint
  const [detectedBreakpoint, setDetectedBreakpoint] = useState<LayoutBreakpoint>(() => getDeviceBreakpoint());
  // Editing breakpoint allows switching target device layout during edit mode
  const [editingBreakpoint, setEditingBreakpoint] = useState<LayoutBreakpoint>(() => getDeviceBreakpoint());

  useEffect(() => {
    const handleResize = () => {
      const current = getDeviceBreakpoint();
      setDetectedBreakpoint(current);
      if (!isEditMode) {
        setEditingBreakpoint(current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isEditMode]);

  // Synchronize editing breakpoint when entering edit mode if it hasn't been explicitly changed
  useEffect(() => {
    if (isEditMode) {
      setEditingBreakpoint(detectedBreakpoint);
    }
  }, [isEditMode, detectedBreakpoint]);

  // Effective active breakpoint: when editing, respects user's selected target preview breakpoint
  const activeBreakpoint = isEditMode ? editingBreakpoint : detectedBreakpoint;

  // Active layout overrides for the current active breakpoint (with fallback to legacy layoutOverrides)
  const activeLayoutOverrides = useMemo<Record<string, BreakpointLayoutOverride>>(() => {
    const responsive = config?.responsiveLayoutOverrides?.[activeBreakpoint];
    const legacy = config?.layoutOverrides;
    return {
      ...(legacy || {}),
      ...(responsive || {})
    };
  }, [config?.responsiveLayoutOverrides, config?.layoutOverrides, activeBreakpoint]);

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
    
    const custom = config?.entities?.customizations?.[entityId];
    if (custom && custom.hidden !== undefined) return custom.hidden;

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

    useAutoLayoutStore.getState().setEntityHidden(entityId, nextHidden);

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

  // Update layout overrides for the target breakpoint
  const updateTileLayout = useCallback(async (
    id: string,
    layout: Partial<BreakpointLayoutOverride>,
    breakpoint?: LayoutBreakpoint
  ) => {
    if (!id) return;
    const targetBp = breakpoint || activeBreakpoint;

    await updateConfig((prev) => {
      const currentResponsive = prev.responsiveLayoutOverrides || {};
      const currentBpMap = currentResponsive[targetBp] || {};
      const existing = currentBpMap[id] || prev.layoutOverrides?.[id] || {};

      return {
        ...prev,
        responsiveLayoutOverrides: {
          ...currentResponsive,
          [targetBp]: {
            ...currentBpMap,
            [id]: {
              ...existing,
              ...layout
            }
          }
        }
      };
    });
  }, [activeBreakpoint, updateConfig]);

  // Set explicit tile dimensions for target breakpoint
  const setTileDimensions = useCallback(
    async (
      id: string,
      colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12,
      rowSpan: 1 | 2 | 3 | 4 = 1,
      breakpoint?: LayoutBreakpoint
    ) => {
      if (!id) return;
      await updateTileLayout(id, { colSpan, rowSpan }, breakpoint);
    },
    [updateTileLayout]
  );

  // Set explicit horizontal tile width for target breakpoint (rowSpan automatically adapts)
  const setTileWidth = useCallback(
    async (
      id: string,
      colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12,
      breakpoint?: LayoutBreakpoint
    ) => {
      if (!id) return;
      await updateTileLayout(id, { colSpan, rowSpan: 1 }, breakpoint);
    },
    [updateTileLayout]
  );

  // Cycle tile size according to active breakpoint's available cycle
  const cycleTileSize = useCallback(async (
    id: string,
    currentCols = 2,
    currentRows = 1,
    breakpoint?: LayoutBreakpoint
  ) => {
    if (!id) return;
    const targetBp = breakpoint || activeBreakpoint;
    const bpOverrides = config?.responsiveLayoutOverrides?.[targetBp]?.[id];
    const legacy = config?.layoutOverrides?.[id];
    const existing = bpOverrides || legacy;
    const activeCols = existing?.colSpan || currentCols;
    const activeRows = existing?.rowSpan || currentRows;

    const cycle = BREAKPOINT_SIZE_CYCLES[targetBp] || BREAKPOINT_SIZE_CYCLES.mobile;
    let nextIndex = 0;
    const currentIndex = cycle.findIndex(
      ([c, r]) => c === activeCols && r === activeRows
    );

    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % cycle.length;
    } else {
      nextIndex = 1;
    }

    const [nextCols, nextRows] = cycle[nextIndex];
    await updateTileLayout(id, { colSpan: nextCols, rowSpan: nextRows }, targetBp);
  }, [activeBreakpoint, config?.responsiveLayoutOverrides, config?.layoutOverrides, updateTileLayout]);

  // Reorder tiles via drag-and-drop for target breakpoint
  const reorderTiles = useCallback(async (
    orderedIds: string[],
    breakpoint?: LayoutBreakpoint
  ) => {
    if (!orderedIds || orderedIds.length === 0) return;
    const targetBp = breakpoint || activeBreakpoint;

    await updateConfig((prev) => {
      const currentResponsive = prev.responsiveLayoutOverrides || {};
      const currentBpMap = { ...(currentResponsive[targetBp] || {}) };

      orderedIds.forEach((id, index) => {
        const existing = currentBpMap[id] || prev.layoutOverrides?.[id] || {};
        currentBpMap[id] = {
          ...existing,
          order: index
        };
      });

      return {
        ...prev,
        responsiveLayoutOverrides: {
          ...currentResponsive,
          [targetBp]: currentBpMap
        }
      };
    });
  }, [activeBreakpoint, updateConfig]);

  // Get layout overrides for an id in the target breakpoint
  const getTileLayout = useCallback((
    id: string,
    breakpoint?: LayoutBreakpoint
  ): BreakpointLayoutOverride | undefined => {
    const targetBp = breakpoint || activeBreakpoint;
    const bpOverride = config?.responsiveLayoutOverrides?.[targetBp]?.[id];
    if (bpOverride) return bpOverride;
    return config?.layoutOverrides?.[id];
  }, [activeBreakpoint, config?.responsiveLayoutOverrides, config?.layoutOverrides]);

  const value = useMemo<EditModeContextType>(() => ({
    isEditMode,
    setEditMode,
    toggleEditMode,
    detectedBreakpoint,
    activeBreakpoint,
    editingBreakpoint,
    setEditingBreakpoint,
    activeLayoutOverrides,
    isEntityHidden,
    isAreaHidden,
    toggleEntityHidden,
    toggleAreaHidden,
    updateTileLayout,
    setTileDimensions,
    setTileWidth,
    cycleTileSize,
    reorderTiles,
    getTileLayout
  }), [
    isEditMode,
    setEditMode,
    toggleEditMode,
    detectedBreakpoint,
    activeBreakpoint,
    editingBreakpoint,
    setEditingBreakpoint,
    activeLayoutOverrides,
    isEntityHidden,
    isAreaHidden,
    toggleEntityHidden,
    toggleAreaHidden,
    updateTileLayout,
    setTileDimensions,
    setTileWidth,
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
