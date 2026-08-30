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
  isEnergyConfigured,
  EMPTY_ENERGY_PREFERENCES
} from '../services/haEnergyPreferences';
import {
  EnergyHistoryPeriod,
  HAStatisticsResponse,
  StatisticsMetaData,
  SolarForecastResponse,
  fetchHAEnergyStatistics,
  fetchHAStatisticsMetadata,
  fetchHAEnergySolarForecasts,
  computePeriodTimeRange,
  shiftReferenceDate,
  isPeriodAtLimit
} from '../services/haEnergyStatistics';
import {
  transformEnergyStatistics,
  TransformedEnergyModel,
  TransformedEnergyTotals,
  TransformedFinancials,
  TransformedEnergyBucket,
  TransformedDevice
} from '../services/energyDataTransformer';
import {
  computeInstantaneousPower,
  InstantaneousPowerTelemetry
} from '../utils/energyMath';

export interface UseEnergyDataOptions {
  autoRefreshIntervalMs?: number;
  initialPeriod?: EnergyHistoryPeriod;
}

export type EnergyLoadState = 'loading' | 'unconfigured' | 'ready' | 'error';

export interface UseEnergyDataResult {
  // Period and Date navigation
  period: EnergyHistoryPeriod;
  setPeriod: (period: EnergyHistoryPeriod) => void;
  targetDate: Date;
  setTargetDate: (date: Date) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  isAtFutureLimit: boolean;
  dateLabel: string;
  customRange: { start: Date; end: Date } | null;
  setCustomRange: (start: Date, end: Date) => void;

  // Status & Telemetry
  loadState: EnergyLoadState;
  isLoading: boolean;
  isFetchingStats: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isLive: boolean;
  preferences: EnergyPreferences | null;
  resolvedEntityIds: ExtractedEnergyStatisticIds | null;
  currency: string;

  // Transformed Domain Model
  model: TransformedEnergyModel;
  realtime: InstantaneousPowerTelemetry;

  // Direct access shortcuts
  totals: TransformedEnergyTotals;
  financials: TransformedFinancials;
  buckets: TransformedEnergyBucket[];
  devices: TransformedDevice[];
  untrackedKwh: number;
  untrackedPercentage: number;
  hasSolar: boolean;
  hasGrid: boolean;
  hasBattery: boolean;
  hasGas: boolean;
  hasWater: boolean;
  hasDevices: boolean;
}

