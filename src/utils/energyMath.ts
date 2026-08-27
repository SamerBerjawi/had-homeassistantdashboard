/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResolvedEnergyEntityIds } from '../services/haEnergyPreferences';
import { HAStatisticsResponse, HAStatisticEntry } from '../services/haEnergyStatistics';

// -------------------------------------------------------------
// Pure Calculation Models & Interfaces
// -------------------------------------------------------------

export interface HourlyEnergyBucket {
  timestamp: string;        // e.g. "12:00 PM"
  isoTime: string;          // ISO 8601 String
  hour: number;             // 0-23
  solar: number;            // kWh generated (>= 0)
  gridImport: number;       // kWh imported (>= 0)
  gridExport: number;       // kWh exported (<= 0 negative for stacked area)
  batteryDischarge: number; // kWh discharged (>= 0)
  batteryCharge: number;    // kWh charged (<= 0 negative for stacked area)
  consumption: number;      // Total home load (>= 0)
}

export interface EnergyTotals {
  solarGeneratedKWh: number;
  gridImportedKWh: number;
  gridExportedKWh: number;
  batteryChargedKWh: number;
  batteryDischargedKWh: number;
  solarDirectConsumedKWh: number;
  solarFedToGridKWh: number;
  totalHomeConsumptionKWh: number;
  solarToHomePercentage: number;
  gridToHomePercentage: number;
  selfConsumptionPercentage: number;
  autarkyPercentage: number;
}

export interface FinancialMetrics {
  importCost: number;
  exportEarnings: number;
  netCost: number;
  currency: string;
  importTariffPerKWh: number;
  exportTariffPerKWh: number;
}

export interface EnvironmentalMetrics {
  co2AvoidedKg: number;
  coalSavedKg: number;
  treesPlantedEquivalent: number;
}

export interface TrackedDeviceMetric {
  id: string;
  name: string;
  statId: string;
  icon: string;
  color: string;
  category: 'ev' | 'hvac' | 'kitchen' | 'living' | 'base' | 'other';
  currentPowerW: number;
  energyKWh: number;
  percentage: number;
}

export interface ComputedEnergyModel {
  totals: EnergyTotals;
  financials: FinancialMetrics;
  environmental: EnvironmentalMetrics;
  devices: TrackedDeviceMetric[];
  otherConsumption: {
    kwh: number;
    percentage: number;
  };
  hourlyTimeseries: HourlyEnergyBucket[];
}

export interface ComputeOptions {
  currencySymbol?: string;
  defaultImportTariff?: number;
  defaultExportTariff?: number;
}

export interface RealtimePowerModel {
  solarPower: number;
  gridPower: number; // positive = export, negative = import
  gridImportKW: number;
  gridExportKW: number;
  batteryPower: number;
  batteryChargeKW: number;
  batteryDischargeKW: number;
  batterySoC: number;
  homeConsumption: number;
  directSolar: number;
  inverterEfficiency: number;
}

// -------------------------------------------------------------
// Real-Time Instantaneous Power Calculation (Inverted Polarity)
// -------------------------------------------------------------

export function computeRealtimePower(states: Record<string, any> = {}): RealtimePowerModel {
  const solarKW = Math.max(0, parseFloat(states['sensor.mppt_total_input_power']?.state || '0') || 0);
  const rawGridKW = parseFloat(states['sensor.meter_active_power_inverted']?.state || '0') || 0;
  const rawBatteryKW = parseFloat(states['sensor.battery_charge_discharge_power_inverted']?.state || '0') || 0;
  const rawBatterySoC = parseFloat(states['sensor.battery_state_of_charge_soc']?.state || '85');

  // Polarity:
  // Grid: > 0 Export, < 0 Import
  const gridExportKW = Math.max(0, rawGridKW);
  const gridImportKW = Math.max(0, -rawGridKW);

  // Battery: > 0 Charge, < 0 Discharge
  const batteryChargeKW = Math.max(0, rawBatteryKW);
  const batteryDischargeKW = Math.max(0, -rawBatteryKW);

  // Home load
  const directSolarKW = Math.max(0, solarKW - gridExportKW - batteryChargeKW);
  const homeConsumptionKW = Math.max(0, solarKW + gridImportKW + batteryDischargeKW - gridExportKW - batteryChargeKW);

  return {
    solarPower: Number(solarKW.toFixed(2)),
    gridPower: Number(rawGridKW.toFixed(2)),
    gridImportKW: Number(gridImportKW.toFixed(2)),
    gridExportKW: Number(gridExportKW.toFixed(2)),
    batteryPower: Number(rawBatteryKW.toFixed(2)),
    batteryChargeKW: Number(batteryChargeKW.toFixed(2)),
    batteryDischargeKW: Number(batteryDischargeKW.toFixed(2)),
    batterySoC: isNaN(rawBatterySoC) ? 85 : Math.round(rawBatterySoC),
    homeConsumption: Number(homeConsumptionKW.toFixed(2)),
    directSolar: Number(directSolarKW.toFixed(2)),
    inverterEfficiency: 97.4
  };
}

