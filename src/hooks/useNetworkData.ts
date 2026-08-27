/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import {
  TpLinkRouterMetrics,
  ConnectedClient,
  RouterTimeseriesPoint,
  AdGuardMetrics,
  AdGuardTimeseriesPoint,
  NetworkTimeRange
} from '../types/network';

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function getTimeRangeConfig(range: NetworkTimeRange): { count: number; totalHours: number } {
  switch (range) {
    case '1D':
      return { count: 24, totalHours: 24 };
    case '1W':
      return { count: 28, totalHours: 24 * 7 };
    case '1M':
      return { count: 30, totalHours: 24 * 30 };
    case '3M':
      return { count: 36, totalHours: 24 * 90 };
    case '6M':
      return { count: 36, totalHours: 24 * 180 };
    case '1Y':
      return { count: 36, totalHours: 24 * 365 };
    case 'ALL':
    default:
      return { count: 48, totalHours: 24 * 730 };
  }
}

function generateRouterTrafficHistory(
  range: NetworkTimeRange,
  baseDownMB: number,
  baseUpMB: number
): RouterTimeseriesPoint[] {
  const { count, totalHours } = getTimeRangeConfig(range);
  const points: RouterTimeseriesPoint[] = [];
  const intervalMs = (totalHours * 3600 * 1000) / (count - 1);
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const progress = (count - 1 - i) / count;
    const wave = Math.sin(progress * Math.PI * 4);
    const wave2 = Math.cos(progress * Math.PI * 6);

    const down = Math.max(
      1.5,
      Math.round((baseDownMB + wave * 12.5 + (Math.random() * 4.5 - 2.25)) * 10) / 10
    );
    const up = Math.max(
      0.5,
      Math.round((baseUpMB + wave2 * 4.8 + (Math.random() * 2.0 - 1.0)) * 10) / 10
    );

    points.push({
      date: t,
      downloadKBps: down,
      uploadKBps: up
    });
  }

  return points;
}

function generateAdGuardHistory(range: NetworkTimeRange): AdGuardTimeseriesPoint[] {
  const { count, totalHours } = getTimeRangeConfig(range);
  const points: AdGuardTimeseriesPoint[] = [];
  const intervalMs = (totalHours * 3600 * 1000) / (count - 1);
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now - i * intervalMs);
    const progress = (count - 1 - i) / count;
    const wave = Math.sin(progress * Math.PI * 4);

    const total = Math.max(80, Math.round(180 + wave * 90 + Math.random() * 30));
    const blocked = Math.max(10, Math.round(total * (0.24 + Math.random() * 0.05)));

    points.push({
      date: t,
      totalQueries: total,
      blockedQueries: blocked
    });
  }

  return points;
}

