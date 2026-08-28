/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NasIdentity {
  name: string;                   // sensor.ugreen_nas_nas_name
  model: string;                  // sensor.ugreen_nas_nas_model
  serial: string;                 // sensor.ugreen_nas_nas_serial
  owner: string;                  // sensor.ugreen_nas_nas_owner
  type: string;                   // sensor.ugreen_nas_nas_type
  ugosVersion: string;            // sensor.ugreen_nas_nas_ugos_version
  serverStatus: string;           // sensor.ugreen_nas_server_status
  systemStatusCode: string;       // sensor.ugreen_nas_system_status_code
  systemMessage: string;          // sensor.ugreen_nas_system_message
  tempStatusCode: string;         // sensor.ugreen_nas_temperature_status_code
  tempMessage: string;            // sensor.ugreen_nas_temperature_message
  totalRuntime: string;           // sensor.ugreen_nas_total_runtime
  lastBoot: string;               // sensor.ugreen_nas_last_boot
}

export interface NasComputeRam {
  cpuUsage: number;               // sensor.ugreen_nas_cpu_usage (%)
  cpuTemp: number;                // sensor.ugreen_nas_cpu_temperature (°C)
  ramUsage: number;               // sensor.ugreen_nas_ram_usage (%)
  cpuModel: string;               // sensor.ugreen_nas_cpu_model
  cpuCores: string | number;      // sensor.ugreen_nas_cpu_cores
  cpuThreads: string | number;    // sensor.ugreen_nas_cpu_threads
  cpuSpeed: string;               // sensor.ugreen_nas_cpu_speed
  ramTotalSize: string;           // sensor.ugreen_nas_ram_total_size
  ramUsedGB: string | number;     // sensor.ugreen_nas_ram_usage_used_gb
  ramFree: string;                // sensor.ugreen_nas_ram_usage_free_ram
  ramUsable: string;              // sensor.ugreen_nas_ram_usage_usable_ram
  ramCache: string;               // sensor.ugreen_nas_ram_usage_cache
}

export interface NasThroughputPoint {
  date: Date;
  netDownload: number;
  netUpload: number;
  diskRead: number;
  diskWrite: number;
  volumeRead: number;
  volumeWrite: number;
  volumeReadIops?: number;
  volumeWriteIops?: number;
  disk1Read?: number;
  disk1Write?: number;
  disk2Read?: number;
  disk2Write?: number;
  disk3Read?: number;
  disk3Write?: number;
}

export interface NasThroughputLive {
  netDownload: string;            // sensor.ugreen_nas_overall_lan_download
  netUpload: string;              // sensor.ugreen_nas_overall_lan_upload
  netDownloadRaw: number;
  netUploadRaw: number;
  diskReadRate: string;           // sensor.ugreen_nas_overall_disk_read_rate
  diskWriteRate: string;          // sensor.ugreen_nas_overall_disk_write_rate
  diskReadRateRaw: number;
  diskWriteRateRaw: number;
  volumeReadRate: string;         // sensor.ugreen_nas_overall_volume_read_rate
  volumeWriteRate: string;        // sensor.ugreen_nas_overall_volume_write_rate
  volumeReadRateRaw: number;
  volumeWriteRateRaw: number;
}

export interface NasFansPower {
  fanStatusOverall: string;       // sensor.ugreen_nas_fan_status_overall
  cpuFan: string;                 // sensor.ugreen_nas_cpu_fan
  deviceFan: string;              // sensor.ugreen_nas_device_fan
  fanMode: string;                // sensor.dxp_fan_mode
  fanSelectEntityId: string;      // select.dxp_ugreen_nas_fan_mode
  fanOptions: string[];
  powerMode: string;              // sensor.dxp_power_mode
  powerSelectEntityId: string;    // select.dxp_ugreen_nas_power_mode
  powerOptions: string[];
}

