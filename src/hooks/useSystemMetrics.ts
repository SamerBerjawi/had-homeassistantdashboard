/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { haWebSocketService } from '../services/haWebSocket';

export interface SystemHostMetrics {
  // Processor & Thermal
  cpuUsage: number;
  cpuUsageUnit: string;
  cpuTemp: number;
  cpuTempUnit: string;
  load1m: number;
  load5m: number;
  load15m: number;

  // Memory (RAM)
  memoryUsagePercent: number;
  memoryUsed: number;
  memoryUsedUnit: string;
  memoryFree: number;
  memoryFreeUnit: string;
  memoryTotal: number;
  memoryTotalUnit: string;

  // Storage (Disk)
  diskUsagePercent: number;
  diskUsed: number;
  diskUsedUnit: string;
  diskFree: number;
  diskFreeUnit: string;
  diskTotal: number;
  diskTotalUnit: string;

  // Network (end0)
  ipv4Address: string;
  networkInRate: number;
  networkInUnit: string;
  networkOutRate: number;
  networkOutUnit: string;
  packetsIn: number;
  packetsInUnit: string;
  packetsOut: number;
  packetsOutUnit: string;

  // System
  uptime: string;
}

export interface SystemTimeseriesPoint {
  date: Date;
  cpuUsage: number;
  cpuTemp: number;
  load1m: number;
  load5m: number;
  load15m: number;
  memoryUsage: number;
  diskUsage: number;
  networkInRate: number;
  networkOutRate: number;
  packetsInRate: number;
  packetsOutRate: number;
}

export type HistoryTimeRange = '1h' | '6h' | '24h' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Generate synthetic realistic timeseries history for demo/offline mode
 */
function generateSyntheticHistory(
  hours: number,
  baseCpu: number,
  baseTemp: number,
  baseMem: number,
  baseDisk: number,
  baseLoad1: number,
  baseLoad5: number,
  baseLoad15: number
): SystemTimeseriesPoint[] {
  const points: SystemTimeseriesPoint[] = [];
  const count = hours <= 1 ? 24 : hours <= 6 ? 36 : hours <= 24 ? 48 : 60;
  const intervalMs = (hours * 3600 * 1000) / (count - 1);
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const progress = (count - 1 - i) / count;
    const wave = Math.sin(progress * Math.PI * 4);
    const wave2 = Math.cos(progress * Math.PI * 6);

    const cpu = Math.min(100, Math.max(2, Math.round((baseCpu + wave * 18 + (Math.random() * 4 - 2)) * 10) / 10));
    const temp = Math.min(100, Math.max(30, Math.round((baseTemp + wave * 5 + (Math.random() * 2 - 1)) * 10) / 10));
    const mem = Math.min(100, Math.max(10, Math.round((baseMem + wave2 * 6 + (Math.random() * 2 - 1)) * 10) / 10));
    const disk = Math.min(100, Math.max(5, Math.round((baseDisk + progress * 0.8) * 10) / 10));

    const l1 = Math.max(0.1, Math.round((baseLoad1 + wave * 0.4 + (Math.random() * 0.2 - 0.1)) * 100) / 100);
    const l5 = Math.max(0.1, Math.round((baseLoad5 + wave * 0.25 + (Math.random() * 0.1 - 0.05)) * 100) / 100);
    const l15 = Math.max(0.1, Math.round((baseLoad15 + wave * 0.15) * 100) / 100);

    const netIn = Math.max(0.05, Math.round((Math.abs(wave) * 4.5 + Math.random() * 1.5 + 0.2) * 100) / 100);
    const netOut = Math.max(0.02, Math.round((Math.abs(wave2) * 2.2 + Math.random() * 0.8 + 0.1) * 100) / 100);

    const pktIn = Math.round(netIn * 1200 + Math.random() * 300);
    const pktOut = Math.round(netOut * 900 + Math.random() * 200);

    points.push({
      date: t,
      cpuUsage: cpu,
      cpuTemp: temp,
      load1m: l1,
      load5m: l5,
      load15m: l15,
      memoryUsage: mem,
      diskUsage: disk,
      networkInRate: netIn,
      networkOutRate: netOut,
      packetsInRate: pktIn,
      packetsOutRate: pktOut
    });
  }

  return points;
}

