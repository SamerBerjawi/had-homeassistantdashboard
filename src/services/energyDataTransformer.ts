/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EnergyPreferences,
  ExtractedEnergyStatisticIds,
  extractEnergyStatisticIds
} from './haEnergyPreferences';
import {
  HAStatisticsResponse,
  StatisticsMetaData,
  SolarForecastResponse
} from './haEnergyStatistics';

// ---------------------------------------------------------------------------
// Transformed Data Structures
// Reference: Home Assistant frontend data model (src/data/energy.ts)
// ---------------------------------------------------------------------------

export interface TransformedEnergyBucket {
  startMs: number;
  endMs: number;
  label: string;
  isoDate: string;

  // Base measurements (kWh or native units)
  solar: number;
  gridImport: number;
  gridExport: number;
  batteryCharge: number;
  batteryDischarge: number;

  // Derived flows (Home Assistant flow logic)
  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
  homeConsumption: number;

  // Gas & Water
  gasUsage: number;
  waterUsage: number;

  // Tracked devices by statId
  deviceValues: Record<string, number>;

  // Solar Forecast (kWh)
  solarForecast: number | null;
}

export interface TransformedDevice {
  statId: string;
  name: string;
  kwh: number;
  percentage: number;
  icon?: string;
  color?: string;
}

export interface TransformedEnergyTotals {
  solar: number;
  gridImport: number;
  gridExport: number;
  batteryCharge: number;
  batteryDischarge: number;

  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
  homeConsumption: number;

  selfSufficiencyPercentage: number; // Autarky %
  selfConsumptionPercentage: number; // Solar used locally %

  gasUsage: number;
  gasUnit: string;
  waterUsage: number;
  waterUnit: string;

  solarForecastTotal: number | null;
}

export interface FinancialSourceBreakdown {
  name: string;
  type: 'grid_import' | 'grid_export' | 'solar' | 'battery' | 'gas' | 'water';
  energyVal: number;
  unit: string;
  costOrCompensation: number | null;
  rateDescription?: string;
}

export interface TransformedFinancials {
  gridImportCost: number;
  gridExportCompensation: number;
  gasCost: number;
  waterCost: number;
  standingCharge: number;
  netCost: number;
  currency: string;
  sources: FinancialSourceBreakdown[];
}

export interface TransformedEnergyModel {
  totals: TransformedEnergyTotals;
  financials: TransformedFinancials;
  buckets: TransformedEnergyBucket[];
  powerBuckets?: TransformedEnergyBucket[];
  devices: TransformedDevice[];
  untrackedKwh: number;
  untrackedPercentage: number;

  // Configuration flags
  hasSolar: boolean;
  hasGrid: boolean;
  hasBattery: boolean;
  hasGas: boolean;
  hasWater: boolean;
  hasDevices: boolean;
}

// ---------------------------------------------------------------------------
// Unit Conversion Helpers
// ---------------------------------------------------------------------------

