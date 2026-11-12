import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HAZone, ResolvedEntity } from '@/types';
import type { UserDashboardConfig } from '@/types/userConfig';
import { DEFAULT_OVERVIEW_TILE_ORDER } from '@/types/userConfig';
import type { VacuumDeviceData } from '@/types/vacuum';
import type { DailyForecastItem } from '@/lib/weatherForecast';
import type { TransformedEnergyTotals } from '@/services/energy/types';
import { classifyOverviewEntities, resolvePersonZoneDetails } from '@/services/overview/entityGroups';
import {
  deriveWeatherHighLow,
  deriveWeatherReadings,
  getAlarmBadgeDetailsFor,
  hasAnyActiveOverviewBadge,
  isAlarmArmedState,
  resolveActiveWeather,
  summarizePlayingMedia,
  summarizeVacuums
} from '@/services/overview/headerSummary';
import {
  applyTileReorder,
  buildCurrentTileOrder,
  buildOverviewTabTileMap,
  computeAddWidget,
  computeTileVisibilityMode,
  filterDisplayTiles,
  getNextTileSize,
  toggleInSet,
  withCamerasTileSize1x,
  withHiddenFromAllTiles,
  withHiddenTiles,
  withHideBadgesToggled,
  withResetLayout,
  withTileOrderAndHidden,
  withTileSize,
  withTileVisibility
} from '@/services/overview/tileLayout';
import { buildOverviewTabs, getTileBaseClass } from '@/services/overview/overviewTabs';

function ent(entity_id: string, state: string, extra: Partial<ResolvedEntity> = {}): ResolvedEntity {
  return {
    entity_id,
    domain: entity_id.split('.')[0],
    name: entity_id,
    state,
    attributes: {},
    area_id: null,
    device_id: null,
    floor_id: null,
    resolutionSource: 'none' as ResolvedEntity['resolutionSource'],
    hidden: false,
    isDiagnostic: false,
    ...extra
  };
}

function cfg(overview: UserDashboardConfig['overview'], rest: Record<string, unknown> = {}): UserDashboardConfig {
  return { overview, ...rest } as unknown as UserDashboardConfig;
}

const cam = (id: string) => ent(id, 'idle');

afterEach(() => {
  vi.useRealTimers();
});

describe('classifyOverviewEntities', () => {
  it('groups visible entities and derives the active subsets', () => {
    const groups: Record<string, ResolvedEntity[]> = {
      person: [ent('person.a', 'home'), ent('person.b', 'not_home'), ent('person.hidden', 'home', { hidden: true })],
      device_tracker: [ent('device_tracker.phone', 'home', { disabled_by: 'user' })],
      light: [ent('light.a', 'on'), ent('light.b', 'off')],
      switch: [ent('switch.a', 'on')],
      fan: [ent('fan.a', 'off'), ent('fan.b', 'on')],
      media_player: [ent('media_player.a', 'idle'), ent('media_player.b', 'playing')],
      vacuum: [ent('vacuum.a', 'Cleaning')],
      weather: [ent('weather.home', 'sunny')],
      binary_sensor: [
        ent('binary_sensor.front', 'on', { attributes: { device_class: 'door' } }),
        ent('binary_sensor.kitchen', 'off', { attributes: { device_class: 'window' } }),
        ent('binary_sensor.hall', 'on', { attributes: { device_class: 'motion' } }),
        ent('binary_sensor.attic', 'detected', { attributes: { device_class: 'smoke' } }),
        ent('binary_sensor.back', 'on', { attributes: { device_class: 'door' }, hidden: true })
      ]
    };
    const r = classifyOverviewEntities(groups, {}, undefined);

    expect(r.userEntities.map((e) => e.entity_id)).toEqual(['person.a', 'person.b']);
    expect(r.homeUsers.map((e) => e.entity_id)).toEqual(['person.a']);
    expect(r.onLights.map((e) => e.entity_id)).toEqual(['light.a']);
    expect(r.onSwitches).toHaveLength(1);
    expect(r.activeFans.map((e) => e.entity_id)).toEqual(['fan.b']);
    expect(r.activeMedia?.entity_id).toBe('media_player.b');
    expect(r.playingMediaEntities.map((e) => e.entity_id)).toEqual(['media_player.b']);
    expect(r.activeVacuums.map((e) => e.entity_id)).toEqual(['vacuum.a']);
    expect(r.doorSensors.map((e) => e.entity_id)).toEqual(['binary_sensor.front']);
    expect(r.openDoors).toHaveLength(1);
    expect(r.openWindows).toHaveLength(0);
    expect(r.activeMotion).toHaveLength(1);
    expect(r.activeSmoke.map((e) => e.entity_id)).toEqual(['binary_sensor.attic']);
    expect(r.surveillanceCameras).toEqual([]);
  });

  it('falls back to the first media player and to resolved vacuum entities', () => {
    const resolved = {
      'vacuum.robo': ent('vacuum.robo', 'docked'),
      'vacuum.off': ent('vacuum.off', 'on', { disabled_by: 'integration' }),
      'light.x': ent('light.x', 'on')
    };
    const r = classifyOverviewEntities({ media_player: [ent('media_player.a', 'idle')] }, resolved, undefined);
    expect(r.activeMedia?.entity_id).toBe('media_player.a');
    expect(r.vacuumEntities.map((e) => e.entity_id)).toEqual(['vacuum.robo']);
    expect(r.activeVacuums).toEqual([]);
  });

  it('builds standalone RTSP cameras from config, ids stamped with the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
    const sources = {
      a: { id: '', name: 'Gate', rtspUrl: 'rtsp://cam/1' },
      b: { id: 'camera.unused', rtspUrl: '' }
    };
    const r = classifyOverviewEntities({}, {}, sources);
    expect(r.surveillanceCameras).toHaveLength(1);
    expect(r.surveillanceCameras[0].entity_id).toBe(`camera.stream_${Date.parse('2026-01-02T03:04:05Z')}`);
    expect(r.surveillanceCameras[0].name).toBe('Gate');
  });
});

