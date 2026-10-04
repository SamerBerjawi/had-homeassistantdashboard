/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from '../services/energyDataTransformer';
export * from '../services/haEnergyPreferences';
export * from '../services/haEnergyStatistics';

export interface InstantaneousPowerTelemetry {
  solarPowerKW: number;
  gridPowerKW: number; // positive = import, negative = export
  gridImportPowerKW: number;
  gridExportPowerKW: number;
  batteryPowerKW: number; // positive = discharge, negative = charge
  batteryDischargePowerKW: number;
  batteryChargePowerKW: number;
  batterySoC: number | null;
  homeConsumptionKW: number;
  gasRate: number | null;
  waterRate: number | null;
}

function parsePowerValueToKW(stateObj: any): number | null {
  if (!stateObj) return null;
  const s = stateObj.state;
  if (!s || s === 'unavailable' || s === 'unknown') return null;
  const val = parseFloat(s);
  if (isNaN(val)) return null;
  const uom = (stateObj.attributes?.unit_of_measurement || '').trim().toLowerCase();
  if (uom === 'w') return val / 1000;
  if (uom === 'kw') return val;
  if (uom === 'mw') return val * 1000;
  // If no unit or unexpected, assume Watts if large
  return Math.abs(val) > 100 ? val / 1000 : val;
}

