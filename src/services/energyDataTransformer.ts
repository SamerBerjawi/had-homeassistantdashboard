/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EnergyPreferences,
  HAStatisticsResponse,
  HAStatisticEntry,
  EnergySourceGrid,
  EnergySourceSolar,
  EnergySourceBattery,
  DeviceConsumptionConfig
} from './haEnergyService';

// -------------------------------------------------------------
// Normalized Chart & Dashboard Output Types
// -------------------------------------------------------------

export interface HourlyEnergyBucket {
  timestamp: string;        // e.g. "12:00 PM" or "Aug 27, 14:00"
  isoTime: string;          // ISO String representation
  solar: number;            // kWh generated this hour (>= 0)
  gridImport: number;       // kWh imported from grid (>= 0)
  gridExport: number;       // kWh exported to grid (<= 0 negative for stacked area)
  batteryDischarge: number; // kWh discharged (>= 0)
  batteryCharge: number;    // kWh charged (<= 0 negative for stacked area)
  consumption: number;      // Total home load this hour (>= 0)
}

export interface TransformedEnergyTotals {
  solarProductionKWh: number;
  solarConsumedKWh: number;
  solarFedToGridKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  totalConsumptionKWh: number;
  batteryChargedKWh: number;
  batteryDischargedKWh: number;
  solarToHomePercentage: number;
  gridToHomePercentage: number;
  autarkyRate: number;         // % (Self-sufficiency)
  selfConsumptionRate: number; // %
}

export interface TransformedFinancials {
  importCost: number;
  exportEarnings: number;
  netCost: number;
  currency: string;
  importTariffPerKWh: number;
  exportTariffPerKWh: number;
}

export interface TransformedEnvironmental {
  co2AvoidedKg: number;
  coalSavedKg: number;
  treesPlantedEquivalent: number;
  gasOffsetM3: number;
}

export interface TransformedDeviceConsumer {
  id: string;
  name: string;
  entityId: string;
  icon: string;
  color: string;
  category: 'ev' | 'hvac' | 'kitchen' | 'living' | 'base' | 'other';
  currentPowerW: number;
  energyKWh: number;
  percentage: number;
}

export interface TransformedEnergyPayload {
  totals: TransformedEnergyTotals;
  financials: TransformedFinancials;
  environmental: TransformedEnvironmental;
  deviceConsumers: TransformedDeviceConsumer[];
  otherConsumption: {
    kwh: number;
    percentage: number;
  };
  hourlyBuckets: HourlyEnergyBucket[];
}

export interface TransformEnergyOptions {
  currencySymbol?: string;
  defaultImportTariff?: number;
  defaultExportTariff?: number;
}

// -------------------------------------------------------------
// Helper: Extract change value from statistic entries
// -------------------------------------------------------------

function extractChange(entry: HAStatisticEntry, prevEntry?: HAStatisticEntry): number {
  if (entry.change !== null && entry.change !== undefined && !isNaN(entry.change)) {
    return Math.max(0, entry.change);
  }
  if (entry.sum !== null && entry.sum !== undefined && prevEntry && prevEntry.sum !== null && prevEntry.sum !== undefined) {
    return Math.max(0, entry.sum - prevEntry.sum);
  }
  if (entry.state !== null && entry.state !== undefined && !isNaN(entry.state)) {
    return Math.max(0, entry.state);
  }
  return 0;
}

// -------------------------------------------------------------
// Helper: Format Time Label
// -------------------------------------------------------------

