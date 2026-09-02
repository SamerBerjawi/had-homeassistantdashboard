/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import {
  SpeedTestMetrics,
  SpeedTestTimeseriesPoint,
  NetworkTimeRange
} from '../types/network';
import { fetchSpeedTestStatistics } from '../services/haSpeedTestStatistics';

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function findEntity(
  states: Record<string, any>,
  domain: string,
  patterns: string[]
): any | undefined {
  return Object.values(states).find((entity) => {
    if (!entity || !entity.entity_id || typeof entity.entity_id !== 'string') return false;
    if (!entity.entity_id.toLowerCase().startsWith(`${domain.toLowerCase()}.`)) return false;

    const id = entity.entity_id.toLowerCase();
    const name = (entity.attributes?.friendly_name || '').toLowerCase();

    return patterns.some((p) => {
      const lowerP = p.toLowerCase();
      return id.includes(lowerP) || name.includes(lowerP);
    });
  });
}

function getTimeRangeConfig(range: NetworkTimeRange): { count: number; totalHours: number } {
  switch (range) {
    case '24H':
    case '1D':
      return { count: 24, totalHours: 24 };
    case '7D':
    case '1W':
      return { count: 7, totalHours: 24 * 7 };
    case '30D':
    case '1M':
      return { count: 30, totalHours: 24 * 30 };
    case '90D':
    case '3M':
    default:
      return { count: 90, totalHours: 24 * 90 };
  }
}

function generateFallbackHistory(
  range: NetworkTimeRange,
  baseDown: number,
  baseUp: number,
  basePing: number,
  baseJitter: number
): SpeedTestTimeseriesPoint[] {
  const { count, totalHours } = getTimeRangeConfig(range);
  const points: SpeedTestTimeseriesPoint[] = [];
  const intervalMs = (totalHours * 3600 * 1000) / Math.max(1, count - 1);
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const progress = (count - 1 - i) / count;
    const wave1 = Math.sin(progress * Math.PI * 4);
    const wave2 = Math.cos(progress * Math.PI * 5);

    const down = Math.max(0, Math.round((baseDown + wave1 * Math.min(20, baseDown * 0.05)) * 10) / 10);
    const up = Math.max(0, Math.round((baseUp + wave2 * Math.min(10, baseUp * 0.05)) * 10) / 10);
    const ping = Math.max(1, Math.round((basePing - wave1 * Math.min(2, basePing * 0.1)) * 10) / 10);
    const jitter = Math.max(0.1, Math.round((baseJitter + wave2 * Math.min(0.5, baseJitter * 0.1)) * 10) / 10);

    points.push({
      date: t,
      downloadMbps: down,
      uploadMbps: up,
      pingMs: ping,
      jitterMs: jitter
    });
  }

  return points;
}

