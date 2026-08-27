/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '@phosphor-icons/react';
import { resolveHAImageUrl, loadHAImageBlob } from '../../services/haImageService';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

interface PersonAvatarProps {
  name: string;
  entity_picture?: string | null;
  state?: string;
  isHome?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showPresenceDot?: boolean;
  className?: string;
}

// Deterministic pleasing gradients for avatar fallbacks based on person's name
const GRADIENT_PALETTES = [
  'from-violet-600 to-indigo-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-600 to-purple-600',
  'from-cyan-500 to-blue-500'
];

function getGradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

const SIZE_CONFIGS = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-[10px]',
    dot: 'w-2 h-2 -bottom-0.5 -right-0.5',
    iconSize: 12
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    dot: 'w-2.5 h-2.5 bottom-0 right-0',
    iconSize: 14
  },
  md: {
    container: 'w-9 h-9',
    text: 'text-xs',
    dot: 'w-2.5 h-2.5 bottom-0 right-0',
    iconSize: 16
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base font-extrabold',
    dot: 'w-3 h-3 bottom-0.5 right-0.5 ring-2',
    iconSize: 20
  },
  xl: {
    container: 'w-20 h-20',
    text: 'text-2xl font-black',
    dot: 'w-4 h-4 bottom-1 right-1 ring-2',
    iconSize: 28
  }
};

export default function PersonAvatar({
  name,
  entity_picture,
  state,
  isHome: explicitIsHome,
  size = 'md',
  showPresenceDot = true,
  className = ''
}: PersonAvatarProps) {
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);
  const haToken = useAutoLayoutStore(s => s.haToken);

  const isHome = explicitIsHome !== undefined ? explicitIsHome : state === 'home';
  const initialUrl = resolveHAImageUrl(entity_picture, serverUrl);

  const [imageSrc, setImageSrc] = useState<string>(initialUrl);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasImageError(false);

    if (!entity_picture) {
      setImageSrc('');
      return;
    }

    const targetUrl = resolveHAImageUrl(entity_picture, serverUrl);
    setImageSrc(targetUrl);

    // If it's a relative path or requires authentication (e.g. /api/image/serve), load authenticated blob
    if (entity_picture.startsWith('/') || (serverUrl && targetUrl.startsWith(serverUrl))) {
      loadHAImageBlob(entity_picture, serverUrl, haToken).then((blobUrl) => {
        if (isMounted && blobUrl) {
          setImageSrc(blobUrl);
        }
      }).catch(() => {
        // Handled by onError on img
      });
    }

    return () => {
      isMounted = false;
    };
  }, [entity_picture, serverUrl, haToken]);

  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const gradient = getGradientForName(name || 'User');
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className={`relative shrink-0 select-none ${config.container} ${className}`} title={`${name}${state ? ` (${state})` : ''}`}>
      {imageSrc && !hasImageError ? (
        <img
          src={imageSrc}
          alt={name}
          className={`w-full h-full rounded-full object-cover ring-2 ring-offset-1 dark:ring-offset-black transition-all ${
            isHome ? 'ring-emerald-500 dark:ring-emerald-400' : 'ring-slate-300 dark:ring-slate-700 opacity-70'
          }`}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-xs ring-2 ring-offset-1 dark:ring-offset-black transition-all bg-gradient-to-br ${gradient} ${
            isHome ? 'ring-emerald-500 dark:ring-emerald-400' : 'ring-slate-300 dark:ring-slate-700 opacity-70'
          }`}
        >
          {initials ? (
            <span className={`${config.text} tracking-tight leading-none`}>{initials}</span>
          ) : (
            <User size={config.iconSize} weight="bold" />
          )}
        </div>
      )}

      {/* Presence Dot Indicator */}
      {showPresenceDot && (
        <span
          className={`absolute rounded-full ring-2 ring-white dark:ring-slate-950 transition-colors ${config.dot} ${
            isHome ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-600'
          }`}
        />
      )}
    </div>
  );
}
