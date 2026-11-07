import { describe, expect, it } from 'vitest';
import { enrichAreaEntities } from '../src/services/areaEntityEnrichment';
import type { ResolvedEntity } from '../src/types';
import type { AreaData } from '../src/types/rooms';

const ent = (entityId: string, state = 'on', attributes: Record<string, any> = {}, name = ''): ResolvedEntity =>
  ({ entity_id: entityId, domain: entityId.split('.')[0], name, state, attributes }) as unknown as ResolvedEntity;

const area = (partial: Partial<AreaData['entities']>): AreaData['entities'] =>
  ({ lights: [], switches: [], climates: [], fans: [], locks: [], covers: [], vacuums: [], mediaPlayers: [], cameras: [], sensors: [], binarySensors: [], ...partial }) as unknown as AreaData['entities'];

describe('enrichAreaEntities', () => {
  it('attaches a companion battery to its host by shared device_id', () => {
    const lock = ent('lock.front_door', 'locked', { device_id: 'dev1' });
    const battery = ent('sensor.front_door_battery', '82', { device_id: 'dev1', device_class: 'battery' });
    const result = enrichAreaEntities(area({ locks: [lock], sensors: [battery] }));

    expect(result.enrichedLocks[0].attributes.battery_level).toBe(82);
    expect(result.unclaimedBatterySensors).toHaveLength(0);
  });

  it('matches by object id when there is no device_id', () => {
    const light = ent('light.hall_lamp');
    const battery = ent('sensor.hall_lamp_battery', '40', { device_class: 'battery' });
    const result = enrichAreaEntities(area({ lights: [light], sensors: [battery] }));

    expect(result.enrichedLights[0].attributes.battery_level).toBe(40);
  });

  it('leaves unmatched batteries as standalone tiles', () => {
    const battery = ent('sensor.remote_battery', '55', { device_class: 'battery' });
    const result = enrichAreaEntities(area({ lights: [ent('light.ceiling')], sensors: [battery] }));

    expect(result.enrichedLights[0].attributes.battery_level).toBeUndefined();
    expect(result.unclaimedBatterySensors.map((b) => b.entity_id)).toEqual(['sensor.remote_battery']);
  });

  it('does not overwrite a battery level the host already reports', () => {
    const lock = ent('lock.back', 'locked', { battery_level: 10 });
    const battery = ent('sensor.back_battery', '99', { device_class: 'battery' });
    const result = enrichAreaEntities(area({ locks: [lock], sensors: [battery] }));

    expect(result.enrichedLocks[0].attributes.battery_level).toBe(10);
  });

  it('ignores battery states that are not a 0-100 number', () => {
    const lock = ent('lock.garage', 'locked', { device_id: 'd9' });
    const battery = ent('sensor.garage_battery', 'unavailable', { device_id: 'd9', device_class: 'battery' });
    const result = enrichAreaEntities(area({ locks: [lock], sensors: [battery] }));

    expect(result.enrichedLocks[0].attributes.battery_level).toBeUndefined();
    expect(result.unclaimedBatterySensors).toHaveLength(1);
  });

  it('does not let one battery be claimed by two hosts', () => {
    const a = ent('light.desk', 'on', { device_id: 'shared' });
    const b = ent('light.shelf', 'on', { device_id: 'shared' });
    const battery = ent('sensor.shared_battery', '70', { device_id: 'shared', device_class: 'battery' });
    const result = enrichAreaEntities(area({ lights: [a, b], sensors: [battery] }));

    const withBattery = result.enrichedLights.filter((l) => l.attributes.battery_level !== undefined);
    expect(withBattery).toHaveLength(1);
  });

  it('returns empty groups for an empty area', () => {
    const result = enrichAreaEntities(area({}));
    expect(result.enrichedLights).toEqual([]);
    expect(result.generalSensors).toEqual([]);
    expect(result.unclaimedBatterySensors).toEqual([]);
  });
});
