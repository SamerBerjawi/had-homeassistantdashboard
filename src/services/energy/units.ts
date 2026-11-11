/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Energy unit conversion.
 */

export function getEnergyToKWhMultiplier(unit?: string | null): number {
  if (!unit) return 1;
  const u = unit.trim().toLowerCase();
  if (u === 'wh') return 0.001;
  if (u === 'kwh') return 1;
  if (u === 'mwh') return 1000;
  if (u === 'gwh') return 1000000;
  if (u === 'j') return 1 / 3600000;
  if (u === 'kj') return 1 / 3600;
  if (u === 'mj') return 1 / 3.6;
  if (u === 'gj') return 1000 / 3.6;
  return 1;
}
