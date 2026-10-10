import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushAsync, installFakeSocket, latestSocket, FakeHomeAssistantSocket } from './helpers/fakeHomeAssistantSocket';

type Service = typeof import('../src/services/haWebSocket')['haWebSocketService'];

async function connectService(onEvents: { states?: Record<string, any>; changes?: Array<{ id: string; s: any }> } = {}) {
  vi.resetModules();
  const { haWebSocketService } = await import('../src/services/haWebSocket');
  const { alertService } = await import('../src/services/alertService');
  const alertCalls: Array<{ id: string; next: any; prev: any }> = [];
  vi.spyOn(alertService, 'evaluateStateChange').mockImplementation((id: string, next: any, prev?: any) => {
    alertCalls.push({ id, next, prev });
  });

  let registries: any = null;
  const changes = onEvents.changes ?? [];
  haWebSocketService.init({
    onStatusChange: () => {},
    onRegistriesLoaded: (payload) => {
      registries = payload;
    },
    onStateChanged: (id, s) => changes.push({ id, s }),
    onLogMessage: () => {}
  });
  haWebSocketService.setDemoMode(false);
  haWebSocketService.connect('http://ha.local:8123', 'token');
  latestSocket().open();
  await flushAsync();
  return { service: haWebSocketService as Service, changes, alertCalls, getRegistries: () => registries };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('connection lifecycle', () => {
  beforeEach(() => {
    installFakeSocket({ states: [{ entity_id: 'light.a', state: 'on', attributes: {} }] });
  });

  it('rejects requests that get no reply within the timeout', async () => {
    const { service } = await connectService();
    const result = service.sendRequest('never_answered', {}, { timeoutMs: 5000 });
    const assertion = expect(result).rejects.toThrow(/did not respond to never_answered within 5s/);
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });

  it('keeps a socket that answers heartbeats', async () => {
    const { service } = await connectService();
    await vi.advanceTimersByTimeAsync(30000);
    expect(latestSocket().sent.some((m) => m.type === 'ping')).toBe(true);
    expect(FakeHomeAssistantSocket.instances).toHaveLength(1);
    expect(service.getStatus()).toBe('connected');
  });

  it('drops a silent socket and reconnects', async () => {
    const { service } = await connectService();
    const socket = latestSocket();
    socket.autoPong = false;
    await vi.advanceTimersByTimeAsync(30000 + 10001);
    expect(socket.closed).toBe(true);
    expect(service.getStatus()).toBe('disconnected');
    await vi.advanceTimersByTimeAsync(5000);
    expect(FakeHomeAssistantSocket.instances).toHaveLength(2);
  });

  it('does not let a stale reconnect timer replace a healthy connection', async () => {
    const { service } = await connectService();
    latestSocket().onclose?.(); // drop -> schedules a reconnect
    const before = FakeHomeAssistantSocket.instances.length;
    service.connect('http://ha.local:8123', 'token', true); // e.g. tab became visible
    const fresh = latestSocket();
    fresh.open();
    await flushAsync();
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeHomeAssistantSocket.instances.length).toBe(before + 1);
    expect(fresh.closed).toBe(false);
    expect(service.getStatus()).toBe('connected');
  });
});

