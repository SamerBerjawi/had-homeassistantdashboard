/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HADevice } from '../../types';

export function isHacsIntegrationDevice(dev: HADevice): boolean {
  if (!dev) return false;
  const name = (dev.name || dev.name_by_user || '').toLowerCase().trim();
  if (name === 'home assistant community store' || name === 'hacs' || name === 'hacs community store') {
    return false;
  }

  // 1. Identifiers check: [["hacs", "<id>"]] where id is not "hacs"
  const hasHacsIdentifier = (dev.identifiers || []).some(ident => {
    if (Array.isArray(ident) && String(ident[0]).toLowerCase() === 'hacs') {
      const val = String(ident[1]).toLowerCase().trim();
      return val !== 'hacs';
    }
    return false;
  });
  if (hasHacsIdentifier) return true;

  // 2. Manufacturer check: "HACS"
  const mfg = (dev.manufacturer || '').toLowerCase().trim();
  const model = (dev.model || '').toLowerCase().trim();
  if (mfg === 'hacs' && model !== 'hacs') {
    return true;
  }
  if (model === 'integration') {
    return true;
  }

  return false;
}

export function extractHacsDomain(dev: HADevice): string {
  // 1. From identifiers
  for (const ident of (dev.identifiers || [])) {
    if (Array.isArray(ident) && String(ident[0]).toLowerCase() === 'hacs') {
      const val = String(ident[1]).toLowerCase().trim();
      if (val && !/^\d+$/.test(val) && !val.includes('/') && val !== 'hacs') {
        return val;
      }
      if (val.includes('/')) {
        const repo = val.split('/')[1]?.trim();
        if (repo) {
          return repo.replace(/^ha-/, '').replace(/^hass-/, '').replace(/^home-assistant-/, '').replace(/-ha$/, '').replace(/-/g, '_');
        }
      }
    }
  }

  // 2. From configuration_url
  if (dev.configuration_url) {
    try {
      const parts = dev.configuration_url.replace(/\/$/, '').split('/');
      const repoName = parts[parts.length - 1]?.toLowerCase() || '';
      const cleaned = repoName
        .replace(/^ha-/, '')
        .replace(/^hass-/, '')
        .replace(/^home-assistant-/, '')
        .replace(/-ha$/, '')
        .replace(/-/g, '_');
      if (cleaned && cleaned !== 'hacs') {
        return cleaned;
      }
    } catch {
      // ignore
    }
  }

  // 3. From dev.name
  const rawName = (dev.name || dev.name_by_user || '').toLowerCase().trim();
  const slug = rawName
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '_');

  if (slug.includes('eufy')) return 'eufy_security';
  if (slug.includes('thermal_comfort')) return 'thermal_comfort';
  if (slug.includes('browser_mod')) return 'browser_mod';
  if (slug.includes('dreame')) return 'dreame';
  if (slug.includes('grocy')) return 'grocy';
  if (slug.includes('sonoff')) return 'sonoff';
  if (slug.includes('adaptive_lighting')) return 'adaptive_lighting';
  if (slug.includes('spook')) return 'spook';

  return slug || 'custom_integration';
}
