/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from './haWebSocket';

// ---------------------------------------------------------------------------
// Preferences (energy/get_prefs) — Matching HAPulse & Home Assistant Core
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
  flow_from?: FlowFromGridSourceEnergy[];
  flow_to?: FlowToGridSourceEnergy[];
  cost_adjustment_day?: number;
  // Tolerate flattened shapes
  stat_energy_from?: string;
  stat_energy_to?: string | null;
  stat_cost?: string | null;
  stat_compensation?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export interface SolarSource {
  type: 'solar';
  stat_energy_from: string;
  config_entry_solar_forecast?: string[] | null;
}

export interface BatterySource {
  type: 'battery';
  stat_energy_from: string; // discharging (flow_from)
  stat_energy_to: string;   // charging (flow_to)
}

export interface GasSource {
  type: 'gas';
  stat_energy_from: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
  unit_of_measurement?: string;
}

export interface WaterSource {
  type: 'water';
  stat_energy_from: string;
  stat_cost?: string | null;
  entity_energy_price?: string | null;
  number_energy_price?: number | null;
}

export type EnergySource =
  | GridSource
  | SolarSource
  | BatterySource
  | GasSource
  | WaterSource;

export interface DeviceConsumption {
  stat_consumption: string;
  name?: string;
  included_in_stat?: string;
}

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumption[];
  device_consumption_water?: DeviceConsumption[];
}

export type HAEnergyPreferences = EnergyPreferences;

/** True when prefs exist and have configured energy sources or devices. */
export function isEnergyConfigured(prefs: EnergyPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return (
    (prefs.energy_sources?.length ?? 0) > 0 ||
    (prefs.device_consumption?.length ?? 0) > 0
  );
}

// ---------------------------------------------------------------------------
// Extracted Statistic IDs from EnergyPreferences
// ---------------------------------------------------------------------------

export interface ExtractedEnergyStatisticIds {
  solarSources: string[];
  gridImport: Array<{
    statId: string;
    statCost?: string | null;
    priceEntity?: string | null;
    fixedPrice?: number | null;
  }>;
  gridExport: Array<{
    statId: string;
    statCompensation?: string | null;
    priceEntity?: string | null;
    fixedPrice?: number | null;
  }>;
  batteryCharging: string[];    // flow_to (charging)
  batteryDischarging: string[]; // flow_from (discharging)
  gasSources: string[];
  waterSources: string[];
  deviceConsumption: Array<{
    statId: string;
    name?: string;
  }>;
  allStatisticIds: string[];
}

export type ResolvedEnergyEntityIds = ExtractedEnergyStatisticIds;

