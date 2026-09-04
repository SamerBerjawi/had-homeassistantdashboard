/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook: useStickVacuumData
 * Manages state and service interactions for the Samsung SmartThings Stick Vacuum
 * and its Clean Station charging/dust-emptying base.
 */

import { useState, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useEntityPopup } from '../contexts/EntityPopupContext';

export interface StickVacuumMetrics {
  // Cleaner Presence & Charging
  inStation: boolean;
  isCharging: boolean;
  isDustBagFull: boolean;
  batteryPercent: number;
  cleanerState: string;

  // Clean Station Controls
  lampMode: string;
  lampOptions: string[];
  isEmptying: boolean;

  // Energy & Power Telemetry
  currentPowerWatts: number;
  totalEnergyKwh: number;
  energySavedKwh: number;
  energyDifferenceKwh: number;
  powerEnergyValue: number;

  // Dust Bag & Cycles
  dustBagCycles: number;
  lastEmptiedRaw?: string;
  lastEmptiedRelative: string;
}

const STICK_ENTITIES = {
  inStation: 'binary_sensor.basement_stick_vacuum_stick_cleaner_in_station',
  dustBagFull: 'binary_sensor.basement_stick_vacuum_dust_bag_full',
  charging: 'binary_sensor.basement_stick_vacuum_charging',
  lamp: 'select.basement_stick_vacuum_lamp',
  battery: 'sensor.basement_stick_vacuum_battery',
  energy: 'sensor.basement_stick_vacuum_energy',
  power: 'sensor.basement_stick_vacuum_power',
  energyDiff: 'sensor.basement_stick_vacuum_energy_difference',
  powerEnergy: 'sensor.basement_stick_vacuum_power_energy',
  energySaved: 'sensor.basement_stick_vacuum_energy_saved',
  dustBagCycles: 'sensor.basement_stick_vacuum_dust_bag_cycles',
  mainState: 'sensor.basement_stick_vacuum',
  lastEmptied: 'sensor.basement_stick_vacuum_last_emptied',
  emptyDustbin: 'switch.basement_stick_vacuum_empty_dustbin',
};

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const timestamp = Date.parse(dateStr);
    if (isNaN(timestamp)) return dateStr;
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export function useStickVacuumData() {
  const states = useAutoLayoutStore((s) => s.states);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const { openEntityDetails } = useEntityPopup();

  const [isTriggeringEmpty, setIsTriggeringEmpty] = useState(false);

  // Compute metrics from HA states with sensible demo fallbacks
  const metrics: StickVacuumMetrics = useMemo(() => {
    const inStationState = states[STICK_ENTITIES.inStation];
    const chargingState = states[STICK_ENTITIES.charging];
    const dustBagFullState = states[STICK_ENTITIES.dustBagFull];
    const lampState = states[STICK_ENTITIES.lamp];
    const batteryState = states[STICK_ENTITIES.battery];
    const energyState = states[STICK_ENTITIES.energy];
    const powerState = states[STICK_ENTITIES.power];
    const energyDiffState = states[STICK_ENTITIES.energyDiff];
    const powerEnergyState = states[STICK_ENTITIES.powerEnergy];
    const energySavedState = states[STICK_ENTITIES.energySaved];
    const dustBagCyclesState = states[STICK_ENTITIES.dustBagCycles];
    const mainSensorState = states[STICK_ENTITIES.mainState];
    const lastEmptiedState = states[STICK_ENTITIES.lastEmptied];
    const emptySwitchState = states[STICK_ENTITIES.emptyDustbin];

    // In Station
    const inStation = inStationState
      ? inStationState.state === 'on' || inStationState.state === 'true'
      : true;

    // Charging
    const isCharging = chargingState
      ? chargingState.state === 'on' || chargingState.state === 'true'
      : true;

    // Dust Bag Full
    const isDustBagFull = dustBagFullState
      ? dustBagFullState.state === 'on' || dustBagFullState.state === 'true'
      : false;

    // Battery %
    const rawBattery = batteryState ? parseFloat(batteryState.state) : NaN;
    const batteryPercent = !isNaN(rawBattery) ? Math.min(100, Math.max(0, Math.round(rawBattery))) : 88;

    // Cleaner State
    const cleanerState = mainSensorState?.state && mainSensorState.state !== 'unavailable'
      ? mainSensorState.state
      : inStation
      ? isCharging
        ? 'Charging'
        : 'Docked'
      : 'In Use';

    // Lamp
    const lampMode = lampState?.state || 'Auto';
    const lampOptions = Array.isArray(lampState?.attributes?.options)
      ? (lampState.attributes.options as string[])
      : ['Off', 'Auto', 'Dim', 'Bright'];

    // Emptying switch
    const isEmptying = isTriggeringEmpty || (emptySwitchState?.state === 'on');

    // Power & Energy
    const rawPower = powerState ? parseFloat(powerState.state) : NaN;
    const currentPowerWatts = !isNaN(rawPower) ? Math.round(rawPower * 10) / 10 : (isCharging ? 38.5 : 2.1);

    const rawEnergy = energyState ? parseFloat(energyState.state) : NaN;
    const totalEnergyKwh = !isNaN(rawEnergy) ? Math.round(rawEnergy * 100) / 100 : 14.82;

    const rawEnergySaved = energySavedState ? parseFloat(energySavedState.state) : NaN;
    const energySavedKwh = !isNaN(rawEnergySaved) ? Math.round(rawEnergySaved * 100) / 100 : 3.45;

    const rawEnergyDiff = energyDiffState ? parseFloat(energyDiffState.state) : NaN;
    const energyDifferenceKwh = !isNaN(rawEnergyDiff) ? Math.round(rawEnergyDiff * 100) / 100 : 0.18;

    const rawPowerEnergy = powerEnergyState ? parseFloat(powerEnergyState.state) : NaN;
    const powerEnergyValue = !isNaN(rawPowerEnergy) ? Math.round(rawPowerEnergy * 100) / 100 : 1.25;

    // Cycles
    const rawCycles = dustBagCyclesState ? parseInt(dustBagCyclesState.state, 10) : NaN;
    const dustBagCycles = !isNaN(rawCycles) ? rawCycles : 42;

    // Last Emptied
    const lastEmptiedRaw = lastEmptiedState?.state && lastEmptiedState.state !== 'unknown'
      ? lastEmptiedState.state
      : undefined;
    const lastEmptiedRelative = formatRelativeTime(lastEmptiedRaw || lastEmptiedState?.last_changed);

    return {
      inStation,
      isCharging,
      isDustBagFull,
      batteryPercent,
      cleanerState,
      lampMode,
      lampOptions,
      isEmptying,
      currentPowerWatts,
      totalEnergyKwh,
      energySavedKwh,
      energyDifferenceKwh,
      powerEnergyValue,
      dustBagCycles,
      lastEmptiedRaw,
      lastEmptiedRelative
    };
  }, [states, isTriggeringEmpty]);

  // Actions
  const triggerEmptyDustbin = useCallback(async () => {
    setIsTriggeringEmpty(true);
    try {
      await callHAService(
        'switch',
        'turn_on',
        {},
        { entity_id: STICK_ENTITIES.emptyDustbin }
      );
    } catch (e) {
      console.error('Failed to trigger empty dustbin:', e);
    } finally {
      setTimeout(() => setIsTriggeringEmpty(false), 3000);
    }
  }, [callHAService]);

  const setLampMode = useCallback(async (option: string) => {
    try {
      await callHAService(
        'select',
        'select_option',
        { option },
        { entity_id: STICK_ENTITIES.lamp }
      );
    } catch (e) {
      console.error('Failed to set lamp mode:', e);
    }
  }, [callHAService]);

  const openStickEntityModal = useCallback((key: keyof typeof STICK_ENTITIES) => {
    const entId = STICK_ENTITIES[key];
    if (entId) openEntityDetails(entId);
  }, [openEntityDetails]);

  return {
    metrics,
    triggerEmptyDustbin,
    setLampMode,
    openStickEntityModal,
    entities: STICK_ENTITIES
  };
}
