/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { haWebSocketService } from '../services/haWebSocket';
import {
  EnergyPreferences,
  ExtractedEnergyStatisticIds,
  fetchHAEnergyPreferences,
  extractEnergyStatisticIds,
  isEnergyConfigured
} from '../services/haEnergyPreferences';
import {
  EnergyHistoryPeriod,
  HAStatisticsResponse,
  fetchHAEnergyStatistics
} from '../services/haEnergyStatistics';
import {
  computeEnergyModel,
  computeRealtimePower,
  ComputedEnergyModel,
  HourlyEnergyBucket,
  TrackedDeviceMetric,
  EnergyTotals,
  FinancialMetrics,
  EnvironmentalMetrics
} from '../utils/energyMath';
import {
  RealtimeEnergy,
  DailyTotalsEnergy,
  FinancialsEnergy,
  EnvironmentalEnergy,
  DeviceConsumer,
  TimeseriesEnergyPoint
} from '../components/energy/energyCalculator';

export interface UseEnergyDataOptions {
  importTariff?: number;
  exportTariff?: number;
  currencySymbol?: string;
  autoRefreshIntervalMs?: number;
}

export type EnergyLoadState = 'loading' | 'not-configured' | 'ready' | 'error';

export interface UseEnergyDataResult {
  period: EnergyHistoryPeriod;
  setPeriod: (period: EnergyHistoryPeriod) => void;
  loadState: EnergyLoadState;
  isLoading: boolean;
  isFetchingStats: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isLive: boolean;
  preferences: EnergyPreferences | null;
  resolvedEntityIds: ExtractedEnergyStatisticIds | null;
  currency: string;

  // Real-time instantaneous telemetry
  realtime: RealtimeEnergy;

  // Domain Computed Models
  totals: EnergyTotals;
  financials: FinancialMetrics;
  environmental: EnvironmentalMetrics;
  devices: TrackedDeviceMetric[];
  otherConsumption: { kwh: number; percentage: number };
  hourlyTimeseries: HourlyEnergyBucket[];

  // Component-compatible mappings for existing UI widgets
  dailyTotals: DailyTotalsEnergy;
  financialTotals: FinancialsEnergy;
  environmentalTotals: EnvironmentalEnergy;
  deviceConsumers: DeviceConsumer[];
  timeseriesPoints: TimeseriesEnergyPoint[];
  timeseriesToday: TimeseriesEnergyPoint[];
  timeseries7d: TimeseriesEnergyPoint[];
  timeseriesMonth: TimeseriesEnergyPoint[];
}

