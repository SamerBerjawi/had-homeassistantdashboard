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

const EMPTY_MODEL = transformEnergyStatistics(
  EMPTY_ENERGY_PREFERENCES,
  {},
  {},
  null,
  { currencySymbol: '€', periodType: 'hour', daysInPeriod: 1, states: {} }
);

export function useEnergyData(options: UseEnergyDataOptions = {}): UseEnergyDataResult {
  const {
    autoRefreshIntervalMs = 60000,
    initialPeriod = 'day'
  } = options;

  const states = useAutoLayoutStore(useShallow((s) => s.states));
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);
  const connectionStatus = useAutoLayoutStore((s) => s.connectionStatus);

  const [period, setPeriodState] = useState<EnergyHistoryPeriod>(initialPeriod);
  const [targetDate, setTargetDate] = useState<Date>(() => new Date());
  const [customRange, setCustomRangeState] = useState<{ start: Date; end: Date } | null>(null);

  const [loadState, setLoadState] = useState<EnergyLoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<EnergyPreferences | null>(null);
  const [resolvedIds, setResolvedIds] = useState<ExtractedEnergyStatisticIds | null>(null);
  const [model, setModel] = useState<TransformedEnergyModel>(EMPTY_MODEL);
  const [haCurrency, setHaCurrency] = useState<string>('€');
  const [reloadNonce, setReloadNonce] = useState(0);

  // Period change resets target date to today
  const setPeriod = useCallback((newPeriod: EnergyHistoryPeriod) => {
    setPeriodState(newPeriod);
    setTargetDate(new Date());
  }, []);

  // Step backward / forward
  const shiftPeriod = useCallback((direction: -1 | 1) => {
    setTargetDate((prev) => shiftReferenceDate(period, prev, direction));
  }, [period]);

  const isAtFutureLimit = useMemo(() => {
    return isPeriodAtLimit(period, targetDate);
  }, [period, targetDate]);

  const setCustomRange = useCallback((start: Date, end: Date) => {
    setCustomRangeState({ start, end });
    setPeriodState('custom');
  }, []);

  // Time range calculation
  const timeRange = useMemo(() => {
    return computePeriodTimeRange(period, targetDate, customRange?.start, customRange?.end);
  }, [period, targetDate, customRange]);

  const daysInPeriod = useMemo(() => {
    const s = new Date(timeRange.start).getTime();
    const e = new Date(timeRange.end).getTime();
    return Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)));
  }, [timeRange]);

  // Fetch Home Assistant currency from get_config
  useEffect(() => {
    if (isLiveMode && connectionStatus === 'connected' && haWebSocketService && !haWebSocketService.isDemo()) {
      haWebSocketService
        .sendRequest<any>('get_config')
        .then((cfg) => {
          if (cfg?.currency) setHaCurrency(cfg.currency);
        })
        .catch(() => {});
    }
  }, [isLiveMode, connectionStatus]);

  // -------------------------------------------------------------
  // Clean, Single-Pass Data Loading (Mirrors HAPulse fast architecture)
  // -------------------------------------------------------------
  useEffect(() => {
    // If live mode but socket not connected yet, wait in loading state
    if (isLiveMode && connectionStatus !== 'connected') {
      setLoadState('loading');
      return;
    }

    let cancelled = false;
    setLoadState('loading');
    setError(null);

    (async () => {
      try {
        // 1. Fetch Preferences (energy/get_prefs)
        const loadedPrefs = await fetchHAEnergyPreferences();
        if (cancelled) return;

        // 2. Immediate unconfigured check
        if (isLiveMode && !isEnergyConfigured(loadedPrefs)) {
          setPreferences(loadedPrefs);
          setResolvedIds(null);
          setModel(EMPTY_MODEL);
          setLoadState('unconfigured');
          return;
        }

        const parsed = extractEnergyStatisticIds(loadedPrefs);
        setPreferences(loadedPrefs);
        setResolvedIds(parsed);

        if (parsed.allStatisticIds.length === 0) {
          setModel(EMPTY_MODEL);
          setLoadState(isLiveMode ? 'unconfigured' : 'ready');
          return;
        }

        // 3. Parallel fetch of Statistics, Metadata, and Solar Forecast
        const [stats, meta, forecast] = await Promise.all([
          fetchHAEnergyStatistics(
            undefined,
            parsed.allStatisticIds,
            period,
            targetDate,
            customRange?.start,
            customRange?.end
          ),
          fetchHAStatisticsMetadata(undefined, parsed.allStatisticIds),
          parsed.solarSources.length > 0
            ? fetchHAEnergySolarForecasts(undefined)
            : Promise.resolve(null)
        ]);

        if (cancelled) return;

        // 4. Synchronous Snapshot Transformation
        const currentStates = useAutoLayoutStore.getState().states || {};
        const computed = transformEnergyStatistics(
          loadedPrefs,
          stats,
          meta,
          forecast,
          {
            currencySymbol: haCurrency,
            periodType: timeRange.periodType,
            daysInPeriod,
            states: currentStates
          }
        );

        setModel(computed);
        setLoadState('ready');
      } catch (err: any) {
        if (cancelled) return;
        console.warn('[useEnergyData] Failed to load energy dashboard:', err);
        setError(err.message || 'Failed to load energy statistics');
        setLoadState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isLiveMode,
    connectionStatus,
    period,
    targetDate,
    customRange,
    haCurrency,
    daysInPeriod,
    timeRange.periodType,
    reloadNonce
  ]);

  // Background Auto-Refresh (only when looking at current period and tab is active)
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isPeriodAtLimit(period, targetDate)) {
        setReloadNonce((n) => n + 1);
      }
    }, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefreshIntervalMs, period, targetDate]);

  const handleRefresh = useCallback(async () => {
    setReloadNonce((n) => n + 1);
  }, []);

  // Decoupled Real-Time Instantaneous Power Telemetry (Zero recorder queries)
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
    isLoading: loadState === 'loading',
    isFetchingStats: loadState === 'loading',
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
