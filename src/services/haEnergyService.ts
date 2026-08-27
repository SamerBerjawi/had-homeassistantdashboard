/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from './haWebSocket';

// -------------------------------------------------------------
// 1. Official Energy Configuration Types (energy/get_prefs)
// -------------------------------------------------------------

export interface GridFlowFrom {
  stat_energy_from: string;
  stat_cost?: string;
  entity_energy_price?: string;
  number_energy_price?: number;
}

export interface GridFlowTo {
  stat_energy_to: string;
  stat_compensation?: string;
  entity_energy_price?: string;
  number_energy_price?: number;
}

export interface EnergySourceGrid {
  type: 'grid';
  flow_from: GridFlowFrom[];
  flow_to: GridFlowTo[];
  cost_adjustment_day?: number;
}

export interface EnergySourceSolar {
  type: 'solar';
  stat_energy_from: string;
  config_entry_solar_forecast?: string[];
}

export interface EnergySourceBattery {
  type: 'battery';
  stat_energy_from: string; // discharging
  stat_energy_to: string;   // charging
}

export type EnergySource = EnergySourceGrid | EnergySourceSolar | EnergySourceBattery;

export interface DeviceConsumptionConfig {
  stat_consumption: string;
  name?: string;
}

export interface EnergyPreferences {
  energy_sources: EnergySource[];
  device_consumption: DeviceConsumptionConfig[];
}

// -------------------------------------------------------------
// 2. Official Recorder Statistics Types (recorder/statistics_during_period)
// -------------------------------------------------------------

export interface HAStatisticEntry {
  start: number | string;
  end?: number | string;
  change?: number | null;
  last_reset?: string | null;
  max?: number | null;
  mean?: number | null;
  min?: number | null;
  state?: number | null;
  sum?: number | null;
}

export type HAStatisticsResponse = Record<string, HAStatisticEntry[]>;

export type StatisticsPeriod = '5minute' | 'hour' | 'day' | 'week' | 'month';

// -------------------------------------------------------------
// 3. Fallback / Mock Energy Configuration for Demo & Dev
// -------------------------------------------------------------

export function getDemoEnergyPreferences(): EnergyPreferences {
  return {
    energy_sources: [
      {
        type: 'solar',
        stat_energy_from: 'sensor.solaredge_solar_power_kwh'
      },
      {
        type: 'grid',
        flow_from: [
          {
            stat_energy_from: 'sensor.grid_import_kwh',
            number_energy_price: 0.28
          }
        ],
        flow_to: [
          {
            stat_energy_to: 'sensor.grid_export_kwh',
            number_energy_price: 0.09
          }
        ],
        cost_adjustment_day: 0
      },
      {
        type: 'battery',
        stat_energy_from: 'sensor.battery_discharged_kwh',
        stat_energy_to: 'sensor.battery_charged_kwh'
      }
    ],
    device_consumption: [
      { stat_consumption: 'sensor.tesla_wall_connector_kwh', name: 'Tesla Model Y' },
      { stat_consumption: 'sensor.heat_pump_consumption_kwh', name: 'Heat Pump HVAC' },
      { stat_consumption: 'sensor.kitchen_appliances_kwh', name: 'Kitchen & Induction' },
      { stat_consumption: 'sensor.living_room_av_kwh', name: 'Living Room Studio' },
      { stat_consumption: 'sensor.server_homelab_kwh', name: 'Homelab Rack' }
    ]
  };
}

// -------------------------------------------------------------
// 4. Extract all required statistic IDs from preferences
// -------------------------------------------------------------

