/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HA `alert.*` entities and alerts from the in-app alert store.
 */

import { useAlertStore } from '../../store/useAlertStore';
import { alertService } from '../alertService';
import type { NotificationSeverity, NotificationCategory } from '../../types/notifications';
import type { NotificationContext } from './context';

/** Section 5: Home Assistant native alerts. */
export function collectHaAlertNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

  // 5. HOME ASSISTANT NATIVE ALERTS (`alert.*` integration)
  const alertEntities = Object.values(states).filter(
    s => s.entity_id.startsWith('alert.') && s.state !== 'idle' && s.state !== 'off'
  );

  for (const ent of alertEntities) {
    if (seenIds.has(ent.entity_id) || dismissedSet.has(ent.entity_id)) continue;
    seenIds.add(ent.entity_id);

    const attrs = ent.attributes || {};
    const title = attrs.title || attrs.friendly_name || ent.entity_id;
    const message = attrs.message || 'Home Assistant alert is actively triggering.';
    const severityRaw = (attrs.severity || 'warning').toLowerCase();
    const severity: NotificationSeverity = 
      severityRaw === 'critical' ? 'critical' :
      severityRaw === 'error' ? 'error' : 'warning';
    const alertDomain = registryMap.get(ent.entity_id)?.platform;

    items.push({
      id: ent.entity_id,
      entity_id: ent.entity_id,
      category: 'alert',
      severity,
      title,
      message,
      domain: alertDomain,
      source: attrs.friendly_name || 'System Alert',
      createdAt: attrs.last_triggered || ent.last_updated || new Date().toISOString(),
      dismissable: true,
      actions: [
        {
          id: `ack_${ent.entity_id}`,
          label: 'Acknowledge',
          variant: 'primary' as const,
          onClick: async () => {
            await callHAService('alert', 'acknowledge', { entity_id: ent.entity_id }, { entity_id: ent.entity_id }).catch(() => {});
            dismissNotification(ent.entity_id);
            if (updateEntityState) {
              updateEntityState(ent.entity_id, 'off', { acknowledged: true });
            }
          }
        },
        {
          id: `dismiss_${ent.entity_id}`,
          label: 'Dismiss',
          variant: 'ghost' as const,
          onClick: () => {
            dismissNotification(ent.entity_id);
          }
        }
      ],
      onDismiss: async () => {
        await callHAService('alert', 'acknowledge', { entity_id: ent.entity_id }, { entity_id: ent.entity_id }).catch(() => {});
        dismissNotification(ent.entity_id);
      }
    });
  }
}

/** Section 6: real-time alerts from the alert store. */
export function collectStoreAlertNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

  // 6. REAL-TIME ALERTS & DISPATCHES FROM ALERT STORE
  const effectiveStoreAlerts = storeAlerts || (typeof useAlertStore !== 'undefined' ? useAlertStore.getState().alerts : []);
  for (const alert of effectiveStoreAlerts) {
    const alertId = alert.id;
    const haNotifId = alert.haNotificationId;
    if (seenIds.has(alertId) || (haNotifId && seenIds.has(haNotifId)) || (haNotifId && seenIds.has(`persistent_notification.${haNotifId}`))) continue;
    if (dismissedSet.has(alertId) || (haNotifId && dismissedSet.has(haNotifId))) continue;
    seenIds.add(alertId);
    if (haNotifId) seenIds.add(haNotifId);

    const severity: NotificationSeverity = 
      alert.severity === 'critical' ? 'critical' :
      alert.severity === 'warning' ? 'warning' : 'info';

    const category: NotificationCategory = 
      alert.category === 'persistent_notification' ? 'persistent_notification' :
      alert.category === 'hazard' ? 'hazard' :
      alert.category === 'security' ? 'security' :
      alert.category === 'appliance' ? 'appliance' :
      alert.category === 'update' ? 'update' : 'alert';

    const storeAlertDomain = alert.entityId ? registryMap.get(alert.entityId)?.platform : undefined;

    items.push({
      id: alertId,
      entity_id: alert.entityId,
      category,
      severity,
      title: alert.title,
      message: alert.message,
      image: (alert as any).imageUrl,
      domain: storeAlertDomain,
      source: alert.entityId ? 'Device Alert' : 'System',
      createdAt: (alert as any).createdAt || new Date(alert.timestamp).toISOString(),
      timestamp: alert.timestamp,
      dismissable: true,
      actions: [
        {
          id: `dismiss_${alertId}`,
          label: 'Dismiss',
          variant: 'secondary' as const,
          onClick: async () => {
            await alertService.dismissAlert(alertId, alert.haNotificationId).catch(() => {});
            dismissNotification(alertId);
          }
        }
      ],
      onDismiss: async () => {
        await alertService.dismissAlert(alertId, alert.haNotificationId).catch(() => {});
        dismissNotification(alertId);
      }
    });
  }
}
