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
import { safeOpenExternalUrl } from '../lib/utils';
import { isLeakSensor } from '../lib/entityClassifiers';
import { useAlertStore, AlertItem } from '../store/useAlertStore';
import { alertService } from './alertService';

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
  storeAlerts?: AlertItem[];
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
  clearSkippedUpdate,
  storeAlerts
}: ExtractNotificationsParams): HANotificationItem[] {

  const items: HANotificationItem[] = [];
  const dismissedSet = new Set(dismissedNotificationIds);
  const seenIds = new Set<string>();

  // 1. SOFTWARE & FIRMWARE UPDATES (`update.*`)
  // Ingest from domainGroups['update'] and all states with entity_id starting with 'update.'
  const allUpdateEntitiesMap = new Map<string, { entity_id: string; name: string; state: string; attributes: Record<string, any> }>();
  for (const ent of (domainGroups['update'] || [])) {
    allUpdateEntitiesMap.set(ent.entity_id, {
      entity_id: ent.entity_id,
      name: ent.name || ent.entity_id,
      state: ent.state,
      attributes: ent.attributes || {}
    });
  }
  for (const s of Object.values(states)) {
    if (s?.entity_id?.startsWith('update.') && !allUpdateEntitiesMap.has(s.entity_id)) {
      allUpdateEntitiesMap.set(s.entity_id, {
        entity_id: s.entity_id,
        name: s.attributes?.friendly_name || s.attributes?.title || s.entity_id,
        state: s.state,
        attributes: s.attributes || {}
      });
    }
  }

  for (const ent of allUpdateEntitiesMap.values()) {
    const liveState = states[ent.entity_id] || { state: ent.state, attributes: ent.attributes };
    const attrs = liveState.attributes || {};

    const isStateOn = liveState.state === 'on' || liveState.state === 'true';
    const hasVersionMismatch = Boolean(attrs.latest_version) && 
      (attrs.latest_version !== attrs.installed_version);
    const isStateVersion = liveState.state && 
      liveState.state !== 'off' && 
      liveState.state !== 'unavailable' && 
      liveState.state !== 'unknown' && 
      liveState.state !== 'idle' &&
      Boolean(attrs.installed_version) &&
      liveState.state !== attrs.installed_version;
    const inProgress = Boolean(attrs.in_progress) || liveState.state === 'installing';
    const isSkipped = Boolean(attrs.skipped_version);

    const hasUpdateAvailable = isStateOn || hasVersionMismatch || isStateVersion || inProgress || isSkipped;

    if (hasUpdateAvailable) {
      const installedVer = attrs.installed_version || '1.0.0';
      const latestVer = attrs.latest_version || (isStateVersion ? liveState.state : '1.0.1');
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
        dismissable: false,

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
                safeOpenExternalUrl(releaseUrl);
              }
            }
          ] : [])
        ]
      });
    }
  }

  // Also check HACS (Home Assistant Community Store) updates via sensor.hacs
  const hacsSensor = states['sensor.hacs'];
  if (hacsSensor && (Number(hacsSensor.state) > 0 || (Array.isArray(hacsSensor.attributes?.repositories) && hacsSensor.attributes.repositories.length > 0))) {
    const repos = Array.isArray(hacsSensor.attributes?.repositories) ? hacsSensor.attributes.repositories : [];
    for (const repo of repos) {
      const repoId = `hacs_update_${repo.name || repo.display_name || Math.random().toString(36).substring(7)}`;
      if (seenIds.has(repoId)) continue;
      seenIds.add(repoId);

      const repoTitle = repo.display_name || repo.name || 'HACS Integration';
      const installedVer = repo.installed_version || 'Installed';
      const latestVer = repo.available_version || 'Latest';
      const releaseSummary = repo.description || `HACS update available for ${repoTitle}`;

      items.push({
        id: repoId,
        entity_id: 'sensor.hacs',
        category: 'update',
        severity: 'update',
        title: `HACS: ${repoTitle}`,
        message: releaseSummary,
        installedVersion: installedVer,
        latestVersion: latestVer,
        releaseSummary,
        createdAt: hacsSensor.last_updated || new Date().toISOString(),
        dismissable: false,
        actions: [
          ...(repo.name && repo.name.includes('/') ? [
            {
              id: `hacs_notes_${repo.name}`,
              label: 'View Repository',
              variant: 'ghost' as const,
              onClick: () => {
                safeOpenExternalUrl(`https://github.com/${repo.name}`);
              }
            }
          ] : [])
        ]
      });
    }
  }

  // Also check Home Assistant Core updater binary sensor (binary_sensor.updater)
  const updaterSensor = states['binary_sensor.updater'];
  if (updaterSensor && (updaterSensor.state === 'on' || updaterSensor.state === 'true')) {
    const updaterId = 'ha_updater_binary_sensor';
    if (!seenIds.has(updaterId)) {
      seenIds.add(updaterId);
      const attrs = updaterSensor.attributes || {};
      const latestVer = attrs.newest_version || 'Latest';
      const releaseNotes = attrs.release_notes;

      items.push({
        id: updaterId,
        entity_id: 'binary_sensor.updater',
        category: 'update',
        severity: 'update',
        title: 'Home Assistant Core Update Available',
        message: releaseNotes || `Home Assistant ${latestVer} is ready to install.`,
        latestVersion: latestVer,
        releaseUrl: releaseNotes,
        createdAt: updaterSensor.last_updated || new Date().toISOString(),
        dismissable: false,
        actions: [
          ...(releaseNotes ? [
            {
              id: 'ha_updater_notes',
              label: 'Release Notes',
              variant: 'ghost' as const,
              onClick: () => {
                safeOpenExternalUrl(releaseNotes);
              }
            }
          ] : [])
        ]
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
    const isRestartNotif = title.toLowerCase().includes('restart') || 
      message.toLowerCase().includes('restart') || 
      title.toLowerCase().includes('reboot') || 
      message.toLowerCase().includes('reboot');

    items.push({
      id: notifId,
      entity_id: `persistent_notification.${notifId}`,
      category: isRestartNotif ? 'restart' : 'persistent_notification',
      severity: isRestartNotif ? 'warning' : 'info',
      title,
      message,
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

    items.push({
      id: notifId,
      entity_id: notif.entity_id,
      category: isRestartNotif ? 'restart' : 'persistent_notification',
      severity: isRestartNotif ? 'warning' : 'info',
      title,
      message,
      image,
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
            if (learnMoreUrl) {
              safeOpenExternalUrl(learnMoreUrl);
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
            safeOpenExternalUrl(learnMoreUrl);
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
      category: isRestartIssue ? 'restart' : 'repair',
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
            if (learnMoreUrl) {
              safeOpenExternalUrl(learnMoreUrl);
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
            safeOpenExternalUrl(learnMoreUrl);
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
      category: isRestartIssue ? 'restart' : 'repair',
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

  // 3.5 DEDICATED RESTART / REBOOT SENSORS & SYSTEM CHECKS
  for (const s of Object.values(states)) {
    if (!s || !s.entity_id) continue;
    const eid = s.entity_id.toLowerCase();
    const attrs = s.attributes || {};
    const devClass = String(attrs.device_class || '').toLowerCase();
    const friendlyName = attrs.friendly_name || s.entity_id;
    const lowerName = friendlyName.toLowerCase();

    const isRestartSensor = 
      (eid.startsWith('binary_sensor.') || eid.startsWith('sensor.')) &&
      (devClass === 'restart' || 
       devClass === 'reboot' ||
       eid.includes('restart_required') || 
       eid.includes('reboot_required') ||
       lowerName.includes('restart required') || 
       lowerName.includes('reboot required') ||
       Boolean(attrs.restart_required) ||
       Boolean(attrs.reboot_required));

    if (!isRestartSensor) continue;

    const isTriggered = 
      s.state === 'on' || 
      s.state === 'problem' || 
      s.state === 'restart_required' || 
      s.state === 'reboot_required' ||
      s.state === 'true';

    if (!isTriggered) continue;
    if (seenIds.has(s.entity_id) || dismissedSet.has(s.entity_id)) continue;
    seenIds.add(s.entity_id);

    const isReboot = eid.includes('reboot') || lowerName.includes('reboot');
    items.push({
      id: s.entity_id,
      entity_id: s.entity_id,
      category: 'restart',
      severity: 'warning',
      title: isReboot ? `Reboot Required: ${friendlyName}` : `Restart Required: ${friendlyName}`,
      message: attrs.message || `${friendlyName} indicates a system restart is required to apply configuration changes or update packages.`,
      createdAt: s.last_updated || new Date().toISOString(),
      dismissable: true,
      actions: [
        {
          id: `restart_${s.entity_id}`,
          label: isReboot ? 'Reboot Now' : 'Restart Now',
          variant: 'primary' as const,
          onClick: async () => {
            dismissNotification(s.entity_id);
            if (isReboot) {
              await callHAService('hassio', 'host_reboot', {}).catch(async () => {
                await callHAService('homeassistant', 'restart', {}).catch(() => {});
              });
            } else {
              await callHAService('homeassistant', 'restart', {}).catch(() => {});
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ha_log_message', {
                detail: {
                  type: 'info',
                  msg: 'Home Assistant restart triggered...',
                  details: { entity_id: s.entity_id }
                }
              }));
            }
          }
        },
        {
          id: `dismiss_${s.entity_id}`,
          label: 'Later',
          variant: 'ghost' as const,
          onClick: () => {
            dismissNotification(s.entity_id);
          }
        }
      ],
      onDismiss: () => {
        dismissNotification(s.entity_id);
      }
    });
  }

  // 4. CRITICAL SENSORS & HAZARDS (Moisture, Smoke, Critical Battery)
  const binarySensors = domainGroups['binary_sensor'] || [];
  
  // Water leaks (strictly indoor leak detectors, excludes rain & weather sensors)
  const leakSensors = binarySensors.filter(
    b => isLeakSensor(b) && (b.state === 'on' || b.state === 'wet' || b.state === 'detected')
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

  // Problem & Tamper binary sensors
  const problemSensors = binarySensors.filter(
    b => (b.attributes.device_class === 'problem' || b.attributes.device_class === 'tamper') &&
         (b.state === 'on' || b.state === 'problem' || b.state === 'tampered')
  );
  for (const prob of problemSensors) {
    const notifId = `alert_prob_${prob.entity_id}`;
    if (seenIds.has(notifId) || dismissedSet.has(notifId)) continue;
    seenIds.add(notifId);

    const isTamper = prob.attributes.device_class === 'tamper';
    items.push({
      id: notifId,
      entity_id: prob.entity_id,
      category: isTamper ? 'security' : 'repair',
      severity: 'warning',
      title: `${isTamper ? 'Tamper Detected' : 'Device Problem'}: ${prob.name}`,
      message: `${prob.name} reported a ${isTamper ? 'tamper alert' : 'hardware problem'} in ${prob.area?.name || 'Home'}.`,
      areaName: prob.area?.name,
      createdAt: prob.attributes.last_triggered || new Date().toISOString(),
      dismissable: true,
      onDismiss: () => {
        dismissNotification(notifId);
      }
    });
  }

  // 5. HOME ASSISTANT NATIVE ALERTS (`alert.*` integration)
  const alertEntities = Object.values(states).filter(
    s => s.entity_id.startsWith('alert.') && s.state === 'on'
  );

  for (const ent of alertEntities) {
    if (seenIds.has(ent.entity_id) || dismissedSet.has(ent.entity_id)) continue;
    seenIds.add(ent.entity_id);

    const attrs = ent.attributes || {};
    const title = attrs.title || attrs.friendly_name || ent.entity_id.replace('alert.', '').replace(/_/g, ' ');
    const message = attrs.message || 'Home Assistant alert is actively triggering.';
    const severityRaw = (attrs.severity || 'warning').toLowerCase();
    const severity: NotificationSeverity = 
      severityRaw === 'critical' ? 'critical' :
      severityRaw === 'error' ? 'error' : 'warning';

    items.push({
      id: ent.entity_id,
      entity_id: ent.entity_id,
      category: 'alert',
      severity,
      title,
      message,
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

    items.push({
      id: alertId,
      entity_id: alert.entityId,
      category,
      severity,
      title: alert.title,
      message: alert.message,
      areaName: alert.areaName,
      createdAt: alert.timestamp ? new Date(alert.timestamp).toISOString() : new Date().toISOString(),
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

