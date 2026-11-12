import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findEntity, parseNum, parseNumOptional, resolveZone } from '../src/services/mobility/entityLookup';
import { bucketSpeedHistory, generateSpeedTimeseries } from '../src/services/mobility/speedHistory';
import { deriveCarMetrics } from '../src/services/mobility/carMetrics';
import { deriveBikeMetrics } from '../src/services/mobility/bikeMetrics';

const home: any = { entity_id: 'zone.home', name: 'Home', latitude: 50, longitude: 4, radius: 100 };
const work: any = { entity_id: 'zone.work', name: 'Work', latitude: 51, longitude: 5, radius: 100 };
const ent = (entity_id: string, state: string, attributes: any = {}) => ({ entity_id, state, attributes });
const map = (...es: any[]) => Object.fromEntries(es.map((e) => [e.entity_id, e]));

describe('entityLookup', () => {
  it('parses numbers leniently', () => {
    expect(parseNum('12.5 km')).toBe(12.5);
    expect(parseNum('abc', 7)).toBe(7);
    expect(parseNumOptional('unavailable')).toBeUndefined();
    expect(parseNumOptional(NaN)).toBeUndefined();
    expect(parseNumOptional(3)).toBe(3);
  });
  it('prefers exact id, then suffix, then fuzzy', () => {
    const s = map(ent('sensor.x_elvehcharging', 'a'), ent('sensor.x_elveh', 'b'), ent('sensor.other_range_thing', 'c'));
    expect(findEntity(s, 'sensor', ['sensor.x_elveh'])?.state).toBe('b');
    expect(findEntity(s, 'sensor', ['_elveh'])?.state).toBe('b');
    expect(findEntity(s, 'sensor', ['range'])?.state).toBe('c');
    expect(findEntity(s, 'sensor', ['nothing'])).toBeUndefined();
  });
  it('resolves zones by tracker state, then by distance, then defaults to home', () => {
    expect(resolveZone(0, 0, 'home', [home])).toEqual({ zoneName: 'At Home', isAtHome: true });
    expect(resolveZone(0, 0, 'Work', [home, work])).toEqual({ zoneName: 'In Work Zone', isAtHome: false });
    expect(resolveZone(51, 5, 'not_home', [home, work])).toEqual({ zoneName: 'In Work Zone', isAtHome: false });
    expect(resolveZone(10, 10, 'not_home', [home, work]).isAtHome).toBe(true);
  });
});

describe('speedHistory', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('demo series has 24 points ending at the current speed', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00'));
    const pts = generateSpeedTimeseries(42);
    expect(pts).toHaveLength(24);
    expect(pts[23].speed).toBe(42);
  });
  it('buckets by 15 minutes, takes the peak and carries the last value forward', () => {
    const end = Date.UTC(2026, 0, 1, 12, 0, 0);
    const raw = [
      { timestamp: end - 3 * 3600_000, state: '30' },
      { timestamp: end - 3 * 3600_000 + 60_000, state: '80' },
      { timestamp: end - 2 * 3600_000, state: '0' },
      { timestamp: end - 1000, state: 'unavailable' }
    ];
    const out = bucketSpeedHistory(raw, end);
    expect(out.length).toBeGreaterThan(90);
    expect(Math.max(...out.map((p) => p.speed))).toBe(80);
    expect(out[out.length - 1].speed).toBe(0);
    expect(bucketSpeedHistory([{ timestamp: end, state: 'n/a' }], end)).toEqual([]);
  });
});

describe('deriveCarMetrics', () => {
  const base = { resolvedZones: [home], speedHistory: [] as any[] };
  it('uses real entities when live', () => {
    const states = map(
      ent('sensor.car_soc', '55'),
      ent('sensor.car_speed', '30', { unit_of_measurement: 'km/h' }),
      ent('lock.car_doorlock', 'unlocked'),
      ent('sensor.car_elvehcharging', 'Charging'),
      ent('device_tracker.car_tracker', 'not_home', { latitude: 51, longitude: 5 })
    );
    const m = deriveCarMetrics({ ...base, states, isDemo: false, resolvedZones: [home, work] });
    expect(m.soc).toBe(55);
    expect(m.isMoving).toBe(true);
    expect(m.gearPosition).toBe('P');
    expect(m.doorsLocked).toBe(false);
    expect(m.gps).toEqual({ latitude: 51, longitude: 5 });
    expect(m.locationZone).toBe('In Work Zone');
    expect(m.controls.unlockDoorLockId).toBe('lock.car_doorlock');
    expect(m.targetSocPercent).toBe(80);
  });
  it('leaves values undefined live but fills demo values in demo mode', () => {
    const live = deriveCarMetrics({ ...base, states: {}, isDemo: false });
    expect(live.soc).toBeUndefined();
    expect(live.tirePressure.status).toBe('Unavailable');
    const demo = deriveCarMetrics({ ...base, states: {}, isDemo: true, resolvedZones: [] });
    expect(demo.soc).toBe(84);
    expect(demo.gps).toEqual({ latitude: 37.7749, longitude: -122.4194 });
    expect(demo.speedTimeseries).toHaveLength(24);
  });
  it('honours the configured default target SoC', () => {
    expect(deriveCarMetrics({ ...base, states: {}, isDemo: false, targetSocDefault: 90 }).targetSoc).toBe('90%');
  });
});

describe('deriveBikeMetrics', () => {
  it('derives lock and battery from entities', () => {
    const states = map(ent('sensor.cowboy_battery', '61'), ent('lock.cowboy_lock', 'locked'));
    const m = deriveBikeMetrics({ states, resolvedZones: [home], isDemo: false });
    expect(m.batteryPercent).toBe(61);
    expect(m.isLocked).toBe(true);
    expect(m.lastTrip).toBeUndefined();
  });
  it('fills demo data', () => {
    const m = deriveBikeMetrics({ states: {}, resolvedZones: [], isDemo: true });
    expect(m.batteryPercent).toBe(78);
    expect(m.lastTrip?.title).toContain('Marina');
  });
});
