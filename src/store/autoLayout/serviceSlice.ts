/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAState } from '../../types';
import { haWebSocketService } from '../../services/haWebSocket';
import { scheduleRecompute } from './recompute';
import { confirmedStates, isSecurityCriticalEntity, collectServiceEntityIds, toServiceError, restoreConfirmedStates, reportServiceFailure } from './optimistic';
import type { AutoLayoutStoreState, SetState, GetState } from './types';

export const createServiceSlice = (set: SetState, get: GetState): Pick<AutoLayoutStoreState, 'updateEntityState' | 'callHAService'> => ({
  updateEntityState: (entityId: string, newState?: string | null, newAttributes?: Record<string, any>) => {
    if (isSecurityCriticalEntity(entityId) && !haWebSocketService.isDemo()) return;

    set(prev => {
      const existing = prev.states[entityId] || {
        entity_id: entityId,
        state: newState || 'off',
        attributes: {}
      };

      const finalState = (newState !== undefined && newState !== null) ? newState : (existing.state || 'off');

      const updatedState: HAState = {
        ...existing,
        state: finalState,
        attributes: {
          ...existing.attributes,
          ...(newAttributes || {})
        },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      return {
        states: {
          ...prev.states,
          [entityId]: updatedState
        },
        rawStates: {
          ...prev.rawStates,
          [entityId]: updatedState
        }
      };
    });

    scheduleRecompute(get);
  },

  callHAService: async (domain: string, service: string, serviceData: Record<string, any> = {}, target: any = {}) => {
    const isDemo = haWebSocketService.isDemo();

    // Optimistic local update, applied before the call: by the time HA answers, its real
    // state_changed event has usually arrived and must not be overwritten. Relative services
    // (toggle, play/pause, volume steps) are computed from the last HA-confirmed state so a
    // caller's own optimistic write isn't applied twice.
    if (target?.entity_id) {
      const entityIds = Array.isArray(target.entity_id) ? target.entity_id : [target.entity_id];
      for (const eid of entityIds) {
        const current = (!isDemo && confirmedStates.get(eid)) || get().states[eid];
        const currentState = current?.state;
        const currentAttrs = current?.attributes || {};

        if (service === 'turn_on') {
          const brightness = serviceData.brightness !== undefined ? serviceData.brightness : serviceData.brightness_pct !== undefined ? Math.round((serviceData.brightness_pct / 100) * 255) : currentAttrs.brightness;
          get().updateEntityState(eid, 'on', { ...serviceData, ...(brightness !== undefined ? { brightness } : {}) });
        } else if (service === 'turn_off') {
          get().updateEntityState(eid, 'off', serviceData);
        } else if (service === 'toggle') {
          get().updateEntityState(eid, currentState === 'on' ? 'off' : 'on', serviceData);
        } else if (service === 'open_cover') {
          get().updateEntityState(eid, 'open', { current_position: 100 });
        } else if (service === 'close_cover') {
          get().updateEntityState(eid, 'closed', { current_position: 0 });
        } else if (service === 'stop_cover') {
          get().updateEntityState(eid, 'stopped');
        } else if (service === 'set_cover_position') {
          const pos = Number(serviceData.position ?? 50);
          get().updateEntityState(eid, pos > 0 ? 'open' : 'closed', { current_position: pos });
        } else if (service === 'set_temperature' && serviceData.temperature !== undefined) {
          get().updateEntityState(eid, currentState === 'off' ? 'heat' : currentState, { temperature: serviceData.temperature });
        } else if (service === 'set_hvac_mode' && serviceData.hvac_mode !== undefined) {
          get().updateEntityState(eid, serviceData.hvac_mode);
        } else if (service === 'lock') {
          get().updateEntityState(eid, 'locked');
        } else if (service === 'unlock') {
          get().updateEntityState(eid, 'unlocked');
        } else if (service === 'media_play' || service === 'media_play_pause') {
          const isCurrentlyPlaying = currentState === 'playing';
          const nextState = service === 'media_play_pause' && isCurrentlyPlaying ? 'paused' : 'playing';
          const isFreshPlay = isDemo && nextState === 'playing' && (currentState === 'idle' || currentState === 'off' || currentState === 'standby' || !currentAttrs.media_title);
          
          get().updateEntityState(eid, nextState, {
            ...currentAttrs,
            ...(isFreshPlay ? {
              media_title: currentAttrs.media_title || 'AirPlay Hi-Fi Stream',
              media_artist: currentAttrs.media_artist || (eid.includes('homepod') ? 'Apple Music' : 'Media Stream'),
              media_duration: currentAttrs.media_duration || 228,
              media_position: currentAttrs.media_position || 0,
              media_position_updated_at: new Date().toISOString()
            } : {})
          });
        } else if (service === 'media_stop') {
          get().updateEntityState(eid, 'idle');
        } else if (service === 'media_next_track' || service === 'media_previous_track') {
          get().updateEntityState(eid, 'playing', {
            ...currentAttrs,
            media_position: 0,
            media_position_updated_at: new Date().toISOString()
          });
        } else if (service === 'select_source' && serviceData.source) {
          get().updateEntityState(eid, currentState || 'playing', { source: serviceData.source });
        } else if (service === 'select_sound_mode' && serviceData.sound_mode) {
          get().updateEntityState(eid, currentState || 'playing', { sound_mode: serviceData.sound_mode });
        } else if (service === 'volume_set' && serviceData.volume_level !== undefined) {
          get().updateEntityState(eid, currentState || 'playing', { volume_level: serviceData.volume_level });
        } else if (service === 'volume_mute') {
          get().updateEntityState(eid, currentState || 'playing', { is_volume_muted: Boolean(serviceData.is_volume_muted) });
        } else if (service === 'volume_up') {
          const currentVol = currentAttrs.volume_level !== undefined ? currentAttrs.volume_level : 0.5;
          get().updateEntityState(eid, currentState || 'playing', { volume_level: Math.min(1, currentVol + 0.05) });
        } else if (service === 'volume_down') {
          const currentVol = currentAttrs.volume_level !== undefined ? currentAttrs.volume_level : 0.5;
          get().updateEntityState(eid, currentState || 'playing', { volume_level: Math.max(0, currentVol - 0.05) });
        } else if (domain === 'remote' && service === 'toggle') {
          const nextState = currentState === 'on' ? 'off' : 'on';
          get().updateEntityState(eid, nextState);
          // Also sync paired media player state if present
          const clean = eid.replace('remote.', '').replace('_remote', '');
          const pairedCandidates = [`media_player.${clean}`, `media_player.${clean}_homepod`, `media_player.office_${clean}`];
          for (const cand of pairedCandidates) {
            if (get().states[cand]) {
              get().updateEntityState(cand, nextState === 'on' ? 'idle' : 'off');
              break;
            }
          }
        } else if (domain === 'remote' && service === 'turn_on') {
          get().updateEntityState(eid, 'on');
        } else if (domain === 'remote' && service === 'turn_off') {
          get().updateEntityState(eid, 'off');
        } else if (service === 'send_command' && domain === 'remote') {
          // Keep remote active
          get().updateEntityState(eid, 'on');
        } else if (service === 'start' || service === 'start_cleaning') {
          get().updateEntityState(eid, 'cleaning');
        } else if (service === 'return_to_base') {
          get().updateEntityState(eid, 'returning');
        } else if (service === 'pause') {
          get().updateEntityState(eid, 'paused');
        } else if (service === 'set_percentage' && serviceData.percentage !== undefined) {
          get().updateEntityState(eid, serviceData.percentage > 0 ? 'on' : 'off', { percentage: serviceData.percentage });
        } else if (domain === 'fan' && service === 'oscillate') {
          get().updateEntityState(eid, currentState || 'on', { oscillating: Boolean(serviceData.oscillating) });
        } else if (domain === 'fan' && service === 'set_direction') {
          get().updateEntityState(eid, currentState || 'on', { direction: serviceData.direction });
        } else if (domain === 'fan' && service === 'set_preset_mode') {
          get().updateEntityState(eid, currentState || 'on', { preset_mode: serviceData.preset_mode });
        } else if (domain === 'fan' && (service === 'set_oscillation_angle' || service === 'set_angle')) {
          get().updateEntityState(eid, currentState || 'on', { 
            oscillation_angle: serviceData.angle || serviceData.oscillation_angle,
            angle: serviceData.angle || serviceData.oscillation_angle 
          });
        } else if (domain === 'fan' && service === 'set_target_temperature') {
          get().updateEntityState(eid, currentState || 'on', { target_temperature: serviceData.temperature || serviceData.target_temperature });
        } else if (domain === 'update' && isDemo) {
          if (service === 'install') {
            get().updateEntityState(eid, 'off', { in_progress: false, installed_version: currentAttrs.latest_version || currentAttrs.installed_version });
          } else if (service === 'skip') {
            get().updateEntityState(eid, 'off', { skipped_version: currentAttrs.latest_version });
          } else if (service === 'clear_skipped') {
            get().updateEntityState(eid, 'on', { skipped_version: null });
          }
        } else if (domain === 'persistent_notification' && service === 'dismiss') {
          get().updateEntityState(eid, 'dismissed');
        } else if (domain === 'alarm_control_panel' || service.startsWith('alarm_')) {
          if (service === 'alarm_arm_home') {
            get().updateEntityState(eid, 'armed_home', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_arm_away') {
            get().updateEntityState(eid, 'armed_away', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_arm_night') {
            get().updateEntityState(eid, 'armed_night', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_disarm') {
            get().updateEntityState(eid, 'disarmed', { changed_by: 'Dashboard 1-Tap', last_changed: new Date().toISOString() });
          } else if (service === 'alarm_trigger') {
            get().updateEntityState(eid, 'triggered', { changed_by: 'Alarm Trigger', last_changed: new Date().toISOString() });
          }
        } else if (domain === 'button' && service === 'press') {
          get().updateEntityState(eid, new Date().toISOString(), { last_pressed: new Date().toISOString() });
        } else if (domain === 'select' && service === 'select_option' && serviceData.option) {
          get().updateEntityState(eid, String(serviceData.option));
        }
      }
    }

    try {
      await haWebSocketService.callService(domain, service, serviceData, target);
    } catch (rawErr) {
      const err = toServiceError(rawErr);
      console.warn(`[HA WebSocket] Service call failed: ${domain}.${service}`, err);
      restoreConfirmedStates(set, get, collectServiceEntityIds(serviceData, target));
      reportServiceFailure(domain, service, err);
      throw err;
    }
  }
});
