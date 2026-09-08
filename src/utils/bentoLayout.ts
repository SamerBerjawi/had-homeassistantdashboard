/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bento Grid Layout Engine & Sizing Utilities
 * Computes responsive spans, prioritizes explicit manual ordering,
 * and manages ghosted entity inclusion during Edit Mode.
 */

import { GridColSpan, GridRowSpan } from '../components/layout/GridTile';
import { LayoutBreakpoint } from '../types/userConfig';

export interface TileLayoutConfig {
  colSpan?: GridColSpan;
  rowSpan?: GridRowSpan;
  tabletColSpan?: GridColSpan;
  desktopColSpan?: GridColSpan;
  order?: number;
}

export interface BentoSortOptions<T> {
  items: T[];
  getId: (item: T) => string;
  layoutOverrides?: Record<string, { colSpan?: number; rowSpan?: number; order?: number }>;
  isEditMode?: boolean;
  isHidden?: (item: T) => boolean;
  breakpoint?: LayoutBreakpoint;
}

/**
 * Prioritizes user's custom sort order from layoutOverrides before
 * applying bento layout organization. Filters out hidden items when
 * not in Edit Mode, but preserves them (for ghosted rendering) in Edit Mode.
 */
export function sortTilesForBento<T>({
  items,
  getId,
  layoutOverrides = {},
  isEditMode = false,
  isHidden
}: BentoSortOptions<T>): T[] {
  if (!items || items.length === 0) return [];

  // 1. Filter out hidden items if not in edit mode
  let filtered = items;
  if (!isEditMode && isHidden) {
    filtered = items.filter(item => !isHidden(item));
  }

  // 2. Sort by explicit order in layoutOverrides
  const indexed = filtered.map((item, originalIndex) => {
    const id = getId(item);
    const override = layoutOverrides[id];
    const order = override?.order !== undefined ? override.order : originalIndex + 1000;
    return { item, order, originalIndex };
  });

  indexed.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.originalIndex - b.originalIndex;
  });

  return indexed.map(entry => entry.item);
}

/**
 * Calculates adaptive column and row spans for a tile based on its layout override and active breakpoint
 */
export function getTileResponsiveSpans(
  id: string,
  layoutOverrides?: Record<string, { colSpan?: number; rowSpan?: number; order?: number }>,
  defaultColSpan: GridColSpan = 2,
  defaultRowSpan: GridRowSpan = 1,
  breakpoint?: LayoutBreakpoint
): TileLayoutConfig {
  const override = layoutOverrides?.[id];
  const colSpan = (override?.colSpan as GridColSpan) || defaultColSpan;
  const rowSpan = (override?.rowSpan as GridRowSpan) || defaultRowSpan;

  let mobileColSpan: GridColSpan = colSpan;
  let tabletColSpan: GridColSpan = 3;
  let desktopColSpan: GridColSpan = 3;

  if (breakpoint === 'desktop') {
    desktopColSpan = colSpan;
    tabletColSpan = colSpan >= 6 ? 6 : colSpan <= 3 ? 3 : (colSpan as GridColSpan);
    mobileColSpan = colSpan >= 6 ? 4 : 2;
  } else if (breakpoint === 'laptop') {
    tabletColSpan = colSpan;
    desktopColSpan = colSpan <= 3 ? 3 : 6;
    mobileColSpan = colSpan >= 4 ? 4 : (colSpan as GridColSpan);
  } else {
    // mobile breakpoint
    mobileColSpan = colSpan;
    if (colSpan === 1) {
      tabletColSpan = 2;
      desktopColSpan = 2;
    } else if (colSpan === 2) {
      tabletColSpan = 3;
      desktopColSpan = 3;
    } else if (colSpan === 4) {
      tabletColSpan = 6;
      desktopColSpan = 6;
    } else if (colSpan === 6) {
      tabletColSpan = 6;
      desktopColSpan = 6;
    } else if (colSpan >= 8) {
      tabletColSpan = 6;
      desktopColSpan = 12;
    }
  }

  return {
    colSpan: mobileColSpan,
    rowSpan,
    tabletColSpan,
    desktopColSpan,
    order: override?.order
  };
}

/**
 * Total columns available in the CSS grid per breakpoint
 */
export function getBreakpointTotalColumns(breakpoint: LayoutBreakpoint = 'mobile'): number {
  switch (breakpoint) {
    case 'desktop':
      return 12;
    case 'laptop':
      return 6;
    case 'mobile':
    default:
      return 4;
  }
}