export function extractStatisticIdsFromPrefs(prefs: EnergyPreferences): string[] {
  const ids = new Set<string>();

  if (!prefs || !Array.isArray(prefs.energy_sources)) {
    return Array.from(ids);
  }

  for (const source of prefs.energy_sources) {
    if (source.type === 'solar') {
      if (source.stat_energy_from) ids.add(source.stat_energy_from);
    } else if (source.type === 'grid') {
      if (Array.isArray(source.flow_from)) {
        for (const flow of source.flow_from) {
          if (flow.stat_energy_from) ids.add(flow.stat_energy_from);
          if (flow.stat_cost) ids.add(flow.stat_cost);
          if (flow.entity_energy_price) ids.add(flow.entity_energy_price);
        }
      }
      if (Array.isArray(source.flow_to)) {
        for (const flow of source.flow_to) {
          if (flow.stat_energy_to) ids.add(flow.stat_energy_to);
          if (flow.stat_compensation) ids.add(flow.stat_compensation);
          if (flow.entity_energy_price) ids.add(flow.entity_energy_price);
        }
      }
    } else if (source.type === 'battery') {
      if (source.stat_energy_from) ids.add(source.stat_energy_from);
      if (source.stat_energy_to) ids.add(source.stat_energy_to);
    }
  }

  if (Array.isArray(prefs.device_consumption)) {
    for (const dev of prefs.device_consumption) {
      if (dev.stat_consumption) ids.add(dev.stat_consumption);
    }
  }

  return Array.from(ids);
}

// -------------------------------------------------------------
// 5. Ingest Energy Preferences via WebSocket
// -------------------------------------------------------------

export async function fetchEnergyPreferences(connection?: any): Promise<EnergyPreferences> {
  // If custom connection object passed
  if (connection && typeof connection.sendMessagePromise === 'function') {
    try {
      const res = await connection.sendMessagePromise({ type: 'energy/get_prefs' });
      if (res && Array.isArray(res.energy_sources)) {
        return res;
      }
    } catch (err) {
      console.warn('[haEnergyService] energy/get_prefs call via connection failed:', err);
    }
  }

  if (connection && typeof connection.sendRequest === 'function') {
    try {
      const res = await connection.sendRequest('energy/get_prefs');
      if (res && Array.isArray(res.energy_sources)) {
        return res;
      }
    } catch (err) {
      console.warn('[haEnergyService] energy/get_prefs call via client failed:', err);
    }
  }

  // Live singleton WebSocket service
  if (haWebSocketService && !haWebSocketService.isDemo() && haWebSocketService.getStatus() === 'connected') {
    try {
      const res = await haWebSocketService.sendRequest<EnergyPreferences>('energy/get_prefs');
      if (res && Array.isArray(res.energy_sources) && res.energy_sources.length > 0) {
        return res;
      }
    } catch (err) {
      console.warn('[haEnergyService] Live energy/get_prefs request failed, using defaults:', err);
    }
  }

  // Fallback demo preferences
  return getDemoEnergyPreferences();
}

// -------------------------------------------------------------
// 6. Ingest Energy Statistics during Period
// -------------------------------------------------------------

export async function fetchEnergyStatistics(
  connection?: any,
  statIds: string[] = [],
  period: StatisticsPeriod = 'hour',
  startTime: string = new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  endTime: string = new Date().toISOString()
): Promise<HAStatisticsResponse> {
  const cleanStatIds = Array.from(new Set(statIds.filter(Boolean)));
  if (cleanStatIds.length === 0) {
    return {};
  }

  const isLive = (connection && (connection.socket?.readyState === WebSocket.OPEN || connection.connected)) ||
    (!connection && haWebSocketService && !haWebSocketService.isDemo() && haWebSocketService.getStatus() === 'connected');

  if (isLive) {
    const payload = {
      start_time: startTime,
      end_time: endTime,
      statistic_ids: cleanStatIds,
      period,
      types: ['change', 'sum', 'state']
    };

    try {
      let result: HAStatisticsResponse | null = null;
      if (connection && typeof connection.sendMessagePromise === 'function') {
        result = await connection.sendMessagePromise({ type: 'recorder/statistics_during_period', ...payload });
      } else if (connection && typeof connection.sendRequest === 'function') {
        result = await connection.sendRequest('recorder/statistics_during_period', payload);
      } else {
        result = await haWebSocketService.sendRequest<HAStatisticsResponse>('recorder/statistics_during_period', payload);
      }

      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        return result;
      }
    } catch (err) {
      console.warn('[haEnergyService] recorder/statistics_during_period failed:', err);
    }
  }

  // Demo fallback statistics generator for offline & demo mode
  return generateDemoStatistics(cleanStatIds, period, startTime, endTime);
}

