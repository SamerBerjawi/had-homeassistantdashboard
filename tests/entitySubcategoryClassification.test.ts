import { describe, expect, it } from 'vitest';
import { classifyBinarySensor, classifySensor } from '../src/services/entitySubcategoryClassification';
import type { ResolvedEntity } from '../src/types';

const entity = (entityId: string, attributes: Record<string, any> = {}, name = ''): ResolvedEntity =>
  ({ entity_id: entityId, domain: entityId.split('.')[0], name, state: 'on', attributes }) as unknown as ResolvedEntity;

describe('classifyBinarySensor', () => {
  it.each([
    ['binary_sensor.front', { device_class: 'door' }, 'door'],
    ['binary_sensor.garage_opener', {}, 'door'],
    ['binary_sensor.bedroom_window', {}, 'window'],
    ['binary_sensor.hall', { device_class: 'motion' }, 'motion'],
    ['binary_sensor.office', { device_class: 'occupancy' }, 'presence'],
    ['binary_sensor.kitchen_smoke', {}, 'safety'],
    ['binary_sensor.basement', { device_class: 'moisture' }, 'moisture'],
    ['binary_sensor.router', { device_class: 'connectivity' }, 'connectivity'],
    ['binary_sensor.ev', { device_class: 'plug' }, 'power_binary'],
    ['binary_sensor.something_else', {}, 'other_binary'],
  ])('%s %j -> %s', (id, attrs, expected) => {
    expect(classifyBinarySensor(entity(id, attrs))).toBe(expected);
  });

  it('uses the friendly name when the id is uninformative', () => {
    expect(classifyBinarySensor(entity('binary_sensor.x1', {}, 'Patio Door'))).toBe('door');
  });

  it('checks door before window, so an id mentioning both is a door', () => {
    expect(classifyBinarySensor(entity('binary_sensor.door_window_combo'))).toBe('door');
  });
});

describe('classifySensor', () => {
  it.each([
    ['sensor.phone', { device_class: 'battery' }, 'battery'],
    ['sensor.living', { device_class: 'temperature', unit_of_measurement: '°C' }, 'temperature'],
    ['sensor.living_hum', { device_class: 'humidity', unit_of_measurement: '%' }, 'humidity'],
    ['sensor.plug', { unit_of_measurement: 'kWh' }, 'energy'],
    ['sensor.office', { device_class: 'carbon_dioxide', unit_of_measurement: 'ppm' }, 'environmental'],
    ['sensor.ap', { device_class: 'signal_strength' }, 'network'],
    ['sensor.mystery', {}, 'other_sensor'],
  ])('%s %j -> %s', (id, attrs, expected) => {
    expect(classifySensor(entity(id, attrs))).toBe(expected);
  });

  it('prefers battery over other buckets for a percentage battery sensor', () => {
    expect(classifySensor(entity('sensor.lock_battery', { unit_of_measurement: '%' }))).toBe('battery');
  });

  it('is case-insensitive about units and ids', () => {
    expect(classifySensor(entity('sensor.Meter', { unit_of_measurement: 'KW' }))).toBe('energy');
  });
});
