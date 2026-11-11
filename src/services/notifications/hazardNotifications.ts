/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Critical sensor notifications: leaks, smoke/CO, low battery, problem and tamper sensors.
 */

import { isLeakSensor, isBatteryEntity } from '../../lib/entityClassifiers';
import type { ResolvedEntity } from '../../types';
import type { NotificationContext } from './context';

/** Section 4. */
export function collectHazardNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

  // 4. CRITICAL SENSORS & HAZARDS (Moisture, Smoke, Critical Battery)
  const binarySensors = domainGroups['binary_sensor'] || [];
  
  // Water leaks (strictly indoor leak detectors, excludes rain & weather sensors)
  const leakSensors = binarySensors.filter(
    b => isLeakSensor(b) && (b.state === 'on' || b.state === 'wet' || b.state === 'detected')
  );
  for (const leak of leakSensors) {
    const leakDomain = registryMap.get(leak.entity_id)?.platform;
    items.push({
      id: `alert_leak_${leak.entity_id}`,
      entity_id: leak.entity_id,
      category: 'hazard',
      severity: 'critical',
      title: `Water Leak: ${leak.name}`,
      message: `Moisture detected in ${leak.area?.name || 'Home'}. Immediate inspection recommended to prevent water damage.`,
      areaName: leak.area?.name,
      sensorType: 'leak',
      domain: leakDomain,
      source: leak.area?.name || 'Water Sensor',
      createdAt: leak.attributes.last_triggered || new Date().toISOString(),
      dismissable: false
    });
  }

  // Smoke / Fire / CO
  const smokeSensors = binarySensors.filter(
    b => (b.attributes.device_class === 'smoke' || b.attributes.device_class === 'gas' || b.attributes.device_class === 'carbon_monoxide' || b.entity_id.includes('smoke')) &&
         (b.state === 'on' || b.state === 'detected' || b.state === 'smoke')
  );
  for (const smoke of smokeSensors) {
    const smokeDomain = registryMap.get(smoke.entity_id)?.platform;
    items.push({
      id: `alert_smoke_${smoke.entity_id}`,
      entity_id: smoke.entity_id,
      category: 'hazard',
      severity: 'critical',
      title: `Smoke/Gas: ${smoke.name}`,
      message: `Hazardous environment detected in ${smoke.area?.name || 'Home'}. Ensure immediate safety and ventilation.`,
      areaName: smoke.area?.name,
      sensorType: 'smoke',
      domain: smokeDomain,
      source: smoke.area?.name || 'Smoke Detector',
      createdAt: smoke.attributes.last_triggered || new Date().toISOString(),
      dismissable: false
    });
  }

  // Dynamically index mobile assets/trackers and mains-powered grid/energy hardware
  const mobileTrackerDeviceIds = new Set<string>();
  const mainsPowerDeviceIds = new Set<string>();

  for (const [eid, reg] of registryMap.entries()) {
    if (eid.startsWith('device_tracker.') && reg.device_id) {
      mobileTrackerDeviceIds.add(reg.device_id);
    }
  }

  for (const [eid, st] of Object.entries(states)) {
    const dc = String(st.attributes?.device_class || '').toLowerCase().trim();
    const uom = String(st.attributes?.unit_of_measurement || '').toLowerCase().trim();
    if (
      dc === 'power' || dc === 'energy' || dc === 'apparent_power' || dc === 'reactive_power' ||
      uom === 'w' || uom === 'kw' || uom === 'mw' || uom === 'kwh' || uom === 'wh'
    ) {
      const reg = registryMap.get(eid);
      if (reg?.device_id) {
        mainsPowerDeviceIds.add(reg.device_id);
      }
    }
  }

  // Critical Battery (<15%)
  const allResolved = Object.values(domainGroups).flat();
  // Filter only entities that legitimately represent a battery or battery-operated device
  // and deduplicate by device so each physical device produces at most ONE notification.
  const lowBatteryDevices = new Map<string, { entity: ResolvedEntity; batteryPct: number; allEntities: ResolvedEntity[] }>();

  for (const e of allResolved) {
    if (typeof e.batteryPct !== 'number' || e.batteryPct > 15 || e.batteryPct < 0) continue;
    if (!isBatteryEntity(e)) continue;

    // Disqualify mobile devices, person trackers, vehicles, and stationary energy/power hardware
    if (e.domain === 'person' || e.domain === 'device_tracker') continue;
    if (e.device_id && (mobileTrackerDeviceIds.has(e.device_id) || mainsPowerDeviceIds.has(e.device_id))) continue;

    // For sensors without a parent device: must be strictly device_class 'battery' with '%' unit
    if (e.domain === 'sensor') {
      const dc = String(e.attributes?.device_class || '').toLowerCase().trim();
      const uom = String(e.attributes?.unit_of_measurement || '').toLowerCase().trim();
      if (dc !== 'battery' || uom !== '%') continue;
    }

    const deviceKey = e.device_id || e.entity_id;
    const existing = lowBatteryDevices.get(deviceKey);

    if (!existing) {
      lowBatteryDevices.set(deviceKey, { entity: e, batteryPct: e.batteryPct, allEntities: [e] });
    } else {
      existing.allEntities.push(e);
      // Prefer dedicated battery sensors or primary hardware actuators
      const isCurrentDedicated = e.domain === 'sensor' && (e.attributes?.device_class === 'battery' || e.entity_id.includes('battery'));
      const isExistingDedicated = existing.entity.domain === 'sensor' && (existing.entity.attributes?.device_class === 'battery' || existing.entity.entity_id.includes('battery'));

      if (isCurrentDedicated && !isExistingDedicated) {
        existing.entity = e;
        existing.batteryPct = e.batteryPct;
      }
    }
  }

  // Sort lowest battery first and take top 3
  const sortedLowBattery = Array.from(lowBatteryDevices.entries())
    .sort((a, b) => a[1].batteryPct - b[1].batteryPct);

  for (const [deviceKey, { entity: bat, batteryPct, allEntities }] of sortedLowBattery) {
    const notifId = `battery_${deviceKey}`;

    // Skip if dismissed under any related identifier
    const isDismissed =
      dismissedSet.has(notifId) ||
      dismissedSet.has(`battery_${bat.entity_id}`) ||
      (bat.device_id && dismissedSet.has(`battery_${bat.device_id}`)) ||
      allEntities.some(ent => dismissedSet.has(`battery_${ent.entity_id}`));

    if (isDismissed) continue;

    const deviceName = bat.device?.name_by_user || bat.device?.name;
    let displayName = bat.name;
    const lowerName = (bat.name || '').toLowerCase().trim();

    if ((lowerName === 'battery' || lowerName === 'battery level' || lowerName === 'level') && deviceName) {
      displayName = deviceName;
    } else if (deviceName && !lowerName.includes(deviceName.toLowerCase())) {
      displayName = `${deviceName} (${bat.name})`;
    }

    const batDomain = registryMap.get(bat.entity_id)?.platform;
    items.push({
      id: notifId,
      entity_id: bat.entity_id,
      category: 'battery',
      severity: 'warning',
      title: `${displayName} (${batteryPct}%)`,
      message: `${deviceName || displayName} battery is critically low at ${batteryPct}%. Please replace or charge soon.`,
      areaName: bat.area?.name,
      batteryLevel: batteryPct,
      sensorType: 'battery',
      domain: batDomain,
      source: bat.area?.name || 'Battery Sensor',
      createdAt: new Date().toISOString(),
      dismissable: true,
      onDismiss: () => {
        dismissNotification(notifId);
        dismissNotification(`battery_${bat.entity_id}`);
        if (bat.device_id) {
          dismissNotification(`battery_${bat.device_id}`);
        }
        for (const ent of allEntities) {
          dismissNotification(`battery_${ent.entity_id}`);
        }
      }
    });

    if (items.filter(i => i.category === 'battery').length >= 3) {
      break;
    }
  }

  // Problem & Tamper binary sensors
  const problemSensors = binarySensors.filter(
    b => (b.attributes.device_class === 'problem' || b.attributes.device_class === 'tamper') &&
         (b.state === 'on' || b.state === 'problem' || b.state === 'tampered')
  );
  for (const prob of problemSensors) {
    const notifId = `alert_prob_${prob.entity_id}`;
    if (seenIds.has(notifId) || dismissedSet.has(notifId)) continue;
    seenIds.add(notifId);

    const isTamper = prob.attributes.device_class === 'tamper' || prob.state === 'tampered';
    const probDomain = registryMap.get(prob.entity_id)?.platform;

    items.push({
      id: notifId,
      entity_id: prob.entity_id,
      category: isTamper ? 'security' : 'hazard',
      severity: 'warning',
      title: isTamper ? `Tamper Warning: ${prob.name}` : `Hardware Fault: ${prob.name}`,
      message: isTamper
        ? `Tamper sensor triggered on ${prob.name} in ${prob.area?.name || 'Home'}.`
        : `Diagnostic problem detected on ${prob.name}. Review device state and logs.`,
      areaName: prob.area?.name,
      domain: probDomain,
      source: prob.area?.name || 'Diagnostic',
      createdAt: prob.attributes.last_triggered || new Date().toISOString(),
      dismissable: true,
      onDismiss: () => {
        dismissNotification(notifId);
        dismissNotification(prob.entity_id);
      }
    });
  }
}
