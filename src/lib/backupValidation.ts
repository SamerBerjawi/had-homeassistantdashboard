/**
 * Validates a backup/snapshot object before any part of it is applied, so a malformed file is
 * rejected as a whole instead of being half-restored (REL-004).
 */

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const OBJECT_KEYS = [
  'preferences', 'settings', 'canvasProfiles', 'profiles', 'canvas', 'dashboardConfig',
  'theme', 'rooms', 'entities', 'cameras', 'mobility', 'vacuums', 'navigation', 'areas', 'floors', 'labels'
] as const;

/** Returns null when the backup can be applied, otherwise a message for the user. */
export function validateBackupShape(parsed: unknown): string | null {
  if (!isObject(parsed)) return 'The backup must be a JSON object.';
  if (Object.keys(parsed).length === 0) return 'The backup is empty.';

  for (const key of OBJECT_KEYS) {
    const value = parsed[key];
    if (value !== undefined && value !== null && !isObject(value)) {
      return `Backup field "${key}" has the wrong type (expected an object).`;
    }
  }

  const prefs = (parsed.preferences ?? parsed.settings) as Record<string, unknown> | undefined;
  if (isObject(prefs)) {
    if (prefs.energyTariff !== undefined && typeof prefs.energyTariff !== 'number') {
      return 'Backup field "preferences.energyTariff" must be a number.';
    }
    if (prefs.currencySymbol !== undefined && typeof prefs.currencySymbol !== 'string') {
      return 'Backup field "preferences.currencySymbol" must be text.';
    }
  }

  if (parsed.pinCode !== undefined && typeof parsed.pinCode !== 'string') {
    return 'Backup field "pinCode" must be text.';
  }
  return null;
}