describe('resolvePersonZoneDetails', () => {
  const zones = [{ entity_id: 'zone.work_office', name: 'Work Office' }] as HAZone[];

  it('reports away-like states as not in a known zone', () => {
    for (const s of ['', 'not_home', 'away', 'unavailable', 'unknown']) {
      expect(resolvePersonZoneDetails(ent('person.a', s), zones)).toEqual({ isInKnownZone: false, isHome: false, zoneName: '' });
    }
  });

  it('reports home and matches named zones by name or entity id', () => {
    expect(resolvePersonZoneDetails(ent('person.a', 'home'), zones)).toEqual({ isInKnownZone: true, isHome: true, zoneName: 'Home' });
    expect(resolvePersonZoneDetails(ent('person.a', 'work office'), zones).zoneName).toBe('Work Office');
    expect(resolvePersonZoneDetails(ent('person.a', 'work_office'), zones).zoneName).toBe('Work Office');
    expect(resolvePersonZoneDetails(ent('person.a', ' Gym '), undefined)).toEqual({ isInKnownZone: true, isHome: false, zoneName: 'Gym' });
  });
});

describe('weather readings', () => {
  const w1 = ent('weather.a', 'rainy', { attributes: { temperature: 12, temperature_unit: '°F', humidity: 80 } });
  const w2 = ent('weather.b', 'sunny');

  it('resolves the selected weather entity or the first one', () => {
    expect(resolveActiveWeather([w1, w2], 'weather.b')).toBe(w2);
    expect(resolveActiveWeather([w1, w2], null)).toBe(w1);
    expect(resolveActiveWeather([], 'weather.b')).toBeUndefined();
  });

  it('derives readings with defaults', () => {
    expect(deriveWeatherReadings(w1, 'above_horizon')).toEqual({
      weatherCondition: 'rainy', isNight: false, currentTemp: 12, tempUnit: '°F', humidity: 80
    });
    expect(deriveWeatherReadings(undefined, 'below_horizon')).toEqual({
      weatherCondition: 'partlycloudy', isNight: true, currentTemp: 22, tempUnit: '°C', humidity: 55
    });
    expect(deriveWeatherReadings(ent('weather.c', 'clear-night'), undefined).isNight).toBe(true);
  });

  it('takes high/low from today, then the forecast attribute, then the current temperature', () => {
    const today = { temperature: 30, templow: 18 } as DailyForecastItem;
    expect(deriveWeatherHighLow(today, w1, 12)).toEqual({ weatherHigh: 30, weatherLow: 18 });
    const withAttr = ent('weather.d', 'sunny', { attributes: { forecast: [{ temperature: 25, templow: 10 }] } });
    expect(deriveWeatherHighLow(undefined, withAttr, 12)).toEqual({ weatherHigh: 25, weatherLow: 10 });
    expect(deriveWeatherHighLow(undefined, undefined, 20.4)).toEqual({ weatherHigh: 23, weatherLow: 16 });
  });
});

