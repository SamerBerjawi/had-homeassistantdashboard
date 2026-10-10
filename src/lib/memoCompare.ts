/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React.memo comparator that treats array props as equal when they hold the same elements.
 * Useful when a parent re-derives an array (filter/slice) on every render but the underlying
 * items are stable references.
 */
export function arePropsShallowEqualWithArrays<P extends object>(prev: Readonly<P>, next: Readonly<P>): boolean {
  const prevKeys = Object.keys(prev) as (keyof P)[];
  if (prevKeys.length !== Object.keys(next).length) return false;
  for (const key of prevKeys) {
    const a = prev[key] as unknown;
    const b = next[key] as unknown;
    if (Object.is(a, b)) continue;
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))) {
      continue;
    }
    return false;
  }
  return true;
}