// -------------------------------------------------------------
// 7. Synthetic Statistics Generator (Demo / Fallback Mode)
// -------------------------------------------------------------

function generateDemoStatistics(
  statIds: string[],
  period: StatisticsPeriod,
  startTime: string,
  endTime: string
): HAStatisticsResponse {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  
  let stepMs = 3600 * 1000; // 1 hour default
  if (period === '5minute') stepMs = 5 * 60 * 1000;
  if (period === 'day') stepMs = 24 * 3600 * 1000;
  if (period === 'week') stepMs = 7 * 24 * 3600 * 1000;
  if (period === 'month') stepMs = 30 * 24 * 3600 * 1000;

  const bucketsCount = Math.max(1, Math.min(744, Math.ceil((endMs - startMs) / stepMs)));
  const result: HAStatisticsResponse = {};

  for (const id of statIds) {
    result[id] = [];
  }

  let runningSums: Record<string, number> = {};
  for (const id of statIds) {
    runningSums[id] = 1000.0;
  }

  for (let i = 0; i < bucketsCount; i++) {
    const bucketStartMs = startMs + i * stepMs;
    const bucketEndMs = Math.min(endMs, bucketStartMs + stepMs);
    const date = new Date(bucketStartMs);
    const hour = date.getHours();

    for (const id of statIds) {
      let deltaKWh = 0;

      if (id.includes('solar') || id.includes('production')) {
        // Solar bell curve peaked around 13:00 (1 PM)
        if (hour >= 6 && hour <= 19) {
          const solarCurve = Math.sin(((hour - 6) / 13) * Math.PI);
          deltaKWh = Math.max(0, solarCurve * (3.2 + Math.sin(i * 0.5) * 0.6));
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('export') || id.includes('flow_to')) {
        // Solar surplus exported to grid during midday peak
        if (hour >= 10 && hour <= 16) {
          const solarCurve = Math.sin(((hour - 6) / 13) * Math.PI);
          deltaKWh = Math.max(0, solarCurve * 1.8);
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('import') || id.includes('flow_from')) {
        // Grid imported in early morning & evening
        if (hour < 7 || hour > 18) {
          deltaKWh = 0.6 + (hour >= 18 && hour <= 22 ? 0.9 : 0.2);
        } else {
          deltaKWh = 0.05;
        }
      } else if (id.includes('battery') && (id.includes('charge') || id.includes('in') || id.includes('to'))) {
        // Battery charged during solar hours 10-15
        if (hour >= 10 && hour <= 15) {
          deltaKWh = 0.9;
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('battery') && (id.includes('discharge') || id.includes('out') || id.includes('from'))) {
        // Battery discharged during peak evening 18-23
        if (hour >= 18 && hour <= 23) {
          deltaKWh = 0.75;
        } else {
          deltaKWh = 0.02;
        }
      } else if (id.includes('tesla') || id.includes('wall_connector')) {
        // EV charging at 01:00-04:00 or 12:00-14:00
        if (hour >= 1 && hour <= 3) {
          deltaKWh = 1.4;
        } else {
          deltaKWh = 0;
        }
      } else if (id.includes('heat_pump') || id.includes('hvac')) {
        deltaKWh = 0.4 + (hour >= 6 && hour <= 9 ? 0.4 : 0);
      } else if (id.includes('kitchen')) {
        deltaKWh = (hour === 7 || hour === 8 || hour === 12 || hour === 19 || hour === 20) ? 0.55 : 0.08;
      } else {
        // Generic consumer
        deltaKWh = 0.12 + Math.abs(Math.sin(i + 1) * 0.08);
      }

      deltaKWh = Math.round(deltaKWh * 1000) / 1000;
      runningSums[id] += deltaKWh;

      result[id].push({
        start: bucketStartMs,
        end: bucketEndMs,
        change: deltaKWh,
        sum: runningSums[id],
        state: deltaKWh
      });
    }
  }

  return result;
}
