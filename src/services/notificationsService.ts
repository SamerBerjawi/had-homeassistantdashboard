/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Consolidates Home Assistant updates, persistent notifications, repair issues and critical
 * telemetry alerts into one list. Each source lives in its own collector under ./notifications.
 */

import type { HANotificationItem } from '../types/notifications';
import { createNotificationContext, type ExtractNotificationsParams } from './notifications/context';
import { collectUpdateNotifications } from './notifications/updateNotifications';
import { collectPersistentNotifications } from './notifications/persistentNotifications';
import { collectRepairNotifications, collectRestartNotifications } from './notifications/repairNotifications';
import { collectHazardNotifications } from './notifications/hazardNotifications';
import { collectHaAlertNotifications, collectStoreAlertNotifications } from './notifications/alertNotifications';
import { sortNotifications } from './notifications/sortNotifications';

export { formatTimeAgo } from './notifications/formatTimeAgo';
export type { ExtractNotificationsParams } from './notifications/context';

/**
 * Extracts and consolidates all active Home Assistant updates, persistent notifications,
 * repair issues, and critical telemetry alerts. Order of collection matters: earlier collectors
 * claim ids in `seenIds`, so later ones skip duplicates.
 */
export function extractHANotifications(params: ExtractNotificationsParams): HANotificationItem[] {
  const ctx = createNotificationContext(params);
  collectUpdateNotifications(ctx);
  collectPersistentNotifications(ctx);
  collectRepairNotifications(ctx);
  collectRestartNotifications(ctx);
  collectHazardNotifications(ctx);
  collectHaAlertNotifications(ctx);
  collectStoreAlertNotifications(ctx);
  return sortNotifications(ctx.items);
}
