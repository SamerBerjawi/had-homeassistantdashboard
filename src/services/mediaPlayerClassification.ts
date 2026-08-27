/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity, HADevice } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

export type MediaPlayerKind = 'apple_tv' | 'homepod' | 'smart_tv' | 'sonos' | 'cast' | 'generic';

export interface ClassifiedMediaPlayer {
  kind: MediaPlayerKind;
  isApple: boolean;
  hasRemote: boolean;
  remoteEntityId?: string; // e.g., remote.living_room_apple_tv
  supportsVolume: boolean;
  supportsPlayPause: boolean;
  supportsNextPrev: boolean;
  supportsMute: boolean;
  supportsTurnOn: boolean;
  supportsTurnOff: boolean;
  supportsSource: boolean;
  supportsSoundMode: boolean;
  supportsGrouping: boolean;
  supportedFeatures: number; // entity.attributes.supported_features bitmask
}

// Home Assistant MediaPlayerEntityFeature constants
export const MediaPlayerEntityFeature = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY_MEDIA: 512,
  VOLUME_STEP: 1024,
  SELECT_SOURCE: 2048,
  STOP: 4096,
  CLEAR_PLAYLIST: 8192,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  SELECT_SOUND_MODE: 65536,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
  GROUPING: 524288
} as const;

/**
 * Classifies a Home Assistant Media Player entity by inspecting its metadata,
 * device registry association, manufacturer, model, and supported features.
 */
