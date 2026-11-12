import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPowerSourcesChartData,
  computeComparisonSummary,
  computePeriodTotals,
  computeXAxisInterval,
  computeYAxis,
  formatXAxisTick,
  type PowerDataPoint
} from '../src/services/energy/powerSources';
import type { TransformedEnergyBucket } from '../src/services/energy/types';
import type { InstantaneousPowerTelemetry } from '../src/utils/energyMath';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY_MS = 24 * HOUR;

function bucket(startMs: number, endMs: number, values: Partial<TransformedEnergyBucket> = {}): TransformedEnergyBucket {
  return {
    startMs,
    endMs,
    label: '',
    isoDate: new Date(startMs).toISOString(),
    solar: 0,
    gridImport: 0,
    gridExport: 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    solarToHome: 0,
    solarToGrid: 0,
    solarToBattery: 0,
    gridToHome: 0,
    gridToBattery: 0,
    batteryToHome: 0,
    batteryToGrid: 0,
    homeConsumption: 0,
    gasUsage: 0,
    waterUsage: 0,
    deviceValues: {},
    solarForecast: null,
    ...values
  };
}

/** 5-minute buckets covering a full local day, every bucket with the same values. */
function fullDay(dayStartMs: number, values: Partial<TransformedEnergyBucket> = {}): TransformedEnergyBucket[] {
  return Array.from({ length: 288 }, (_, i) => bucket(dayStartMs + i * 5 * MIN, dayStartMs + (i + 1) * 5 * MIN, values));
}

const ALL_VISIBLE = {
  hasSolar: true,
  showSolar: true,
  hasGrid: true,
  showGrid: true,
  hasBattery: true,
  showBattery: true
};
const NO_COMPARE = { isCompareEnabled: false, compareBuckets: [] as TransformedEnergyBucket[] };

const JUN_10 = new Date(2026, 5, 10, 0, 0, 0, 0).getTime();
const JUN_09 = new Date(2026, 5, 9, 0, 0, 0, 0).getTime();

function point(values: Partial<PowerDataPoint>): PowerDataPoint {
  return {
    date: new Date(JUN_10),
    minuteOfDay: 0,
    xAxisLabel: '',
    timeFormatted: '',
    solar: 0,
    gridImport: 0,
    batteryDischarge: 0,
    batteryChargeNegative: 0,
    gridExportNegative: 0,
    homeConsumption: 0,
    netGrid: 0,
    netBattery: 0,
    solarLine: null,
    gridImportLine: null,
    batteryDischargeLine: null,
    batteryChargeLine: null,
    gridExportLine: null,
    ...values
  };
}

