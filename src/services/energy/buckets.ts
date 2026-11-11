/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds the per-slot energy buckets (solar, grid, battery, gas, water, devices) and derives the flow paths.
 */

import type { ExtractedEnergyStatisticIds } from '../haEnergyPreferences';
import type { StatisticsMetaData } from '../haEnergyStatistics';
import { getEnergyToKWhMultiplier } from './units';
import type { EnergyPeriodType, TransformedEnergyBucket } from './types';

export function buildBuckets(p: {
  sortedTimestamps: number[];
  extracted: ExtractedEnergyStatisticIds;
  metadata: Record<string, StatisticsMetaData>;
  periodType: EnergyPeriodType;
  forecastWhHours: Record<string, number>;
  hasSolar: boolean;
  hasBattery: boolean;
  formatBucketLabel: (timeMs: number) => string;
  getChangeAtTime: (statId: string, timeMs: number) => number;
  getPowerAtTime: (statId: string, timeMs: number) => number | null;
}): { buckets: TransformedEnergyBucket[]; forecastSolarTotal: number | null } {
  const {
    sortedTimestamps, extracted, metadata, periodType, forecastWhHours, hasSolar, hasBattery,
    formatBucketLabel, getChangeAtTime, getPowerAtTime
  } = p;
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
  return { buckets, forecastSolarTotal };
}