function formatBucketTime(start: number | string): { label: string; iso: string } {
  let date: Date;
  if (typeof start === 'number') {
    date = new Date(start);
  } else {
    date = new Date(start);
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const label = `${hour12}:00 ${ampm}`;

  return {
    label,
    iso: date.toISOString()
  };
}

// -------------------------------------------------------------
// Device Categories, Icons & Colors
// -------------------------------------------------------------

const DEVICE_COLOR_PALETTE = [
  '#06B6D4', // Cyan (EV)
  '#3B82F6', // Blue (HVAC)
  '#F59E0B', // Amber (Kitchen)
  '#8B5CF6', // Purple (Living)
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#6366F1'  // Indigo
];

function assignDeviceStyle(name: string, statId: string, index: number): {
  icon: string;
  color: string;
  category: 'ev' | 'hvac' | 'kitchen' | 'living' | 'base' | 'other';
} {
  const lower = `${name} ${statId}`.toLowerCase();

  if (lower.includes('tesla') || lower.includes('ev') || lower.includes('car') || lower.includes('charger') || lower.includes('wall_connector')) {
    return { icon: 'Car', color: '#06B6D4', category: 'ev' };
  }
  if (lower.includes('heat') || lower.includes('pump') || lower.includes('hvac') || lower.includes('climate') || lower.includes('ac') || lower.includes('air')) {
    return { icon: 'Fan', color: '#3B82F6', category: 'hvac' };
  }
  if (lower.includes('kitchen') || lower.includes('fridge') || lower.includes('oven') || lower.includes('induction') || lower.includes('dishwasher')) {
    return { icon: 'CookingPot', color: '#F59E0B', category: 'kitchen' };
  }
  if (lower.includes('living') || lower.includes('tv') || lower.includes('media') || lower.includes('audio') || lower.includes('studio')) {
    return { icon: 'Television', color: '#8B5CF6', category: 'living' };
  }
  if (lower.includes('server') || lower.includes('homelab') || lower.includes('nas') || lower.includes('network') || lower.includes('pc')) {
    return { icon: 'HardDrives', color: '#6366F1', category: 'base' };
  }

  const color = DEVICE_COLOR_PALETTE[index % DEVICE_COLOR_PALETTE.length];
  return { icon: 'Plug', color, category: 'other' };
}

// -------------------------------------------------------------
// Core Energy Calculation Engine
// -------------------------------------------------------------

export function transformEnergyData(
  prefs: EnergyPreferences,
  statistics: HAStatisticsResponse,
  options: TransformEnergyOptions = {}
): TransformedEnergyPayload {
  const currencySymbol = options.currencySymbol || '€';
  const defaultImportTariff = options.defaultImportTariff ?? 0.28;
  const defaultExportTariff = options.defaultExportTariff ?? 0.09;

  // 1. Classify source entities from EnergyPreferences
  const solarStatIds: string[] = [];
  const gridImportConfigs: Array<{ statId: string; statCost?: string; priceEntity?: string; fixedPrice?: number }> = [];
  const gridExportConfigs: Array<{ statId: string; statCompensation?: string; priceEntity?: string; fixedPrice?: number }> = [];
  const batteryInStatIds: string[] = [];  // Charging (flow_to)
  const batteryOutStatIds: string[] = []; // Discharging (flow_from)
  const deviceConfigs: DeviceConsumptionConfig[] = Array.isArray(prefs?.device_consumption) ? prefs.device_consumption : [];

  if (prefs && Array.isArray(prefs.energy_sources)) {
    for (const source of prefs.energy_sources) {
      if (source.type === 'solar') {
        const s = source as EnergySourceSolar;
        if (s.stat_energy_from) solarStatIds.push(s.stat_energy_from);
      } else if (source.type === 'grid') {
        const g = source as EnergySourceGrid;
        if (Array.isArray(g.flow_from)) {
          for (const ff of g.flow_from) {
            if (ff.stat_energy_from) {
              gridImportConfigs.push({
                statId: ff.stat_energy_from,
                statCost: ff.stat_cost,
                priceEntity: ff.entity_energy_price,
                fixedPrice: ff.number_energy_price
              });
            }
          }
        }
        if (Array.isArray(g.flow_to)) {
          for (const ft of g.flow_to) {
            if (ft.stat_energy_to) {
              gridExportConfigs.push({
                statId: ft.stat_energy_to,
                statCompensation: ft.stat_compensation,
                priceEntity: ft.entity_energy_price,
                fixedPrice: ft.number_energy_price
              });
            }
          }
        }
      } else if (source.type === 'battery') {
        const b = source as EnergySourceBattery;
        if (b.stat_energy_to) batteryInStatIds.push(b.stat_energy_to);
        if (b.stat_energy_from) batteryOutStatIds.push(b.stat_energy_from);
      }
    }
  }

  // 2. Determine all distinct timestamps across returned statistics
  const timeBucketsMap = new Map<string, { start: number | string; entries: Record<string, number> }>();

  // Collect all unique bucket start keys
  for (const [statId, entries] of Object.entries(statistics || {})) {
    if (!Array.isArray(entries)) continue;
    let prevEntry: HAStatisticEntry | undefined = undefined;

    for (const entry of entries) {
      if (!entry || entry.start === undefined) continue;
      const key = String(entry.start);
      if (!timeBucketsMap.has(key)) {
        timeBucketsMap.set(key, { start: entry.start, entries: {} });
      }
      const changeVal = extractChange(entry, prevEntry);
      timeBucketsMap.get(key)!.entries[statId] = changeVal;
      prevEntry = entry;
    }
  }

  // Sort timestamps chronologically
  const sortedBucketKeys = Array.from(timeBucketsMap.keys()).sort((a, b) => {
    const timeA = new Date(isNaN(Number(a)) ? a : Number(a)).getTime();
    const timeB = new Date(isNaN(Number(b)) ? b : Number(b)).getTime();
    return timeA - timeB;
  });

  // 3. Process hourly buckets and period accumulators
  let totalSolarGenerated = 0;
  let totalGridImported = 0;
  let totalGridExported = 0;
  let totalBatteryCharged = 0;
  let totalBatteryDischarged = 0;
  let totalFinancialImportCost = 0;
  let totalFinancialExportEarnings = 0;

  const hourlyBuckets: HourlyEnergyBucket[] = [];

  for (const key of sortedBucketKeys) {
    const bucket = timeBucketsMap.get(key)!;
    const { label, iso } = formatBucketTime(bucket.start);

    // Solar generated this bucket
    let solarBucket = 0;
    for (const sid of solarStatIds) {
      solarBucket += bucket.entries[sid] || 0;
    }

    // Grid imported this bucket
    let gridImportBucket = 0;
    for (const cfg of gridImportConfigs) {
      const delta = bucket.entries[cfg.statId] || 0;
      gridImportBucket += delta;

      // Price calculation for this flow
      const price = cfg.fixedPrice ?? defaultImportTariff;
      // If stat_cost exists in returned statistics, use its delta, otherwise delta * price
      if (cfg.statCost && bucket.entries[cfg.statCost] !== undefined) {
        totalFinancialImportCost += bucket.entries[cfg.statCost] || 0;
      } else {
        totalFinancialImportCost += delta * price;
      }
    }

    // Grid exported this bucket
    let gridExportBucket = 0;
    for (const cfg of gridExportConfigs) {
      const delta = bucket.entries[cfg.statId] || 0;
      gridExportBucket += delta;

      const price = cfg.fixedPrice ?? defaultExportTariff;
      if (cfg.statCompensation && bucket.entries[cfg.statCompensation] !== undefined) {
        totalFinancialExportEarnings += bucket.entries[cfg.statCompensation] || 0;
      } else {
        totalFinancialExportEarnings += delta * price;
      }
    }

    // Battery charged this bucket
    let batteryChargeBucket = 0;
    for (const sid of batteryInStatIds) {
      batteryChargeBucket += bucket.entries[sid] || 0;
    }

    // Battery discharged this bucket
    let batteryDischargeBucket = 0;
    for (const sid of batteryOutStatIds) {
      batteryDischargeBucket += bucket.entries[sid] || 0;
    }

    // Solar consumed directly in this bucket
    // Formula: Solar Consumed Directly = max(0, E_solar - E_grid_out - E_bat_in)
    const directSolarBucket = Math.max(0, solarBucket - gridExportBucket - batteryChargeBucket);

    // Total home load in this bucket
    // Formula: Total Home = E_grid_in + Solar Consumed Directly + E_bat_out
    const consumptionBucket = gridImportBucket + directSolarBucket + batteryDischargeBucket;

    // Accumulate period totals
    totalSolarGenerated += solarBucket;
    totalGridImported += gridImportBucket;
    totalGridExported += gridExportBucket;
    totalBatteryCharged += batteryChargeBucket;
    totalBatteryDischarged += batteryDischargeBucket;

    hourlyBuckets.push({
      timestamp: label,
      isoTime: iso,
      solar: Number(solarBucket.toFixed(3)),
      gridImport: Number(gridImportBucket.toFixed(3)),
      gridExport: Number((-gridExportBucket).toFixed(3)), // Negative for HA stacked chart conventions
      batteryDischarge: Number(batteryDischargeBucket.toFixed(3)),
      batteryCharge: Number((-batteryChargeBucket).toFixed(3)), // Negative for HA stacked chart conventions
      consumption: Number(consumptionBucket.toFixed(3))
    });
  }

  // 4. Strict Home Assistant Period Metrics
  // Formula 1: Solar Fed to Grid = E_grid_out
  const solarFedToGridKWh = totalGridExported;

  // Formula 2: Solar Consumed Directly = max(0, E_solar - E_grid_out - E_bat_in)
  const solarConsumedDirectlyKWh = Math.max(0, totalSolarGenerated - totalGridExported - totalBatteryCharged);

  // Formula 3: Total Home Consumption (E_home) = E_grid_in + Solar Consumed Directly + E_bat_out
  const totalHomeConsumptionKWh = totalGridImported + solarConsumedDirectlyKWh + totalBatteryDischarged;

  // Formula 4: Percentages
  const solarToHomePercentage = totalHomeConsumptionKWh > 0 
    ? Math.min(100, Math.max(0, (solarConsumedDirectlyKWh / totalHomeConsumptionKWh) * 100))
    : 0;

  const gridToHomePercentage = totalHomeConsumptionKWh > 0
    ? Math.min(100, Math.max(0, (totalGridImported / totalHomeConsumptionKWh) * 100))
    : 0;

  // Formula 5: Autarky (Self-Sufficiency %): (E_home - E_grid_in) / E_home * 100
  const autarkyRate = totalHomeConsumptionKWh > 0
    ? Math.min(100, Math.max(0, ((totalHomeConsumptionKWh - totalGridImported) / totalHomeConsumptionKWh) * 100))
    : 100;

  // Formula 6: Self-Consumption Rate (%): (E_solar - E_grid_out) / E_solar * 100
  const selfConsumptionRate = totalSolarGenerated > 0
    ? Math.min(100, Math.max(0, ((totalSolarGenerated - totalGridExported) / totalSolarGenerated) * 100))
    : 0;

  // 5. Tracked Devices Breakdown
  let totalTrackedDevicesKWh = 0;
  const deviceConsumers: TransformedDeviceConsumer[] = [];

  deviceConfigs.forEach((dev, index) => {
    let devKWh = 0;
    const statEntries = statistics[dev.stat_consumption] || [];
    let prevEntry: HAStatisticEntry | undefined = undefined;

    for (const entry of statEntries) {
      devKWh += extractChange(entry, prevEntry);
      prevEntry = entry;
    }

    devKWh = Math.max(0, devKWh);
    totalTrackedDevicesKWh += devKWh;

    const sharePercentage = totalHomeConsumptionKWh > 0
      ? Math.min(100, Math.max(0, (devKWh / totalHomeConsumptionKWh) * 100))
      : 0;

    const devStyle = assignDeviceStyle(dev.name || dev.stat_consumption, dev.stat_consumption, index);

    deviceConsumers.push({
      id: dev.stat_consumption,
      name: dev.name || dev.stat_consumption.replace(/^sensor\./, '').replace(/_/g, ' '),
      entityId: dev.stat_consumption,
      icon: devStyle.icon,
      color: devStyle.color,
      category: devStyle.category,
      currentPowerW: Math.round(devKWh * 1000 / Math.max(1, hourlyBuckets.length || 24)),
      energyKWh: Number(devKWh.toFixed(2)),
      percentage: Number(sharePercentage.toFixed(1))
    });
  });

  // Sort tracked devices by consumption descending
  deviceConsumers.sort((a, b) => b.energyKWh - a.energyKWh);

  // Unmonitored / Other Load
  const otherKWh = Math.max(0, totalHomeConsumptionKWh - totalTrackedDevicesKWh);
  const otherPercentage = totalHomeConsumptionKWh > 0
    ? Math.min(100, Math.max(0, (otherKWh / totalHomeConsumptionKWh) * 100))
    : 0;

  if (otherKWh > 0.05 || deviceConsumers.length === 0) {
    deviceConsumers.push({
      id: 'other_unmonitored',
      name: 'Other / Unmonitored Load',
      entityId: 'sensor.other_unmonitored',
      icon: 'House',
      color: '#94A3B8',
      category: 'other',
      currentPowerW: Math.round(otherKWh * 1000 / Math.max(1, hourlyBuckets.length || 24)),
      energyKWh: Number(otherKWh.toFixed(2)),
      percentage: Number(otherPercentage.toFixed(1))
    });
  }

  // 6. Environmental Impact Calculations
  // Standard solar offset factors: ~0.42 kg CO2 per kWh solar generated
  const co2AvoidedKg = totalSolarGenerated * 0.42;
  const coalSavedKg = totalSolarGenerated * 0.17;
  const treesPlantedEquivalent = (co2AvoidedKg / 21.77); // ~21.77 kg CO2 absorbed per tree per year
  const gasOffsetM3 = totalSolarGenerated * 0.098;

  // 7. Financial Net Cost
  const netCost = totalFinancialImportCost - totalFinancialExportEarnings;

  const totals: TransformedEnergyTotals = {
    solarProductionKWh: Number(totalSolarGenerated.toFixed(2)),
    solarConsumedKWh: Number(solarConsumedDirectlyKWh.toFixed(2)),
    solarFedToGridKWh: Number(solarFedToGridKWh.toFixed(2)),
    gridImportKWh: Number(totalGridImported.toFixed(2)),
    gridExportKWh: Number(totalGridExported.toFixed(2)),
    totalConsumptionKWh: Number(totalHomeConsumptionKWh.toFixed(2)),
    batteryChargedKWh: Number(totalBatteryCharged.toFixed(2)),
    batteryDischargedKWh: Number(totalBatteryDischarged.toFixed(2)),
    solarToHomePercentage: Number(solarToHomePercentage.toFixed(1)),
    gridToHomePercentage: Number(gridToHomePercentage.toFixed(1)),
    autarkyRate: Number(autarkyRate.toFixed(1)),
    selfConsumptionRate: Number(selfConsumptionRate.toFixed(1))
  };

  const financials: TransformedFinancials = {
    importCost: Number(totalFinancialImportCost.toFixed(2)),
    exportEarnings: Number(totalFinancialExportEarnings.toFixed(2)),
    netCost: Number(netCost.toFixed(2)),
    currency: currencySymbol,
    importTariffPerKWh: defaultImportTariff,
    exportTariffPerKWh: defaultExportTariff
  };

  const environmental: TransformedEnvironmental = {
    co2AvoidedKg: Number(co2AvoidedKg.toFixed(2)),
    coalSavedKg: Number(coalSavedKg.toFixed(2)),
    treesPlantedEquivalent: Number(treesPlantedEquivalent.toFixed(1)),
    gasOffsetM3: Number(gasOffsetM3.toFixed(2))
  };

  return {
    totals,
    financials,
    environmental,
    deviceConsumers,
    otherConsumption: {
      kwh: Number(otherKWh.toFixed(2)),
      percentage: Number(otherPercentage.toFixed(1))
    },
    hourlyBuckets
  };
}
