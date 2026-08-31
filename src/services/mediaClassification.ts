/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export type MediaDeviceType = 'tv' | 'speaker' | 'receiver' | 'headphones' | 'generic';

// Home Assistant MediaPlayerEntityFeature bitmask flags
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
  SHUFFLE: 32768,
  SELECT_SOUND_MODE: 65536,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
  GROUPING: 524288
};

export interface MediaCapabilities {
  deviceType: MediaDeviceType;
  isTv: boolean;
  isSpeaker: boolean;
  isHeadphones: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isOff: boolean;
  isIdle: boolean;
  state: string;
  mediaTitle?: string;
  mediaArtist?: string;
  mediaAlbum?: string;
  mediaDuration?: number;
  mediaPosition?: number;
  mediaPositionUpdatedAt?: string;
  entityPicture?: string;
  appName?: string;
  volumePct: number;
  isMuted: boolean;
  sourceList: string[];
  currentSource?: string;
  soundModeList: string[];
  currentSoundMode?: string;
  shuffle: boolean;
  repeat: string;
  supportsVolumeSet: boolean;
  supportsVolumeMute: boolean;
  supportsPlay: boolean;
  supportsPause: boolean;
  supportsNext: boolean;
  supportsPrevious: boolean;
  supportsSeek: boolean;
  supportsSourceSelect: boolean;
  supportsSoundMode: boolean;
  supportsTurnOn: boolean;
  supportsTurnOff: boolean;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectMediaCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): MediaCapabilities {
  if (!entity) {
    return {
      deviceType: 'generic',
      isTv: false,
      isSpeaker: true,
      isHeadphones: false,
      isPlaying: false,
      isPaused: false,
      isOff: true,
      isIdle: false,
      state: 'off',
      volumePct: 50,
      isMuted: false,
      sourceList: [],
      soundModeList: [],
      shuffle: false,
      repeat: 'off',
      supportsVolumeSet: true,
      supportsVolumeMute: true,
      supportsPlay: true,
      supportsPause: true,
      supportsNext: true,
      supportsPrevious: true,
      supportsSeek: false,
      supportsSourceSelect: false,
      supportsSoundMode: false,
      supportsTurnOn: true,
      supportsTurnOff: true,
      friendlyName: 'Media Player'
    };
  }

  const attrs = entity.attributes || {};
  const state = String(entity.state || 'off').toLowerCase();
  const isPlaying = state === 'playing';
  const isPaused = state === 'paused';
  const isOff = state === 'off' || state === 'standby' || state === 'unavailable';
  const isIdle = state === 'idle' || state === 'buffering';

  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;

  // Device classification
  const rawClass = String(attrs.device_class || '').toLowerCase();
  const eid = entity.entity_id.toLowerCase();
  const fn = friendlyName.toLowerCase();

  let deviceType: MediaDeviceType = 'speaker';
  if (
    rawClass === 'tv' ||
    rawClass === 'receiver' ||
    eid.includes('tv') ||
    eid.includes('apple_tv') ||
    eid.includes('shield') ||
    eid.includes('firetv') ||
    eid.includes('roku') ||
    fn.includes('tv')
  ) {
    deviceType = 'tv';
  } else if (
    eid.includes('headphones') ||
    eid.includes('airpods') ||
    eid.includes('buds') ||
    fn.includes('headphones') ||
    fn.includes('airpods')
  ) {
    deviceType = 'headphones';
  } else if (rawClass === 'speaker' || eid.includes('speaker') || eid.includes('sonos') || eid.includes('homepod') || eid.includes('echo') || eid.includes('nest')) {
    deviceType = 'speaker';
  }

  const isTv = deviceType === 'tv';
  const isSpeaker = deviceType === 'speaker';
  const isHeadphones = deviceType === 'headphones';

  // Supported Features Bitmask
  const sf = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
  const hasFeature = (flag: number) => (sf & flag) !== 0 || sf === 0;

  const supportsVolumeSet = hasFeature(MediaPlayerEntityFeature.VOLUME_SET);
  const supportsVolumeMute = hasFeature(MediaPlayerEntityFeature.VOLUME_MUTE);
  const supportsPlay = hasFeature(MediaPlayerEntityFeature.PLAY);
  const supportsPause = hasFeature(MediaPlayerEntityFeature.PAUSE);
  const supportsNext = hasFeature(MediaPlayerEntityFeature.NEXT_TRACK);
  const supportsPrevious = hasFeature(MediaPlayerEntityFeature.PREVIOUS_TRACK);
  const supportsSeek = hasFeature(MediaPlayerEntityFeature.SEEK);
  const supportsSourceSelect = hasFeature(MediaPlayerEntityFeature.SELECT_SOURCE);
  const supportsSoundMode = hasFeature(MediaPlayerEntityFeature.SELECT_SOUND_MODE);
  const supportsTurnOn = hasFeature(MediaPlayerEntityFeature.TURN_ON);
  const supportsTurnOff = hasFeature(MediaPlayerEntityFeature.TURN_OFF);

  // Volume
  const rawVolume = typeof attrs.volume_level === 'number' ? attrs.volume_level : 0.45;
  const volumePct = Math.round(rawVolume * 100);
  const isMuted = Boolean(attrs.is_volume_muted);

  // Metadata
  const mediaTitle = typeof attrs.media_title === 'string' ? attrs.media_title : undefined;
  const mediaArtist = typeof attrs.media_artist === 'string' ? attrs.media_artist : undefined;
  const mediaAlbum = typeof attrs.media_album_name === 'string' ? attrs.media_album_name : undefined;
  const mediaDuration = typeof attrs.media_duration === 'number' ? attrs.media_duration : undefined;
  const mediaPosition = typeof attrs.media_position === 'number' ? attrs.media_position : undefined;
  const mediaPositionUpdatedAt = typeof attrs.media_position_updated_at === 'string' ? attrs.media_position_updated_at : undefined;
  const entityPicture = typeof attrs.entity_picture === 'string' ? attrs.entity_picture : typeof attrs.media_image === 'string' ? attrs.media_image : undefined;
  const appName = typeof attrs.app_name === 'string' ? attrs.app_name : undefined;

  // Real Source and Sound Mode lists (only if provided by HA)
  const sourceList = Array.isArray(attrs.source_list) ? attrs.source_list : [];
  const currentSource = typeof attrs.source === 'string' ? attrs.source : undefined;
  const soundModeList = Array.isArray(attrs.sound_mode_list) ? attrs.sound_mode_list : [];
  const currentSoundMode = typeof attrs.sound_mode === 'string' ? attrs.sound_mode : undefined;

  const shuffle = Boolean(attrs.shuffle);
  const repeat = String(attrs.repeat || 'off');
  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    deviceType,
    isTv,
    isSpeaker,
    isHeadphones,
    isPlaying,
    isPaused,
    isOff,
    isIdle,
    state,
    mediaTitle,
    mediaArtist,
    mediaAlbum,
    mediaDuration,
    mediaPosition,
    mediaPositionUpdatedAt,
    entityPicture,
    appName,
    volumePct,
    isMuted,
    sourceList,
    currentSource,
    soundModeList,
    currentSoundMode,
    shuffle,
    repeat,
    supportsVolumeSet,
    supportsVolumeMute,
    supportsPlay,
    supportsPause,
    supportsNext,
    supportsPrevious,
    supportsSeek,
    supportsSourceSelect,
    supportsSoundMode,
    supportsTurnOn,
    supportsTurnOff,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
