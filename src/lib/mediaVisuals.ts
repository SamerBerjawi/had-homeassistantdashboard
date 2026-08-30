/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Media artwork & visual asset resolution for music, streaming apps,
 * Apple TV, Android TV, Google Cast, and general media devices.
 */

import React from 'react';
import {
  Television,
  YoutubeLogo,
  SpotifyLogo,
  FilmStrip,
  VideoCamera,
  PlayCircle,
  MusicNotes,
  Radio,
  Broadcast,
  DeviceTablet,
  Airplay,
  Icon
} from '@phosphor-icons/react';
import { HAEntity, ResolvedEntity } from '../types';

export interface AppVisualInfo {
  name: string;
  icon: Icon;
  bgGradient: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

// Map common streaming apps (by app_name or app_id substring) to recognizable branding & icons
const APP_REGISTRY: Record<string, { icon: Icon; gradient: string; accent: string; badgeBg: string; badgeBorder: string; badgeText: string }> = {
  youtube: {
    icon: YoutubeLogo,
    gradient: 'from-red-600/30 to-red-950/60',
    accent: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.18)',
    badgeBorder: 'rgba(239, 68, 68, 0.4)',
    badgeText: '#fca5a5'
  },
  netflix: {
    icon: FilmStrip,
    gradient: 'from-red-700/30 to-black/80',
    accent: '#e50914',
    badgeBg: 'rgba(229, 9, 20, 0.18)',
    badgeBorder: 'rgba(229, 9, 20, 0.4)',
    badgeText: '#fca5a5'
  },
  spotify: {
    icon: SpotifyLogo,
    gradient: 'from-emerald-600/30 to-emerald-950/60',
    accent: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.18)',
    badgeBorder: 'rgba(34, 197, 94, 0.4)',
    badgeText: '#86efac'
  },
  apple_tv: {
    icon: Television,
    gradient: 'from-slate-700/30 to-slate-950/60',
    accent: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.18)',
    badgeBorder: 'rgba(148, 163, 184, 0.4)',
    badgeText: '#cbd5e1'
  },
  disney: {
    icon: FilmStrip,
    gradient: 'from-blue-600/30 to-indigo-950/60',
    accent: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.18)',
    badgeBorder: 'rgba(59, 130, 246, 0.4)',
    badgeText: '#93c5fd'
  },
  prime: {
    icon: FilmStrip,
    gradient: 'from-sky-600/30 to-cyan-950/60',
    accent: '#0ea5e9',
    badgeBg: 'rgba(14, 165, 233, 0.18)',
    badgeBorder: 'rgba(14, 165, 233, 0.4)',
    badgeText: '#7dd3fc'
  },
  plex: {
    icon: FilmStrip,
    gradient: 'from-amber-600/30 to-amber-950/60',
    accent: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    badgeBorder: 'rgba(245, 158, 11, 0.4)',
    badgeText: '#fcd34d'
  },
  twitch: {
    icon: Broadcast,
    gradient: 'from-purple-600/30 to-purple-950/60',
    accent: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.18)',
    badgeBorder: 'rgba(168, 85, 247, 0.4)',
    badgeText: '#d8b4fe'
  },
  music: {
    icon: MusicNotes,
    gradient: 'from-pink-600/30 to-rose-950/60',
    accent: '#ec4899',
    badgeBg: 'rgba(236, 72, 153, 0.18)',
    badgeBorder: 'rgba(236, 72, 153, 0.4)',
    badgeText: '#f472b6'
  },
  cast: {
    icon: Airplay,
    gradient: 'from-teal-600/30 to-teal-950/60',
    accent: '#14b8a6',
    badgeBg: 'rgba(20, 184, 166, 0.18)',
    badgeBorder: 'rgba(20, 184, 166, 0.4)',
    badgeText: '#5eead4'
  }
};

/**
 * Identify app details from entity attributes
 */
export function getAppVisualInfo(appName?: string | null, appId?: string | null): AppVisualInfo | null {
  const combined = `${appName || ''} ${appId || ''}`.toLowerCase();
  if (!combined.trim()) return null;

  for (const [key, info] of Object.entries(APP_REGISTRY)) {
    if (combined.includes(key)) {
      return {
        name: appName || key.toUpperCase(),
        icon: info.icon,
        bgGradient: info.gradient,
        accentColor: info.accent,
        badgeBg: info.badgeBg,
        badgeBorder: info.badgeBorder,
        badgeText: info.badgeText
      };
    }
  }

  // Generic app fallback if app_name exists
  if (appName && appName.trim()) {
    return {
      name: appName.trim(),
      icon: Television,
      bgGradient: 'from-indigo-600/30 to-slate-950/60',
      accentColor: '#6366f1',
      badgeBg: 'rgba(99, 102, 241, 0.18)',
      badgeBorder: 'rgba(99, 102, 241, 0.4)',
      badgeText: '#a5b4fc'
    };
  }

  return null;
}

export interface MediaVisualResolution {
  kind: 'image' | 'app' | 'idle' | 'off';
  rawImage: string | null;
  appInfo: AppVisualInfo | null;
  title: string;
  subtitle: string;
  album: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  isOff: boolean;
}

/**
 * Resolves artwork, app metadata, and fallback states for any media entity.
 */
export function resolveMediaVisual(
  entity: HAEntity | ResolvedEntity
): MediaVisualResolution {
  const isPlaying = entity.state === 'playing';
  const isPaused = entity.state === 'paused';
  const isOff = entity.state === 'off' || entity.state === 'standby' || entity.state === 'unavailable';

  const attrs = entity.attributes || {};
  const rawImage = attrs.entity_picture || attrs.media_image || null;
  const appName = attrs.app_name || attrs.source || null;
  const appId = attrs.app_id || null;

  const appInfo = getAppVisualInfo(appName, appId);

  const friendlyName = attrs.friendly_name || ('name' in entity ? entity.name : entity.entity_id);
  const mediaTitle = attrs.media_title;
  const mediaArtist = attrs.media_artist;
  const mediaAlbum = attrs.media_album_name || null;

  let title = '';
  let subtitle = '';

  if (mediaTitle) {
    title = mediaTitle;
    subtitle = mediaArtist || appName || friendlyName;
  } else if (appInfo) {
    title = appInfo.name;
    subtitle = isPlaying ? 'Active Streaming' : friendlyName;
  } else if (isPlaying) {
    title = 'Active Audio Playback';
    subtitle = friendlyName;
  } else if (isPaused) {
    title = 'Paused';
    subtitle = friendlyName;
  } else if (isOff) {
    title = 'Powered Off';
    subtitle = friendlyName;
  } else {
    title = 'Idle';
    subtitle = friendlyName;
  }

  let kind: MediaVisualResolution['kind'] = 'idle';
  if (isOff) {
    kind = 'off';
  } else if (rawImage) {
    kind = 'image';
  } else if (appInfo) {
    kind = 'app';
  }

  return {
    kind,
    rawImage,
    appInfo,
    title,
    subtitle,
    album: mediaAlbum,
    isPlaying,
    isPaused,
    isOff
  };
}
