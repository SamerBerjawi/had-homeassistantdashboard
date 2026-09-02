/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Event & Alert Interception Pipeline
 * Monitors real-time Home Assistant WebSocket events, critical state changes,
 * and persistent notifications, dispatching alerts to useAlertStore.
 */

import { HAState, ResolvedEntity } from '../types';
import { HANativePersistentNotification } from '../types/notifications';
import { useAlertStore } from '../store/useAlertStore';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { haWebSocketService } from './haWebSocket';

// State transition history tracking to avoid duplicate alerts
const previousStateCache = new Map<string, { state: string; timestamp: number }>();
const debounceTimestamps = new Map<string, number>();

// Critical hazard device classes
const CRITICAL_DEVICE_CLASSES = new Set([
  'smoke',
  'gas',
  'carbon_monoxide',
  'co',
  'moisture',
  'safety'
]);

// Audio synthesizer for hazard alert chime
function playCriticalAlertBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // 3 warning pulse tones
    [0, 0.2, 0.4].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
  } catch {}
}

export class AlertService {
  private isInitialized = false;

  /**
   * Initializes WebSocket subscriptions and listeners
   */
  public initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to initial native notifications loaded from HA
    const initialNative = useAutoLayoutStore.getState().nativeNotifications;
    if (initialNative && initialNative.length > 0) {
      this.syncNativePersistentNotifications(initialNative);
    }
  }

  /**
   * Syncs initial array of persistent notifications from Home Assistant backend
   */
  public syncNativePersistentNotifications(notifications: HANativePersistentNotification[]) {
    if (!Array.isArray(notifications)) return;

    notifications.forEach((pn) => {
      const id = `pn_${pn.notification_id}`;
      useAlertStore.getState().addAlert({
        id,
        title: pn.title || 'Persistent Notification',
        message: pn.message || '',
        severity: 'info',
        category: 'persistent_notification',
        haNotificationId: pn.notification_id
      });
    });
  }

  /**
   * Evaluates state_changed event from HA WebSocket
   */
  public evaluateStateChange(entityId: string, newState: HAState, oldState?: HAState) {
    if (!entityId || !newState) return;

    const previousCached = previousStateCache.get(entityId);
    const oldStateStr = oldState?.state || previousCached?.state;
    const newStateStr = newState.state;

    // Update state cache
    previousStateCache.set(entityId, {
      state: newStateStr,
      timestamp: Date.now()
    });

    // If state hasn't changed or entity is unavailable/unknown, skip
    if (oldStateStr === newStateStr) return;
    if (newStateStr === 'unavailable' || newStateStr === 'unknown') return;

    // Ignore transitions during the very first hydration tick unless it's a critical hazard
    const isFirstKnownState = !oldStateStr;

    // Retrieve area and entity details from store if available
    const resolvedEntity: ResolvedEntity | undefined = 
      useAutoLayoutStore.getState().resolvedEntities?.[entityId];
    const areaName = resolvedEntity?.area?.name || '';
    const friendlyName = newState.attributes?.friendly_name || resolvedEntity?.name || entityId;
    const deviceClass = String(newState.attributes?.device_class || '').toLowerCase();

    // =========================================================================
    // 1. Persistent Notifications (persistent_notification.*)
    // =========================================================================
    if (entityId.startsWith('persistent_notification.')) {
      if (newStateStr !== 'not_notifying') {
        const notifId = newState.attributes?.notification_id || entityId.replace('persistent_notification.', '');
        const alertId = `pn_${notifId}`;
        const title = newState.attributes?.title || 'System Notification';
        const message = newState.attributes?.message || friendlyName;

        useAlertStore.getState().addAlert({
          id: alertId,
          title,
          message,
          severity: 'info',
          category: 'persistent_notification',
          haNotificationId: notifId
        });

        useAlertStore.getState().addToast({
          id: alertId,
          title,
          message,
          severity: 'info',
          category: 'persistent_notification',
          haNotificationId: notifId,
          durationMs: 6000
        });
      }
      return;
    }

    // =========================================================================
    // 2. Critical Hazards (Smoke, Gas, CO, Moisture, Safety, Alarm)
    // =========================================================================
    const isCriticalSensor = CRITICAL_DEVICE_CLASSES.has(deviceClass);
    const isAlarmTriggered = entityId.startsWith('alarm_control_panel.') && newStateStr === 'triggered';

    if ((isCriticalSensor && (newStateStr === 'on' || newStateStr === 'problem')) || isAlarmTriggered) {
      // Debounce critical alerts to once every 10 seconds per entity
      const lastTrigger = debounceTimestamps.get(entityId) || 0;
      if (Date.now() - lastTrigger < 10000) return;
      debounceTimestamps.set(entityId, Date.now());

      let sensorType: 'smoke' | 'gas' | 'co' | 'moisture' | 'safety' | 'alarm' | 'hazard' = 'hazard';
      let hazardTitle = '⚠️ CRITICAL ALERT';

      if (deviceClass === 'smoke') {
        sensorType = 'smoke';
        hazardTitle = '🔥 SMOKE DETECTED';
      } else if (deviceClass === 'gas') {
        sensorType = 'gas';
        hazardTitle = '⚠️ GAS LEAK DETECTED';
      } else if (deviceClass === 'carbon_monoxide' || deviceClass === 'co') {
        sensorType = 'co';
        hazardTitle = '☣️ CARBON MONOXIDE DETECTED';
      } else if (deviceClass === 'moisture') {
        sensorType = 'moisture';
        hazardTitle = '💧 WATER LEAK DETECTED';
      } else if (deviceClass === 'safety') {
        sensorType = 'safety';
        hazardTitle = '🚨 SAFETY HAZARD TRIGGERED';
      } else if (isAlarmTriggered) {
        sensorType = 'alarm';
        hazardTitle = '🚨 INTRUSION ALARM TRIGGERED';
      }

      const alertMessage = areaName 
        ? `${friendlyName} has detected a hazard in ${areaName}!`
        : `${friendlyName} has been triggered!`;

      // Play chime
      playCriticalAlertBeep();

      // Trigger full-screen critical modal & toast
      useAlertStore.getState().triggerCriticalAlert({
        entityId,
        title: hazardTitle,
        message: alertMessage,
        sensorType,
        areaName
      });

      return;
    }

    // Skip non-critical toasts during initial load
    if (isFirstKnownState) return;

    // =========================================================================
    // 3. Notable Real-Time Transient Events
    // =========================================================================
    
    // A. Door Locks (lock.*)
    if (entityId.startsWith('lock.')) {
      if (oldStateStr === 'locked' && newStateStr === 'unlocked') {
        useAlertStore.getState().addToast({
          title: `🔓 ${friendlyName} Unlocked`,
          message: areaName ? `Unlocked in ${areaName}` : 'Door lock opened',
          severity: 'warning',
          category: 'security',
          entityId,
          areaName,
          durationMs: 5000
        });
      } else if (oldStateStr === 'unlocked' && newStateStr === 'locked') {
        useAlertStore.getState().addToast({
          title: `🔒 ${friendlyName} Locked`,
          message: areaName ? `Secured in ${areaName}` : 'Door lock engaged',
          severity: 'info',
          category: 'security',
          entityId,
          areaName,
          durationMs: 4000
        });
      }
      return;
    }

    // B. Entry Doors & Windows (binary_sensor with door / window / opening)
    if (
      entityId.startsWith('binary_sensor.') &&
      (deviceClass === 'door' || deviceClass === 'garage_door' || deviceClass === 'window' || deviceClass === 'opening')
    ) {
      if (oldStateStr === 'off' && newStateStr === 'on') {
        const iconPrefix = deviceClass === 'window' ? '🪟' : deviceClass === 'garage_door' ? '🚗' : '🚪';
        useAlertStore.getState().addToast({
          title: `${iconPrefix} ${friendlyName} Opened`,
          message: areaName ? `Located in ${areaName}` : 'Entry contact opened',
          severity: 'info',
          category: 'security',
          entityId,
          areaName,
          durationMs: 4500
        });
      }
      return;
    }

    // C. Garage Doors / Covers (cover.*)
    if (entityId.startsWith('cover.') && (deviceClass === 'garage' || entityId.includes('garage') || friendlyName.toLowerCase().includes('garage'))) {
      if (oldStateStr === 'closed' && newStateStr === 'open') {
        useAlertStore.getState().addToast({
          title: `🚗 ${friendlyName} Opened`,
          message: areaName ? `Garage door opened in ${areaName}` : 'Cover is fully open',
          severity: 'warning',
          category: 'security',
          entityId,
          areaName,
          durationMs: 5000
        });
      }
      return;
    }

    // D. Appliances / Laundry (washer, dryer, dishwasher cycle finished)
    const lowerEid = entityId.toLowerCase();
    const lowerName = friendlyName.toLowerCase();
    const isAppliance = 
      lowerEid.includes('washer') || 
      lowerEid.includes('dryer') || 
      lowerEid.includes('laundry') || 
      lowerEid.includes('dishwasher') ||
      lowerName.includes('washer') ||
      lowerName.includes('dryer') ||
      lowerName.includes('laundry') ||
      lowerName.includes('dishwasher');

    if (isAppliance) {
      const wasRunning = oldStateStr === 'on' || oldStateStr === 'running' || oldStateStr === 'active';
      const isNowDone = newStateStr === 'off' || newStateStr === 'idle' || newStateStr === 'finished' || newStateStr === 'ready';

      if (wasRunning && isNowDone) {
        useAlertStore.getState().addToast({
          title: `🧺 ${friendlyName} Finished`,
          message: areaName ? `Cycle complete in ${areaName}. Ready to unload.` : 'Cycle finished.',
          severity: 'info',
          category: 'appliance',
          entityId,
          areaName,
          durationMs: 6000
        });
      }
      return;
    }
  }

  /**
   * Action Dispatcher: Dismisses an alert and invokes HA backend service
   */
  public async dismissAlert(id: string, haNotificationId?: string) {
    await useAlertStore.getState().dismissAlert(id, haNotificationId);
  }
}

export const alertService = new AlertService();
