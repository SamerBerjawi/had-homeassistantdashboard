/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from './haWebSocket';

// ---------------------------------------------------------------------------
// Preferences (energy/get_prefs) — Matching Home Assistant Core & Frontend
// Reference: home-assistant/frontend src/data/energy.ts
// ---------------------------------------------------------------------------

export interface FlowFromGridSourceEnergy {
  stat_energy_from: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export interface FlowToGridSourceEnergy {
  stat_energy_to: string;
  stat_compensation?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export interface GridSource {
  type: 'grid';
  stat_energy_from?: string | null;
  stat_energy_to?: string | null;
  stat_cost?: string | null;
  stat_compensation?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
  entity_energy_price_export?: string | null;
  number_energy_price_export?: number | null;
  cost_adjustment_day?: number;
  flow_from?: FlowFromGridSourceEnergy[];
  flow_to?: FlowToGridSourceEnergy[];
  stat_rate?: string;
  name?: string;
}

export interface SolarSource {
  type: 'solar';
  stat_energy_from: string;
  stat_rate?: string;
  config_entry_solar_forecast?: string[] | null;
  name?: string;
}

export interface BatterySource {
  type: 'battery';
  stat_energy_from: string; // discharging (flow_from)
  stat_energy_to: string;   // charging (flow_to)
  stat_rate?: string;
  stat_soc?: string;
  capacity?: number;
  name?: string;
}

export interface GasSource {
  type: 'gas';
  stat_energy_from: string;
  stat_rate?: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
  unit_of_measurement?: string | null;
  name?: string;
}

export interface WaterSource {
  type: 'water';
  stat_energy_from: string;
  stat_rate?: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
  unit_of_measurement?: string | null;
  name?: string;
}

export type EnergySource =
  | GridSource
  | SolarSource
  | BatterySource
  | GasSource
  | WaterSource;

export interface DeviceConsumption {
  stat_consumption: string;
  stat_rate?: string;
  name?: string;
  included_in_stat?: string;
}

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumption[];
  device_consumption_water?: DeviceConsumption[];
}

export type HAEnergyPreferences = EnergyPreferences;

export const EMPTY_ENERGY_PREFERENCES: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: []
};

/** True when prefs exist and have configured energy sources or devices. */
export function isEnergyConfigured(prefs: EnergyPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return (
    (prefs.energy_sources?.length ?? 0) > 0 ||
    (prefs.device_consumption?.length ?? 0) > 0 ||
    (prefs.device_consumption_water?.length ?? 0) > 0
  );
}

// ---------------------------------------------------------------------------
// Extracted Statistic IDs & Price Metadata from EnergyPreferences
// ---------------------------------------------------------------------------

export interface GridImportConfig {
  statId: string;
  statCost?: string | null;
  priceEntity?: string | null;
  fixedPrice?: number | null;
}

export interface GridExportConfig {
  statId: string;
  statCompensation?: string | null;
  priceEntity?: string | null;
  fixedPrice?: number | null;
}

export interface GasSourceConfig {
  statId: string;
  statCost?: string | null;
  priceEntity?: string | null;
  fixedPrice?: number | null;
  unitOfMeasurement?: string | null;
  name?: string;
}

export interface WaterSourceConfig {
  statId: string;
  statCost?: string | null;
  priceEntity?: string | null;
  fixedPrice?: number | null;
  unitOfMeasurement?: string | null;
  name?: string;
}

export interface ExtractedEnergyStatisticIds {
  solarSources: Array<{ statId: string; name?: string; forecastConfigEntries?: string[] | null }>;
  gridImport: GridImportConfig[];
  gridExport: GridExportConfig[];
  batteryCharging: Array<{ statId: string; name?: string }>;
  batteryDischarging: Array<{ statId: string; name?: string }>;
  batterySoC?: string;
  costAdjustmentDay: number;
  gasSources: GasSourceConfig[];
  waterSources: WaterSourceConfig[];
  deviceConsumption: Array<{
    statId: string;
    name?: string;
    includedInStat?: string;
  }>;
  deviceConsumptionWater: Array<{
    statId: string;
    name?: string;
  }>;
  allStatisticIds: string[];
  allPriceEntityIds: string[];
}

export type ResolvedEnergyEntityIds = ExtractedEnergyStatisticIds;

