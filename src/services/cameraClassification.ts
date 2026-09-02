/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export const CameraEntityFeature = {
  ON_OFF: 1,
  STREAM: 2
};

export interface CameraCapabilities {
  state: string;
  isStreaming: boolean;
  isIdle: boolean;
  isOffline: boolean;
  isDoorbell: boolean;
  supportsPtz: boolean;
  supportsSiren: boolean;
  supportsStream: boolean;
  resolution: string;
  modelName: string;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectCameraCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): CameraCapabilities {
  if (!entity) {
    return {
      state: 'idle',
      isStreaming: true,
      isIdle: false,
      isOffline: false,
      isDoorbell: false,
      supportsPtz: false,
      supportsSiren: false,
      supportsStream: true,
      resolution: '1080p HD',
      modelName: 'Security Camera',
      friendlyName: 'Camera'
    };
  }

  const attrs = entity.attributes || {};
  const state = String(entity.state || 'idle').toLowerCase();
  const isOffline = state === 'unavailable' || state === 'off';
  const isStreaming = state === 'streaming' || state === 'recording' || state === 'idle' || !isOffline;
  const isIdle = state === 'idle';

  const eid = entity.entity_id.toLowerCase();
  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;
  const fn = friendlyName.toLowerCase();

  const isDoorbell =
    attrs.device_class === 'doorbell' ||
    eid.includes('doorbell') ||
    fn.includes('doorbell') ||
    eid.includes('door_camera');

  const sf = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
  const supportsStream = (sf & CameraEntityFeature.STREAM) !== 0 || true; // Most modern HA cameras support stream

  const supportsPtz = Boolean(
    attrs.ptz_capabilities ||
    attrs.pan_tilt_zoom ||
    attrs.can_pan ||
    attrs.can_tilt ||
    eid.includes('ptz')
  );

  const supportsSiren = Boolean(
    attrs.has_siren ||
    attrs.siren !== undefined ||
    attrs.supports_siren
  );

  const resolution = String(attrs.resolution || attrs.stream_resolution || (isDoorbell ? '1080p Full HD' : (attrs.fps ? `${attrs.fps} FPS` : 'HD Live Stream')));
  const modelName = String(attrs.model_name || attrs.brand || attrs.model || (isDoorbell ? 'Smart Video Doorbell' : 'Live Stream Camera'));

  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    state,
    isStreaming,
    isIdle,
    isOffline,
    isDoorbell,
    supportsPtz,
    supportsSiren,
    supportsStream,
    resolution,
    modelName,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
