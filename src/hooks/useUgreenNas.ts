/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { haWebSocketService } from '../services/haWebSocket';
import {
  UgreenNasMetrics,
  StoragePool,
  DriveSlot,
  NetworkInterface,
  NasTimeseriesPoint
} from '../types/ugreenNas';
import { HistoryTimeRange } from './useSystemMetrics';

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
 * Default fallback drive array for UGREEN DXP4800 Plus (4x 8TB HDD + 2x 2TB NVMe)
 */
const DEFAULT_DRIVES: DriveSlot[] = [
  {
    slot: 1,
    name: 'Drive Bay 1',
    type: 'hdd',
    model: 'Seagate IronWolf 8TB (ST8000VN004)',
    temperature: 36,
    status: 'normal',
    isSleeping: false,
    smartHealthy: true,
    badSectors: 0
  },
  {
    slot: 2,
    name: 'Drive Bay 2',
    type: 'hdd',
    model: 'Seagate IronWolf 8TB (ST8000VN004)',
    temperature: 37,
    status: 'normal',
    isSleeping: false,
    smartHealthy: true,
    badSectors: 0
  },
  {
    slot: 3,
    name: 'Drive Bay 3',
    type: 'hdd',
    model: 'Seagate IronWolf 8TB (ST8000VN004)',
    temperature: 35,
    status: 'normal',
    isSleeping: false,
    smartHealthy: true,
    badSectors: 0
  },
  {
    slot: 4,
    name: 'Drive Bay 4',
    type: 'hdd',
    model: 'Seagate IronWolf 8TB (ST8000VN004)',
    temperature: 31,
    status: 'standby',
    isSleeping: true,
    smartHealthy: true,
    badSectors: 0
  },
  {
    slot: 5,
    name: 'M.2 Slot 1 (Cache)',
    type: 'nvme_ssd',
    model: 'Samsung 990 Pro 2TB NVMe',
    temperature: 42,
    status: 'normal',
    isSleeping: false,
    smartHealthy: true,
    badSectors: 0,
    lifespanPercent: 98
  },
  {
    slot: 6,
    name: 'M.2 Slot 2 (Read Pool)',
    type: 'nvme_ssd',
    model: 'Samsung 990 Pro 2TB NVMe',
    temperature: 40,
    status: 'normal',
    isSleeping: false,
    smartHealthy: true,
    badSectors: 0,
    lifespanPercent: 99
  }
];

function generateSyntheticNasHistory(
  hours: number,
  baseDown: number,
  baseUp: number,
  baseCpu: number
): NasTimeseriesPoint[] {
  const points: NasTimeseriesPoint[] = [];
  const count = hours === 1 ? 24 : hours === 6 ? 36 : 48;
  const intervalMs = (hours * 3600 * 1000) / (count - 1);
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const progress = (count - 1 - i) / count;
    const wave = Math.sin(progress * Math.PI * 4);
    const wave2 = Math.cos(progress * Math.PI * 6);

    const down = Math.max(0.5, Math.round((baseDown + wave * 6.5 + (Math.random() * 2.5 - 1.25)) * 10) / 10);
    const up = Math.max(0.2, Math.round((baseUp + wave2 * 3.8 + (Math.random() * 1.5 - 0.75)) * 10) / 10);
    const cpu = Math.max(5, Math.min(85, Math.round((baseCpu + wave * 12 + Math.random() * 4) * 10) / 10));
    const mem = Math.max(25, Math.min(60, Math.round((34.2 + wave2 * 2.5) * 10) / 10));

    points.push({
      date: t,
      downloadKBps: down,
      uploadKBps: up,
      cpuUsage: cpu,
      memoryUsage: mem
    });
  }

  return points;
}