// -------------------------------------------------------------
// Helper: Extract change delta value from statistic entry
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
// Helper: Device Category & Styling Palette
// -------------------------------------------------------------

const PALETTE = ['#06B6D4', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#6366F1'];

function categorizeDevice(name: string, statId: string, index: number): {
  icon: string;
  color: string;
  category: 'ev' | 'hvac' | 'kitchen' | 'living' | 'base' | 'other';
} {
  const text = `${name} ${statId}`.toLowerCase();
  if (text.includes('tesla') || text.includes('ev') || text.includes('car') || text.includes('charger') || text.includes('wall_connector')) {
    return { icon: 'Car', color: '#06B6D4', category: 'ev' };
  }
  if (text.includes('heat') || text.includes('pump') || text.includes('hvac') || text.includes('climate') || text.includes('ac') || text.includes('air')) {
    return { icon: 'Fan', color: '#3B82F6', category: 'hvac' };
  }
  if (text.includes('kitchen') || text.includes('fridge') || text.includes('oven') || text.includes('cook') || text.includes('dishwasher')) {
    return { icon: 'CookingPot', color: '#F59E0B', category: 'kitchen' };
  }
  if (text.includes('living') || text.includes('tv') || text.includes('media') || text.includes('audio') || text.includes('studio') || text.includes('shelves')) {
    return { icon: 'Television', color: '#8B5CF6', category: 'living' };
  }
  if (text.includes('server') || text.includes('homelab') || text.includes('nas') || text.includes('pc') || text.includes('rack') || text.includes('table')) {
    return { icon: 'HardDrives', color: '#6366F1', category: 'base' };
  }
  return { icon: 'Plug', color: PALETTE[index % PALETTE.length], category: 'other' };
}

// -------------------------------------------------------------
// Strict Home Assistant Energy Conservation Model Calculation
// -------------------------------------------------------------

export function computeEnergyModel(
  resolved: ResolvedEnergyEntityIds,
  statistics: HAStatisticsResponse,
  options: ComputeOptions = {}
): ComputedEnergyModel {
  const {
    currencySymbol = '€',
    defaultImportTariff = 0.28,
    defaultExportTariff = 0.09
  } = options;

  // 1. Gather all timestamps from available statistic series, aligned to exact 5-min clock grid
  const timestampSet = new Set<number>();
  for (const entries of Object.values(statistics)) {
    if (Array.isArray(entries)) {
      for (const e of entries) {
        const rawMs = typeof e.start === 'number' ? e.start : new Date(e.start).getTime();
        if (!isNaN(rawMs)) {
          const d = new Date(rawMs);
          d.setSeconds(0, 0);
          const mins = d.getMinutes();
          d.setMinutes(Math.floor(mins / 5) * 5);
          timestampSet.add(d.getTime());
        }
      }
    }
  }

  const sortedTimestamps = Array.from(timestampSet).sort((a, b) => a - b);

  // Map entries for quick lookup: statId -> alignedMs -> entry
  const statLookup: Record<string, Map<number, HAStatisticEntry>> = {};
  for (const [statId, entries] of Object.entries(statistics)) {
    statLookup[statId] = new Map();
    if (Array.isArray(entries)) {
      for (const e of entries) {
        const rawMs = typeof e.start === 'number' ? e.start : new Date(e.start).getTime();
        if (!isNaN(rawMs)) {
          const d = new Date(rawMs);
          d.setSeconds(0, 0);
          const mins = d.getMinutes();
          d.setMinutes(Math.floor(mins / 5) * 5);
          statLookup[statId].set(d.getTime(), e);
        }
      }
    }
  }

  // 2. Aggregate per-interval bucket metrics
  const hourlyTimeseries: HourlyEnergyBucket[] = [];

  let totalSolarGenerated = 0;
  let totalGridImported = 0;
  let totalGridExported = 0;
  let totalBatteryCharged = 0;
  let totalBatteryDischarged = 0;
  let totalImportCost = 0;
  let totalExportEarnings = 0;

  for (let i = 0; i < sortedTimestamps.length; i++) {
    const ts = sortedTimestamps[i];
    const prevTs = i > 0 ? sortedTimestamps[i - 1] : undefined;
    const date = new Date(ts);
    const hour = date.getHours();
    const timeLabel = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // A. Solar Delta
    let bSolar = 0;
    for (const statId of resolved.solarSources) {
      const entry = statLookup[statId]?.get(ts);
      const prevEntry = prevTs ? statLookup[statId]?.get(prevTs) : undefined;
      if (entry) {
        bSolar += extractChange(entry, prevEntry);
      }
    }

    // B. Grid Import Delta & Cost
    let bGridImport = 0;
    for (const item of resolved.gridImport) {
      const entry = statLookup[item.statId]?.get(ts);
      const prevEntry = prevTs ? statLookup[item.statId]?.get(prevTs) : undefined;
      if (entry) {
        const delta = extractChange(entry, prevEntry);
        bGridImport += delta;

        // Cost Calculation
        let unitCost = item.fixedPrice ?? defaultImportTariff;
        if (item.statCost && statLookup[item.statCost]?.get(ts)) {
          const costEntry = statLookup[item.statCost]!.get(ts)!;
          totalImportCost += extractChange(costEntry);
        } else {
          totalImportCost += delta * unitCost;
        }
      }
    }

    // C. Grid Export Delta & Earnings
    let bGridExport = 0;
    for (const item of resolved.gridExport) {
      const entry = statLookup[item.statId]?.get(ts);
      const prevEntry = prevTs ? statLookup[item.statId]?.get(prevTs) : undefined;
      if (entry) {
        const delta = extractChange(entry, prevEntry);
        bGridExport += delta;

        let unitCompensation = item.fixedPrice ?? defaultExportTariff;
        if (item.statCompensation && statLookup[item.statCompensation]?.get(ts)) {
          const compEntry = statLookup[item.statCompensation]!.get(ts)!;
          totalExportEarnings += extractChange(compEntry);
        } else {
          totalExportEarnings += delta * unitCompensation;
        }
      }
    }

    // D. Battery Charging & Discharging Delta
    let bBatteryCharge = 0;
    for (const statId of resolved.batteryCharging) {
      const entry = statLookup[statId]?.get(ts);
      const prevEntry = prevTs ? statLookup[statId]?.get(prevTs) : undefined;
      if (entry) {
        bBatteryCharge += extractChange(entry, prevEntry);
      }
    }

    let bBatteryDischarge = 0;
    for (const statId of resolved.batteryDischarging) {
      const entry = statLookup[statId]?.get(ts);
      const prevEntry = prevTs ? statLookup[statId]?.get(prevTs) : undefined;
      if (entry) {
        bBatteryDischarge += extractChange(entry, prevEntry);
      }
    }

    // Conservation Formula per bucket
    const bSolarDirect = Math.max(0, bSolar - bGridExport - bBatteryCharge);
    const bConsumption = Math.max(0, bGridImport + bSolarDirect + bBatteryDischarge);

    totalSolarGenerated += bSolar;
    totalGridImported += bGridImport;
    totalGridExported += bGridExport;
    totalBatteryCharged += bBatteryCharge;
    totalBatteryDischarged += bBatteryDischarge;

    hourlyTimeseries.push({
      timestamp: timeLabel,
      isoTime: date.toISOString(),
      hour,
      solar: Number(bSolar.toFixed(3)),
      gridImport: Number(bGridImport.toFixed(3)),
      gridExport: Number((-bGridExport).toFixed(3)), // Negative for stacked area chart
      batteryDischarge: Number(bBatteryDischarge.toFixed(3)),
      batteryCharge: Number((-bBatteryCharge).toFixed(3)), // Negative for stacked area chart
      consumption: Number(bConsumption.toFixed(3))
    });
  }

  // 3. Strict Energy Conservation Balance
  const solarDirectConsumedKWh = Math.max(0, totalSolarGenerated - totalGridExported - totalBatteryCharged);
  const totalHomeConsumptionKWh = Math.max(0, totalGridImported + solarDirectConsumedKWh + totalBatteryDischarged);
  const solarFedToGridKWh = totalGridExported;

  const solarToHomePercentage = totalHomeConsumptionKWh > 0
    ? Math.min(100, (solarDirectConsumedKWh / totalHomeConsumptionKWh) * 100)
    : 0;

  const gridToHomePercentage = totalHomeConsumptionKWh > 0
    ? Math.min(100, (totalGridImported / totalHomeConsumptionKWh) * 100)
    : 0;

  const selfConsumptionPercentage = totalSolarGenerated > 0
    ? Math.max(0, Math.min(100, ((totalSolarGenerated - totalGridExported) / totalSolarGenerated) * 100))
    : 0;

  const autarkyPercentage = totalHomeConsumptionKWh > 0
    ? Math.max(0, Math.min(100, ((totalHomeConsumptionKWh - totalGridImported) / totalHomeConsumptionKWh) * 100))
    : 0;

  const totals: EnergyTotals = {
    solarGeneratedKWh: Number(totalSolarGenerated.toFixed(2)),
    gridImportedKWh: Number(totalGridImported.toFixed(2)),
    gridExportedKWh: Number(totalGridExported.toFixed(2)),
    batteryChargedKWh: Number(totalBatteryCharged.toFixed(2)),
    batteryDischargedKWh: Number(totalBatteryDischarged.toFixed(2)),
    solarDirectConsumedKWh: Number(solarDirectConsumedKWh.toFixed(2)),
    solarFedToGridKWh: Number(solarFedToGridKWh.toFixed(2)),
    totalHomeConsumptionKWh: Number(totalHomeConsumptionKWh.toFixed(2)),
    solarToHomePercentage: Number(solarToHomePercentage.toFixed(1)),
    gridToHomePercentage: Number(gridToHomePercentage.toFixed(1)),
    selfConsumptionPercentage: Number(selfConsumptionPercentage.toFixed(1)),
    autarkyPercentage: Number(autarkyPercentage.toFixed(1))
  };

  // 4. Financial Calculations
  const financials: FinancialMetrics = {
    importCost: Number(totalImportCost.toFixed(2)),
    exportEarnings: Number(totalExportEarnings.toFixed(2)),
    netCost: Number((totalImportCost - totalExportEarnings).toFixed(2)),
    currency: currencySymbol,
    importTariffPerKWh: defaultImportTariff,
    exportTariffPerKWh: defaultExportTariff
  };

  // 5. Environmental Savings (Official Standards)
  const co2AvoidedKg = totalSolarGenerated * 0.475;
  const coalSavedKg = totalSolarGenerated * 0.400;
  const treesPlantedEquivalent = Math.max(0, co2AvoidedKg / 20.0);

  const environmental: EnvironmentalMetrics = {
    co2AvoidedKg: Number(co2AvoidedKg.toFixed(2)),
    coalSavedKg: Number(coalSavedKg.toFixed(2)),
    treesPlantedEquivalent: Number(treesPlantedEquivalent.toFixed(2))
  };

  // 6. Device Consumption Tracking
  let trackedDevicesSumKWh = 0;
  const devices: TrackedDeviceMetric[] = resolved.deviceConsumption.map((dev, idx) => {
    let energyKWh = 0;
    const entries = statistics[dev.statId];
    if (Array.isArray(entries)) {
      for (let j = 0; j < entries.length; j++) {
        const prev = j > 0 ? entries[j - 1] : undefined;
        energyKWh += extractChange(entries[j], prev);
      }
    }

    trackedDevicesSumKWh += energyKWh;
    const percentage = totalHomeConsumptionKWh > 0
      ? Math.min(100, (energyKWh / totalHomeConsumptionKWh) * 100)
      : 0;

    const { icon, color, category } = categorizeDevice(dev.name || dev.statId, dev.statId, idx);

    return {
      id: dev.statId,
      name: dev.name || dev.statId.replace('sensor.', '').replace(/_/g, ' '),
      statId: dev.statId,
      icon,
      color,
      category,
      currentPowerW: Math.round(energyKWh * 120),
      energyKWh: Number(energyKWh.toFixed(2)),
      percentage: Number(percentage.toFixed(1))
    };
  });

  const otherKWh = Math.max(0, totalHomeConsumptionKWh - trackedDevicesSumKWh);
  const otherPercentage = totalHomeConsumptionKWh > 0
    ? Math.max(0, Math.min(100, (otherKWh / totalHomeConsumptionKWh) * 100))
    : 0;

  return {
    totals,
    financials,
    environmental,
    devices,
    otherConsumption: {
      kwh: Number(otherKWh.toFixed(2)),
      percentage: Number(otherPercentage.toFixed(1))
    },
    hourlyTimeseries
  };
}
