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
  } = {}
): TransformedEnergyModel {
  const {
    currencySymbol = '€',
    periodType = 'hour',
    daysInPeriod = 1,
    states = {}
  } = options;

  const extracted = extractEnergyStatisticIds(prefs);

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
  const timestampsSet = new Set<number>();
  for (const id of extracted.allStatisticIds) {
    const entries = stats[id];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const raw = entry.start;
        const start = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (!isNaN(start)) {
          timestampsSet.add(start);
        }
      }
    }
  }

  // Also include forecast timestamps if available
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
  }

  // Generate 24 continuous hourly slots for day period if not already populated
  if (periodType === 'hour') {
    const firstTs = timestampsSet.size > 0 ? Math.min(...Array.from(timestampsSet)) : Date.now();
    const baseDate = new Date(firstTs);
    baseDate.setMinutes(0, 0, 0);
    for (let h = 0; h < 24; h++) {
      const slot = new Date(baseDate);
      slot.setHours(h, 0, 0, 0);
      timestampsSet.add(slot.getTime());
    }
  }

  const sortedTimestamps = Array.from(timestampsSet).sort((a, b) => a - b);

  // Helper to test if two timestamps belong to the same period slot
  const isSameSlot = (tMs: number, slotMs: number): boolean => {
    const d1 = new Date(tMs);
    const d2 = new Date(slotMs);
    if (periodType === 'month') {
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    }
    if (periodType === 'day') {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }
    // hour: compare local year, month, date, and hour
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate() &&
      d1.getHours() === d2.getHours()
    );
  };

  // Helper to lookup stat change at a given bucket timestamp
  const getChangeAtTime = (statId: string, timeMs: number): number => {
    const entries = stats[statId];
    if (!entries || entries.length === 0) return 0;
    const entry = entries.find(e => {
      const raw = e.start;
      const t = typeof raw === 'number'
        ? (raw > 1e11 ? raw : raw * 1000)
        : new Date(raw).getTime();
      return isSameSlot(t, timeMs);
    });
    if (!entry) return 0;
    if (typeof entry.change === 'number') return Math.max(0, entry.change);
    return 0;
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
    for (const src of extracted.solarSources) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      solarKWh += getChangeAtTime(src.statId, timeMs) * mult;
    }

    // Sum grid import
    let gridImportKWh = 0;
    for (const src of extracted.gridImport) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      gridImportKWh += getChangeAtTime(src.statId, timeMs) * mult;
    }

    // Sum grid export
    let gridExportKWh = 0;
    for (const src of extracted.gridExport) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      gridExportKWh += getChangeAtTime(src.statId, timeMs) * mult;
    }

    // Sum battery charging (to battery)
    let batteryChargeKWh = 0;
    for (const src of extracted.batteryCharging) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      batteryChargeKWh += getChangeAtTime(src.statId, timeMs) * mult;
    }

    // Sum battery discharging (from battery)
    let batteryDischargeKWh = 0;
    for (const src of extracted.batteryDischarging) {
      const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
      batteryDischargeKWh += getChangeAtTime(src.statId, timeMs) * mult;
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
      endMs: timeMs + (periodType === 'day' ? 86400000 : 3600000),
      label,
      isoDate: d.toISOString(),
      solar: Number(solarKWh.toFixed(3)),
      gridImport: Number(gridImportKWh.toFixed(3)),
      gridExport: Number(gridExportKWh.toFixed(3)),
      batteryCharge: Number(batteryChargeKWh.toFixed(3)),
      batteryDischarge: Number(batteryDischargeKWh.toFixed(3)),
      solarToHome: Number(solarToHome.toFixed(3)),
      solarToGrid: Number(solarToGrid.toFixed(3)),
      solarToBattery: Number(solarToBattery.toFixed(3)),
      gridToHome: Number(gridToHome.toFixed(3)),
      gridToBattery: Number(gridToBattery.toFixed(3)),
      batteryToHome: Number(batteryToHome.toFixed(3)),
      batteryToGrid: Number(batteryToGrid.toFixed(3)),
      homeConsumption: Number(homeConsumption.toFixed(3)),
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
  const timestampsSet = new Set<number>();
  const statBucketMap = new Map<string, Map<number, number>>();

  for (const id of extracted.allStatisticIds) {
    const entries = stats[id];
    const bucketMap = new Map<number, number>();
    statBucketMap.set(id, bucketMap);

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const raw = entry.start;
        const start = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (!isNaN(start)) {
          const normalizedMs = Math.round(start / (5 * 60 * 1000)) * (5 * 60 * 1000);
          timestampsSet.add(normalizedMs);
          const chg = typeof entry.change === 'number' ? Math.max(0, entry.change) : 0;
          bucketMap.set(normalizedMs, chg);
        }
      }
    }
  }

  const sortedTimestamps = Array.from(timestampsSet).sort((a, b) => a - b);
  if (sortedTimestamps.length === 0) return [];

  const getChangeAtTime = (statId: string, timeMs: number): number => {
    const map = statBucketMap.get(statId);
    if (!map) return 0;
    return map.get(timeMs) || 0;
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
