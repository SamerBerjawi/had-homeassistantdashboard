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