function getEnergyToKWhMultiplier(unit?: string | null): number {
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

// ---------------------------------------------------------------------------
// Core Data Transformation Function
// ---------------------------------------------------------------------------

export function transformEnergyStatistics(
  prefs: EnergyPreferences | null | undefined,
  stats: HAStatisticsResponse,
  metadata: Record<string, StatisticsMetaData> = {},
  forecastData: SolarForecastResponse | null = null,
  options: {
    currencySymbol?: string;
    periodType?: '5minute' | 'hour' | 'day' | 'month';
    daysInPeriod?: number;
    states?: Record<string, any>;
    startTimeMs?: number;
    endTimeMs?: number;
  } = {}
): TransformedEnergyModel {
  const {
    currencySymbol = '€',
    periodType = 'hour',
    daysInPeriod = 1,
    states = {},
    startTimeMs,
    endTimeMs
  } = options;

  const extracted = extractEnergyStatisticIds(prefs, states);

  const hasSolar = extracted.solarSources.length > 0;
  const hasGrid = extracted.gridImport.length > 0 || extracted.gridExport.length > 0;
  const hasBattery = extracted.batteryCharging.length > 0 || extracted.batteryDischarging.length > 0;
  const hasGas = extracted.gasSources.length > 0;
  const hasWater = extracted.waterSources.length > 0;
  const hasDevices = extracted.deviceConsumption.length > 0;

  // Determine Primary Gas & Water Units
  const gasUnit = extracted.gasSources[0]?.unitOfMeasurement ||
    metadata[extracted.gasSources[0]?.statId]?.unit_of_measurement || 'm³';
  const waterUnit = extracted.waterSources[0]?.unitOfMeasurement ||
    metadata[extracted.waterSources[0]?.statId]?.unit_of_measurement || 'L';

  // 1. Gather all timestamps across all requested statistics
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
          if (typeof startTimeMs === 'number' && start < startTimeMs) continue;
          if (typeof endTimeMs === 'number' && start > endTimeMs) continue;
          rawTimestamps.push(start);
        }
      }
    }
  }

  // Also include forecast timestamps if available and strictly within the requested period
  const forecastWhHours: Record<string, number> = {};
  if (forecastData) {
    if ('wh_hours' in forecastData && typeof forecastData.wh_hours === 'object') {
      Object.assign(forecastWhHours, forecastData.wh_hours);
    } else if (typeof forecastData === 'object') {
      // Forecast dictionary keyed by config_entry_id
      for (const fc of Object.values(forecastData)) {
        if (fc && typeof fc === 'object' && 'wh_hours' in fc && fc.wh_hours) {
          for (const [k, v] of Object.entries(fc.wh_hours)) {
            forecastWhHours[k] = (forecastWhHours[k] || 0) + (Number(v) || 0);
          }
        }
      }
    }

    // Include forecast timestamps ONLY if within the requested period window
    // (Prevents upcoming 48-hour forecasts from leaking into past periods)
    for (const fKey of Object.keys(forecastWhHours)) {
      const fTime = new Date(fKey).getTime();
      if (!isNaN(fTime)) {
        if (typeof startTimeMs === 'number' && fTime < startTimeMs) continue;
        if (typeof endTimeMs === 'number' && fTime > endTimeMs) continue;
        rawTimestamps.push(fTime);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Uniform Fixed Canonical Slot Grid Construction
  // ---------------------------------------------------------------------------
  const sortedTimestamps: number[] = [];

  if (rawTimestamps.length > 0 || (typeof startTimeMs === 'number' && typeof endTimeMs === 'number')) {
    const minTime = rawTimestamps.length > 0 ? Math.min(...rawTimestamps) : (startTimeMs || 0);
    const maxTime = rawTimestamps.length > 0 ? Math.max(...rawTimestamps) : (endTimeMs || 0);

    if (periodType === '5minute') {
      const STEP_MS = 5 * 60 * 1000;
      const baseDate = new Date(minTime);
      const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0).getTime();

      // Align start to midnight of the day if within 24h, else to nearest 5-min epoch
      const isSingleDay = daysInPeriod === 1 && (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000);
      const startSlot = isSingleDay
        ? dayStart
        : Math.floor(minTime / STEP_MS) * STEP_MS;

      // In a 1-day period, 5-minute slots strictly cover the 24 hours of that day:
      // from 00:00 (slot 0) to 23:55 (slot 287). Prevents next-day midnight slot from leaking in.
      const maxAllowedSlot = isSingleDay
        ? dayStart + 24 * 3600 * 1000 - STEP_MS
        : Math.floor(maxTime / STEP_MS) * STEP_MS;

      const endSlot = Math.min(Math.floor(maxTime / STEP_MS) * STEP_MS, maxAllowedSlot);

      for (let t = startSlot; t <= endSlot; t += STEP_MS) {
        sortedTimestamps.push(t);
      }
    } else if (periodType === 'hour') {
      const STEP_MS = 60 * 60 * 1000;
      const baseDate = new Date(minTime);
      const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = dayStart + 23 * STEP_MS;

      const startSlot = (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000)
        ? dayStart
        : Math.floor(minTime / STEP_MS) * STEP_MS;

      const endSlot = (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000)
        ? Math.max(dayEnd, Math.floor(maxTime / STEP_MS) * STEP_MS)
        : Math.floor(maxTime / STEP_MS) * STEP_MS;

      for (let t = startSlot; t <= endSlot; t += STEP_MS) {
        sortedTimestamps.push(t);
      }
    } else if (periodType === 'day') {
      if (typeof startTimeMs === 'number' && typeof endTimeMs === 'number' && startTimeMs < endTimeMs) {
        // Build all consecutive days between start and end of the period
        const s = new Date(startTimeMs);
        s.setHours(0, 0, 0, 0);
        const e = new Date(endTimeMs);
        e.setHours(0, 0, 0, 0);
        const cur = new Date(s);
        while (cur.getTime() <= e.getTime()) {
          sortedTimestamps.push(cur.getTime());
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        const dayMap = new Map<string, number>();
        for (const ts of rawTimestamps) {
          const d = new Date(ts);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          if (!dayMap.has(key)) {
            const dayMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
            dayMap.set(key, dayMidnight);
          }
        }
        sortedTimestamps.push(...Array.from(dayMap.values()).sort((a, b) => a - b));
      }
    } else if (periodType === 'month') {
      if (typeof startTimeMs === 'number' && typeof endTimeMs === 'number' && startTimeMs < endTimeMs) {
        const s = new Date(startTimeMs);
        const e = new Date(endTimeMs);
        const cur = new Date(s.getFullYear(), s.getMonth(), 1, 0, 0, 0, 0);
        const endMonth = new Date(e.getFullYear(), e.getMonth(), 1, 0, 0, 0, 0);
        while (cur.getTime() <= endMonth.getTime()) {
          sortedTimestamps.push(cur.getTime());
          cur.setMonth(cur.getMonth() + 1);
        }
      } else {
        const monthMap = new Map<string, number>();
        for (const ts of rawTimestamps) {
          const d = new Date(ts);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
          if (!monthMap.has(key)) {
            const monthFirst = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
            monthMap.set(key, monthFirst);
          }
        }
        sortedTimestamps.push(...Array.from(monthMap.values()).sort((a, b) => a - b));
      }
    }

    // Safety filter: ensure no slot exceeds endTimeMs + 1 hour or precedes startTimeMs - 1 hour
    if (typeof startTimeMs === 'number' || typeof endTimeMs === 'number') {
      const bounded = sortedTimestamps.filter((t) => {
        if (typeof startTimeMs === 'number' && t < startTimeMs - 3600000) return false;
        if (typeof endTimeMs === 'number' && t > endTimeMs + 3600000) return false;
        return true;
      });
      sortedTimestamps.length = 0;
      sortedTimestamps.push(...bounded);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Pre-bin & Gap-Interpolate Each Entity's Statistics
  // ---------------------------------------------------------------------------
  // Eliminates:
  // - Asynchronous timestamp drift between devices (e.g. Solar at :00, Battery at :02)
  // - The erratic 0 kW drop / 2x spike sawtooth artifact
  // - Late-night 3.5-4 kW spikes caused by intermittent updates or UTC midnight counter resets
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

  // 2. Build Buckets
  const buckets: TransformedEnergyBucket[] = [];
  let forecastSolarTotal: number | null = null;
  if (Object.keys(forecastWhHours).length > 0) {
    forecastSolarTotal = 0;
  }

  for (const timeMs of sortedTimestamps) {
    const d = new Date(timeMs);
    const label = formatBucketLabel(timeMs);

    // Sum solar
    let solarKWh = 0;
    let hasDirectSolar = false;
    if (periodType === '5minute' && extracted.powerStatisticIds.solar.length > 0) {
      let sumKW = 0;
      let found = false;
      for (const sId of extracted.powerStatisticIds.solar) {
        const p = getPowerAtTime(sId, timeMs);
        if (p !== null) {
          sumKW += Math.max(0, p);
          found = true;
        }
      }
      if (found) {
        solarKWh = sumKW / 12;
        hasDirectSolar = true;
      }
    }
    if (!hasDirectSolar) {
      for (const src of extracted.solarSources) {
        const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
        solarKWh += getChangeAtTime(src.statId, timeMs) * mult;
      }
    }

    // Sum grid import & export
    let gridImportKWh = 0;
    let gridExportKWh = 0;
    let hasDirectGrid = false;
    if (periodType === '5minute' && extracted.powerStatisticIds.grid.length > 0) {
      let totalImportKW = 0;
      let totalExportKW = 0;
      let found = false;
      for (const gId of extracted.powerStatisticIds.grid) {
        const p = getPowerAtTime(gId, timeMs);
        if (p !== null) {
          found = true;
          if (gId === 'sensor.meter_active_power') {
            // Raw Huawei meter: positive = export, negative = import
            totalExportKW += Math.max(0, p);
            totalImportKW += Math.max(0, -p);
          } else {
            // Home Assistant standard polarity (including sensor.meter_active_power_inverted and stat_rate):
            // Positive = Import from grid, Negative = Export to grid
            totalImportKW += Math.max(0, p);
            totalExportKW += Math.max(0, -p);
          }
        }
      }
      if (found) {
        gridImportKWh = totalImportKW / 12;
        gridExportKWh = totalExportKW / 12;
        hasDirectGrid = true;
      }
    }
    if (!hasDirectGrid) {
      for (const src of extracted.gridImport) {
        const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
        gridImportKWh += getChangeAtTime(src.statId, timeMs) * mult;
      }
      for (const src of extracted.gridExport) {
        const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
        gridExportKWh += getChangeAtTime(src.statId, timeMs) * mult;
      }
    }

    // Sum battery charging (to battery) & discharging (from battery)
    let batteryChargeKWh = 0;
    let batteryDischargeKWh = 0;
    let hasDirectBattery = false;
    if (periodType === '5minute' && extracted.powerStatisticIds.battery.length > 0) {
      let totalChargeKW = 0;
      let totalDischargeKW = 0;
      let found = false;
      for (const bId of extracted.powerStatisticIds.battery) {
        const p = getPowerAtTime(bId, timeMs);
        if (p !== null) {
          found = true;
          if (bId === 'sensor.battery_charge_discharge_power') {
            // Raw Huawei battery: positive = charge, negative = discharge
            totalChargeKW += Math.max(0, p);
            totalDischargeKW += Math.max(0, -p);
          } else {
            // Home Assistant standard polarity (including sensor.battery_charge_discharge_power_inverted and stat_rate):
            // Positive = Discharge to home, Negative = Charge from solar
            totalDischargeKW += Math.max(0, p);
            totalChargeKW += Math.max(0, -p);
          }
        }
      }
      if (found) {
        batteryChargeKWh = totalChargeKW / 12;
        batteryDischargeKWh = totalDischargeKW / 12;
        hasDirectBattery = true;
      }
    }
    if (!hasDirectBattery) {
      for (const src of extracted.batteryCharging) {
        const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
        batteryChargeKWh += getChangeAtTime(src.statId, timeMs) * mult;
      }
      for (const src of extracted.batteryDischarging) {
        const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
        batteryDischargeKWh += getChangeAtTime(src.statId, timeMs) * mult;
      }
    }

    // Gas & Water
    let gasVal = 0;
    for (const src of extracted.gasSources) {
      gasVal += getChangeAtTime(src.statId, timeMs);
    }

    let waterVal = 0;
    for (const src of extracted.waterSources) {
      waterVal += getChangeAtTime(src.statId, timeMs);
    }

    // Devices
    const deviceValues: Record<string, number> = {};
    for (const dev of extracted.deviceConsumption) {
      const mult = getEnergyToKWhMultiplier(metadata[dev.statId]?.unit_of_measurement);
      deviceValues[dev.statId] = getChangeAtTime(dev.statId, timeMs) * mult;
    }

    // Forecast value matching ISO timestamp
    let solarForecast: number | null = null;
    const isoKey = d.toISOString();
    // Try exact match or nearest hour match
    for (const [fKey, fVal] of Object.entries(forecastWhHours)) {
      const fTime = new Date(fKey).getTime();
      if (Math.abs(fTime - timeMs) < 1800000) {
        solarForecast = (solarForecast || 0) + (fVal / 1000); // Wh to kWh
      }
    }
    if (solarForecast !== null && forecastSolarTotal !== null) {
      forecastSolarTotal += solarForecast;
    }

    // ── Derive HA Energy Flow Formulas for this bucket ──
    // Solar paths
    const solarToGrid = Math.min(solarKWh, gridExportKWh);
    const solarToBattery = Math.min(Math.max(0, solarKWh - solarToGrid), batteryChargeKWh);
    const solarToHome = Math.max(0, solarKWh - solarToGrid - solarToBattery);

    // Battery paths
    const gridToBattery = Math.max(0, batteryChargeKWh - solarToBattery);
    const batteryToGrid = Math.max(0, gridExportKWh - solarToGrid);
    const batteryToHome = Math.max(0, batteryDischargeKWh - batteryToGrid);

    // Grid paths
    const gridToHome = Math.max(0, gridImportKWh - gridToBattery);

    // Total Home Consumption
    let homeConsumption = solarToHome + gridToHome + batteryToHome;
    if (!hasSolar && !hasBattery) {
      homeConsumption = gridImportKWh;
    }

    buckets.push({
      startMs: timeMs,
      endMs: timeMs + (periodType === 'day' ? 86400000 : periodType === '5minute' ? 300000 : 3600000),
      label,
      isoDate: d.toISOString(),
      solar: Number(solarKWh.toFixed(4)),
      gridImport: Number(gridImportKWh.toFixed(4)),
      gridExport: Number(gridExportKWh.toFixed(4)),
      batteryCharge: Number(batteryChargeKWh.toFixed(4)),
      batteryDischarge: Number(batteryDischargeKWh.toFixed(4)),
      solarToHome: Number(solarToHome.toFixed(4)),
      solarToGrid: Number(solarToGrid.toFixed(4)),
      solarToBattery: Number(solarToBattery.toFixed(4)),
      gridToHome: Number(gridToHome.toFixed(4)),
      gridToBattery: Number(gridToBattery.toFixed(4)),
      batteryToHome: Number(batteryToHome.toFixed(4)),
      batteryToGrid: Number(batteryToGrid.toFixed(4)),
      homeConsumption: Number(homeConsumption.toFixed(4)),
      gasUsage: Number(gasVal.toFixed(3)),
      waterUsage: Number(waterVal.toFixed(3)),
      deviceValues,
      solarForecast: solarForecast !== null ? Number(solarForecast.toFixed(3)) : null
    });
  }

  // 3. Compute Totals across all buckets
  let totalSolar = 0;
  let totalGridImport = 0;
  let totalGridExport = 0;
  let totalBatteryCharge = 0;
  let totalBatteryDischarge = 0;
  let totalSolarToHome = 0;
  let totalSolarToGrid = 0;
  let totalSolarToBattery = 0;
  let totalGridToHome = 0;
  let totalGridToBattery = 0;
  let totalBatteryToHome = 0;
  let totalBatteryToGrid = 0;
  let totalHomeConsumption = 0;
  let totalGasUsage = 0;
  let totalWaterUsage = 0;

  for (const b of buckets) {
    totalSolar += b.solar;
    totalGridImport += b.gridImport;
    totalGridExport += b.gridExport;
    totalBatteryCharge += b.batteryCharge;
    totalBatteryDischarge += b.batteryDischarge;
    totalSolarToHome += b.solarToHome;
    totalSolarToGrid += b.solarToGrid;
    totalSolarToBattery += b.solarToBattery;
    totalGridToHome += b.gridToHome;
    totalGridToBattery += b.gridToBattery;
    totalBatteryToHome += b.batteryToHome;
    totalBatteryToGrid += b.batteryToGrid;
    totalHomeConsumption += b.homeConsumption;
    totalGasUsage += b.gasUsage;
    totalWaterUsage += b.waterUsage;
  }

  // Calculate Self-Sufficiency % (Autarky) and Self-Consumption %
  let selfSufficiencyPercentage = 0;
  if (totalHomeConsumption > 0) {
    selfSufficiencyPercentage = Math.min(100, Math.max(0,
      ((totalSolarToHome + totalBatteryToHome) / totalHomeConsumption) * 100
    ));
  }

  let selfConsumptionPercentage = 0;
  if (totalSolar > 0) {
    selfConsumptionPercentage = Math.min(100, Math.max(0,
      ((totalSolar - totalSolarToGrid) / totalSolar) * 100
    ));
  }

  // 4. Compute Device Breakdowns
  const deviceSums: Record<string, number> = {};
  for (const dev of extracted.deviceConsumption) {
    deviceSums[dev.statId] = 0;
  }
  for (const b of buckets) {
    for (const [id, val] of Object.entries(b.deviceValues)) {
      deviceSums[id] = (deviceSums[id] || 0) + val;
    }
  }

  const devicePalette = [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185',
    '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#22d3ee'
  ];

  const devices: TransformedDevice[] = extracted.deviceConsumption.map((dev, idx) => {
    const kwh = deviceSums[dev.statId] || 0;
    const percentage = totalHomeConsumption > 0
      ? Math.min(100, Math.max(0, (kwh / totalHomeConsumption) * 100))
      : 0;

    const friendlyName = dev.name ||
      states[dev.statId]?.attributes?.friendly_name ||
      metadata[dev.statId]?.name ||
      dev.statId.replace('sensor.', '').replace(/_/g, ' ');

    return {
      statId: dev.statId,
      name: friendlyName,
      kwh: Number(kwh.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
      color: devicePalette[idx % devicePalette.length]
    };
  }).sort((a, b) => b.kwh - a.kwh);

  const trackedDevicesTotalKWh = devices.reduce((sum, d) => sum + d.kwh, 0);
  const untrackedKwh = Math.max(0, totalHomeConsumption - trackedDevicesTotalKWh);
  const untrackedPercentage = totalHomeConsumption > 0
    ? Math.max(0, Number(((untrackedKwh / totalHomeConsumption) * 100).toFixed(1)))
    : 0;

  // 5. Compute Financials & Sources Table
  const financialSources: FinancialSourceBreakdown[] = [];
  let gridImportCost = 0;
  let gridExportCompensation = 0;
  let gasCost = 0;
  let waterCost = 0;

  // Grid Import Cost
  for (const src of extracted.gridImport) {
    const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
    let srcKWh = 0;
    for (const b of buckets) {
      srcKWh += getChangeAtTime(src.statId, b.startMs) * mult;
    }

    let srcCost: number | null = null;
    let rateDesc: string | undefined;

    if (src.statCost) {
      // Sum the growth of the cost statistic
      let statCostSum = 0;
      for (const b of buckets) {
        statCostSum += getChangeAtTime(src.statCost, b.startMs);
      }
      srcCost = statCostSum;
      rateDesc = 'Tracked cost sensor';
    } else if (src.fixedPrice !== null && src.fixedPrice !== undefined) {
      srcCost = srcKWh * src.fixedPrice;
      rateDesc = `${src.fixedPrice.toFixed(2)} ${currencySymbol}/kWh`;
    } else if (src.priceEntity) {
      const p = getPriceForSource(undefined, src.priceEntity);
      srcCost = srcKWh * p;
      rateDesc = `${p.toFixed(2)} ${currencySymbol}/kWh`;
    }

    if (srcCost !== null) {
      gridImportCost += srcCost;
    }

    financialSources.push({
      name: states[src.statId]?.attributes?.friendly_name || 'Grid Import',
      type: 'grid_import',
      energyVal: Number(srcKWh.toFixed(2)),
      unit: 'kWh',
      costOrCompensation: srcCost !== null ? Number(srcCost.toFixed(2)) : null,
      rateDescription: rateDesc
    });
  }

  // Grid Export Compensation
  for (const src of extracted.gridExport) {
    const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
    let srcKWh = 0;
    for (const b of buckets) {
      srcKWh += getChangeAtTime(src.statId, b.startMs) * mult;
    }

    let srcComp: number | null = null;
    let rateDesc: string | undefined;

    if (src.statCompensation) {
      let statCompSum = 0;
      for (const b of buckets) {
        statCompSum += getChangeAtTime(src.statCompensation, b.startMs);
      }
      srcComp = statCompSum;
      rateDesc = 'Tracked compensation sensor';
    } else if (src.fixedPrice !== null && src.fixedPrice !== undefined) {
      srcComp = srcKWh * src.fixedPrice;
      rateDesc = `${src.fixedPrice.toFixed(2)} ${currencySymbol}/kWh`;
    } else if (src.priceEntity) {
      const p = getPriceForSource(undefined, src.priceEntity);
      srcComp = srcKWh * p;
      rateDesc = `${p.toFixed(2)} ${currencySymbol}/kWh`;
    }

    if (srcComp !== null) {
      gridExportCompensation += srcComp;
    }

    financialSources.push({
      name: states[src.statId]?.attributes?.friendly_name || 'Grid Export',
      type: 'grid_export',
      energyVal: Number(srcKWh.toFixed(2)),
      unit: 'kWh',
      costOrCompensation: srcComp !== null ? Number(srcComp.toFixed(2)) : null,
      rateDescription: rateDesc
    });
  }

  // Gas Cost
  for (const src of extracted.gasSources) {
    let srcVal = 0;
    for (const b of buckets) {
      srcVal += getChangeAtTime(src.statId, b.startMs);
    }
    let srcCost: number | null = null;
    if (src.statCost) {
      let sum = 0;
      for (const b of buckets) sum += getChangeAtTime(src.statCost, b.startMs);
      srcCost = sum;
    } else if (src.fixedPrice) {
      srcCost = srcVal * src.fixedPrice;
    }
    if (srcCost !== null) gasCost += srcCost;

    financialSources.push({
      name: src.name || states[src.statId]?.attributes?.friendly_name || 'Gas Consumption',
      type: 'gas',
      energyVal: Number(srcVal.toFixed(2)),
      unit: gasUnit,
      costOrCompensation: srcCost !== null ? Number(srcCost.toFixed(2)) : null
    });
  }

  // Water Cost
  for (const src of extracted.waterSources) {
    let srcVal = 0;
    for (const b of buckets) {
      srcVal += getChangeAtTime(src.statId, b.startMs);
    }
    let srcCost: number | null = null;
    if (src.statCost) {
      let sum = 0;
      for (const b of buckets) sum += getChangeAtTime(src.statCost, b.startMs);
      srcCost = sum;
    } else if (src.fixedPrice) {
      srcCost = srcVal * src.fixedPrice;
    }
    if (srcCost !== null) waterCost += srcCost;

    financialSources.push({
      name: src.name || states[src.statId]?.attributes?.friendly_name || 'Water Consumption',
      type: 'water',
      energyVal: Number(srcVal.toFixed(2)),
      unit: waterUnit,
      costOrCompensation: srcCost !== null ? Number(srcCost.toFixed(2)) : null
    });
  }

  const standingCharge = Number((extracted.costAdjustmentDay * daysInPeriod).toFixed(2));
  const netCost = Number((gridImportCost + gasCost + waterCost + standingCharge - gridExportCompensation).toFixed(2));

  return {
    totals: {
      solar: Number(totalSolar.toFixed(2)),
      gridImport: Number(totalGridImport.toFixed(2)),
      gridExport: Number(totalGridExport.toFixed(2)),
      batteryCharge: Number(totalBatteryCharge.toFixed(2)),
      batteryDischarge: Number(totalBatteryDischarge.toFixed(2)),
      solarToHome: Number(totalSolarToHome.toFixed(2)),
      solarToGrid: Number(totalSolarToGrid.toFixed(2)),
      solarToBattery: Number(totalSolarToBattery.toFixed(2)),
      gridToHome: Number(totalGridToHome.toFixed(2)),
      gridToBattery: Number(totalGridToBattery.toFixed(2)),
      batteryToHome: Number(totalBatteryToHome.toFixed(2)),
      batteryToGrid: Number(totalBatteryToGrid.toFixed(2)),
      homeConsumption: Number(totalHomeConsumption.toFixed(2)),
      selfSufficiencyPercentage: Number(selfSufficiencyPercentage.toFixed(1)),
      selfConsumptionPercentage: Number(selfConsumptionPercentage.toFixed(1)),
      gasUsage: Number(totalGasUsage.toFixed(2)),
      gasUnit,
      waterUsage: Number(totalWaterUsage.toFixed(2)),
      waterUnit,
      solarForecastTotal: forecastSolarTotal !== null ? Number(forecastSolarTotal.toFixed(2)) : null
    },
    financials: {
      gridImportCost: Number(gridImportCost.toFixed(2)),
      gridExportCompensation: Number(gridExportCompensation.toFixed(2)),
      gasCost: Number(gasCost.toFixed(2)),
      waterCost: Number(waterCost.toFixed(2)),
      standingCharge,
      netCost,
      currency: currencySymbol,
      sources: financialSources
    },
    buckets,
    devices,
    untrackedKwh: Number(untrackedKwh.toFixed(2)),
    untrackedPercentage,
    hasSolar,
    hasGrid,
    hasBattery,
    hasGas,
    hasWater,
    hasDevices
  };
}

// ---------------------------------------------------------------------------
// 5-Minute Power Statistics Transformer (Matches Home Assistant Power Graph)
// ---------------------------------------------------------------------------

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