describe('alarm summary', () => {
  it('treats armed, triggered, arming and pending as armed only', () => {
    expect(isAlarmArmedState(ent('alarm_control_panel.a', 'armed_home'))).toBe(true);
    expect(isAlarmArmedState(ent('alarm_control_panel.a', 'pending'))).toBe(true);
    expect(isAlarmArmedState(ent('alarm_control_panel.a', 'disarmed'))).toBe(false);
    expect(isAlarmArmedState(ent('alarm_control_panel.a', 'unavailable'))).toBe(false);
    expect(isAlarmArmedState(undefined)).toBe(false);
  });

  it('labels each state and never claims disarmed without a state', () => {
    expect(getAlarmBadgeDetailsFor(ent('alarm_control_panel.a', 'armed_away')).label).toBe('Armed Away');
    expect(getAlarmBadgeDetailsFor(ent('alarm_control_panel.a', 'arming')).label).toBe('Arming…');
    expect(getAlarmBadgeDetailsFor(ent('alarm_control_panel.a', 'disarmed')).label).toBe('Disarmed');
    expect(getAlarmBadgeDetailsFor(ent('alarm_control_panel.a', 'unknown')).label).toBe('Unavailable');
    expect(getAlarmBadgeDetailsFor(undefined).label).toBe('Unavailable');
  });
});

describe('media and vacuum summaries', () => {
  it('summarizes playing media', () => {
    expect(summarizePlayingMedia([])).toEqual({ isPlayingMedia: false, singlePlayingMedia: null, playingSongTitle: undefined });
    const one = ent('media_player.a', 'playing', { attributes: { app_name: 'Spotify' } });
    expect(summarizePlayingMedia([one])).toEqual({ isPlayingMedia: true, singlePlayingMedia: one, playingSongTitle: 'Spotify' });
    expect(summarizePlayingMedia([one, ent('media_player.b', 'playing')]).singlePlayingMedia).toBeNull();
  });

  it('prefers discovered vacuum data and falls back to the entity battery', () => {
    const discovered = [{ entityId: 'vacuum.a', state: 'cleaning', batteryLevel: 64, batteryCharging: false }] as VacuumDeviceData[];
    const entity = ent('vacuum.a', 'cleaning', { attributes: { battery_level: 10 } });
    expect(summarizeVacuums(discovered, [entity])).toMatchObject({
      isVacuumCleaning: true, vacuumBattery: 64, isVacuumCharging: false, firstVacuum: entity
    });
    expect(summarizeVacuums([], [ent('vacuum.b', 'docked', { attributes: { battery: 90 } })])).toMatchObject({
      activeVacuumDevice: undefined, isVacuumCleaning: false, vacuumBattery: 90, isVacuumCharging: undefined
    });
  });

  it('flags when any badge is active', () => {
    const none = {
      activeZoneUsers: [], onLights: [], onSwitches: [], activeFans: [], isVacuumCleaning: false, isPlayingMedia: false,
      isAlarmArmed: false, openDoors: [], openWindows: [], activeMotion: [], activeLeaks: [], activeSmoke: []
    };
    expect(hasAnyActiveOverviewBadge(none)).toBe(false);
    expect(hasAnyActiveOverviewBadge({ ...none, isAlarmArmed: true })).toBe(true);
    expect(hasAnyActiveOverviewBadge({ ...none, activeLeaks: [ent('binary_sensor.leak', 'wet')] })).toBe(true);
  });
});

describe('tile order and display', () => {
  it('appends missing defaults and inserts camera tiles after the cameras tile', () => {
    const order = buildCurrentTileOrder(['lights', 'cameras'], [cam('camera.a'), cam('camera.b')]);
    expect(order.slice(0, 4)).toEqual(['lights', 'cameras', 'camera:camera.b', 'camera:camera.a']);
    expect(order).toHaveLength(DEFAULT_OVERVIEW_TILE_ORDER.length + 2);
    expect(buildCurrentTileOrder(undefined, [])).toEqual([...DEFAULT_OVERVIEW_TILE_ORDER]);
    expect(buildCurrentTileOrder(['camera:camera.a'], [cam('camera.a')]).filter((id) => id === 'camera:camera.a')).toHaveLength(1);
  });

  it('maps tabs to tiles including camera tiles', () => {
    const map = buildOverviewTabTileMap([cam('camera.a')]);
    expect(map.cameras).toEqual(['cameras', 'camera:camera.a']);
    expect(map.security).toContain('camera:camera.a');
    expect(map.all).toEqual([]);
  });

  const base = {
    currentTileOrder: ['lights', 'switches', 'vacuums', 'cameras', 'camera:camera.gone', 'doors', 'weather'],
    switchEntities: [],
    vacuumEntities: [],
    surveillanceCameras: [],
    isEditMode: false,
    hiddenTilesSet: new Set<string>(['doors']),
    hiddenFromAllSet: new Set<string>(['weather']),
    activeOverviewTab: 'all',
    OVERVIEW_TAB_TILE_MAP: buildOverviewTabTileMap([])
  };

  it('hides empty and hidden tiles outside edit mode', () => {
    expect(filterDisplayTiles(base)).toEqual(['lights']);
    expect(filterDisplayTiles({ ...base, isEditMode: true })).toEqual(['lights', 'switches', 'vacuums', 'cameras', 'camera:camera.gone', 'weather']);
  });

  it('restricts to the tab tiles and ignores hidden-from-all on other tabs', () => {
    expect(filterDisplayTiles({ ...base, activeOverviewTab: 'climate' })).toEqual(['weather']);
    expect(filterDisplayTiles({ ...base, activeOverviewTab: 'unknown_tab' })).toEqual(['lights', 'weather']);
  });
});

