/**
 * Two-phase backup restore (REL-004). `planRestore` is pure: it validates the backup and decides
 * everything that will be applied, and throws before any side effect. The caller then applies the
 * single fallible step (the remote config update) first and the synchronous local setters last, so
 * a failure leaves the dashboard exactly as it was.
 */
import { validateBackupShape } from './backupValidation';

const isObject = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);

export interface RestorePlan {
  canvasProfiles?: Record<string, unknown>;
  activeProfileId?: string;
  pin?: string;
  backdrop?: string;
  prefs?: {
    tempUnit?: 'C' | 'F';
    clockFormat?: '24h' | '12h';
    energyTariff?: number;
    currencySymbol?: string;
    backgroundStyle?: 'glow' | 'flat';
    themeMode?: 'auto' | 'dark' | 'light';
    darkMode?: boolean;
  };
  /** Raw preferences object, merged into the stored config */
  rawPrefs?: Record<string, any>;
  profile?: Record<string, any>;
  config?: Record<string, any>;
  entityCustomizations?: Record<string, unknown>;
  entities?: unknown[];
  rooms?: unknown[];
  /** Human readable names of the parts that will be restored */
  parts: string[];
}

export function planRestore(parsed: unknown): RestorePlan {
  const shapeError = validateBackupShape(parsed);
  if (shapeError) throw new Error(shapeError);
  const b = parsed as Record<string, any>;
  const plan: RestorePlan = { parts: [] };

  const canvasData =
    b.canvasProfiles || b.profiles || b.canvas?.profiles || (b.id && b.layout ? { [b.id]: b } : null);
  if (isObject(canvasData) && Object.keys(canvasData).length > 0) {
    plan.canvasProfiles = canvasData;
    plan.activeProfileId = b.activeProfileId || b.canvas?.activeProfileId;
    plan.parts.push('Canvas layouts & cards');
  }

  const incomingPin = b.pinCode !== undefined ? b.pinCode : b.canvas?.pinCode;
  // The server never exposes the real PIN: ignore its marker and any stored hash
  if (typeof incomingPin === 'string' && incomingPin !== '__pin_set__' && !incomingPin.startsWith('scrypt$')) {
    plan.pin = incomingPin;
  }

  const backdrop = b.weatherBackdrop || b.canvas?.weatherBackdrop || b.preferences?.weatherBackdrop;
  if (backdrop && typeof backdrop === 'string') plan.backdrop = backdrop;

  const prefs = b.preferences || b.settings || b.dashboardConfig?.preferences;
  if (isObject(prefs)) {
    plan.rawPrefs = prefs;
    plan.prefs = {};
    if (prefs.tempUnit === 'C' || prefs.tempUnit === 'F') plan.prefs.tempUnit = prefs.tempUnit;
    if (prefs.clockFormat === '24h' || prefs.clockFormat === '12h') plan.prefs.clockFormat = prefs.clockFormat;
    if (typeof prefs.energyTariff === 'number') plan.prefs.energyTariff = prefs.energyTariff;
    if (typeof prefs.currencySymbol === 'string' && prefs.currencySymbol) plan.prefs.currencySymbol = prefs.currencySymbol;
    if (prefs.backgroundStyle === 'glow' || prefs.backgroundStyle === 'flat') plan.prefs.backgroundStyle = prefs.backgroundStyle;
    if (prefs.themeMode === 'auto' || prefs.themeMode === 'dark' || prefs.themeMode === 'light') plan.prefs.themeMode = prefs.themeMode;
    if (typeof prefs.darkMode === 'boolean') plan.prefs.darkMode = prefs.darkMode;
    plan.parts.push('Preferences & theme');
  }

  const profile = b.userProfile || b.profileData || b.dashboardConfig?.profile;
  if (isObject(profile)) {
    plan.profile = profile;
    plan.parts.push('User profile');
  }

  const config = b.dashboardConfig || (b.mobility || b.cameras || b.vacuums ? b : null);
  if (isObject(config)) {
    plan.config = config;
    plan.parts.push('Mobility, cameras, vacuums & rooms');
  }

  const customs = b.entityCustomizations || b.dashboardConfig?.entities?.customizations;
  if (isObject(customs)) plan.entityCustomizations = customs;

  if (Array.isArray(b.entities) && b.entities.length > 0) plan.entities = b.entities;
  if (Array.isArray(b.rooms) && b.rooms.length > 0) plan.rooms = b.rooms;

  return plan;
}
