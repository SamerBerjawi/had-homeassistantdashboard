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
// Helper: Parse a power-entity state to kW (handles W, kW, MW)
// -------------------------------------------------------------

function parsePowerStateToKW(stateObj: any): number | null {
  if (!stateObj) return null;
  const s = stateObj.state;
  if (!s || s === 'unavailable' || s === 'unknown') return null;
  const val = parseFloat(s);
  if (isNaN(val)) return null;
  const uom = (stateObj.attributes?.unit_of_measurement || '').trim().toLowerCase();
  if (uom === 'w') return val / 1000;
  if (uom === 'kw') return val;
  if (uom === 'mw') return val * 1000;
  // Heuristic: values > 100 with no UoM are almost certainly watts
  return Math.abs(val) > 100 ? val / 1000 : val;
}

// -------------------------------------------------------------
// Real-Time Instantaneous Power Calculation
// Candidate-scanning approach — works with any HA integration.
// Convention returned:
//   gridPower   > 0 → Importing,  < 0 → Exporting
//   batteryPower> 0 → Discharging, < 0 → Charging
// -------------------------------------------------------------

export function computeRealtimePower(states: Record<string, any> = {}): RealtimePowerModel {
  const entityKeys = Object.keys(states);

  // ── 1. Solar PV power ────────────────────────────────────────
  let solarKW: number | null = null;
  const solarCandidates = [
    'sensor.mppt_total_input_power',
    'sensor.solaredge_solar_power',
    'sensor.solar_power',
    'sensor.pv_power',
    'sensor.inverter_power',
    'sensor.envoy_current_power_production',
    'sensor.fronius_power_photovoltaics',
    'sensor.huawei_solar_active_power',
    'sensor.sun2000_active_power',
    'sensor.sungrow_sg_active_power',
    'sensor.sma_power',
    'sensor.goodwe_pv_power',
    'sensor.solar_panels_power',
    'sensor.power_production',
  ];
  for (const id of solarCandidates) {
    const v = parsePowerStateToKW(states[id]);
    if (v !== null && v >= 0) { solarKW = v; break; }
  }
  if (solarKW === null) {
    for (const key of entityKeys) {
      const ent = states[key];
      const name = ((ent?.attributes?.friendly_name || key) as string).toLowerCase();
      if ((name.includes('solar') || name.includes('pv ') || name.includes('photovoltaic') || name.includes('inverter yield')) &&
          (ent?.attributes?.device_class === 'power' || ['w','kw'].includes((ent?.attributes?.unit_of_measurement || '').toLowerCase()))) {
        const v = parsePowerStateToKW(ent);
        if (v !== null && v >= 0) { solarKW = v; break; }
      }
    }
  }
  solarKW = Math.max(0, solarKW ?? 0);

  // ── 2. Grid power (positive = import, negative = export) ─────
  let rawGridKW: number | null = null;

  // First try a single signed meter sensor
  const gridSignedCandidates = [
    'sensor.meter_active_power_inverted',
    'sensor.grid_power',
    'sensor.power_meter_active_power',
    'sensor.meter_power',
    'sensor.smart_meter_active_power',
    'sensor.grid_active_power',
    'sensor.shelly_em_grid_power',
    'sensor.shelly_3em_grid_power',
    'sensor.envoy_current_power_consumption',
  ];
  for (const id of gridSignedCandidates) {
    const v = parsePowerStateToKW(states[id]);
    if (v !== null) { rawGridKW = v; break; }
  }

  // Fallback: separate import + export sensors → net = import - export (positive = importing)
  if (rawGridKW === null) {
    let importKW: number | null = null;
    let exportKW: number | null = null;
    for (const key of entityKeys) {
      const lower = key.toLowerCase();
      if ((lower.includes('grid') || lower.includes('meter')) && lower.includes('import') && (lower.includes('power') || lower.includes('_w'))) {
        importKW = parsePowerStateToKW(states[key]) ?? importKW;
      }
      if ((lower.includes('grid') || lower.includes('meter') || lower.includes('feed_in')) &&
          (lower.includes('export') || lower.includes('return') || lower.includes('feed_in')) &&
          (lower.includes('power') || lower.includes('_w'))) {
        exportKW = parsePowerStateToKW(states[key]) ?? exportKW;
      }
    }
    if (importKW !== null || exportKW !== null) {
      rawGridKW = (importKW ?? 0) - (exportKW ?? 0);
    }
  }
  rawGridKW = rawGridKW ?? 0;

  const gridImportKW = Math.max(0, rawGridKW);
  const gridExportKW = Math.max(0, -rawGridKW);

  // ── 3. Battery power (positive = discharging, negative = charging) ──
  let rawBatteryKW: number | null = null;
  const batterySignedCandidates = [
    'sensor.battery_charge_discharge_power_inverted',
    'sensor.tesla_powerwall_flow',
    'sensor.battery_power',
    'sensor.powerwall_power',
    'sensor.storage_power',
    'sensor.huawei_battery_charge_discharge_power',
    'sensor.luna2000_charge_discharge_power',
    'sensor.sungrow_battery_power',
  ];
  for (const id of batterySignedCandidates) {
    const v = parsePowerStateToKW(states[id]);
    if (v !== null) { rawBatteryKW = v; break; }
  }
  // Fallback: separate charge / discharge sensors → net = discharge - charge
  if (rawBatteryKW === null) {
    let chargeKW: number | null = null;
    let dischargeKW: number | null = null;
    for (const key of entityKeys) {
      const lower = key.toLowerCase();
      if (lower.includes('battery') && lower.includes('charg') && !lower.includes('discharg')) {
        chargeKW = parsePowerStateToKW(states[key]) ?? chargeKW;
      }
      if (lower.includes('battery') && lower.includes('discharg')) {
        dischargeKW = parsePowerStateToKW(states[key]) ?? dischargeKW;
      }
    }
    if (chargeKW !== null || dischargeKW !== null) {
      rawBatteryKW = (dischargeKW ?? 0) - (chargeKW ?? 0);
    }
  }
  rawBatteryKW = rawBatteryKW ?? 0;

  const batteryDischargeKW = Math.max(0, rawBatteryKW);
  const batteryChargeKW   = Math.max(0, -rawBatteryKW);

  // ── 4. Battery SoC ─────────────────────────────────────────
  let rawBatterySoC: number | null = null;
  const socCandidates = [
    'sensor.battery_state_of_charge_soc',
    'sensor.battery_state_of_charge',
    'sensor.tesla_powerwall_battery_level',
    'sensor.home_battery_soc',
    'sensor.storage_soc',
    'sensor.battery_level',
    'sensor.huawei_battery_soc',
    'sensor.luna2000_battery_soc',
    'sensor.sungrow_battery_level',
    'sensor.byd_battery_soc',
  ];
  for (const id of socCandidates) {
    const v = parseFloat(states[id]?.state);
    if (!isNaN(v)) { rawBatterySoC = v; break; }
  }
  if (rawBatterySoC === null) {
    for (const key of entityKeys) {
      if (key.toLowerCase().includes('battery') && (key.toLowerCase().includes('soc') || key.toLowerCase().includes('level'))) {
        const v = parseFloat(states[key]?.state);
        if (!isNaN(v) && v >= 0 && v <= 100) { rawBatterySoC = v; break; }
      }
    }
  }
  const batterySoC = rawBatterySoC !== null ? Math.round(Math.max(0, Math.min(100, rawBatterySoC))) : 85;

  // ── 5. Home consumption = solar + gridImport + batteryDischarge - gridExport - batteryCharge ──
  const homeConsumptionKW = Math.max(0, solarKW + gridImportKW + batteryDischargeKW - gridExportKW - batteryChargeKW);

  // gridPower sign convention for downstream: positive = import, negative = export
  const gridPowerSigned = gridImportKW - gridExportKW;
  // batteryPower sign convention: positive = discharge, negative = charge
  const batteryPowerSigned = batteryDischargeKW - batteryChargeKW;

  return {
    solarPower: Number(solarKW.toFixed(2)),
    gridPower: Number(gridPowerSigned.toFixed(2)),
    gridImportKW: Number(gridImportKW.toFixed(2)),
    gridExportKW: Number(gridExportKW.toFixed(2)),
    batteryPower: Number(batteryPowerSigned.toFixed(2)),
    batteryChargeKW: Number(batteryChargeKW.toFixed(2)),
    batteryDischargeKW: Number(batteryDischargeKW.toFixed(2)),
    batterySoC,
    homeConsumption: Number(homeConsumptionKW.toFixed(2)),
    directSolar: Number(Math.max(0, solarKW - gridExportKW - batteryChargeKW).toFixed(2)),
    inverterEfficiency: 97.4,
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

        // Cost Calculation priority:
        // 1. statCost accumulator (pre-multiplied running cost stat) — most accurate
        // 2. priceEntity stat mean for this bucket × delta kWh — Nordpool / dynamic price
        // 3. fixedPrice from HA Energy prefs
        // 4. defaultImportTariff fallback
        let unitCost = item.fixedPrice ?? defaultImportTariff;
        if (item.statCost && statLookup[item.statCost]?.get(ts)) {
          const costEntry = statLookup[item.statCost]!.get(ts)!;
          totalImportCost += extractChange(costEntry);
        } else if (item.priceEntity && statLookup[item.priceEntity]?.get(ts)) {
          // Dynamic price sensor (e.g. Nordpool spot price): read mean or state as €/kWh
          const priceEntry = statLookup[item.priceEntity]!.get(ts)!;
          const spotPrice = priceEntry.mean ?? priceEntry.state ?? unitCost;
          if (typeof spotPrice === 'number' && !isNaN(spotPrice) && spotPrice > 0) {
            unitCost = spotPrice;
          }
          totalImportCost += delta * unitCost;
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