export function detectMediaPlayerType(
  entity: HAEntity | ResolvedEntity,
  deviceRegistry?: HADevice[] | Record<string, HADevice>,
  allEntities?: HAEntity[] | ResolvedEntity[] | Record<string, HAEntity | ResolvedEntity>
): ClassifiedMediaPlayer {
  const entityId = entity.entity_id.toLowerCase();
  const friendlyName = (entity.attributes?.friendly_name || '').toLowerCase();
  const deviceClass = (entity.attributes?.device_class || '').toLowerCase();
  const appName = (entity.attributes?.app_name || '').toLowerCase();
  const source = (entity.attributes?.source || '').toLowerCase();
  const supportedFeatures = Number(entity.attributes?.supported_features || 0);

  // 1. Resolve Device Registry Entry
  let matchedDevice: HADevice | undefined;
  const entityDeviceId = (entity as ResolvedEntity).device_id || (entity as any).deviceId;

  if (deviceRegistry) {
    if (Array.isArray(deviceRegistry)) {
      if (entityDeviceId) {
        matchedDevice = deviceRegistry.find(d => d.id === entityDeviceId);
      }
      if (!matchedDevice) {
        matchedDevice = deviceRegistry.find(d => 
          entityId.includes(d.id.toLowerCase()) || 
          d.name.toLowerCase() === friendlyName
        );
      }
    } else if (entityDeviceId && deviceRegistry[entityDeviceId]) {
      matchedDevice = deviceRegistry[entityDeviceId];
    }
  }

  const manufacturer = (matchedDevice?.manufacturer || '').toLowerCase();
  const model = (matchedDevice?.model || '').toLowerCase();
  const deviceName = (matchedDevice?.name || '').toLowerCase();

  // 2. Determine Kind and Apple Flag
  let kind: MediaPlayerKind = 'generic';
  let isApple = false;

  const isAppleManufacturer = manufacturer.includes('apple');
  const isAppleByNameOrId = entityId.includes('apple_tv') || entityId.includes('appletv') ||
    friendlyName.includes('apple tv') || model.includes('apple tv') || deviceName.includes('apple tv');

  const isHomePodByNameOrId = entityId.includes('homepod') || friendlyName.includes('homepod') ||
    model.includes('homepod') || deviceName.includes('homepod');

  const isSonosByNameOrId = manufacturer.includes('sonos') || model.includes('sonos') ||
    model.includes('arc') || model.includes('beam') || model.includes('era') || model.includes('symfonisk') ||
    entityId.includes('sonos') || friendlyName.includes('sonos');

  const isCastByNameOrId = manufacturer.includes('google') || model.includes('chromecast') ||
    model.includes('google cast') || model.includes('nest hub') || model.includes('google home') ||
    entityId.includes('chromecast') || entityId.includes('cast') || friendlyName.includes('chromecast') ||
    friendlyName.includes('google cast') || source.includes('cast');

  const isSmartTvByNameOrId = deviceClass === 'tv' ||
    manufacturer.includes('samsung') || manufacturer.includes('lg') || manufacturer.includes('sony') ||
    manufacturer.includes('tcl') || manufacturer.includes('vizio') || manufacturer.includes('philips') ||
    manufacturer.includes('roku') || manufacturer.includes('hisense') || manufacturer.includes('panasonic') ||
    model.includes('oled') || model.includes('qled') || model.includes('bravia') || model.includes('webos') ||
    model.includes('tizen') || model.includes('roku') ||
    entityId.includes('_tv') || friendlyName.includes(' tv') || appName.includes('tv');

  if (isAppleByNameOrId || (isAppleManufacturer && (deviceClass === 'tv' || isSmartTvByNameOrId))) {
    kind = 'apple_tv';
    isApple = true;
  } else if (isHomePodByNameOrId || (isAppleManufacturer && !isSmartTvByNameOrId)) {
    kind = 'homepod';
    isApple = true;
  } else if (isSonosByNameOrId) {
    kind = 'sonos';
    isApple = false;
  } else if (isCastByNameOrId) {
    kind = 'cast';
    isApple = false;
  } else if (isSmartTvByNameOrId) {
    kind = 'smart_tv';
    isApple = false;
  } else {
    kind = 'generic';
    isApple = isAppleManufacturer;
  }

  // 3. Resolve Companion Remote Entity
  let remoteEntityId: string | undefined;

  // Potential remote candidates
  const cleanId = entityId.replace('media_player.', '');
  const candidateRemoteIds = [
    `remote.${cleanId}`,
    `remote.${cleanId}_remote`,
    `remote.${cleanId.replace('_tv', '_apple_tv')}`,
    `remote.${cleanId.replace('_media_player', '_remote')}`,
    `remote.${cleanId.replace('_homepod', '_homepod_remote')}`
  ];

  if (allEntities) {
    const entityList = Array.isArray(allEntities) 
      ? allEntities 
      : Object.values(allEntities);

    // First try by matching device_id
    if (matchedDevice?.id) {
      const remoteByDev = entityList.find(e => 
        e.entity_id.startsWith('remote.') && 
        ((e as ResolvedEntity).device_id === matchedDevice?.id || (e as any).attributes?.device_id === matchedDevice?.id)
      );
      if (remoteByDev) {
        remoteEntityId = remoteByDev.entity_id;
      }
    }

    // Next try candidate matching
    if (!remoteEntityId) {
      const match = entityList.find(e => candidateRemoteIds.includes(e.entity_id.toLowerCase()));
      if (match) {
        remoteEntityId = match.entity_id;
      }
    }
  }

  // Default fallback for Apple TV, HomePod, or Smart TV if remote entity exists conventionally
  if (!remoteEntityId && (kind === 'apple_tv' || kind === 'smart_tv' || kind === 'homepod' || isApple)) {
    remoteEntityId = kind === 'homepod' ? `remote.${cleanId}_remote` : `remote.${cleanId}`;
  }

  const hasRemote = Boolean(remoteEntityId && (kind === 'apple_tv' || kind === 'smart_tv' || isSmartTvByNameOrId));

  // 4. Feature Capabilities
  const hasFeature = (flag: number) => (supportedFeatures & flag) !== 0;

  const supportsVolume = hasFeature(MediaPlayerEntityFeature.VOLUME_SET) ||
    hasFeature(MediaPlayerEntityFeature.VOLUME_STEP) ||
    entity.attributes?.volume_level !== undefined;

  const supportsPlayPause = hasFeature(MediaPlayerEntityFeature.PAUSE) ||
    hasFeature(MediaPlayerEntityFeature.PLAY) ||
    supportedFeatures === 0 || // default true
    true;

  const supportsNextPrev = hasFeature(MediaPlayerEntityFeature.NEXT_TRACK) ||
    hasFeature(MediaPlayerEntityFeature.PREVIOUS_TRACK) ||
    kind === 'sonos' || kind === 'homepod' || kind === 'apple_tv';

  const supportsMute = hasFeature(MediaPlayerEntityFeature.VOLUME_MUTE) ||
    entity.attributes?.is_volume_muted !== undefined;

  const supportsTurnOn = hasFeature(MediaPlayerEntityFeature.TURN_ON) || kind === 'smart_tv' || kind === 'apple_tv';
  const supportsTurnOff = hasFeature(MediaPlayerEntityFeature.TURN_OFF) || kind === 'smart_tv' || kind === 'apple_tv';

  const supportsSource = hasFeature(MediaPlayerEntityFeature.SELECT_SOURCE) ||
    Boolean(entity.attributes?.source_list && entity.attributes.source_list.length > 0);

  const supportsSoundMode = hasFeature(MediaPlayerEntityFeature.SELECT_SOUND_MODE) ||
    Boolean(entity.attributes?.sound_mode_list && entity.attributes.sound_mode_list.length > 0);

  const supportsGrouping = hasFeature(MediaPlayerEntityFeature.GROUPING) ||
    kind === 'sonos' || kind === 'homepod';

  return {
    kind,
    isApple,
    hasRemote,
    remoteEntityId,
    supportsVolume,
    supportsPlayPause,
    supportsNextPrev,
    supportsMute,
    supportsTurnOn,
    supportsTurnOff,
    supportsSource,
    supportsSoundMode,
    supportsGrouping,
    supportedFeatures
  };
}

