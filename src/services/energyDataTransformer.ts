/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Transforms Home Assistant energy statistics into chart-ready buckets, totals, devices and
 * financials. Each stage lives in ./energy/*; this file composes them.
 */

import {
  EnergyPreferences,
  extractEnergyStatisticIds
} from './haEnergyPreferences';
import {
  HAStatisticsResponse,
  StatisticsMetaData,
  SolarForecastResponse
} from './haEnergyStatistics';
import { collectTimestamps, buildSlotGrid } from './energy/timeGrid';
import { binEntityStatistics, createSlotLookups } from './energy/slotBinning';
import { createPriceLookup, createBucketLabeler } from './energy/helpers';
import { buildBuckets } from './energy/buckets';
import { computeTotals } from './energy/totals';
import { computeDevices } from './energy/devices';
import { computeFinancialSources } from './energy/financials';
import type { FinancialSourceBreakdown, TransformedEnergyModel } from './energy/types';

export type {
  TransformedEnergyBucket,
  TransformedDevice,
  TransformedEnergyTotals,
  FinancialSourceBreakdown,
  TransformedFinancials,
  TransformedEnergyModel
} from './energy/types';
export { transformPowerStatistics } from './energy/powerStatistics';

export function transformEnergyStatistics(
  prefs: EnergyPreferences | null | undefined,
  stats: HAStatisticsResponse,
  metadata: Record<string, StatisticsMetaData> = {},
  forecastData: SolarForecastResponse | null = null,
  options: {
    currencySymbol?: string;
    periodType?: '5minute' | 'hour' | 'day' | 'month';
    daysInPeriod?: number;
    states?: Record<string, any>;
    startTimeMs?: number;
    endTimeMs?: number;
  } = {}
): TransformedEnergyModel {
  const {
    currencySymbol = '€',
    periodType = 'hour',
    daysInPeriod = 1,
    states = {},
    startTimeMs,
    endTimeMs
  } = options;

  const extracted = extractEnergyStatisticIds(prefs, states);

  const hasSolar = extracted.solarSources.length > 0;
  const hasGrid = extracted.gridImport.length > 0 || extracted.gridExport.length > 0;
  const hasBattery = extracted.batteryCharging.length > 0 || extracted.batteryDischarging.length > 0;
  const hasGas = extracted.gasSources.length > 0;
  const hasWater = extracted.waterSources.length > 0;
  const hasDevices = extracted.deviceConsumption.length > 0;

  // Determine Primary Gas & Water Units
  const gasUnit = extracted.gasSources[0]?.unitOfMeasurement ||
    metadata[extracted.gasSources[0]?.statId]?.unit_of_measurement || 'm³';
  const waterUnit = extracted.waterSources[0]?.unitOfMeasurement ||
    metadata[extracted.waterSources[0]?.statId]?.unit_of_measurement || 'L';

  const { rawTimestamps, forecastWhHours } = collectTimestamps({
    allStatisticIds: extracted.allStatisticIds,
    stats,
    forecastData,
    startTimeMs,
    endTimeMs
  });
  const sortedTimestamps = buildSlotGrid({ rawTimestamps, periodType, daysInPeriod, startTimeMs, endTimeMs });

  const { entitySlotChanges, entitySlotPowerKW } = binEntityStatistics({ stats, states, metadata, periodType });
  const { getChangeAtTime, getPowerAtTime } = createSlotLookups(entitySlotChanges, entitySlotPowerKW, periodType);
  const getPriceForSource = createPriceLookup(states);
  const formatBucketLabel = createBucketLabeler(periodType);

  const { buckets, forecastSolarTotal } = buildBuckets({
    sortedTimestamps, extracted, metadata, periodType, forecastWhHours, hasSolar, hasBattery,
    formatBucketLabel, getChangeAtTime, getPowerAtTime
  });

  const {
    totalSolar,
    totalGridImport,
    totalGridExport,
    totalBatteryCharge,
    totalBatteryDischarge,
    totalSolarToHome,
    totalSolarToGrid,
    totalSolarToBattery,
    totalGridToHome,
    totalGridToBattery,
    totalBatteryToHome,
    totalBatteryToGrid,
    totalHomeConsumption,
    totalGasUsage,
    totalWaterUsage,
    selfSufficiencyPercentage,
    selfConsumptionPercentage
  } = computeTotals(buckets);

  const { devices, untrackedKwh, untrackedPercentage } = computeDevices({
    extracted, buckets, totalHomeConsumption, states, metadata
  });

  const { financialSources, gridImportCost, gridExportCompensation, gasCost, waterCost } = computeFinancialSources({
    extracted, buckets, states, metadata, gasUnit, waterUnit, currencySymbol, getChangeAtTime, getPriceForSource
  });

  const standingCharge = Number((extracted.costAdjustmentDay * daysInPeriod).toFixed(2));
  const netCost = Number((gridImportCost + gasCost + waterCost + standingCharge - gridExportCompensation).toFixed(2));

  return {
    totals: {
      solar: Number(totalSolar.toFixed(2)),
      gridImport: Number(totalGridImport.toFixed(2)),
      gridExport: Number(totalGridExport.toFixed(2)),
      batteryCharge: Number(totalBatteryCharge.toFixed(2)),
      batteryDischarge: Number(totalBatteryDischarge.toFixed(2)),
      solarToHome: Number(totalSolarToHome.toFixed(2)),
      solarToGrid: Number(totalSolarToGrid.toFixed(2)),
      solarToBattery: Number(totalSolarToBattery.toFixed(2)),
      gridToHome: Number(totalGridToHome.toFixed(2)),
      gridToBattery: Number(totalGridToBattery.toFixed(2)),
      batteryToHome: Number(totalBatteryToHome.toFixed(2)),
      batteryToGrid: Number(totalBatteryToGrid.toFixed(2)),
      homeConsumption: Number(totalHomeConsumption.toFixed(2)),
      selfSufficiencyPercentage: Number(selfSufficiencyPercentage.toFixed(1)),
      selfConsumptionPercentage: Number(selfConsumptionPercentage.toFixed(1)),
      gasUsage: Number(totalGasUsage.toFixed(2)),
      gasUnit,
      waterUsage: Number(totalWaterUsage.toFixed(2)),
      waterUnit,
      solarForecastTotal: forecastSolarTotal !== null ? Number(forecastSolarTotal.toFixed(2)) : null
    },
    financials: {
      gridImportCost: Number(gridImportCost.toFixed(2)),
      gridExportCompensation: Number(gridExportCompensation.toFixed(2)),
      gasCost: Number(gasCost.toFixed(2)),
      waterCost: Number(waterCost.toFixed(2)),
      standingCharge,
      netCost,
      currency: currencySymbol,
      sources: financialSources
    },
    buckets,
    devices,
    untrackedKwh: Number(untrackedKwh.toFixed(2)),
    untrackedPercentage,
    hasSolar,
    hasGrid,
    hasBattery,
    hasGas,
    hasWater,
    hasDevices
  };
}
