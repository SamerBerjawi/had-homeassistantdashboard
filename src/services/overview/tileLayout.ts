/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overview tile layout rules: the full tile order (defaults plus one tile per configured camera),
 * which tiles each section tab shows, which tiles are displayed, and the config updates the
 * layout editor makes (reorder, size, hide, visibility mode, reset).
 */

import type { ResolvedEntity } from '../../types';
import { DEFAULT_OVERVIEW_TILE_ORDER, OverviewTileVisibilityMode, UserDashboardConfig } from '../../types/userConfig';

export function buildCurrentTileOrder(savedTileOrder: string[] | undefined, surveillanceCameras: ResolvedEntity[]) {
  const savedOrder = savedTileOrder || [];
  const orderSet = new Set(savedOrder);
  const fullOrder = [...savedOrder];
  DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
    if (!orderSet.has(id)) {
      fullOrder.push(id);
      orderSet.add(id);
    }
  });

  // Automatically add all configured RTSP cameras separately as individual tiles
  surveillanceCameras.forEach((cam) => {
    const camTileId = `camera:${cam.entity_id}`;
    if (!orderSet.has(camTileId)) {
      const camerasIdx = fullOrder.indexOf('cameras');
      if (camerasIdx !== -1) {
        fullOrder.splice(camerasIdx + 1, 0, camTileId);
      } else {
        fullOrder.push(camTileId);
      }
      orderSet.add(camTileId);
    }
  });

  return fullOrder;
}

// Tab to tile ID mapping
export function buildOverviewTabTileMap(surveillanceCameras: ResolvedEntity[]): Record<string, string[]> {
  return {
    all: [],
    lights: ['lights'],
    switches: ['switches'],
    energy: ['power_flow', 'power_flow_chart', 'energy_usage', 'energy_usage_chart', 'solar_production', 'solar_production_chart'],
    security: ['alarm', 'doors', 'windows', 'motion', 'leak', 'smoke', 'cameras', ...surveillanceCameras.map(c => `camera:${c.entity_id}`)],
    cameras: ['cameras', ...surveillanceCameras.map(c => `camera:${c.entity_id}`)],
    climate: ['fans', 'weather', 'weather_hourly'],
    openings: ['doors', 'windows'],
    media: ['media'],
    vacuums: ['vacuums']
  };
}

export interface DisplayTilesInputs {
  currentTileOrder: string[];
  switchEntities: ResolvedEntity[];
  vacuumEntities: ResolvedEntity[];
  surveillanceCameras: ResolvedEntity[];
  isEditMode: boolean;
  hiddenTilesSet: Set<string>;
  hiddenFromAllSet: Set<string>;
  activeOverviewTab: string;
  OVERVIEW_TAB_TILE_MAP: Record<string, string[]>;
}

export function filterDisplayTiles(p: DisplayTilesInputs) {
  const {
    currentTileOrder, switchEntities, vacuumEntities, surveillanceCameras, isEditMode,
    hiddenTilesSet, hiddenFromAllSet, activeOverviewTab, OVERVIEW_TAB_TILE_MAP
  } = p;
  return currentTileOrder.filter((id) => {
    if (id === 'switches' && switchEntities.length === 0 && !isEditMode) return false;
    if (id === 'vacuums' && vacuumEntities.length === 0 && !isEditMode) return false;
    if (id === 'cameras' && surveillanceCameras.length === 0 && !isEditMode) return false;
    if (id.startsWith('camera:')) {
      const camEntityId = id.replace('camera:', '');
      const exists = surveillanceCameras.some((c) => c.entity_id === camEntityId);
      if (!exists && !isEditMode) return false;
    }
    if (hiddenTilesSet.has(id)) return false;

    if (activeOverviewTab === 'all') {
      // If hidden specifically from 'all' tab, hide unless in edit mode so user can see & toggle it
      if (hiddenFromAllSet.has(id) && !isEditMode) {
        return false;
      }
    } else {
      const allowed = OVERVIEW_TAB_TILE_MAP[activeOverviewTab];
      if (allowed && !allowed.includes(id)) {
        return false;
      }
    }
    return true;
  });
}

// Ensure default camera tile size is 1x
export function withCamerasTileSize1x(prev: UserDashboardConfig): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      tileSizes: {
        ...(prev.overview?.tileSizes || {}),
        cameras: '1x'
      }
    }
  };
}