/**
 * Format horizontal grid size as clean column number (e.g. "1", "2", "4")
 */
export function formatTileHorizontalSize(colSpan = 2, _breakpoint?: LayoutBreakpoint): string {
  return `${colSpan}`;
}

/**
 * Format dimensions as clean column number
 */
export function formatTileSize(colSpan = 2, _rowSpan = 1): string {
  return `${colSpan}`;
}

export type TileLayoutMode = 'compact' | 'full' | 'hybrid';

export interface ComputedTileSpan {
  colSpan: GridColSpan;
  rowSpan: GridRowSpan;
  tabletColSpan: GridColSpan;
  desktopColSpan: GridColSpan;
  colStart?: number;
  tabletColStart?: number;
  desktopColStart?: number;
}

export interface GetComputedTileSpansOptions<T> {
  mode: TileLayoutMode;
  items: T[];
  getId: (item: T) => string;
  layoutOverrides?: Record<string, { colSpan?: number; rowSpan?: number; order?: number }>;
  breakpoint?: LayoutBreakpoint;
  isSmall?: (item: T) => boolean;
  isLarge?: (item: T) => boolean;
  naturalRowSpan?: (item: T) => GridRowSpan;
  naturalColSpan?: (item: T) => GridColSpan;
}

/**
 * Orders items for optimal aesthetic packing in Hybrid layout mode.
 * E.g., for 4 items with 2 small ones: places the tall/main item first,
 * the 2 small items next (to stack beside it), and the 4th item last (for full-width span).
 */
export function sortItemsForHybrid<T>({
  items,
  getId,
  layoutOverrides = {},
  isSmall,
  isLarge
}: {
  items: T[];
  getId: (item: T) => string;
  layoutOverrides?: Record<string, { colSpan?: number; rowSpan?: number; order?: number }>;
  isSmall?: (item: T) => boolean;
  isLarge?: (item: T) => boolean;
}): T[] {
  if (!items || items.length <= 2) return items;

  // If user has explicit manual order overrides, respect them unconditionally
  const hasManualOrder = items.some(item => layoutOverrides[getId(item)]?.order !== undefined);
  if (hasManualOrder) return items;

  if (items.length === 4 && isSmall) {
    const smalls: T[] = [];
    const nonSmalls: T[] = [];
    items.forEach(item => {
      if (isSmall(item)) {
        smalls.push(item);
      } else {
        nonSmalls.push(item);
      }
    });

    if (smalls.length >= 2 && nonSmalls.length >= 1) {
      const tallItem = (isLarge ? nonSmalls.find(isLarge) : null) || nonSmalls[0];
      const remainingNonSmalls = nonSmalls.filter(x => x !== tallItem);
      const small1 = smalls[0];
      const small2 = smalls[1];
      const fourthItem = remainingNonSmalls[0] || smalls[2] || items[3];

      return [tallItem, small1, small2, fourthItem];
    }
  }

  return items;
}

/**
 * Computes responsive column and row spans for each tile based on the active layout mode:
 * - 'compact': standard 2-column tiles on mobile (50% width)
 * - 'full': 100% full-width tiles on mobile (1 tile per row)
 * - 'hybrid': automatically distributes tile spans based on item count and content density:
 *    - 1 tile: full width (colSpan 4)
 *    - 2 tiles: two half width (colSpan 2 each)
 *    - 3 tiles: two half width, third full width
 *    - 4 tiles (with 2 small ones): 1 tall half-width (2x2), 2 stacked small half-width (2x1 each), 4th full width (4x1)
 *    - Odd N >= 5: pairs of half width, last tile expands to full width
 */
/**
 * Decorates computed spans with optimal column coordinates to enable
 * dynamic shift-up masonry packing across mobile, tablet, and desktop grids.
 */
