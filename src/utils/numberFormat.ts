/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Rounds any number or numeric string to at most `maxDecimals` (default: 2) decimal places.
 * - If it's a pure integer, returns the integer format (e.g. 14 -> "14", 14820 -> "14,820").
 * - If it has decimals, rounds to at most 2 decimal places without overflowing (e.g. 14.2567 -> "14.26", 11.4 -> "11.4").
 */
export function formatDecimal(val: number | string | undefined | null, maxDecimals = 2): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return String(val);

  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }

  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

/**
 * Rounds a number to at most `maxDecimals` without overflowing decimals.
 */
export function roundToDecimals(val: number, maxDecimals = 2): number {
  if (isNaN(val) || Number.isInteger(val)) return val;
  const factor = Math.pow(10, maxDecimals);
  return Math.round(val * factor) / factor;
}
