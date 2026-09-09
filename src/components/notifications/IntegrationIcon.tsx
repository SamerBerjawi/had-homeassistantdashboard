/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { NotificationCategory } from '../../types/notifications';

interface IntegrationIconProps {
  domain?: string;
  entityPicture?: string;
  title?: string;
  category?: NotificationCategory;
  serverUrl?: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Normalizes an integration identifier or domain into the official
 * Home Assistant Brands repository identifier.
 */
export function normalizeIntegrationDomain(
  domain?: string,
  entityId?: string,
  title?: string
): string | null {
  if (domain) {
    let d = domain.toLowerCase().trim();
    // Strip repository owner if it's in the form 'author/repo'
    if (d.includes('/')) {
      const parts = d.split('/');
      d = parts[parts.length - 1];
    }
    // Remove common prefixes/suffixes
    d = d.replace(/^ha-/, '').replace(/^home-assistant-/, '').replace(/^custom_/, '');

    // Domain alias normalization
    if (d === 'tp_link' || d === 'tp-link' || d === 'kasa' || d === 'tapo') return 'tplink';
    if (d === 'home_assistant' || d === 'home-assistant' || d === 'hass' || d === 'core' || d === 'supervisor' || d === 'operating_system') return 'homeassistant';
    if (d === 'zigbee2mqtt' || d === 'z2m') return 'zigbee2mqtt';
    if (d === 'zha') return 'zha';
    if (d === 'esphome') return 'esphome';
    if (d === 'hacs') return 'hacs';
    if (d === 'grocy') return 'grocy';
    if (d === 'philips_hue' || d === 'hue') return 'hue';
    if (d === 'wled') return 'wled';
    if (d === 'shelly') return 'shelly';
    if (d === 'sonos') return 'sonos';
    if (d === 'matter') return 'matter';
    if (d === 'mqtt') return 'mqtt';
    if (d === 'dreame' || d === 'dreame_vacuum') return 'dreame';
    if (d === 'apple_tv' || d === 'appletv' || d === 'homekit') return 'apple';
    if (d === 'xiaomi' || d === 'xiaomi_miio' || d === 'aqara') return 'xiaomi_miio';
    if (d === 'ecobee') return 'ecobee';
    if (d === 'nest') return 'nest';
    if (d === 'unifi' || d === 'unifi_network') return 'unifi';
    if (d === 'tuya') return 'tuya';

    return d.replace(/-/g, '_');
  }

  // Derive domain from entityId
  if (entityId) {
    const eid = entityId.toLowerCase();
    if (eid.includes('home_assistant') || eid.includes('homeassistant')) return 'homeassistant';
    if (eid.includes('hacs')) return 'hacs';
    if (eid.includes('zigbee2mqtt')) return 'zigbee2mqtt';
    if (eid.includes('esphome')) return 'esphome';
    if (eid.includes('tp_link') || eid.includes('tplink')) return 'tplink';
    if (eid.includes('grocy')) return 'grocy';
    if (eid.includes('mqtt')) return 'mqtt';
    if (eid.includes('shelly')) return 'shelly';
    if (eid.includes('wled')) return 'wled';
    if (eid.includes('hue')) return 'hue';
    if (eid.includes('sonos')) return 'sonos';
  }

  // Derive domain from Title text
  if (title) {
    const t = title.toLowerCase();
    if (t.includes('grocy')) return 'grocy';
    if (t.includes('tp-link') || t.includes('tplink') || t.includes('kasa')) return 'tplink';
    if (t.includes('home assistant') || t.includes('core update')) return 'homeassistant';
    if (t.includes('hacs')) return 'hacs';
    if (t.includes('zigbee2mqtt')) return 'zigbee2mqtt';
    if (t.includes('mqtt')) return 'mqtt';
    if (t.includes('esphome')) return 'esphome';
    if (t.includes('shelly')) return 'shelly';
    if (t.includes('wled')) return 'wled';
    if (t.includes('philips') || t.includes('hue')) return 'hue';
    if (t.includes('sonos')) return 'sonos';
    if (t.includes('apple tv') || t.includes('homekit')) return 'apple';
    if (t.includes('dreame')) return 'dreame';
    if (t.includes('tuya')) return 'tuya';
  }

  return null;
}

export default function IntegrationIcon({
  domain,
  entityPicture,
  title,
  category,
  serverUrl,
  fallbackIcon,
  className = '',
  size = 'md'
}: IntegrationIconProps) {
  const [hasError, setHasError] = useState(false);

  // Normalize the domain
  const normalizedDomain = useMemo(() => {
    return normalizeIntegrationDomain(domain, undefined, title);
  }, [domain, title]);

  // Determine the image URL
  const imageUrl = useMemo(() => {
    // 1. Direct entity picture attribute
    if (entityPicture) {
      if (
        entityPicture.startsWith('http://') ||
        entityPicture.startsWith('https://') ||
        entityPicture.startsWith('data:') ||
        entityPicture.startsWith('blob:')
      ) {
        return entityPicture;
      }
      if (entityPicture.startsWith('/') && serverUrl) {
        const cleanServer = serverUrl.replace(/\/+$/, '');
        return `${cleanServer}${entityPicture}`;
      }
      return entityPicture;
    }

    // 2. Official Home Assistant Brands CDN
    if (normalizedDomain) {
      return `https://brands.home-assistant.io/${normalizedDomain}/icon.png`;
    }

    return null;
  }, [entityPicture, normalizedDomain, serverUrl]);

  // Sizing definitions
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-[8px]',
    md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[9px]',
    lg: 'w-12 h-12 rounded-xl text-[10px]'
  }[size];

  // If image loaded or attempting to load
  if (imageUrl && !hasError) {
    return (
      <div
        className={`shrink-0 overflow-hidden flex items-center justify-center p-0 m-0 select-none bg-transparent ${sizeClasses} ${className}`}
      >
        <img
          src={imageUrl}
          alt={normalizedDomain || title || 'Integration'}
          loading="lazy"
          className="w-full h-full object-contain p-0 m-0 block"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // If image failed to load or domain is unknown:
  // Render Home Assistant's exact "icon not available" fallback box if a domain/integration was present
  if (normalizedDomain || domain) {
    return (
      <div
        className={`shrink-0 flex flex-col items-center justify-center p-0 m-0 select-none border border-slate-300/50 dark:border-white/10 bg-slate-200/80 dark:bg-white/[0.08] text-center leading-none ${sizeClasses} ${className}`}
        title={`Integration icon not available for: ${domain || normalizedDomain}`}
      >
        <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400">
          icon not
        </span>
        <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          available
        </span>
      </div>
    );
  }

  // Otherwise fallback to category icon or standard icon container
  return (
    <div
      className={`shrink-0 flex items-center justify-center p-0 m-0 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-transparent ${sizeClasses} ${className}`}
    >
      {fallbackIcon}
    </div>
  );
}
