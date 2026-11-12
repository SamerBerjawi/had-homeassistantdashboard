/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Period totals (toggle pills in multi-day views) and current-vs-comparison energy summary
 * for the Power Sources chart.
 */

import type { TransformedEnergyBucket } from '../types';
import type { PowerDataPoint, PowerSourcesComparisonInput } from './types';

// Aggregate period totals for toggle pills in multi-day views
export function computePeriodTotals(chartData: PowerDataPoint[], isSingleDay: boolean) {
  if (isSingleDay || chartData.length === 0) return null;
  let home = 0;
  let solar = 0;
  let gridImport = 0;
  let gridExport = 0;
  let batteryCharge = 0;
  let batteryDischarge = 0;

  for (const p of chartData) {
    home += p.homeConsumption;
    solar += p.solar;
    gridImport += p.gridImport;
    gridExport += Math.abs(p.gridExportNegative);
    batteryCharge += Math.abs(p.batteryChargeNegative);
    batteryDischarge += p.batteryDischarge;
  }

  return {
    home: Number(home.toFixed(2)),
    solar: Number(solar.toFixed(2)),
    netGrid: Number((gridImport - gridExport).toFixed(2)),
    netBattery: Number((batteryDischarge - batteryCharge).toFixed(2))
  };
}

// Summary energy totals for current period vs comparison period
export function computeComparisonSummary(
  buckets: TransformedEnergyBucket[],
  comparison: PowerSourcesComparisonInput
) {
  if (!comparison.isCompareEnabled) return null;

  let currentSolar = 0;
  let currentHome = 0;
  let currentGrid = 0;
  let currentBattery = 0;

  for (const b of buckets) {
    currentSolar += b.solar || 0;
    currentHome += b.homeConsumption || 0;
    currentGrid += b.gridImport || 0;
    currentBattery += b.batteryDischarge || 0;
  }

  let compSolar = 0;
  let compHome = 0;
  let compGrid = 0;
  let compBattery = 0;

  for (const cb of comparison.compareBuckets) {
    compSolar += cb.solar || 0;
    compHome += cb.homeConsumption || 0;
    compGrid += cb.gridImport || 0;
    compBattery += cb.batteryDischarge || 0;
  }

  const calcDelta = (curr: number, prev: number) => {
    if (prev <= 0.001) {
      return curr > 0.001 ? 100 : 0;
    }
    return ((curr - prev) / prev) * 100;
  };

  return {
    current: {
      solar: Number(currentSolar.toFixed(2)),
      home: Number(currentHome.toFixed(2)),
      grid: Number(currentGrid.toFixed(2)),
      battery: Number(currentBattery.toFixed(2))
    },
    compare: {
      solar: Number(compSolar.toFixed(2)),
      home: Number(compHome.toFixed(2)),
      grid: Number(compGrid.toFixed(2)),
      battery: Number(compBattery.toFixed(2))
    },
    deltas: {
      solar: calcDelta(currentSolar, compSolar),
      home: calcDelta(currentHome, compHome),
      grid: calcDelta(currentGrid, compGrid),
      battery: calcDelta(currentBattery, compBattery)
    }
  };
}
