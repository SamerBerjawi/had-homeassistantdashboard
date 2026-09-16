/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook for managing Year-over-Year Energy Comparison in Power Sources & Instantaneous Flow.
 * Fetches and transforms historical recorder statistics for the corresponding period in previous years.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import {
  EnergyHistoryPeriod,
  computePeriodTimeRange,
  fetchHAEnergyStatistics,
  fetchHAStatisticsMetadata
} from '../services/haEnergyStatistics';
import {
  EnergyPreferences,
  ExtractedEnergyStatisticIds,
  EMPTY_ENERGY_PREFERENCES
} from '../services/haEnergyPreferences';
import {
  transformEnergyStatistics,
  TransformedEnergyBucket,
  TransformedEnergyTotals
} from '../services/energyDataTransformer';

export interface UseEnergyComparisonOptions {
  period: EnergyHistoryPeriod;
  targetDate: Date;
  customRange?: { start: Date; end: Date } | null;
  resolvedEntityIds?: ExtractedEnergyStatisticIds | null;
  preferences?: EnergyPreferences | null;
  currency?: string;
  defaultEnabled?: boolean;
}

export interface UseEnergyComparisonResult {
  isCompareEnabled: boolean;
  setIsCompareEnabled: (enabled: boolean) => void;
  toggleCompare: () => void;
  compareYear: number;
  setCompareYear: (year: number) => void;
  availableYears: number[];
  currentYear: number;
  compareBuckets: TransformedEnergyBucket[];
  compareTotals: TransformedEnergyTotals | null;
  isLoadingCompare: boolean;
  compareError: string | null;
}

