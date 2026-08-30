/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EnergyEntityMappingConfig {
  solarPowerEntity?: string;
  solarEnergyTodayEntity?: string;
  batteryPowerEntity?: string;
  batteryChargingPowerEntity?: string;
  batteryDischargingPowerEntity?: string;
  batterySocEntity?: string;
  gridPowerEntity?: string;
  gridImportPowerEntity?: string;
  gridExportPowerEntity?: string;
  gridImportEnergyTodayEntity?: string;
  gridExportEnergyTodayEntity?: string;
  homeConsumptionPowerEntity?: string;
  homeConsumptionEnergyTodayEntity?: string;
}

export interface RealtimeEnergy {
  solarPower: number;      // kW
  gridPower: number;       // kW (+ import, - export)
  batteryPower: number;    // kW (+ discharge, - charge)
  batterySoC: number;      // %
  homeConsumption: number; // kW
  inverterEfficiency: number; // %
}

export interface DailyTotalsEnergy {
  solarProductionKWh: number;
  solarConsumedKWh: number;
  solarFedToGridKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  totalConsumptionKWh: number;
  batteryChargedKWh: number;
  batteryDischargedKWh: number;
  selfConsumptionRate: number; // %
  autarkyRate: number;         // % (Self-sufficiency)
}

export interface FinancialsEnergy {
  importCost: number;
  exportEarnings: number;
  netCost: number;
  currency: string;
  importTariffPerKWh: number;
  exportTariffPerKWh: number;
}

export interface EnvironmentalEnergy {
  co2AvoidedKg: number;
  coalSavedKg: number;
  treesPlantedEquivalent: number;
  gasOffsetM3: number;
  isCo2Estimated: boolean;
  carbonIntensitySource: string;
  carbonIntensityKgPerKWh: number;
}

export interface DeviceConsumer {
  id: string;
  name: string;
  entityId: string;
  icon: string;
  color: string;
  category: 'ev' | 'hvac' | 'kitchen' | 'living' | 'base' | 'other';
  currentPowerW: number; // W
  energyKWh: number;     // kWh
  percentage: number;    // % of total consumption
}

export interface TimeseriesEnergyPoint {
  timestamp: string;
  label: string;
  hour: number;
  solar: number;            // kW (>= 0)
  gridImport: number;       // kW (>= 0)
  gridExport: number;       // kW (<= 0 for stacked negative)
  batteryDischarge: number; // kW (>= 0)
  batteryCharge: number;    // kW (<= 0 for stacked negative)
  consumption: number;      // kW (dashed overlay line)
}

export interface BoundEntityInfo {
  solarPower: string;
  solarEnergyToday: string;
  batteryPower: string;
  batterySoc: string;
  gridPower: string;
  gridImportEnergyToday: string;
  gridExportEnergyToday: string;
  homeConsumptionPower: string;
  homeConsumptionEnergyToday: string;
}

export interface EnergyDataState {
  realtime: RealtimeEnergy;
  dailyTotals: DailyTotalsEnergy;
  financials: FinancialsEnergy;
  environmental: EnvironmentalEnergy;
  deviceConsumers: DeviceConsumer[];
  timeseries: TimeseriesEnergyPoint[];
  weeklyTimeseries: TimeseriesEnergyPoint[];
  monthlyTimeseries: TimeseriesEnergyPoint[];
  boundEntities: BoundEntityInfo;
}

/**
 * Standard environmental conversion factors (EU/US average)
 */
export const ENV_FACTORS = {
  CO2_PER_KWH_KG: 0.475,   // 0.475 kg CO2 per kWh solar (Global average estimate)
  COAL_PER_KWH_KG: 0.400,  // 0.400 kg standard coal saved per kWh solar (Rough approximation)
  CO2_PER_TREE_YR_KG: 20.0, // 1 mature tree absorbs ~20 kg CO2 / year (Rough approximation)
  GAS_PER_KWH_M3: 0.105    // 0.105 m3 natural gas equivalent (Standard grid displacement factor)
};

/**
 * Helper to discover an active carbon intensity sensor in Home Assistant
 * (e.g. from CO2 Signal or Electricity Maps integrations)
 */
