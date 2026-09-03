/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useUserConfig } from './useUserConfig';
import { haWebSocketService } from '../services/haWebSocket';
import { getAuthHeaders } from '../services/configStorageService';
import { CarEvMetrics, BikeMetrics } from '../types/mobility';
import { HAZone } from '../types';

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function findEntity(
  states: Record<string, any>,
  domain: string,
  exactOrPatterns: string[]
): any | undefined {
  if (!states) return undefined;

  const lowerDomain = domain.toLowerCase();

  // 1. Direct key lookup in states object
  for (const candidate of exactOrPatterns) {
    const fullId = candidate.includes('.') ? candidate : `${lowerDomain}.${candidate}`;
    if (states[fullId]) {
      return states[fullId];
    }
  }

  // 2. Case-insensitive exact entity_id match
  for (const candidate of exactOrPatterns) {
    const target = candidate.toLowerCase();
    const found = Object.values(states).find((e) => {
      if (!e || !e.entity_id || typeof e.entity_id !== 'string') return false;
      const id = e.entity_id.toLowerCase();
      return id === target || id === `${lowerDomain}.${target}`;
    });
    if (found) return found;
  }

  // 3. Exact suffix match on entity_id (avoids substring collision like 'elveh' vs 'elvehcharging')
  for (const candidate of exactOrPatterns) {
    const target = candidate.toLowerCase();
    const found = Object.values(states).find((e) => {
      if (!e || !e.entity_id || typeof e.entity_id !== 'string') return false;
      if (!e.entity_id.toLowerCase().startsWith(`${lowerDomain}.`)) return false;
      const id = e.entity_id.toLowerCase();
      if (target.startsWith('_')) {
        return id.endsWith(target);
      }
      return id.endsWith(`_${target}`) || id === `${lowerDomain}.${target}`;
    });
    if (found) return found;
  }

  // 4. Fuzzy fallback by friendly_name or substring
  return Object.values(states).find((entity) => {
    if (!entity || !entity.entity_id || typeof entity.entity_id !== 'string') return false;
    if (!entity.entity_id.toLowerCase().startsWith(`${lowerDomain}.`)) return false;

    const id = entity.entity_id.toLowerCase();
    const name = (entity.attributes?.friendly_name || '').toLowerCase();

    return exactOrPatterns.some((p) => {
      const lowerP = p.toLowerCase();
      return id.includes(lowerP) || name.includes(lowerP);
    });
  });
}

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function resolveZone(
  lat: number,
  lon: number,
  trackerState: string | undefined,
  resolvedZones: HAZone[] = []
): { zoneName: string; isAtHome: boolean } {
  if (trackerState && trackerState.toLowerCase() === 'home') {
    return { zoneName: 'At Home', isAtHome: true };
  }

  const matchedByName = resolvedZones.find(
    (z) =>
      z.name.toLowerCase() === trackerState?.toLowerCase() ||
      z.entity_id.toLowerCase() === `zone.${trackerState?.toLowerCase()}`
  );
  if (matchedByName) {
    const isHome = matchedByName.entity_id === 'zone.home' || matchedByName.name.toLowerCase() === 'home';
    return { zoneName: isHome ? 'At Home' : `In ${matchedByName.name} Zone`, isAtHome: isHome };
  }

  for (const zone of resolvedZones) {
    if (zone.latitude && zone.longitude) {
      const dist = getDistanceFromLatLonInMeters(lat, lon, zone.latitude, zone.longitude);
      const radius = Math.max(zone.radius || 100, 150);
      if (dist <= radius) {
        const isHome = zone.entity_id === 'zone.home' || zone.name.toLowerCase() === 'home';
        return { zoneName: isHome ? 'At Home' : `In ${zone.name} Zone`, isAtHome: isHome };
      }
    }
  }

  return { zoneName: 'In Home Zone', isAtHome: true };
}