/**
 * High-level Home Assistant Media Player Service Dispatcher
 */
export const MediaPlayerService = {
  play: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'media_play',
      {},
      { entity_id: entityId }
    );
  },

  pause: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'media_pause',
      {},
      { entity_id: entityId }
    );
  },

  playPause: async (entityId: string) => {
    const currentState = useAutoLayoutStore.getState().states[entityId]?.state;
    if (currentState === 'off' || currentState === 'standby') {
      await useAutoLayoutStore.getState().callHAService('media_player', 'turn_on', {}, { entity_id: entityId });
    }
    const service = currentState === 'idle' || currentState === 'off' ? 'media_play' : 'media_play_pause';
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      service,
      {},
      { entity_id: entityId }
    );
  },

  stop: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'media_stop',
      {},
      { entity_id: entityId }
    );
  },

  nextTrack: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'media_next_track',
      {},
      { entity_id: entityId }
    );
  },

  previousTrack: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'media_previous_track',
      {},
      { entity_id: entityId }
    );
  },

  setVolume: async (entityId: string, volumePct: number) => {
    const volume_level = Math.max(0, Math.min(1, volumePct / 100));
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'volume_set',
      { volume_level },
      { entity_id: entityId }
    );
  },

  setMute: async (entityId: string, isMuted: boolean) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'volume_mute',
      { is_volume_muted: isMuted },
      { entity_id: entityId }
    );
  },

  togglePower: async (entityId: string, remoteEntityId?: string) => {
    // If a companion remote entity is specified or discoverable, toggle the remote
    const cleanId = entityId.replace('media_player.', '');
    const targetRemote = remoteEntityId || `remote.${cleanId}_remote`;
    const states = useAutoLayoutStore.getState().states;
    const hasRemoteState = Boolean(states[targetRemote] || states[`remote.${cleanId}`]);

    if (remoteEntityId || hasRemoteState) {
      const target = remoteEntityId || (states[targetRemote] ? targetRemote : `remote.${cleanId}`);
      return useAutoLayoutStore.getState().callHAService(
        'remote',
        'toggle',
        {},
        { entity_id: target }
      );
    }

    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'toggle',
      {},
      { entity_id: entityId }
    );
  },

  turnOn: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'turn_on',
      {},
      { entity_id: entityId }
    );
  },

  turnOff: async (entityId: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'turn_off',
      {},
      { entity_id: entityId }
    );
  },

  selectSource: async (entityId: string, source: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'select_source',
      { source },
      { entity_id: entityId }
    );
  },

  selectSoundMode: async (entityId: string, soundMode: string) => {
    return useAutoLayoutStore.getState().callHAService(
      'media_player',
      'select_sound_mode',
      { sound_mode: soundMode },
      { entity_id: entityId }
    );
  },

  sendRemoteCommand: async (remoteEntityId: string, command: string | string[]) => {
    const commands = Array.isArray(command) ? command : [command];
    return useAutoLayoutStore.getState().callHAService(
      'remote',
      'send_command',
      { command: commands },
      { entity_id: remoteEntityId }
    );
  },

  sendRemoteKey: async (remoteEntityId: string, key: 'up' | 'down' | 'left' | 'right' | 'select' | 'menu' | 'top_menu' | 'home' | 'play_pause' | 'volume_up' | 'volume_down' | 'mute') => {
    return useAutoLayoutStore.getState().callHAService(
      'remote',
      'send_command',
      { command: [key] },
      { entity_id: remoteEntityId }
    );
  }
};