export function useSystemMetrics() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const [timeRange, setTimeRange] = useState<HistoryTimeRange>('24h');
  const [historyData, setHistoryData] = useState<SystemTimeseriesPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // 1. Current Live Metrics Extraction
  const metrics: SystemHostMetrics = useMemo(() => {
    const getEntity = (id: string, fallbackId?: string) => {
      return rawStates[id] || (fallbackId ? rawStates[fallbackId] : undefined);
    };

    const getStateVal = (id: string, fallback = '', fallbackId?: string): string => {
      const ent = getEntity(id, fallbackId);
      if (!ent) return fallback;
      return ent.state ?? fallback;
    };

    const getUnit = (id: string, fallbackUnit = '', fallbackId?: string): string => {
      const ent = getEntity(id, fallbackId);
      return (ent?.attributes?.unit_of_measurement as string) || fallbackUnit;
    };

    // CPU & Thermals
    const cpuUsage = parseNum(
      getStateVal('sensor.system_monitor_processor_use', '10.0', 'sensor.processor_use')
    );
    const cpuUsageUnit = getUnit('sensor.system_monitor_processor_use', '%', 'sensor.processor_use');

    const cpuTemp = parseNum(
      getStateVal('sensor.system_monitor_processor_temperature', '74.0', 'sensor.processor_temperature')
    );
    const cpuTempUnit = getUnit('sensor.system_monitor_processor_temperature', '°C', 'sensor.processor_temperature');

    const load1m = parseNum(
      getStateVal('sensor.system_monitor_load_1_min', '1.09', 'sensor.system_monitor_load_1m')
    );
    const load5m = parseNum(
      getStateVal('sensor.system_monitor_load_5_min', '1.21', 'sensor.system_monitor_load_5m')
    );
    const load15m = parseNum(
      getStateVal('sensor.system_monitor_load_15_min', '1.26', 'sensor.system_monitor_load_15m')
    );

    // Memory
    const memoryUsagePercent = parseNum(
      getStateVal('sensor.system_monitor_memory_usage', '73.4', 'sensor.memory_usage')
    );
    const memoryUsed = parseNum(
      getStateVal('sensor.system_monitor_memory_use', '2779.40', 'sensor.memory_use')
    );
    const memoryUsedUnit = getUnit('sensor.system_monitor_memory_use', 'MiB', 'sensor.memory_use');

    const memoryFree = parseNum(
      getStateVal('sensor.system_monitor_memory_free', '1006.90', 'sensor.memory_free')
    );
    const memoryFreeUnit = getUnit('sensor.system_monitor_memory_free', 'MiB', 'sensor.memory_free');

    const memoryTotal = Math.round((memoryUsed + memoryFree) * 10) / 10;
    const memoryTotalUnit = memoryUsedUnit;

    // Disk
    const diskUsagePercent = parseNum(
      getStateVal('sensor.system_monitor_disk_usage', '20.2', 'sensor.system_monitor_disk_usage_')
    );
    const diskUsed = parseNum(
      getStateVal('sensor.system_monitor_disk_use', '21.20', 'sensor.system_monitor_disk_use_')
    );
    const diskUsedUnit = getUnit('sensor.system_monitor_disk_use', 'GiB', 'sensor.system_monitor_disk_use_');

    const diskFree = parseNum(
      getStateVal('sensor.system_monitor_disk_free', '83.70', 'sensor.system_monitor_disk_free_')
    );
    const diskFreeUnit = getUnit('sensor.system_monitor_disk_free', 'GiB', 'sensor.system_monitor_disk_free_');

    const diskTotal = Math.round((diskUsed + diskFree) * 10) / 10;
    const diskTotalUnit = diskUsedUnit;

    // Network
    const ipv4Address = getStateVal(
      'sensor.system_monitor_ipv4_address_end0',
      '192.168.68.71',
      'sensor.system_monitor_ipv4_address'
    );
    const networkInRate = parseNum(
      getStateVal('sensor.system_monitor_network_in_end0', '13760.5', 'sensor.system_monitor_network_in')
    );
    const networkInUnit = getUnit('sensor.system_monitor_network_in_end0', 'MB/s', 'sensor.system_monitor_network_in');

    const networkOutRate = parseNum(
      getStateVal('sensor.system_monitor_network_out_end0', '19500.8', 'sensor.system_monitor_network_out')
    );
    const networkOutUnit = getUnit('sensor.system_monitor_network_out_end0', 'MB/s', 'sensor.system_monitor_network_out');

    const packetsIn = parseNum(
      getStateVal('sensor.system_monitor_packets_in_end0', '24800000', 'sensor.system_monitor_packets_in')
    );
    const packetsInUnit = getUnit('sensor.system_monitor_packets_in_end0', 'packets/s', 'sensor.system_monitor_packets_in');

    const packetsOut = parseNum(
      getStateVal('sensor.system_monitor_packets_out_end0', '28500000', 'sensor.system_monitor_packets_out')
    );
    const packetsOutUnit = getUnit('sensor.system_monitor_packets_out_end0', 'packets/s', 'sensor.system_monitor_packets_out');

    // System Uptime
    const uptime = getStateVal(
      'sensor.system_monitor_uptime',
      '1 week',
      'sensor.uptime'
    );

    return {
      cpuUsage,
      cpuUsageUnit,
      cpuTemp,
      cpuTempUnit,
      load1m,
      load5m,
      load15m,
      memoryUsagePercent,
      memoryUsed,
      memoryUsedUnit,
      memoryFree,
      memoryFreeUnit,
      memoryTotal,
      memoryTotalUnit,
      diskUsagePercent,
      diskUsed,
      diskUsedUnit,
      diskFree,
      diskFreeUnit,
      diskTotal,
      diskTotalUnit,
      ipv4Address,
      networkInRate,
      networkInUnit,
      networkOutRate,
      networkOutUnit,
      packetsIn,
      packetsInUnit,
      packetsOut,
      packetsOutUnit,
      uptime
    };
  }, [rawStates]);

  // 2. Fetch or Generate Telemetry History
  const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);

    if (!isLiveMode) {
      const mockPoints = generateSyntheticHistory(
        hours,
        metrics.cpuUsage || 10,
        metrics.cpuTemp || 74,
        metrics.memoryUsagePercent || 73.4,
        metrics.diskUsagePercent || 20.2,
        metrics.load1m || 1.09,
        metrics.load5m || 1.21,
        metrics.load15m || 1.26
      );
      setHistoryData(mockPoints);
      setIsLoadingHistory(false);
      return;
    }

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 3600 * 1000).toISOString();

      const entityIds = [
        'sensor.system_monitor_processor_use',
        'sensor.system_monitor_processor_temperature',
        'sensor.system_monitor_load_1_min',
        'sensor.system_monitor_load_1m',
        'sensor.system_monitor_load_5_min',
        'sensor.system_monitor_load_5m',
        'sensor.system_monitor_load_15_min',
        'sensor.system_monitor_load_15m',
        'sensor.system_monitor_memory_usage',
        'sensor.system_monitor_disk_usage',
        'sensor.system_monitor_disk_usage_',
        'sensor.system_monitor_network_in_end0',
        'sensor.system_monitor_network_out_end0',
        'sensor.system_monitor_packets_in_end0',
        'sensor.system_monitor_packets_out_end0'
      ];

      const res = await haWebSocketService.sendRequest<Record<string, Array<{ state: string; last_updated: string; last_changed: string }>>>(
        'history/history_during_period',
        {
          start_time: startTime,
          entity_ids: entityIds,
          minimal_response: true,
          significant_changes_only: false
        }
      ).catch(() => null);

      if (res && typeof res === 'object' && Object.keys(res).length > 0) {
        const bucketCount = hours === 1 ? 24 : hours === 6 ? 36 : 48;
        const bucketInterval = (hours * 3600 * 1000) / bucketCount;
        const startTimestamp = now.getTime() - hours * 3600 * 1000;

        const points: SystemTimeseriesPoint[] = [];

        for (let i = 0; i <= bucketCount; i++) {
          const bucketTime = new Date(startTimestamp + i * bucketInterval);
          const tMs = bucketTime.getTime();

          const getLatestValueBefore = (entIds: string[], fallback: number) => {
            for (const entId of entIds) {
              const list = res[entId] || [];
              let lastVal = NaN;
              for (const item of list) {
                const itemTime = new Date(item.last_updated || item.last_changed).getTime();
                if (itemTime <= tMs) {
                  const parsed = parseNum(item.state, NaN);
                  if (!isNaN(parsed)) lastVal = parsed;
                } else {
                  break;
                }
              }
              if (!isNaN(lastVal)) return lastVal;
            }
            return fallback;
          };

          const cpu = getLatestValueBefore(['sensor.system_monitor_processor_use'], metrics.cpuUsage);
          const temp = getLatestValueBefore(['sensor.system_monitor_processor_temperature'], metrics.cpuTemp);
          const l1 = getLatestValueBefore(['sensor.system_monitor_load_1_min', 'sensor.system_monitor_load_1m'], metrics.load1m);
          const l5 = getLatestValueBefore(['sensor.system_monitor_load_5_min', 'sensor.system_monitor_load_5m'], metrics.load5m);
          const l15 = getLatestValueBefore(['sensor.system_monitor_load_15_min', 'sensor.system_monitor_load_15m'], metrics.load15m);
          const mem = getLatestValueBefore(['sensor.system_monitor_memory_usage'], metrics.memoryUsagePercent);
          const disk = getLatestValueBefore(['sensor.system_monitor_disk_usage', 'sensor.system_monitor_disk_usage_'], metrics.diskUsagePercent);
          const netIn = getLatestValueBefore(['sensor.system_monitor_network_in_end0'], metrics.networkInRate);
          const netOut = getLatestValueBefore(['sensor.system_monitor_network_out_end0'], metrics.networkOutRate);
          const pktIn = getLatestValueBefore(['sensor.system_monitor_packets_in_end0'], metrics.packetsIn);
          const pktOut = getLatestValueBefore(['sensor.system_monitor_packets_out_end0'], metrics.packetsOut);

          points.push({
            date: bucketTime,
            cpuUsage: cpu,
            cpuTemp: temp,
            load1m: l1,
            load5m: l5,
            load15m: l15,
            memoryUsage: mem,
            diskUsage: disk,
            networkInRate: netIn,
            networkOutRate: netOut,
            packetsInRate: pktIn,
            packetsOutRate: pktOut
          });
        }

        setHistoryData(points);
      } else {
        setHistoryData(
          generateSyntheticHistory(
            hours,
            metrics.cpuUsage || 10,
            metrics.cpuTemp || 74,
            metrics.memoryUsagePercent || 73.4,
            metrics.diskUsagePercent || 20.2,
            metrics.load1m || 1.09,
            metrics.load5m || 1.21,
            metrics.load15m || 1.26
          )
        );
      }
    } catch {
      setHistoryData(
        generateSyntheticHistory(
          hours,
          metrics.cpuUsage || 10,
          metrics.cpuTemp || 74,
          metrics.memoryUsagePercent || 73.4,
          metrics.diskUsagePercent || 20.2,
          metrics.load1m || 1.09,
          metrics.load5m || 1.21,
          metrics.load15m || 1.26
        )
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [
    hours,
    isLiveMode,
    metrics.cpuTemp,
    metrics.cpuUsage,
    metrics.diskUsagePercent,
    metrics.load15m,
    metrics.load1m,
    metrics.load5m,
    metrics.memoryUsagePercent,
    metrics.networkInRate,
    metrics.networkOutRate,
    metrics.packetsIn,
    metrics.packetsOut
  ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory: fetchHistory,
    isLiveMode
  };
}
