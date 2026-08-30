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
    autoRefreshIntervalMs = 60000,
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
  const preferencesRef = useRef<EnergyPreferences | null>(null);
  const fetchLockRef = useRef(false);

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

  // Ingest Energy Preferences
  const loadPreferences = useCallback(async (): Promise<{
    prefs: EnergyPreferences;
    parsed: ExtractedEnergyStatisticIds;
    isConfigured: boolean;
  } | null> => {
    try {
      const prefs = await fetchHAEnergyPreferences();
      const isConfigured = isEnergyConfigured(prefs);
      const parsed = extractEnergyStatisticIds(prefs);

      resolvedIdsRef.current = parsed;
      preferencesRef.current = prefs;

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

  // Fetch Statistics for specific period and date window
  const loadStatisticsData = useCallback(async (
    targetPeriod: EnergyHistoryPeriod,
    refDate: Date,
    explicitIds?: ExtractedEnergyStatisticIds,
    bypassCache = false
  ) => {
    const activeResolved = explicitIds || resolvedIdsRef.current;
    if (!activeResolved || activeResolved.allStatisticIds.length === 0) {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsFetchingStats(false);
      }
      return;
    }

    if (fetchLockRef.current) return;
    fetchLockRef.current = true;

    if (isMountedRef.current) {
      setIsFetchingStats(true);
    }

    try {
      // 1. Fetch statistics for target period (cached & deduplicated)
      const stats = await fetchHAEnergyStatistics(
        undefined,
        activeResolved.allStatisticIds,
        targetPeriod,
        refDate,
        customRange?.start,
        customRange?.end,
        bypassCache
      );

      // 2. Fetch metadata (cached in memory after first request)
      const meta = await fetchHAStatisticsMetadata(undefined, activeResolved.allStatisticIds);

      // 3. Fetch solar forecast if solar configured (cached for 15m)
      let forecast: SolarForecastResponse | null = null;
      if (activeResolved.solarSources.length > 0) {
        forecast = await fetchHAEnergySolarForecasts(undefined);
      }

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
      if (isMountedRef.current) {
        setError(err.message || `Failed to fetch statistics for ${targetPeriod}`);
        setLoadState('error');
      }
    } finally {
      fetchLockRef.current = false;
      if (isMountedRef.current) {
        setIsFetchingStats(false);
        setIsLoading(false);
      }
    }
  }, [customRange]);

  // Master initial load and reload trigger
  const executeFullFetch = useCallback(async (bypassCache = false) => {
    setIsLoading(true);
    const prefResult = await loadPreferences();
    if (prefResult) {
      if (prefResult.isConfigured || !isLiveMode) {
        await loadStatisticsData(period, targetDate, prefResult.parsed, bypassCache);
      } else {
        setIsLoading(false);
        setIsFetchingStats(false);
      }
    }
  }, [isLiveMode, loadPreferences, loadStatisticsData, period, targetDate]);

  // Initial mount load
  useEffect(() => {
    executeFullFetch(false);
  }, [isLiveMode, connectionStatus]); // only on mount or connection change

  // Window or Period change load
  useEffect(() => {
    if (resolvedIdsRef.current && (isEnergyConfigured(preferencesRef.current) || !isLiveMode)) {
      loadStatisticsData(period, targetDate, resolvedIdsRef.current, false);
    }
  }, [period, targetDate, customRange, loadStatisticsData, isLiveMode]);

  // Background Auto-Refresh (only refreshes if looking at current period and tab is active)
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) return;
    const interval = setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        resolvedIdsRef.current &&
        isPeriodAtLimit(period, targetDate) &&
        (isEnergyConfigured(preferencesRef.current) || !isLiveMode)
      ) {
        loadStatisticsData(period, targetDate, resolvedIdsRef.current, true);
      }
    }, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefreshIntervalMs, period, targetDate, loadStatisticsData, isLiveMode]);

  const handleRefresh = useCallback(async () => {
    await executeFullFetch(true);
  }, [executeFullFetch]);

  // Time Range & Display Label
  const timeRange = useMemo(() => {
    return computePeriodTimeRange(period, targetDate, customRange?.start, customRange?.end);
  }, [period, targetDate, customRange]);

  // Days in Period for Standing Charges
  const daysInPeriod = useMemo(() => {
    const s = new Date(timeRange.start).getTime();
    const e = new Date(timeRange.end).getTime();
    return Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)));
  }, [timeRange]);

  // Transform Active Energy Domain Model
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

  // Instantaneous power telemetry from active entities
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