describe('layout config updates', () => {
  it('writes a reordered display back into the full order', () => {
    const prev = cfg({ tileOrder: ['a', 'b', 'c', 'd'] });
    const next = applyTileReorder(prev, [], ['c', 'a']);
    expect(next.overview?.tileOrder?.slice(0, 4)).toEqual(['c', 'b', 'a', 'd']);
    expect(next.overview?.tileOrder).toEqual(expect.arrayContaining([...DEFAULT_OVERVIEW_TILE_ORDER]));
    const fromFallback = applyTileReorder(cfg(undefined), ['x', 'y'], ['y', 'x', 'z']);
    // Display ids not in the saved order go after the appended defaults
    expect(fromFallback.overview?.tileOrder?.slice(0, 3)).toEqual(['y', 'x', 'weather']);
    expect(fromFallback.overview?.tileOrder?.at(-1)).toBe('z');
  });

  it('toggles tile size with weather tiles defaulting to 2x', () => {
    expect(getNextTileSize({}, 'weather')).toBe('1x');
    expect(getNextTileSize({}, 'lights')).toBe('2x');
    expect(getNextTileSize({ lights: '2x' }, 'lights')).toBe('1x');
    const prev = cfg({ tileSizes: { media: '2x' } }, { theme: 'x' });
    expect(withTileSize(prev, 'lights', '2x')).toEqual(cfg({ tileSizes: { media: '2x', lights: '2x' } }, { theme: 'x' }));
    expect(withCamerasTileSize1x(cfg({ tileSizes: { cameras: '2x' } })).overview?.tileSizes).toEqual({ cameras: '1x' });
  });

  it('toggles set membership without mutating the input', () => {
    const set = new Set(['a']);
    expect([...toggleInSet(set, 'a')]).toEqual([]);
    expect([...toggleInSet(set, 'b')]).toEqual(['a', 'b']);
    expect([...set]).toEqual(['a']);
  });

  it('adds a widget by unhiding it and appending it to the order', () => {
    const { nextSet, nextOrder } = computeAddWidget(new Set(['x', 'y']), ['a'], 'x');
    expect([...nextSet]).toEqual(['y']);
    expect(nextOrder).toEqual(['a', 'x']);
    expect(computeAddWidget(new Set(), ['a'], 'a').nextOrder).toEqual(['a']);
    expect(withTileOrderAndHidden(cfg({ hideBadges: true }), nextOrder, nextSet).overview).toEqual({
      hideBadges: true, tileOrder: ['a', 'x'], hiddenTiles: ['y']
    });
  });

  it('applies each visibility mode', () => {
    const hidden = new Set(['t']);
    const fromAll = new Set(['t']);
    const on = computeTileVisibilityMode(hidden, fromAll, ['a'], 't', 'all_on');
    expect([...on.nextHiddenTiles, ...on.nextHiddenFromAll]).toEqual([]);
    expect(on.nextOrder).toEqual(['a', 't']);
    const tab = computeTileVisibilityMode(hidden, new Set(), ['a'], 't', 'tab_only');
    expect([...tab.nextHiddenTiles]).toEqual([]);
    expect([...tab.nextHiddenFromAll]).toEqual(['t']);
    const off = computeTileVisibilityMode(new Set(), fromAll, ['a'], 't', 'all_off');
    expect([...off.nextHiddenTiles]).toEqual(['t']);
    expect([...off.nextHiddenFromAll]).toEqual([]);
    expect(off.nextOrder).toEqual(['a']);
    expect(withTileVisibility(cfg({}), off.nextOrder, off.nextHiddenTiles, off.nextHiddenFromAll).overview).toEqual({
      tileOrder: ['a'], hiddenTiles: ['t'], hiddenFromAllTiles: []
    });
  });

  it('sets hidden lists, toggles badges and resets the layout', () => {
    expect(withHiddenTiles(cfg({ tileOrder: ['a'] }), ['b']).overview).toEqual({ tileOrder: ['a'], hiddenTiles: ['b'] });
    expect(withHiddenFromAllTiles(cfg(undefined), ['c']).overview).toEqual({ hiddenFromAllTiles: ['c'] });
    expect(withHideBadgesToggled(cfg(undefined)).overview?.hideBadges).toBe(true);
    expect(withHideBadgesToggled(cfg({ hideBadges: true })).overview?.hideBadges).toBe(false);
    expect(withResetLayout(cfg({ tileOrder: ['z'], hiddenTiles: ['a'] }, { theme: 'x' }))).toEqual(cfg({
      tileOrder: [...DEFAULT_OVERVIEW_TILE_ORDER],
      hiddenTiles: [],
      hiddenFromAllTiles: [],
      hideBadges: false,
      tileSizes: { weather: '2x', weather_hourly: '2x' }
    }, { theme: 'x' }));
  });
});

