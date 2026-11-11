// Pure config merge/validation rules used by POST /api/config.
import type { JsonObject, ServerConfig } from './configTypes';

// Server-side recursive deep merge utility for plain objects (arrays are wholesale replaced, undefined skipped)
export function deepMergeConfig(base: JsonObject = {}, partial: JsonObject = {}): JsonObject {
  const result: JsonObject = { ...(base || {}) };
  for (const [key, value] of Object.entries(partial || {})) {
    if (value === undefined) continue;
    if (value === null) {
      delete result[key];
      continue;
    }
    if (key === 'sources' && typeof value === 'object' && !Array.isArray(value)) {
      // Wholesale replace camera sources dictionary so deleted sources are not resurrected
      result[key] = { ...value };
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const existing = result[key];
      const baseVal: JsonObject =
        existing !== null && typeof existing === 'object' && !Array.isArray(existing)
          ? (existing as JsonObject)
          : {};
      result[key] = deepMergeConfig(baseVal, value as JsonObject);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Config validation helper
export function isValidDashboardConfig(body: any): body is ServerConfig {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  const keys = Object.keys(body);
  if (keys.length === 0) {
    return false;
  }
  if (body.version !== undefined && typeof body.version !== 'number') {
    return false;
  }
  if (body.updatedAt !== undefined && typeof body.updatedAt !== 'string') {
    return false;
  }
  if (body.theme !== undefined && (typeof body.theme !== 'object' || Array.isArray(body.theme) || body.theme === null)) {
    return false;
  }
  if (body.mobility !== undefined && (typeof body.mobility !== 'object' || Array.isArray(body.mobility) || body.mobility === null)) {
    return false;
  }
  return true;
}

// Material Data Checker: inspects if configuration has meaningful user customizations
// Mirroring Crystal's data loss prevention safeguards
export function hasMaterialDashboardConfig(data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  // Check rooms configuration
  if (data.rooms && typeof data.rooms === 'object') {
    if (Array.isArray(data.rooms.floorOrder) && data.rooms.floorOrder.length > 0) return true;
    if (Array.isArray(data.rooms.areaOrder) && data.rooms.areaOrder.length > 0) return true;
    if (Array.isArray(data.rooms.favoriteAreas) && data.rooms.favoriteAreas.length > 0) return true;
    if (data.rooms.areaOverrides && typeof data.rooms.areaOverrides === 'object' && Object.keys(data.rooms.areaOverrides).length > 0) return true;
  }

  // Check entity customizations
  if (data.entities && typeof data.entities === 'object') {
    if (Array.isArray(data.entities.hiddenEntityIds) && data.entities.hiddenEntityIds.length > 0) return true;
    if (data.entities.nameOverrides && typeof data.entities.nameOverrides === 'object' && Object.keys(data.entities.nameOverrides).length > 0) return true;
    if (data.entities.iconOverrides && typeof data.entities.iconOverrides === 'object' && Object.keys(data.entities.iconOverrides).length > 0) return true;
    if (data.entities.customizations && typeof data.entities.customizations === 'object' && Object.keys(data.entities.customizations).length > 0) return true;
  }

  // Check areas / floors / labels
  if (data.areas && typeof data.areas === 'object' && Object.keys(data.areas).length > 0) return true;
  if (data.floors && typeof data.floors === 'object' && Object.keys(data.floors).length > 0) return true;
  if (data.labels && typeof data.labels === 'object' && Object.keys(data.labels).length > 0) return true;

  // Check mobility configuration
  if (data.mobility && typeof data.mobility === 'object') {
    if (data.mobility.car && (data.mobility.car.selectedCarEntityId || data.mobility.car.customVehiclePngUrl)) return true;
    if (data.mobility.bike && (data.mobility.bike.selectedBikeEntityId || data.mobility.bike.customVehiclePngUrl)) return true;
  }

  // Check custom theme
  if (data.theme && typeof data.theme === 'object') {
    if (data.theme.customThemes && typeof data.theme.customThemes === 'object' && Object.keys(data.theme.customThemes).length > 0) return true;
    if (data.theme.preset && data.theme.preset !== 'obsidian') return true;
  }

  // Check custom cameras
  if (data.cameras && typeof data.cameras === 'object') {
    if (Array.isArray(data.cameras.favoriteCameras) && data.cameras.favoriteCameras.length > 0) return true;
    if (data.cameras.sources && typeof data.cameras.sources === 'object' && Object.keys(data.cameras.sources).length > 0) return true;
  }

  // Check preferences / profile
  if (data.preferences && typeof data.preferences === 'object' && Object.keys(data.preferences).length > 0) return true;
  if (data.profile && typeof data.profile === 'object' && Object.keys(data.profile).length > 0) return true;

  return false;
}

export type ConfigWriteGuard =
  | { kind: 'ok' }
  | { kind: 'material_guard' }
  | { kind: 'version_conflict'; clientExpectedVersion: number };

export interface ConfigWriteInput {
  currentConfig: ServerConfig | null;
  currentServerVersion: number;
  targetConfig: JsonObject;
  allowEmpty: boolean;
  isPartialMerge: boolean;
  clientExpectedVersion: number | undefined;
}

/**
 * Decides whether POST /api/config may proceed (data-loss and concurrency guards).
 * 1. Material-data guard: an empty/default payload must not overwrite a customised config
 *    (unless allowEmpty, a partial merge, or an explicit camera-sources update).
 * 2. Version guard: a client that last saw an older server version is rejected (409).
 */
export function checkConfigWriteGuards(input: ConfigWriteInput): ConfigWriteGuard {
  const { currentConfig, currentServerVersion, targetConfig, allowEmpty, isPartialMerge, clientExpectedVersion } = input;
  const isExplicitCameraSourcesUpdate = (targetConfig as any).cameras?.sources !== undefined;
  if (
    !isPartialMerge &&
    !allowEmpty &&
    !isExplicitCameraSourcesUpdate &&
    currentConfig &&
    hasMaterialDashboardConfig(currentConfig) &&
    !hasMaterialDashboardConfig(targetConfig)
  ) {
    return { kind: 'material_guard' };
  }
  if (
    !isPartialMerge &&
    currentConfig &&
    clientExpectedVersion !== undefined &&
    !isNaN(clientExpectedVersion) &&
    clientExpectedVersion < currentServerVersion
  ) {
    return { kind: 'version_conflict', clientExpectedVersion };
  }
  return { kind: 'ok' };
}

/** Changing camera sources needs admin rights; ordinary saves echo the sources back unchanged. */
export function cameraSourcesChanged(currentConfig: ServerConfig | null, targetConfig: JsonObject): boolean {
  const target = (targetConfig as any).cameras?.sources;
  if (target === undefined) return false;
  const before = JSON.stringify((currentConfig as any)?.cameras?.sources ?? {});
  const after = JSON.stringify(target ?? {});
  return before !== after;
}
