/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConnectedClient {
  mac: string;
  name: string;
  ip?: string;
  connectionType: '2.4ghz' | '5ghz' | '6ghz' | 'ethernet';
  signalDbm?: number;          // e.g. -52 dBm
  downloadSpeedKBps?: number;
  uploadSpeedKBps?: number;
  isOnline: boolean;
}

export interface RouterTimeseriesPoint {
  date: Date;
  downloadKBps: number;
  uploadKBps: number;
}

export interface TpLinkRouterMetrics {
  // Router Info & Hardware
  model: string;
  wanIpv4: string;               // sensor.tplink_router_wan_ipv4
  wanStatus: 'connected' | 'disconnected';
  cpuUsage: number;              // sensor.tplink_router_cpu_usage (%)
  memoryUsage: number;           // sensor.tplink_router_memory_usage (%)
  uptime: string;                // sensor.tplink_router_uptime

  // Live Traffic & Speeds
  currentDownloadSpeedKBps: number; // sensor.tplink_router_current_download_speed
  currentUploadSpeedKBps: number;   // sensor.tplink_router_current_upload_speed
  totalDownloadGB: number;
  totalUploadGB: number;

  // Wi-Fi Radios & Guest Networks (Interactive Switches)
  wifiSwitches: {
    host24Ghz: { entityId?: string; enabled: boolean; ssid: string };
    host5Ghz: { entityId?: string; enabled: boolean; ssid: string };
    host6Ghz?: { entityId?: string; enabled: boolean; ssid: string };
    guest24Ghz: { entityId?: string; enabled: boolean; ssid: string; key?: string };
    guest5Ghz: { entityId?: string; enabled: boolean; ssid: string; key?: string };
    iotNetwork?: { entityId?: string; enabled: boolean; ssid: string };
    vpnClient?: { entityId?: string; enabled: boolean };
  };

  // Connected Devices (Mesh / Trackers)
  connectedClientsCount: number; // sensor.tplink_router_devices_total / active
  wiredClientsCount: number;
  wirelessClientsCount: number;
  clients: ConnectedClient[];

  // Power Actions
  rebootButtonEntityId?: string; // button.tplink_router_reboot
}

export interface AdGuardTimeseriesPoint {
  date: Date;
  totalQueries: number;
  blockedQueries: number;
}

export interface AdGuardMetrics {
  // Protection Status & Toggles
  protectionEnabled: boolean;     // switch.adguard_protection (Master switch)
  filteringEnabled: boolean;      // switch.adguard_filtering
  safeBrowsingEnabled: boolean;   // switch.adguard_safe_browsing
  parentalControlEnabled: boolean;// switch.adguard_parental_control
  safeSearchEnabled: boolean;     // switch.adguard_safe_search
  queryLogEnabled: boolean;       // switch.adguard_query_log

  // Switches Entity IDs
  switches: {
    protection?: string;
    filtering?: string;
    safeBrowsing?: string;
    parentalControl?: string;
    safeSearch?: string;
    queryLog?: string;
  };

  // Query Stats & Performance
  dnsQueriesTotal: number;        // sensor.adguard_dns_queries
  dnsQueriesBlocked: number;      // sensor.adguard_dns_queries_blocked
  blockedRatioPercent: number;    // sensor.adguard_dns_queries_blocked_ratio (%)
  safeBrowsingBlockedCount: number;// sensor.adguard_safe_browsing_blocked
  parentalBlockedCount: number;   // sensor.adguard_parental_control_blocked
  rulesCount: number;             // sensor.adguard_rules_count
  avgProcessingSpeedMs: number;   // sensor.adguard_average_processing_speed (ms)
}