export function extractEnergyStatisticIds(prefs: EnergyPreferences | null | undefined): ExtractedEnergyStatisticIds {
  const solarSources: ExtractedEnergyStatisticIds['solarSources'] = [];
  const gridImport: GridImportConfig[] = [];
  const gridExport: GridExportConfig[] = [];
  const batteryCharging: ExtractedEnergyStatisticIds['batteryCharging'] = [];
  const batteryDischarging: ExtractedEnergyStatisticIds['batteryDischarging'] = [];
  let batterySoC: string | undefined;
  let costAdjustmentDay = 0;
  const gasSources: GasSourceConfig[] = [];
  const waterSources: WaterSourceConfig[] = [];
  const deviceConsumption: ExtractedEnergyStatisticIds['deviceConsumption'] = [];
  const deviceConsumptionWater: ExtractedEnergyStatisticIds['deviceConsumptionWater'] = [];

  const allStatIdsSet = new Set<string>();
  const allPriceEntitiesSet = new Set<string>();

  if (prefs?.energy_sources && Array.isArray(prefs.energy_sources)) {
    for (const source of prefs.energy_sources) {
      if (source.type === 'solar') {
        const s = source as SolarSource;
        if (s.stat_energy_from) {
          solarSources.push({
            statId: s.stat_energy_from,
            name: s.name,
            forecastConfigEntries: s.config_entry_solar_forecast
          });
          allStatIdsSet.add(s.stat_energy_from);
        }
      } else if (source.type === 'grid') {
        const g = source as GridSource;
        if (typeof g.cost_adjustment_day === 'number') {
          costAdjustmentDay += g.cost_adjustment_day;
        }

        // Multi-flow support (HA flow_from / flow_to)
        if (Array.isArray(g.flow_from) && g.flow_from.length > 0) {
          for (const ff of g.flow_from) {
            if (ff.stat_energy_from) {
              gridImport.push({
                statId: ff.stat_energy_from,
                statCost: ff.stat_cost,
                priceEntity: ff.entity_energy_price,
                fixedPrice: ff.number_energy_price
              });
              allStatIdsSet.add(ff.stat_energy_from);
              if (ff.stat_cost) allStatIdsSet.add(ff.stat_cost);
              if (ff.entity_energy_price) allPriceEntitiesSet.add(ff.entity_energy_price);
            }
          }
        } else if (g.stat_energy_from) {
          gridImport.push({
            statId: g.stat_energy_from,
            statCost: g.stat_cost,
            priceEntity: g.entity_energy_price,
            fixedPrice: g.number_energy_price
          });
          allStatIdsSet.add(g.stat_energy_from);
          if (g.stat_cost) allStatIdsSet.add(g.stat_cost);
          if (g.entity_energy_price) allPriceEntitiesSet.add(g.entity_energy_price);
        }

        if (Array.isArray(g.flow_to) && g.flow_to.length > 0) {
          for (const ft of g.flow_to) {
            if (ft.stat_energy_to) {
              gridExport.push({
                statId: ft.stat_energy_to,
                statCompensation: ft.stat_compensation,
                priceEntity: ft.entity_energy_price,
                fixedPrice: ft.number_energy_price
              });
              allStatIdsSet.add(ft.stat_energy_to);
              if (ft.stat_compensation) allStatIdsSet.add(ft.stat_compensation);
              if (ft.entity_energy_price) allPriceEntitiesSet.add(ft.entity_energy_price);
            }
          }
        } else if (g.stat_energy_to) {
          gridExport.push({
            statId: g.stat_energy_to,
            statCompensation: g.stat_compensation,
            priceEntity: g.entity_energy_price_export || g.entity_energy_price,
            fixedPrice: g.number_energy_price_export ?? g.number_energy_price
          });
          allStatIdsSet.add(g.stat_energy_to);
          if (g.stat_compensation) allStatIdsSet.add(g.stat_compensation);
          const pEnt = g.entity_energy_price_export || g.entity_energy_price;
          if (pEnt) allPriceEntitiesSet.add(pEnt);
        }
      } else if (source.type === 'battery') {
        const b = source as BatterySource;
        if (b.stat_energy_to) {
          batteryCharging.push({ statId: b.stat_energy_to, name: b.name });
          allStatIdsSet.add(b.stat_energy_to);
        }
        if (b.stat_energy_from) {
          batteryDischarging.push({ statId: b.stat_energy_from, name: b.name });
          allStatIdsSet.add(b.stat_energy_from);
        }
        if (b.stat_soc) {
          batterySoC = b.stat_soc;
        }
      } else if (source.type === 'gas') {
        const gas = source as GasSource;
        if (gas.stat_energy_from) {
          gasSources.push({
            statId: gas.stat_energy_from,
            statCost: gas.stat_cost,
            priceEntity: gas.entity_energy_price,
            fixedPrice: gas.number_energy_price,
            unitOfMeasurement: gas.unit_of_measurement,
            name: gas.name
          });
          allStatIdsSet.add(gas.stat_energy_from);
          if (gas.stat_cost) allStatIdsSet.add(gas.stat_cost);
          if (gas.entity_energy_price) allPriceEntitiesSet.add(gas.entity_energy_price);
        }
      } else if (source.type === 'water') {
        const w = source as WaterSource;
        if (w.stat_energy_from) {
          waterSources.push({
            statId: w.stat_energy_from,
            statCost: w.stat_cost,
            priceEntity: w.entity_energy_price,
            fixedPrice: w.number_energy_price,
            unitOfMeasurement: w.unit_of_measurement,
            name: w.name
          });
          allStatIdsSet.add(w.stat_energy_from);
          if (w.stat_cost) allStatIdsSet.add(w.stat_cost);
          if (w.entity_energy_price) allPriceEntitiesSet.add(w.entity_energy_price);
        }
      }
    }
  }

  if (prefs?.device_consumption && Array.isArray(prefs.device_consumption)) {
    for (const dev of prefs.device_consumption) {
      if (dev.stat_consumption) {
        deviceConsumption.push({
          statId: dev.stat_consumption,
          name: dev.name,
          includedInStat: dev.included_in_stat
        });
        allStatIdsSet.add(dev.stat_consumption);
      }
    }
  }

  if (prefs?.device_consumption_water && Array.isArray(prefs.device_consumption_water)) {
    for (const dev of prefs.device_consumption_water) {
      if (dev.stat_consumption) {
        deviceConsumptionWater.push({
          statId: dev.stat_consumption,
          name: dev.name
        });
        allStatIdsSet.add(dev.stat_consumption);
      }
    }
  }

  return {
    solarSources,
    gridImport,
    gridExport,
    batteryCharging,
    batteryDischarging,
    batterySoC,
    costAdjustmentDay,
    gasSources,
    waterSources,
    deviceConsumption,
    deviceConsumptionWater,
    allStatisticIds: Array.from(allStatIdsSet),
    allPriceEntityIds: Array.from(allPriceEntitiesSet)
  };
}

