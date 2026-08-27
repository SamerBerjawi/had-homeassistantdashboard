/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StoragePool {
  id: string;
  name: string;               // e.g. "Storage Pool 1"
  status: 'healthy' | 'warning' | 'degraded';
  usagePercent: number;       // %
  usedTB: number;             // TB
  totalTB: number;            // TB
  freeTB: number;             // TB
  raidType?: string;          // RAID 5, RAID 1, Basic
}

export interface DriveSlot {
  slot: number;               // Disk 1, Disk 2, M.2 1, M.2 2
  name: string;
  type: 'hdd' | 'nvme_ssd';
  model: string;              // e.g. "Seagate IronWolf 8TB"
  temperature: number;        // °C
  status: 'normal' | 'standby' | 'warning' | 'error';
  isSleeping: boolean;        // binary_sensor.ugreen_*_disk_X_standby
  smartHealthy: boolean;      // binary_sensor.ugreen_*_disk_X_smart_status
  badSectors?: number;
  lifespanPercent?: number;   // For NVMe / SSDs
}

export interface NetworkInterface {
  name: string;               // LAN 1, LAN 2
  linkSpeed: string;          // e.g. "2.5 Gbps", "10 Gbps", "Disconnected"
  ipAddress?: string;
  macAddress?: string;
}

export interface UgreenNasMetrics {
  // Device & System Info
  modelName: string;
  ugosVersion: string;
  uptime: string;
  fanMode?: string;           // select.ugreen_*_fan_mode ('Standard' | 'Quiet' | 'Full Speed')
  fanSpeedRpm?: number;       // sensor.ugreen_*_fan_speed
  powerMode?: string;
  connectedUsers?: number;

  // Thermal & Compute
  cpuUsage: number;           // %
  cpuTemp: number;            // °C
  systemTemp: number;         // °C
  isOverheating: boolean;     // binary_sensor.ugreen_*_overheat_warning

  // Memory
  memoryUsagePercent: number; // %
  memoryUsedGB: number;
  memoryTotalGB: number;

  // Storage & Drives
  storagePools: StoragePool[];
  drives: DriveSlot[];

  // Network & Bandwidth
  network: {
    uploadSpeedKBps: number;
    downloadSpeedKBps: number;
    totalBandwidthGB?: number;
    interfaces: NetworkInterface[];
  };

  // Backups & Tasks
  backup?: {
    status: 'idle' | 'running' | 'failed' | 'success';
    lastBackupTime?: string;
    triggerButtonEntityId?: string; // button.ugreen_*_start_backup
    taskName?: string;
  };

  // Hardware Controls & Toggles
  controls: {
    ledSwitchEntityId?: string;     // switch.ugreen_*_led_indicator
    buzzerSwitchEntityId?: string;  // switch.ugreen_*_buzzer
    ledState?: boolean;
    buzzerState?: boolean;
    restartButtonId?: string;       // button.ugreen_*_restart
    shutdownButtonId?: string;      // button.ugreen_*_shutdown
    fanSelectEntityId?: string;     // select.ugreen_*_fan_mode
  };
}

export interface NasTimeseriesPoint {
  date: Date;
  downloadKBps: number;
  uploadKBps: number;
  cpuUsage: number;
  memoryUsage: number;
}
