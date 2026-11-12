/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistent notifications from the HA WebSocket and entity states.
 */

import type { NotificationContext } from './context';

/** Section 2. */
export function collectPersistentNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

  // 2. NATIVE PERSISTENT NOTIFICATIONS (From WS `persistent_notification/get` + Entity States)
  // First, ingest native WS persistent notifications
  const allNativePersistent = [...nativeNotifications, ...nativePersistentNotifications];
  for (const notif of allNativePersistent) {

    const notifId = notif.notification_id || `ha_notif_${notif.title || ''}`;
    if (seenIds.has(notifId) || dismissedSet.has(notifId)) continue;
    seenIds.add(notifId);

    const title = notif.title || 'Home Assistant Notification';
    const message = notif.message || 'Notification received from Home Assistant.';
    const createdAt = notif.created_at || new Date().toISOString();
    const isRestartNotif = title.toLowerCase().includes('restart') || 
      message.toLowerCase().includes('restart') || 
      title.toLowerCase().includes('reboot') || 
      message.toLowerCase().includes('reboot');

    const domain = (notif as typeof notif & { domain?: string }).domain || (isRestartNotif ? 'homeassistant' : undefined);
    const source = (notif as typeof notif & { source?: string }).source || (isRestartNotif ? 'Home Assistant' : undefined);

    items.push({
      id: notifId,
      entity_id: `persistent_notification.${notifId}`,
      category: isRestartNotif ? 'restart' : 'persistent_notification',
      severity: isRestartNotif ? 'warning' : 'info',
      title,
      message,
      domain,
      source,
      createdAt,
      dismissable: true,
      actions: [
        ...(isRestartNotif ? [
          {
            id: `restart_${notifId}`,
            label: 'Restart Now',
            variant: 'primary' as const,
            onClick: async () => {
              await callHAService('homeassistant', 'restart', {}).catch(() => {});
              await callHAService('persistent_notification', 'dismiss', { notification_id: notif.notification_id }).catch(() => {});
              dismissNotification(notifId);
            }
          }
        ] : []),
        {
          id: 'dismiss',
          label: 'Dismiss',
          variant: 'secondary' as const,
          onClick: async () => {
            await callHAService('persistent_notification', 'dismiss', { notification_id: notif.notification_id });
            dismissNotification(notifId);
          }
        }
      ],
      onDismiss: async () => {
        await callHAService('persistent_notification', 'dismiss', { notification_id: notif.notification_id });
        dismissNotification(notifId);
      }
    });
  }

  // Next, ingest any persistent notifications in states registry
  const persistentNotifications = Object.values(states).filter(
    s => s.entity_id.startsWith('persistent_notification.') && s.state !== 'dismissed'
  );

  for (const notif of persistentNotifications) {
    const notifId = notif.attributes.notification_id || notif.entity_id;
    if (seenIds.has(notifId) || seenIds.has(notif.entity_id) || dismissedSet.has(notifId) || dismissedSet.has(notif.entity_id)) continue;
    seenIds.add(notifId);
    seenIds.add(notif.entity_id);

    const title = notif.attributes.title || notif.attributes.friendly_name || 'Home Assistant Notification';
    const message = notif.attributes.message || 'System notification received.';
    const image = notif.attributes.data?.image || notif.attributes.image || notif.attributes.entity_picture || notif.attributes.image_url;
    const createdAt = notif.attributes.created_at || notif.last_updated;
    const isRestartNotif = title.toLowerCase().includes('restart') || 
      message.toLowerCase().includes('restart') || 
      title.toLowerCase().includes('reboot') || 
      message.toLowerCase().includes('reboot');
    const domain = notif.attributes.domain || (isRestartNotif ? 'homeassistant' : undefined);
    const source = notif.attributes.domain || (isRestartNotif ? 'Home Assistant' : undefined);

    items.push({
      id: notifId,
      entity_id: notif.entity_id,
      category: isRestartNotif ? 'restart' : 'persistent_notification',
      severity: isRestartNotif ? 'warning' : 'info',
      title,
      message,
      image,
      domain,
      source,
      createdAt,
      dismissable: true,
      actions: [
        ...(isRestartNotif ? [
          {
            id: `restart_${notifId}`,
            label: 'Restart Now',
            variant: 'primary' as const,
            onClick: async () => {
              await callHAService('homeassistant', 'restart', {}).catch(() => {});
              await callHAService('persistent_notification', 'dismiss', { notification_id: notifId }).catch(() => {});
              dismissNotification(notifId);
              dismissNotification(notif.entity_id);
            }
          }
        ] : []),
        {
          id: 'dismiss',
          label: 'Dismiss',
          variant: 'secondary' as const,
          onClick: async () => {
            await callHAService('persistent_notification', 'dismiss', { notification_id: notifId });
            dismissNotification(notifId);
            dismissNotification(notif.entity_id);
            if (updateEntityState) {
              updateEntityState(notif.entity_id, 'dismissed');
            }
          }
        }
      ],
      onDismiss: async () => {
        await callHAService('persistent_notification', 'dismiss', { notification_id: notifId });
        dismissNotification(notifId);
        dismissNotification(notif.entity_id);
        if (updateEntityState) {
          updateEntityState(notif.entity_id, 'dismissed');
        }
      }
    });
  }
}
