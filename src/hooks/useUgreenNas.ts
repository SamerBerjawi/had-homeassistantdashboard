/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import {
  UgreenNasMetrics,
  NasIdentity,
  NasComputeRam,
  NasThroughputLive,
  NasFansPower,
  NasStoragePool1,
  NasVolume1,
  NasDiskInfo,
  NasThroughputPoint
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

function formatWithUnit(val: string | number | undefined, defaultUnit: string): string {
  if (val === undefined || val === null || val === '') return `0 ${defaultUnit}`;
  const str = String(val).trim();
  if (str.includes(defaultUnit) || str.toLowerCase().includes(defaultUnit.toLowerCase())) {
    return str;
  }
  return `${str} ${defaultUnit}`;
}

function generateSyntheticNasTimeseries(
  hours: number,
  baseDown: number,
  baseUp: number,
  baseDiskRead: number,
  baseDiskWrite: number,
  baseVolRead: number,
  baseVolWrite: number,
  baseVolReadIops: number,
  baseVolWriteIops: number
): NasThroughputPoint[] {
  const points: NasThroughputPoint[] = [];
  const count = hours === 1 ? 24 : hours === 6 ? 36 : 48;
  const intervalMs = (hours * 3600 * 1000) / (count - 1);
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const progress = (count - 1 - i) / count;
    const wave = Math.sin(progress * Math.PI * 4);
    const wave2 = Math.cos(progress * Math.PI * 6);
    const wave3 = Math.sin(progress * Math.PI * 3 + 1.2);

    const netDown = Math.max(0.2, Math.round((baseDown + wave * 14 + (Math.random() * 4 - 2)) * 10) / 10);
    const netUp = Math.max(0.1, Math.round((baseUp + wave2 * 6 + (Math.random() * 2 - 1)) * 10) / 10);
    
    const dRead = Math.max(0.5, Math.round((baseDiskRead + wave2 * 22 + (Math.random() * 8 - 4)) * 10) / 10);
    const dWrite = Math.max(0.2, Math.round((baseDiskWrite + wave * 16 + (Math.random() * 5 - 2.5)) * 10) / 10);

    const vRead = Math.max(0.4, Math.round((baseVolRead + wave2 * 18 + (Math.random() * 6 - 3)) * 10) / 10);
    const vWrite = Math.max(0.2, Math.round((baseVolWrite + wave * 12 + (Math.random() * 4 - 2)) * 10) / 10);

    const vReadIops = Math.max(10, Math.round(baseVolReadIops + wave3 * 450 + (Math.random() * 120 - 60)));
    const vWriteIops = Math.max(5, Math.round(baseVolWriteIops + wave * 280 + (Math.random() * 80 - 40)));

    points.push({
      date: t,
      netDownload: netDown,
      netUpload: netUp,
      diskRead: dRead,
      diskWrite: dWrite,
      volumeRead: vRead,
      volumeWrite: vWrite,
      volumeReadIops: vReadIops,
      volumeWriteIops: vWriteIops,
      disk1Read: Math.max(0.1, Math.round((dRead * 0.35 + wave * 2) * 10) / 10),
      disk1Write: Math.max(0.1, Math.round((dWrite * 0.34 + wave2 * 1.5) * 10) / 10),
      disk2Read: Math.max(0.1, Math.round((dRead * 0.33 + wave2 * 2.2) * 10) / 10),
      disk2Write: Math.max(0.1, Math.round((dWrite * 0.33 + wave * 1.8) * 10) / 10),
      disk3Read: Math.max(0.1, Math.round((dRead * 0.32 + wave3 * 1.9) * 10) / 10),
      disk3Write: Math.max(0.1, Math.round((dWrite * 0.33 + wave3 * 1.4) * 10) / 10),
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
  const [historyData, setHistoryData] = useState<NasThroughputPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Helper getters
  const metrics: UgreenNasMetrics = useMemo(() => {
    const getVal = (id: string, fallback = ''): string => {
      if (rawStates[id]?.state !== undefined && rawStates[id]?.state !== null) {
        return String(rawStates[id].state);
      }
      // Pattern fallback
      const match = Object.entries(rawStates).find(([k]) =>
        k.toLowerCase() === id.toLowerCase() ||
        k.toLowerCase().endsWith(id.toLowerCase().replace(/^(sensor|select|button|switch|binary_sensor)\./, ''))
      );
      return match ? String(match[1].state ?? fallback) : fallback;
    };

    const getAttr = (id: string, attr: string, fallback: any = null): any => {
      if (rawStates[id]?.attributes?.[attr] !== undefined) {
        return rawStates[id].attributes[attr];
      }
      const match = Object.entries(rawStates).find(([k]) =>
        k.toLowerCase() === id.toLowerCase() ||
        k.toLowerCase().endsWith(id.toLowerCase().replace(/^(sensor|select|button|switch|binary_sensor)\./, ''))
      );
      return match?.[1]?.attributes?.[attr] ?? fallback;
    };

    const getUnit = (id: string, fallbackUnit = ''): string => {
      return getAttr(id, 'unit_of_measurement', fallbackUnit);
    };

    // 1. Identity & Status Strip
    const identity: NasIdentity = {
      name: getVal('sensor.ugreen_nas_nas_name', 'UGREEN-DXP4800'),
      model: getVal('sensor.ugreen_nas_nas_model', getVal('sensor.ugreen_nas_model', 'DXP4800 Plus')),
      serial: getVal('sensor.ugreen_nas_nas_serial', 'UG24DXP4800P0982'),
      owner: getVal('sensor.ugreen_nas_nas_owner', 'Admin'),
      type: getVal('sensor.ugreen_nas_nas_type', '4-Bay Desktop NAS'),
      ugosVersion: getVal('sensor.ugreen_nas_nas_ugos_version', getVal('sensor.ugreen_nas_ugos_version', 'UGOS Pro v1.1.8')),
      serverStatus: getVal('sensor.ugreen_nas_server_status', 'Online'),
      systemStatusCode: getVal('sensor.ugreen_nas_system_status_code', 'Normal'),
      systemMessage: getVal('sensor.ugreen_nas_system_message', 'System operating normally.'),
      tempStatusCode: getVal('sensor.ugreen_nas_temperature_status_code', 'Normal'),
      tempMessage: getVal('sensor.ugreen_nas_temperature_message', 'Thermals within normal limits.'),
      totalRuntime: getVal('sensor.ugreen_nas_total_runtime', getVal('sensor.ugreen_nas_uptime', '184 days, 14 hours')),
      lastBoot: getVal('sensor.ugreen_nas_last_boot', '12 days ago')
    };

    // 2. CPU & RAM Gauges & Specs
    const cpuUsage = parseNum(getVal('sensor.ugreen_nas_cpu_usage', '24.5'), 24.5);
    const cpuTemp = parseNum(getVal('sensor.ugreen_nas_cpu_temperature', '48.5'), 48.5);
    const ramUsage = parseNum(getVal('sensor.ugreen_nas_ram_usage', getVal('sensor.ugreen_nas_memory_usage', '36.8')), 36.8);

    const compute: NasComputeRam = {
      cpuUsage,
      cpuTemp,
      ramUsage,
      cpuModel: getVal('sensor.ugreen_nas_cpu_model', 'Intel Pentium Gold 8505'),
      cpuCores: getVal('sensor.ugreen_nas_cpu_cores', '5'),
      cpuThreads: getVal('sensor.ugreen_nas_cpu_threads', '6'),
      cpuSpeed: getVal('sensor.ugreen_nas_cpu_speed', '3.30 GHz'),
      ramTotalSize: formatWithUnit(getVal('sensor.ugreen_nas_ram_total_size', getVal('sensor.ugreen_nas_memory_total', '16.0')), 'GB'),
      ramUsedGB: formatWithUnit(getVal('sensor.ugreen_nas_ram_usage_used_gb', getVal('sensor.ugreen_nas_memory_used', '5.89')), 'GB'),
      ramFree: formatWithUnit(getVal('sensor.ugreen_nas_ram_usage_free_ram', '4.21'), 'GB'),
      ramUsable: formatWithUnit(getVal('sensor.ugreen_nas_ram_usage_usable_ram', '15.6'), 'GB'),
      ramCache: formatWithUnit(getVal('sensor.ugreen_nas_ram_usage_cache', '5.90'), 'GB')
    };

    // 3. Throughput
    const netDownStr = getVal('sensor.ugreen_nas_overall_lan_download', '42.8 MB/s');
    const netUpStr = getVal('sensor.ugreen_nas_overall_lan_upload', '18.4 MB/s');
    const netDownRaw = parseNum(getVal('sensor.ugreen_nas_overall_lan_download_raw', getVal('sensor.ugreen_nas_overall_lan_download', '42.8')), 42.8);
    const netUpRaw = parseNum(getVal('sensor.ugreen_nas_overall_lan_upload_raw', getVal('sensor.ugreen_nas_overall_lan_upload', '18.4')), 18.4);

    const diskReadStr = getVal('sensor.ugreen_nas_overall_disk_read_rate', '88.5 MB/s');
    const diskWriteStr = getVal('sensor.ugreen_nas_overall_disk_write_rate', '46.2 MB/s');
    const diskReadRaw = parseNum(getVal('sensor.ugreen_nas_overall_disk_read_rate_raw', getVal('sensor.ugreen_nas_overall_disk_read_rate', '88.5')), 88.5);
    const diskWriteRaw = parseNum(getVal('sensor.ugreen_nas_overall_disk_write_rate_raw', getVal('sensor.ugreen_nas_overall_disk_write_rate', '46.2')), 46.2);

    const volReadStr = getVal('sensor.ugreen_nas_overall_volume_read_rate', '74.1 MB/s');
    const volWriteStr = getVal('sensor.ugreen_nas_overall_volume_write_rate', '38.6 MB/s');
    const volReadRaw = parseNum(getVal('sensor.ugreen_nas_overall_volume_read_rate_raw', getVal('sensor.ugreen_nas_overall_volume_read_rate', '74.1')), 74.1);
    const volWriteRaw = parseNum(getVal('sensor.ugreen_nas_overall_volume_write_rate_raw', getVal('sensor.ugreen_nas_overall_volume_write_rate', '38.6')), 38.6);

    const throughput: NasThroughputLive = {
      netDownload: netDownStr,
      netUpload: netUpStr,
      netDownloadRaw: netDownRaw,
      netUploadRaw: netUpRaw,
      diskReadRate: diskReadStr,
      diskWriteRate: diskWriteStr,
      diskReadRateRaw: diskReadRaw,
      diskWriteRateRaw: diskWriteRaw,
      volumeReadRate: volReadStr,
      volumeWriteRate: volWriteStr,
      volumeReadRateRaw: volReadRaw,
      volumeWriteRateRaw: volWriteRaw
    };

    // 4. Fans & Power
    const fanSelectId = rawStates['select.dxp_ugreen_nas_fan_mode']
      ? 'select.dxp_ugreen_nas_fan_mode'
      : (Object.keys(rawStates).find(k => k.startsWith('select.') && k.includes('fan')) || 'select.dxp_ugreen_nas_fan_mode');
    const dynamicFanOptions = getAttr(fanSelectId, 'options', null);
    const fanOptions = Array.isArray(dynamicFanOptions) && dynamicFanOptions.length > 0
      ? dynamicFanOptions
      : ['Quiet', 'Default', 'Full Power'];

    const powerSelectId = rawStates['select.dxp_ugreen_nas_power_mode']
      ? 'select.dxp_ugreen_nas_power_mode'
      : (Object.keys(rawStates).find(k => k.startsWith('select.') && k.includes('power')) || 'select.dxp_ugreen_nas_power_mode');
    const dynamicPowerOptions = getAttr(powerSelectId, 'options', null);
    const powerOptions = Array.isArray(dynamicPowerOptions) && dynamicPowerOptions.length > 0
      ? dynamicPowerOptions
      : ['Balance', 'Performance', 'Power Saving'];

    const currentFanMode = getVal(fanSelectId, getVal('sensor.dxp_fan_mode', getVal('select.ugreen_nas_fan_mode', 'Default')));
    const currentPowerMode = getVal(powerSelectId, getVal('sensor.dxp_power_mode', getVal('select.ugreen_nas_power_mode', 'Balance')));

    const fansPower: NasFansPower = {
      fanStatusOverall: getVal('sensor.ugreen_nas_fan_status_overall', getVal('sensor.ugreen_nas_fan_speed', 'Normal (850 RPM)')),
      cpuFan: getVal('sensor.ugreen_nas_cpu_fan', '1,120 RPM'),
      deviceFan: getVal('sensor.ugreen_nas_device_fan', '850 RPM'),
      fanMode: currentFanMode,
      fanSelectEntityId: fanSelectId,
      fanOptions,
      powerMode: currentPowerMode,
      powerSelectEntityId: powerSelectId,
      powerOptions
    };

    // 5. Storage Pool 1
    const poolUsedStr = getVal('sensor.ugreen_nas_pool_1_used_size', '8.42 TB');
    const poolFreeStr = getVal('sensor.ugreen_nas_pool_1_free_size', '6.12 TB');
    const poolTotalStr = getVal('sensor.ugreen_nas_pool_1_total_size', '14.54 TB');
    const poolUsedVal = parseNum(poolUsedStr, 8.42);
    const poolFreeVal = parseNum(poolFreeStr, 6.12);

    const pool1: NasStoragePool1 = {
      label: getVal('sensor.ugreen_nas_pool_1_label', 'Storage Pool 1'),
      name: getVal('sensor.ugreen_nas_pool_1_name', 'Main Data Array'),
      level: getVal('sensor.ugreen_nas_pool_1_level', 'RAID 5'),
      status: getVal('sensor.ugreen_nas_pool_1_status', 'Healthy'),
      diskCount: getVal('sensor.ugreen_nas_pool_1_disk_count', '3'),
      usedSize: poolUsedStr,
      usedSizeVal: poolUsedVal,
      freeSize: poolFreeStr,
      freeSizeVal: poolFreeVal,
      totalSize: poolTotalStr,
      availableSize: getVal('sensor.ugreen_nas_pool_1_available_size', '6.12 TB Available')
    };

    // 6. Volume 1
    const getVol1Val = (suffix: string, fallback: string) => {
      const candidates = [
        `sensor.ugreen_nas_pool_1_volume_1_${suffix}`,
        `sensor.dxp_pool_1_volume_1_${suffix}`,
        `sensor.ugreen_nas_volume_1_${suffix}`,
        `sensor.dxp_volume_1_${suffix}`
      ];
      for (const cand of candidates) {
        const val = rawStates[cand]?.state;
        if (val !== undefined && val !== null && val !== 'unknown' && val !== 'unavailable') {
          return val;
        }
      }
      return fallback;
    };

    const volUsedStr = getVol1Val('used_size', '8.42 TB');
    const volAvailStr = getVol1Val('available_size', '5.98 TB');
    const volTotalStr = getVol1Val('total_size', '14.40 TB');
    const volUsedVal = parseNum(volUsedStr, 8.42);
    const volAvailVal = parseNum(volAvailStr, 5.98);
    const volTotalVal = parseNum(volTotalStr, volUsedVal + volAvailVal || 14.40);
    const calculatedUtil = volTotalVal > 0 ? (volUsedVal / volTotalVal) * 100 : 58.5;
    const volUtilVal = parseNum(getVol1Val('utilization', String(calculatedUtil.toFixed(1))), calculatedUtil);

    const volReadIopsStr = getVol1Val('read_iops', '1,420 IOPS');
    const volWriteIopsStr = getVol1Val('write_iops', '680 IOPS');

    const volume1: NasVolume1 = {
      label: getVol1Val('label', 'Volume 1'),
      name: getVol1Val('name', 'Shared Storage & Media'),
      filesystem: getVol1Val('filesystem', 'Btrfs (COW with Integrity)'),
      health: getVol1Val('health', 'Healthy'),
      status: getVol1Val('status', 'Normal'),
      hasCache: getVol1Val('has_cache', 'Yes (2x NVMe Read/Write)'),
      poolName: getVol1Val('pool_name', 'Storage Pool 1'),
      usedSize: volUsedStr,
      usedSizeVal: volUsedVal,
      availableSize: volAvailStr,
      availableSizeVal: volAvailVal,
      totalSize: volTotalStr,
      utilization: volUtilVal,
      readIops: volReadIopsStr,
      writeIops: volWriteIopsStr,
      readIopsRaw: parseNum(volReadIopsStr, 1420),
      writeIopsRaw: parseNum(volWriteIopsStr, 680)
    };

    // 7. Disks: Bay 1, 2, 3, 4
    const getDiskInfo = (bayNum: number, prefix: string): NasDiskInfo => {
      const readRateStr = getVal(`${prefix}_read_rate`, '28.4 MB/s');
      const writeRateStr = getVal(`${prefix}_write_rate`, '15.2 MB/s');
      const readIopsStr = getVal(`${prefix}_read_iops`, '480 IOPS');
      const writeIopsStr = getVal(`${prefix}_write_iops`, '240 IOPS');

      return {
        bay: bayNum,
        isInstalled: true,
        brand: getVal(`${prefix}_brand`, 'Seagate'),
        model: getVal(`${prefix}_model`, 'IronWolf 8TB (ST8000VN004)'),
        status: getVal(`${prefix}_status`, 'Normal'),
        serial: getVal(`${prefix}_serial`, `WW2900AE${88 + bayNum}`),
        slot: getVal(`${prefix}_slot`, `Slot ${bayNum}`),
        interfaceType: getVal(`${prefix}_interface_type`, 'SATA 6Gb/s'),
        type: getVal(`${prefix}_type`, 'HDD (7200 RPM)'),
        size: getVal(`${prefix}_size`, '8.0 TB'),
        sleepState: getVal(`${prefix}_sleep_state`, 'Active'),
        smartLastResult: getVal(`${prefix}_smart_last_result`, 'Pass'),
        smartLastDate: getVal(`${prefix}_smart_last_date`, 'Aug 26, 2026 03:00'),
        smartNextDate: getVal(`${prefix}_smart_next_date`, 'Sep 02, 2026 03:00'),
        powerOnHours: getVal(`${prefix}_power_on_hours`, '4,416 hrs'),
        powerOnCount: getVal(`${prefix}_power_on_count`, '18 times'),
        temperature: parseNum(getVal(`${prefix}_temperature`, String(36 + bayNum * 0.5)), 36.5),
        utilization: parseNum(getVal(`${prefix}_utilization`, String(30 + bayNum)), 32.0),
        readRate: readRateStr,
        writeRate: writeRateStr,
        readRateRaw: parseNum(readRateStr, 28.4),
        writeRateRaw: parseNum(writeRateStr, 15.2),
        readIops: readIopsStr,
        writeIops: writeIopsStr,
        readIopsRaw: parseNum(readIopsStr, 480),
        writeIopsRaw: parseNum(writeIopsStr, 240),
        usedFor: getVal(`${prefix}_used_for`, 'Pool 1 (RAID 5) / Volume 1')
      };
    };

    const disk1 = getDiskInfo(1, 'sensor.ugreen_nas_pool_1_disk_1');
    const disk2 = getDiskInfo(2, 'sensor.ugreen_nas_pool_1_disk_2');
    // Bay 3 spec mentions `sensor.dxp_pool_1_disk_3_*` (with fallback to `sensor.ugreen_nas_pool_1_disk_3_*`)
    const disk3Prefix = rawStates['sensor.dxp_pool_1_disk_3_brand'] ? 'sensor.dxp_pool_1_disk_3' : 'sensor.ugreen_nas_pool_1_disk_3';
    const disk3 = getDiskInfo(3, disk3Prefix);

    // Bay 4 is uninstalled (empty slot)
    const disk4: NasDiskInfo = {
      bay: 4,
      isInstalled: false,
      brand: '',
      model: 'Empty Slot',
      status: 'Empty',
      serial: '',
      slot: 'Slot 4',
      interfaceType: 'SATA 6Gb/s',
      type: '',
      size: '',
      sleepState: '',
      smartLastResult: '',
      smartLastDate: '',
      smartNextDate: '',
      powerOnHours: '',
      powerOnCount: '',
      temperature: 0,
      utilization: 0,
      readRate: '0 MB/s',
      writeRate: '0 MB/s',
      readRateRaw: 0,
      writeRateRaw: 0,
      usedFor: 'Unallocated (Ready for pool expansion)'
    };

    const findButton = (keywords: string[], fallback: string) => {
      const keys = Object.keys(rawStates);
      const found = keys.find(k => k.startsWith('button.') && keywords.every(kw => k.toLowerCase().includes(kw)));
      return found || fallback;
    };

    return {
      identity,
      compute,
      throughput,
      fansPower,
      pool1,
      volume1,
      disks: [disk1, disk2, disk3, disk4],
      buttons: {
        rebootEntityId: findButton(['reboot'], 'button.dxp_power_action_reboot'),
        shutdownEntityId: findButton(['shutdown'], 'button.dxp_power_action_shutdown'),
        wakeUpEntityId: findButton(['wake'], 'button.dxp_power_action_wake_up'),
        adoptDiskEntityId: findButton(['adopt'], 'button.dxp_stand_alone_disks_adopt')
      }
    };
  }, [rawStates]);

  // Timeseries generation & query
  const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    const points = generateSyntheticNasTimeseries(
      hours,
      metrics.throughput.netDownloadRaw || 42.8,
      metrics.throughput.netUploadRaw || 18.4,
      metrics.throughput.diskReadRateRaw || 88.5,
      metrics.throughput.diskWriteRateRaw || 46.2,
      metrics.throughput.volumeReadRateRaw || 74.1,
      metrics.throughput.volumeWriteRateRaw || 38.6,
      metrics.volume1.readIopsRaw || 1420,
      metrics.volume1.writeIopsRaw || 680
    );
    setHistoryData(points);
    setIsLoadingHistory(false);
  }, [
    hours,
    metrics.throughput.netDownloadRaw,
    metrics.throughput.netUploadRaw,
    metrics.throughput.diskReadRateRaw,
    metrics.throughput.diskWriteRateRaw,
    metrics.throughput.volumeReadRateRaw,
    metrics.throughput.volumeWriteRateRaw,
    metrics.volume1.readIopsRaw,
    metrics.volume1.writeIopsRaw
  ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Service Actions
  const pressButton = async (entityId: string) => {
    updateEntityState(entityId, new Date().toISOString(), { last_pressed: new Date().toISOString() });
    try {
      await callHAService('button', 'press', {}, { entity_id: entityId });
    } catch {
      // ignore
    }
  };

  const setFanMode = async (mode: string) => {
    const selectId = metrics.fansPower.fanSelectEntityId || 'select.dxp_ugreen_nas_fan_mode';
    updateEntityState(selectId, mode);
    try {
      await callHAService('select', 'select_option', { option: mode }, { entity_id: selectId });
    } catch {
      // ignore
    }
  };

  const setPowerMode = async (mode: string) => {
    const selectId = metrics.fansPower.powerSelectEntityId || 'select.dxp_ugreen_nas_power_mode';
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
    pressButton,
    setFanMode,
    setPowerMode,
    isLiveMode
  };
}
