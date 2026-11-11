/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sums buckets into period totals and self-sufficiency / self-consumption percentages.
 */

import type { TransformedEnergyBucket } from './types';

export function computeTotals(buckets: TransformedEnergyBucket[]) {
  // 3. Compute Totals across all buckets
  let totalSolar = 0;
  let totalGridImport = 0;
  let totalGridExport = 0;
  let totalBatteryCharge = 0;
  let totalBatteryDischarge = 0;
  let totalSolarToHome = 0;
  let totalSolarToGrid = 0;
  let totalSolarToBattery = 0;
  let totalGridToHome = 0;
  let totalGridToBattery = 0;
  let totalBatteryToHome = 0;
  let totalBatteryToGrid = 0;
  let totalHomeConsumption = 0;
  let totalGasUsage = 0;
  let totalWaterUsage = 0;

  for (const b of buckets) {
    totalSolar += b.solar;
    totalGridImport += b.gridImport;
    totalGridExport += b.gridExport;
    totalBatteryCharge += b.batteryCharge;
    totalBatteryDischarge += b.batteryDischarge;
    totalSolarToHome += b.solarToHome;
    totalSolarToGrid += b.solarToGrid;
    totalSolarToBattery += b.solarToBattery;
    totalGridToHome += b.gridToHome;
    totalGridToBattery += b.gridToBattery;
    totalBatteryToHome += b.batteryToHome;
    totalBatteryToGrid += b.batteryToGrid;
    totalHomeConsumption += b.homeConsumption;
    totalGasUsage += b.gasUsage;
    totalWaterUsage += b.waterUsage;
  }

  // Calculate Self-Sufficiency % (Autarky) and Self-Consumption %
  let selfSufficiencyPercentage = 0;
  if (totalHomeConsumption > 0) {
    selfSufficiencyPercentage = Math.min(100, Math.max(0,
      ((totalSolarToHome + totalBatteryToHome) / totalHomeConsumption) * 100
    ));
  }

  let selfConsumptionPercentage = 0;
  if (totalSolar > 0) {
    selfConsumptionPercentage = Math.min(100, Math.max(0,
      ((totalSolar - totalSolarToGrid) / totalSolar) * 100
    ));
  }
  return {
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
  };
}
