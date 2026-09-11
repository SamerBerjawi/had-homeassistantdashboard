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

import { ResolvedEntity, HAState, HAEntityRegistryEntry } from '../types';
import { safeOpenExternalUrl } from '../lib/utils';
import { isLeakSensor, isBatteryEntity } from '../lib/entityClassifiers';
import { useAlertStore, AlertItem } from '../store/useAlertStore';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { alertService } from './alertService';
import { haWebSocketService } from './haWebSocket';

export interface ExtractNotificationsParams {
  domainGroups: Record<string, ResolvedEntity[]>;
  states: Record<string, HAState>;
  entityRegistry?: HAEntityRegistryEntry[];
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
  entityRegistry = [],
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
  const registryMap = new Map<string, HAEntityRegistryEntry>((entityRegistry || []).map(e => [e.entity_id, e]));

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
    const latestVer = attrs.latest_version || (isStateVersion ? liveState.state : '1.0.1');
    const inProgress = Boolean(attrs.in_progress) || liveState.state === 'installing';
    const isSkipped = Boolean(
      attrs.skipped_version &&
      (attrs.skipped_version === latestVer || liveState.state === 'off')
    );

    const isSkippedDismissed = 
      dismissedSet.has(ent.entity_id) || 
      dismissedSet.has(`skipped_${ent.entity_id}`) ||
      (attrs.skipped_version && dismissedSet.has(`skipped_${ent.entity_id}_${attrs.skipped_version}`));

    // If this skipped update was dismissed/cleaned by the user, don't show it in the notifications list
    if (isSkipped && isSkippedDismissed) {
      continue;
    }

    const hasUpdateAvailable = isStateOn || hasVersionMismatch || isStateVersion || inProgress || isSkipped;

