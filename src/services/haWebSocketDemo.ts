/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Demo-mode registry payload (simulated areas, devices, notifications and repair issues).
 */

import type { HAWebSocketCallbacks } from './haWebSocketProtocol';

type RegistriesPayload = Parameters<HAWebSocketCallbacks['onRegistriesLoaded']>[0];
type MockRegistries = typeof import('../data/mockRegistries');

export const DEMO_HA_VERSION = '2026.8.0';

export function buildDemoRegistriesPayload({
  MOCK_AREAS,
  MOCK_DEVICES,
  MOCK_ENTITY_REGISTRY,
  MOCK_FLOORS,
  MOCK_STATES
}: MockRegistries): RegistriesPayload {
  return {
    areas: [...MOCK_AREAS],
    devices: [...MOCK_DEVICES],
    entityRegistry: [...MOCK_ENTITY_REGISTRY],
    floors: [...MOCK_FLOORS],
    states: { ...MOCK_STATES },
    haVersion: DEMO_HA_VERSION,
    nativeNotifications: [
      {
        notification_id: 'apple_tv_disc_1',
        title: 'New Device Discovered',
        message: 'Apple TV 4K in Living Room has been discovered and is ready for 1-tap HomeKit integration.',
        created_at: '2026-08-27T10:15:00Z',
        status: 'unread'
      },
      {
        notification_id: 'backup_ok_1',
        title: 'Automated Snapshot Backup',
        message: 'Nightly cloud backup completed successfully (1.42 GB encrypted archive stored).',
        created_at: '2026-08-27T04:00:00Z',
        status: 'unread'
      }
    ],
    nativeRepairs: [
      {
        issue_id: 'restart_required_grocy',
        domain: 'hacs',
        issue_domain: 'grocy',
        title: 'Restart required',
        message: 'Grocy custom integration was updated and requires a Home Assistant restart to take effect.',
        severity: 'warning',
        learn_more_url: 'https://github.com/custom-components/grocy',
        created: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        is_fixable: true
      },
      {
        issue_id: 'restart_required_tplink',
        domain: 'hacs',
        issue_domain: 'tplink',
        title: 'Restart required',
        message: 'TP-Link Smart Home integration was updated. Restart Home Assistant to load the new version.',
        severity: 'warning',
        learn_more_url: 'https://www.home-assistant.io/integrations/tplink/',
        created: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        is_fixable: true
      },
      {
        issue_id: 'restart_required_core_update',
        domain: 'hacs',
        issue_domain: 'homeassistant',
        title: 'Restart required',
        message: 'A system restart is required to finish installing Home Assistant Core 2026.8.4 update.',
        severity: 'warning',
        learn_more_url: 'https://www.home-assistant.io/latest-blogs/',
        created: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        is_fixable: true
      },
      {
        issue_id: 'restart_required_legacy_custom',
        domain: 'hacs',
        issue_domain: 'custom_legacy_device',
        title: 'Restart required',
        message: 'Custom legacy hardware integration updated. Restart required.',
        severity: 'warning',
        created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_fixable: true
      },
      {
        issue_id: 'mqtt_yaml_dep_1',
        domain: 'mqtt',
        issue_domain: 'mqtt',
        title: 'Legacy MQTT YAML Config Detected',
        message: 'Legacy YAML configuration for MQTT sensors is deprecated. Please migrate to UI config flow.',
        severity: 'warning',
        learn_more_url: 'https://www.home-assistant.io/integrations/mqtt/',
        created: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        is_fixable: true
      }
    ]
  };
}