describe('buildPowerSourcesChartData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 12, 0, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an empty single-day result for no buckets', () => {
    expect(buildPowerSourcesChartData({ buckets: [], ...ALL_VISIBLE, comparison: NO_COMPARE })).toEqual({
      chartData: [],
      currentMinuteOfDay: 0,
      isViewingToday: false,
      isSingleDay: true
    });
  });

  it('cuts today at the current time and converts 5-minute kWh to kW', () => {
    const result = buildPowerSourcesChartData({
      buckets: fullDay(JUN_10, { solar: 0.5, gridExport: 0.1, batteryCharge: 0.05, homeConsumption: 0.25 }),
      ...ALL_VISIBLE,
      comparison: NO_COMPARE
    });

    expect(result.isSingleDay).toBe(true);
    expect(result.isViewingToday).toBe(true);
    expect(result.currentMinuteOfDay).toBe(720);
    // 00:00 through 12:00 inclusive
    expect(result.chartData).toHaveLength(145);
    const last = result.chartData[result.chartData.length - 1];
    expect(last.minuteOfDay).toBe(720);
    expect(last.solar).toBe(6);
    expect(last.gridExportNegative).toBe(-1.2);
    expect(last.batteryChargeNegative).toBe(-0.6);
    expect(last.homeConsumption).toBe(3);
    expect(last.netGrid).toBe(-1.2);
    expect(last.netBattery).toBe(-0.6);
  });

  it('extends a historic day to the 24:00 border', () => {
    const result = buildPowerSourcesChartData({
      buckets: fullDay(JUN_09, { solar: 0.1 }),
      ...ALL_VISIBLE,
      comparison: NO_COMPARE
    });

    expect(result.isSingleDay).toBe(true);
    expect(result.isViewingToday).toBe(false);
    expect(result.chartData).toHaveLength(289);
    const last = result.chartData[result.chartData.length - 1];
    expect(last.minuteOfDay).toBe(1440);
    expect(last.xAxisLabel).toBe('12:00 AM');
    expect(last.timeFormatted).toBe('12:00 AM');
    expect(last.date.getTime()).toBe(JUN_09 + DAY_MS);
    expect(result.chartData[287].minuteOfDay).toBe(1435);
  });

  it('anchors contour lines to the baseline / underlying stack and hides toggled-off series', () => {
    const start = JUN_09 + 10 * HOUR;
    const buckets = [
      bucket(start, start + 5 * MIN),
      bucket(start + 5 * MIN, start + 10 * MIN, { solar: 0.5, gridImport: 0.5 }),
      bucket(start + 10 * MIN, start + 15 * MIN)
    ];

    const shown = buildPowerSourcesChartData({ buckets, ...ALL_VISIBLE, comparison: NO_COMPARE });
    expect(shown.chartData.map((p) => p.solarLine)).toEqual([0, 6, 0]);
    // Grid import contour sits on top of solar
    expect(shown.chartData.map((p) => p.gridImportLine)).toEqual([0, 12, 0]);
    expect(shown.chartData.map((p) => p.batteryDischargeLine)).toEqual([null, null, null]);

    const hidden = buildPowerSourcesChartData({ buckets, ...ALL_VISIBLE, showSolar: false, comparison: NO_COMPARE });
    expect(hidden.chartData.map((p) => p.solarLine)).toEqual([null, null, null]);
    // Without solar visible, grid import is anchored to the zero baseline
    expect(hidden.chartData.map((p) => p.gridImportLine)).toEqual([0, 6, 0]);
  });

  it('keeps multi-day buckets as kWh and indexes them by position', () => {
    const buckets = Array.from({ length: 7 }, (_, i) =>
      bucket(JUN_09 - (6 - i) * DAY_MS, JUN_09 - (5 - i) * DAY_MS, { solar: 10 + i, homeConsumption: 8 })
    );
    const result = buildPowerSourcesChartData({ buckets, ...ALL_VISIBLE, comparison: NO_COMPARE });

    expect(result.isSingleDay).toBe(false);
    expect(result.isViewingToday).toBe(false);
    expect(result.chartData).toHaveLength(7);
    expect(result.chartData.map((p) => p.minuteOfDay)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.chartData.map((p) => p.solar)).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect(result.chartData[0].xAxisLabel).toBe(
      new Date(buckets[0].startMs).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
    );
  });

  it('maps single-day comparison buckets by minute of day, falling back to the nearest 5-minute slot', () => {
    const start = JUN_09 + 10 * HOUR;
    const buckets = [bucket(start, start + 5 * MIN, { solar: 0.5 }), bucket(start + 5 * MIN, start + 10 * MIN, { solar: 0.5 })];
    const compStart = new Date(2025, 5, 9, 10, 0, 0, 0).getTime();
    const compareBuckets = [
      bucket(compStart, compStart + 5 * MIN, { solar: 0.25, homeConsumption: 0.1 }),
      // 10:15 slot: the 10:05 point has no exact match and falls back to +10 minutes
      bucket(compStart + 15 * MIN, compStart + 20 * MIN, { solar: 0.75 })
    ];

    const result = buildPowerSourcesChartData({
      buckets,
      ...ALL_VISIBLE,
      comparison: { isCompareEnabled: true, compareBuckets }
    });
    // 10:00 point matches exactly
    expect(result.chartData[0].compareSolar).toBe(3);
    expect(result.chartData[0].compareHome).toBe(1.2);
    // 10:05 point: offset 5 checks 10:00 first
    expect(result.chartData[1].compareSolar).toBe(3);
  });

  it('maps multi-day comparison buckets by index when lengths match', () => {
    const buckets = Array.from({ length: 3 }, (_, i) => bucket(JUN_09 - (2 - i) * DAY_MS, JUN_09 - (1 - i) * DAY_MS, { solar: 1 }));
    const compareBuckets = Array.from({ length: 3 }, (_, i) =>
      bucket(JUN_09 - 365 * DAY_MS + i * DAY_MS, JUN_09 - 364 * DAY_MS + i * DAY_MS, { solar: i + 0.123, gridImport: 2 })
    );
    const result = buildPowerSourcesChartData({
      buckets,
      ...ALL_VISIBLE,
      comparison: { isCompareEnabled: true, compareBuckets }
    });
    expect(result.chartData.map((p) => p.compareSolar)).toEqual([0.12, 1.12, 2.12]);
    expect(result.chartData.map((p) => p.compareGridImport)).toEqual([2, 2, 2]);
  });

  it('ignores comparison buckets when compare mode is off', () => {
    const start = JUN_09 + 10 * HOUR;
    const result = buildPowerSourcesChartData({
      buckets: [bucket(start, start + 5 * MIN, { solar: 0.5 })],
      ...ALL_VISIBLE,
      comparison: { isCompareEnabled: false, compareBuckets: [bucket(start, start + 5 * MIN, { solar: 1 })] }
    });
    expect(result.chartData[0].compareSolar).toBeUndefined();
  });
});

describe('computePeriodTotals', () => {
  it('returns null for single-day views and empty data', () => {
    expect(computePeriodTotals([point({ solar: 1 })], true)).toBeNull();
    expect(computePeriodTotals([], false)).toBeNull();
  });

  it('sums multi-day flows into home, solar and net grid / battery', () => {
    const totals = computePeriodTotals(
      [
        point({ homeConsumption: 5, solar: 3, gridImport: 2, gridExportNegative: -0.5, batteryDischarge: 1, batteryChargeNegative: -1.5 }),
        point({ homeConsumption: 4.5, solar: 2.25, gridImport: 1, gridExportNegative: -1, batteryDischarge: 0.5, batteryChargeNegative: 0 })
      ],
      false
    );
    expect(totals).toEqual({ home: 9.5, solar: 5.25, netGrid: 1.5, netBattery: 0 });
  });
});