describe('subscribe_entities', () => {
  beforeEach(() => {
    installFakeSocket({
      entitySnapshot: {
        'light.kitchen': { s: 'off', a: { friendly_name: 'Kitchen', brightness: 0 }, c: 'ctx1', lc: 1760000000 },
        'sensor.temp': { s: '21.5', a: { unit_of_measurement: '°C' }, c: 'ctx2', lc: 1760000000, lu: 1760000100 }
      }
    });
  });

  it('loads the snapshot without get_states or state_changed', async () => {
    const { getRegistries } = await connectService();
    const sent = latestSocket().sent;
    expect(sent.some((m) => m.type === 'subscribe_entities')).toBe(true);
    expect(sent.some((m) => m.type === 'get_states' || m.type === 'subscribe_events')).toBe(false);
    expect(getRegistries().states['light.kitchen'].state).toBe('off');
    expect(getRegistries().states['sensor.temp'].last_updated).toBe(new Date(1760000100 * 1000).toISOString());
  });

  it('applies diffs, reuses unchanged attributes and passes the previous state to alerts', async () => {
    const { changes, alertCalls, getRegistries } = await connectService();
    const socket = latestSocket();
    const subId = socket.sent.find((m) => m.type === 'subscribe_entities').id;
    const before = getRegistries().states['light.kitchen'];

    socket.receive({ id: subId, type: 'event', event: { c: { 'light.kitchen': { '+': { s: 'on', lc: 1760000300, c: 'ctx3' } } } } });
    const light = changes.filter((c) => c.id === 'light.kitchen').at(-1)!.s;
    expect(light.state).toBe('on');
    expect(light.last_changed).toBe(new Date(1760000300 * 1000).toISOString());
    expect(light.attributes).toBe(before.attributes);
    expect(alertCalls.at(-1)).toMatchObject({ id: 'light.kitchen', prev: { state: 'off' }, next: { state: 'on' } });

    socket.receive({ id: subId, type: 'event', event: { c: { 'light.kitchen': { '+': { a: { brightness: 200 } }, '-': { a: ['friendly_name'] } } } } });
    const updated = changes.filter((c) => c.id === 'light.kitchen').at(-1)!.s;
    expect(updated.attributes.brightness).toBe(200);
    expect(updated.attributes).not.toHaveProperty('friendly_name');
    expect(updated.state).toBe('on');
  });

  it('handles added and removed entities', async () => {
    const { changes } = await connectService();
    const socket = latestSocket();
    const subId = socket.sent.find((m) => m.type === 'subscribe_entities').id;
    socket.receive({ id: subId, type: 'event', event: { a: { 'switch.new': { s: 'on', a: {}, c: 'x', lc: 1760000400 } } } });
    expect(changes.some((c) => c.id === 'switch.new' && c.s.state === 'on')).toBe(true);
    socket.receive({ id: subId, type: 'event', event: { r: ['switch.new'] } });
    socket.receive({ id: subId, type: 'event', event: { c: { 'switch.new': { '+': { s: 'off' } } } } });
    expect(changes.some((c) => c.id === 'switch.new' && c.s.state === 'off')).toBe(false);
  });

  it('falls back to get_states and state_changed on older Home Assistant', async () => {
    installFakeSocket({ entitySnapshot: null, states: [{ entity_id: 'light.kitchen', state: 'on', attributes: {} }] });
    const { getRegistries } = await connectService();
    const sent = latestSocket().sent;
    expect(sent.some((m) => m.type === 'get_states')).toBe(true);
    expect(sent.some((m) => m.type === 'subscribe_events' && m.event_type === 'state_changed')).toBe(true);
    expect(getRegistries().states['light.kitchen'].state).toBe('on');
  });
});

describe('weather forecasts', () => {
  it('subscribes to daily and hourly forecasts and keeps them across state updates', async () => {
    installFakeSocket({ states: [{ entity_id: 'weather.home', state: 'sunny', attributes: { supported_features: 3 } }] });
    const { changes } = await connectService();
    const socket = latestSocket();
    const subs = socket.sent.filter((m) => m.type === 'weather/subscribe_forecast');
    expect(subs.map((s) => s.forecast_type).sort()).toEqual(['daily', 'hourly']);

    const daily = subs.find((s) => s.forecast_type === 'daily');
    socket.receive({ id: daily.id, type: 'event', event: { type: 'daily', forecast: [{ datetime: 'd1', temperature: 20 }] } });
    expect(changes.filter((c) => c.id === 'weather.home').at(-1)!.s.attributes.forecast).toHaveLength(1);

    socket.receive({ type: 'event', event: { data: { entity_id: 'weather.home', new_state: { entity_id: 'weather.home', state: 'cloudy', attributes: { supported_features: 3 } } } } });
    const latest = changes.filter((c) => c.id === 'weather.home').at(-1)!.s;
    expect(latest.state).toBe('cloudy');
    expect(latest.attributes.forecast).toHaveLength(1);
  });
});
