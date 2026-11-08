/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { haWebSocketService } from '../../services/haWebSocket';
import { toServiceError, restoreConfirmedStates, reportServiceFailure } from './optimistic';
import type { AutoLayoutStoreState, SetState, GetState } from './types';

export const createNotificationSlice = (set: SetState, get: GetState): Pick<AutoLayoutStoreState, 'dismissNotification' | 'restoreNotification' | 'clearAllNotifications' | 'installUpdate' | 'skipUpdate' | 'clearSkippedUpdate'> => ({
  dismissNotification: (id: string) => {
    set(prev => {
      const nextIds = Array.from(new Set([...prev.dismissedNotificationIds, id]));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(nextIds));
          window.dispatchEvent(new CustomEvent('had_sync_dismissed_notifications', { detail: nextIds }));
        } catch {}
      }
      return { dismissedNotificationIds: nextIds };
    });
  },

  restoreNotification: (id: string) => {
    set(prev => {
      const nextIds = prev.dismissedNotificationIds.filter(
        item => item !== id && item !== `skipped_${id}` && !item.startsWith(`skipped_${id}_`)
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(nextIds));
          window.dispatchEvent(new CustomEvent('had_sync_dismissed_notifications', { detail: nextIds }));
        } catch {}
      }
      return { dismissedNotificationIds: nextIds };
    });
  },

  clearAllNotifications: (ids: string[]) => {
    set(prev => {
      const nextIds = Array.from(new Set([...prev.dismissedNotificationIds, ...ids]));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ha_dismissed_notifications', JSON.stringify(nextIds));
          window.dispatchEvent(new CustomEvent('had_sync_dismissed_notifications', { detail: nextIds }));
        } catch {}
      }
      return { dismissedNotificationIds: nextIds };
    });
  },

  installUpdate: async (entityId: string) => {
    const current = get().states[entityId];
    const attrs = current?.attributes || {};
    const latest = attrs.latest_version || attrs.installed_version || 'Latest';
    const friendlyName = attrs.friendly_name || attrs.title || entityId;

    // Step 1: Set immediate installing state with initial percentage
    get().updateEntityState(entityId, 'installing', {
      in_progress: true,
      update_percentage: 15
    });

    // Send the live service call to Home Assistant (both service_data and target for wide HA version support)
    try {
      await haWebSocketService.callService('update', 'install', { backup: false, entity_id: entityId }, { entity_id: entityId });
    } catch (rawErr) {
      const err = toServiceError(rawErr);
      console.warn('[HA Update] Install failed:', err);
      restoreConfirmedStates(set, get, [entityId]);
      reportServiceFailure('update', 'install', err);
      return;
    }

    // In live mode, progress and completion come from Home Assistant's own update entity events
    if (!haWebSocketService.isDemo()) return;

    // Step 2 (demo): Animated progress sequence for rich feedback
    setTimeout(() => {
      const st = get().states[entityId];
      if (st?.attributes?.in_progress || st?.state === 'installing') {
        get().updateEntityState(entityId, 'installing', {
          in_progress: true,
          update_percentage: 45
        });
      }
    }, 700);

    setTimeout(() => {
      const st = get().states[entityId];
      if (st?.attributes?.in_progress || st?.state === 'installing') {
        get().updateEntityState(entityId, 'installing', {
          in_progress: true,
          update_percentage: 80
        });
      }
    }, 1500);

    setTimeout(() => {
      // Step 3: Complete update - installed version becomes latest, state turns off (up to date)
      get().updateEntityState(entityId, 'off', {
        in_progress: false,
        update_percentage: 100,
        installed_version: latest,
        skipped_version: null
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ha_log_message', {
          detail: {
            type: 'info',
            msg: `Successfully installed ${friendlyName} v${latest}`,
            details: { entity_id: entityId, version: latest }
          }
        }));
      }
    }, 2400);
  },

  skipUpdate: async (entityId: string) => {
    const current = get().states[entityId];
    const latest = current?.attributes?.latest_version || 'skipped';
    get().updateEntityState(entityId, 'off', { skipped_version: latest, in_progress: false });
    await haWebSocketService.callService('update', 'skip', { entity_id: entityId }, { entity_id: entityId }).catch((rawErr) => {
      restoreConfirmedStates(set, get, [entityId]);
      reportServiceFailure('update', 'skip', toServiceError(rawErr));
    });
  },

  clearSkippedUpdate: async (entityId: string) => {
    get().updateEntityState(entityId, 'on', { skipped_version: null, in_progress: false });
    await haWebSocketService.callService('update', 'clear_skipped', { entity_id: entityId }, { entity_id: entityId }).catch((rawErr) => {
      restoreConfirmedStates(set, get, [entityId]);
      reportServiceFailure('update', 'clear_skipped', toServiceError(rawErr));
    });
  }
});
