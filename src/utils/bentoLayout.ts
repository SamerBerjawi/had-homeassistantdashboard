/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bento Grid Layout Engine & Sizing Utilities
 * Computes responsive spans, prioritizes explicit manual ordering,
 * and manages ghosted entity inclusion during Edit Mode.
 */

import { GridColSpan, GridRowSpan } from '../components/layout/GridTile';

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
 * Calculates adaptive column and row spans for a tile based on its layout override
 */
export function getTileResponsiveSpans(
  id: string,
  layoutOverrides?: Record<string, { colSpan?: number; rowSpan?: number; order?: number }>,
  defaultColSpan: GridColSpan = 2,
  defaultRowSpan: GridRowSpan = 1
): TileLayoutConfig {
  const override = layoutOverrides?.[id];
  const colSpan = (override?.colSpan as GridColSpan) || defaultColSpan;
  const rowSpan = (override?.rowSpan as GridRowSpan) || defaultRowSpan;

  // Derive responsive spans from 12-factor virtual grid
  // Mobile (4 cols), Tablet (6 cols), Desktop (12 cols)
  let tabletColSpan: GridColSpan = 3;
  let desktopColSpan: GridColSpan = 3;

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

  return {
    colSpan,
    rowSpan,
    tabletColSpan,
    desktopColSpan,
    order: override?.order
  };
}

/**
 * Format dimensions as clean label string (e.g. "2×1", "2×2", "4×2")
 */
export function formatTileSize(colSpan = 2, rowSpan = 1): string {
  return `${colSpan}×${rowSpan}`;
}

export type TileLayoutMode = 'compact' | 'full' | 'hybrid';

export interface ComputedTileSpan {
  colSpan: GridColSpan;
  rowSpan: GridRowSpan;
  tabletColSpan: GridColSpan;
  desktopColSpan: GridColSpan;
}

