/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HELPER_DOMAINS, INTEGRATION_DISPLAY_NAMES, KNOWN_INTEGRATIONS_META } from './catalog';

export function isHelper(domain?: string, source?: string, platform?: string): boolean {
  if (source === 'helper') return true;
  const d = (domain || '').toLowerCase().trim();
  const p = (platform || '').toLowerCase().trim();
  if (d.startsWith('input_') || p.startsWith('input_')) return true;
  if (HELPER_DOMAINS.has(d) || HELPER_DOMAINS.has(p)) return true;
  if (d.includes('switch_as_') || p.includes('switch_as_') || d.includes('_as_x') || p.includes('_as_x')) return true;
  if (d === 'switch_as_x' || p === 'switch_as_x' || d === 'change_device_type' || p === 'change_device_type') return true;
  return false;
}

export function formatIntegrationName(domain?: string, candidateTitle?: string): string {
  const dom = (domain || '').toLowerCase().trim();
  if (!dom) return candidateTitle || 'Unknown Integration';
  if (INTEGRATION_DISPLAY_NAMES[dom]) {
    return INTEGRATION_DISPLAY_NAMES[dom];
  }
  if (KNOWN_INTEGRATIONS_META[dom]?.name) {
    return KNOWN_INTEGRATIONS_META[dom].name;
  }
  if (candidateTitle && candidateTitle.trim() && candidateTitle.toLowerCase() !== dom && !candidateTitle.includes('_')) {
    return candidateTitle.trim();
  }
  return dom
    .split(/[_-]+/)
    .filter(Boolean)
    .map(w => {
      const acronyms: Record<string, string> = {
        tv: 'TV',
        ip: 'IP',
        iot: 'IoT',
        api: 'API',
        usb: 'USB',
        hdmi: 'HDMI',
        cec: 'CEC',
        ble: 'BLE',
        nfc: 'NFC',
        rf: 'RF',
        ir: 'IR',
        zha: 'ZHA',
        mqtt: 'MQTT',
        esphome: 'ESPHome',
        homekit: 'HomeKit',
        eufy: 'Eufy',
        hacs: 'HACS'
      };
      if (acronyms[w]) return acronyms[w];
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}