export function useUgreenNas() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const [timeRange, setTimeRange] = useState<HistoryTimeRange>('24h');
  const [historyData, setHistoryData] = useState<NasTimeseriesPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // 1. Live Extraction & Normalization
  const metrics: UgreenNasMetrics = useMemo(() => {
    const getVal = (prefix: string, fallback = ''): string => {
      const match = Object.entries(rawStates).find(([k]) =>
        k.toLowerCase().includes(prefix.toLowerCase())
      );
      return match ? match[1].state ?? fallback : fallback;
    };

    const getAttr = (prefix: string, attr: string, fallback: any = null): any => {
      const match = Object.entries(rawStates).find(([k]) =>
        k.toLowerCase().includes(prefix.toLowerCase())
      );
      return match?.[1]?.attributes?.[attr] ?? fallback;
    };

    const findId = (pattern: string): string | undefined => {
      const match = Object.keys(rawStates).find((k) =>
        k.toLowerCase().includes(pattern.toLowerCase())
      );
      return match;
    };

    // System Info
    const modelName = getVal('ugreen_nas_model', getVal('dxp4800_model', 'UGREEN DXP4800 Plus'));
    const ugosVersion = getVal('ugreen_nas_ugos_version', 'UGOS Pro v1.1.8');
    const uptime = getVal('ugreen_nas_uptime', '4 weeks, 2 days');
    const fanMode = getVal('ugreen_nas_fan_mode', 'Standard');
    const fanSpeedRpm = parseNum(getVal('ugreen_nas_fan_speed', '850'), 850);
    const connectedUsers = parseNum(getVal('ugreen_nas_users', '3'), 3);

    // Compute & Thermal
    const cpuUsage = parseNum(getVal('ugreen_nas_cpu_usage', '18.5'), 18.5);
    const cpuTemp = parseNum(getVal('ugreen_nas_cpu_temperature', '52.0'), 52.0);
    const systemTemp = parseNum(getVal('ugreen_nas_system_temperature', '44.0'), 44.0);
    const isOverheating = getVal('ugreen_nas_overheat_warning', 'off') === 'on';

    // Memory
    const memoryUsagePercent = parseNum(getVal('ugreen_nas_memory_usage', '34.2'), 34.2);
    const memoryUsedGB = parseNum(getVal('ugreen_nas_memory_used', '5.47'), 5.47);
    const memoryTotalGB = parseNum(getVal('ugreen_nas_memory_total', '16.0'), 16.0);

    // Storage Pools
    const poolUsage = parseNum(getVal('ugreen_nas_storage_pool_1_usage', '66.7'), 66.7);
    const poolUsedTB = parseNum(getAttr('ugreen_nas_storage_pool_1_usage', 'used_tb', 14.55), 14.55);
    const poolTotalTB = parseNum(getAttr('ugreen_nas_storage_pool_1_usage', 'total_tb', 21.82), 21.82);
    const poolFreeTB = parseNum(getAttr('ugreen_nas_storage_pool_1_usage', 'free_tb', 7.27), 7.27);
    const poolRaid = getAttr('ugreen_nas_storage_pool_1_usage', 'raid_type', 'RAID 5');

    const storagePools: StoragePool[] = [
      {
        id: 'pool_1',
        name: 'Storage Pool 1 (Btrfs Volume)',
        status: 'healthy',
        usagePercent: poolUsage,
        usedTB: poolUsedTB,
        totalTB: poolTotalTB,
        freeTB: poolFreeTB,
        raidType: poolRaid
      }
    ];

    // Drives
    const drives: DriveSlot[] = DEFAULT_DRIVES;

    // Network
    const downSpeed = parseNum(getVal('ugreen_nas_network_download_speed', '14.2'), 14.2);
    const upSpeed = parseNum(getVal('ugreen_nas_network_upload_speed', '6.8'), 6.8);
    const lan1Speed = getVal('ugreen_nas_lan_1_speed', '2.5 Gbps');
    const lan2Speed = getVal('ugreen_nas_lan_2_speed', '10 Gbps');
    const ipAddress = getVal('ugreen_nas_ip_address', '192.168.68.80');

    const interfaces: NetworkInterface[] = [
      {
        name: 'LAN 1 (Management)',
        linkSpeed: lan1Speed,
        ipAddress: ipAddress
      },
      {
        name: 'LAN 2 (High-Speed SFP+/10G)',
        linkSpeed: lan2Speed,
        ipAddress: '10.0.0.80'
      }
    ];

    // Backup
    const backupStatus = (getVal('ugreen_nas_backup_status', 'idle') as any) || 'idle';
    const lastBackupTime = getAttr('ugreen_nas_backup_status', 'last_backup_time', 'Today, 03:00 AM');
    const backupTriggerButton = findId('ugreen_nas_start_backup') || findId('button.ugreen');

    // Controls
    const ledSwitchId = findId('ugreen_nas_led_indicator') || findId('switch.ugreen_nas_led');
    const buzzerSwitchId = findId('ugreen_nas_buzzer') || findId('switch.ugreen_nas_buzzer');
    const restartButtonId = findId('ugreen_nas_restart');
    const shutdownButtonId = findId('ugreen_nas_shutdown');
    const fanSelectId = findId('select.ugreen_nas_fan_mode');

    const ledState = ledSwitchId ? rawStates[ledSwitchId]?.state === 'on' : true;
    const buzzerState = buzzerSwitchId ? rawStates[buzzerSwitchId]?.state === 'on' : false;

    return {
      modelName,
      ugosVersion,
      uptime,
      fanMode,
      fanSpeedRpm,
      connectedUsers,
      cpuUsage,
      cpuTemp,
      systemTemp,
      isOverheating,
      memoryUsagePercent,
      memoryUsedGB,
      memoryTotalGB,
      storagePools,
      drives,
      network: {
        uploadSpeedKBps: upSpeed,
        downloadSpeedKBps: downSpeed,
        totalBandwidthGB: 342.8,
        interfaces
      },
      backup: {
        status: backupStatus,
        lastBackupTime,
        triggerButtonEntityId: backupTriggerButton,
        taskName: 'Nightly Btrfs Snapshot'
      },
      controls: {
        ledSwitchEntityId: ledSwitchId,
        buzzerSwitchEntityId: buzzerSwitchId,
        ledState,
        buzzerState,
        restartButtonId,
        shutdownButtonId,
        fanSelectEntityId: fanSelectId
      }
    };
  }, [rawStates]);

  // 2. Telemetry History Generation / WebSocket Query
  const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    // In demo or live fallback, synthesize rich curves
    const points = generateSyntheticNasHistory(
      hours,
      metrics.network.downloadSpeedKBps || 14.2,
      metrics.network.uploadSpeedKBps || 6.8,
      metrics.cpuUsage || 18.5
    );
    setHistoryData(points);
    setIsLoadingHistory(false);
  }, [hours, metrics.cpuUsage, metrics.network.downloadSpeedKBps, metrics.network.uploadSpeedKBps]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 3. Hardware Interactive Control Actions
  const toggleSwitch = async (entityId: string, currentState: boolean) => {
    const nextState = currentState ? 'off' : 'on';
    updateEntityState(entityId, nextState);
    try {
      await callHAService('switch', nextState === 'on' ? 'turn_on' : 'turn_off', {}, { entity_id: entityId });
    } catch {
      // ignore
    }
  };

  const pressButton = async (entityId: string) => {
    try {
      await callHAService('button', 'press', {}, { entity_id: entityId });
    } catch {
      // ignore
    }
  };

  const setFanMode = async (mode: string) => {
    const selectId = metrics.controls.fanSelectEntityId || 'select.ugreen_nas_fan_mode';
    updateEntityState(selectId, mode);
    try {
      await callHAService('select', 'select_option', { option: mode }, { entity_id: selectId });
    } catch {
      // ignore
    }
  };

  return {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory: fetchHistory,
    toggleSwitch,
    pressButton,
    setFanMode,
    isLiveMode
  };
}
