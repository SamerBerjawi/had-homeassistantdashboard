/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  HANotificationItem, 
  NotificationSeverity, 
  NotificationCategory,
  HANotificationAction,
  HANativePersistentNotification, 
  HANativeRepairIssue 
} from '../types/notifications';

import { ResolvedEntity, HAState } from '../types';

export interface ExtractNotificationsParams {
  domainGroups: Record<string, ResolvedEntity[]>;
  states: Record<string, HAState>;
  nativeNotifications?: HANativePersistentNotification[];
  nativePersistentNotifications?: HANativePersistentNotification[];
  nativeRepairs?: HANativeRepairIssue[];
  dismissedNotificationIds: string[];
  callHAService: (domain: string, service: string, serviceData?: Record<string, any>, target?: any) => Promise<void>;
  dismissNotification: (id: string) => void;
  updateEntityState?: (entityId: string, newState: string, newAttributes?: Record<string, any>) => void;
  installUpdate?: (entityId: string) => Promise<void>;
  skipUpdate?: (entityId: string) => Promise<void>;
  clearSkippedUpdate?: (entityId: string) => Promise<void>;
}




export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';
    
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Just now';
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

/**
 * Extracts and consolidates all active Home Assistant updates, persistent notifications,
 * repair issues, and critical telemetry alerts.
 */