export function useEnergyComparison(options: UseEnergyComparisonOptions): UseEnergyComparisonResult {
  const {
    period,
    targetDate,
    customRange,
    resolvedEntityIds,
    preferences,
    currency = '€',
    defaultEnabled = false
  } = options;

  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);
  const connectionStatus = useAutoLayoutStore((s) => s.connectionStatus);

  const [isCompareEnabled, setIsCompareEnabled] = useState(defaultEnabled);

  // Active view year
  const currentYear = useMemo(() => {
    if (period === 'custom' && customRange) {
      return customRange.start.getFullYear();
    }
    return targetDate.getFullYear();
  }, [period, targetDate, customRange]);

  // List of available comparison years prior to the currently viewed year (up to 5 years)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 1; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Selected comparison year (defaults to previous year)
  const [selectedCompareYear, setSelectedCompareYear] = useState<number>(() => currentYear - 1);

  // Automatically keep selectedCompareYear valid when currentYear shifts
  useEffect(() => {
    setSelectedCompareYear((prev) => {
      if (availableYears.includes(prev)) return prev;
      return availableYears[0] ?? currentYear - 1;
    });
  }, [currentYear, availableYears]);

  const toggleCompare = useCallback(() => {
    setIsCompareEnabled((prev) => !prev);
  }, []);

  const [compareBuckets, setCompareBuckets] = useState<TransformedEnergyBucket[]>([]);
  const [compareTotals, setCompareTotals] = useState<TransformedEnergyTotals | null>(null);
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Compute historical comparison date range aligned to the selected comparison year
  const comparisonRange = useMemo(() => {
    const yearDelta = selectedCompareYear - currentYear;

    if (period === 'custom' && customRange) {
      const start = new Date(customRange.start);
      start.setFullYear(start.getFullYear() + yearDelta);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customRange.end);
      end.setFullYear(end.getFullYear() + yearDelta);
      end.setHours(23, 59, 59, 999);

      const durationDays = (end.getTime() - start.getTime()) / (24 * 3600 * 1000);
      let periodType: '5minute' | 'hour' | 'day' | 'month' = 'day';
      if (durationDays <= 1.2) {
        periodType = '5minute';
      } else if (durationDays <= 3) {
        periodType = 'hour';
      } else if (durationDays > 35) {
        periodType = 'month';
      }

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        periodType,
        startTimeMs: start.getTime(),
        endTimeMs: end.getTime()
      };
    }

    if (period === 'day' || period === 'today' || period === 'yesterday') {
      const compDate = new Date(targetDate);
      compDate.setFullYear(compDate.getFullYear() + yearDelta);
      const start = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate(), 0, 0, 0, 0);
      const end = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate(), 23, 59, 59, 999);

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        periodType: 'hour' as const,
        startTimeMs: start.getTime(),
        endTimeMs: end.getTime()
      };
    }

    if (period === 'week' || period === '7d') {
      // Align on exact weekdays (shift by 52 calendar weeks * |yearDelta|)
      const currentWeekRange = computePeriodTimeRange('week', targetDate);
      const curStart = new Date(currentWeekRange.start);
      const curEnd = new Date(currentWeekRange.end);

      const weeksShift = 52 * Math.abs(yearDelta) * (yearDelta < 0 ? -1 : 1);
      const start = new Date(curStart.getTime() + weeksShift * 7 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 6 * 24 * 3600 * 1000 + (23 * 3600 + 59 * 60 + 59) * 1000 + 999);

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        periodType: 'day' as const,
        startTimeMs: start.getTime(),
        endTimeMs: end.getTime()
      };
    }

    if (period === 'month') {
      const compDate = new Date(targetDate);
      compDate.setFullYear(compDate.getFullYear() + yearDelta);
      const start = new Date(compDate.getFullYear(), compDate.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0, 23, 59, 59, 999);

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        periodType: 'day' as const,
        startTimeMs: start.getTime(),
        endTimeMs: end.getTime()
      };
    }

    if (period === 'year') {
      const start = new Date(selectedCompareYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(selectedCompareYear, 11, 31, 23, 59, 59, 999);

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        periodType: 'month' as const,
        startTimeMs: start.getTime(),
        endTimeMs: end.getTime()
      };
    }

    // Default fallback: single day
    const compDate = new Date(targetDate);
    compDate.setFullYear(compDate.getFullYear() + yearDelta);
    const start = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate(), 0, 0, 0, 0);
    const end = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate(), 23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      periodType: 'hour' as const,
      startTimeMs: start.getTime(),
      endTimeMs: end.getTime()
    };
  }, [period, targetDate, customRange, selectedCompareYear, currentYear]);

  // Fetch comparison statistics when compare mode is enabled
  useEffect(() => {
    if (!isCompareEnabled) {
      setCompareBuckets([]);
      setCompareTotals(null);
      setIsLoadingCompare(false);
      setCompareError(null);
      return;
    }

    if (isLiveMode && connectionStatus !== 'connected') {
      setIsLoadingCompare(true);
      return;
    }

    const cleanIds = resolvedEntityIds?.allStatisticIds || [];
    if (cleanIds.length === 0) {
      setCompareBuckets([]);
      setCompareTotals(null);
      setIsLoadingCompare(false);
      return;
    }

    let cancelled = false;
    setIsLoadingCompare(true);
    setCompareError(null);

    (async () => {
      try {
        const customStart = new Date(comparisonRange.start);
        const customEnd = new Date(comparisonRange.end);
        const periodType = comparisonRange.periodType;

        // Fetch statistics for historical comparison range
        const [compStats, meta] = await Promise.all([
          fetchHAEnergyStatistics(
            undefined,
            cleanIds,
            'custom',
            customStart,
            customStart,
            customEnd,
            false,
            periodType
          ),
          fetchHAStatisticsMetadata(undefined, cleanIds)
        ]);

        if (cancelled) return;

        const effectivePrefs = preferences || EMPTY_ENERGY_PREFERENCES;
        const daysInPeriod = Math.max(
          1,
          Math.round((comparisonRange.endTimeMs - comparisonRange.startTimeMs) / (24 * 3600 * 1000))
        );

        // Transform into standardized domain model
        const transformed = transformEnergyStatistics(
          effectivePrefs,
          compStats,
          meta,
          null,
          {
            currencySymbol: currency,
            periodType,
            daysInPeriod,
            states: {},
            startTimeMs: comparisonRange.startTimeMs,
            endTimeMs: comparisonRange.endTimeMs
          }
        );

        if (cancelled) return;

        setCompareBuckets(transformed.buckets);
        setCompareTotals(transformed.totals);
        setIsLoadingCompare(false);
      } catch (err: any) {
        if (cancelled) return;
        console.warn('[useEnergyComparison] Failed to load comparison statistics:', err);
        setCompareError(err.message || 'Failed to load comparison data');
        setIsLoadingCompare(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isCompareEnabled,
    isLiveMode,
    connectionStatus,
    comparisonRange,
    resolvedEntityIds,
    preferences,
    currency
  ]);

  return {
    isCompareEnabled,
    setIsCompareEnabled,
    toggleCompare,
    compareYear: selectedCompareYear,
    setCompareYear: setSelectedCompareYear,
    availableYears,
    currentYear,
    compareBuckets,
    compareTotals,
    isLoadingCompare,
    compareError
  };
}