function applyColumnCoordinates<T>(
  result: Map<string, ComputedTileSpan>,
  items: T[],
  getId: (item: T) => string
): Map<string, ComputedTileSpan> {
  let mobileColTracker = 1;
  let tabletColTracker = 1;
  let desktopColTracker = 1;

  items.forEach((item) => {
    const id = getId(item);
    const span = result.get(id);
    if (!span) return;

    // Mobile (4 virtual columns: allows 1, 2, 4 col spans)
    let colStart = mobileColTracker;
    if (span.colSpan >= 4) {
      colStart = 1;
      mobileColTracker = 1;
    } else {
      if (mobileColTracker + span.colSpan - 1 > 4) {
        colStart = 1;
        mobileColTracker = 1 + span.colSpan;
      } else {
        colStart = mobileColTracker;
        mobileColTracker += span.colSpan;
      }
      if (mobileColTracker > 4) {
        mobileColTracker = 1;
      }
    }

    // Tablet (6 virtual columns)
    let tabletColStart = tabletColTracker;
    if (span.tabletColSpan >= 6) {
      tabletColStart = 1;
      tabletColTracker = 1;
    } else {
      if (tabletColTracker + span.tabletColSpan - 1 > 6) {
        tabletColStart = 1;
        tabletColTracker = 1 + span.tabletColSpan;
      } else {
        tabletColStart = tabletColTracker;
        tabletColTracker += span.tabletColSpan;
      }
      if (tabletColTracker > 6) tabletColTracker = 1;
    }

    // Desktop (12 virtual columns)
    let desktopColStart = desktopColTracker;
    if (span.desktopColSpan >= 12) {
      desktopColStart = 1;
      desktopColTracker = 1;
    } else {
      if (desktopColTracker + span.desktopColSpan - 1 > 12) {
        desktopColStart = 1;
        desktopColTracker = 1 + span.desktopColSpan;
      } else {
        desktopColStart = desktopColTracker;
        desktopColTracker += span.desktopColSpan;
      }
      if (desktopColTracker > 12) desktopColTracker = 1;
    }

    result.set(id, {
      ...span,
      colStart,
      tabletColStart,
      desktopColStart
    });
  });

  return result;
}