export function useEnergyData(options: UseEnergyDataOptions = {}): UseEnergyDataResult {
  const {
    autoRefreshIntervalMs = 30000,
    initialPeriod = 'day'
  } = options;

  const states = useAutoLayoutStore(useShallow(s => s.states));
  const isLiveMode = useAutoLayoutStore(s => s.isLiveMode);
  const connectionStatus = useAutoLayoutStore(s => s.connectionStatus);

  const [period, setPeriodState] = useState<EnergyHistoryPeriod>(initialPeriod);
  const [targetDate, setTargetDate] = useState<Date>(() => new Date());
  const [customRange, setCustomRangeState] = useState<{ start: Date; end: Date } | null>(null);

  const [preferences, setPreferences] = useState<EnergyPreferences | null>(null);
  const [resolvedIds, setResolvedIds] = useState<ExtractedEnergyStatisticIds | null>(null);
  const [statsData, setStatsData] = useState<HAStatisticsResponse>({});
  const [metadata, setMetadata] = useState<Record<string, StatisticsMetaData>>({});
  const [solarForecasts, setSolarForecasts] = useState<SolarForecastResponse | null>(null);

  const [loadState, setLoadState] = useState<EnergyLoadState>('loading');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingStats, setIsFetchingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [haCurrency, setHaCurrency] = useState<string>('€');

  const isMountedRef = useRef(true);
  const resolvedIdsRef = useRef<ExtractedEnergyStatisticIds | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Set Period with target date reset to today when switching standard periods
  const setPeriod = useCallback((newPeriod: EnergyHistoryPeriod) => {
    setPeriodState(newPeriod);
    setTargetDate(new Date());
  }, []);

  // Shift Reference Date (< and > navigation)
  const shiftPeriod = useCallback((direction: -1 | 1) => {
    setTargetDate(prev => shiftReferenceDate(period, prev, direction));
  }, [period]);

  const isAtFutureLimit = useMemo(() => {
    return isPeriodAtLimit(period, targetDate);
  }, [period, targetDate]);

  const setCustomRange = useCallback((start: Date, end: Date) => {
    setCustomRangeState({ start, end });
    setPeriodState('custom');
  }, []);

  // Fetch Home Assistant currency from get_config if connected
  useEffect(() => {
    if (isLiveMode && connectionStatus === 'connected' && haWebSocketService && !haWebSocketService.isDemo()) {
      haWebSocketService.sendRequest<any>('get_config').then(cfg => {
        if (cfg?.currency && isMountedRef.current) {
          setHaCurrency(cfg.currency);
        }
      }).catch(() => {});
    }
  }, [isLiveMode, connectionStatus]);

  // 1. Ingest Energy Preferences (energy/get_prefs)
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
          setLoadState('unconfigured');
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

  // 2. Fetch Recorder Statistics, Metadata, and Solar Forecast
  const loadStatistics = useCallback(async (
    targetPeriod: EnergyHistoryPeriod,
    refDate: Date,
    customParsed?: ExtractedEnergyStatisticIds | null,
    silent = false
  ) => {
    const activeResolved = customParsed || resolvedIdsRef.current || resolvedIds;
    if (!activeResolved || activeResolved.allStatisticIds.length === 0) {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsFetchingStats(false);
      }
      return;
    }

    if (!silent && isMountedRef.current) {
      setIsFetchingStats(true);
    }

    try {
      // Parallel fetch for statistics, metadata, and solar forecast
      const [stats, meta, forecast] = await Promise.all([
        fetchHAEnergyStatistics(
          undefined,
          activeResolved.allStatisticIds,
          targetPeriod,
          refDate,
          customRange?.start,
          customRange?.end
        ),
        fetchHAStatisticsMetadata(undefined, activeResolved.allStatisticIds),
        activeResolved.solarSources.length > 0
          ? fetchHAEnergySolarForecasts(undefined)
          : Promise.resolve(null)
      ]);

      if (isMountedRef.current) {
        setStatsData(stats);
        if (meta && Object.keys(meta).length > 0) {
          setMetadata(meta);
        }
        if (forecast) {
          setSolarForecasts(forecast);
        }
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
  }, [resolvedIds, customRange]);

  // Initial Load on mount or connection change
  useEffect(() => {
    let isCurrent = true;
    const init = async () => {
      setIsLoading(true);
      const res = await loadPreferences();
      if (isCurrent && res) {
        if (res.isConfigured || !isLiveMode) {
          await loadStatistics(period, targetDate, res.parsed, false);
        } else {
          setIsLoading(false);
        }
        initializedRef.current = true;
      }
    };

    init();
    return () => {
      isCurrent = false;
    };
  }, [isLiveMode, loadPreferences, loadStatistics, period, targetDate]);

  // Re-sync on connection status transitions
  useEffect(() => {
    if (connectionStatus === 'connected' && initializedRef.current) {
      loadPreferences().then(res => {
        if (res && (res.isConfigured || !isLiveMode)) {
          loadStatistics(period, targetDate, res.parsed, true);
        }
      });
    }
  }, [connectionStatus, loadPreferences, loadStatistics, period, targetDate, isLiveMode]);

  // Period / Date Shift Fetch
  useEffect(() => {
    if (resolvedIds && initializedRef.current) {
      loadStatistics(period, targetDate, resolvedIds, false);
    }
  }, [period, targetDate, customRange, loadStatistics, resolvedIds]);

  // Background Auto-Refresh
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) return;
    const interval = setInterval(() => {
      if (resolvedIds && isPeriodAtLimit(period, targetDate)) {
        loadStatistics(period, targetDate, resolvedIds, true);
      }
    }, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefreshIntervalMs, resolvedIds, period, targetDate, loadStatistics]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    const res = await loadPreferences();
    if (res && (res.isConfigured || !isLiveMode)) {
      await loadStatistics(period, targetDate, res.parsed, false);
    }
    setIsLoading(false);
  }, [loadPreferences, loadStatistics, period, targetDate, isLiveMode]);

  // Time Range & Display Label
  const timeRange = useMemo(() => {
    return computePeriodTimeRange(period, targetDate, customRange?.start, customRange?.end);
  }, [period, targetDate, customRange]);

  // Compute Days in Period for Standing Charges
  const daysInPeriod = useMemo(() => {
    const s = new Date(timeRange.start).getTime();
    const e = new Date(timeRange.end).getTime();
    return Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)));
  }, [timeRange]);

  // Compute Active Transformed Energy Model
  const model: TransformedEnergyModel = useMemo(() => {
    return transformEnergyStatistics(
      preferences || EMPTY_ENERGY_PREFERENCES,
      statsData,
      metadata,
      solarForecasts,
      {
        currencySymbol: haCurrency,
        periodType: timeRange.periodType,
        daysInPeriod,
        states
      }
    );
  }, [preferences, statsData, metadata, solarForecasts, haCurrency, timeRange.periodType, daysInPeriod, states]);

  // Real-time instantaneous telemetry from active states
  const realtime: InstantaneousPowerTelemetry = useMemo(() => {
    return computeInstantaneousPower(states, preferences);
  }, [states, preferences]);

  return {
    period,
    setPeriod,
    targetDate,
    setTargetDate,
    shiftPeriod,
    isAtFutureLimit,
    dateLabel: timeRange.displayLabel,
    customRange,
    setCustomRange,

    loadState,
    isLoading,
    isFetchingStats,
    error,
    refresh: handleRefresh,
    isLive: isLiveMode && connectionStatus === 'connected',
    preferences,
    resolvedEntityIds: resolvedIds,
    currency: haCurrency,

    model,
    realtime,

    totals: model.totals,
    financials: model.financials,
    buckets: model.buckets,
    devices: model.devices,
    untrackedKwh: model.untrackedKwh,
    untrackedPercentage: model.untrackedPercentage,
    hasSolar: model.hasSolar,
    hasGrid: model.hasGrid,
    hasBattery: model.hasBattery,
    hasGas: model.hasGas,
    hasWater: model.hasWater,
    hasDevices: model.hasDevices
  };
}