export function useSpeedTestData() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const [timeRange, setTimeRange] = useState<NetworkTimeRange>('1D');
  const [historyData, setHistoryData] = useState<SpeedTestTimeseriesPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testProgress, setTestProgress] = useState<number>(0);

  const metrics: SpeedTestMetrics = useMemo(() => {
    // 1. Download Speed
    const downEntity =
      rawStates['sensor.ookla_speedtest_download'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_download', 'speedtest_download', 'speedtest_download_speed']);
    const downloadSpeedMbps = downEntity?.state !== undefined && downEntity.state !== 'unavailable' && downEntity.state !== 'unknown'
      ? parseNum(downEntity.state, 0)
      : (isLiveMode ? 0 : 842.5);

    // 2. Upload Speed
    const upEntity =
      rawStates['sensor.ookla_speedtest_upload'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_upload', 'speedtest_upload', 'speedtest_upload_speed']);
    const uploadSpeedMbps = upEntity?.state !== undefined && upEntity.state !== 'unavailable' && upEntity.state !== 'unknown'
      ? parseNum(upEntity.state, 0)
      : (isLiveMode ? 0 : 486.2);

    // 3. Plan Compliance
    const downPctEntity =
      rawStates['sensor.ookla_speedtest_download_percent'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_download_percent', 'download_plan_compliance', 'download_percent']);
    const downloadPlanCompliancePercent = downPctEntity?.state !== undefined && downPctEntity.state !== 'unavailable' && downPctEntity.state !== 'unknown'
      ? parseNum(downPctEntity.state, 0)
      : (downEntity?.attributes?.download_percent ? parseNum(downEntity.attributes.download_percent, 0) : (isLiveMode ? 0 : 94.8));

    const upPctEntity =
      rawStates['sensor.ookla_speedtest_upload_percent'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_upload_percent', 'upload_plan_compliance', 'upload_percent']);
    const uploadPlanCompliancePercent = upPctEntity?.state !== undefined && upPctEntity.state !== 'unavailable' && upPctEntity.state !== 'unknown'
      ? parseNum(upPctEntity.state, 0)
      : (upEntity?.attributes?.upload_percent ? parseNum(upEntity.attributes.upload_percent, 0) : (isLiveMode ? 0 : 97.2));

    // 4. Latency / Ping
    const pingEntity =
      rawStates['sensor.ookla_speedtest_ping'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_ping', 'speedtest_ping', 'speedtest_latency']);
    const pingMs = pingEntity?.state !== undefined && pingEntity.state !== 'unavailable' && pingEntity.state !== 'unknown'
      ? parseNum(pingEntity.state, 0)
      : (isLiveMode ? 0 : 8.4);

    const pingMinEntity =
      rawStates['sensor.ookla_speedtest_ping_min'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_ping_min', 'speedtest_ping_min', 'ping_min']);
    const pingMinMs = pingMinEntity?.state !== undefined && pingMinEntity.state !== 'unavailable' && pingMinEntity.state !== 'unknown'
      ? parseNum(pingMinEntity.state, 0)
      : (pingEntity?.attributes?.ping_min ? parseNum(pingEntity.attributes.ping_min, 0) : (isLiveMode ? Math.max(1, pingMs * 0.75) : 6.1));

    const pingMaxEntity =
      rawStates['sensor.ookla_speedtest_ping_max'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_ping_max', 'speedtest_ping_max', 'ping_max']);
    const pingMaxMs = pingMaxEntity?.state !== undefined && pingMaxEntity.state !== 'unavailable' && pingMaxEntity.state !== 'unknown'
      ? parseNum(pingMaxEntity.state, 0)
      : (pingEntity?.attributes?.ping_max ? parseNum(pingEntity.attributes.ping_max, 0) : (isLiveMode ? Math.max(pingMs * 1.5, pingMs + 3) : 14.2));

    // 5. Jitter
    const jitterEntity =
      rawStates['sensor.ookla_speedtest_jitter'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_jitter', 'speedtest_jitter']);
    const jitterMs = jitterEntity?.state !== undefined && jitterEntity.state !== 'unavailable' && jitterEntity.state !== 'unknown'
      ? parseNum(jitterEntity.state, 0)
      : (isLiveMode ? 0 : 1.8);

    const downJitterEntity =
      rawStates['sensor.ookla_speedtest_jitter_during_download'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_jitter_during_download', 'jitter_during_download', 'download_jitter']);
    const downloadJitterMs = downJitterEntity?.state !== undefined && downJitterEntity.state !== 'unavailable' && downJitterEntity.state !== 'unknown'
      ? parseNum(downJitterEntity.state, 0)
      : (downEntity?.attributes?.jitter ? parseNum(downEntity.attributes.jitter, 0) : (isLiveMode ? Math.max(0.5, jitterMs * 1.4) : 3.2));

    const upJitterEntity =
      rawStates['sensor.ookla_speedtest_jitter_during_upload'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_jitter_during_upload', 'jitter_during_upload', 'upload_jitter']);
    const uploadJitterMs = upJitterEntity?.state !== undefined && upJitterEntity.state !== 'unavailable' && upJitterEntity.state !== 'unknown'
      ? parseNum(upJitterEntity.state, 0)
      : (upEntity?.attributes?.jitter ? parseNum(upEntity.attributes.jitter, 0) : (isLiveMode ? Math.max(0.5, jitterMs * 1.8) : 4.1));

    // 6. Diagnostics & Metadata
    const gradeEntity =
      rawStates['sensor.ookla_speedtest_bufferbloat_grade'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_bufferbloat_grade', 'bufferbloat_grade', 'bufferbloat']);
    const rawGrade = (gradeEntity?.state && gradeEntity.state !== 'unknown' && gradeEntity.state !== 'unavailable')
      ? String(gradeEntity.state).trim().toUpperCase()
      : (downEntity?.attributes?.bufferbloat_grade ? String(downEntity.attributes.bufferbloat_grade).trim().toUpperCase() : (isLiveMode ? 'A' : 'A'));
    const bufferbloatGrade = rawGrade || 'A';

    const ispEntity =
      rawStates['sensor.ookla_speedtest_isp'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_isp', 'speedtest_isp']);
    const isp = (ispEntity?.state && ispEntity.state !== 'unknown' && ispEntity.state !== 'unavailable')
      ? String(ispEntity.state)
      : (downEntity?.attributes?.isp || downEntity?.attributes?.client?.isp || (isLiveMode ? 'Connected ISP Gateway' : 'Ogero Telecom / Fiber One'));

    const serverEntity =
      rawStates['sensor.ookla_speedtest_server'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_server', 'speedtest_server']);
    const server = (serverEntity?.state && serverEntity.state !== 'unknown' && serverEntity.state !== 'unavailable')
      ? String(serverEntity.state)
      : (downEntity?.attributes?.server_name || downEntity?.attributes?.server || (isLiveMode ? 'Optimal Ookla Server' : 'Beirut - IDM Network (ID: 4122)'));

    const lastTestEntity =
      rawStates['sensor.ookla_speedtest_last_test'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_last_test', 'speedtest_last_test', 'speedtest_time']);
    const lastTest = (lastTestEntity?.state && lastTestEntity.state !== 'unknown' && lastTestEntity.state !== 'unavailable')
      ? String(lastTestEntity.state)
      : (downEntity?.attributes?.last_test || (downEntity?.last_updated ? new Date(downEntity.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isLiveMode ? 'Recently' : '14 minutes ago')));

    const resultUrlEntity =
      rawStates['sensor.ookla_speedtest_result_url'] ||
      findEntity(rawStates, 'sensor', ['ookla_speedtest_result_url', 'speedtest_result_url', 'speedtest_url']);
    const resultUrl = (resultUrlEntity?.state && resultUrlEntity.state !== 'unknown' && resultUrlEntity.state !== 'unavailable')
      ? String(resultUrlEntity.state)
      : (downEntity?.attributes?.result_url || downEntity?.attributes?.url || (isLiveMode ? '' : 'https://www.speedtest.net/result/16281920194'));

    // 7. Start button
    const startBtn =
      rawStates['button.ookla_speedtest_start'] ||
      rawStates['button.speedtest_start'] ||
      rawStates['button.start_speedtest'] ||
      findEntity(rawStates, 'button', ['ookla_speedtest_start', 'speedtest_start', 'start_speedtest', 'speedtest']);

    return {
      downloadSpeedMbps,
      uploadSpeedMbps,
      downloadPlanCompliancePercent,
      uploadPlanCompliancePercent,
      pingMs,
      pingMinMs,
      pingMaxMs,
      jitterMs,
      downloadJitterMs,
      uploadJitterMs,
      bufferbloatGrade,
      isp,
      server,
      lastTest,
      resultUrl,
      startButtonEntityId: startBtn?.entity_id
    };
  }, [rawStates, isLiveMode]);

  // Load history from Home Assistant recorder or fallback
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      if (isLiveMode) {
        const liveStats = await fetchSpeedTestStatistics(timeRange);
        if (liveStats && liveStats.length > 0) {
          setHistoryData(liveStats);
          setIsLoadingHistory(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    const fallback = generateFallbackHistory(
      timeRange,
      metrics.downloadSpeedMbps,
      metrics.uploadSpeedMbps,
      metrics.pingMs,
      metrics.jitterMs
    );
    setHistoryData(fallback);
    setIsLoadingHistory(false);
  }, [timeRange, metrics.downloadSpeedMbps, metrics.uploadSpeedMbps, metrics.pingMs, metrics.jitterMs, isLiveMode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Run speed test action: calls ookla_speedtest.run_speedtest service
  const runSpeedTest = async () => {
    if (isRunningTest) return;
    setIsRunningTest(true);
    setTestProgress(15);

    const progressInterval = setInterval(() => {
      setTestProgress((prev) => {
        if (prev >= 88) return prev;
        return prev + Math.floor(Math.random() * 12) + 4;
      });
    }, 400);

    try {
      // Primary Action: call ookla_speedtest.run_speedtest service
      await callHAService('ookla_speedtest', 'run_speedtest', {});
    } catch (err) {
      console.warn('[SpeedTest] ookla_speedtest.run_speedtest failed, attempting button/update fallback', err);
      try {
        if (metrics.startButtonEntityId) {
          await callHAService('button', 'press', {}, { entity_id: metrics.startButtonEntityId });
        } else {
          await callHAService('homeassistant', 'update_entity', {}, {
            entity_id: 'sensor.ookla_speedtest_download'
          });
        }
      } catch {
        // ignore
      }
    } finally {
      setTimeout(() => {
        clearInterval(progressInterval);
        setTestProgress(100);
        setTimeout(() => {
          setIsRunningTest(false);
          setTestProgress(0);
          fetchHistory();
        }, 600);
      }, 3200);
    }
  };

  return {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    isRunningTest,
    testProgress,
    runSpeedTest,
    isLiveMode
  };
}
