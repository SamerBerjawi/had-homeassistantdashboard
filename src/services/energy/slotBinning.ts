/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pre-bins each entity's statistics into canonical slots and gap-interpolates counters.
 */

import type { HAStatisticsResponse, StatisticsMetaData } from '../haEnergyStatistics';
import type { EnergyPeriodType } from './types';

export function binEntityStatistics(p: {
  stats: HAStatisticsResponse;
  states: Record<string, any>;
  metadata: Record<string, StatisticsMetaData>;
  periodType: EnergyPeriodType;
}) {
  const { stats, states, metadata, periodType } = p;
  const entitySlotChanges = new Map<string, Map<number, number>>();
  const entitySlotPowerKW = new Map<string, Map<number, number>>();

  for (const [statId, entries] of Object.entries(stats)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;

    const slotMap = new Map<number, number>();
    entitySlotChanges.set(statId, slotMap);

    const powerSlotMap = new Map<number, number>();
    entitySlotPowerKW.set(statId, powerSlotMap);

    // Determine power unit: check state attribute first, then metadata
    const stateUom = (states[statId]?.attributes?.unit_of_measurement || '').trim().toLowerCase();
    const metaUom = (metadata[statId]?.unit_of_measurement || '').trim().toLowerCase();
    const isPowerEntity =
      states[statId]?.attributes?.device_class === 'power' ||
      statId.includes('power') ||
      statId.includes('mppt') ||
      statId.includes('rate');

    let uom = stateUom;
    if (!uom || (isPowerEntity && (uom === 'kwh' || uom === 'wh'))) {
      uom = metaUom && metaUom !== 'kwh' ? metaUom : isPowerEntity ? 'w' : '';
    }

    // Collect instantaneous power statistics if mean is available (state_class: measurement)
    for (const e of entries) {
      if (typeof e.mean === 'number' && !isNaN(e.mean)) {
        let kw = e.mean;
        if (uom === 'w' || uom === 'watt' || uom === 'watts') {
          kw = e.mean / 1000;
        } else if (uom === 'kw') {
          kw = e.mean;
        } else if (uom === 'mw') {
          kw = e.mean * 1000;
        } else {
          // If unit is unknown or missing, check magnitude or device_class:
          // A magnitude > 25 for residential active power is in Watts (e.g. 75W standby, 2500W solar)
          if (Math.abs(e.mean) > 25 || isPowerEntity) {
            kw = e.mean / 1000;
          }
        }

        const raw = e.start;
        const t = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (!isNaN(t)) {
          const stepMs = periodType === '5minute' ? 5 * 60 * 1000 : 60 * 60 * 1000;
          const nearestSlot = Math.round(t / stepMs) * stepMs;
          powerSlotMap.set(nearestSlot, kw);
        }
      }
    }

    if (periodType === '5minute' || periodType === 'hour') {
      const stepMs = periodType === '5minute' ? 5 * 60 * 1000 : 60 * 60 * 1000;

      // Sort entries chronologically and filter counter reset / glitch anomalies
      const sortedEntries = entries
        .map(e => {
          const raw = e.start;
          const t = typeof raw === 'number'
            ? (raw > 1e11 ? raw : raw * 1000)
            : new Date(raw).getTime();
          let c = typeof e.change === 'number' ? e.change : 0;

          // Guard against negative delta or wrap-around resets
          if (c < 0) c = 0;

          // Guard against implausible 5-minute residential energy surges (> 5.0 kWh in 5 min = > 60 kW)
          // These occur exclusively from sensor initialization or daily counter wraps at 10-11 PM / midnight
          if (periodType === '5minute' && c > 5.0) c = 0;

          return { time: t, change: c };
        })
        .filter(e => !isNaN(e.time))
        .sort((a, b) => a.time - b.time);

      // Map each raw entry to nearest slot boundary
      const rawSlotTotals = new Map<number, number>();
      for (const e of sortedEntries) {
        const nearestSlot = Math.round(e.time / stepMs) * stepMs;
        rawSlotTotals.set(nearestSlot, (rawSlotTotals.get(nearestSlot) || 0) + e.change);
      }

      // Gap detection & proportional spreading across missed intervals
      const recordedSlots = Array.from(rawSlotTotals.keys()).sort((a, b) => a - b);
      let lastRecordedSlot: number | null = null;

      for (const slot of recordedSlots) {
        const totalChange = rawSlotTotals.get(slot) || 0;

        if (lastRecordedSlot === null) {
          slotMap.set(slot, totalChange);
          lastRecordedSlot = slot;
          continue;
        }

        const gapSlots = Math.round((slot - lastRecordedSlot) / stepMs);

        if (gapSlots <= 1) {
          slotMap.set(slot, totalChange);
        } else if (gapSlots <= 12) {
          // If the integration skipped 2 to 12 intervals (up to 1 hour), spread the accumulated
          // energy evenly across the elapsed slots (kW = totalDelta / elapsedHours)
          const changePerSlot = totalChange / gapSlots;
          for (let s = lastRecordedSlot + stepMs; s <= slot; s += stepMs) {
            slotMap.set(s, changePerSlot);
          }
        } else {
          // Large gap (> 1 hour, e.g. overnight solar or device rebooted)
          // Do not backfill into ancient history; assign delta to current slot
          slotMap.set(slot, totalChange);
        }

        lastRecordedSlot = slot;
      }
    } else if (periodType === 'day') {
      for (const e of entries) {
        const raw = e.start;
        const t = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (isNaN(t)) continue;
        const d = new Date(t);
        const dayMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
        const c = typeof e.change === 'number' && e.change > 0 ? e.change : 0;
        slotMap.set(dayMidnight, (slotMap.get(dayMidnight) || 0) + c);
      }
    } else if (periodType === 'month') {
      for (const e of entries) {
        const raw = e.start;
        const t = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (isNaN(t)) continue;
        const d = new Date(t);
        const monthFirst = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
        const c = typeof e.change === 'number' && e.change > 0 ? e.change : 0;
        slotMap.set(monthFirst, (slotMap.get(monthFirst) || 0) + c);
      }
    }
  }
  return { entitySlotChanges, entitySlotPowerKW };
}

export function createSlotLookups(
  entitySlotChanges: Map<string, Map<number, number>>,
  entitySlotPowerKW: Map<string, Map<number, number>>,
  periodType: EnergyPeriodType
) {
  // Fast O(1) change lookup at a given bucket timestamp
  const getChangeAtTime = (statId: string, timeMs: number): number => {
    const statSlots = entitySlotChanges.get(statId);
    if (!statSlots) return 0;
    return statSlots.get(timeMs) || 0;
  };

  // Fast power (kW) lookup at a given bucket timestamp
  const getPowerAtTime = (statId: string, timeMs: number): number | null => {
    const statSlots = entitySlotPowerKW.get(statId);
    if (!statSlots || statSlots.size === 0) return null;
    if (statSlots.has(timeMs)) return statSlots.get(timeMs)!;
    if (periodType === '5minute') {
      if (statSlots.has(timeMs - 300000)) return statSlots.get(timeMs - 300000)!;
      if (statSlots.has(timeMs + 300000)) return statSlots.get(timeMs + 300000)!;
    }
    return null;
  };
  return { getChangeAtTime, getPowerAtTime };
}
