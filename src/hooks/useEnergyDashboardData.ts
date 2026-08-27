/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import {
  EnergyPreferences,
  HAStatisticsResponse,
  StatisticsPeriod,
  fetchEnergyPreferences,
  fetchEnergyStatistics,
  extractStatisticIdsFromPrefs
} from '../services/haEnergyService';
import {
  transformEnergyData,
  TransformedEnergyPayload,
  HourlyEnergyBucket,
  TransformedDeviceConsumer
} from '../services/energyDataTransformer';
import {
  RealtimeEnergy,
  DailyTotalsEnergy,
  FinancialsEnergy,
  EnvironmentalEnergy,
  DeviceConsumer,
  TimeseriesEnergyPoint,
  EnergyEntityMappingConfig
} from '../components/energy/energyCalculator';

export type EnergyPeriod = 'today' | 'yesterday' | '7d' | 'month';

export interface UseEnergyDashboardDataOptions {
  importTariff?: number;
  exportTariff?: number;
  currencySymbol?: string;
  entityOverrides?: EnergyEntityMappingConfig;
  autoRefreshIntervalMs?: number;
}

export interface UseEnergyDashboardDataResult {
  period: EnergyPeriod;
  setPeriod: (period: EnergyPeriod) => void;
  isLoading: boolean;
  isFetchingStats: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isLive: boolean;
  preferences: EnergyPreferences | null;
  
  // Real-time instantaneous telemetry
  realtime: RealtimeEnergy;

  // Processed Period Metrics
  dailyTotals: DailyTotalsEnergy;
  financials: FinancialsEnergy;
  environmental: EnvironmentalEnergy;
  deviceConsumers: DeviceConsumer[];
  timeseries: TimeseriesEnergyPoint[];
  hourlyBuckets: HourlyEnergyBucket[];

  // Multi-period cache series for charts
  timeseriesToday: TimeseriesEnergyPoint[];
  timeseries7d: TimeseriesEnergyPoint[];
  timeseriesMonth: TimeseriesEnergyPoint[];
}

// -------------------------------------------------------------
// Time Range Calculators
// -------------------------------------------------------------

function calculateTimeRange(period: EnergyPeriod): { start: string; end: string; statPeriod: StatisticsPeriod } {
  const now = new Date();
  
  if (period === 'yesterday') {
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return {
      start: yesterdayStart.toISOString(),
      end: yesterdayEnd.toISOString(),
      statPeriod: 'hour'
    };
  }

  if (period === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return {
      start: sevenDaysAgo.toISOString(),
      end: now.toISOString(),
      statPeriod: 'hour'
    };
  }

  if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return {
      start: monthStart.toISOString(),
      end: now.toISOString(),
      statPeriod: 'day'
    };
  }

  // 'today' (default)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return {
    start: todayStart.toISOString(),
    end: now.toISOString(),
    statPeriod: 'hour'
  };
}

// -------------------------------------------------------------
// Convert HourlyEnergyBucket -> TimeseriesEnergyPoint
// -------------------------------------------------------------

function convertToTimeseriesPoint(b: HourlyEnergyBucket, index: number): TimeseriesEnergyPoint {
  const date = new Date(b.isoTime || Date.now());
  const hour = isNaN(date.getHours()) ? index % 24 : date.getHours();
  return {
    timestamp: b.isoTime || new Date().toISOString(),
    label: b.timestamp,
    hour,
    solar: Math.max(0, b.solar),
    gridImport: Math.max(0, b.gridImport),
    gridExport: Math.min(0, b.gridExport),
    batteryDischarge: Math.max(0, b.batteryDischarge),
    batteryCharge: Math.min(0, b.batteryCharge),
    consumption: Math.max(0, b.consumption)
  };
}