export const parseEnergyPreferences = extractEnergyStatisticIds;

// ---------------------------------------------------------------------------
// Demo Preferences (Used exclusively in offline demo mode)
// ---------------------------------------------------------------------------

export const DEMO_ENERGY_PREFS: EnergyPreferences = {
  energy_sources: [
    {
      type: 'solar',
      stat_energy_from: 'sensor.solar_production_energy',
      name: 'Rooftop Solar Array'
    },
    {
      type: 'grid',
      flow_from: [
        {
          stat_energy_from: 'sensor.grid_import_energy',
          number_energy_price: 0.28
        }
      ],
      flow_to: [
        {
          stat_energy_to: 'sensor.grid_export_energy',
          number_energy_price: 0.09
        }
      ],
      cost_adjustment_day: 0.35,
      name: 'Grid Connection'
    },
    {
      type: 'battery',
      stat_energy_from: 'sensor.battery_discharging_energy',
      stat_energy_to: 'sensor.battery_charging_energy',
      stat_soc: 'sensor.battery_state_of_charge',
      name: 'Home Battery Storage'
    }
  ],
  device_consumption: [
    { stat_consumption: 'sensor.heat_pump_energy', name: 'Heat Pump / HVAC' },
    { stat_consumption: 'sensor.ev_charger_energy', name: 'EV Wallbox' },
    { stat_consumption: 'sensor.kitchen_appliances_energy', name: 'Kitchen & Cooking' },
    { stat_consumption: 'sensor.water_heater_energy', name: 'Hot Water Tank' },
    { stat_consumption: 'sensor.living_room_electronics_energy', name: 'Media & Entertainment' }
  ]
};

export function getDemoEnergyPreferences(): EnergyPreferences {
  return DEMO_ENERGY_PREFS;
}

// ---------------------------------------------------------------------------
// WebSocket API Ingestion: energy/get_prefs
// ---------------------------------------------------------------------------

async function waitForConnection(timeoutMs = 2500): Promise<boolean> {
  if (!haWebSocketService || haWebSocketService.isDemo()) return false;
  if (haWebSocketService.getStatus() === 'connected') return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (haWebSocketService.getStatus() === 'connected') return true;
    if (haWebSocketService.getStatus() === 'auth_failed' || haWebSocketService.getStatus() === 'error') {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  return haWebSocketService.getStatus() === 'connected';
}

export async function fetchHAEnergyPreferences(connection?: any): Promise<EnergyPreferences> {
  // Custom connection (e.g. home-assistant-js-websocket connection object)
  if (connection && typeof connection.sendMessagePromise === 'function') {
    try {
      const res = await connection.sendMessagePromise({ type: 'energy/get_prefs' });
      if (res && typeof res === 'object') {
        return res as EnergyPreferences;
      }
    } catch (err) {
      console.warn('[haEnergyPreferences] connection.sendMessagePromise energy/get_prefs failed:', err);
    }
  }

  // Live WebSocket Service
  if (haWebSocketService && !haWebSocketService.isDemo()) {
    if (haWebSocketService.getStatus() === 'connected') {
      try {
        const res = await haWebSocketService.sendRequest<EnergyPreferences>('energy/get_prefs');
        if (res && typeof res === 'object') {
          return res;
        }
      } catch (err) {
        console.warn('[haEnergyPreferences] haWebSocketService energy/get_prefs error:', err);
      }
    }
    // If live connection returned nothing or failed, return empty preferences (never demo prefs in live mode)
    return EMPTY_ENERGY_PREFERENCES;
  }

  // Purely offline demo mode fallback
  return DEMO_ENERGY_PREFS;
}