export interface GetComputedTileSpansOptions<T> {
  mode: TileLayoutMode;
  items: T[];
  getId: (item: T) => string;
  layoutOverrides?: Record<string, { colSpan?: number; rowSpan?: number; order?: number }>;
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
export function getComputedTileSpans<T>({
  mode,
  items,
  getId,
  layoutOverrides = {},
  isSmall,
  naturalRowSpan,
  naturalColSpan
}: GetComputedTileSpansOptions<T>): Map<string, ComputedTileSpan> {
  const result = new Map<string, ComputedTileSpan>();
  if (!items || items.length === 0) return result;

  const N = items.length;

  if (mode === 'compact') {
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const baseColSpan = override?.colSpan || naturalColSpan?.(item) || 2;
      const baseRowSpan = override?.rowSpan || naturalRowSpan?.(item) || 1;
      const spans = getTileResponsiveSpans(id, layoutOverrides, baseColSpan as GridColSpan, baseRowSpan as GridRowSpan);
      result.set(id, {
        colSpan: spans.colSpan || 2,
        rowSpan: spans.rowSpan || 1,
        tabletColSpan: spans.tabletColSpan || 3,
        desktopColSpan: spans.desktopColSpan || 3
      });
    });
    return result;
  }

  if (mode === 'full') {
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const baseRowSpan = override?.rowSpan || naturalRowSpan?.(item) || 1;
      result.set(id, {
        colSpan: (override?.colSpan as GridColSpan) || 4,
        rowSpan: baseRowSpan,
        tabletColSpan: 3,
        desktopColSpan: 3
      });
    });
    return result;
  }

  // mode === 'hybrid' (mobile-first smart layout, keeps desktop & tablet at standard 3-column span)
  // 1. Single tile: full width to eliminate empty half-page void on mobile
  if (N === 1) {
    const item = items[0];
    const id = getId(item);
    const override = layoutOverrides[id];
    const baseRowSpan = override?.rowSpan || naturalRowSpan?.(item) || 1;
    result.set(id, {
      colSpan: (override?.colSpan as GridColSpan) || 4,
      rowSpan: baseRowSpan,
      tabletColSpan: 3,
      desktopColSpan: 3
    });
    return result;
  }

  // 2. Two tiles: neat balanced pair of half width (2 + 2 = 4 cols on mobile)
  if (N === 2) {
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const baseColSpan = override?.colSpan || naturalColSpan?.(item) || 2;
      const baseRowSpan = override?.rowSpan || naturalRowSpan?.(item) || 1;
      const spans = getTileResponsiveSpans(id, layoutOverrides, baseColSpan as GridColSpan, baseRowSpan as GridRowSpan);
      result.set(id, {
        colSpan: spans.colSpan || 2,
        rowSpan: spans.rowSpan || 1,
        tabletColSpan: 3,
        desktopColSpan: 3
      });
    });
    return result;
  }

  // 3. Three tiles: two half width, third full width on mobile
  if (N === 3) {
    items.forEach((item, index) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      if (override?.colSpan) {
        const spans = getTileResponsiveSpans(id, layoutOverrides, override.colSpan as GridColSpan, (override.rowSpan || 1) as GridRowSpan);
        result.set(id, {
          colSpan: spans.colSpan || 2,
          rowSpan: spans.rowSpan || 1,
          tabletColSpan: 3,
          desktopColSpan: 3
        });
        return;
      }
      const isThird = index === 2;
      const colSpan: GridColSpan = isThird ? 4 : (naturalColSpan?.(item) || 2);
      const tabletColSpan: GridColSpan = 3;
      const desktopColSpan: GridColSpan = 3;
      const rowSpan = naturalRowSpan?.(item) || 1;
      result.set(id, { colSpan, rowSpan, tabletColSpan, desktopColSpan });
    });
    return result;
  }

  // 4. Four tiles:
  // Check if there are 2 smaller tiles (low info) and 1 larger tile
  if (N === 4) {
    const smallIndices = items
      .map((item, idx) => ({ idx, isSmall: Boolean(isSmall?.(item)) }))
      .filter(x => x.isSmall)
      .map(x => x.idx);

    if (smallIndices.length >= 2) {
      // 1 tall (left, 2x2), 2 small (right, stacked 2x1), 1 full width on mobile (row 3, 4x1)
      const smallSet = new Set(smallIndices.slice(0, 2));
      const nonSmallIndices = [0, 1, 2, 3].filter(idx => !smallSet.has(idx));
      const tallIndex = nonSmallIndices[0] ?? 0;

      items.forEach((item, index) => {
        const id = getId(item);
        const override = layoutOverrides[id];
        if (override?.colSpan) {
          const spans = getTileResponsiveSpans(id, layoutOverrides, override.colSpan as GridColSpan, (override.rowSpan || 1) as GridRowSpan);
          result.set(id, {
            colSpan: spans.colSpan || 2,
            rowSpan: spans.rowSpan || 1,
            tabletColSpan: 3,
            desktopColSpan: 3
          });
          return;
        }

        if (index === tallIndex) {
          result.set(id, {
            colSpan: 2,
            rowSpan: 2,
            tabletColSpan: 3,
            desktopColSpan: 3
          });
        } else if (smallSet.has(index)) {
          result.set(id, {
            colSpan: 2,
            rowSpan: 1,
            tabletColSpan: 3,
            desktopColSpan: 3
          });
        } else {
          result.set(id, {
            colSpan: 4,
            rowSpan: naturalRowSpan?.(item) || 1,
            tabletColSpan: 3,
            desktopColSpan: 3
          });
        }
      });
      return result;
    }

    // Default for 4 balanced tiles: 2x2 grid
    items.forEach((item) => {
      const id = getId(item);
      const override = layoutOverrides[id];
      const baseColSpan = override?.colSpan || naturalColSpan?.(item) || 2;
      const baseRowSpan = override?.rowSpan || naturalRowSpan?.(item) || 1;
      const spans = getTileResponsiveSpans(id, layoutOverrides, baseColSpan as GridColSpan, baseRowSpan as GridRowSpan);
      result.set(id, {
        colSpan: spans.colSpan || 2,
        rowSpan: spans.rowSpan || 1,
        tabletColSpan: 3,
        desktopColSpan: 3
      });
    });
    return result;
  }

  // 5. N >= 5 tiles:
  // If odd (5, 7, 9...): pairs of half width on mobile, last odd tile expands to full width
  // If even (6, 8, 10...): pairs of half width
  const isOdd = N % 2 !== 0;

  items.forEach((item, index) => {
    const id = getId(item);
    const override = layoutOverrides[id];
    if (override?.colSpan) {
      const spans = getTileResponsiveSpans(id, layoutOverrides, override.colSpan as GridColSpan, (override.rowSpan || 1) as GridRowSpan);
      result.set(id, {
        colSpan: spans.colSpan || 2,
        rowSpan: spans.rowSpan || 1,
        tabletColSpan: 3,
        desktopColSpan: 3
      });
      return;
    }

    const isLastOdd = isOdd && index === N - 1;
    const colSpan: GridColSpan = isLastOdd ? 4 : (naturalColSpan?.(item) || 2);
    const tabletColSpan: GridColSpan = 3;
    const desktopColSpan: GridColSpan = 3;
    const rowSpan = naturalRowSpan?.(item) || 1;

    result.set(id, { colSpan, rowSpan, tabletColSpan, desktopColSpan });
  });

  return result;
}