// ----------------------------------------------------
// 1. Hook for TP-Link Router
// ----------------------------------------------------
export function useTpLinkRouter() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const [timeRange, setTimeRange] = useState<NetworkTimeRange>('1D');
  const [historyData, setHistoryData] = useState<RouterTimeseriesPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const metrics: TpLinkRouterMetrics = useMemo(() => {
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

    const findId = (pattern: string, defaultId: string): string => {
      const match = Object.keys(rawStates).find((k) =>
        k.toLowerCase().includes(pattern.toLowerCase())
      );
      return match || defaultId;
    };

    const model = getVal('tplink_router_model', 'Archer AXE300 (Quad-Band 6E)');
    const wanIpv4 = getVal('tplink_router_wan_ipv4', '84.115.192.42');
    const wanStatus = (getVal('tplink_router_wan_status', 'connected') as any) || 'connected';
    const cpuUsage = parseNum(getVal('tplink_router_cpu_usage', '24.0'), 24.0);
    const memoryUsage = parseNum(getVal('tplink_router_memory_usage', '48.5'), 48.5);
    const uptime = getVal('tplink_router_uptime', '18 days, 4 hours');

    const currentDownloadSpeedKBps = parseNum(
      getVal('tplink_router_current_download_speed', '28400'),
      28400
    );
    const currentUploadSpeedKBps = parseNum(
      getVal('tplink_router_current_upload_speed', '9500'),
      9500
    );

    // Dynamic extraction of connected devices from Home Assistant device_tracker entities:
    const discoveredClients: ConnectedClient[] = Object.entries(rawStates)
      .filter(([id, s]) => id.startsWith('device_tracker.') && (s.state === 'home' || s.state === 'on' || s.state !== 'not_home'))
      .map(([id, entity]) => {
        const attrs = entity.attributes || {};
        const name = attrs.friendly_name || id.replace('device_tracker.', '').replace(/_/g, ' ');
        const ip = attrs.ip || attrs.ip_address || attrs.ip4 || undefined;
        const mac = attrs.mac || attrs.mac_address || id;
        const bandRaw = (attrs.band || attrs.connection_type || (attrs.source_type === 'router' ? '5ghz' : '2.4ghz')).toLowerCase();
        const signal = attrs.signal_strength || attrs.signal_dbm || attrs.rssi || undefined;
        const down = attrs.download_speed_kbps || undefined;
        const up = attrs.upload_speed_kbps || undefined;
        const connectionType: ConnectedClient['connectionType'] =
          bandRaw.includes('6')
            ? '6ghz'
            : bandRaw.includes('5')
            ? '5ghz'
            : bandRaw.includes('lan') || bandRaw.includes('eth') || bandRaw.includes('wire')
            ? 'ethernet'
            : '2.4ghz';

        return {
          mac,
          name,
          ip,
          connectionType,
          signalDbm: typeof signal === 'number' ? signal : undefined,
          downloadSpeedKBps: typeof down === 'number' ? down : undefined,
          uploadSpeedKBps: typeof up === 'number' ? up : undefined,
          isOnline: true
        };
      });

    // Also parse router attributes if provided as a device array in integration
    const attrDevices = getAttr('tplink_router_devices_total', 'devices', null) ||
      getAttr('tplink_router_connected_devices', 'devices', null) || [];
    
    const routerAttrClients: ConnectedClient[] = Array.isArray(attrDevices)
      ? attrDevices.map((d: any) => ({
          mac: d.mac || d.mac_address || '00:00:00:00:00:00',
          name: d.name || d.hostname || d.host_name || d.ip || 'Unknown Device',
          ip: d.ip || d.ip_address,
          connectionType: (d.band || d.type || '5ghz').toLowerCase().includes('6') ? '6ghz' : (d.band || d.type || '5ghz').toLowerCase().includes('5') ? '5ghz' : (d.band || d.type || '').toLowerCase().includes('eth') ? 'ethernet' : '2.4ghz',
          signalDbm: d.signal || d.signal_strength,
          downloadSpeedKBps: d.down_speed,
          uploadSpeedKBps: d.up_speed,
          isOnline: true
        }))
      : [];

    const clients = [...discoveredClients];
    for (const rac of routerAttrClients) {
      if (!clients.some((c) => c.mac.toLowerCase() === rac.mac.toLowerCase())) {
        clients.push(rac);
      }
    }

    const totalClients = Math.max(clients.length, parseNum(getVal('tplink_router_devices_total', String(clients.length)), clients.length));
    const wiredClients = clients.filter((c) => c.connectionType === 'ethernet').length;
    const wirelessClients = clients.filter((c) => c.connectionType !== 'ethernet').length;

    // Switches with guaranteed fallback entity IDs
    const host24Id = findId('tplink_router_wifi_host_24ghz', 'switch.tplink_router_wifi_host_24ghz');
    const host5Id = findId('tplink_router_wifi_host_5ghz', 'switch.tplink_router_wifi_host_5ghz');
    const host6Id = findId('tplink_router_wifi_host_6ghz', 'switch.tplink_router_wifi_host_6ghz');
    const guest24Id = findId('tplink_router_wifi_guest_24ghz', 'switch.tplink_router_wifi_guest_24ghz');
    const guest5Id = findId('tplink_router_wifi_guest_5ghz', 'switch.tplink_router_wifi_guest_5ghz');
    const iotId = findId('tplink_router_iot_network', 'switch.tplink_router_iot_network');
    const vpnId = findId('tplink_router_vpn_client', 'switch.tplink_router_vpn_client');
    const rebootBtnId = findId('tplink_router_reboot', 'button.tplink_router_reboot');

    return {
      model,
      wanIpv4,
      wanStatus,
      cpuUsage,
      memoryUsage,
      uptime,
      currentDownloadSpeedKBps,
      currentUploadSpeedKBps,
      totalDownloadGB: 1420.5,
      totalUploadGB: 384.2,
      wifiSwitches: {
        host24Ghz: {
          entityId: host24Id,
          enabled: rawStates[host24Id] ? rawStates[host24Id].state === 'on' : true,
          ssid: getAttr('tplink_router_wifi_host_24ghz', 'ssid', 'Antigravity-Home')
        },
        host5Ghz: {
          entityId: host5Id,
          enabled: rawStates[host5Id] ? rawStates[host5Id].state === 'on' : true,
          ssid: getAttr('tplink_router_wifi_host_5ghz', 'ssid', 'Antigravity-Home 5G')
        },
        host6Ghz: {
          entityId: host6Id,
          enabled: rawStates[host6Id] ? rawStates[host6Id].state === 'on' : true,
          ssid: getAttr('tplink_router_wifi_host_6ghz', 'ssid', 'Antigravity-Ultra-6E')
        },
        guest24Ghz: {
          entityId: guest24Id,
          enabled: rawStates[guest24Id] ? rawStates[guest24Id].state === 'on' : true,
          ssid: getAttr('tplink_router_wifi_guest_24ghz', 'ssid', 'Antigravity-Guest'),
          key: getAttr('tplink_router_wifi_guest_24ghz', 'key', 'WelcomeGuest2026!')
        },
        guest5Ghz: {
          entityId: guest5Id,
          enabled: rawStates[guest5Id] ? rawStates[guest5Id].state === 'on' : true,
          ssid: getAttr('tplink_router_wifi_guest_5ghz', 'ssid', 'Antigravity-Guest-5G'),
          key: getAttr('tplink_router_wifi_guest_5ghz', 'key', 'WelcomeGuest2026!')
        },
        iotNetwork: {
          entityId: iotId,
          enabled: rawStates[iotId] ? rawStates[iotId].state === 'on' : true,
          ssid: getAttr('tplink_router_iot_network', 'ssid', 'Antigravity-IoT')
        },
        vpnClient: {
          entityId: vpnId,
          enabled: rawStates[vpnId] ? rawStates[vpnId].state === 'on' : true
        }
      },
      connectedClientsCount: totalClients,
      wiredClientsCount: wiredClients,
      wirelessClientsCount: wirelessClients,
      clients,
      rebootButtonEntityId: rebootBtnId
    };
  }, [rawStates]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    const points = generateRouterTrafficHistory(
      timeRange,
      (metrics.currentDownloadSpeedKBps || 28400) / 1000,
      (metrics.currentUploadSpeedKBps || 9500) / 1000
    );
    setHistoryData(points);
    setIsLoadingHistory(false);
  }, [timeRange, metrics.currentDownloadSpeedKBps, metrics.currentUploadSpeedKBps]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleSwitch = async (entityId: string, currentState: boolean) => {
    const nextState = currentState ? 'off' : 'on';
    updateEntityState(entityId, nextState);
    try {
      await callHAService(
        'switch',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        {},
        { entity_id: entityId }
      );
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

  return {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory: fetchHistory,
    toggleSwitch,
    pressButton,
    isLiveMode
  };
}

// ----------------------------------------------------
// 2. Hook for AdGuard Home
// ----------------------------------------------------
export function useAdGuardHome() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const [timeRange, setTimeRange] = useState<NetworkTimeRange>('1D');
  const [historyData, setHistoryData] = useState<AdGuardTimeseriesPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const metrics: AdGuardMetrics = useMemo(() => {
    const getVal = (prefix: string, fallback = ''): string => {
      const match = Object.entries(rawStates).find(([k]) =>
        k.toLowerCase().includes(prefix.toLowerCase())
      );
      return match ? match[1].state ?? fallback : fallback;
    };

    const findId = (pattern: string, defaultId: string): string => {
      const match = Object.keys(rawStates).find((k) =>
        k.toLowerCase().includes(pattern.toLowerCase())
      );
      return match || defaultId;
    };

    const protId = findId('adguard_protection', 'switch.adguard_protection');
    const filterId = findId('adguard_filtering', 'switch.adguard_filtering');
    const safeBrowseId = findId('adguard_safe_browsing', 'switch.adguard_safe_browsing');
    const parentalId = findId('adguard_parental_control', 'switch.adguard_parental_control');
    const safeSearchId = findId('adguard_safe_search', 'switch.adguard_safe_search');
    const queryLogId = findId('adguard_query_log', 'switch.adguard_query_log');

    const protectionEnabled = rawStates[protId] ? rawStates[protId].state === 'on' : true;
    const filteringEnabled = rawStates[filterId] ? rawStates[filterId].state === 'on' : true;
    const safeBrowsingEnabled = rawStates[safeBrowseId] ? rawStates[safeBrowseId].state === 'on' : true;
    const parentalControlEnabled = rawStates[parentalId] ? rawStates[parentalId].state === 'on' : false;
    const safeSearchEnabled = rawStates[safeSearchId] ? rawStates[safeSearchId].state === 'on' : true;
    const queryLogEnabled = rawStates[queryLogId] ? rawStates[queryLogId].state === 'on' : true;

    const dnsQueriesTotal = parseNum(getVal('adguard_dns_queries', '142580'), 142580);
    const dnsQueriesBlocked = parseNum(getVal('adguard_dns_queries_blocked', '35360'), 35360);
    const blockedRatioPercent = parseNum(
      getVal('adguard_dns_queries_blocked_ratio', '24.8'),
      24.8
    );
    const safeBrowsingBlockedCount = parseNum(
      getVal('adguard_safe_browsing_blocked', '184'),
      184
    );
    const parentalBlockedCount = parseNum(
      getVal('adguard_parental_control_blocked', '12'),
      12
    );
    const rulesCount = parseNum(getVal('adguard_rules_count', '450210'), 450210);
    const avgProcessingSpeedMs = parseNum(
      getVal('adguard_average_processing_speed', '12.4'),
      12.4
    );

    return {
      protectionEnabled,
      filteringEnabled,
      safeBrowsingEnabled,
      parentalControlEnabled,
      safeSearchEnabled,
      queryLogEnabled,
      switches: {
        protection: protId,
        filtering: filterId,
        safeBrowsing: safeBrowseId,
        parentalControl: parentalId,
        safeSearch: safeSearchId,
        queryLog: queryLogId
      },
      dnsQueriesTotal,
      dnsQueriesBlocked,
      blockedRatioPercent,
      safeBrowsingBlockedCount,
      parentalBlockedCount,
      rulesCount,
      avgProcessingSpeedMs
    };
  }, [rawStates]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    const points = generateAdGuardHistory(timeRange);
    setHistoryData(points);
    setIsLoadingHistory(false);
  }, [timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleSwitch = async (entityId: string, currentState: boolean) => {
    const nextState = currentState ? 'off' : 'on';
    updateEntityState(entityId, nextState);
    try {
      await callHAService(
        'switch',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        {},
        { entity_id: entityId }
      );
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
    isLiveMode
  };
}
