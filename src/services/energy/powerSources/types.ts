/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Data shapes for the Power Sources chart (moved verbatim from PowerSourcesChart.tsx).
 */

import type { TransformedEnergyBucket } from '../types';

export interface PowerDataPoint {
  date: Date;
  minuteOfDay: number;
  xAxisLabel: string;
  timeFormatted: string;
  solar: number;
  gridImport: number;
  batteryDischarge: number;
  batteryChargeNegative: number;
  gridExportNegative: number;
  homeConsumption: number;
  netGrid: number;
  netBattery: number;
  // Contour strokes for individual series (only non-null where active to prevent overwriting other lines)
  solarLine: number | null;
  gridImportLine: number | null;
  batteryDischargeLine: number | null;
  batteryChargeLine: number | null;
  gridExportLine: number | null;

  // Comparison series (when Compare Mode is active)
  compareSolar?: number | null;
  compareHome?: number | null;
  compareGridImport?: number | null;
  compareBatteryDischarge?: number | null;
}

/** Subset of the useEnergyComparison result the pure chart builders read. */
export interface PowerSourcesComparisonInput {
  isCompareEnabled: boolean;
  compareBuckets: TransformedEnergyBucket[];
}

/** Series visibility: what the energy setup has (has*) and what the user toggled on (show*). */
export interface PowerSourcesSeriesVisibility {
  hasSolar: boolean;
  showSolar: boolean;
  hasGrid: boolean;
  showGrid: boolean;
  hasBattery: boolean;
  showBattery: boolean;
}

export interface PowerSourcesChartData {
  chartData: PowerDataPoint[];
  currentMinuteOfDay: number;
  isViewingToday: boolean;
  isSingleDay: boolean;
}
