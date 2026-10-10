import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadStore() {
  vi.resetModules();
  const { useAutoLayoutStore } = await import('../src/store/useAutoLayoutStore');
  const { haWebSocketService } = await import('../src/services/haWebSocket');
  const { useAlertStore } = await import('../src/store/useAlertStore');
  const { loadMockRegistries } = await import('../src/data/loadMockRegistries');

  await useAutoLayoutStore.getState().init();
  // init() starts loading demo data asynchronously; let it land before tests set their own state
  await loadMockRegistries();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const svc = haWebSocketService as any;
  const haEvent = (id: string, state: string, attributes: Record<string, unknown> = {}) =>
    svc.callbacks.onStateChanged(id, { entity_id: id, state, attributes });
  const stateOf = (id: string) => useAutoLayoutStore.getState().states[id]?.state;

  return { store: useAutoLayoutStore, svc, haEvent, stateOf, useAlertStore };
}

describe('callHAService', () => {
  let ctx: Awaited<ReturnType<typeof loadStore>>;

  beforeEach(async () => {
    ctx = await loadStore();
    ctx.svc.isDemoMode = false; // live mode
    ctx.haEvent('light.kitchen', 'off');
    ctx.haEvent('lock.front', 'locked');
    ctx.haEvent('media_player.tv', 'playing', { media_title: 'Real Song' });
  });

  it('rejects, rolls back to the last HA state and shows a toast when the call fails', async () => {
    ctx.svc.callService = vi.fn().mockRejectedValue({ code: 'unknown_error', message: 'Device offline' });
    const { store, stateOf, useAlertStore } = ctx;

    store.getState().updateEntityState('light.kitchen', 'on'); // caller's optimistic write
    await expect(store.getState().callHAService('light', 'turn_on', {}, { entity_id: 'light.kitchen' }))
      .rejects.toThrow('Device offline');

    expect(stateOf('light.kitchen')).toBe('off');
    expect(useAlertStore.getState().toasts.some((t) => t.title === 'Home Assistant action failed')).toBe(true);
  });

  it('never shows a lock as unlocked unless Home Assistant says so', async () => {
    ctx.svc.callService = vi.fn().mockRejectedValue(new Error('Jammed'));
    const { store, stateOf } = ctx;

    await expect(store.getState().callHAService('lock', 'unlock', {}, { entity_id: 'lock.front' })).rejects.toThrow();
    expect(stateOf('lock.front')).toBe('locked');

    store.getState().updateEntityState('lock.front', 'unlocked');
    expect(stateOf('lock.front')).toBe('locked');
  });

  it('does not flip a toggle back when the state_changed event arrives before the result', async () => {
    ctx.svc.callService = vi.fn(async () => {
      ctx.haEvent('light.kitchen', 'on');
      return {};
    });
    await ctx.store.getState().callHAService('light', 'toggle', {}, { entity_id: 'light.kitchen' });
    expect(ctx.stateOf('light.kitchen')).toBe('on');
  });

  it("does not apply play/pause twice after a caller's optimistic write", async () => {
    ctx.svc.callService = vi.fn().mockResolvedValue({});
    ctx.store.getState().updateEntityState('media_player.tv', 'paused');
    await ctx.store.getState().callHAService('media_player', 'media_play_pause', {}, { entity_id: 'media_player.tv' });
    expect(ctx.stateOf('media_player.tv')).toBe('paused');
  });

  it('does not invent media metadata in live mode', async () => {
    ctx.svc.callService = vi.fn().mockResolvedValue({});
    ctx.haEvent('media_player.tv', 'idle', {});
    await ctx.store.getState().callHAService('media_player', 'media_play', {}, { entity_id: 'media_player.tv' });
    expect(ctx.store.getState().states['media_player.tv'].attributes.media_title).toBeUndefined();
  });

  it('still simulates locks in demo mode', async () => {
    ctx.svc.isDemoMode = true;
    await ctx.store.getState().callHAService('lock', 'unlock', {}, { entity_id: 'lock.front' });
    expect(ctx.stateOf('lock.front')).toBe('unlocked');
  });
});

describe('graph recompute', () => {
  it('starts empty and loads demo data lazily', async () => {
    vi.resetModules();
    const { useAutoLayoutStore } = await import('../src/store/useAutoLayoutStore');
    expect(Object.keys(useAutoLayoutStore.getState().states)).toHaveLength(0);

    const { loadMockRegistries } = await import('../src/data/loadMockRegistries');
    useAutoLayoutStore.getState().reloadDemoData();
    await loadMockRegistries();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(Object.keys(useAutoLayoutStore.getState().states).length).toBeGreaterThan(0);
  });

  it('keeps references for everything a state change did not touch', async () => {
    const { store } = await loadStore();
    store.getState().recomputeGraph();
    const s1 = store.getState();

    store.getState().recomputeGraph();
    expect(store.getState().resolvedEntities).toBe(s1.resolvedEntities);
    expect(store.getState().domainGroups).toBe(s1.domainGroups);
    expect(store.getState().resolvedAreas).toBe(s1.resolvedAreas);

    const ids = Object.keys(s1.resolvedEntities);
    const light = ids.find((id) => id.startsWith('light.'))!;
    const sensor = ids.find((id) => id.startsWith('sensor.'))!;
    const current = s1.states[light];
    store.setState({ states: { ...s1.states, [light]: { ...current, state: current.state === 'on' ? 'off' : 'on' } } });
    store.getState().recomputeGraph();
    const s2 = store.getState();

    expect(s2.resolvedEntities[light]).not.toBe(s1.resolvedEntities[light]);
    expect(s2.resolvedEntities[sensor]).toBe(s1.resolvedEntities[sensor]);
    expect(s2.domainGroups.light).not.toBe(s1.domainGroups.light);
    expect(s2.domainGroups.sensor).toBe(s1.domainGroups.sensor);
    expect(s2.domainGroups.light).toContain(s2.resolvedEntities[light]);
    const changedAreas = s2.resolvedAreas.filter((area, i) => area !== s1.resolvedAreas[i]);
    expect(changedAreas.length).toBeLessThanOrEqual(1);
  });
});