describe('buildOverviewTabs', () => {
  const icons = {
    all: 'all', lights: 'lights', switches: 'switches', energy: 'energy', security: 'security',
    cameras: 'cameras', climate: 'climate', openings: 'openings', media: 'media', vacuums: 'vacuums'
  };
  const empty = {
    icons, onLights: [], onSwitches: [], switchEntities: [], openDoors: [], openWindows: [], activeMotion: [],
    activeLeaks: [], activeSmoke: [], energyTotals: undefined, activeFans: [], playingMediaEntities: [],
    vacuumEntities: [], activeVacuums: [], surveillanceCameras: [], isEditMode: false
  };

  it('omits optional tabs and badges when nothing is active', () => {
    const tabs = buildOverviewTabs(empty);
    expect(tabs.map((t) => t.id)).toEqual(['all', 'lights', 'energy', 'security', 'climate', 'openings', 'media']);
    expect(tabs.every((t) => t.badge === undefined)).toBe(true);
    expect(tabs[0].icon).toBe('all');
    expect(buildOverviewTabs({ ...empty, isEditMode: true }).map((t) => t.id)).toContain('switches');
  });

  it('computes live badges', () => {
    const on = [ent('x.a', 'on'), ent('x.b', 'on')];
    const tabs = buildOverviewTabs({
      ...empty,
      onLights: on,
      switchEntities: on,
      onSwitches: [on[0]],
      openDoors: [on[0]],
      openWindows: [on[1]],
      activeMotion: [on[0]],
      energyTotals: { homeConsumption: 10, solarToHome: 6, batteryToHome: 2 } as TransformedEnergyTotals,
      surveillanceCameras: [cam('camera.a')],
      vacuumEntities: [on[0]],
      activeVacuums: [on[0]]
    });
    const byId = Object.fromEntries(tabs.map((t) => [t.id, t.badge]));
    expect(byId).toMatchObject({
      lights: '2 on', switches: '1 on', energy: '80%', security: '3', cameras: '1', openings: '2 open', vacuums: '1 active'
    });
    expect(tabs.map((t) => t.id)).toEqual([
      'all', 'lights', 'switches', 'energy', 'security', 'cameras', 'climate', 'openings', 'media', 'vacuums'
    ]);
    const capped = buildOverviewTabs({ ...empty, energyTotals: { homeConsumption: 1, solarToHome: 5, batteryToHome: 0 } as TransformedEnergyTotals });
    expect(capped.find((t) => t.id === 'energy')?.badge).toBe('100%');
  });
});

describe('getTileBaseClass', () => {
  it('picks alert, active and idle surfaces for each theme', () => {
    expect(getTileBaseClass(true, false, 'ACTIVE', true)).toContain('bg-rose-950/60');
    expect(getTileBaseClass(false, true, 'ACTIVE', true)).toContain('bg-rose-100');
    expect(getTileBaseClass(false, true, 'ACTIVE')).toMatch(/ ACTIVE$/);
    expect(getTileBaseClass(true, false, 'ACTIVE')).toContain('bg-black/20');
    expect(getTileBaseClass(false, false, 'ACTIVE')).toContain('bg-white/20');
  });
});
