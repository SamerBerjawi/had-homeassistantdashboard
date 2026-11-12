/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HAZone } from '../../types';

export function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function parseNumOptional(val: unknown): number | undefined {
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export function findEntity(
  states: Record<string, any>,
  domain: string,
  exactOrPatterns: string[]
): any | undefined {
  if (!states) return undefined;

  const lowerDomain = domain.toLowerCase();

  // 1. Direct key lookup in states object
  for (const candidate of exactOrPatterns) {
    const fullId = candidate.includes('.') ? candidate : `${lowerDomain}.${candidate}`;
    if (states[fullId]) {
      return states[fullId];
    }
  }

  // 2. Case-insensitive exact entity_id match
  for (const candidate of exactOrPatterns) {
    const target = candidate.toLowerCase();
    const found = Object.values(states).find((e) => {
      if (!e || !e.entity_id || typeof e.entity_id !== 'string') return false;
      const id = e.entity_id.toLowerCase();
      return id === target || id === `${lowerDomain}.${target}`;
    });
    if (found) return found;
  }

  // 3. Exact suffix match on entity_id (avoids substring collision like 'elveh' vs 'elvehcharging')
  for (const candidate of exactOrPatterns) {
    const target = candidate.toLowerCase();
    const found = Object.values(states).find((e) => {
      if (!e || !e.entity_id || typeof e.entity_id !== 'string') return false;
      if (!e.entity_id.toLowerCase().startsWith(`${lowerDomain}.`)) return false;
      const id = e.entity_id.toLowerCase();
      if (target.startsWith('_')) {
        return id.endsWith(target);
      }
      return id.endsWith(`_${target}`) || id === `${lowerDomain}.${target}`;
    });
    if (found) return found;
  }

  // 4. Fuzzy fallback by friendly_name or substring
  return Object.values(states).find((entity) => {
    if (!entity || !entity.entity_id || typeof entity.entity_id !== 'string') return false;
    if (!entity.entity_id.toLowerCase().startsWith(`${lowerDomain}.`)) return false;

    const id = entity.entity_id.toLowerCase();
    const name = (entity.attributes?.friendly_name || '').toLowerCase();

    return exactOrPatterns.some((p) => {
      const lowerP = p.toLowerCase();
      return id.includes(lowerP) || name.includes(lowerP);
    });
  });
}

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function resolveZone(
  lat: number,
  lon: number,
  trackerState: string | undefined,
  resolvedZones: HAZone[] = []
): { zoneName: string; isAtHome: boolean } {
  if (trackerState && trackerState.toLowerCase() === 'home') {
    return { zoneName: 'At Home', isAtHome: true };
  }

  const matchedByName = resolvedZones.find(
    (z) =>
      z.name.toLowerCase() === trackerState?.toLowerCase() ||
      z.entity_id.toLowerCase() === `zone.${trackerState?.toLowerCase()}`
  );
  if (matchedByName) {
    const isHome = matchedByName.entity_id === 'zone.home' || matchedByName.name.toLowerCase() === 'home';
    return { zoneName: isHome ? 'At Home' : `In ${matchedByName.name} Zone`, isAtHome: isHome };
  }

  for (const zone of resolvedZones) {
    if (zone.latitude && zone.longitude) {
      const dist = getDistanceFromLatLonInMeters(lat, lon, zone.latitude, zone.longitude);
      const radius = Math.max(zone.radius || 100, 150);
      if (dist <= radius) {
        const isHome = zone.entity_id === 'zone.home' || zone.name.toLowerCase() === 'home';
        return { zoneName: isHome ? 'At Home' : `In ${zone.name} Zone`, isAtHome: isHome };
      }
    }
  }

  return { zoneName: 'In Home Zone', isAtHome: true };
}
