/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchLiveEntityHistory } from '../services/haHistoryService';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { useUserConfig } from './useUserConfig';
import { haWebSocketService } from '../services/haWebSocket';
import { getAuthHeaders } from '../services/configStorageService';
import { CarEvMetrics, BikeMetrics } from '../types/mobility';
import { findEntity } from '../services/mobility/entityLookup';
import { bucketSpeedHistory, type SpeedPoint } from '../services/mobility/speedHistory';
import { deriveCarMetrics } from '../services/mobility/carMetrics';
import { deriveBikeMetrics } from '../services/mobility/bikeMetrics';

export function useMobilityData() {
  const { states, resolvedZones, isLiveMode } = useAutoLayoutStore(useShallow((s) => ({ states: s.states, resolvedZones: s.resolvedZones, isLiveMode: s.isLiveMode })));
  const { config, updateConfig, flushPendingSave, uploadVehicleAsset } = useUserConfig();

  const effectiveCarImage = config.mobility?.car?.vehicleImageUrl;
  const effectiveCarLogo = config.mobility?.car?.brandLogoUrl;
  const effectiveBikeImage = config.mobility?.bike?.bikeImageUrl;
  const effectiveBikeLogo = config.mobility?.bike?.brandLogoUrl;

  // Local state for optimistic UI feedback
  const [optimisticCar, setOptimisticCar] = useState<Partial<CarEvMetrics>>({});
  const [optimisticBike, setOptimisticBike] = useState<Partial<BikeMetrics>>({});

  // 24h speed history from the FordPass speed sensor's recorder history
  const speedEntityId = useMemo(
    () =>
      findEntity(states, 'sensor', [
        'sensor.fordpass_wf0tk1em3pma07438_speed',
        'fordpass_wf0tk1em3pma07438_speed',
        '_speed'
      ])?.entity_id as string | undefined,
    [states]
  );
  const [speedHistory, setSpeedHistory] = useState<SpeedPoint[]>([]);

  useEffect(() => {
    if (!isLiveMode || !speedEntityId) {
      setSpeedHistory([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const end = Date.now();
      const start = end - 24 * 3600 * 1000;
      // Start a little earlier so the state held at the window start is known
      const raw = await fetchLiveEntityHistory(speedEntityId, new Date(start - 6 * 3600 * 1000).toISOString(), new Date(end).toISOString());
      if (cancelled) return;
      setSpeedHistory(bucketSpeedHistory(raw, end));
    };
    load().catch(() => !cancelled && setSpeedHistory([]));
    const timer = setInterval(() => load().catch(() => {}), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isLiveMode, speedEntityId]);

  // Car/bike derivation is pure and lives in services/mobility/*
  const carMetrics: CarEvMetrics = useMemo(() => {
    const base = deriveCarMetrics({
      states,
      resolvedZones,
      isDemo: haWebSocketService.isDemo(),
      targetSocDefault: config.mobility?.car?.targetSocDefault,
      customBrandLogo: effectiveCarLogo,
      customVehicleImage: effectiveCarImage,
      speedHistory
    });
    return { ...base, ...optimisticCar };
  }, [states, resolvedZones, effectiveCarLogo, effectiveCarImage, optimisticCar, config.mobility?.car?.targetSocDefault, speedHistory]);


  const bikeMetrics: BikeMetrics = useMemo(() => {
    const base = deriveBikeMetrics({
      states,
      resolvedZones,
      isDemo: haWebSocketService.isDemo(),
      customBrandLogo: effectiveBikeLogo,
      customBikeImage: effectiveBikeImage
    });
    return { ...base, ...optimisticBike };
  }, [states, resolvedZones, effectiveBikeLogo, effectiveBikeImage, optimisticBike]);


  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------

  const lockCar = useCallback(async (entityId?: string) => {
    const target = entityId || carMetrics.controls.lockDoorButtonId;
    setOptimisticCar((prev) => ({ ...prev, doorsLocked: true, doorLockStatus: 'Locked' }));
    try {
      if (target.startsWith('button.')) {
        await haWebSocketService.callService('button', 'press', {}, { entity_id: target });
      } else {
        await haWebSocketService.callService('lock', 'lock', {}, { entity_id: target });
      }
    } catch {
      setOptimisticCar((prev) => ({ ...prev, doorsLocked: false, doorLockStatus: 'Unlocked' }));
    }
  }, [carMetrics.controls.lockDoorButtonId]);

  const unlockCar = useCallback(async (entityId?: string) => {
    const target = entityId || carMetrics.controls.unlockDoorLockId;
    setOptimisticCar((prev) => ({ ...prev, doorsLocked: false, doorLockStatus: 'Unlocked' }));
    try {
      if (target.startsWith('button.')) {
        await haWebSocketService.callService('button', 'press', {}, { entity_id: target });
      } else {
        await haWebSocketService.callService('lock', 'unlock', {}, { entity_id: target });
      }
    } catch {
      setOptimisticCar((prev) => ({ ...prev, doorsLocked: true, doorLockStatus: 'Locked' }));
    }
  }, [carMetrics.controls.unlockDoorLockId]);

  const toggleRemoteClimate = useCallback(async (turnOn: boolean, entityId?: string) => {
    const target = entityId || carMetrics.controls.startClimateSwitchId;
    setOptimisticCar((prev) => ({
      ...prev,
      remoteClimateActive: turnOn,
      remoteClimateTimeRemaining: turnOn ? 15 : 0
    }));
    try {
      await haWebSocketService.callService('switch', turnOn ? 'turn_on' : 'turn_off', {}, { entity_id: target });
    } catch {
      // Handled
    }
  }, [carMetrics.controls.startClimateSwitchId]);

  const flashAndHonk = useCallback(async (entityId?: string) => {
    const target = entityId || carMetrics.controls.flashHonkDefaultButtonId;
    try {
      await haWebSocketService.callService('button', 'press', {}, { entity_id: target });
    } catch {
      // Handled
    }
  }, [carMetrics.controls.flashHonkDefaultButtonId]);

  const syncVehicleData = useCallback(async () => {
    setOptimisticCar((prev) => ({ ...prev, lastRefreshed: 'Just now' }));
    try {
      await haWebSocketService.callService('button', 'press', {}, { entity_id: carMetrics.controls.updateDataButtonId });
      await haWebSocketService.callService('button', 'press', {}, { entity_id: carMetrics.controls.requestRefreshButtonId });
    } catch {
      // Handled
    }
  }, [carMetrics.controls.updateDataButtonId, carMetrics.controls.requestRefreshButtonId]);

  const startCharging = useCallback(async (entityId?: string) => {
    const target = entityId || carMetrics.controls.startChargingButtonId;
    setOptimisticCar((prev) => ({ ...prev, chargingState: 'Charging', chargingPowerKW: 11.4 }));
    try {
      await haWebSocketService.callService('button', 'press', {}, { entity_id: target });
    } catch {
      // Handled
    }
  }, [carMetrics.controls.startChargingButtonId]);

  const toggleChargingState = useCallback(async (pause: boolean, entityId?: string) => {
    const target = entityId || carMetrics.controls.chargeSwitchId;
    setOptimisticCar((prev) => ({
      ...prev,
      chargingState: pause ? 'Paused' : 'Charging',
      chargingPowerKW: pause ? 0 : 11.4
    }));
    try {
      await haWebSocketService.callService('switch', pause ? 'turn_off' : 'turn_on', {}, { entity_id: target });
    } catch {
      // Handled
    }
  }, [carMetrics.controls.chargeSwitchId]);

  const toggleAutoSoftwareUpdates = useCallback(async (enable: boolean) => {
    const target = carMetrics.controls.autoSoftwareUpdatesSwitchId;
    setOptimisticCar((prev) => ({
      ...prev,
      softwareUpdates: {
        ...(prev.softwareUpdates || {
          autoUpdatesEnabled: enable,
          firmwareHistory: 'Ford Power-Up 6.8.0',
          firmwareStatus: 'Up to date',
          lastFirmwareUpdate: '2 weeks ago',
          otaReadiness: 'Ready',
          nextOtaCheck: 'Tonight @ 02:00 AM'
        }),
        autoUpdatesEnabled: enable
      }
    }));
    try {
      await haWebSocketService.callService('switch', enable ? 'turn_on' : 'turn_off', {}, { entity_id: target });
    } catch {
      // Handled
    }
  }, [carMetrics.controls.autoSoftwareUpdatesSwitchId]);

  const setTargetSoc = useCallback(async (targetPercent: number) => {
    const safeTarget = Math.max(50, Math.min(100, Math.round(targetPercent)));
    setOptimisticCar((prev) => ({
      ...prev,
      targetSoc: `${safeTarget}%`,
      targetSocPercent: safeTarget
    }));

    try {
      // 1. Update Home Assistant select/number entity if available
      const entityId = carMetrics.controls.targetSocEntityId;
      if (entityId) {
        if (entityId.startsWith('number.')) {
          await haWebSocketService.callService('number', 'set_value', { value: safeTarget }, { entity_id: entityId });
        } else if (entityId.startsWith('select.')) {
          await haWebSocketService.callService('select', 'select_option', { option: `${safeTarget}%` }, { entity_id: entityId });
        }
      }

      // 2. Persist to UserDashboardConfig and remote NAS
      await updateConfig((prev) => ({
        ...prev,
        mobility: {
          ...prev.mobility,
          car: {
            ...(prev.mobility?.car || {}),
            targetSocDefault: safeTarget
          }
        }
      }));
      await flushPendingSave();
    } catch (e) {
      console.error('Failed to save target SoC', e);
    }
  }, [carMetrics.controls.targetSocEntityId, updateConfig, flushPendingSave]);

  const setCabinTemperature = useCallback(async (temperature: number) => {
    const rounded = Math.round(temperature * 2) / 2;
    setOptimisticCar((prev) => ({
      ...prev,
      targetCabinTemp: rounded
    }));

    try {
      const climateId = carMetrics.controls.climateEntityId;
      if (climateId) {
        await haWebSocketService.callService('climate', 'set_temperature', { temperature: rounded }, { entity_id: climateId });
      }
    } catch (e) {
      console.error('Failed to set cabin temperature', e);
    }
  }, [carMetrics.controls.climateEntityId]);

  const setClimateHvacMode = useCallback(async (mode: string) => {
    setOptimisticCar((prev) => ({
      ...prev,
      climateHvacMode: mode,
      remoteClimateActive: mode !== 'off'
    }));

    try {
      const climateId = carMetrics.controls.climateEntityId;
      if (climateId) {
        await haWebSocketService.callService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: climateId });
      } else {
        await haWebSocketService.callService('switch', mode !== 'off' ? 'turn_on' : 'turn_off', {}, { entity_id: carMetrics.controls.startClimateSwitchId });
      }
    } catch (e) {
      console.error('Failed to set HVAC mode', e);
    }
  }, [carMetrics.controls.climateEntityId, carMetrics.controls.startClimateSwitchId]);

  const toggleDefroster = useCallback(async (mode: 'front' | 'rear') => {
    setOptimisticCar((prev) => ({
      ...prev,
      defrostActive: mode === 'front' ? !prev.defrostActive : prev.defrostActive,
      rearDefrostActive: mode === 'rear' ? !prev.rearDefrostActive : prev.rearDefrostActive
    }));

    try {
      const entityId = carMetrics.controls.defrostEntityId;
      if (entityId) {
        await haWebSocketService.callService('switch', 'toggle', {}, { entity_id: entityId });
      }
    } catch (e) {
      console.error('Failed to toggle defrost', e);
    }
  }, [carMetrics.controls.defrostEntityId]);

  const toggleSeatHeater = useCallback(async (seat: 'driver' | 'passenger', level: number) => {
    setOptimisticCar((prev) => ({
      ...prev,
      [seat === 'driver' ? 'seatHeatingDriver' : 'seatHeatingPassenger']: level
    }));
  }, []);

  const openChargePort = useCallback(async () => {
    setOptimisticCar((prev) => ({
      ...prev,
      chargePortOpen: true
    }));

    try {
      const entityId = carMetrics.controls.chargePortEntityId;
      if (entityId) {
        if (entityId.startsWith('lock.')) {
          await haWebSocketService.callService('lock', 'unlock', {}, { entity_id: entityId });
        } else if (entityId.startsWith('button.')) {
          await haWebSocketService.callService('button', 'press', {}, { entity_id: entityId });
        } else {
          await haWebSocketService.callService('switch', 'turn_on', {}, { entity_id: entityId });
        }
      }
    } catch (e) {
      console.error('Failed to open charge port', e);
    }
  }, [carMetrics.controls.chargePortEntityId]);

  // Bike Actions
  const toggleBikeLock = useCallback(async (shouldLock: boolean) => {
    const target = bikeMetrics.controls?.lockEntityId || 'lock.cowboy_lock';
    setOptimisticBike((prev) => ({
      ...prev,
      isLocked: shouldLock,
      autoLockStatus: shouldLock ? 'Armed & Auto-Locked' : 'Unlocked & Ready'
    }));
    try {
      await haWebSocketService.callService('lock', shouldLock ? 'lock' : 'unlock', {}, { entity_id: target });
    } catch {
      setOptimisticBike((prev) => ({ ...prev, isLocked: !shouldLock }));
    }
  }, [bikeMetrics.controls?.lockEntityId]);

  const requestBikeSync = useCallback(async () => {
    setOptimisticBike((prev) => ({ ...prev, lastSeen: 'Just now (Synced)' }));
    try {
      if (bikeMetrics.controls?.refreshButtonId) {
        await haWebSocketService.callService('button', 'press', {}, { entity_id: bikeMetrics.controls.refreshButtonId });
      }
    } catch {
      // Handled
    }
  }, [bikeMetrics.controls?.refreshButtonId]);

  // -------------------------------------------------------------
  // Custom Asset Persistence & Multi-Device Sync
  // -------------------------------------------------------------
  const saveCustomAsset = useCallback(async (
    type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo',
    base64Data: string
  ) => {
    try {
      // 1. Upload via unified storage driver and auto-persist to remote JSON config
      return await uploadVehicleAsset(base64Data, type);
    } catch (e) {
      console.error('Failed to save asset', e);
      throw e;
    }
  }, [uploadVehicleAsset]);

  const saveVehicleSettings = useCallback(async (settings: {
    car?: {
      customName?: string;
      targetSocDefault?: number;
      batteryCapacityKwh?: number;
      vehicleImageUrl?: string;
      brandLogoUrl?: string;
    };
    bike?: {
      customName?: string;
      bikeImageUrl?: string;
      brandLogoUrl?: string;
    };
  }) => {
    try {
      await updateConfig((prev) => ({
        ...prev,
        mobility: {
          car: {
            ...(prev.mobility?.car || {}),
            ...(settings.car || {})
          },
          bike: {
            ...(prev.mobility?.bike || {}),
            ...(settings.bike || {})
          }
        }
      }));
      await flushPendingSave();
    } catch (e) {
      console.error('Failed to save vehicle settings', e);
      throw e;
    }
  }, [updateConfig, flushPendingSave]);

  const resetCustomAssets = useCallback(async (targetType: 'car' | 'bike' | 'all' = 'all') => {
    try {
      if (targetType === 'car' || targetType === 'all') {
        await updateConfig((prev) => ({
          ...prev,
          mobility: {
            ...(prev.mobility || {}),
            car: {
              ...(prev.mobility?.car || {}),
              vehicleImageUrl: undefined,
              brandLogoUrl: undefined
            }
          }
        }));
      }
      if (targetType === 'bike' || targetType === 'all') {
        await updateConfig((prev) => ({
          ...prev,
          mobility: {
            ...(prev.mobility || {}),
            bike: {
              ...(prev.mobility?.bike || {}),
              bikeImageUrl: undefined,
              brandLogoUrl: undefined
            }
          }
        }));
      }
      await flushPendingSave();
    } catch (e) {
      console.error('Failed to clear asset', e);
    }
  }, [updateConfig, flushPendingSave]);

  return {
    carMetrics,
    bikeMetrics,
    isLiveMode,
    actions: {
      lockCar,
      unlockCar,
      toggleRemoteClimate,
      flashAndHonk,
      syncVehicleData,
      startCharging,
      toggleChargingState,
      toggleAutoSoftwareUpdates,
      setTargetSoc,
      setCabinTemperature,
      setClimateHvacMode,
      toggleDefroster,
      toggleSeatHeater,
      openChargePort,
      toggleBikeLock,
      requestBikeSync,
      saveCustomAsset,
      saveVehicleSettings,
      resetCustomAssets,
    }
  };
}