export function findCarbonIntensitySensor(
  states: Record<string, any>
): { entityId: string; intensityKgPerKWh: number } | null {
  if (!states) return null;

  const wellKnown = [
    'sensor.co2_signal_grid_carbon_intensity',
    'sensor.electricity_maps_grid_carbon_intensity',
    'sensor.grid_carbon_intensity',
    'sensor.carbon_intensity',
    'sensor.co2_intensity'
  ];

  for (const id of wellKnown) {
    const ent = states[id];
    if (ent && ent.state !== 'unavailable' && ent.state !== 'unknown') {
      const val = parseFloat(ent.state);
      if (!isNaN(val) && val > 0) {
        const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase().trim();
        // If g/kWh or gCO2eq/kWh, convert to kg/kWh
        const intensityKg = (uom.includes('g') && !uom.includes('kg')) ? val / 1000 : val;
        return { entityId: id, intensityKgPerKWh: intensityKg };
      }
    }
  }

  for (const [id, ent] of Object.entries(states)) {
    if (!ent || ent.state === 'unavailable' || ent.state === 'unknown') continue;
    const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase().trim();
    const dc = (ent.attributes?.device_class || '').toLowerCase().trim();
    const fn = (ent.attributes?.friendly_name || '').toLowerCase();
    const lowerId = id.toLowerCase();

    const isIntensityUnit = uom.includes('/kwh') || uom.includes('co2eq') || uom.includes('co2/kwh') || uom.includes('co2e/kwh');
    const isCarbon = dc === 'carbon_dioxide' || dc === 'carbon_intensity' || fn.includes('carbon intensity') || fn.includes('co2 intensity') || lowerId.includes('carbon_intensity') || lowerId.includes('co2_intensity');

    if (isIntensityUnit && isCarbon) {
      const val = parseFloat(ent.state);
      if (!isNaN(val) && val > 0) {
        const intensityKg = (uom.includes('g') && !uom.includes('kg')) ? val / 1000 : val;
        return { entityId: id, intensityKgPerKWh: intensityKg };
      }
    }
  }

  return null;
}

/**
 * Helper to parse power values (W or kW) to kW number
 */
export function parsePowerToKW(entity: any): number | null {
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') return null;
  const val = parseFloat(entity.state);
  if (isNaN(val)) return null;
  const uom = (entity.attributes?.unit_of_measurement || '').trim().toLowerCase();
  if (uom === 'w') return val / 1000;
  if (uom === 'kw') return val;
  if (uom === 'mw') return val * 1000;
  return Math.abs(val) > 100 ? val / 1000 : val; // Heuristic if no UoM
}

/**
 * Helper to parse energy values (Wh or kWh) to kWh number
 */
export function parseEnergyToKWh(entity: any): number | null {
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') return null;
  const val = parseFloat(entity.state);
  if (isNaN(val)) return null;
  const uom = (entity.attributes?.unit_of_measurement || '').trim().toLowerCase();
  if (uom === 'wh') return val / 1000;
  if (uom === 'kwh') return val;
  if (uom === 'mwh') return val * 1000;
  return val;
}

/**
 * Extracts and calculates all energy telemetry from Home Assistant state records
 */
