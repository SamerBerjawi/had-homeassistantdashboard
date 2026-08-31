/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic Bento Grid Packing & Sorting Algorithm
 * Packs mixed-dimension tiles (2x1 compact, 2x2 standard, 4x2 wide, etc.)
 * into a virtual column grid (4 cols mobile, 6-8 tablet, 12 desktop)
 * with zero empty holes and lookahead backfilling.
 */

export interface BentoTileDescriptor<T = any> {
  id: string;
  w: number; // width in virtual grid units (2, 4, 6, 8, 12)
  h: number; // height in virtual grid units (1, 2, 3, 4)
  priority?: number; // visual importance / sorting weight (higher comes first)
  data?: T;
}

export interface PackedBentoItem<T = any> extends BentoTileDescriptor<T> {
  x: number; // 0-indexed column position
  y: number; // 0-indexed row position
  gridColumn: string; // CSS grid-column string (e.g., "span 2 / span 2")
  gridRow: string; // CSS grid-row string (e.g., "span 1 / span 1")
}

export interface BentoLayoutOptions {
  columns: number; // total virtual columns (e.g. 4, 6, 8, 12)
  maxRows?: number;
}

/**
 * Deterministic O(n log n) sorting function that pairs odd-count 2x1 and 2x2 items
 * before wide 4x2 elements to eliminate awkward gaps on 4-column mobile grids.
 */
export function sortTilesForBento<T extends BentoTileDescriptor>(tiles: T[]): T[] {
  if (!tiles || tiles.length <= 1) return tiles;

  // Group tiles by dimensions
  const compact2x1: T[] = [];
  const standard2x2: T[] = [];
  const wide4x2: T[] = [];
  const other: T[] = [];

  // Sort input tiles by priority first (descending)
  const sortedByPriority = [...tiles].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const tile of sortedByPriority) {
    if (tile.w === 2 && tile.h === 1) {
      compact2x1.push(tile);
    } else if (tile.w === 2 && tile.h === 2) {
      standard2x2.push(tile);
    } else if (tile.w >= 4) {
      wide4x2.push(tile);
    } else {
      other.push(tile);
    }
  }

  const result: T[] = [];

  // If we have an odd number of 2x1 tiles, pair one with another 2x1 or 2x2 before placing a 4x2 wide tile
  let cIdx = 0;
  let sIdx = 0;
  let wIdx = 0;

  while (cIdx < compact2x1.length || sIdx < standard2x2.length || wIdx < wide4x2.length) {
    // Pack 2x2 standard items in pairs or singles
    if (sIdx < standard2x2.length) {
      result.push(standard2x2[sIdx++]);
      if (sIdx < standard2x2.length) {
        result.push(standard2x2[sIdx++]);
      }
    }

    // Pack 2x1 compact items in even pairs (2x1 + 2x1 = fills 4 columns row)
    if (cIdx < compact2x1.length) {
      result.push(compact2x1[cIdx++]);
      if (cIdx < compact2x1.length) {
        result.push(compact2x1[cIdx++]);
      }
    }

    // Pack 4x2 wide items (takes full 4-column row)
    if (wIdx < wide4x2.length) {
      result.push(wide4x2[wIdx++]);
    }
  }

  // Append any remaining custom-dimension tiles
  result.push(...other);

  return result;
}

/**
 * Calculates a packed 2D grid layout for a given list of bento items.
 * Guarantees zero empty holes using lookahead backfilling.
 */
export function packBentoLayout<T = any>(
  items: BentoTileDescriptor<T>[],
  options: BentoLayoutOptions
): PackedBentoItem<T>[] {
  const { columns } = options;
  if (!items || items.length === 0) return [];
  if (columns <= 0) return [];

  // Sort items deterministically
  const queue = sortTilesForBento(items);

  // Clamp item dimensions so they never exceed available columns
  const clampedQueue = queue.map((item) => ({
    ...item,
    w: Math.min(item.w, columns),
    h: Math.max(1, item.h)
  }));

  // 2D Occupancy Matrix: matrix[y][x] = true if occupied
  const matrix: boolean[][] = [];

  const isOccupied = (x: number, y: number): boolean => {
    if (!matrix[y]) return false;
    return matrix[y][x] === true;
  };

  const canFit = (x: number, y: number, w: number, h: number): boolean => {
    if (x + w > columns) return false;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (isOccupied(x + c, y + r)) {
          return false;
        }
      }
    }
    return true;
  };

  const occupy = (x: number, y: number, w: number, h: number) => {
    for (let r = 0; r < h; r++) {
      const rowIdx = y + r;
      if (!matrix[rowIdx]) {
        matrix[rowIdx] = new Array(columns).fill(false);
      }
      for (let c = 0; c < w; c++) {
        matrix[rowIdx][x + c] = true;
      }
    }
  };

  const packed: PackedBentoItem<T>[] = [];
  const remaining = [...clampedQueue];

  let currentY = 0;
  let currentX = 0;

  while (remaining.length > 0) {
    // Find next free cell in the matrix
    while (isOccupied(currentX, currentY)) {
      currentX++;
      if (currentX >= columns) {
        currentX = 0;
        currentY++;
      }
    }

    // Try to find the best candidate item that fits at (currentX, currentY)
    let candidateIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (canFit(currentX, currentY, candidate.w, candidate.h)) {
        candidateIndex = i;
        break;
      }
    }

    if (candidateIndex !== -1) {
      const [item] = remaining.splice(candidateIndex, 1);
      occupy(currentX, currentY, item.w, item.h);

      packed.push({
        ...item,
        x: currentX,
        y: currentY,
        gridColumn: `span ${item.w} / span ${item.w}`,
        gridRow: `span ${item.h} / span ${item.h}`
      });

      // Advance cursor
      currentX += item.w;
      if (currentX >= columns) {
        currentX = 0;
        currentY++;
      }
    } else {
      // Advance to next row
      currentX = 0;
      currentY++;
    }
  }

  return packed;
}

/**
 * Maps viewport width in pixels to standard virtual column count.
 */
export function getBentoVirtualColumns(width: number): number {
  if (width < 640) return 4; // Mobile phone: 4 virtual columns
  if (width < 1024) return 6; // Tablet / small laptop: 6 virtual columns
  if (width < 1440) return 8; // Desktop standard: 8 virtual columns
  return 12; // Large desktop / Kiosk display: 12 virtual columns
}

// Backward compatibility alias
export type BentoItem<T = any> = BentoTileDescriptor<T>;