function convertBucketToChartPoint(b: HourlyEnergyBucket, idx: number): TimeseriesEnergyPoint {
  const d = new Date(b.isoTime || Date.now());
  const hour = isNaN(d.getHours()) ? idx % 24 : d.getHours();
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

export function useEnergyData(options: UseEnergyDataOptions = {}): UseEnergyDataResult {
  const {
    importTariff = 0.28,
    exportTariff = 0.09,
    currencySymbol: customCurrency = '€',
    autoRefreshIntervalMs = 60000
  } = options;

  const states = useAutoLayoutStore(useShallow(s => s.states));
  const isLiveMode = useAutoLayoutStore(s => s.isLiveMode);
  const connectionStatus = useAutoLayoutStore(s => s.connectionStatus);

  const [period, setPeriod] = useState<EnergyHistoryPeriod>('today');
  const [preferences, setPreferences] = useState<EnergyPreferences | null>(null);
  const [resolvedIds, setResolvedIds] = useState<ExtractedEnergyStatisticIds | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, HAStatisticsResponse>>({});
  const [loadState, setLoadState] = useState<EnergyLoadState>('loading');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingStats, setIsFetchingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [haCurrency, setHaCurrency] = useState<string>(customCurrency);

  const isMountedRef = useRef(true);
  const resolvedIdsRef = useRef<ExtractedEnergyStatisticIds | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch HA currency from get_config if live
  useEffect(() => {
    if (isLiveMode && connectionStatus === 'connected' && haWebSocketService && !haWebSocketService.isDemo()) {
      haWebSocketService.sendRequest<any>('get_config').then(cfg => {
        if (cfg?.currency && isMountedRef.current) {
          setHaCurrency(cfg.currency);
        }
      }).catch(() => {});
    }
  }, [isLiveMode, connectionStatus]);

  // 1. Ingest Energy Preferences purely from Home Assistant (energy/get_prefs)
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await fetchHAEnergyPreferences();
      const isConfigured = isEnergyConfigured(prefs);
      const parsed = extractEnergyStatisticIds(prefs);
      resolvedIdsRef.current = parsed;

      if (isMountedRef.current) {
        setPreferences(prefs);
        setResolvedIds(parsed);
        if (!isConfigured && isLiveMode) {
          setLoadState('not-configured');
        }
      }
      return { prefs, parsed, isConfigured };
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load Home Assistant energy preferences');
        setLoadState('error');
      }
      return null;
    }
  }, [isLiveMode]);

  // 2. Fetch Recorder Statistics (recorder/statistics_during_period)
  const loadStatisticsForPeriod = useCallback(async (
    targetPeriod: EnergyHistoryPeriod,
    customParsed?: ExtractedEnergyStatisticIds | null,
    silent = false
  ) => {
    const activeResolved = customParsed || resolvedIdsRef.current || resolvedIds;
    if (!activeResolved || activeResolved.allStatisticIds.length === 0) {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      return;
    }

    if (!silent && isMountedRef.current) {
      setIsFetchingStats(true);
    }

    try {
      const stats = await fetchHAEnergyStatistics(undefined, activeResolved.allStatisticIds, targetPeriod);
      if (isMountedRef.current) {
        setStatsCache(prev => ({
          ...prev,
          [targetPeriod]: stats
        }));
        setError(null);
        setLoadState('ready');
      }
    } catch (err: any) {
      console.warn(`[useEnergyData] Failed fetching statistics for ${targetPeriod}:`, err);
      if (isMountedRef.current && !silent) {
        setError(err.message || `Failed to fetch statistics for ${targetPeriod}`);
        setLoadState('error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetchingStats(false);
        setIsLoading(false);
      }
    }
  }, [resolvedIds]);

  // Initialize on mount or live switch
  useEffect(() => {
    let isCurrent = true;
    const init = async () => {
      setIsLoading(true);
      const res = await loadPreferences();
      if (isCurrent && res) {
        await loadStatisticsForPeriod('today', res.parsed, false);
        // Pre-cache other periods silently
        loadStatisticsForPeriod('7d', res.parsed, true).catch(() => {});
        loadStatisticsForPeriod('month', res.parsed, true).catch(() => {});
        initializedRef.current = true;
      }
    };

    init();
    return () => {
      isCurrent = false;
    };
  }, [isLiveMode, loadPreferences, loadStatisticsForPeriod]);

  // Re-sync on connection status transitions
  useEffect(() => {
    if (connectionStatus === 'connected' && initializedRef.current) {
      loadPreferences().then(res => {
        if (res) {
          loadStatisticsForPeriod(period, res.parsed, true);
        }
      });
    }
  }, [connectionStatus, loadPreferences, loadStatisticsForPeriod, period]);

  // Period Switch Fetch
  useEffect(() => {
    if (resolvedIds && !statsCache[period]) {
      loadStatisticsForPeriod(period, resolvedIds, false);
    }
  }, [period, resolvedIds, loadStatisticsForPeriod, statsCache]);

  // Background Auto-refresh
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) return;
    const interval = setInterval(() => {
      if (resolvedIds) {
        loadStatisticsForPeriod(period, resolvedIds, true);
      }
    }, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefreshIntervalMs, resolvedIds, period, loadStatisticsForPeriod]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    const res = await loadPreferences();
    if (res) {
      await loadStatisticsForPeriod(period, res.parsed, false);
    }
    setIsLoading(false);
  }, [loadPreferences, loadStatisticsForPeriod, period]);

  const activeCurrency = haCurrency || customCurrency;

  // 3. Compute Active Period Domain Model
  const computedModel: ComputedEnergyModel = useMemo(() => {
    if (!resolvedIds) {
      return computeEnergyModel(
        {
          solarSources: [],
          gridImport: [],
          gridExport: [],
          batteryCharging: [],
          batteryDischarging: [],
          gasSources: [],
          waterSources: [],
          deviceConsumption: [],
          allStatisticIds: []
        },
        {},
        { currencySymbol: activeCurrency, defaultImportTariff: importTariff, defaultExportTariff: exportTariff }
      );
    }

    const currentStats = statsCache[period] || {};
    return computeEnergyModel(resolvedIds, currentStats, {
      currencySymbol: activeCurrency,
      defaultImportTariff: importTariff,
      defaultExportTariff: exportTariff
    });
  }, [resolvedIds, statsCache, period, activeCurrency, importTariff, exportTariff]);

  // Precomputed chart points
  const timeseriesToday = useMemo(() => {
    if (!resolvedIds) return [];
    const stats = statsCache['today'] || {};
    const res = computeEnergyModel(resolvedIds, stats, { currencySymbol: activeCurrency, defaultImportTariff: importTariff, defaultExportTariff: exportTariff });
    return res.hourlyTimeseries.map(convertBucketToChartPoint);
  }, [resolvedIds, statsCache, activeCurrency, importTariff, exportTariff]);

  const timeseries7d = useMemo(() => {
    if (!resolvedIds) return [];
    const stats = statsCache['7d'] || {};
    const res = computeEnergyModel(resolvedIds, stats, { currencySymbol: activeCurrency, defaultImportTariff: importTariff, defaultExportTariff: exportTariff });
    return res.hourlyTimeseries.map(convertBucketToChartPoint);
  }, [resolvedIds, statsCache, activeCurrency, importTariff, exportTariff]);

  const timeseriesMonth = useMemo(() => {
    if (!resolvedIds) return [];
    const stats = statsCache['month'] || {};
    const res = computeEnergyModel(resolvedIds, stats, { currencySymbol: activeCurrency, defaultImportTariff: importTariff, defaultExportTariff: exportTariff });
    return res.hourlyTimeseries.map(convertBucketToChartPoint);
  }, [resolvedIds, statsCache, activeCurrency, importTariff, exportTariff]);

  const timeseriesPoints = useMemo(() => {
    return computedModel.hourlyTimeseries.map(convertBucketToChartPoint);
  }, [computedModel]);

  // 4. Real-Time Power Telemetry from Home Assistant States (Normalized Polarity)
  const realtime: RealtimeEnergy = useMemo(() => {
    return computeRealtimePower(states);
  }, [states]);

  // Backward compatibility adapter models for existing components
  const dailyTotals: DailyTotalsEnergy = useMemo(() => ({
    solarProductionKWh: computedModel.totals.solarGeneratedKWh,
    solarConsumedKWh: computedModel.totals.solarDirectConsumedKWh,
    solarFedToGridKWh: computedModel.totals.solarFedToGridKWh,
    gridImportKWh: computedModel.totals.gridImportedKWh,
    gridExportKWh: computedModel.totals.gridExportedKWh,
    totalConsumptionKWh: computedModel.totals.totalHomeConsumptionKWh,
    batteryChargedKWh: computedModel.totals.batteryChargedKWh,
    batteryDischargedKWh: computedModel.totals.batteryDischargedKWh,
    selfConsumptionRate: computedModel.totals.selfConsumptionPercentage,
    autarkyRate: computedModel.totals.autarkyPercentage
  }), [computedModel]);

  const financialsEnergy: FinancialsEnergy = useMemo(() => ({
    importCost: computedModel.financials.importCost,
    exportEarnings: computedModel.financials.exportEarnings,
    netCost: computedModel.financials.netCost,
    currency: computedModel.financials.currency,
    importTariffPerKWh: computedModel.financials.importTariffPerKWh,
    exportTariffPerKWh: computedModel.financials.exportTariffPerKWh
  }), [computedModel]);

  const environmentalEnergy: EnvironmentalEnergy = useMemo(() => ({
    co2AvoidedKg: computedModel.environmental.co2AvoidedKg,
    coalSavedKg: computedModel.environmental.coalSavedKg,
    treesPlantedEquivalent: computedModel.environmental.treesPlantedEquivalent,
    gasOffsetM3: Number((computedModel.totals.solarGeneratedKWh * 0.098).toFixed(2))
  }), [computedModel]);

  const deviceConsumers: DeviceConsumer[] = useMemo(() => {
    return computedModel.devices.map(d => ({
      id: d.id,
      name: d.name,
      entityId: d.statId,
      icon: d.icon,
      color: d.color,
      category: d.category,
      currentPowerW: d.currentPowerW,
      energyKWh: d.energyKWh,
      percentage: d.percentage
    }));
  }, [computedModel]);

  return {
    period,
    setPeriod,
    loadState,
    isLoading,
    isFetchingStats,
    error,
    refresh: handleRefresh,
    isLive: isLiveMode && connectionStatus === 'connected',
    preferences,
    resolvedEntityIds: resolvedIds,
    currency: activeCurrency,
    realtime,
    totals: computedModel.totals,
    financials: computedModel.financials,
    environmental: computedModel.environmental,
    devices: computedModel.devices,
    otherConsumption: computedModel.otherConsumption,
    hourlyTimeseries: computedModel.hourlyTimeseries,
    dailyTotals,
    financialTotals: financialsEnergy,
    environmentalTotals: environmentalEnergy,
    deviceConsumers,
    timeseriesPoints,
    timeseriesToday,
    timeseries7d,
    timeseriesMonth
  };
}
