/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Software, firmware, HACS and Core updater notifications.
 */

import { safeOpenExternalUrl } from '../../lib/utils';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import type { HAState } from '../../types';
import type { NotificationContext } from './context';

/** Section 1: `update.*` entities, HACS and the Core updater. */
export function collectUpdateNotifications(ctx: NotificationContext): void {
  const {
    items, dismissedSet, seenIds, registryMap, domainGroups, states, entityRegistry,
    nativeNotifications, nativePersistentNotifications, nativeRepairs, dismissedNotificationIds,
    callHAService, dismissNotification, updateEntityState, installUpdate, skipUpdate, clearSkippedUpdate, storeAlerts
  } = ctx;

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
}