export function calculateEnergyState(
  states: Record<string, any>,
  customImportTariff: number = 0.28,
  customExportTariff: number = 0.09,
  currencySymbol: string = '€',
  entityOverrides: EnergyEntityMappingConfig = {}
): EnergyDataState {
  const entityKeys = Object.keys(states || {});

  const boundEntities: BoundEntityInfo = {
    solarPower: 'auto-detected',
    solarEnergyToday: 'auto-detected',
    batteryPower: 'auto-detected',
    batterySoc: 'auto-detected',
    gridPower: 'auto-detected',
    gridImportEnergyToday: 'auto-detected',
    gridExportEnergyToday: 'auto-detected',
    homeConsumptionPower: 'auto-detected',
    homeConsumptionEnergyToday: 'auto-detected'
  };

  // =================================================================
  // 1. RESOLVE SOLAR / PV GENERATION POWER (kW)
  // =================================================================
  let solarPower: number | null = null;

  if (entityOverrides.solarPowerEntity && states[entityOverrides.solarPowerEntity]) {
    const val = parsePowerToKW(states[entityOverrides.solarPowerEntity]);
    if (val !== null) {
      solarPower = Math.max(0, val);
      boundEntities.solarPower = entityOverrides.solarPowerEntity;
    }
  }

  if (solarPower === null) {
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
      'sensor.power_production'
    ];
    for (const id of solarCandidates) {
      if (states[id]) {
        const parsed = parsePowerToKW(states[id]);
        if (parsed !== null && parsed >= 0) {
          solarPower = parsed;
          boundEntities.solarPower = id;
          break;
        }
      }
    }
  }

  if (solarPower === null) {
    for (const key of entityKeys) {
      const ent = states[key];
      const name = (ent.attributes?.friendly_name || key).toLowerCase();
      if ((name.includes('solar') || name.includes('pv ') || name.includes('photovoltaic') || name.includes('sun2000') || name.includes('inverter yield')) && 
          (ent.attributes?.device_class === 'power' || ent.attributes?.unit_of_measurement === 'W' || ent.attributes?.unit_of_measurement === 'kW')) {
        const parsed = parsePowerToKW(ent);
        if (parsed !== null && parsed >= 0) {
          solarPower = parsed;
          boundEntities.solarPower = key;
          break;
        }
      }
    }
  }
  if (solarPower === null) {
    solarPower = 1.35;
    boundEntities.solarPower = 'demo:sensor.solaredge_solar_power';
  }

  // =================================================================
  // 2. RESOLVE HOME BATTERY STORAGE (SoC % & Power Flow kW)
  // =================================================================
  let batterySoC: number | null = null;
  if (entityOverrides.batterySocEntity && states[entityOverrides.batterySocEntity]) {
    const val = parseFloat(states[entityOverrides.batterySocEntity].state);
    if (!isNaN(val)) {
      batterySoC = val;
      boundEntities.batterySoc = entityOverrides.batterySocEntity;
    }
  }

  if (batterySoC === null) {
    const batterySocCandidates = [
      'sensor.tesla_powerwall_battery_level',
      'sensor.battery_state_of_charge',
      'sensor.home_battery_soc',
      'sensor.storage_soc',
      'sensor.battery_level',
      'sensor.huawei_battery_soc',
      'sensor.luna2000_battery_soc',
      'sensor.sungrow_battery_level',
      'sensor.byd_battery_soc'
    ];
    for (const id of batterySocCandidates) {
      if (states[id]) {
        const val = parseFloat(states[id].state);
        if (!isNaN(val)) {
          batterySoC = val;
          boundEntities.batterySoc = id;
          break;
        }
      }
    }
  }
  if (batterySoC === null) {
    batterySoC = 100;
    boundEntities.batterySoc = 'demo:sensor.home_battery_soc';
  }

  // Battery Power (+ discharge, - charge)
  let batteryPower: number | null = null;

  if (entityOverrides.batteryPowerEntity && states[entityOverrides.batteryPowerEntity]) {
    const parsed = parsePowerToKW(states[entityOverrides.batteryPowerEntity]);
    if (parsed !== null) {
      batteryPower = parsed;
      boundEntities.batteryPower = entityOverrides.batteryPowerEntity;
    }
  } else if (entityOverrides.batteryChargingPowerEntity && entityOverrides.batteryDischargingPowerEntity) {
    const charge = parsePowerToKW(states[entityOverrides.batteryChargingPowerEntity]) || 0;
    const discharge = parsePowerToKW(states[entityOverrides.batteryDischargingPowerEntity]) || 0;
    batteryPower = discharge - charge;
    boundEntities.batteryPower = `${entityOverrides.batteryDischargingPowerEntity} - ${entityOverrides.batteryChargingPowerEntity}`;
  }

  if (batteryPower === null && states['sensor.battery_charge_discharge_power_inverted']) {
    const parsed = parsePowerToKW(states['sensor.battery_charge_discharge_power_inverted']);
    if (parsed !== null) {
      // Inverted sensor: negative = discharge (>0), positive = charge (<0)
      batteryPower = -parsed;
      boundEntities.batteryPower = 'sensor.battery_charge_discharge_power_inverted';
    }
  }

  if (batteryPower === null) {
    const batteryPowerCandidates = [
      'sensor.tesla_powerwall_flow',
      'sensor.battery_power',
      'sensor.powerwall_power',
      'sensor.storage_power',
      'sensor.huawei_battery_charge_discharge_power',
      'sensor.luna2000_charge_discharge_power',
      'sensor.sungrow_battery_power'
    ];
    for (const id of batteryPowerCandidates) {
      if (states[id]) {
        const parsed = parsePowerToKW(states[id]);
        if (parsed !== null) {
          batteryPower = parsed;
          boundEntities.batteryPower = id;
          break;
        }
      }
    }
  }

  // Check for separate charging and discharging power entities
  if (batteryPower === null) {
    let chargeEntity: string | null = null;
    let dischargeEntity: string | null = null;
    for (const key of entityKeys) {
      const lower = key.toLowerCase();
      if (lower.includes('battery') && lower.includes('charg') && !lower.includes('discharg')) {
        chargeEntity = key;
      }
      if (lower.includes('battery') && lower.includes('discharg')) {
        dischargeEntity = key;
      }
    }
    if (chargeEntity && dischargeEntity) {
      const c = parsePowerToKW(states[chargeEntity]) || 0;
      const d = parsePowerToKW(states[dischargeEntity]) || 0;
      batteryPower = d - c;
      boundEntities.batteryPower = `${dischargeEntity} - ${chargeEntity}`;
    }
  }

  if (batteryPower === null) {
    batteryPower = 0.00;
    boundEntities.batteryPower = 'demo:sensor.battery_power';
  }

  // =================================================================
  // 3. RESOLVE GRID POWER FLOW (+ import, - export / feed-in)
  // =================================================================
  let gridPower: number | null = null;

  if (entityOverrides.gridPowerEntity && states[entityOverrides.gridPowerEntity]) {
    const parsed = parsePowerToKW(states[entityOverrides.gridPowerEntity]);
    if (parsed !== null) {
      gridPower = parsed;
      boundEntities.gridPower = entityOverrides.gridPowerEntity;
    }
  } else if (entityOverrides.gridImportPowerEntity && entityOverrides.gridExportPowerEntity) {
    const imp = parsePowerToKW(states[entityOverrides.gridImportPowerEntity]) || 0;
    const exp = parsePowerToKW(states[entityOverrides.gridExportPowerEntity]) || 0;
    gridPower = imp - exp;
    boundEntities.gridPower = `${entityOverrides.gridImportPowerEntity} - ${entityOverrides.gridExportPowerEntity}`;
  }

  if (gridPower === null && states['sensor.meter_active_power_inverted']) {
    const parsed = parsePowerToKW(states['sensor.meter_active_power_inverted']);
    if (parsed !== null) {
      // Inverted sensor: negative = import (>0), positive = export (<0)
      gridPower = -parsed;
      boundEntities.gridPower = 'sensor.meter_active_power_inverted';
    }
  }

  if (gridPower === null) {
    const gridCandidates = [
      'sensor.grid_power',
      'sensor.power_meter_active_power',
      'sensor.meter_power',
      'sensor.shelly_em_grid_power',
      'sensor.shelly_3em_grid_power',
      'sensor.envoy_current_power_consumption',
      'sensor.smart_meter_active_power',
      'sensor.grid_active_power'
    ];
    for (const id of gridCandidates) {
      if (states[id]) {
        const parsed = parsePowerToKW(states[id]);
        if (parsed !== null) {
          gridPower = parsed;
          boundEntities.gridPower = id;
          break;
        }
      }
    }
  }

  // Check for separate grid import and grid export sensors
  if (gridPower === null) {
    let importEntity: string | null = null;
    let exportEntity: string | null = null;
    for (const key of entityKeys) {
      const lower = key.toLowerCase();
      if ((lower.includes('grid') || lower.includes('meter')) && lower.includes('import') && (lower.includes('power') || lower.includes('w'))) {
        importEntity = key;
      }
      if ((lower.includes('grid') || lower.includes('meter') || lower.includes('feed_in') || lower.includes('return')) && (lower.includes('export') || lower.includes('return') || lower.includes('feed_in')) && (lower.includes('power') || lower.includes('w'))) {
        exportEntity = key;
      }
    }
    if (importEntity && exportEntity) {
      const imp = parsePowerToKW(states[importEntity]) || 0;
      const exp = parsePowerToKW(states[exportEntity]) || 0;
      gridPower = imp - exp;
      boundEntities.gridPower = `${importEntity} - ${exportEntity}`;
    }
  }

  if (gridPower === null) {
    gridPower = -1.02;
    boundEntities.gridPower = 'demo:sensor.grid_power';
  }

  // =================================================================
  // 4. RESOLVE HOME CONSUMPTION POWER (kW)
  // =================================================================
  let homeConsumption: number | null = null;

  if (entityOverrides.homeConsumptionPowerEntity && states[entityOverrides.homeConsumptionPowerEntity]) {
    const parsed = parsePowerToKW(states[entityOverrides.homeConsumptionPowerEntity]);
    if (parsed !== null && parsed >= 0) {
      homeConsumption = parsed;
      boundEntities.homeConsumptionPower = entityOverrides.homeConsumptionPowerEntity;
    }
  }

  if (homeConsumption === null) {
    const homeCandidates = [
      'sensor.home_consumption_power',
      'sensor.home_power',
      'sensor.house_consumption',
      'sensor.active_load_power',
      'sensor.total_load_power',
      'sensor.house_power'
    ];
    for (const id of homeCandidates) {
      if (states[id]) {
        const parsed = parsePowerToKW(states[id]);
        if (parsed !== null && parsed >= 0) {
          homeConsumption = parsed;
          boundEntities.homeConsumptionPower = id;
          break;
        }
      }
    }
  }

  // If not measured directly by a whole-house clamp, compute from physical law:
  // Home Demand = Solar (kW) + Grid Import (kW) - Grid Export (kW) + Battery Discharge (kW) - Battery Charge (kW)
  if (homeConsumption === null) {
    const calc = solarPower + gridPower + batteryPower;
    homeConsumption = calc > 0.05 ? calc : 0.33;
    boundEntities.homeConsumptionPower = 'calculated: solar + grid + battery';
  }

  // =================================================================
  // 5. DAILY CUMULATIVE ENERGY TOTALS (kWh)
  // =================================================================
  let solarProductionKWh: number | null = null;
  if (entityOverrides.solarEnergyTodayEntity && states[entityOverrides.solarEnergyTodayEntity]) {
    const val = parseEnergyToKWh(states[entityOverrides.solarEnergyTodayEntity]);
    if (val !== null && val >= 0) {
      solarProductionKWh = val;
      boundEntities.solarEnergyToday = entityOverrides.solarEnergyTodayEntity;
    }
  }

  if (solarProductionKWh === null) {
    const solarEnergyCandidates = [
      'sensor.energy_production_today',
      'sensor.solar_energy_today',
      'sensor.solar_production_today',
      'sensor.pv_energy_today',
      'sensor.inverter_daily_yield',
      'sensor.huawei_solar_daily_yield',
      'sensor.envoy_today_s_energy_production',
      'sensor.solaredge_daily_energy'
    ];
    for (const id of solarEnergyCandidates) {
      if (states[id]) {
        const val = parseEnergyToKWh(states[id]);
        if (val !== null && val >= 0) {
          solarProductionKWh = val;
          boundEntities.solarEnergyToday = id;
          break;
        }
      }
    }
  }
  if (solarProductionKWh === null) {
    solarProductionKWh = 16.44;
    boundEntities.solarEnergyToday = 'demo:sensor.solar_energy_today';
  }

  let solarFedToGridKWh: number | null = null;
  if (entityOverrides.gridExportEnergyTodayEntity && states[entityOverrides.gridExportEnergyTodayEntity]) {
    const val = parseEnergyToKWh(states[entityOverrides.gridExportEnergyTodayEntity]);
    if (val !== null && val >= 0) {
      solarFedToGridKWh = val;
      boundEntities.gridExportEnergyToday = entityOverrides.gridExportEnergyTodayEntity;
    }
  }

  if (solarFedToGridKWh === null) {
    const fedToGridCandidates = [
      'sensor.energy_fed_to_grid_today',
      'sensor.solar_exported_today',
      'sensor.grid_export_energy_today',
      'sensor.grid_return_today',
      'sensor.feed_in_energy_today'
    ];
    for (const id of fedToGridCandidates) {
      if (states[id]) {
        const val = parseEnergyToKWh(states[id]);
        if (val !== null && val >= 0) {
          solarFedToGridKWh = val;
          boundEntities.gridExportEnergyToday = id;
          break;
        }
      }
    }
  }
  if (solarFedToGridKWh === null) {
    solarFedToGridKWh = 9.71;
    boundEntities.gridExportEnergyToday = 'demo:sensor.energy_fed_to_grid_today';
  }

  let solarConsumedKWh: number | null = null;
  const solarConsumedCandidates = [
    'sensor.energy_consumed_today',
    'sensor.solar_consumed_today',
    'sensor.energy_from_solar_today',
    'sensor.self_consumption_energy_today'
  ];
  for (const id of solarConsumedCandidates) {
    if (states[id]) {
      const val = parseEnergyToKWh(states[id]);
      if (val !== null && val >= 0) {
        solarConsumedKWh = val;
        break;
      }
    }
  }
  if (solarConsumedKWh === null) {
    solarConsumedKWh = Math.max(0, Number((solarProductionKWh - solarFedToGridKWh).toFixed(2)));
  }

  let totalConsumptionKWh: number | null = null;
  if (entityOverrides.homeConsumptionEnergyTodayEntity && states[entityOverrides.homeConsumptionEnergyTodayEntity]) {
    const val = parseEnergyToKWh(states[entityOverrides.homeConsumptionEnergyTodayEntity]);
    if (val !== null && val >= 0) {
      totalConsumptionKWh = val;
      boundEntities.homeConsumptionEnergyToday = entityOverrides.homeConsumptionEnergyTodayEntity;
    }
  }

  if (totalConsumptionKWh === null) {
    const consumptionEnergyCandidates = [
      'sensor.energy_consumption_today',
      'sensor.home_energy_today',
      'sensor.house_energy_consumption_today',
      'sensor.daily_energy_consumption'
    ];
    for (const id of consumptionEnergyCandidates) {
      if (states[id]) {
        const val = parseEnergyToKWh(states[id]);
        if (val !== null && val >= 0) {
          totalConsumptionKWh = val;
          boundEntities.homeConsumptionEnergyToday = id;
          break;
        }
      }
    }
  }
  if (totalConsumptionKWh === null) {
    totalConsumptionKWh = 4.61;
    boundEntities.homeConsumptionEnergyToday = 'demo:sensor.energy_consumption_today';
  }

  let gridImportKWh: number | null = null;
  if (entityOverrides.gridImportEnergyTodayEntity && states[entityOverrides.gridImportEnergyTodayEntity]) {
    const val = parseEnergyToKWh(states[entityOverrides.gridImportEnergyTodayEntity]);
    if (val !== null && val >= 0) {
      gridImportKWh = val;
      boundEntities.gridImportEnergyToday = entityOverrides.gridImportEnergyTodayEntity;
    }
  }

  if (gridImportKWh === null) {
    const fromGridCandidates = [
      'sensor.energy_consumption_from_grid_today',
      'sensor.grid_import_energy_today',
      'sensor.grid_consumption_today',
      'sensor.grid_energy_imported_today'
    ];
    for (const id of fromGridCandidates) {
      if (states[id]) {
        const val = parseEnergyToKWh(states[id]);
        if (val !== null && val >= 0) {
          gridImportKWh = val;
          boundEntities.gridImportEnergyToday = id;
          break;
        }
      }
    }
  }
  if (gridImportKWh === null) {
    gridImportKWh = 0.17;
    boundEntities.gridImportEnergyToday = 'demo:sensor.grid_import_energy_today';
  }

  let batteryChargedKWh: number | null = null;
  let batteryDischargedKWh: number | null = null;

  const batteryChargedCandidates = [
    'sensor.battery_charged_today',
    'sensor.battery_energy_in_today',
    'sensor.battery_charge_today',
    'sensor.huawei_battery_charge_today'
  ];
  for (const id of batteryChargedCandidates) {
    if (states[id]) {
      const val = parseEnergyToKWh(states[id]);
      if (val !== null && val >= 0) {
        batteryChargedKWh = val;
        break;
      }
    }
  }

  const batteryDischargedCandidates = [
    'sensor.battery_discharged_today',
    'sensor.battery_energy_out_today',
    'sensor.battery_discharge_today',
    'sensor.huawei_battery_discharge_today'
  ];
  for (const id of batteryDischargedCandidates) {
    if (states[id]) {
      const val = parseEnergyToKWh(states[id]);
      if (val !== null && val >= 0) {
        batteryDischargedKWh = val;
        break;
      }
    }
  }

  // If not explicitly measured, calculate from self-consumption storage buffer
  if (batteryChargedKWh === null) {
    // Difference between total solar self-consumed and solar directly consumed by home appliances
    batteryChargedKWh = Math.max(0, Number((solarConsumedKWh - (totalConsumptionKWh - gridImportKWh)).toFixed(2)));
  }
  if (batteryDischargedKWh === null) {
    batteryDischargedKWh = 0.00;
  }

  const energyFromSolarTodayKWh = Math.max(0, totalConsumptionKWh - gridImportKWh);
  const gridExportKWh = solarFedToGridKWh;

  // Percentage Calculations
  const selfConsumptionRate = Number(((solarConsumedKWh / (solarProductionKWh || 1)) * 100).toFixed(2));
  const autarkyRate = Number(((energyFromSolarTodayKWh / (totalConsumptionKWh || 1)) * 100).toFixed(2));

  // 6. Financial Calculations
  const importCost = Number((gridImportKWh * customImportTariff).toFixed(2));
  const exportEarnings = Number((gridExportKWh * customExportTariff).toFixed(2));
  const netCost = Number((importCost - exportEarnings).toFixed(2));

  // 7. Environmental Impact
  const liveCarbon = findCarbonIntensitySensor(states);
  const co2FactorKg = liveCarbon ? liveCarbon.intensityKgPerKWh : ENV_FACTORS.CO2_PER_KWH_KG;
  const isCo2Estimated = !liveCarbon;
  const carbonIntensitySource = liveCarbon
    ? (states[liveCarbon.entityId]?.attributes?.friendly_name || liveCarbon.entityId)
    : 'Global average estimate (~0.475 kg/kWh)';
  const carbonIntensityKgPerKWh = co2FactorKg;

  const co2AvoidedKg = Number((solarProductionKWh * co2FactorKg).toFixed(2));
  const coalSavedKg = Number((solarProductionKWh * ENV_FACTORS.COAL_PER_KWH_KG).toFixed(2));
  const treesPlantedEquivalent = Number((co2AvoidedKg / (ENV_FACTORS.CO2_PER_TREE_YR_KG / 365)).toFixed(0));
  const gasOffsetM3 = Number((solarProductionKWh * ENV_FACTORS.GAS_PER_KWH_M3).toFixed(2));

  // 8. Individual Sub-Consumers Discovery from Home Assistant Entities
  const discoveredConsumers: DeviceConsumer[] = [];
  
  for (const entityId of entityKeys) {
    const ent = states[entityId];
    if (!ent) continue;

    const name = ent.attributes?.friendly_name || entityId;
    const lower = name.toLowerCase();
    const isPowerOrEnergy = ent.attributes?.device_class === 'power' || 
                            ent.attributes?.device_class === 'energy' || 
                            ent.attributes?.unit_of_measurement === 'W' || 
                            ent.attributes?.unit_of_measurement === 'kW' || 
                            ent.attributes?.unit_of_measurement === 'kWh';

    // Exclude aggregate totals
    if (lower.includes('solar') || lower.includes('inverter') || lower.includes('pv ') || lower.includes('battery') || lower.includes('grid power') || lower.includes('grid active')) {
      continue;
    }

    if (isPowerOrEnergy) {
      let category: DeviceConsumer['category'] = 'other';
      let icon = 'Lightning';
      let color = '#3B82F6';

      if (lower.includes('ev') || lower.includes('wallbox') || lower.includes('charger') || lower.includes('car')) {
        category = 'ev';
        icon = 'Car';
        color = '#10B981';
      } else if (lower.includes('ac') || lower.includes('heat') || lower.includes('climate') || lower.includes('pump') || lower.includes('hvac')) {
        category = 'hvac';
        icon = 'ThermometerHot';
        color = '#06B6D4';
      } else if (lower.includes('kitchen') || lower.includes('fridge') || lower.includes('oven') || lower.includes('microwave') || lower.includes('coffee') || lower.includes('dishwasher')) {
        category = 'kitchen';
        icon = 'CookingPot';
        color = '#F59E0B';
      } else if (lower.includes('tv') || lower.includes('media') || lower.includes('computer') || lower.includes('workstation') || lower.includes('audio') || lower.includes('living')) {
        category = 'living';
        icon = 'Television';
        color = '#8B5CF6';
      } else if (lower.includes('light') || lower.includes('lamp') || lower.includes('plug') || lower.includes('socket')) {
        category = 'base';
        icon = 'Lightbulb';
        color = '#3B82F6';
      }

      const powerW = parsePowerToKW(ent) ? parsePowerToKW(ent)! * 1000 : 0;
      const energy = parseEnergyToKWh(ent) || Number(((powerW / 1000) * 2.5).toFixed(2));

      if (energy > 0 || powerW > 0) {
        discoveredConsumers.push({
          id: entityId.replace(/\./g, '_'),
          name,
          entityId,
          icon,
          color,
          category,
          currentPowerW: Math.round(powerW),
          energyKWh: Number(energy.toFixed(2)),
          percentage: 0
        });
      }
    }
  }

  const deviceConsumers: DeviceConsumer[] = discoveredConsumers.length > 0 
    ? discoveredConsumers.slice(0, 8) 
    : [
        {
          id: 'ev_charger',
          name: 'Wallbox EV Charger',
          entityId: 'sensor.wallbox_energy',
          icon: 'Car',
          color: '#10B981',
          category: 'ev',
          currentPowerW: 1800,
          energyKWh: 2.10,
          percentage: 45.5
        },
        {
          id: 'heat_pump',
          name: 'Heat Pump AC',
          entityId: 'sensor.heat_pump_energy',
          icon: 'ThermometerHot',
          color: '#06B6D4',
          category: 'hvac',
          currentPowerW: 420,
          energyKWh: 1.25,
          percentage: 27.1
        },
        {
          id: 'kitchen',
          name: 'Kitchen Appliances',
          entityId: 'sensor.kitchen_energy',
          icon: 'CookingPot',
          color: '#F59E0B',
          category: 'kitchen',
          currentPowerW: 180,
          energyKWh: 0.65,
          percentage: 14.1
        },
        {
          id: 'entertainment',
          name: 'Media & Office',
          entityId: 'sensor.living_media_energy',
          icon: 'Television',
          color: '#8B5CF6',
          category: 'living',
          currentPowerW: 120,
          energyKWh: 0.38,
          percentage: 8.2
        },
        {
          id: 'base_loads',
          name: 'Lighting & Smart Devices',
          entityId: 'sensor.base_loads_energy',
          icon: 'Lightbulb',
          color: '#3B82F6',
          category: 'base',
          currentPowerW: 60,
          energyKWh: 0.23,
          percentage: 5.1
        }
      ];

  const totalSubKWh = deviceConsumers.reduce((acc, c) => acc + c.energyKWh, 0) || 1;
  deviceConsumers.forEach(c => {
    c.percentage = Number(((c.energyKWh / totalSubKWh) * 100).toFixed(1));
  });

  return {
    realtime: {
      solarPower: Number(solarPower.toFixed(2)),
      gridPower: Number(gridPower.toFixed(2)),
      batteryPower: Number(batteryPower.toFixed(2)),
      batterySoC: Math.min(100, Math.max(0, Math.round(batterySoC))),
      homeConsumption: Number(homeConsumption.toFixed(2)),
      inverterEfficiency: 98.4
    },
    dailyTotals: {
      solarProductionKWh: Number(solarProductionKWh.toFixed(2)),
      solarConsumedKWh: Number(solarConsumedKWh.toFixed(2)),
      solarFedToGridKWh: Number(solarFedToGridKWh.toFixed(2)),
      gridImportKWh: Number(gridImportKWh.toFixed(2)),
      gridExportKWh: Number(gridExportKWh.toFixed(2)),
      totalConsumptionKWh: Number(totalConsumptionKWh.toFixed(2)),
      batteryChargedKWh: Number(batteryChargedKWh.toFixed(2)),
      batteryDischargedKWh: Number(batteryDischargedKWh.toFixed(2)),
      selfConsumptionRate,
      autarkyRate
    },
    financials: {
      importCost,
      exportEarnings,
      netCost,
      currency: currencySymbol,
      importTariffPerKWh: customImportTariff,
      exportTariffPerKWh: customExportTariff
    },
    environmental: {
      co2AvoidedKg,
      coalSavedKg,
      treesPlantedEquivalent,
      gasOffsetM3,
      isCo2Estimated,
      carbonIntensitySource,
      carbonIntensityKgPerKWh
    },
    deviceConsumers,
    timeseries: [],
    weeklyTimeseries: [],
    monthlyTimeseries: [],
    boundEntities
  };
}
