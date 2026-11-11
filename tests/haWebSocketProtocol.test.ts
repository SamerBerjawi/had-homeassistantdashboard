import { describe, expect, it } from 'vitest';
import { applyCompressedDiff, expandCompressedState } from '../src/services/haWebSocketProtocol';
import { DEMO_HA_VERSION, buildDemoRegistriesPayload } from '../src/services/haWebSocketDemo';
import { forecastSubscriptionsFor, withCachedForecast } from '../src/services/haWeatherForecast';

describe('expandCompressedState', () => {
  it('expands epoch seconds and string contexts; last_updated defaults to last_changed', () => {
    const s = expandCompressedState('light.a', { s: 'on', a: { brightness: 5 }, c: 'ctx1', lc: 1700000000 });
    expect(s).toMatchObject({
      entity_id: 'light.a',
      state: 'on',
      attributes: { brightness: 5 },
      last_changed: '2023-11-14T22:13:20.000Z',
      last_updated: '2023-11-14T22:13:20.000Z',
      context: { id: 'ctx1', parent_id: null, user_id: null }
    });
  });
  it('uses lu when present and omits context when absent', () => {
    const s = expandCompressedState('sensor.x', { s: '1', lc: 1700000000, lu: 1700000060 });
    expect(s.last_updated).toBe('2023-11-14T22:14:20.000Z');
    expect('context' in s).toBe(false);
    expect(s.attributes).toEqual({});
  });
});

describe('applyCompressedDiff', () => {
  const base = expandCompressedState('light.a', { s: 'on', a: { brightness: 5, color: 'red' }, lc: 1700000000 });

  it('keeps the attributes object identity when only the state changes', () => {
    const next = applyCompressedDiff(base, { '+': { s: 'off', lc: 1700000100 } });
    expect(next.state).toBe('off');
    expect(next.attributes).toBe(base.attributes);
    expect(next.last_changed).toBe(next.last_updated);
  });
  it('merges added and removes deleted attributes', () => {
    const next = applyCompressedDiff(base, { '+': { a: { brightness: 9 }, lu: 1700000200 }, '-': { a: ['color'] } });
    expect(next.attributes).toEqual({ brightness: 9 });
    expect(next.last_updated).toBe('2023-11-14T22:16:40.000Z');
    expect(next.last_changed).toBe(base.last_changed);
    expect(base.attributes).toEqual({ brightness: 5, color: 'red' });
  });
});

describe('buildDemoRegistriesPayload', () => {
  it('copies the mock registries and carries the demo version, notifications and repairs', () => {
    const mocks = { MOCK_AREAS: [{ area_id: 'a' }], MOCK_DEVICES: [], MOCK_ENTITY_REGISTRY: [], MOCK_FLOORS: [], MOCK_STATES: { 'x.y': { entity_id: 'x.y' } } } as never;
    const p = buildDemoRegistriesPayload(mocks);
    expect(p.haVersion).toBe(DEMO_HA_VERSION);
    expect(p.areas).toEqual([{ area_id: 'a' }]);
    expect(p.areas).not.toBe((mocks as any).MOCK_AREAS);
    expect(p.nativeNotifications?.length).toBeGreaterThan(0);
    expect(p.nativeRepairs?.length).toBeGreaterThan(0);
  });
});

describe('forecastSubscriptionsFor', () => {
  it('requests daily when features are unknown', () => {
    expect(forecastSubscriptionsFor(undefined)).toEqual([{ type: 'daily', slot: 'daily' }]);
  });
  it('maps feature bits to subscriptions', () => {
    expect(forecastSubscriptionsFor(1 | 2)).toEqual([{ type: 'daily', slot: 'daily' }, { type: 'hourly', slot: 'hourly' }]);
    expect(forecastSubscriptionsFor(4)).toEqual([{ type: 'twice_daily', slot: 'daily' }]);
    expect(forecastSubscriptionsFor(2)).toEqual([{ type: 'hourly', slot: 'hourly' }]);
    expect(forecastSubscriptionsFor(0)).toEqual([]);
  });
});

describe('withCachedForecast', () => {
  const state = { entity_id: 'weather.home', state: 'sunny', attributes: { temperature: 20 } } as never;
  it('returns the same state when nothing is cached', () => {
    expect(withCachedForecast(state, undefined)).toBe(state);
  });
  it('adds only the cached slots to the attributes', () => {
    const out = withCachedForecast(state, { daily: [{ t: 1 }] });
    expect((out as any).attributes).toEqual({ temperature: 20, forecast: [{ t: 1 }] });
    expect(withCachedForecast(state, { hourly: [{ t: 2 }] })).toMatchObject({ attributes: { hourly_forecast: [{ t: 2 }] } });
  });
});