export function extractHANotifications({
  domainGroups,
  states,
  nativeNotifications = [],
  nativePersistentNotifications = [],
  nativeRepairs = [],
  dismissedNotificationIds = [],
  callHAService,
  dismissNotification,
  updateEntityState,
  installUpdate,
  skipUpdate,
  clearSkippedUpdate
}: ExtractNotificationsParams): HANotificationItem[] {

  const items: HANotificationItem[] = [];
  const dismissedSet = new Set(dismissedNotificationIds);
  const seenIds = new Set<string>();

  // 1. SOFTWARE & FIRMWARE UPDATES (`update.*`)
  const updateEntities = [
    ...(domainGroups['update'] || []),
    ...Object.values(states)
      .filter(s => s.entity_id.startsWith('update.'))
      .map(s => ({
        entity_id: s.entity_id,
        domain: 'update',
        name: s.attributes.friendly_name || s.attributes.title || s.entity_id,
        state: s.state,
        attributes: s.attributes,
        area_id: null,
        device_id: null,
        floor_id: null,
        device: null,
        area: null,
        floor: null,
        resolutionSource: 'unassigned' as const,
        entity_category: null,
        disabled_by: null,
        hidden: false,
        isDiagnostic: false,
        powerWatts: 0,
        labels: []
      }))
  ];

  // Deduplicate by entity_id
  const seenUpdates = new Set<string>();
  for (const ent of updateEntities) {
    if (seenUpdates.has(ent.entity_id)) continue;
    seenUpdates.add(ent.entity_id);

    const isDismissed = dismissedSet.has(ent.entity_id);
    if (isDismissed) continue;

    const liveState = states[ent.entity_id] || { state: ent.state, attributes: ent.attributes };
    const attrs = liveState.attributes || {};
    const hasUpdateAvailable = liveState.state === 'on' || (attrs.latest_version && attrs.latest_version !== attrs.installed_version);
    const inProgress = Boolean(attrs.in_progress) || liveState.state === 'installing';
    const isSkipped = Boolean(attrs.skipped_version);

    if (hasUpdateAvailable || inProgress || isSkipped) {
      const installedVer = attrs.installed_version || '1.0.0';
      const latestVer = attrs.latest_version || '1.0.1';
      const title = attrs.title || attrs.friendly_name || ent.name;
      const releaseSummary = attrs.release_summary || '';
      const releaseUrl = attrs.release_url;

      seenIds.add(ent.entity_id);

      items.push({
        id: ent.entity_id,
        entity_id: ent.entity_id,
        category: 'update',
        severity: 'update',
        title: inProgress ? `Installing: ${title}` : isSkipped ? `Skipped: ${title}` : title,
        message: inProgress 
          ? `Installing update to version ${latestVer}... Please do not reboot your system.` 
          : releaseSummary,
        installedVersion: installedVer,
        latestVersion: latestVer,
        releaseSummary,
        releaseUrl,
        inProgress,
        updatePercentage: typeof attrs.update_percentage === 'number' ? attrs.update_percentage : undefined,
        skippedVersion: attrs.skipped_version || null,
        autoUpdate: Boolean(attrs.auto_update),
        createdAt: attrs.release_date || (liveState as HAState).last_updated || new Date().toISOString(),
        dismissable: true,

        actions: [
          ...(inProgress ? [] : isSkipped ? [
            {
              id: 'unskip',
              label: 'Unskip Update',
              variant: 'secondary' as const,
              onClick: async () => {
                if (clearSkippedUpdate) {
                  await clearSkippedUpdate(ent.entity_id);
                } else {
                  await callHAService('update', 'clear_skipped', { entity_id: ent.entity_id }, { entity_id: ent.entity_id });
                  if (updateEntityState) {
                    updateEntityState(ent.entity_id, 'on', { skipped_version: null });
                  }
                }
              }
            }
          ] : [
            {
              id: 'install',
              label: 'Install Now',
              variant: 'primary' as const,
              onClick: async () => {
                if (installUpdate) {
                  await installUpdate(ent.entity_id);
                } else {
                  if (updateEntityState) {
                    updateEntityState(ent.entity_id, 'installing', { in_progress: true, update_percentage: 20 });
                  }
                  await callHAService('update', 'install', { backup: false, entity_id: ent.entity_id }, { entity_id: ent.entity_id });
                }
              }
            },
            {
              id: 'skip',
              label: 'Skip Version',
              variant: 'ghost' as const,
              onClick: async () => {
                if (skipUpdate) {
                  await skipUpdate(ent.entity_id);
                } else {
                  await callHAService('update', 'skip', { entity_id: ent.entity_id }, { entity_id: ent.entity_id });
                  if (updateEntityState) {
                    updateEntityState(ent.entity_id, 'off', { skipped_version: latestVer });
                  }
                }
              }
            }
          ]),

          ...(releaseUrl ? [
            {
              id: 'release_notes',
              label: 'Release Notes',
              variant: 'ghost' as const,
              onClick: () => {
                if (typeof window !== 'undefined') {
                  window.open(releaseUrl, '_blank', 'noopener,noreferrer');
                }
              }
            }
          ] : [])
        ],
        onDismiss: () => {
          dismissNotification(ent.entity_id);
        }
      });
    }
  }

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

    items.push({
      id: notifId,
      entity_id: `persistent_notification.${notifId}`,
      category: 'persistent_notification',
      severity: 'info',
      title,
      message,
      createdAt,
      dismissable: true,
      actions: [
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
    const createdAt = notif.attributes.created_at || notif.last_updated;

    items.push({
      id: notifId,
      entity_id: notif.entity_id,
      category: 'persistent_notification',
      severity: 'info',
      title,
      message,
      createdAt,
      dismissable: true,
      actions: [
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

  // 3. NATIVE REPAIRS & SYSTEM ISSUES (From WS `repairs/list_issues` + Entity States)
  for (const rep of nativeRepairs) {
    const issueId = rep.issue_id || `repair_${rep.domain}_${rep.translation_key || ''}`;
    if (seenIds.has(issueId) || dismissedSet.has(issueId)) continue;
    seenIds.add(issueId);

    const title = rep.title || (rep.translation_key ? rep.translation_key.replace(/_/g, ' ') : `${rep.domain} Repair Issue`);
    const message = rep.message || `An issue was detected with integration ${rep.domain}. Review the configuration or integration instructions.`;
    const severityRaw = rep.severity || 'warning';
    const severity: NotificationSeverity = 
      severityRaw === 'critical' ? 'critical' :
      severityRaw === 'error' ? 'error' : 'warning';
    const learnMoreUrl = rep.learn_more_url;

    const isRestartIssue = 
      issueId.toLowerCase().includes('restart') || 
      issueId.toLowerCase().includes('reboot') || 
      title.toLowerCase().includes('restart') || 
      message.toLowerCase().includes('restart') ||
      title.toLowerCase().includes('reboot') ||
      message.toLowerCase().includes('reboot');

    const actions: HANotificationAction[] = [
      ...(isRestartIssue ? [
        {
          id: `restart_${issueId}`,
          label: 'Restart Now',
          variant: 'primary' as const,
          onClick: async () => {
            dismissNotification(issueId);
            await callHAService('homeassistant', 'restart', {}).catch(() => {});
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ha_log_message', {
                detail: {
                  type: 'info',
                  msg: 'Home Assistant is restarting to apply updates...',
                  details: { issue_id: issueId }
                }
              }));
            }
          }
        }
      ] : rep.is_fixable !== false ? [
        {
          id: `fix_${issueId}`,
          label: 'Fix Issue',
          variant: 'primary' as const,
          onClick: async () => {
            if (learnMoreUrl && typeof window !== 'undefined') {
              window.open(learnMoreUrl, '_blank', 'noopener,noreferrer');
            }
            await callHAService('repairs', 'ignore_issue', { issue_id: rep.issue_id }).catch(() => {});
            dismissNotification(issueId);
          }
        }
      ] : []),
      ...(learnMoreUrl && !isRestartIssue ? [
        {
          id: `guide_${issueId}`,
          label: 'Documentation',
          variant: 'ghost' as const,
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.open(learnMoreUrl, '_blank', 'noopener,noreferrer');
            }
          }
        }
      ] : []),
      {
        id: `ignore_${issueId}`,
        label: 'Ignore Issue',
        variant: 'ghost' as const,
        onClick: async () => {
          await callHAService('repairs', 'ignore_issue', { issue_id: rep.issue_id }).catch(() => {});
          dismissNotification(issueId);
        }
      }
    ];

    items.push({
      id: issueId,
      entity_id: `repair.${rep.domain}_${rep.issue_id}`,
      category: 'repair',
      severity,
      title,
      message,
      issueId,
      learnMoreUrl,
      isFixable: rep.is_fixable !== false,
      createdAt: rep.created || new Date().toISOString(),
      dismissable: true,
      actions,
      onDismiss: async () => {
        await callHAService('repairs', 'ignore_issue', { issue_id: rep.issue_id }).catch(() => {});
        dismissNotification(issueId);
      }
    });
  }

  const repairEntities = Object.values(states).filter(
    s => s.entity_id.startsWith('repair.') && s.state !== 'dismissed' && s.state !== 'ignored'
  );

  for (const rep of repairEntities) {
    const issueId = rep.attributes.issue_id || rep.entity_id;
    if (seenIds.has(issueId) || seenIds.has(rep.entity_id) || dismissedSet.has(issueId) || dismissedSet.has(rep.entity_id)) continue;
    seenIds.add(issueId);
    seenIds.add(rep.entity_id);

    const title = rep.attributes.title || rep.attributes.friendly_name || 'Home Assistant System Issue';
    const message = rep.attributes.message || 'A system repair or configuration migration is recommended.';
    const severityRaw = rep.attributes.severity || 'warning';
    const severity: NotificationSeverity = 
      severityRaw === 'critical' ? 'critical' :
      severityRaw === 'error' ? 'error' : 'warning';
    const learnMoreUrl = rep.attributes.learn_more_url;

    const isRestartIssue = 
      issueId.toLowerCase().includes('restart') || 
      issueId.toLowerCase().includes('reboot') || 
      title.toLowerCase().includes('restart') || 
      message.toLowerCase().includes('restart') ||
      title.toLowerCase().includes('reboot') ||
      message.toLowerCase().includes('reboot');

    const actions: HANotificationAction[] = [
      ...(isRestartIssue ? [
        {
          id: `restart_${issueId}`,
          label: 'Restart Now',
          variant: 'primary' as const,
          onClick: async () => {
            dismissNotification(issueId);
            dismissNotification(rep.entity_id);
            if (updateEntityState) {
              updateEntityState(rep.entity_id, 'dismissed');
            }
            await callHAService('homeassistant', 'restart', {}).catch(() => {});
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ha_log_message', {
                detail: {
                  type: 'info',
                  msg: 'Home Assistant is restarting to apply updates...',
                  details: { entity_id: rep.entity_id }
                }
              }));
            }
          }
        }
      ] : rep.attributes.is_fixable !== false ? [
        {
          id: `fix_${issueId}`,
          label: 'Fix Issue',
          variant: 'primary' as const,
          onClick: async () => {
            if (learnMoreUrl && typeof window !== 'undefined') {
              window.open(learnMoreUrl, '_blank', 'noopener,noreferrer');
            }
            await callHAService('repairs', 'ignore_issue', { issue_id: issueId }).catch(() => {});
            dismissNotification(issueId);
            dismissNotification(rep.entity_id);
            if (updateEntityState) {
              updateEntityState(rep.entity_id, 'dismissed');
            }
          }
        }
      ] : []),
      ...(learnMoreUrl && !isRestartIssue ? [
        {
          id: `guide_${issueId}`,
          label: 'Documentation',
          variant: 'ghost' as const,
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.open(learnMoreUrl, '_blank', 'noopener,noreferrer');
            }
          }
        }
      ] : []),
      {
        id: `ignore_${issueId}`,
        label: 'Ignore Issue',
        variant: 'ghost' as const,
        onClick: async () => {
          await callHAService('repairs', 'ignore_issue', { issue_id: issueId }).catch(() => {});
          dismissNotification(issueId);
          dismissNotification(rep.entity_id);
          if (updateEntityState) {
            updateEntityState(rep.entity_id, 'ignored');
          }
        }
      }
    ];

    items.push({
      id: issueId,
      entity_id: rep.entity_id,
      category: 'repair',
      severity,
      title,
      message,
      issueId,
      learnMoreUrl,
      isFixable: rep.attributes.is_fixable !== false,
      createdAt: rep.last_updated,
      dismissable: true,
      actions,
      onDismiss: async () => {
        await callHAService('repairs', 'ignore_issue', { issue_id: issueId }).catch(() => {});
        dismissNotification(issueId);
        dismissNotification(rep.entity_id);
        if (updateEntityState) {
          updateEntityState(rep.entity_id, 'ignored');
        }
      }
    });
  }

  // 4. CRITICAL SENSORS & HAZARDS (Moisture, Smoke, Critical Battery)
  const binarySensors = domainGroups['binary_sensor'] || [];
  
  // Water leaks
  const leakSensors = binarySensors.filter(
    b => (b.attributes.device_class === 'moisture' || b.attributes.device_class === 'water' || b.entity_id.includes('leak') || b.entity_id.includes('flood')) &&
         (b.state === 'on' || b.state === 'wet' || b.state === 'detected')
  );
  for (const leak of leakSensors) {
    items.push({
      id: `alert_leak_${leak.entity_id}`,
      entity_id: leak.entity_id,
      category: 'hazard',
      severity: 'critical',
      title: `Water Leak: ${leak.name}`,
      message: `Moisture detected in ${leak.area?.name || 'Home'}. Immediate inspection recommended to prevent water damage.`,
      areaName: leak.area?.name,
      sensorType: 'leak',
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
    items.push({
      id: `alert_smoke_${smoke.entity_id}`,
      entity_id: smoke.entity_id,
      category: 'hazard',
      severity: 'critical',
      title: `Smoke/Gas: ${smoke.name}`,
      message: `Hazardous environment detected in ${smoke.area?.name || 'Home'}. Ensure immediate safety and ventilation.`,
      areaName: smoke.area?.name,
      sensorType: 'smoke',
      createdAt: smoke.attributes.last_triggered || new Date().toISOString(),
      dismissable: false
    });
  }

  // Critical Battery (<15%)
  const allResolved = Object.values(domainGroups).flat();
  const criticalBattery = allResolved.filter(
    e => typeof e.batteryPct === 'number' && e.batteryPct <= 15 && !dismissedSet.has(`battery_${e.entity_id}`)
  );
  for (const bat of criticalBattery.slice(0, 3)) {
    const notifId = `battery_${bat.entity_id}`;
    items.push({
      id: notifId,
      entity_id: bat.entity_id,
      category: 'battery',
      severity: 'warning',
      title: `${bat.name} (${bat.batteryPct}%)`,
      message: `Device battery is critically low at ${bat.batteryPct}%. Please replace or charge soon.`,
      areaName: bat.area?.name,
      batteryLevel: bat.batteryPct,
      sensorType: 'battery',
      createdAt: new Date().toISOString(),
      dismissable: true,
      onDismiss: () => {
        dismissNotification(notifId);
      }
    });
  }

  // 5. SORT ORDER UNDER "ALL":
  // 1. Issues (repair)
  // 2. Messages (persistent_notification)
  // 3. Updates (update)
  // 4. Sensors (hazard, security, battery)
  const categoryRank: Record<NotificationCategory, number> = {
    repair: 1,
    persistent_notification: 2,
    update: 3,
    hazard: 4,
    security: 4,
    battery: 4
  };

  const severityScore: Record<NotificationSeverity, number> = {
    critical: 5,
    error: 4,
    warning: 3,
    update: 2,
    info: 1
  };

  return items.sort((a, b) => {
    const rankA = categoryRank[a.category] ?? 99;
    const rankB = categoryRank[b.category] ?? 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    // Sub-sort by priority severity
    return severityScore[b.severity] - severityScore[a.severity];
  });
}

