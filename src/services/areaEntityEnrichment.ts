/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart battery sensor deduplication and pairing for the Area Detail view: groups an area's
 * entities by device type, attaches companion battery sensors to their parent device, and
 * leaves only the batteries that have no parent as standalone tiles.
 */

import type { ResolvedEntity } from '../types';
import type { AreaData } from '../types/rooms';
import { detectLightCapabilities } from './lightClassification';

export function enrichAreaEntities(entities: AreaData['entities']) {
  const rawSensors = [...(entities.sensors || []), ...(entities.binarySensors || [])];

  // 1. Identify all candidate battery entities in this area
  const rawBatterySensors = rawSensors.filter((ent) => {
    const dc = (ent.attributes?.device_class || '').toLowerCase();
    const id = ent.entity_id.toLowerCase();
    return dc === 'battery' || id.includes('battery');
  });

  const claimedBatteryIds = new Set<string>();

  // Helper: Match and pair companion battery sensor to parent device
  const matchAndAttachBattery = (ent: ResolvedEntity): ResolvedEntity => {
    const existingBat =
      ent.attributes?.battery_level ??
      ent.attributes?.battery ??
      ent.attributes?.battery_percentage;

    if (typeof existingBat === 'number') {
      return ent;
    }

    const hostId = ent.entity_id.toLowerCase();
    const hostObjId = hostId.split('.')[1] || '';
    const hostName = (ent.name || '').toLowerCase().trim();
    const hostDeviceId = ent.attributes?.device_id;

    for (const bs of rawBatterySensors) {
      if (claimedBatteryIds.has(bs.entity_id)) continue;

      const bsId = bs.entity_id.toLowerCase();
      const bsObjId = bsId.split('.')[1] || '';
      const bsName = (bs.name || '').toLowerCase().trim();
      const bsDeviceId = bs.attributes?.device_id;

      let isMatch = false;

      // A. Match by device_id
      if (hostDeviceId && bsDeviceId && hostDeviceId === bsDeviceId) {
        isMatch = true;
      } else {
        // B. Match by object_id similarity
        const strippedBsObjId = bsObjId.replace(/(_battery_level|_battery_state|_battery|_batt)$/i, '');
        const strippedHostObjId = hostObjId.replace(
          /(_contact|_sensor|_door|_window|_motion|_lock|_climate|_switch|_fan|_light|_blind|_cover)$/i,
          ''
        );

        if (
          strippedBsObjId &&
          (hostObjId === strippedBsObjId ||
            strippedHostObjId === strippedBsObjId ||
            hostObjId.startsWith(strippedBsObjId) ||
            strippedBsObjId.startsWith(strippedHostObjId))
        ) {
          isMatch = true;
        } else {
          // C. Match by friendly name prefix/suffix
          const strippedBsName = bsName
            .replace(/\s*(battery\s*level|battery\s*state|battery)\s*$/i, '')
            .trim();
          const strippedHostName = hostName
            .replace(/\s*(contact|sensor|door|window|motion|lock|blind|cover|fan|light)\s*$/i, '')
            .trim();

          if (
            strippedBsName &&
            (hostName === strippedBsName ||
              strippedHostName === strippedBsName ||
              hostName.startsWith(strippedBsName) ||
              strippedBsName.startsWith(strippedHostName))
          ) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        const val = parseFloat(bs.state);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          claimedBatteryIds.add(bs.entity_id);
          return {
            ...ent,
            attributes: {
              ...ent.attributes,
              battery_level: Math.round(val)
            }
          };
        }
      }
    }

    return ent;
  };

  // Enrich host domain entities
  const enrichedLights = (entities.lights || []).map(matchAndAttachBattery);
  const enrichedSwitches = (entities.switches || []).map(matchAndAttachBattery);
  const enrichedClimates = (entities.climates || []).map(matchAndAttachBattery);
  const enrichedFans = (entities.fans || []).map(matchAndAttachBattery);
  const enrichedLocks = (entities.locks || []).map(matchAndAttachBattery);
  const enrichedCovers = (entities.covers || []).map(matchAndAttachBattery);
  const enrichedVacuums = (entities.vacuums || []).map(matchAndAttachBattery);

  // Filter non-battery sensors
  const nonBatterySensors = rawSensors.filter((ent) => {
    const dc = (ent.attributes?.device_class || '').toLowerCase();
    const id = ent.entity_id.toLowerCase();
    return dc !== 'battery' && !id.includes('battery');
  });

  // 1. Contact & Entry Sensors
  const contactSensors = nonBatterySensors
    .filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      return (
        dc === 'door' ||
        dc === 'window' ||
        dc === 'garage_door' ||
        dc === 'opening' ||
        id.includes('contact') ||
        id.includes('door') ||
        id.includes('window')
      );
    })
    .map(matchAndAttachBattery);

  // 2. Motion & Presence Sensors
  const motionSensors = nonBatterySensors
    .filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      const isContact =
        dc === 'door' ||
        dc === 'window' ||
        dc === 'garage_door' ||
        dc === 'opening' ||
        id.includes('contact');
      if (isContact) return false;
      return (
        dc === 'motion' ||
        dc === 'occupancy' ||
        dc === 'presence' ||
        id.includes('motion') ||
        id.includes('occupancy') ||
        id.includes('presence')
      );
    })
    .map(matchAndAttachBattery);

  // 3. Safety & Hazard Sensors
  const hazardSensors = nonBatterySensors
    .filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      return (
        dc === 'moisture' ||
        dc === 'smoke' ||
        dc === 'gas' ||
        dc === 'carbon_monoxide' ||
        dc === 'safety' ||
        dc === 'problem' ||
        id.includes('leak') ||
        id.includes('smoke')
      );
    })
    .map(matchAndAttachBattery);

  // 4. Power & Energy Sensors
  const energySensors = nonBatterySensors
    .filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      return (
        dc === 'power' ||
        dc === 'energy' ||
        dc === 'current' ||
        dc === 'voltage' ||
        uom === 'w' ||
        uom === 'kw' ||
        uom === 'kwh' ||
        uom === 'v' ||
        uom === 'a' ||
        id.includes('power') ||
        id.includes('energy')
      );
    })
    .map(matchAndAttachBattery);

  // 5. Environmental Sensors
  const environmentalSensors = nonBatterySensors
    .filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      const name = (ent.name || '').toLowerCase();

      const isBattery =
        dc === 'battery' ||
        id.includes('battery') ||
        name.includes('battery') ||
        (uom === '%' && (id.includes('batt') || name.includes('batt')));
      if (isBattery) return false;

      const isContact =
        dc === 'door' ||
        dc === 'window' ||
        dc === 'garage_door' ||
        dc === 'opening' ||
        id.includes('contact');
      if (isContact) return false;
      const isMotion =
        dc === 'motion' ||
        dc === 'occupancy' ||
        dc === 'presence' ||
        id.includes('motion');
      if (isMotion) return false;
      const isHazard =
        dc === 'moisture' ||
        dc === 'smoke' ||
        dc === 'gas' ||
        dc === 'carbon_monoxide' ||
        id.includes('leak') ||
        id.includes('smoke');
      if (isHazard) return false;

      return (
        dc === 'temperature' ||
        dc === 'humidity' ||
        dc === 'illuminance' ||
        dc === 'carbon_dioxide' ||
        dc === 'aqi' ||
        dc === 'pm25' ||
        dc === 'pressure' ||
        uom.includes('°c') ||
        uom.includes('°f') ||
        (uom === '%' && (id.includes('humidity') || id.includes('hygro'))) ||
        uom === 'lx' ||
        uom === 'lux' ||
        uom === 'ppm' ||
        id.endsWith('_temperature') ||
        id.endsWith('_temp') ||
        id.includes('temperature_sensor') ||
        id.includes('humidity') ||
        id.includes('lux') ||
        id.includes('co2')
      );
    })
    .map(matchAndAttachBattery);

  // 6. Unclaimed standalone battery sensors (not paired to any host device)
  const unclaimedBatterySensors = rawBatterySensors.filter(
    (bs) => !claimedBatteryIds.has(bs.entity_id)
  );

  // 7. General Diagnostics
  const classified = new Set<string>();
  [
    ...contactSensors,
    ...motionSensors,
    ...hazardSensors,
    ...energySensors,
    ...environmentalSensors,
    ...rawBatterySensors
  ].forEach((e) => classified.add(e.entity_id));

  const generalSensors = rawSensors
    .filter((ent) => !classified.has(ent.entity_id))
    .map(matchAndAttachBattery);

  return {
    enrichedLights,
    enrichedSwitches,
    enrichedClimates,
    enrichedFans,
    enrichedLocks,
    enrichedCovers,
    enrichedVacuums,
    contactSensors,
    motionSensors,
    hazardSensors,
    energySensors,
    environmentalSensors,
    unclaimedBatterySensors,
    generalSensors
  };
}

export type EnrichedAreaEntities = ReturnType<typeof enrichAreaEntities>;
