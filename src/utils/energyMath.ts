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

  // 1. Direct Active Helper Sensor Check (Highest Priority)
  // Solar Power:
  // - sensor.inverter_input_power: Native Huawei Sun2000 total DC PV generation (panels -> DC bus)
  // - sensor.mppt_total_input_power: MPPT sum
  // - sensor.solar_power / sensor.pv_power: Generic PV power sensors
  // - sensor.inverter_active_power: Inverter AC output power
  let solarIsFromInverterActive = false;
  if (states['sensor.inverter_input_power']) {
    const v = parsePowerValueToKW(states['sensor.inverter_input_power']);
    if (v !== null) solarPowerKW = Math.max(0, v);
  } else if (states['sensor.mppt_total_input_power']) {
    const v = parsePowerValueToKW(states['sensor.mppt_total_input_power']);
    if (v !== null) solarPowerKW = Math.max(0, v);
  } else if (states['sensor.solar_power']) {
    const v = parsePowerValueToKW(states['sensor.solar_power']);
    if (v !== null) solarPowerKW = Math.max(0, v);
  } else if (states['sensor.pv_power']) {
    const v = parsePowerValueToKW(states['sensor.pv_power']);
    if (v !== null) solarPowerKW = Math.max(0, v);
  } else if (states['sensor.inverter_active_power']) {
    const v = parsePowerValueToKW(states['sensor.inverter_active_power']);
    if (v !== null) {
      solarPowerKW = Math.max(0, v);
      solarIsFromInverterActive = true;
    }
  }

  // Grid Power Helper:
  // - sensor.meter_active_power_inverted: Standard HA convention where positive (>0) = import from grid, negative (<0) = export to grid
  // - sensor.meter_active_power: Native Huawei Sun2000 meter where positive (>0) = export to grid, negative (<0) = import from grid
  if (states['sensor.meter_active_power_inverted']) {
    const v = parsePowerValueToKW(states['sensor.meter_active_power_inverted']);
    if (v !== null) {
      gridImportPowerKW = Math.max(0, v);
      gridExportPowerKW = Math.max(0, -v);
    }
  } else if (states['sensor.meter_active_power']) {
    // Native Huawei / Sun2000 meter: positive = export, negative = import
    const v = parsePowerValueToKW(states['sensor.meter_active_power']);
    if (v !== null) {
      gridExportPowerKW = Math.max(0, v);
      gridImportPowerKW = Math.max(0, -v);
    }
  }

  // Battery Power Helper:
  // - sensor.battery_charge_discharge_power_inverted: Standard HA convention where positive (>0) = discharging to home, negative (<0) = charging from solar/grid
  // - sensor.battery_charge_discharge_power: Native Huawei Sun2000 battery where positive (>0) = charging, negative (<0) = discharging
  if (states['sensor.battery_charge_discharge_power_inverted']) {
    const v = parsePowerValueToKW(states['sensor.battery_charge_discharge_power_inverted']);
    if (v !== null) {
      batteryDischargePowerKW = Math.max(0, v);
      batteryChargePowerKW = Math.max(0, -v);
    }
  } else if (states['sensor.battery_charge_discharge_power']) {
    // Native Huawei / Sun2000 battery: positive = charge, negative = discharge
    const v = parsePowerValueToKW(states['sensor.battery_charge_discharge_power']);
    if (v !== null) {
      batteryChargePowerKW = Math.max(0, v);
      batteryDischargePowerKW = Math.max(0, -v);
    }
  }

  // Battery State of Charge Helper:
  if (states['sensor.battery_state_of_capacity']) {
    const v = parseFloat(states['sensor.battery_state_of_capacity'].state);
    if (!isNaN(v) && v >= 0 && v <= 100) {
      batterySoC = Math.round(v);
    }
  }

  // 2. Scan from configured sources in prefs if not already resolved
  if (prefs?.energy_sources && Array.isArray(prefs.energy_sources)) {
    for (const src of prefs.energy_sources) {
      if (solarPowerKW === 0 && src.type === 'solar' && src.stat_rate && states[src.stat_rate]) {
        const v = parsePowerValueToKW(states[src.stat_rate]);
        if (v !== null && v >= 0) solarPowerKW += v;
      } else if (src.type === 'grid') {
        // Multi-flow support: flow_from and flow_to rate sensors
        if (Array.isArray(src.flow_from)) {
          for (const ff of src.flow_from) {
            if (ff.stat_rate && states[ff.stat_rate]) {
              const v = parsePowerValueToKW(states[ff.stat_rate]);
              if (v !== null && v > 0) gridImportPowerKW += v;
            }
          }
        }
        if (Array.isArray(src.flow_to)) {
          for (const ft of src.flow_to) {
            if (ft.stat_rate && states[ft.stat_rate]) {
              const v = parsePowerValueToKW(states[ft.stat_rate]);
              if (v !== null && v > 0) gridExportPowerKW += v;
            }
          }
        }
        if (gridImportPowerKW === 0 && gridExportPowerKW === 0 && src.stat_rate && states[src.stat_rate]) {
          const v = parsePowerValueToKW(states[src.stat_rate]);
          if (v !== null) {
            if (v >= 0) gridImportPowerKW += v;
            else gridExportPowerKW += Math.abs(v);
          }
        }
      } else if (src.type === 'battery') {
        if (src.stat_soc && states[src.stat_soc]) {
          const v = parseFloat(states[src.stat_soc].state);
          if (!isNaN(v)) batterySoC = Math.round(v);
        }
        if (batteryDischargePowerKW === 0 && batteryChargePowerKW === 0 && src.stat_rate && states[src.stat_rate]) {
          const v = parsePowerValueToKW(states[src.stat_rate]);
          if (v !== null) {
            if (v >= 0) batteryDischargePowerKW += v;
            else batteryChargePowerKW += Math.abs(v);
          }
        }
      }
    }
  }

  // 3. Fallback heuristic scanner across active states if not found via rate sensors
  if (solarPowerKW === 0 && states) {
    for (const key of Object.keys(states)) {
      const ent = states[key];
      const name = ((ent?.attributes?.friendly_name || key) as string).toLowerCase();
      if (
        (name.includes('solar') || name.includes('pv') || name.includes('photovoltaic') || key.includes('solar_power') || key.includes('pv_power') || key.includes('mppt')) &&
        (ent?.attributes?.device_class === 'power' || ['w', 'kw'].includes((ent?.attributes?.unit_of_measurement || '').toLowerCase()))
      ) {
        const v = parsePowerValueToKW(ent);
        if (v !== null && v > 0) {
          solarPowerKW = v;
          break;
        }
      }
    }
  }

  if (gridImportPowerKW === 0 && gridExportPowerKW === 0 && states) {
    for (const key of Object.keys(states)) {
      const ent = states[key];
      const name = ((ent?.attributes?.friendly_name || key) as string).toLowerCase();
      if (
        (name.includes('grid') || name.includes('meter') || key.includes('grid_power')) &&
        (ent?.attributes?.device_class === 'power' || ['w', 'kw'].includes((ent?.attributes?.unit_of_measurement || '').toLowerCase()))
      ) {
        const v = parsePowerValueToKW(ent);
        if (v !== null) {
          if (v >= 0) gridImportPowerKW = v;
          else gridExportPowerKW = Math.abs(v);
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
  // Therefore: Total Solar DC Yield = Inverter AC Output + DC Battery Charge Power.
  if (solarIsFromInverterActive && batteryChargePowerKW > 0) {
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
