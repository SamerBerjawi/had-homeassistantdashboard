/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small lookups shared by the energy transformers.
 */

import type { EnergyPeriodType } from './types';

export function createPriceLookup(states: Record<string, any>) {
  // Helper to lookup price state or value
  const getPriceForSource = (
    fixedPrice?: number | null,
    priceEntity?: string | null
  ): number => {
    if (typeof fixedPrice === 'number') return fixedPrice;
    if (priceEntity && states[priceEntity]) {
      const v = parseFloat(states[priceEntity].state);
      if (!isNaN(v)) return v;
    }
    return 0;
  };
  return getPriceForSource;
}

export function createBucketLabeler(periodType: EnergyPeriodType) {
  // Helper to format bucket label
  const formatBucketLabel = (timeMs: number): string => {
    const d = new Date(timeMs);
    if (periodType === 'month') {
      return d.toLocaleDateString(undefined, { month: 'short' });
    }
    if (periodType === 'day') {
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    }
    // hour
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  return formatBucketLabel;
}