export function extractEnergyStatisticIds(prefs: EnergyPreferences | null | undefined): ExtractedEnergyStatisticIds {
  const solarSources: string[] = [];
  const gridImport: ExtractedEnergyStatisticIds['gridImport'] = [];
  const gridExport: ExtractedEnergyStatisticIds['gridExport'] = [];
  const batteryCharging: string[] = [];
  const batteryDischarging: string[] = [];
  const gasSources: string[] = [];
  const waterSources: string[] = [];
  const deviceConsumption: ExtractedEnergyStatisticIds['deviceConsumption'] = [];
  const allIdsSet = new Set<string>();

  if (prefs?.energy_sources && Array.isArray(prefs.energy_sources)) {
    for (const source of prefs.energy_sources) {
      if (source.type === 'solar') {
        const s = source as SolarSource;
        if (s.stat_energy_from) {
          solarSources.push(s.stat_energy_from);
          allIdsSet.add(s.stat_energy_from);
        }
      } else if (source.type === 'grid') {
        const g = source as GridSource;
        if (Array.isArray(g.flow_from)) {
          for (const ff of g.flow_from) {
            if (ff.stat_energy_from) {
              gridImport.push({
                statId: ff.stat_energy_from,
                statCost: ff.stat_cost,
                priceEntity: ff.entity_energy_price,
                fixedPrice: ff.number_energy_price
              });
              allIdsSet.add(ff.stat_energy_from);
              if (ff.stat_cost) allIdsSet.add(ff.stat_cost);
              if (ff.entity_energy_price) allIdsSet.add(ff.entity_energy_price);
            }
          }
        } else if (g.stat_energy_from) {
          gridImport.push({
            statId: g.stat_energy_from,
            statCost: g.stat_cost,
            priceEntity: g.entity_energy_price,
            fixedPrice: g.number_energy_price
          });
          allIdsSet.add(g.stat_energy_from);
          if (g.stat_cost) allIdsSet.add(g.stat_cost);
          if (g.entity_energy_price) allIdsSet.add(g.entity_energy_price);
        }

        if (Array.isArray(g.flow_to)) {
          for (const ft of g.flow_to) {
            if (ft.stat_energy_to) {
              gridExport.push({
                statId: ft.stat_energy_to,
                statCompensation: ft.stat_compensation,
                priceEntity: ft.entity_energy_price,
                fixedPrice: ft.number_energy_price
              });
              allIdsSet.add(ft.stat_energy_to);
              if (ft.stat_compensation) allIdsSet.add(ft.stat_compensation);
              if (ft.entity_energy_price) allIdsSet.add(ft.entity_energy_price);
            }
          }
        } else if (g.stat_energy_to) {
          gridExport.push({
            statId: g.stat_energy_to,
            statCompensation: g.stat_compensation,
            priceEntity: g.entity_energy_price,
            fixedPrice: g.number_energy_price
          });
          allIdsSet.add(g.stat_energy_to);
          if (g.stat_compensation) allIdsSet.add(g.stat_compensation);
          if (g.entity_energy_price) allIdsSet.add(g.entity_energy_price);
        }
      } else if (source.type === 'battery') {
        const b = source as BatterySource;
        if (b.stat_energy_to) {
          batteryCharging.push(b.stat_energy_to);
          allIdsSet.add(b.stat_energy_to);
        }
        if (b.stat_energy_from) {
          batteryDischarging.push(b.stat_energy_from);
          allIdsSet.add(b.stat_energy_from);
        }
      } else if (source.type === 'gas') {
        const gas = source as GasSource;
        if (gas.stat_energy_from) {
          gasSources.push(gas.stat_energy_from);
          allIdsSet.add(gas.stat_energy_from);
        }
      } else if (source.type === 'water') {
        const w = source as WaterSource;
        if (w.stat_energy_from) {
          waterSources.push(w.stat_energy_from);
          allIdsSet.add(w.stat_energy_from);
        }
      }
    }
  }

  if (prefs?.device_consumption && Array.isArray(prefs.device_consumption)) {
    for (const dev of prefs.device_consumption) {
      if (dev.stat_consumption) {
        deviceConsumption.push({
          statId: dev.stat_consumption,
          name: dev.name
        });
        allIdsSet.add(dev.stat_consumption);
      }
    }
  }

  return {
    solarSources,
    gridImport,
    gridExport,
    batteryCharging,
    batteryDischarging,
    gasSources,
    waterSources,
    deviceConsumption,
    allStatisticIds: Array.from(allIdsSet)
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
      stat_energy_from: 'sensor.total_current_day_energy'
    },
    {
      type: 'grid',
      flow_from: [
        {
          stat_energy_from: 'sensor.reverse_active_energy',
          entity_energy_price: 'sensor.current_price',
          number_energy_price: 0.28
        }
      ],
      flow_to: [
        {
          stat_energy_to: 'sensor.active_energy',
          number_energy_price: 0.09
        }
      ],
      cost_adjustment_day: 0
    },
    {
      type: 'battery',
      stat_energy_from: 'sensor.discharging_capacity',
      stat_energy_to: 'sensor.charging_capacity'
    }
  ],
  device_consumption: [
    { stat_consumption: 'sensor.shelves_light_energy', name: 'Shelves Light Energy' },
    { stat_consumption: 'sensor.tv_plug_total_energy', name: 'TV Plug Total energy' },
    { stat_consumption: 'sensor.stick_vacuum_energy', name: 'Stick vacuum Energy' },
    { stat_consumption: 'sensor.left_night_table_summation_delivered', name: 'Left Night Table Summation delivered' },
    { stat_consumption: 'sensor.right_night_table_summation_delivered', name: 'Right Night Table Summation delivered' }
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
  // Custom connection (home-assistant-js-websocket style)
  if (connection && typeof connection.sendMessagePromise === 'function') {
    try {
      const res = await connection.sendMessagePromise({ type: 'energy/get_prefs' });
      if (res && isEnergyConfigured(res)) {
        return res;
      }
    } catch (err) {
      console.warn('[haEnergyPreferences] connection.sendMessagePromise energy/get_prefs failed:', err);
    }
  }

  // Live WebSocket Service
  if (haWebSocketService && !haWebSocketService.isDemo()) {
    const isConnected = await waitForConnection(2500);
    if (isConnected) {
      try {
        const res = await haWebSocketService.sendRequest<EnergyPreferences>('energy/get_prefs');
        if (res && isEnergyConfigured(res)) {
          return res;
        }
      } catch (err) {
        console.warn('[haEnergyPreferences] haWebSocketService energy/get_prefs error:', err);
      }
    }
  }

  return DEMO_ENERGY_PREFS;
}
