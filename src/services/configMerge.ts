/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure client-side configuration merge helpers (no I/O). Extracted from configStorageService.ts,
 * which re-exports them so existing imports keep working.
 */

import { UserDashboardConfig, DEFAULT_USER_CONFIG } from '../types/userConfig';

/**
 * Pure delta merge utility: merges two partial configurations without injecting default values.
 * Used for accumulating granular user changes in pendingDeltaRef before debounced persistence.
 */
export function mergeDelta(
  base: Partial<UserDashboardConfig>,
  delta: Partial<UserDashboardConfig>
): Partial<UserDashboardConfig> {
  return mergePlainDelta(base, delta) as Partial<UserDashboardConfig>;
}

// Recursive worker: nested sections are plain objects, not whole configs
function mergePlainDelta(base: Record<string, any>, delta: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...base };

  for (const [key, value] of Object.entries(delta)) {
    if (value === undefined) continue;
    if (value === null) {
      delete result[key];
      continue;
    }

    if (key === 'sources' && typeof value === 'object' && !Array.isArray(value)) {
      // Wholesale replace camera sources dictionary so deleted sources are not resurrected
      result[key] = { ...value };
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const baseVal =
        result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])
          ? result[key]
          : {};
      result[key] = mergePlainDelta(baseVal, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/** Fields read by hasMaterialDashboardConfig; every one is checked at runtime before use. */
interface MaterialConfigProbe {
  rooms?: { floorOrder?: unknown; areaOrder?: unknown; favoriteAreas?: unknown; areaOverrides?: unknown };
  entities?: { hiddenEntityIds?: unknown; nameOverrides?: unknown; iconOverrides?: unknown; customizations?: unknown };
  areas?: unknown;
  floors?: unknown;
  labels?: unknown;
  mobility?: {
    car?: { selectedCarEntityId?: unknown; customVehiclePngUrl?: unknown };
    bike?: { selectedBikeEntityId?: unknown; customVehiclePngUrl?: unknown };
  };
  theme?: { customThemes?: unknown; preset?: unknown };
  cameras?: { favoriteCameras?: unknown; sources?: unknown };
  overview?: { tileOrder?: unknown; hiddenTiles?: unknown; hiddenFromAllTiles?: unknown; tileSizes?: unknown; hideBadges?: unknown };
  preferences?: unknown;
  profile?: unknown;
}

/**
 * Client-side Material Data Checker: inspects if configuration has meaningful customizations
 * to prevent wiping out persistent NAS data with uninitialized or empty state.
 */
export function hasMaterialDashboardConfig(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const data = input as MaterialConfigProbe;

  if (data.rooms && typeof data.rooms === 'object') {
    if (Array.isArray(data.rooms.floorOrder) && data.rooms.floorOrder.length > 0) return true;
    if (Array.isArray(data.rooms.areaOrder) && data.rooms.areaOrder.length > 0) return true;
    if (Array.isArray(data.rooms.favoriteAreas) && data.rooms.favoriteAreas.length > 0) return true;
    if (data.rooms.areaOverrides && typeof data.rooms.areaOverrides === 'object' && Object.keys(data.rooms.areaOverrides).length > 0) return true;
  }

  if (data.entities && typeof data.entities === 'object') {
    if (Array.isArray(data.entities.hiddenEntityIds) && data.entities.hiddenEntityIds.length > 0) return true;
    if (data.entities.nameOverrides && typeof data.entities.nameOverrides === 'object' && Object.keys(data.entities.nameOverrides).length > 0) return true;
    if (data.entities.iconOverrides && typeof data.entities.iconOverrides === 'object' && Object.keys(data.entities.iconOverrides).length > 0) return true;
    if (data.entities.customizations && typeof data.entities.customizations === 'object' && Object.keys(data.entities.customizations).length > 0) return true;
  }

  if (data.areas && typeof data.areas === 'object' && Object.keys(data.areas).length > 0) return true;
  if (data.floors && typeof data.floors === 'object' && Object.keys(data.floors).length > 0) return true;
  if (data.labels && typeof data.labels === 'object' && Object.keys(data.labels).length > 0) return true;

  if (data.mobility && typeof data.mobility === 'object') {
    if (data.mobility.car && (data.mobility.car.selectedCarEntityId || data.mobility.car.customVehiclePngUrl)) return true;
    if (data.mobility.bike && (data.mobility.bike.selectedBikeEntityId || data.mobility.bike.customVehiclePngUrl)) return true;
  }

  if (data.theme && typeof data.theme === 'object') {
    if (data.theme.customThemes && typeof data.theme.customThemes === 'object' && Object.keys(data.theme.customThemes).length > 0) return true;
    if (data.theme.preset && data.theme.preset !== 'obsidian') return true;
  }

  if (data.cameras && typeof data.cameras === 'object') {
    if (Array.isArray(data.cameras.favoriteCameras) && data.cameras.favoriteCameras.length > 0) return true;
    if (data.cameras.sources && typeof data.cameras.sources === 'object' && Object.keys(data.cameras.sources).length > 0) return true;
  }

  if (data.overview && typeof data.overview === 'object') {
    if (Array.isArray(data.overview.tileOrder) && data.overview.tileOrder.length > 0) return true;
    if (Array.isArray(data.overview.hiddenTiles) && data.overview.hiddenTiles.length > 0) return true;
    if (Array.isArray(data.overview.hiddenFromAllTiles) && data.overview.hiddenFromAllTiles.length > 0) return true;
    if (data.overview.tileSizes && Object.keys(data.overview.tileSizes).length > 0) return true;
    if (typeof data.overview.hideBadges === 'boolean') return true;
  }

  if (data.preferences && typeof data.preferences === 'object' && Object.keys(data.preferences).length > 0) return true;
  if (data.profile && typeof data.profile === 'object' && Object.keys(data.profile).length > 0) return true;

  return false;
}

/**
 * Deep merge utility for configuration objects
 * Safe against missing/partial/empty base objects
 */
export function mergeConfig(
  base?: UserDashboardConfig | Partial<UserDashboardConfig> | null,
  partial?: Partial<UserDashboardConfig> | null
): UserDashboardConfig {
  const safeBase: UserDashboardConfig = base && typeof base === 'object'
    ? {
        ...DEFAULT_USER_CONFIG,
        ...base,
        theme: { ...DEFAULT_USER_CONFIG.theme, ...(base.theme || {}) },
        mobility: {
          car: { ...DEFAULT_USER_CONFIG.mobility.car, ...(base.mobility?.car || {}) },
          bike: { ...DEFAULT_USER_CONFIG.mobility.bike, ...(base.mobility?.bike || {}) }
        },
        vacuums: {
          ...DEFAULT_USER_CONFIG.vacuums,
          ...(base.vacuums || {})
        },
        cameras: { ...DEFAULT_USER_CONFIG.cameras, ...(base.cameras || {}) },
        network: { ...DEFAULT_USER_CONFIG.network, ...(base.network || {}) },
        energy: { ...DEFAULT_USER_CONFIG.energy, ...(base.energy || {}) },
        overview: {
          tileOrder: base.overview?.tileOrder || DEFAULT_USER_CONFIG.overview?.tileOrder,
          hiddenTiles: base.overview?.hiddenTiles || DEFAULT_USER_CONFIG.overview?.hiddenTiles,
          hiddenFromAllTiles: base.overview?.hiddenFromAllTiles || DEFAULT_USER_CONFIG.overview?.hiddenFromAllTiles,
          tileSizes: { ...(DEFAULT_USER_CONFIG.overview?.tileSizes || {}), ...(base.overview?.tileSizes || {}) },
          hideBadges: typeof base.overview?.hideBadges === 'boolean'
            ? base.overview.hideBadges
            : (DEFAULT_USER_CONFIG.overview?.hideBadges ?? false)
        }
      }
    : DEFAULT_USER_CONFIG;

  if (!partial) return safeBase;

  return {
    ...safeBase,
    ...partial,
    version: partial.version || safeBase.version || 1,
    updatedAt: partial.updatedAt || new Date().toISOString(),
    theme: {
      ...safeBase.theme,
      ...(partial.theme || {})
    },
    mobility: {
      car: {
        ...safeBase.mobility.car,
        ...(partial.mobility?.car || {})
      },
      bike: {
        ...safeBase.mobility.bike,
        ...(partial.mobility?.bike || {})
      }
    },
    vacuums: {
      ...(safeBase.vacuums || {}),
      ...(partial.vacuums || {}),
      robot: {
        ...(safeBase.vacuums?.robot || {}),
        ...(partial.vacuums?.robot || {})
      },
      stick: {
        ...(safeBase.vacuums?.stick || {}),
        ...(partial.vacuums?.stick || {})
      }
    },
    rooms: {
      floorOrder: Array.isArray(partial.rooms?.floorOrder)
        ? [...partial.rooms.floorOrder]
        : Array.isArray(safeBase.rooms?.floorOrder)
        ? [...safeBase.rooms.floorOrder]
        : [],
      hiddenFloors: Array.isArray(partial.rooms?.hiddenFloors)
        ? [...partial.rooms.hiddenFloors]
        : Array.isArray(safeBase.rooms?.hiddenFloors)
        ? [...safeBase.rooms.hiddenFloors]
        : [],
      areaOrder: Array.isArray(partial.rooms?.areaOrder)
        ? [...partial.rooms.areaOrder]
        : Array.isArray(safeBase.rooms?.areaOrder)
        ? [...safeBase.rooms.areaOrder]
        : [],
      hiddenAreas: Array.isArray(partial.rooms?.hiddenAreas)
        ? [...partial.rooms.hiddenAreas]
        : Array.isArray(safeBase.rooms?.hiddenAreas)
        ? [...safeBase.rooms.hiddenAreas]
        : [],
      favoriteAreas: Array.isArray(partial.rooms?.favoriteAreas)
        ? [...partial.rooms.favoriteAreas]
        : Array.isArray(safeBase.rooms?.favoriteAreas)
        ? [...safeBase.rooms.favoriteAreas]
        : [],
      areaSortOrder: Array.isArray(partial.rooms?.areaSortOrder)
        ? [...partial.rooms.areaSortOrder]
        : Array.isArray(safeBase.rooms?.areaSortOrder)
        ? [...safeBase.rooms.areaSortOrder]
        : [],
      tileLayout: partial.rooms?.tileLayout || safeBase.rooms?.tileLayout || (partial.rooms?.fullWidthTiles ? 'full' : 'compact'),
      fullWidthTiles: partial.rooms?.fullWidthTiles !== undefined
        ? Boolean(partial.rooms.fullWidthTiles)
        : Boolean(safeBase.rooms?.fullWidthTiles),
      areaOverrides: {
        ...(safeBase.rooms?.areaOverrides || {}),
        ...(partial.rooms?.areaOverrides || {})
      }
    },
    entities: {
      hiddenEntityIds: Array.isArray(partial.entities?.hiddenEntityIds)
        ? [...partial.entities.hiddenEntityIds]
        : Array.isArray(safeBase.entities?.hiddenEntityIds)
        ? [...safeBase.entities.hiddenEntityIds]
        : [],
      nameOverrides: {
        ...(safeBase.entities?.nameOverrides || {}),
        ...(partial.entities?.nameOverrides || {})
      },
      iconOverrides: {
        ...(safeBase.entities?.iconOverrides || {}),
        ...(partial.entities?.iconOverrides || {})
      },
      customizations: {
        ...(safeBase.entities?.customizations || {}),
        ...(partial.entities?.customizations || {})
      }
    },
    cameras: {
      ...safeBase.cameras,
      ...(partial.cameras || {}),
      sources: partial.cameras?.sources !== undefined
        ? { ...partial.cameras.sources }
        : safeBase.cameras?.sources
    },
    network: {
      ...safeBase.network,
      ...(partial.network || {})
    },
    energy: {
      ...safeBase.energy,
      ...(partial.energy || {})
    },
    preferences: {
      ...(safeBase.preferences || {}),
      ...(partial.preferences || {})
    },
    profile: {
      ...(safeBase.profile || {}),
      ...(partial.profile || {})
    },
    areas: {
      ...(safeBase.areas || {}),
      ...(partial.areas || {})
    },
    floors: {
      ...(safeBase.floors || {}),
      ...(partial.floors || {})
    },
    labels: {
      ...(safeBase.labels || {}),
      ...(partial.labels || {})
    },
    canvas: {
      ...(safeBase.canvas || {}),
      ...(partial.canvas || {})
    },
    overview: {
      tileOrder: Array.isArray(partial.overview?.tileOrder)
        ? [...partial.overview.tileOrder]
        : Array.isArray(safeBase.overview?.tileOrder)
        ? [...safeBase.overview.tileOrder]
        : [...(DEFAULT_USER_CONFIG.overview?.tileOrder || [])],
      hiddenTiles: Array.isArray(partial.overview?.hiddenTiles)
        ? [...partial.overview.hiddenTiles]
        : Array.isArray(safeBase.overview?.hiddenTiles)
        ? [...safeBase.overview.hiddenTiles]
        : [],
      hiddenFromAllTiles: Array.isArray(partial.overview?.hiddenFromAllTiles)
        ? [...partial.overview.hiddenFromAllTiles]
        : Array.isArray(safeBase.overview?.hiddenFromAllTiles)
        ? [...safeBase.overview.hiddenFromAllTiles]
        : [],
      tileSizes: {
        ...(safeBase.overview?.tileSizes || {}),
        ...(partial.overview?.tileSizes || {})
      },
      hideBadges: typeof partial.overview?.hideBadges === 'boolean'
        ? partial.overview.hideBadges
        : (safeBase.overview?.hideBadges ?? false)
    },
    layoutOverrides: {
      ...(safeBase.layoutOverrides || {}),
      ...(partial.layoutOverrides || {})
    },
    responsiveLayoutOverrides: {
      mobile: {
        ...(safeBase.responsiveLayoutOverrides?.mobile || {}),
        ...(partial.responsiveLayoutOverrides?.mobile || {})
      },
      laptop: {
        ...(safeBase.responsiveLayoutOverrides?.laptop || {}),
        ...(partial.responsiveLayoutOverrides?.laptop || {})
      },
      desktop: {
        ...(safeBase.responsiveLayoutOverrides?.desktop || {}),
        ...(partial.responsiveLayoutOverrides?.desktop || {})
      }
    }
  };
}