export function computeInstantaneousPower(
  states: Record<string, any> = {},
  prefs?: any
): InstantaneousPowerTelemetry {
  let solarPowerKW = 0;
  let gridImportPowerKW = 0;
  let gridExportPowerKW = 0;
  let batteryDischargePowerKW = 0;
  let batteryChargePowerKW = 0;
  let batterySoC: number | null = null;
  let gasRate: number | null = null;
  let waterRate: number | null = null;

  let solarResolved = false;
  let gridResolved = false;
  let batteryResolved = false;

  // 1. Configured sources from Home Assistant Energy Preferences (Highest Authority)
  if (prefs?.energy_sources && Array.isArray(prefs.energy_sources)) {
    for (const src of prefs.energy_sources) {
      if (src.type === 'solar' && src.stat_rate && states[src.stat_rate]) {
        const v = parsePowerValueToKW(states[src.stat_rate]);
        solarPowerKW += (v !== null && v > 0) ? v : 0;
        solarResolved = true;
      } else if (src.type === 'grid') {
        if (Array.isArray(src.flow_from)) {
          for (const ff of src.flow_from) {
            if (ff.stat_rate && states[ff.stat_rate]) {
              const v = parsePowerValueToKW(states[ff.stat_rate]);
              if (v !== null && v > 0) gridImportPowerKW += v;
              gridResolved = true;
            }
          }
        }
        if (Array.isArray(src.flow_to)) {
          for (const ft of src.flow_to) {
            if (ft.stat_rate && states[ft.stat_rate]) {
              const v = parsePowerValueToKW(states[ft.stat_rate]);
              if (v !== null && v > 0) gridExportPowerKW += v;
              gridResolved = true;
            }
          }
        }
        if (!gridResolved && src.stat_rate && states[src.stat_rate]) {
          const v = parsePowerValueToKW(states[src.stat_rate]);
          if (v !== null) {
            if (v >= 0) gridImportPowerKW += v;
            else gridExportPowerKW += Math.abs(v);
            gridResolved = true;
          }
        }
      } else if (src.type === 'battery') {
        if (src.stat_soc && states[src.stat_soc]) {
          const v = parseFloat(states[src.stat_soc].state);
          if (!isNaN(v)) batterySoC = Math.round(v);
        }
        if (src.stat_rate && states[src.stat_rate]) {
          const v = parsePowerValueToKW(states[src.stat_rate]);
          if (v !== null) {
            if (v >= 0) batteryDischargePowerKW += v;
            else batteryChargePowerKW += Math.abs(v);
            batteryResolved = true;
          }
        }
      }
    }
  }

  // 2. Direct Known Standard Helper Sensors Check (if not already resolved from prefs)
  // Battery helper first so we know if battery is discharging/charging
  if (!batteryResolved) {
    if (states['sensor.battery_charge_discharge_power_inverted']) {
      const v = parsePowerValueToKW(states['sensor.battery_charge_discharge_power_inverted']);
      if (v !== null) {
        batteryDischargePowerKW = Math.max(0, v);
        batteryChargePowerKW = Math.max(0, -v);
        batteryResolved = true;
      }
    } else if (states['sensor.battery_charge_discharge_power']) {
      const v = parsePowerValueToKW(states['sensor.battery_charge_discharge_power']);
      if (v !== null) {
        batteryChargePowerKW = Math.max(0, v);
        batteryDischargePowerKW = Math.max(0, -v);
        batteryResolved = true;
      }
    }
  }

  if (batterySoC === null && states['sensor.battery_state_of_capacity']) {
    const v = parseFloat(states['sensor.battery_state_of_capacity'].state);
    if (!isNaN(v) && v >= 0 && v <= 100) {
      batterySoC = Math.round(v);
    }
  }

  // Grid Power Helper
  if (!gridResolved) {
    if (states['sensor.meter_active_power_inverted']) {
      const v = parsePowerValueToKW(states['sensor.meter_active_power_inverted']);
      if (v !== null) {
        gridImportPowerKW = Math.max(0, v);
        gridExportPowerKW = Math.max(0, -v);
        gridResolved = true;
      }
    } else if (states['sensor.meter_active_power']) {
      const v = parsePowerValueToKW(states['sensor.meter_active_power']);
      if (v !== null) {
        gridExportPowerKW = Math.max(0, v);
        gridImportPowerKW = Math.max(0, -v);
        gridResolved = true;
      }
    }
  }

  // Solar Power: Dedicated DC PV generation sensors (highest fidelity)
  let solarIsFromInverterActive = false;
  if (!solarResolved) {
    if (states['sensor.inverter_input_power']) {
      const v = parsePowerValueToKW(states['sensor.inverter_input_power']);
      solarPowerKW = (v !== null && v > 0) ? v : 0;
      solarResolved = true;
    } else if (states['sensor.mppt_total_input_power']) {
      const v = parsePowerValueToKW(states['sensor.mppt_total_input_power']);
      solarPowerKW = (v !== null && v > 0) ? v : 0;
      solarResolved = true;
    } else if (states['sensor.solar_power']) {
      const v = parsePowerValueToKW(states['sensor.solar_power']);
      solarPowerKW = (v !== null && v > 0) ? v : 0;
      solarResolved = true;
    } else if (states['sensor.pv_power']) {
      const v = parsePowerValueToKW(states['sensor.pv_power']);
      solarPowerKW = (v !== null && v > 0) ? v : 0;
      solarResolved = true;
    } else if (states['sensor.inverter_active_power']) {
      const v = parsePowerValueToKW(states['sensor.inverter_active_power']);
      if (v !== null) {
        // Critical: If battery is discharging, that AC power originates from battery, not solar!
        solarPowerKW = Math.max(0, v - batteryDischargePowerKW);
        solarIsFromInverterActive = true;
        solarResolved = true;
      }
    }
  }

  // 3. Fallback heuristic scanner across active states ONLY if sensor was NOT resolved
  if (!solarResolved && states) {
    for (const key of Object.keys(states)) {
      const ent = states[key];
      const keyLower = key.toLowerCase();
      const name = ((ent?.attributes?.friendly_name || key) as string).toLowerCase();
      // Strictly exclude any grid, battery, meter, load, consumption, cost, or forecast entities
      if (
        keyLower.includes('battery') || name.includes('battery') ||
        keyLower.includes('grid') || name.includes('grid') ||
        keyLower.includes('meter') || name.includes('meter') ||
        keyLower.includes('charge') || name.includes('charge') ||
        keyLower.includes('load') || name.includes('load') ||
        keyLower.includes('consumption') || name.includes('consumption') ||
        keyLower.includes('cost') || name.includes('cost') ||
        keyLower.includes('forecast') || name.includes('forecast')
      ) {
        continue;
      }

      if (
        (name.includes('solar') || name.includes('pv') || name.includes('photovoltaic') || keyLower.includes('solar_power') || keyLower.includes('pv_power') || keyLower.includes('mppt')) &&
        (ent?.attributes?.device_class === 'power' || ['w', 'kw'].includes((ent?.attributes?.unit_of_measurement || '').toLowerCase()))
      ) {
        const v = parsePowerValueToKW(ent);
        if (v !== null && v > 0) {
          solarPowerKW = v;
          solarResolved = true;
          break;
        }
      }
    }
  }

  if (!gridResolved && states) {
    for (const key of Object.keys(states)) {
      const ent = states[key];
      const keyLower = key.toLowerCase();
      const name = ((ent?.attributes?.friendly_name || key) as string).toLowerCase();
      if (keyLower.includes('battery') || name.includes('battery') || keyLower.includes('solar') || name.includes('solar')) continue;
      if (
        (name.includes('grid') || name.includes('meter') || keyLower.includes('grid_power')) &&
        (ent?.attributes?.device_class === 'power' || ['w', 'kw'].includes((ent?.attributes?.unit_of_measurement || '').toLowerCase()))
      ) {
        const v = parsePowerValueToKW(ent);
        if (v !== null) {
          if (v >= 0) gridImportPowerKW = v;
          else gridExportPowerKW = Math.abs(v);
          gridResolved = true;
          break;
        }
      }
    }
  }

  if (batterySoC === null && states) {
    for (const key of Object.keys(states)) {
      const ent = states[key];
      const name = ((ent?.attributes?.friendly_name || key) as string).toLowerCase();
      if (
        (name.includes('battery') || key.includes('battery')) &&
        (name.includes('soc') || name.includes('charge') || ent?.attributes?.device_class === 'battery' || ent?.attributes?.unit_of_measurement === '%')
      ) {
        const v = parseFloat(ent?.state);
        if (!isNaN(v) && v >= 0 && v <= 100) {
          batterySoC = Math.round(v);
          break;
        }
      }
    }
  }

  // If solar generation was resolved solely from inverter AC output (sensor.inverter_active_power)
  // on a hybrid DC-coupled battery system (e.g. Huawei Sun2000 + Luna2000), the battery charging
  // power was diverted on the DC bus BEFORE the inverter converted DC to AC.
  // Only add battery charge power if solar generation is active (> 0).
  if (solarIsFromInverterActive && batteryChargePowerKW > 0 && solarPowerKW > 0) {
    solarPowerKW = Number((solarPowerKW + batteryChargePowerKW).toFixed(2));
  }

  const gridPowerKW = gridImportPowerKW - gridExportPowerKW;
  const batteryPowerKW = batteryDischargePowerKW - batteryChargePowerKW;

  // Instantaneous Home Consumption (Dashed Line):
  // Consumption = max(0, Solar + Grid Import + Battery Discharge - |Grid Export| - |Battery Charge|)
  const homeConsumptionKW = Math.max(
    0,
    solarPowerKW + gridImportPowerKW + batteryDischargePowerKW - gridExportPowerKW - batteryChargePowerKW
  );

  return {
    solarPowerKW: Number(solarPowerKW.toFixed(2)),
    gridPowerKW: Number(gridPowerKW.toFixed(2)),
    gridImportPowerKW: Number(gridImportPowerKW.toFixed(2)),
    gridExportPowerKW: Number(gridExportPowerKW.toFixed(2)),
    batteryPowerKW: Number(batteryPowerKW.toFixed(2)),
    batteryDischargePowerKW: Number(batteryDischargePowerKW.toFixed(2)),
    batteryChargePowerKW: Number(batteryChargePowerKW.toFixed(2)),
    batterySoC,
    homeConsumptionKW: Number(homeConsumptionKW.toFixed(2)),
    gasRate,
    waterRate
  };
}
