/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repair issues and restart/reboot checks.
 */

import { safeOpenExternalUrl } from '../../lib/utils';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { haWebSocketService } from '../haWebSocket';
import type { NotificationSeverity, HANotificationAction } from '../../types/notifications';
import type { NotificationContext } from './context';

/** Section 3: native repairs and system issues. */
export function collectRepairNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

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
}

/** Section 3.5: dedicated restart/reboot sensors and system checks. */
export function collectRestartNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

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
}
