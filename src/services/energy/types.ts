/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Transformed energy data structures (Home Assistant frontend data model, src/data/energy.ts).
 */

// ---------------------------------------------------------------------------
// Transformed Data Structures
// Reference: Home Assistant frontend data model (src/data/energy.ts)
// ---------------------------------------------------------------------------

export interface TransformedEnergyBucket {
  startMs: number;
  endMs: number;
  label: string;
  isoDate: string;

  // Base measurements (kWh or native units)
  solar: number;
  gridImport: number;
  gridExport: number;
  batteryCharge: number;
  batteryDischarge: number;

  // Derived flows (Home Assistant flow logic)
  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
  homeConsumption: number;

  // Gas & Water
  gasUsage: number;
  waterUsage: number;

  // Tracked devices by statId
  deviceValues: Record<string, number>;

  // Solar Forecast (kWh)
  solarForecast: number | null;
}

export interface TransformedDevice {
  statId: string;
  name: string;
  kwh: number;
  percentage: number;
  icon?: string;
  color?: string;
}

export interface TransformedEnergyTotals {
  solar: number;
  gridImport: number;
  gridExport: number;
  batteryCharge: number;
  batteryDischarge: number;

  solarToHome: number;
  solarToGrid: number;
  solarToBattery: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToHome: number;
  batteryToGrid: number;
  homeConsumption: number;

  selfSufficiencyPercentage: number; // Autarky %
  selfConsumptionPercentage: number; // Solar used locally %

  gasUsage: number;
  gasUnit: string;
  waterUsage: number;
  waterUnit: string;

  solarForecastTotal: number | null;
}

export interface FinancialSourceBreakdown {
  name: string;
  type: 'grid_import' | 'grid_export' | 'solar' | 'battery' | 'gas' | 'water';
  energyVal: number;
  unit: string;
  costOrCompensation: number | null;
  rateDescription?: string;
}

export interface TransformedFinancials {
  gridImportCost: number;
  gridExportCompensation: number;
  gasCost: number;
  waterCost: number;
  standingCharge: number;
  netCost: number;
  currency: string;
  sources: FinancialSourceBreakdown[];
}

export interface TransformedEnergyModel {
  totals: TransformedEnergyTotals;
  financials: TransformedFinancials;
  buckets: TransformedEnergyBucket[];
  powerBuckets?: TransformedEnergyBucket[];
  devices: TransformedDevice[];
  untrackedKwh: number;
  untrackedPercentage: number;

  // Configuration flags
  hasSolar: boolean;
  hasGrid: boolean;
  hasBattery: boolean;
  hasGas: boolean;
  hasWater: boolean;
  hasDevices: boolean;
}

export type EnergyPeriodType = '5minute' | 'hour' | 'day' | 'month';