    if (hasUpdateAvailable) {
      const installedVer = attrs.installed_version || '1.0.0';
      const title = attrs.title || attrs.friendly_name || ent.name;
      const releaseSummary = attrs.release_summary || '';
      const releaseUrl = attrs.release_url;
      const releaseNotes = attrs.release_notes;

      // Extract integration domain
      const regEntry = registryMap.get(ent.entity_id);
      let domain = regEntry?.platform;
      if (!domain) {
        const lowerId = ent.entity_id.toLowerCase();
        if (lowerId.includes('home_assistant') || lowerId.includes('core')) domain = 'homeassistant';
        else if (lowerId.includes('hacs')) domain = 'hacs';
        else if (lowerId.includes('zigbee2mqtt')) domain = 'zigbee2mqtt';
        else if (lowerId.includes('esphome')) domain = 'esphome';
        else if (lowerId.includes('tp_link') || lowerId.includes('tplink')) domain = 'tplink';
        else if (lowerId.includes('shelly')) domain = 'shelly';
        else if (lowerId.includes('wled')) domain = 'wled';
        else if (lowerId.includes('hue')) domain = 'hue';
        else domain = attrs.device_class || ent.entity_id.replace(/^update\./, '').split('_')[0];
      }

      const source = attrs.source || (regEntry?.platform ? regEntry.platform.toUpperCase() : 'Home Assistant');
      const image = attrs.entity_picture || attrs.data?.image || attrs.image;

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
        releaseNotes,
        domain,
        source,
        image,
        inProgress,
        updatePercentage: typeof attrs.update_percentage === 'number' ? attrs.update_percentage : undefined,
        skippedVersion: attrs.skipped_version || null,
        autoUpdate: Boolean(attrs.auto_update),
        createdAt: attrs.release_date || (liveState as HAState).last_updated || new Date().toISOString(),
        dismissable: isSkipped,
        onDismiss: isSkipped ? () => {
          dismissNotification(ent.entity_id);
          dismissNotification(`skipped_${ent.entity_id}`);
          if (attrs.skipped_version) {
            dismissNotification(`skipped_${ent.entity_id}_${attrs.skipped_version}`);
          }
        } : undefined,

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
                useAutoLayoutStore.getState().restoreNotification(ent.entity_id);
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
      const releaseNotes = repo.release_notes || repo.changelog || repo.description;
      const releaseUrl = repo.name && repo.name.includes('/') ? `https://github.com/${repo.name}/releases` : undefined;

      let domain = repo.domain;
      if (!domain && repo.name) {
        const parts = repo.name.split('/');
        domain = parts[parts.length - 1];
      }
      if (!domain) domain = 'hacs';

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
        releaseNotes,
        releaseUrl,
        domain,
        source: 'HACS',
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
        releaseNotes: typeof releaseNotes === 'string' ? releaseNotes : undefined,
        releaseUrl: typeof releaseNotes === 'string' && releaseNotes.startsWith('http') ? releaseNotes : 'https://www.home-assistant.io/latest-blogs/',
        domain: 'homeassistant',
        source: 'Home Assistant Core',
        createdAt: updaterSensor.last_updated || new Date().toISOString(),
        dismissable: false,
        actions: [
          ...(releaseNotes ? [
            {
              id: 'ha_updater_notes',
              label: 'Release Notes',
              variant: 'ghost' as const,
              onClick: () => {
                safeOpenExternalUrl(typeof releaseNotes === 'string' && releaseNotes.startsWith('http') ? releaseNotes : 'https://www.home-assistant.io/latest-blogs/');
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

    const domain = (notif as any).domain || (isRestartNotif ? 'homeassistant' : undefined);
    const source = (notif as any).source || (isRestartNotif ? 'Home Assistant' : undefined);

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
            await haWebSocketService.ignoreRepairIssue(rep.domain, rep.issue_id).catch(() => {});
            useAutoLayoutStore.setState(prev => ({
              nativeRepairs: prev.nativeRepairs.filter(r => r.issue_id !== rep.issue_id)
            }));
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
          await haWebSocketService.ignoreRepairIssue(rep.domain, rep.issue_id).catch(() => {});
          useAutoLayoutStore.setState(prev => ({
            nativeRepairs: prev.nativeRepairs.filter(r => r.issue_id !== rep.issue_id)
          }));
          dismissNotification(issueId);
        }
      }
    ];

    const domain = rep.issue_domain || (rep.domain !== 'hacs' ? rep.domain : undefined) || (rep.translation_placeholders?.domain || rep.translation_placeholders?.integration) || rep.domain;
    const source = rep.domain ? (rep.domain.toLowerCase() === 'hacs' ? 'HACS' : rep.domain) : undefined;

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
      domain,
      source,
      createdAt: rep.created || new Date().toISOString(),
      dismissable: true,
      actions,
      onDismiss: async () => {
        await haWebSocketService.ignoreRepairIssue(rep.domain, rep.issue_id).catch(() => {});
        useAutoLayoutStore.setState(prev => ({
          nativeRepairs: prev.nativeRepairs.filter(r => r.issue_id !== rep.issue_id)
        }));
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
            const issueDomain = rep.attributes.issue_domain || rep.attributes.domain || rep.entity_id.replace(/^repair\./, '').split('_')[0];
            await haWebSocketService.ignoreRepairIssue(issueDomain, issueId).catch(() => {});
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
          const issueDomain = rep.attributes.issue_domain || rep.attributes.domain || rep.entity_id.replace(/^repair\./, '').split('_')[0];
          await haWebSocketService.ignoreRepairIssue(issueDomain, issueId).catch(() => {});
          dismissNotification(issueId);
          dismissNotification(rep.entity_id);
          if (updateEntityState) {
            updateEntityState(rep.entity_id, 'ignored');
          }
        }
      }
    ];

    const domain = rep.attributes.issue_domain || (rep.attributes.domain !== 'hacs' ? rep.attributes.domain : undefined) || rep.attributes.domain;
    const source = rep.attributes.domain ? (rep.attributes.domain.toLowerCase() === 'hacs' ? 'HACS' : rep.attributes.domain) : undefined;
    const image = rep.attributes.entity_picture || rep.attributes.data?.image;

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
      domain,
      source,
      image,
      createdAt: rep.last_updated,
      dismissable: true,
      actions,
      onDismiss: async () => {
        const issueDomain = rep.attributes.issue_domain || rep.attributes.domain || rep.entity_id.replace(/^repair\./, '').split('_')[0];
        await haWebSocketService.ignoreRepairIssue(issueDomain, issueId).catch(() => {});
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
    const sensorReg = registryMap.get(s.entity_id);
    const sensorDomain = sensorReg?.platform || (eid.includes('hacs') ? 'hacs' : 'homeassistant');

    items.push({
      id: s.entity_id,
      entity_id: s.entity_id,
      category: 'restart',
      severity: 'warning',
      title: isReboot ? `Reboot Required: ${friendlyName}` : `Restart Required: ${friendlyName}`,
      message: attrs.message || `${friendlyName} indicates a system restart is required to apply configuration changes or update packages.`,
      domain: sensorDomain,
      source: sensorReg?.platform ? sensorReg.platform.toUpperCase() : 'Home Assistant',
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

