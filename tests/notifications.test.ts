import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { extractHANotifications } from '../src/services/notificationsService';
import { MOCK_STATES, MOCK_ENTITY_REGISTRY } from '../src/data/mockRegistries';

const mk = (entity_id: string, state: string, attributes: Record<string, any> = {}) => ({ entity_id, state, attributes, last_changed: '', last_updated: '', context: undefined }) as any;

const extra: Record<string, any> = {
  'update.core': mk('update.core', 'on', { installed_version: '2026.1', latest_version: '2026.2', title: 'HA Core', release_summary: 'Notes' }),
  'update.addon': mk('update.addon', 'off', { installed_version: '1', latest_version: '1', friendly_name: 'Addon' }),
  'update.skipped': mk('update.skipped', 'off', { installed_version: '1', latest_version: '2', skipped_version: '2', friendly_name: 'Skipped' }),
  'binary_sensor.updater': mk('binary_sensor.updater', 'on', { newest_version: '2026.3' }),
  'binary_sensor.kitchen_leak': mk('binary_sensor.kitchen_leak', 'on', { device_class: 'moisture', friendly_name: 'Kitchen Leak' }),
  'binary_sensor.hall_smoke': mk('binary_sensor.hall_smoke', 'on', { device_class: 'smoke', friendly_name: 'Hall Smoke' }),
  'binary_sensor.door_tamper': mk('binary_sensor.door_tamper', 'on', { device_class: 'tamper', friendly_name: 'Door Tamper' }),
  'binary_sensor.pump_problem': mk('binary_sensor.pump_problem', 'on', { device_class: 'problem', friendly_name: 'Pump' }),
  'sensor.remote_battery': mk('sensor.remote_battery', '7', { device_class: 'battery', unit_of_measurement: '%', friendly_name: 'Remote Battery' }),
  'sensor.lock_battery': mk('sensor.lock_battery', '12', { device_class: 'battery', unit_of_measurement: '%', friendly_name: 'Lock Battery' }),
  'persistent_notification.welcome': mk('persistent_notification.welcome', 'notifying', { title: 'Welcome', message: 'Hello there' }),
  'alert.garage': mk('alert.garage', 'on', { friendly_name: 'Garage open' }),
  'sensor.restart_required': mk('sensor.restart_required', 'on', { friendly_name: 'Restart required' }),
  'binary_sensor.reboot_pending': mk('binary_sensor.reboot_pending', 'on', { friendly_name: 'Reboot pending' })
};

const states: Record<string, any> = { ...MOCK_STATES, ...extra };
const domainGroups: Record<string, any[]> = {};
for (const s of Object.values(states)) {
  const d = s.entity_id.split('.')[0];
  (domainGroups[d] ||= []).push({ entity_id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id, state: s.state, attributes: s.attributes, domain: d });
}

const base = () => ({
  domainGroups: domainGroups as any,
  states,
  entityRegistry: MOCK_ENTITY_REGISTRY as any,
  nativeNotifications: [{ notification_id: 'n1', title: 'Native', message: 'Native msg', created_at: '2026-01-01T00:00:00Z', status: 'unread' }] as any,
  nativeRepairs: [
    { issue_id: 'r1', domain: 'hacs', issue_domain: 'x', title: 'Restart required', message: 'Restart', severity: 'warning', created: '2026-01-01T00:00:00Z', is_fixable: true },
    { issue_id: 'r2', domain: 'mqtt', title: 'Deprecated', message: 'Migrate', severity: 'error', created: '2026-01-01T00:00:00Z', is_fixable: false }
  ] as any,
  dismissedNotificationIds: [] as string[],
  callHAService: vi.fn(async () => undefined),
  dismissNotification: vi.fn(),
  storeAlerts: [
    { id: 'a1', title: 'Store alert', message: 'm', severity: 'critical', category: 'security', timestamp: 1700000000000, isRead: false, isDismissed: false },
    { id: 'a2', title: 'Dismissed', message: 'm', severity: 'info', category: 'system', timestamp: 1700000000000, isRead: true, isDismissed: true }
  ] as any
});


const run = (p = base()) => extractHANotifications(p);
const key = (items: ReturnType<typeof run>) => items.map((i) => `${i.category}:${i.id}`);

// Characterization test: this order was captured from the implementation before it was split into
// src/services/notifications/*, and verified identical to it on the same inputs.
describe('extractHANotifications', () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-06-01T12:00:00Z')); });
  afterAll(() => vi.useRealTimers());

  it('collects, de-duplicates and sorts every source', () => {
    expect(key(run())).toEqual([
      'hazard:alert_leak_binary_sensor.kitchen_leak',
      'hazard:alert_smoke_binary_sensor.hall_smoke',
      'security:a1',
      'hazard:alert_prob_binary_sensor.pump_problem',
      'restart:dreame_wheels_1',
      'restart:r1',
      'restart:restart_required_core_update',
      'restart:sensor.restart_required',
      'repair:r2',
      'repair:mqtt_yaml_dep_1',
      'alert:alert.garage',
      'alert:a2',
      'persistent_notification:n1',
      'persistent_notification:apple_tv_disc_1',
      'persistent_notification:backup_ok_1',
      'persistent_notification:persistent_notification.welcome',
      'update:update.home_assistant_core_update',
      'update:update.zigbee2mqtt_update',
      'update:update.core',
      'update:update.skipped',
      'update:ha_updater_binary_sensor',
      'security:alert_prob_binary_sensor.door_tamper'
    ]);
  });

  it('puts critical items first regardless of category', () => {
    const items = run();
    const firstNonCritical = items.findIndex((i) => i.severity !== 'critical');
    expect(items.slice(firstNonCritical).some((i) => i.severity === 'critical')).toBe(false);
  });

  it('hides dismissed notifications', () => {
    const all = key(run());
    const some = key(run({ ...base(), dismissedNotificationIds: ['n1', 'update.core'] }));
    expect(all).toContain('persistent_notification:n1');
    expect(some).not.toContain('persistent_notification:n1');
    expect(some.length).toBeLessThan(all.length);
  });

  it('returns an empty list when there is nothing to report', () => {
    const bare = { domainGroups: {}, states: {}, dismissedNotificationIds: [], callHAService: vi.fn(), dismissNotification: vi.fn() } as never;
    expect(run(bare)).toEqual([]);
  });
});
