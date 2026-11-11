/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 5-minute power statistics transformer (matches the Home Assistant power graph).
 */

import { extractEnergyStatisticIds, type EnergyPreferences } from '../haEnergyPreferences';
import type { HAStatisticsResponse, StatisticsMetaData } from '../haEnergyStatistics';
import { getEnergyToKWhMultiplier } from './units';
import type { TransformedEnergyBucket } from './types';

export function transformPowerStatistics(
  prefs: EnergyPreferences,
  stats: HAStatisticsResponse,
  metadata: Record<string, StatisticsMetaData> = {}
): TransformedEnergyBucket[] {
  const extracted = extractEnergyStatisticIds(prefs);
  const rawTimestamps: number[] = [];

  for (const id of extracted.allStatisticIds) {
    const entries = stats[id];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const raw = entry.start;
        const start = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (!isNaN(start)) {
          rawTimestamps.push(start);
        }
      }
    }
  }

  const sortedTimestamps: number[] = [];
  const STEP_MS = 5 * 60 * 1000;

  if (rawTimestamps.length > 0) {
    const minTime = Math.min(...rawTimestamps);
    const maxTime = Math.max(...rawTimestamps);

    const baseDate = new Date(minTime);
    const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0).getTime();

    const startSlot = (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000)
      ? dayStart
      : Math.floor(minTime / STEP_MS) * STEP_MS;

    const endSlot = Math.floor(maxTime / STEP_MS) * STEP_MS;

    for (let t = startSlot; t <= endSlot; t += STEP_MS) {
      sortedTimestamps.push(t);
    }
  }

  if (sortedTimestamps.length === 0) return [];

  const entitySlotChanges = new Map<string, Map<number, number>>();

  for (const [statId, entries] of Object.entries(stats)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;

    const slotMap = new Map<number, number>();
    entitySlotChanges.set(statId, slotMap);

    const sortedEntries = entries
      .map(e => {
        const raw = e.start;
        const t = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        let c = typeof e.change === 'number' ? e.change : 0;
        if (c < 0) c = 0;
        if (c > 5.0) c = 0;
        return { time: t, change: c };
      })
      .filter(e => !isNaN(e.time))
      .sort((a, b) => a.time - b.time);

    const rawSlotTotals = new Map<number, number>();
    for (const e of sortedEntries) {
      const nearestSlot = Math.round(e.time / STEP_MS) * STEP_MS;
      rawSlotTotals.set(nearestSlot, (rawSlotTotals.get(nearestSlot) || 0) + e.change);
    }

    const recordedSlots = Array.from(rawSlotTotals.keys()).sort((a, b) => a - b);
    let lastRecordedSlot: number | null = null;

    for (const slot of recordedSlots) {
      const totalChange = rawSlotTotals.get(slot) || 0;

      if (lastRecordedSlot === null) {
        slotMap.set(slot, totalChange);
        lastRecordedSlot = slot;
        continue;
      }

      const gapSlots = Math.round((slot - lastRecordedSlot) / STEP_MS);

      if (gapSlots <= 1) {
        slotMap.set(slot, totalChange);
      } else if (gapSlots <= 12) {
        const changePerSlot = totalChange / gapSlots;
        for (let s = lastRecordedSlot + STEP_MS; s <= slot; s += STEP_MS) {
          slotMap.set(s, changePerSlot);
        }
      } else {
        slotMap.set(slot, totalChange);
      }

      lastRecordedSlot = slot;
    }
  }

  const getChangeAtTime = (statId: string, timeMs: number): number => {
    const statSlots = entitySlotChanges.get(statId);
    if (!statSlots) return 0;
    return statSlots.get(timeMs) || 0;
  };

  const buckets: TransformedEnergyBucket[] = [];

  for (const timeMs of sortedTimestamps) {
    const d = new Date(timeMs);
    const label = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

    // 5-minute interval kWh change converted to average power in kW (* 12)
    const POWER_MULT = 12;

    let solarKW = 0;
    for (const src of extracted.solarSources) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      solarKW += getChangeAtTime(src.statId, timeMs) * mult * POWER_MULT;
    }

    let gridImportKW = 0;
    for (const src of extracted.gridImport) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      gridImportKW += getChangeAtTime(src.statId, timeMs) * mult * POWER_MULT;
    }

    let gridExportKW = 0;
    for (const src of extracted.gridExport) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      gridExportKW += getChangeAtTime(src.statId, timeMs) * mult * POWER_MULT;
    }

    let batteryChargeKW = 0;
    for (const src of extracted.batteryCharging) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      batteryChargeKW += getChangeAtTime(src.statId, timeMs) * mult * POWER_MULT;
    }

    let batteryDischargeKW = 0;
    for (const src of extracted.batteryDischarging) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      batteryDischargeKW += getChangeAtTime(src.statId, timeMs) * mult * POWER_MULT;
    }

    // Instantaneous Power Flows matching Home Assistant exactly:
    // Consumption = Solar + Net Grid (Import - Export) + Net Battery (Discharge - Charge)
    const netGridKW = gridImportKW - gridExportKW;
    const netBatteryKW = batteryDischargeKW - batteryChargeKW;
    let homeConsumptionKW = Math.max(0, solarKW + netGridKW + netBatteryKW);

    if (extracted.solarSources.length === 0 && extracted.batteryCharging.length === 0) {
      homeConsumptionKW = gridImportKW;
    }

    const solarToGrid = Math.min(solarKW, gridExportKW);
    const solarToBattery = Math.min(Math.max(0, solarKW - solarToGrid), batteryChargeKW);
    const solarToHome = Math.max(0, solarKW - solarToGrid - solarToBattery);
    const gridToBattery = Math.max(0, batteryChargeKW - solarToBattery);
    const gridToHome = Math.max(0, gridImportKW - gridToBattery);
    const batteryToGrid = Math.max(0, gridExportKW - solarToGrid);
    const batteryToHome = Math.max(0, batteryDischargeKW - batteryToGrid);

    buckets.push({
      startMs: timeMs,
      endMs: timeMs + 5 * 60 * 1000,
      label,
      isoDate: d.toISOString(),
      solar: Number(solarKW.toFixed(2)),
      gridImport: Number(gridImportKW.toFixed(2)),
      gridExport: Number(gridExportKW.toFixed(2)),
      batteryCharge: Number(batteryChargeKW.toFixed(2)),
      batteryDischarge: Number(batteryDischargeKW.toFixed(2)),
      solarToHome: Number(solarToHome.toFixed(2)),
      solarToGrid: Number(solarToGrid.toFixed(2)),
      solarToBattery: Number(solarToBattery.toFixed(2)),
      gridToHome: Number(gridToHome.toFixed(2)),
      gridToBattery: Number(gridToBattery.toFixed(2)),
      batteryToHome: Number(batteryToHome.toFixed(2)),
      batteryToGrid: Number(batteryToGrid.toFixed(2)),
      homeConsumption: Number(homeConsumptionKW.toFixed(2)),
      gasUsage: 0,
      waterUsage: 0,
      deviceValues: {},
      solarForecast: null
    });
  }

  return buckets;
}
