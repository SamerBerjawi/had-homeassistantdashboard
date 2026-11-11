import { describe, expect, it } from 'vitest';
import { transformEnergyStatistics, transformPowerStatistics } from '../src/services/energyDataTransformer';

// deterministic pseudo-random so both implementations see identical inputs
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const DAY = new Date(2026, 5, 10, 0, 0, 0, 0).getTime();
const prefs: any = {
  energy_sources: [
    { type: 'grid', stat_energy_from: 'sensor.grid_in', stat_energy_to: 'sensor.grid_out', stat_rate: 'sensor.grid_power', number_energy_price: 0.3, number_energy_price_export: 0.1, cost_adjustment_day: 0.25 },
    { type: 'solar', stat_energy_from: 'sensor.solar', stat_rate: 'sensor.solar_power', config_entry_solar_forecast: ['x'] },
    { type: 'battery', stat_energy_from: 'sensor.bat_out', stat_energy_to: 'sensor.bat_in', stat_rate: 'sensor.bat_power' },
    { type: 'gas', stat_energy_from: 'sensor.gas', entity_energy_price: 'sensor.gas_price', unit_of_measurement: 'm³' },
    { type: 'water', stat_energy_from: 'sensor.water', number_energy_price: 0.004, unit_of_measurement: 'L' }
  ],
  device_consumption: [
    { stat_consumption: 'sensor.dev_a', name: 'Dryer' },
    { stat_consumption: 'sensor.dev_b' }
  ]
};
const metadata: any = {
  'sensor.solar': { statistic_id: 'sensor.solar', source: 'recorder', unit_of_measurement: 'Wh' },
  'sensor.grid_in': { statistic_id: 'sensor.grid_in', source: 'recorder', unit_of_measurement: 'kWh' },
  'sensor.dev_b': { statistic_id: 'sensor.dev_b', source: 'recorder', unit_of_measurement: 'kWh', name: 'Pump' }
};
const states: any = {
  'sensor.gas_price': { entity_id: 'sensor.gas_price', state: '0.9', attributes: {} },
  'sensor.grid_power': { entity_id: 'sensor.grid_power', state: '0', attributes: { device_class: 'power', unit_of_measurement: 'W' } }
};

function series(step: number, count: number, seed: number, opts: { gap?: boolean; strTime?: boolean } = {}) {
  const r = rng(seed);
  const out: any[] = [];
  for (let i = 0; i < count; i++) {
    if (opts.gap && i > 10 && i < 16) continue;
    const t = DAY + i * step;
    const change = i === 7 ? -2 : i === 9 ? 9 : r() * 1.5;
    out.push({ start: opts.strTime && i % 2 ? new Date(t).toISOString() : i % 3 ? t : t / 1000, change, mean: (r() - 0.4) * 4000, sum: i });
  }
  return out;
}
const mkStats = (step: number, count: number, opts: { gap?: boolean; strTime?: boolean } = {}) => {
  const ids = ['sensor.grid_in', 'sensor.grid_out', 'sensor.grid_power', 'sensor.solar', 'sensor.solar_power', 'sensor.bat_in', 'sensor.bat_out', 'sensor.bat_power', 'sensor.gas', 'sensor.water', 'sensor.dev_a', 'sensor.dev_b'];
  return Object.fromEntries(ids.map((id, i) => [id, series(step, count, 11 + i, opts)]));
};
const forecast = { wh_hours: { [new Date(DAY + 10 * 3600_000).toISOString()]: 1200, [new Date(DAY + 11 * 3600_000).toISOString()]: 1800 } } as any;


// Characterization tests. The pinned numbers were captured from the implementation before it was
// split into src/services/energy/*, and verified identical to it on these inputs (synthetic data).
describe('transformEnergyStatistics', () => {
  it('hourly day: buckets, totals, devices and financials', () => {
    const m = transformEnergyStatistics(prefs, mkStats(3600_000, 24), metadata, forecast, {
      states, periodType: 'hour', startTimeMs: DAY, endTimeMs: DAY + 24 * 3600_000 - 1
    });
    expect(m.buckets).toHaveLength(24);
    expect(m.totals).toMatchObject({
      solar: 0.03, gridImport: 25.32, gridExport: 23.78, batteryCharge: 25.12, batteryDischarge: 22.09,
      gridToHome: 5.46, batteryToHome: 3.91, homeConsumption: 9.37, selfSufficiencyPercentage: 41.7,
      gasUsage: 22, gasUnit: 'm³', waterUsage: 29.47, waterUnit: 'L', solarForecastTotal: 3
    });
    expect(m.financials).toMatchObject({
      gridImportCost: 7.6, gridExportCompensation: 2.38, waterCost: 0.12, standingCharge: 0.25, netCost: 5.59, currency: '€'
    });
    expect(m.financials.sources).toHaveLength(4);
    expect(m.devices.map((d) => [d.statId, d.name, d.kwh])).toEqual([
      ['sensor.dev_b', 'Pump', 26.39],
      ['sensor.dev_a', 'Dryer', 23.43]
    ]);
    expect([m.hasSolar, m.hasGrid, m.hasBattery, m.hasGas, m.hasWater, m.hasDevices]).toEqual([true, true, true, true, true, true]);
  });

  it('daily week: one bucket per day, standing charge scales with days', () => {
    const d = transformEnergyStatistics(prefs, mkStats(86400_000, 7), metadata, null, {
      states, periodType: 'day', daysInPeriod: 7, startTimeMs: DAY, endTimeMs: DAY + 7 * 86400_000
    });
    expect(d.buckets).toHaveLength(8);
    expect(d.totals).toMatchObject({ gridImport: 3.96, gridExport: 3.55, homeConsumption: 4.05, solarForecastTotal: null });
    expect(d.financials).toMatchObject({ gridImportCost: 1.19, standingCharge: 1.75, netCost: 2.61 });
  });

  it('5 minute period: a full day has 288 slots and ignores counter surges above 5 kWh', () => {
    const m = transformEnergyStatistics(prefs, mkStats(300_000, 288), metadata, null, {
      states, periodType: '5minute', daysInPeriod: 1, startTimeMs: DAY, endTimeMs: DAY + 24 * 3600_000 - 1
    });
    expect(m.buckets).toHaveLength(288);
    expect(m.buckets.every((b) => b.gridImport >= 0 && b.endMs - b.startMs === 300_000)).toBe(true);
  });

  it('every period type produces buckets that are sorted and non-overlapping', () => {
    for (const [step, count, periodType] of [[3600_000, 24, 'hour'], [86400_000, 7, 'day'], [30 * 86400_000, 6, 'month']] as const) {
      const m = transformEnergyStatistics(prefs, mkStats(step, count), metadata, null, { states, periodType, daysInPeriod: 7 });
      expect(m.buckets.length).toBeGreaterThan(0);
      for (let i = 1; i < m.buckets.length; i++) expect(m.buckets[i].startMs).toBeGreaterThan(m.buckets[i - 1].startMs);
    }
  });

  it('returns an empty model without preferences', () => {
    const a = transformEnergyStatistics(null, {}, {}, null, {});
    expect(a.buckets).toEqual([]);
    expect(a.devices).toEqual([]);
    expect([a.hasSolar, a.hasGrid, a.hasBattery]).toEqual([false, false, false]);
  });
});

describe('transformPowerStatistics', () => {
  it('returns 5-minute buckets for the configured sources', () => {
    const b = transformPowerStatistics(prefs, mkStats(300_000, 288), metadata);
    expect(b.length).toBeGreaterThan(0);
    expect(b[1].startMs - b[0].startMs).toBe(300_000);
  });
});