export function useEnergyDashboardData(options: UseEnergyDashboardDataOptions = {}): UseEnergyDashboardDataResult {
  const {
    importTariff = 0.28,
    exportTariff = 0.09,
    currencySymbol = '€',
    autoRefreshIntervalMs = 60000
  } = options;

  const states = useAutoLayoutStore(useShallow(s => s.states));
  const isLiveMode = useAutoLayoutStore(s => s.isLiveMode);
  const connectionStatus = useAutoLayoutStore(s => s.connectionStatus);

  const [period, setPeriod] = useState<EnergyPeriod>('today');
  const [preferences, setPreferences] = useState<EnergyPreferences | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, HAStatisticsResponse>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingStats, setIsFetchingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // -------------------------------------------------------------
  // 1. Ingest Energy Preferences on Mount or Live Status Change
  // -------------------------------------------------------------
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await fetchEnergyPreferences();
      if (isMountedRef.current) {
        setPreferences(prefs);
      }
      return prefs;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load Home Assistant energy preferences');
      }
      return null;
    }
  }, []);

  // -------------------------------------------------------------
  // 2. Fetch Recorder Statistics for a given period
  // -------------------------------------------------------------
  const loadPeriodStatistics = useCallback(async (
    targetPeriod: EnergyPeriod,
    currentPrefs?: EnergyPreferences | null
  ) => {
    const activePrefs = currentPrefs || preferences;
    if (!activePrefs) return;

    const statIds = extractStatisticIdsFromPrefs(activePrefs);
    if (statIds.length === 0) return;

    const { start, end, statPeriod } = calculateTimeRange(targetPeriod);
    const cacheKey = `${targetPeriod}_${start.slice(0, 13)}`;

    setIsFetchingStats(true);
    try {
      const stats = await fetchEnergyStatistics(undefined, statIds, statPeriod, start, end);
      if (isMountedRef.current) {
        setStatsCache(prev => ({
          ...prev,
          [targetPeriod]: stats,
          [cacheKey]: stats
        }));
        setError(null);
      }
    } catch (err: any) {
      console.warn(`[useEnergyDashboardData] Failed fetching statistics for ${targetPeriod}:`, err);
      if (isMountedRef.current) {
        setError(err.message || `Failed to fetch energy statistics for ${targetPeriod}`);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetchingStats(false);
        setIsLoading(false);
      }
    }
  }, [preferences]);

  // Initial Load
  useEffect(() => {
    let isCurrent = true;
    const initialize = async () => {
      setIsLoading(true);
      const prefs = await loadPreferences();
      if (isCurrent && prefs) {
        await loadPeriodStatistics('today', prefs);
        // Pre-fetch week and month in background
        loadPeriodStatistics('7d', prefs).catch(() => {});
        loadPeriodStatistics('month', prefs).catch(() => {});
      }
    };
    initialize();
    return () => {
      isCurrent = false;
    };
  }, [loadPreferences, isLiveMode, connectionStatus]);

  // Handle period change
  useEffect(() => {
    if (preferences && !statsCache[period]) {
      loadPeriodStatistics(period);
    }
  }, [period, preferences, loadPeriodStatistics, statsCache]);

  // Polling / Auto-refresh
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) return;
    const interval = setInterval(() => {
      if (preferences) {
        loadPeriodStatistics(period);
      }
    }, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefreshIntervalMs, preferences, period, loadPeriodStatistics]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    const prefs = await loadPreferences();
    if (prefs) {
      await loadPeriodStatistics(period, prefs);
    }
    setIsLoading(false);
  }, [loadPreferences, loadPeriodStatistics, period]);

  // -------------------------------------------------------------
  // 3. Process Active Period Transformed Payload
  // -------------------------------------------------------------
  const transformedPayload: TransformedEnergyPayload = useMemo(() => {
    if (!preferences) {
      return transformEnergyData(
        { energy_sources: [], device_consumption: [] },
        {},
        { currencySymbol, defaultImportTariff: importTariff, defaultExportTariff: exportTariff }
      );
    }

    const currentStats = statsCache[period] || {};
    return transformEnergyData(preferences, currentStats, {
      currencySymbol,
      defaultImportTariff: importTariff,
      defaultExportTariff: exportTariff
    });
  }, [preferences, statsCache, period, currencySymbol, importTariff, exportTariff]);

  // -------------------------------------------------------------
  // 4. Precompute Timeseries for Today, 7D, and Month
  // -------------------------------------------------------------
  const timeseriesToday = useMemo(() => {
    if (!preferences) return [];
    const stats = statsCache['today'] || {};
    const res = transformEnergyData(preferences, stats, { currencySymbol, defaultImportTariff: importTariff, defaultExportTariff: exportTariff });
    return res.hourlyBuckets.map(convertToTimeseriesPoint);
  }, [preferences, statsCache, currencySymbol, importTariff, exportTariff]);

  const timeseries7d = useMemo(() => {
    if (!preferences) return [];
    const stats = statsCache['7d'] || {};
    const res = transformEnergyData(preferences, stats, { currencySymbol, defaultImportTariff: importTariff, defaultExportTariff: exportTariff });
    return res.hourlyBuckets.map(convertToTimeseriesPoint);
  }, [preferences, statsCache, currencySymbol, importTariff, exportTariff]);

  const timeseriesMonth = useMemo(() => {
    if (!preferences) return [];
    const stats = statsCache['month'] || {};
    const res = transformEnergyData(preferences, stats, { currencySymbol, defaultImportTariff: importTariff, defaultExportTariff: exportTariff });
    return res.hourlyBuckets.map(convertToTimeseriesPoint);
  }, [preferences, statsCache, currencySymbol, importTariff, exportTariff]);

  const activeTimeseries = useMemo(() => {
    return transformedPayload.hourlyBuckets.map(convertToTimeseriesPoint);
  }, [transformedPayload]);

  // -------------------------------------------------------------
  // 5. Compute Instantaneous Real-time Telemetry (kW & SoC)
  // -------------------------------------------------------------
  const realtime: RealtimeEnergy = useMemo(() => {
    let solarPower = 0;
    let gridPower = 0;
    let batteryPower = 0;
    let batterySoC = 85;

    // Try extracting from live entities in state store
    if (states && typeof states === 'object') {
      for (const [entityId, stateObj] of Object.entries(states)) {
        const val = parseFloat(stateObj?.state);
        if (isNaN(val)) continue;

        const lowerId = entityId.toLowerCase();
        if (lowerId.includes('solaredge_solar_power') || lowerId.includes('solar_power') || (lowerId.includes('pv') && lowerId.includes('power'))) {
          solarPower = val > 100 ? val / 1000 : val; // Convert W -> kW if large
        } else if (lowerId.includes('battery_state_of_charge') || lowerId.includes('battery_soc') || (lowerId.includes('battery') && lowerId.includes('percentage'))) {
          batterySoC = Math.round(val);
        } else if (lowerId.includes('battery_power')) {
          batteryPower = val > 100 ? val / 1000 : val;
        } else if (lowerId.includes('grid_power') || lowerId.includes('meter_power')) {
          gridPower = val > 100 ? val / 1000 : val;
        }
      }
    }

    // If zero or unconfigured, derive sensible live values from today's latest hourly bucket
    if (solarPower === 0 && gridPower === 0 && transformedPayload.hourlyBuckets.length > 0) {
      const latest = transformedPayload.hourlyBuckets[transformedPayload.hourlyBuckets.length - 1];
      solarPower = latest.solar;
      gridPower = latest.gridImport > 0 ? latest.gridImport : latest.gridExport;
      batteryPower = latest.batteryDischarge > 0 ? latest.batteryDischarge : latest.batteryCharge;
    }

    // Home consumption = Solar direct + Grid in + Battery discharge
    const directSolar = Math.max(0, solarPower - Math.max(0, -gridPower) - Math.max(0, -batteryPower));
    const homeConsumption = Math.max(0.1, (gridPower > 0 ? gridPower : 0) + directSolar + (batteryPower > 0 ? batteryPower : 0));

    return {
      solarPower: Number(solarPower.toFixed(2)),
      gridPower: Number(gridPower.toFixed(2)),
      batteryPower: Number(batteryPower.toFixed(2)),
      batterySoC,
      homeConsumption: Number(homeConsumption.toFixed(2)),
      inverterEfficiency: 97.4
    };
  }, [states, transformedPayload]);

  return {
    period,
    setPeriod,
    isLoading,
    isFetchingStats,
    error,
    refresh: handleRefresh,
    isLive: isLiveMode && connectionStatus === 'connected',
    preferences,
    realtime,
    dailyTotals: transformedPayload.totals,
    financials: transformedPayload.financials,
    environmental: transformedPayload.environmental,
    deviceConsumers: transformedPayload.deviceConsumers as DeviceConsumer[],
    timeseries: activeTimeseries,
    hourlyBuckets: transformedPayload.hourlyBuckets,
    timeseriesToday,
    timeseries7d,
    timeseriesMonth
  };
}
