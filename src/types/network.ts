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

export type NetworkTimeRange =
  | '24H'
  | '7D'
  | '30D'
  | '90D'
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | '6M'
  | '1Y'
  | 'ALL';

export interface RouterTimeseriesPoint {
  date: Date;
  downloadKBps: number;
  uploadKBps: number;
}

export interface TpLinkRouterMetrics {
  // Router Info & Hardware
  model: string;
  wanIpv4: string;               // sensor.*wan_ipv4_address
  lanIpv4?: string;              // sensor.*lan_ipv4_address
  connectionType?: string;       // sensor.*connection_type
  wanStatus: 'connected' | 'disconnected';
  cpuUsage: number;              // sensor.*cpu_used (%)
  memoryUsage: number;           // sensor.*memory_used (%)
  uptime: string;                // sensor.*uptime

  // Live Traffic & Speeds (Graceful fallback when RX/TX sensor unavailable)
  currentDownloadSpeedKBps: number;
  currentUploadSpeedKBps: number;
  totalDownloadGB: number;
  totalUploadGB: number;

  // Wi-Fi Radios & Guest/IoT Networks (Interactive Switches)
  wifiSwitches: {
    host24Ghz: { entityId?: string; enabled: boolean; ssid: string };
    host5Ghz: { entityId?: string; enabled: boolean; ssid: string };
    host6Ghz?: { entityId?: string; enabled: boolean; ssid: string };
    guest24Ghz: { entityId?: string; enabled: boolean; ssid: string; key?: string };
    guest5Ghz: { entityId?: string; enabled: boolean; ssid: string; key?: string };
    guest6Ghz?: { entityId?: string; enabled: boolean; ssid: string };
    iot24Ghz?: { entityId?: string; enabled: boolean; ssid: string };
    iot5Ghz?: { entityId?: string; enabled: boolean; ssid: string };
    iot6Ghz?: { entityId?: string; enabled: boolean; ssid: string };
    iotNetwork?: { entityId?: string; enabled: boolean; ssid: string };
    vpnClient?: { entityId?: string; enabled: boolean };
    routerDataFetching?: { entityId?: string; enabled: boolean };
  };

  // Connected Devices (Mesh / Trackers / Client Breakdown)
  connectedClientsCount: number; // sensor.*total_clients
  mainWifiClientsCount: number;  // sensor.*total_main_wifi_clients
  wiredClientsCount: number;     // sensor.*total_wired_clients
  iotClientsCount: number;       // sensor.*total_iot_clients
  guestClientsCount: number;     // sensor.*total_guest_wifi_clients
  wirelessClientsCount: number;
  clients: ConnectedClient[];

  // Power Actions
  rebootButtonEntityId?: string; // button.*reboot
}

export interface AdGuardTimeseriesPoint {
  date: Date;
  totalQueries: number;
  blockedQueries: number;
}

export interface AdGuardMetrics {
  // Protection Status & Toggles
  protectionEnabled: boolean;     // switch.*protection (Master switch)
  filteringEnabled: boolean;      // switch.*filtering
  safeBrowsingEnabled: boolean;   // switch.*safe_browsing
  parentalControlEnabled: boolean;// switch.*parental_control
  safeSearchEnabled: boolean;     // switch.*safe_search
  queryLogEnabled: boolean;       // switch.*query_log

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
  dnsQueriesTotal: number;        // sensor.*dns_queries
  dnsQueriesBlocked: number;      // sensor.*dns_queries_blocked
  blockedRatioPercent: number;    // sensor.*dns_queries_blocked_ratio (%)
  safeBrowsingBlockedCount: number;// sensor.*safe_browsing_blocked
  parentalBlockedCount: number;   // sensor.*parental_control_blocked
  rulesCount: number;             // sensor.*rules_count
  avgProcessingSpeedMs: number;   // sensor.*average_processing_speed (ms)
  safeSearchesEnforcedCount: number; // sensor.*safe_searches_enforced
}
