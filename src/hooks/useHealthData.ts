/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Health & Vitals Data Hook
 * Coordinates device discovery, live Home Assistant states, WebSocket recorder
 * statistics fetching, and metric summaries for the Health View.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import {
  HealthTimeRange,
  HealthCategory,
  HealthMetricKey,
  HealthMetricSummary,
  DiscoveredHealthDevice,
  HEALTH_METRIC_DEFINITIONS,
} from '../types/health';
import {
  discoverHealthDevices,
  resolveHealthSensorsForDevice,
} from '../services/healthDiscovery';
import {
  fetchHealthStatistics,
  buildMetricSummary,
  generateDemoTimeseries,
} from '../services/haHealthStatistics';

export function useHealthData() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const states = useAutoLayoutStore((s) => s.states);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  // Combine or fallback to states
  const currentStates = useMemo(() => {
    return Object.keys(rawStates || {}).length > 0 ? rawStates : states || {};
  }, [rawStates, states]);

  // Discover devices with Apple Health sensors
  const discoveredDevices = useMemo(() => {
    return discoverHealthDevices(currentStates);
  }, [currentStates]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<HealthTimeRange>('today');
  const [activeCategory, setActiveCategory] = useState<'all' | HealthCategory>('all');
  const [isPreviewDemo, setIsPreviewDemo] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyMap, setHistoryMap] = useState<Record<string, any>>({});

  // Auto-select primary device when devices change
  useEffect(() => {
    if (discoveredDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(discoveredDevices[0].deviceId);
    }
  }, [discoveredDevices, selectedDeviceId]);

  // Resolve sensors for active device
  const { activeDevice, metricsMap, totalFound } = useMemo(() => {
    return resolveHealthSensorsForDevice(currentStates, selectedDeviceId);
  }, [currentStates, selectedDeviceId]);

  // Fetch or generate history when device, timeRange, or demo mode changes
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const entityMap = activeDevice?.matchedMetrics || {};
      const stats = await fetchHealthStatistics(
        timeRange,
        entityMap,
        isLiveMode && !isPreviewDemo && totalFound > 0
      );
      setHistoryMap(stats);
    } catch (err) {
      console.warn('[useHealthData] Error loading statistics:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [activeDevice, timeRange, isLiveMode, isPreviewDemo, totalFound]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Build structured summaries for all health metric keys
  const summaries = useMemo(() => {
    const map = {} as Record<HealthMetricKey, HealthMetricSummary>;

    for (const [keyStr] of Object.entries(HEALTH_METRIC_DEFINITIONS)) {
      const key = keyStr as HealthMetricKey;
      const stateObj = metricsMap[key];
      const history = historyMap[key] || generateDemoTimeseries(key, timeRange);
      map[key] = buildMetricSummary(key, stateObj, history);
    }

    return map;
  }, [metricsMap, historyMap, timeRange]);

  // Compute Apple Watch activity rings data (Move, Exercise, Stand/Steps)
  const activityRingsData = useMemo(() => {
    const moveSummary = summaries['activeEnergy'];
    const exerciseSummary = summaries['exerciseTime'];
    const stepsSummary = summaries['healthSteps'];

    const moveVal = moveSummary?.currentValue ?? (moveSummary?.totalSum || 380);
    const exerciseVal = exerciseSummary?.currentValue ?? (exerciseSummary?.totalSum || 24);
    const stepsVal = stepsSummary?.currentValue ?? (stepsSummary?.totalSum || 6840);

    return {
      move: {
        current: Math.round(moveVal),
        goal: 500,
        unit: 'kcal',
      },
      exercise: {
        current: Math.round(exerciseVal),
        goal: 30,
        unit: 'min',
      },
      steps: {
        current: Math.round(stepsVal),
        goal: 10000,
        unit: 'steps',
      },
    };
  }, [summaries]);

  return {
    devices: discoveredDevices,
    activeDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    timeRange,
    setTimeRange,
    activeCategory,
    setActiveCategory,
    summaries,
    activityRingsData,
    isLoadingHistory,
    totalSensorsFound: totalFound,
    isPreviewDemo,
    setIsPreviewDemo,
    refreshHistory: loadHistory,
  };
}