// Writes the displayed tiles' new order back into the full saved order (hidden tiles keep their slots)
export function applyTileReorder(prev: UserDashboardConfig, fallbackOrder: string[], newOrder: string[]): UserDashboardConfig {
  const savedOrder = prev.overview?.tileOrder || fallbackOrder;
  const orderSet = new Set(savedOrder);
  const fullBase = [...savedOrder];
  DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
    if (!orderSet.has(id)) fullBase.push(id);
  });

  const displaySet = new Set(newOrder);
  let newOrderIdx = 0;
  const fullOrder = fullBase.map((id) => {
    if (displaySet.has(id)) {
      return newOrder[newOrderIdx++];
    }
    return id;
  });
  while (newOrderIdx < newOrder.length) {
    fullOrder.push(newOrder[newOrderIdx++]);
  }
  DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
    if (!fullOrder.includes(id)) {
      fullOrder.push(id);
    }
  });
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      tileOrder: fullOrder
    }
  };
}

export function getNextTileSize(tileSizes: Record<string, '1x' | '2x'>, tileId: string) {
  const currentSize = tileSizes[tileId] ?? (tileId === 'weather' || tileId === 'weather_hourly' ? '2x' : '1x');
  const nextSize = currentSize === '2x' ? '1x' : '2x';
  return nextSize;
}

export function withTileSize(prev: UserDashboardConfig, tileId: string, nextSize: '1x' | '2x'): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      tileSizes: {
        ...(prev.overview?.tileSizes || {}),
        [tileId]: nextSize
      }
    }
  };
}

// Copy of the set with tileId added when absent, removed when present
export function toggleInSet(set: Set<string>, tileId: string) {
  const isHidden = set.has(tileId);
  const nextSet = new Set(set);
  if (isHidden) {
    nextSet.delete(tileId);
  } else {
    nextSet.add(tileId);
  }
  return nextSet;
}

export function withHiddenTiles(prev: UserDashboardConfig, hiddenTiles: string[]): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      hiddenTiles
    }
  };
}

export function withHiddenFromAllTiles(prev: UserDashboardConfig, hiddenFromAllTiles: string[]): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      hiddenFromAllTiles
    }
  };
}

export function computeAddWidget(hiddenTilesSet: Set<string>, currentTileOrder: string[], widgetId: string) {
  const nextSet = new Set(hiddenTilesSet);
  nextSet.delete(widgetId);
  const nextOrder = [...currentTileOrder];
  if (!nextOrder.includes(widgetId)) {
    nextOrder.push(widgetId);
  }
  return { nextSet, nextOrder };
}

export function withTileOrderAndHidden(prev: UserDashboardConfig, nextOrder: string[], nextSet: Set<string>): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      tileOrder: nextOrder,
      hiddenTiles: Array.from(nextSet)
    }
  };
}

export function withHideBadgesToggled(prev: UserDashboardConfig): UserDashboardConfig {
  const current = Boolean(prev.overview?.hideBadges);
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      hideBadges: !current
    }
  };
}

export function computeTileVisibilityMode(
  hiddenTilesSet: Set<string>,
  hiddenFromAllSet: Set<string>,
  currentTileOrder: string[],
  tileId: string,
  mode: OverviewTileVisibilityMode
) {
  const nextHiddenTiles = new Set(hiddenTilesSet);
  const nextHiddenFromAll = new Set(hiddenFromAllSet);

  if (mode === 'all_on') {
    nextHiddenTiles.delete(tileId);
    nextHiddenFromAll.delete(tileId);
  } else if (mode === 'tab_only') {
    nextHiddenTiles.delete(tileId);
    nextHiddenFromAll.add(tileId);
  } else if (mode === 'all_off') {
    nextHiddenTiles.add(tileId);
    nextHiddenFromAll.delete(tileId);
  }

  const nextOrder = [...currentTileOrder];
  if (mode !== 'all_off' && !nextOrder.includes(tileId)) {
    nextOrder.push(tileId);
  }

  return { nextOrder, nextHiddenTiles, nextHiddenFromAll };
}

export function withTileVisibility(
  prev: UserDashboardConfig,
  nextOrder: string[],
  nextHiddenTiles: Set<string>,
  nextHiddenFromAll: Set<string>
): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      ...(prev.overview || {}),
      tileOrder: nextOrder,
      hiddenTiles: Array.from(nextHiddenTiles),
      hiddenFromAllTiles: Array.from(nextHiddenFromAll)
    }
  };
}

export function withResetLayout(prev: UserDashboardConfig): UserDashboardConfig {
  return {
    ...prev,
    overview: {
      tileOrder: [...DEFAULT_OVERVIEW_TILE_ORDER],
      hiddenTiles: [],
      hiddenFromAllTiles: [],
      hideBadges: false,
      tileSizes: {
        weather: '2x',
        weather_hourly: '2x'
      }
    }
  };
}
