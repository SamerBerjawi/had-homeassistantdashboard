/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Grid/gas/water costs and the sources table.
 */

import type { ExtractedEnergyStatisticIds } from '../haEnergyPreferences';
import type { StatisticsMetaData } from '../haEnergyStatistics';
import { getEnergyToKWhMultiplier } from './units';
import type { FinancialSourceBreakdown, TransformedEnergyBucket } from './types';

export function computeFinancialSources(p: {
  extracted: ExtractedEnergyStatisticIds;
  buckets: TransformedEnergyBucket[];
  states: Record<string, any>;
  metadata: Record<string, StatisticsMetaData>;
  gasUnit: string;
  waterUnit: string;
  currencySymbol: string;
  getChangeAtTime: (statId: string, timeMs: number) => number;
  getPriceForSource: (fixedPrice?: number | null, priceEntity?: string | null) => number;
}) {
  const { extracted, buckets, states, metadata, gasUnit, waterUnit, currencySymbol, getChangeAtTime, getPriceForSource } = p;
  // 5. Compute Financials & Sources Table
  const financialSources: FinancialSourceBreakdown[] = [];
  let gridImportCost = 0;
  let gridExportCompensation = 0;
  let gasCost = 0;
  let waterCost = 0;

  // Grid Import Cost
  for (const src of extracted.gridImport) {
    const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
    let srcKWh = 0;
    for (const b of buckets) {
      srcKWh += getChangeAtTime(src.statId, b.startMs) * mult;
    }

    let srcCost: number | null = null;
    let rateDesc: string | undefined;

    if (src.statCost) {
      // Sum the growth of the cost statistic
      let statCostSum = 0;
      for (const b of buckets) {
        statCostSum += getChangeAtTime(src.statCost, b.startMs);
      }
      srcCost = statCostSum;
      rateDesc = 'Tracked cost sensor';
    } else if (src.fixedPrice !== null && src.fixedPrice !== undefined) {
      srcCost = srcKWh * src.fixedPrice;
      rateDesc = `${src.fixedPrice.toFixed(2)} ${currencySymbol}/kWh`;
    } else if (src.priceEntity) {
      const p = getPriceForSource(undefined, src.priceEntity);
      srcCost = srcKWh * p;
      rateDesc = `${p.toFixed(2)} ${currencySymbol}/kWh`;
    }

    if (srcCost !== null) {
      gridImportCost += srcCost;
    }

    financialSources.push({
      name: states[src.statId]?.attributes?.friendly_name || 'Grid Import',
      type: 'grid_import',
      energyVal: Number(srcKWh.toFixed(2)),
      unit: 'kWh',
      costOrCompensation: srcCost !== null ? Number(srcCost.toFixed(2)) : null,
      rateDescription: rateDesc
    });
  }

  // Grid Export Compensation
  for (const src of extracted.gridExport) {
    const mult = getEnergyToKWhMultiplier(metadata[src.statId]?.unit_of_measurement);
    let srcKWh = 0;
    for (const b of buckets) {
      srcKWh += getChangeAtTime(src.statId, b.startMs) * mult;
    }

    let srcComp: number | null = null;
    let rateDesc: string | undefined;

    if (src.statCompensation) {
      let statCompSum = 0;
      for (const b of buckets) {
        statCompSum += getChangeAtTime(src.statCompensation, b.startMs);
      }
      srcComp = statCompSum;
      rateDesc = 'Tracked compensation sensor';
    } else if (src.fixedPrice !== null && src.fixedPrice !== undefined) {
      srcComp = srcKWh * src.fixedPrice;
      rateDesc = `${src.fixedPrice.toFixed(2)} ${currencySymbol}/kWh`;
    } else if (src.priceEntity) {
      const p = getPriceForSource(undefined, src.priceEntity);
      srcComp = srcKWh * p;
      rateDesc = `${p.toFixed(2)} ${currencySymbol}/kWh`;
    }

    if (srcComp !== null) {
      gridExportCompensation += srcComp;
    }

    financialSources.push({
      name: states[src.statId]?.attributes?.friendly_name || 'Grid Export',
      type: 'grid_export',
      energyVal: Number(srcKWh.toFixed(2)),
      unit: 'kWh',
      costOrCompensation: srcComp !== null ? Number(srcComp.toFixed(2)) : null,
      rateDescription: rateDesc
    });
  }

  // Gas Cost
  for (const src of extracted.gasSources) {
    let srcVal = 0;
    for (const b of buckets) {
      srcVal += getChangeAtTime(src.statId, b.startMs);
    }
    let srcCost: number | null = null;
    if (src.statCost) {
      let sum = 0;
      for (const b of buckets) sum += getChangeAtTime(src.statCost, b.startMs);
      srcCost = sum;
    } else if (src.fixedPrice) {
      srcCost = srcVal * src.fixedPrice;
    }
    if (srcCost !== null) gasCost += srcCost;

    financialSources.push({
      name: src.name || states[src.statId]?.attributes?.friendly_name || 'Gas Consumption',
      type: 'gas',
      energyVal: Number(srcVal.toFixed(2)),
      unit: gasUnit,
      costOrCompensation: srcCost !== null ? Number(srcCost.toFixed(2)) : null
    });
  }

  // Water Cost
  for (const src of extracted.waterSources) {
    let srcVal = 0;
    for (const b of buckets) {
      srcVal += getChangeAtTime(src.statId, b.startMs);
    }
    let srcCost: number | null = null;
    if (src.statCost) {
      let sum = 0;
      for (const b of buckets) sum += getChangeAtTime(src.statCost, b.startMs);
      srcCost = sum;
    } else if (src.fixedPrice) {
      srcCost = srcVal * src.fixedPrice;
    }
    if (srcCost !== null) waterCost += srcCost;

    financialSources.push({
      name: src.name || states[src.statId]?.attributes?.friendly_name || 'Water Consumption',
      type: 'water',
      energyVal: Number(srcVal.toFixed(2)),
      unit: waterUnit,
      costOrCompensation: srcCost !== null ? Number(srcCost.toFixed(2)) : null
    });
  }
  return { financialSources, gridImportCost, gridExportCompensation, gasCost, waterCost };
}
