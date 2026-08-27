/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized Home Assistant entity and binary sensor classification utilities.
 */

import { ResolvedEntity } from '../types';

export function isDoorSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'door' ||
    dc === 'garage_door' ||
    e.entity_id.includes('door') ||
    e.entity_id.includes('garage') ||
    e.entity_id.includes('gate')
  );
}

export function isWindowSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return dc === 'window' || e.entity_id.includes('window');
}

export function isMotionSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'motion' ||
    dc === 'occupancy' ||
    dc === 'presence' ||
    e.entity_id.includes('motion') ||
    e.entity_id.includes('occupancy') ||
    e.entity_id.includes('presence')
  );
}

export function isLeakSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'moisture' ||
    dc === 'water' ||
    e.entity_id.includes('leak') ||
    e.entity_id.includes('flood') ||
    e.entity_id.includes('moisture')
  );
}

export function isSmokeSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  const dc = e.attributes?.device_class;
  return (
    dc === 'smoke' ||
    dc === 'gas' ||
    dc === 'carbon_monoxide' ||
    e.entity_id.includes('smoke') ||
    e.entity_id.includes('co_detector') ||
    e.entity_id.includes('gas')
  );
}

export function isOtherContactSensor(e: { attributes?: Record<string, any>; entity_id: string }): boolean {
  if (isDoorSensor(e) || isWindowSensor(e) || isMotionSensor(e) || isLeakSensor(e) || isSmokeSensor(e)) {
    return false;
  }
  const dc = e.attributes?.device_class;
  return (
    dc === 'opening' ||
    dc === 'safety' ||
    dc === 'tamper' ||
    dc === 'lock' ||
    e.entity_id.includes('contact') ||
    e.entity_id.includes('safe') ||
    e.entity_id.includes('cabinet') ||
    e.entity_id.includes('mailbox')
  );
}

export interface ClassifiedBinarySensors {
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  motionSensors: ResolvedEntity[];
  leakSensors: ResolvedEntity[];
  smokeSensors: ResolvedEntity[];
  otherContactSensors: ResolvedEntity[];
}

/**
 * Classifies a list of binary sensors in a single pass.
 */
export function classifyBinarySensors(binarySensors: ResolvedEntity[]): ClassifiedBinarySensors {
  const doorSensors: ResolvedEntity[] = [];
  const windowSensors: ResolvedEntity[] = [];
  const motionSensors: ResolvedEntity[] = [];
  const leakSensors: ResolvedEntity[] = [];
  const smokeSensors: ResolvedEntity[] = [];
  const otherContactSensors: ResolvedEntity[] = [];

  for (const sensor of binarySensors) {
    if (isDoorSensor(sensor)) {
      doorSensors.push(sensor);
    } else if (isWindowSensor(sensor)) {
      windowSensors.push(sensor);
    } else if (isMotionSensor(sensor)) {
      motionSensors.push(sensor);
    } else if (isLeakSensor(sensor)) {
      leakSensors.push(sensor);
    } else if (isSmokeSensor(sensor)) {
      smokeSensors.push(sensor);
    } else if (isOtherContactSensor(sensor)) {
      otherContactSensors.push(sensor);
    }
  }

  return {
    doorSensors,
    windowSensors,
    motionSensors,
    leakSensors,
    smokeSensors,
    otherContactSensors
  };
}