export interface NasStoragePool1 {
  label: string;                  // sensor.ugreen_nas_pool_1_label
  name: string;                   // sensor.ugreen_nas_pool_1_name
  level: string;                  // sensor.ugreen_nas_pool_1_level (RAID)
  status: string;                 // sensor.ugreen_nas_pool_1_status
  diskCount: string | number;     // sensor.ugreen_nas_pool_1_disk_count
  usedSize: string;               // sensor.ugreen_nas_pool_1_used_size
  usedSizeVal: number;
  freeSize: string;               // sensor.ugreen_nas_pool_1_free_size
  freeSizeVal: number;
  totalSize: string;              // sensor.ugreen_nas_pool_1_total_size
  availableSize: string;          // sensor.ugreen_nas_pool_1_available_size
}

export interface NasVolume1 {
  label: string;                  // sensor.ugreen_nas_pool_1_volume_1_label
  name: string;                   // sensor.ugreen_nas_pool_1_volume_1_name
  filesystem: string;             // sensor.ugreen_nas_pool_1_volume_1_filesystem
  health: string;                 // sensor.ugreen_nas_pool_1_volume_1_health
  status: string;                 // sensor.ugreen_nas_pool_1_volume_1_status
  hasCache: string;               // sensor.ugreen_nas_pool_1_volume_1_has_cache
  poolName: string;               // sensor.ugreen_nas_pool_1_volume_1_pool_name
  usedSize: string;               // sensor.ugreen_nas_pool_1_volume_1_used_size
  usedSizeVal: number;
  availableSize: string;          // sensor.ugreen_nas_pool_1_volume_1_available_size
  availableSizeVal: number;
  totalSize: string;              // sensor.ugreen_nas_pool_1_volume_1_total_size
  utilization: number;            // sensor.dxp_pool_1_volume_1_utilization (%)
  readIops: string | number;      // sensor.dxp_pool_1_volume_1_read_iops
  writeIops: string | number;     // sensor.dxp_pool_1_volume_1_write_iops
  readIopsRaw: number;
  writeIopsRaw: number;
}

export interface NasDiskInfo {
  bay: number;
  isInstalled: boolean;
  brand: string;
  model: string;
  status: string;
  serial: string;
  slot: string | number;
  interfaceType: string;
  type: string;
  size: string;
  sleepState: string;
  smartLastResult: string;
  smartLastDate: string;
  smartNextDate: string;
  powerOnHours: string;
  powerOnCount: string;
  temperature: number;
  utilization: number;
  readRate: string;
  writeRate: string;
  readRateRaw: number;
  writeRateRaw: number;
  readIops?: string;
  writeIops?: string;
  readIopsRaw?: number;
  writeIopsRaw?: number;
  usedFor: string;
}

export interface UgreenNasMetrics {
  identity: NasIdentity;
  compute: NasComputeRam;
  throughput: NasThroughputLive;
  fansPower: NasFansPower;
  pool1: NasStoragePool1;
  volume1: NasVolume1;
  disks: NasDiskInfo[];
  buttons: {
    rebootEntityId: string;
    shutdownEntityId: string;
    wakeUpEntityId: string;
    adoptDiskEntityId: string;
  };
}

// Backward compatibility interfaces if needed elsewhere
export interface StoragePool {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'degraded';
  usagePercent: number;
  usedTB: number;
  totalTB: number;
  freeTB: number;
  raidType?: string;
}

export interface DriveSlot {
  slot: number;
  name: string;
  type: 'hdd' | 'nvme_ssd';
  model: string;
  temperature: number;
  status: 'normal' | 'standby' | 'warning' | 'error';
  isSleeping: boolean;
  smartHealthy: boolean;
  badSectors?: number;
  lifespanPercent?: number;
}

export interface NetworkInterface {
  name: string;
  linkSpeed: string;
  ipAddress?: string;
  macAddress?: string;
}

export interface NasTimeseriesPoint {
  date: Date;
  downloadKBps: number;
  uploadKBps: number;
  cpuUsage: number;
  memoryUsage: number;
}