export function getComputedTileSpans<T>({
  mode,
  items,
  getId,
  layoutOverrides = {},
  breakpoint,
  isSmall,
  isLarge,
  naturalRowSpan,
  naturalColSpan
}: GetComputedTileSpansOptions<T>): Map<string, ComputedTileSpan> {
  const result = new Map<string, ComputedTileSpan>();
  if (!items || items.length === 0) return result;

  const N = items.length;

  // Helper to check if an item has explicit layout dimension overrides
  const applyExplicitOverrides = () => {
    let hasAnyOverride = false;
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      if (override && (override.colSpan !== undefined || override.rowSpan !== undefined)) {
        hasAnyOverride = true;
        const responsive = getTileResponsiveSpans(
          id,
          layoutOverrides,
          (override.colSpan as GridColSpan) || 2,
          (override.rowSpan as GridRowSpan) || 1,
          breakpoint
        );
        result.set(id, {
          colSpan: responsive.colSpan as GridColSpan,
          rowSpan: responsive.rowSpan as GridRowSpan,
          tabletColSpan: responsive.tabletColSpan as GridColSpan,
          desktopColSpan: responsive.desktopColSpan as GridColSpan
        });
      }
    });
    return hasAnyOverride;
  };

  if (mode === 'compact') {
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const colSpan = (override?.colSpan as GridColSpan) || 2;
      const baseRowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
      const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, baseRowSpan, breakpoint);
      result.set(id, {
        colSpan: responsive.colSpan as GridColSpan,
        rowSpan: responsive.rowSpan as GridRowSpan,
        tabletColSpan: responsive.tabletColSpan as GridColSpan,
        desktopColSpan: responsive.desktopColSpan as GridColSpan
      });
    });
    return applyColumnCoordinates(result, items, getId);
  }

  if (mode === 'full') {
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const colSpan = (override?.colSpan as GridColSpan) || 4;
      const baseRowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
      const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, baseRowSpan, breakpoint);
      result.set(id, {
        colSpan: responsive.colSpan as GridColSpan,
        rowSpan: responsive.rowSpan as GridRowSpan,
        tabletColSpan: responsive.tabletColSpan as GridColSpan,
        desktopColSpan: responsive.desktopColSpan as GridColSpan
      });
    });
    return applyColumnCoordinates(result, items, getId);
  }

  // mode === 'hybrid' (mobile-first smart layout, respects explicit user overrides first)
  // First compute smart hybrid default layout:
  if (N === 1) {
    const item = items[0];
    const id = getId(item);
    const override = layoutOverrides[id];
    const colSpan = (override?.colSpan as GridColSpan) || 4;
    const baseRowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
    const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, baseRowSpan, breakpoint);
    result.set(id, {
      colSpan: responsive.colSpan as GridColSpan,
      rowSpan: responsive.rowSpan as GridRowSpan,
      tabletColSpan: responsive.tabletColSpan as GridColSpan,
      desktopColSpan: responsive.desktopColSpan as GridColSpan
    });
  } else if (N === 2) {
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const colSpan = (override?.colSpan as GridColSpan) || 2;
      const baseRowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
      const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, baseRowSpan, breakpoint);
      result.set(id, {
        colSpan: responsive.colSpan as GridColSpan,
        rowSpan: responsive.rowSpan as GridRowSpan,
        tabletColSpan: responsive.tabletColSpan as GridColSpan,
        desktopColSpan: responsive.desktopColSpan as GridColSpan
      });
    });
  } else if (N === 3) {
    const largeIdx = isLarge ? items.findIndex(isLarge) : -1;
    const fullWidthIndex = largeIdx !== -1 ? largeIdx : 2;

    items.forEach((item, index) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const defaultCol: GridColSpan = (index === fullWidthIndex) ? 4 : 2;
      const colSpan = (override?.colSpan as GridColSpan) || defaultCol;
      const rowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
      const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, rowSpan, breakpoint);
      result.set(id, {
        colSpan: responsive.colSpan as GridColSpan,
        rowSpan: responsive.rowSpan as GridRowSpan,
        tabletColSpan: responsive.tabletColSpan as GridColSpan,
        desktopColSpan: responsive.desktopColSpan as GridColSpan
      });
    });
  } else if (N === 4) {
    const smallIndices = items
      .map((item, idx) => ({ idx, isSmall: Boolean(isSmall?.(item)) }))
      .filter((x) => x.isSmall)
      .map((x) => x.idx);

    if (smallIndices.length >= 2) {
      const smallSet = new Set(smallIndices.slice(0, 2));
      const nonSmallIndices = [0, 1, 2, 3].filter((idx) => !smallSet.has(idx));
      const tallIndex = nonSmallIndices[0] ?? 0;

      items.forEach((item, index) => {
        const id = getId(item);
        const override = layoutOverrides[id];
        let defaultCol: GridColSpan = 2;
        let defaultRow: GridRowSpan = 1;

        if (index === tallIndex) {
          defaultCol = 2;
          defaultRow = 2;
        } else if (smallSet.has(index)) {
          defaultCol = 2;
          defaultRow = 1;
        } else {
          defaultCol = 4;
          defaultRow = naturalRowSpan?.(item) || 1;
        }

        const colSpan = (override?.colSpan as GridColSpan) || defaultCol;
        const rowSpan = (override?.rowSpan as GridRowSpan) || defaultRow;
        const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, rowSpan, breakpoint);
        result.set(id, {
          colSpan: responsive.colSpan as GridColSpan,
          rowSpan: responsive.rowSpan as GridRowSpan,
          tabletColSpan: responsive.tabletColSpan as GridColSpan,
          desktopColSpan: responsive.desktopColSpan as GridColSpan
        });
      });
    } else {
      items.forEach((item) => {
        const id = getId(item);
        const override = layoutOverrides[id];
        const colSpan = (override?.colSpan as GridColSpan) || 2;
        const baseRowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
        const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, baseRowSpan, breakpoint);
        result.set(id, {
          colSpan: responsive.colSpan as GridColSpan,
          rowSpan: responsive.rowSpan as GridRowSpan,
          tabletColSpan: responsive.tabletColSpan as GridColSpan,
          desktopColSpan: responsive.desktopColSpan as GridColSpan
        });
      });
    }
  } else {
    // N >= 5 tiles
    const isOdd = N % 2 !== 0;

    items.forEach((item, index) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const isLastOdd = isOdd && index === N - 1;
      const defaultCol: GridColSpan = isLastOdd ? 4 : (naturalColSpan?.(item) || 2);
      const colSpan = (override?.colSpan as GridColSpan) || defaultCol;
      const rowSpan = (override?.rowSpan as GridRowSpan) || naturalRowSpan?.(item) || 1;
      const responsive = getTileResponsiveSpans(id, layoutOverrides, colSpan, rowSpan, breakpoint);

      result.set(id, {
        colSpan: responsive.colSpan as GridColSpan,
        rowSpan: responsive.rowSpan as GridRowSpan,
        tabletColSpan: responsive.tabletColSpan as GridColSpan,
        desktopColSpan: responsive.desktopColSpan as GridColSpan
      });
    });
  }

  // Ensure any explicit user overrides take absolute precedence
  applyExplicitOverrides();

  return applyColumnCoordinates(result, items, getId);
}