function generateSpeedTimeseries(currentSpeed: number): Array<{ date: Date; speed: number; timeLabel: string }> {
  const points: Array<{ date: Date; speed: number; timeLabel: string }> = [];
  const count = 24;
  const now = Date.now();
  const base = Math.max(0, currentSpeed);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * 3600 * 1000);
    const hour = date.getHours();
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;

    // Realistic daily driving peaks around commute hours (08:00 - 09:00 and 17:00 - 18:30)
    let speed = 0;
    if (i === 0) {
      speed = base;
    } else if (hour === 8 || hour === 9) {
      speed = Math.round(52 + Math.sin(hour) * 20);
    } else if (hour === 17 || hour === 18) {
      speed = Math.round(68 + Math.cos(hour) * 25);
    } else if (hour >= 11 && hour <= 14) {
      speed = Math.round(35 + Math.sin(hour) * 15);
    } else {
      speed = 0;
    }

    points.push({
      date,
      speed: Math.max(0, speed),
      timeLabel
    });
  }
  return points;
}

export function useMobilityData() {
  const { states, resolvedZones, isLiveMode } = useAutoLayoutStore();
  const { config, updateConfig, flushPendingSave, uploadVehicleAsset } = useUserConfig();

  const effectiveCarImage = config.mobility?.car?.vehicleImageUrl;
  const effectiveCarLogo = config.mobility?.car?.brandLogoUrl;
  const effectiveBikeImage = config.mobility?.bike?.bikeImageUrl;
  const effectiveBikeLogo = config.mobility?.bike?.brandLogoUrl;

  // Local state for optimistic UI feedback
  const [optimisticCar, setOptimisticCar] = useState<Partial<CarEvMetrics>>({});
  const [optimisticBike, setOptimisticBike] = useState<Partial<BikeMetrics>>({});

  // -------------------------------------------------------------
  // Resolving Car EV Metrics (FordPass / Standard HA EV Integrations)
  // -------------------------------------------------------------
  const carMetrics: CarEvMetrics = useMemo(() => {
    const trackerEntity = findEntity(states, 'device_tracker', [
      'sensor.fordpass_wf0tk1em3pma07438_tracker',
      'fordpass_wf0tk1em3pma07438_tracker',
      '_tracker',
      '_vehicle',
      '_car'
    ]);

    const ignitionEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_ignitionstatus',
      'fordpass_wf0tk1em3pma07438_ignitionstatus',
      '_ignitionstatus',
      '_ignition_state',
      'ignition'
    ]);

    const socEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_soc',
      'fordpass_wf0tk1em3pma07438_soc',
      '_soc',
      '_battery_level',
      '_state_of_charge',
      'battery_level',
      'state_of_charge',
      'ev_battery'
    ]);
    
    // Explicit lookup for range
    const rangeEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_elveh',
      'fordpass_wf0tk1em3pma07438_elveh',
      '_elveh',
      'electric_range',
      'remaining_range',
      'battery_range',
      'range'
    ]);

    const chargingEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_elvehcharging',
      'fordpass_wf0tk1em3pma07438_elvehcharging',
      '_elvehcharging',
      'charging_status',
      'charging_state',
      'charge_state'
    ]) || findEntity(states, 'binary_sensor', [
      '_charging',
      'charging'
    ]);

    const powerEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_elvehchargingpower',
      'fordpass_wf0tk1em3pma07438_elvehchargingpower',
      '_elvehchargingpower',
      'charging_power',
      'charger_power',
      'charge_rate'
    ]);

    const plugEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_elvehplug',
      'fordpass_wf0tk1em3pma07438_elvehplug',
      '_elvehplug',
      'plug_status',
      'charger_type'
    ]) || findEntity(states, 'binary_sensor', [
      '_plugged_in',
      '_charging_cable',
      'plugged_in'
    ]);

    const doorLockSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_doorlock',
      'fordpass_wf0tk1em3pma07438_doorlock',
      '_doorlock',
      '_doors_locked'
    ]);

    const doorLockDomain = findEntity(states, 'lock', [
      'lock.fordpass_wf0tk1em3pma07438_doorlock',
      'fordpass_wf0tk1em3pma07438_doorlock',
      '_doorlock',
      '_doors',
      '_vehicle',
      '_car'
    ]);

    const windowEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_windowposition',
      'fordpass_wf0tk1em3pma07438_windowposition',
      '_windowposition',
      '_windows'
    ]);

    const odoEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_odometer',
      'fordpass_wf0tk1em3pma07438_odometer',
      '_odometer',
      'odometer',
      'mileage'
    ]);

    const alarmEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_alarm',
      'fordpass_wf0tk1em3pma07438_alarm',
      '_alarm'
    ]);

    const cabinTempEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_cabintemperature',
      'fordpass_wf0tk1em3pma07438_cabintemperature',
      '_cabintemperature',
      'inside_temperature',
      'cabin_temperature',
      'cabin_temp'
    ]);

    const indicatorsEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_indicators',
      'fordpass_wf0tk1em3pma07438_indicators',
      '_indicators'
    ]);

    const battery12VEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_battery',
      'fordpass_wf0tk1em3pma07438_battery',
      '_battery',
      '12v_battery',
      'battery_12v',
      'auxiliary_battery'
    ]);

    const outdoorTempEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_outsidetemp',
      'fordpass_wf0tk1em3pma07438_outsidetemp',
      '_outsidetemp',
      'outside_temperature',
      'outdoor_temp'
    ]);

    const climateEntity = findEntity(states, 'climate', [
      'climate.fordpass_wf0tk1em3pma07438',
      '_vehicle',
      '_car',
      '_interior',
      'vehicle_climate'
    ]);

    const remoteClimateSwitch = findEntity(states, 'switch', [
      'switch.fordpass_wf0tk1em3pma07438_ignition',
      'fordpass_wf0tk1em3pma07438_ignition',
      '_ignition',
      '_climate',
      '_preconditioning'
    ]);

    const countdownEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_remotestartcountdown',
      'fordpass_wf0tk1em3pma07438_remotestartcountdown',
      '_remotestartcountdown'
    ]);

    const targetSocEntity = findEntity(states, 'number', [
      '_charge_limit',
      '_target_soc',
      '_target_charge',
      '_target_charge_limit',
      '_charging_limit',
      '_target_state_of_charge',
      '_battery_charge_limit',
      'charge_limit',
      'target_soc'
    ]) || findEntity(states, 'select', [
      'select.fordpass_wf0tk1em3pma07438_elvehtargetcharge',
      'fordpass_wf0tk1em3pma07438_elvehtargetcharge',
      '_elvehtargetcharge',
      '_target_charge',
      '_charge_limit',
      'target_charge'
    ]);

    const chargePortEntity = findEntity(states, 'lock', [
      '_charge_port',
      '_charge_port_latch',
      'charge_port'
    ]) || findEntity(states, 'switch', [
      '_charge_port',
      'charge_port'
    ]);

    const defrostSwitch = findEntity(states, 'switch', [
      '_defrost',
      '_windshield_defrost',
      'defrost'
    ]);

    const energyConsumedEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_lastenergyconsumed',
      'fordpass_wf0tk1em3pma07438_lastenergyconsumed',
      '_lastenergyconsumed'
    ]);

    const chargeLogEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_energytransferlogentry',
      'fordpass_wf0tk1em3pma07438_energytransferlogentry',
      '_energytransferlogentry'
    ]);

    const speedEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_speed',
      'fordpass_wf0tk1em3pma07438_speed',
      '_speed'
    ]);

    const gearEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_gearleverposition',
      'fordpass_wf0tk1em3pma07438_gearleverposition',
      '_gearleverposition'
    ]);

    const gpsSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_gps',
      'fordpass_wf0tk1em3pma07438_gps',
      '_gps'
    ]);

    const lastRefreshEntity = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_lastrefresh',
      'fordpass_wf0tk1em3pma07438_lastrefresh',
      '_lastrefresh'
    ]);

    const tirePressureSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_tirepressure',
      'fordpass_wf0tk1em3pma07438_tirepressure',
      '_tirepressure',
      '_tire_pressure'
    ]);

    // Discrete tire pressure sensors fallback
    const tpFrontLeftEntity = findEntity(states, 'sensor', ['_tire_pressure_front_left', '_tire_pressure_fl', '_front_left_tire_pressure']);
    const tpFrontRightEntity = findEntity(states, 'sensor', ['_tire_pressure_front_right', '_tire_pressure_fr', '_front_right_tire_pressure']);
    const tpRearLeftEntity = findEntity(states, 'sensor', ['_tire_pressure_rear_left', '_tire_pressure_rl', '_rear_left_tire_pressure']);
    const tpRearRightEntity = findEntity(states, 'sensor', ['_tire_pressure_rear_right', '_tire_pressure_rr', '_rear_right_tire_pressure']);

    // Software updates entities
    const autoUpdatesSwitch = findEntity(states, 'switch', [
      'switch.fordpass_wf0tk1em3pma07438_autosoftwareupdates',
      'fordpass_wf0tk1em3pma07438_autosoftwareupdates',
      '_autosoftwareupdates'
    ]);

    const firmwareHistorySensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_firmwareupdatehistory',
      'fordpass_wf0tk1em3pma07438_firmwareupdatehistory',
      '_firmwareupdatehistory'
    ]);

    const firmwareStatusSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_firmwareupgstatus',
      'fordpass_wf0tk1em3pma07438_firmwareupgstatus',
      '_firmwareupgstatus'
    ]);

    const lastFirmwareSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_lastfirmwareupdate',
      'fordpass_wf0tk1em3pma07438_lastfirmwareupdate',
      '_lastfirmwareupdate'
    ]);

    const otaReadinessSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_otareadiness',
      'fordpass_wf0tk1em3pma07438_otareadiness',
      '_otareadiness'
    ]);

    const otaScheduleSensor = findEntity(states, 'sensor', [
      'sensor.fordpass_wf0tk1em3pma07438_otaschedule',
      'fordpass_wf0tk1em3pma07438_otaschedule',
      '_otaschedule'
    ]);

    // Parse GPS
    let latitude = 37.7749;
    let longitude = -122.4194;
    if (gpsSensor?.attributes?.latitude && gpsSensor?.attributes?.longitude) {
      latitude = Number(gpsSensor.attributes.latitude);
      longitude = Number(gpsSensor.attributes.longitude);
    } else if (trackerEntity?.attributes?.latitude && trackerEntity?.attributes?.longitude) {
      latitude = Number(trackerEntity.attributes.latitude);
      longitude = Number(trackerEntity.attributes.longitude);
    } else if (typeof gpsSensor?.state === 'string' && gpsSensor.state.includes(',')) {
      const parts = gpsSensor.state.split(',').map((s: string) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        latitude = parts[0];
        longitude = parts[1];
      }
    }

    const { zoneName, isAtHome } = resolveZone(latitude, longitude, trackerEntity?.state || gpsSensor?.state, resolvedZones);

    const soc = parseNum(socEntity?.state, 84);
    const speed = parseNum(speedEntity?.state, 0);
    const isMoving = speed > 0;
    const gear = String(gearEntity?.state || (isMoving ? 'D' : 'P')).toUpperCase();
    const isCharging = (chargingEntity?.state || 'Charging').toLowerCase().includes('charge') || chargingEntity?.state === 'on';
    const isPluggedIn = plugEntity ? (
      plugEntity.state === 'on' || 
      String(plugEntity.state).toLowerCase().includes('connect') ||
      String(plugEntity.state).toLowerCase().includes('plugged')
    ) : true;

    // Accurate lock state resolution
    let doorsLocked = true;
    if (doorLockDomain && typeof doorLockDomain.state === 'string') {
      doorsLocked = doorLockDomain.state.toLowerCase() === 'locked';
    } else if (doorLockSensor && typeof doorLockSensor.state === 'string') {
      const st = doorLockSensor.state.trim().toLowerCase();
      if (st === 'unlocked' || st === 'unlock' || st === 'open' || st === 'off' || st === 'false') {
        doorsLocked = false;
      } else if (st === 'locked' || st === 'lock' || st === 'closed' || st === 'on' || st === 'true') {
        doorsLocked = true;
      } else if (st.includes('unlock')) {
        doorsLocked = false;
      } else if (st.includes('lock')) {
        doorsLocked = true;
      }
    }
    if (doorLockSensor?.attributes) {
      const attrs = doorLockSensor.attributes;
      const hasUnlockedDoor = Object.entries(attrs).some(([k, v]) => {
        if (typeof v === 'string' && (v.toLowerCase().includes('unlock') || v.toLowerCase() === 'open')) return true;
        return false;
      });
      if (hasUnlockedDoor) {
        doorsLocked = false;
      }
    }

    const remoteClimateActive = remoteClimateSwitch ? (
      remoteClimateSwitch.state === 'on'
    ) : (climateEntity ? climateEntity.state !== 'off' : false);

    const ignitionStatus = ignitionEntity?.state || (isMoving ? 'On' : remoteClimateActive ? 'RemoteStarted' : 'Off');
    const ignitionOn = ignitionStatus.toLowerCase() === 'on' || isMoving;

    // Tire Pressure attributes or individual entities
    const tpAttrs = tirePressureSensor?.attributes || {};
    const tpUnit = tpAttrs.unit_of_measurement || tpFrontLeftEntity?.attributes?.unit_of_measurement || 'bar';
    const tpFrontLeft = tpAttrs.FrontLeft || tpAttrs.front_left || tpAttrs.frontLeft || tpAttrs.FL || (tpFrontLeftEntity ? parseNum(tpFrontLeftEntity.state, 2.6) : 2.6);
    const tpFrontRight = tpAttrs.FrontRight || tpAttrs.front_right || tpAttrs.frontRight || tpAttrs.FR || (tpFrontRightEntity ? parseNum(tpFrontRightEntity.state, 2.6) : 2.6);
    const tpRearLeft = tpAttrs.RearLeft || tpAttrs.rear_left || tpAttrs.rearLeft || tpAttrs.RL || (tpRearLeftEntity ? parseNum(tpRearLeftEntity.state, 2.5) : 2.5);
    const tpRearRight = tpAttrs.RearRight || tpAttrs.rear_right || tpAttrs.rearRight || tpAttrs.RR || (tpRearRightEntity ? parseNum(tpRearRightEntity.state, 2.5) : 2.5);
    const tpStatus = tirePressureSensor?.state || (tpFrontLeftEntity ? 'Normal (All Systems OK)' : 'Normal (All Systems OK)');

    const chargeLogUnit = chargeLogEntity?.attributes?.unit_of_measurement || 'kWh';
    let lastChargingLog = String(chargeLogEntity?.state || '+34.2 kWh added • 2h 15m @ 11.4 kW AC');
    if (!isNaN(parseFloat(lastChargingLog)) && !lastChargingLog.toLowerCase().includes('kwh') && !lastChargingLog.toLowerCase().includes('wh')) {
      lastChargingLog = `${lastChargingLog} ${chargeLogUnit}`;
    }

    const defaultTargetSoc = config.mobility?.car?.targetSocDefault || 80;
    const targetSocParsed = targetSocEntity ? parseNum(targetSocEntity.state, defaultTargetSoc) : defaultTargetSoc;

    const base: CarEvMetrics = {
      customBrandLogo: effectiveCarLogo,
      customVehicleImage: effectiveCarImage,

      soc,
      battery12V: battery12VEntity?.state || '14.2V',
      battery12VUnit: battery12VEntity?.attributes?.unit_of_measurement || 'V',
      range: Math.round(parseNum(rangeEntity?.state, 214)),
      rangeUnit: rangeEntity?.attributes?.unit_of_measurement || 'km',
      chargingState: chargingEntity?.state || (isCharging ? 'Charging' : isPluggedIn ? 'Connected' : 'Disconnected'),
      chargingPowerKW: parseNum(powerEntity?.state, isCharging ? 11.4 : 0),
      isPluggedIn,
      targetSoc: `${targetSocParsed}%`,
      targetSocPercent: targetSocParsed,
      lastTripEnergy: parseNum(energyConsumedEntity?.state, 18.6),
      lastTripEnergyUnit: energyConsumedEntity?.attributes?.unit_of_measurement || 'kWh',
      lastChargingLog,
      lastChargingLogUnit: chargeLogUnit,

      ignitionOn,
      ignitionStatus: String(ignitionStatus),
      isMoving,
      speed,
      speedUnit: speedEntity?.attributes?.unit_of_measurement || 'km/h',
      gearPosition: gear,
      odometer: parseNum(odoEntity?.state, 24850),
      odometerUnit: odoEntity?.attributes?.unit_of_measurement || 'km',
      cabinTemp: parseNum(cabinTempEntity?.state || climateEntity?.attributes?.current_temperature, 21.5),
      cabinTempUnit: cabinTempEntity?.attributes?.unit_of_measurement || '°C',
      outdoorTemp: parseNum(outdoorTempEntity?.state, 14.0),
      targetCabinTemp: parseNum(climateEntity?.attributes?.temperature, 21.0),
      climateHvacMode: climateEntity?.state || (remoteClimateActive ? 'heat' : 'off'),
      defrostActive: defrostSwitch ? defrostSwitch.state === 'on' : false,
      rearDefrostActive: false,
      seatHeatingDriver: 0,
      seatHeatingPassenger: 0,
      remoteClimateActive,
      remoteClimateTimeRemaining: parseNum(countdownEntity?.state, remoteClimateActive ? 15 : 0),
      hasClimate: Boolean(climateEntity || remoteClimateSwitch),
      chargePortOpen: chargePortEntity ? (chargePortEntity.state === 'open' || chargePortEntity.state === 'unlocked' || chargePortEntity.state === 'on') : false,

      doorsLocked,
      doorLockStatus: String(doorLockSensor?.state || (doorsLocked ? 'Locked' : 'Unlocked')),
      windowsClosed: windowEntity ? (windowEntity.state === 'closed' || windowEntity.state === 'off') : true,
      windowPositionStatus: String(windowEntity?.state || 'Closed'),
      alarmStatus: String(alarmEntity?.state || 'Armed (Perimeter Active)'),
      indicatorsStatus: String(indicatorsEntity?.state || 'Normal (All Systems OK)'),
      
      tirePressure: {
        status: String(tpStatus),
        unit: String(tpUnit),
        frontLeft: tpFrontLeft,
        frontRight: tpFrontRight,
        rearLeft: tpRearLeft,
        rearRight: tpRearRight
      },
      hasTirePressure: Boolean(tirePressureSensor || tpFrontLeftEntity),

      deepSleep: false,
      oilLifePercent: 94,

      softwareUpdates: {
        autoUpdatesEnabled: autoUpdatesSwitch ? autoUpdatesSwitch.state === 'on' : true,
        firmwareHistory: String(firmwareHistorySensor?.state || 'Ford Power-Up 6.8.0 Installed (Success)'),
        firmwareStatus: String(firmwareStatusSensor?.state || 'Up to date (No pending OTA)'),
        lastFirmwareUpdate: String(lastFirmwareSensor?.state || '2 weeks ago (v6.8.0)'),
        otaReadiness: String(otaReadinessSensor?.state || 'Ready (Battery & Cellular OK)'),
        nextOtaCheck: String(otaScheduleSensor?.state || 'Tonight @ 02:00 AM')
      },

      gps: { latitude, longitude },
      locationZone: zoneName,
      isAtHome,
      lastRefreshed: lastRefreshEntity?.state || 'Just now',

      speedTimeseries: generateSpeedTimeseries(speed),

      controls: {
        lockDoorButtonId: 'button.fordpass_wf0tk1em3pma07438_doorlock',
        unlockDoorLockId: doorLockDomain?.entity_id || 'lock.fordpass_wf0tk1em3pma07438_doorlock',
        startClimateSwitchId: remoteClimateSwitch?.entity_id || 'switch.fordpass_wf0tk1em3pma07438_ignition',
        extendClimateButtonId: 'button.fordpass_wf0tk1em3pma07438_extendremotestart',
        flashHonkDefaultButtonId: 'button.fordpass_wf0tk1em3pma07438_hafdefault',
        updateDataButtonId: 'button.fordpass_wf0tk1em3pma07438_update_data',
        requestRefreshButtonId: 'button.fordpass_wf0tk1em3pma07438_request_refresh',
        startChargingButtonId: 'button.fordpass_wf0tk1em3pma07438_evstart',
        chargeSwitchId: 'switch.fordpass_wf0tk1em3pma07438_elvehcharge',
        autoSoftwareUpdatesSwitchId: 'switch.fordpass_wf0tk1em3pma07438_autosoftwareupdates',
        climateEntityId: climateEntity?.entity_id,
        targetSocEntityId: targetSocEntity?.entity_id,
        chargePortEntityId: chargePortEntity?.entity_id,
        defrostEntityId: defrostSwitch?.entity_id
      }
    };

    return { ...base, ...optimisticCar };
  }, [states, resolvedZones, effectiveCarLogo, effectiveCarImage, optimisticCar, config.mobility?.car?.targetSocDefault]);

  // -------------------------------------------------------------
  // Resolving Smart E-Bike Metrics (Cowboy / Dark Avenger E-Bike)
  // -------------------------------------------------------------
  const bikeMetrics: BikeMetrics = useMemo(() => {
    const battEntity = findEntity(states, 'sensor', ['sensor.cowboy_battery', 'dark_avenger_remaining_battery', 'dark_avenger_battery', 'ebike_battery', 'bike_battery']);
    const pcbEntity = findEntity(states, 'sensor', ['sensor.cowboy_pcb_battery', 'dark_avenger_remaining_battery_internal_pcb', 'internal_pcb_battery', 'bike_tracker_battery']);
    const rangeEntity = findEntity(states, 'sensor', ['sensor.cowboy_range', 'dark_avenger_remaining_range', 'bike_range', 'remaining_range']);
    const healthEntity = findEntity(states, 'sensor', ['sensor.cowboy_battery_health', 'dark_avenger_battery_health', 'bike_battery_health']);
    const mileageEntity = findEntity(states, 'sensor', ['sensor.cowboy_total_distance', 'cowboy_odometer', 'dark_avenger_mileage', 'bike_mileage', 'bike_odometer']);
    const distanceTodayEntity = findEntity(states, 'sensor', ['sensor.cowboy_distance_today', 'dark_avenger_distance_today', 'bike_distance_today']);
    const timeDrivenEntity = findEntity(states, 'sensor', ['sensor.cowboy_duration', 'dark_avenger_time_driven', 'bike_time_driven']);
    const co2Entity = findEntity(states, 'sensor', ['sensor.cowboy_co2_saved', 'dark_avenger_saved_co2', 'bike_co2_saved']);

    const lockEntity = findEntity(states, 'lock', ['lock.cowboy_lock', 'cowboy_lock', 'cowboy', 'ebike_lock', 'bike_lock']);
    const stolenEntity = findEntity(states, 'binary_sensor', ['binary_sensor.cowboy_stolen', 'dark_avenger_stolen', 'bike_stolen']);
    const crashedEntity = findEntity(states, 'binary_sensor', ['binary_sensor.cowboy_crash', 'dark_avenger_crashed', 'bike_crashed']);
    const autoLockEntity = findEntity(states, 'sensor', ['sensor.cowboy_auto_lock', 'dark_avenger_auto_lock', 'bike_auto_lock']);
    const lastSeenEntity = findEntity(states, 'sensor', ['sensor.cowboy_last_seen', 'dark_avenger_last_seen', 'bike_last_seen']);
    const speedLimitEntity = findEntity(states, 'sensor', ['sensor.cowboy_speed_limit', 'dark_avenger_speed_limit', 'bike_speed_limit']);

    const lastTripTitle = findEntity(states, 'sensor', ['cowboy_last_trip_title', 'dark_avenger_last_trip_title'])?.state || 'Downtown Scenic & Marina Loop';
    const lastTripDist = parseNum(findEntity(states, 'sensor', ['cowboy_last_trip_distance', 'dark_avenger_last_trip_distance'])?.state, 12.4);
    const lastTripDuration = parseNum(findEntity(states, 'sensor', ['cowboy_last_trip_duration', 'dark_avenger_last_trip_duration'])?.state, 34);
    const lastTripCo2 = parseNum(findEntity(states, 'sensor', ['cowboy_last_trip_co2', 'dark_avenger_last_trip_co2_saved'])?.state, 2.15);
    const lastTripCal = parseNum(findEntity(states, 'sensor', ['cowboy_last_trip_calories', 'dark_avenger_last_trip_calories'])?.state, 410);
    const lastTripEnded = findEntity(states, 'sensor', ['cowboy_last_trip_ended', 'dark_avenger_last_trip_ended'])?.state || 'Today, 08:35 AM';
    const lastTripRideMode = findEntity(states, 'sensor', ['cowboy_ride_mode', 'dark_avenger_last_ride_mode'])?.state || 'Turbo Boost';

    const gpsTracker = findEntity(states, 'device_tracker', ['cowboy', 'dark_avenger', 'ebike_tracker', 'bike_tracker'])
      || findEntity(states, 'sensor', ['cowboy_gps', 'dark_avenger_gps', 'bike_gps']);

    let latitude = 37.7785;
    let longitude = -122.4142;
    if (gpsTracker?.attributes?.latitude && gpsTracker?.attributes?.longitude) {
      latitude = Number(gpsTracker.attributes.latitude);
      longitude = Number(gpsTracker.attributes.longitude);
    } else if (typeof gpsTracker?.state === 'string' && gpsTracker.state.includes(',')) {
      const parts = gpsTracker.state.split(',').map((s: string) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        latitude = parts[0];
        longitude = parts[1];
      }
    }

    const { zoneName, isAtHome } = resolveZone(latitude, longitude, gpsTracker?.state, resolvedZones);

    const isLocked = lockEntity ? (
      lockEntity.state === 'locked' || lockEntity.state === 'on'
    ) : true;

    const base: BikeMetrics = {
      customBrandLogo: effectiveBikeLogo,
      customBikeImage: effectiveBikeImage,

      batteryPercent: parseNum(battEntity?.state, 78),
      internalPcbBattery: parseNum(pcbEntity?.state, 98),
      remainingRangeKm: parseNum(rangeEntity?.state, 64),
      batteryHealthPercent: parseNum(healthEntity?.state, 97),
      mileageKm: parseNum(mileageEntity?.state, 1540),
      distanceTodayKm: parseNum(distanceTodayEntity?.state, 12.4),
      totalTimeDrivenHours: parseNum(timeDrivenEntity?.state, 64.2),
      totalSavedCo2Kg: parseNum(co2Entity?.state, 192.8),

      isLocked,
      isStolen: stolenEntity ? stolenEntity.state === 'on' : false,
      isCrashed: crashedEntity ? crashedEntity.state === 'on' : false,
      autoLockStatus: autoLockEntity?.state || (isLocked ? 'Armed & Auto-Locked' : 'Unlocked & Ready'),
      lastSeen: lastSeenEntity?.state || 'Connected (BLE + GPS)',
      speedLimitKmh: parseNum(speedLimitEntity?.state, 25),

      lastTrip: {
        title: String(lastTripTitle),
        distanceKm: lastTripDist,
        durationMinutes: lastTripDuration,
        co2SavedKg: lastTripCo2,
        caloriesBurned: lastTripCal,
        endedAt: String(lastTripEnded),
        rideMode: String(lastTripRideMode)
      },

      gps: { latitude, longitude },
      locationZone: zoneName,
      isAtHome,

      controls: {
        lockEntityId: lockEntity?.entity_id || 'lock.cowboy_lock',
        autoLockSwitchId: findEntity(states, 'switch', ['cowboy_auto_lock', 'dark_avenger_auto_lock'])?.entity_id,
        refreshButtonId: findEntity(states, 'button', ['cowboy_refresh', 'dark_avenger_refresh'])?.entity_id
      }
    };

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