describe('computeComparisonSummary', () => {
  const t = JUN_10;
  it('returns null when compare mode is off', () => {
    expect(computeComparisonSummary([bucket(t, t + HOUR, { solar: 1 })], NO_COMPARE)).toBeNull();
  });

  it('computes current vs comparison totals and percentage deltas', () => {
    const summary = computeComparisonSummary(
      [bucket(t, t + HOUR, { solar: 2, homeConsumption: 3, gridImport: 1 }), bucket(t + HOUR, t + 2 * HOUR, { solar: 1, homeConsumption: 1 })],
      {
        isCompareEnabled: true,
        compareBuckets: [bucket(t, t + HOUR, { solar: 2, homeConsumption: 5, batteryDischarge: 1 })]
      }
    );
    expect(summary).toEqual({
      current: { solar: 3, home: 4, grid: 1, battery: 0 },
      compare: { solar: 2, home: 5, grid: 0, battery: 1 },
      // grid: previous 0 and current > 0 -> +100; battery: -100
      deltas: { solar: 50, home: -20, grid: 100, battery: -100 }
    });
  });

  it('reports a 0% delta when both periods are empty', () => {
    const summary = computeComparisonSummary([], { isCompareEnabled: true, compareBuckets: [] });
    expect(summary?.deltas).toEqual({ solar: 0, home: 0, grid: 0, battery: 0 });
  });
});

describe('computeYAxis', () => {
  const base = { ...ALL_VISIBLE, showHome: true, isSingleDay: true, comparison: { isCompareEnabled: false } };

  it('falls back to 0..2 for empty data', () => {
    expect(computeYAxis({ ...base, chartData: [] })).toEqual({ yDomain: [0, 2], yTicks: [0, 1, 2] });
  });

  it('adds 10% headroom and picks a nice step for a positive-only stack', () => {
    const result = computeYAxis({ ...base, chartData: [point({ solar: 4, gridImport: 2, homeConsumption: 3 })] });
    // max 6 -> 6.6, span 6.6 -> step 1
    expect(result).toEqual({ yDomain: [0, 7], yTicks: [0, 1, 2, 3, 4, 5, 6, 7] });
  });

  it('extends below zero for negative flows', () => {
    const result = computeYAxis({
      ...base,
      chartData: [point({ solar: 6, gridExportNegative: -1, batteryChargeNegative: -0.2 })]
    });
    // max 6.6, min -1.32, span 7.92 -> step 2
    expect(result).toEqual({ yDomain: [-2, 8], yTicks: [-2, 0, 2, 4, 6, 8] });
  });

  it('ignores hidden series and keeps the minimum 0.5 top', () => {
    const result = computeYAxis({ ...base, showSolar: false, showHome: false, chartData: [point({ solar: 6, homeConsumption: 6 })] });
    expect(result).toEqual({ yDomain: [0, 0.6], yTicks: [0, 0.2, 0.4, 0.6] });
  });

  it('includes realtime telemetry only in single-day views', () => {
    const realtime = {
      solarPowerKW: 9,
      homeConsumptionKW: 1,
      gridExportPowerKW: 0,
      batteryChargePowerKW: 0
    } as InstantaneousPowerTelemetry;
    const chartData = [point({ solar: 1 })];
    expect(computeYAxis({ ...base, chartData, realtime }).yDomain).toEqual([0, 10]);
    expect(computeYAxis({ ...base, isSingleDay: false, chartData, realtime }).yDomain).toEqual([0, 1.25]);
  });

  it('expands headroom for visible comparison curves', () => {
    const chartData = [point({ solar: 1, compareSolar: 4 })];
    expect(computeYAxis({ ...base, chartData }).yDomain).toEqual([0, 1.25]);
    expect(computeYAxis({ ...base, chartData, comparison: { isCompareEnabled: true } }).yDomain).toEqual([0, 5]);
  });
});

describe('computeXAxisInterval', () => {
  it('shows every tick for single-day and short ranges and thins out longer ones', () => {
    expect(computeXAxisInterval(true, 500)).toBe(0);
    expect(computeXAxisInterval(false, 7)).toBe(0);
    expect(computeXAxisInterval(false, 14)).toBe(1);
    expect(computeXAxisInterval(false, 31)).toBe(3);
    expect(computeXAxisInterval(false, 32)).toBe('preserveStartEnd');
  });
});

describe('formatXAxisTick', () => {
  it('formats the fixed 4-hour markers and arbitrary minutes as 12-hour time', () => {
    expect(formatXAxisTick(0)).toBe('12:00 AM');
    expect(formatXAxisTick(720)).toBe('12:00 PM');
    expect(formatXAxisTick(1440)).toBe('11:59 PM');
    expect(formatXAxisTick(65)).toBe('1:05 AM');
    expect(formatXAxisTick(785)).toBe('1:05 PM');
  });
});
