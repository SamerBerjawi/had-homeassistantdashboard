/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HANotificationItem, NotificationCategory, NotificationSeverity } from '../../types/notifications';

/** Sort order under "All": critical first, then by category rank, then by severity. */
export function sortNotifications(items: HANotificationItem[]): HANotificationItem[] {
  // 7. SORT ORDER UNDER "ALL":
  // 1. Hazard / Emergency
  // 2. Issues / Repairs
  // 3. Alerts
  // 4. Messages (Persistent Notifications)
  // 5. Software Updates
  // 6. Security & Appliances
  // 7. Battery
  const categoryRank: Record<NotificationCategory, number> = {
    hazard: 1,
    restart: 2,
    repair: 3,
    alert: 4,
    persistent_notification: 5,
    update: 6,
    security: 7,
    appliance: 8,
    battery: 9
  };

  const severityScore: Record<NotificationSeverity, number> = {
    critical: 5,
    error: 4,
    warning: 3,
    update: 2,
    info: 1
  };

  return items.sort((a, b) => {
    // Critical first regardless of category
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;

    const rankA = categoryRank[a.category] ?? 99;
    const rankB = categoryRank[b.category] ?? 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    // Sub-sort by priority severity
    return severityScore[b.severity] - severityScore[a.severity];
  });
}
