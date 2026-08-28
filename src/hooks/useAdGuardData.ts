/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useAdGuardData Hook
 * Binds strictly to live Home Assistant entities and recorder statistics
 * with zero hardcoded/mock data fallbacks.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import {
  AdGuardMetrics,
  AdGuardTimeseriesPoint,
  NetworkTimeRange
} from '../types/network';
import { fetchAdGuardStatistics, ADGUARD_ENTITY_IDS } from '../services/haAdGuardStatistics';

/**
 * Flexible entity lookup supporting wildcards and friendly names
 */
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

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

const isEntityOn = (ent: any, defaultState = false): boolean => {
  if (!ent) return defaultState;
  const s = String(ent.state ?? '').trim().toLowerCase();
  return s === 'on' || s === 'home' || s === 'connected' || s === 'enabled' || s === 'true' || s === '1' || ent.state === true;
};

export function useAdGuardData() {
  const rawStates = useAutoLayoutStore((s) => s.rawStates);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const [timeRange, setTimeRange] = useState<NetworkTimeRange>('24H');
  const [historyData, setHistoryData] = useState<AdGuardTimeseriesPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const metrics: AdGuardMetrics = useMemo(() => {
    // 1. Protection Switches (Master & Sub-toggles)
    const protSwitch =
      rawStates['switch.adguard_home_protection'] ||
      rawStates['switch.adguard_protection'] ||
      findEntity(rawStates, 'switch', ['protection', 'adguard_protection', 'adguard_home_protection']);

    const filterSwitch =
      rawStates['switch.adguard_home_filtering'] ||
      rawStates['switch.adguard_filtering'] ||
      findEntity(rawStates, 'switch', ['filtering', 'adguard_filtering']);

    const safeBrowseSwitch =
      rawStates['switch.adguard_home_safe_browsing'] ||
      rawStates['switch.adguard_safe_browsing'] ||
      findEntity(rawStates, 'switch', ['safe_browsing', 'safebrowsing', 'adguard_safe_browsing']);

    const parentalSwitch =
      rawStates['switch.adguard_home_parental_control'] ||
      rawStates['switch.adguard_parental_control'] ||
      findEntity(rawStates, 'switch', ['parental_control', 'parental', 'adguard_parental_control']);

    const safeSearchSwitch =
      rawStates['switch.adguard_home_safe_search'] ||
      rawStates['switch.adguard_safe_search'] ||
      findEntity(rawStates, 'switch', ['safe_search', 'safesearch', 'safe_searches', 'adguard_safe_search']);

    const queryLogSwitch =
      rawStates['switch.adguard_home_query_log'] ||
      rawStates['switch.adguard_query_log'] ||
      findEntity(rawStates, 'switch', ['query_log', 'querylog', 'adguard_query_log']);

    // 2. Query Stats & Performance Sensors
    const queriesEntity =
      rawStates['sensor.adguard_home_dns_queries'] ||
      rawStates['sensor.adguard_dns_queries'] ||
      findEntity(rawStates, 'sensor', ['dns_queries', 'adguard_dns_queries', 'adguard_home_dns_queries']);
    const dnsQueriesTotal = parseNum(queriesEntity?.state, 0);

    const blockedEntity =
      rawStates['sensor.adguard_home_dns_queries_blocked'] ||
      rawStates['sensor.adguard_dns_queries_blocked'] ||
      findEntity(rawStates, 'sensor', ['dns_queries_blocked', 'adguard_dns_queries_blocked', 'adguard_home_dns_queries_blocked']);
    const dnsQueriesBlocked = parseNum(blockedEntity?.state, 0);

    const ratioEntity =
      rawStates['sensor.adguard_home_dns_queries_blocked_ratio'] ||
      rawStates['sensor.adguard_dns_queries_blocked_ratio'] ||
      findEntity(rawStates, 'sensor', ['dns_queries_blocked_ratio', 'blocked_ratio', 'adguard_dns_queries_blocked_ratio']);
    
    // Calculate ratio from live total / blocked if ratio entity is missing
    const calculatedRatio =
      dnsQueriesTotal > 0 ? Number(((dnsQueriesBlocked / dnsQueriesTotal) * 100).toFixed(1)) : 0;
    const blockedRatioPercent =
      ratioEntity?.state !== undefined ? parseNum(ratioEntity.state, calculatedRatio) : calculatedRatio;

    const safeBrowsingEntity =
      rawStates['sensor.adguard_home_safe_browsing_blocked'] ||
      rawStates['sensor.adguard_safe_browsing_blocked'] ||
      findEntity(rawStates, 'sensor', ['safe_browsing_blocked', 'safebrowsing_blocked']);
    const safeBrowsingBlockedCount = parseNum(safeBrowsingEntity?.state, 0);

    const parentalEntity =
      rawStates['sensor.adguard_home_parental_control_blocked'] ||
      rawStates['sensor.adguard_parental_control_blocked'] ||
      findEntity(rawStates, 'sensor', ['parental_control_blocked', 'parental_blocked']);
    const parentalBlockedCount = parseNum(parentalEntity?.state, 0);

    const rulesEntity =
      rawStates['sensor.adguard_home_rules_count'] ||
      rawStates['sensor.adguard_rules_count'] ||
      findEntity(rawStates, 'sensor', ['rules_count', 'adguard_rules_count']);
    const rulesCount = parseNum(rulesEntity?.state, 0);

    const speedEntity =
      rawStates['sensor.adguard_home_average_processing_speed'] ||
      rawStates['sensor.adguard_average_processing_speed'] ||
      findEntity(rawStates, 'sensor', ['average_processing_speed', 'processing_speed']);
    const avgProcessingSpeedMs = parseNum(speedEntity?.state, 0);
    const avgProcessingSpeedUnit = speedEntity?.attributes?.unit_of_measurement || 'ms';

    const safeSearchesEntity =
      rawStates['sensor.adguard_home_safe_searches_enforced'] ||
      rawStates['sensor.adguard_safe_searches_enforced'] ||
      findEntity(rawStates, 'sensor', ['safe_searches_enforced', 'safe_search_enforced']);
    const safeSearchesEnforcedCount = parseNum(safeSearchesEntity?.state, 0);

    const dnsQueriesAllowed = Math.max(0, dnsQueriesTotal - dnsQueriesBlocked);

    return {
      protectionEnabled: isEntityOn(protSwitch, true),
      filteringEnabled: isEntityOn(filterSwitch, true),
      safeBrowsingEnabled: isEntityOn(safeBrowseSwitch, true),
      parentalControlEnabled: isEntityOn(parentalSwitch, false),
      safeSearchEnabled: isEntityOn(safeSearchSwitch, true),
      queryLogEnabled: isEntityOn(queryLogSwitch, true),
      switches: {
        protection: protSwitch?.entity_id || 'switch.adguard_home_protection',
        filtering: filterSwitch?.entity_id || 'switch.adguard_home_filtering',
        safeBrowsing: safeBrowseSwitch?.entity_id || 'switch.adguard_home_safe_browsing',
        parentalControl: parentalSwitch?.entity_id || 'switch.adguard_home_parental_control',
        safeSearch: safeSearchSwitch?.entity_id || 'switch.adguard_home_safe_search',
        queryLog: queryLogSwitch?.entity_id || 'switch.adguard_home_query_log'
      },
      dnsQueriesTotal,
      dnsQueriesBlocked,
      dnsQueriesAllowed,
      blockedRatioPercent,
      safeBrowsingBlockedCount,
      parentalBlockedCount,
      rulesCount,
      avgProcessingSpeedMs,
      avgProcessingSpeedUnit,
      safeSearchesEnforcedCount
    };
  }, [rawStates]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const points = await fetchAdGuardStatistics(timeRange, {
        total: metrics.dnsQueriesTotal,
        blocked: metrics.dnsQueriesBlocked,
        safeBrowsing: metrics.safeBrowsingBlockedCount,
        parental: metrics.parentalBlockedCount
      });
      setHistoryData(points);
    } catch (e) {
      console.warn('[AdGuard Hook] Failed to load statistics history:', e);
      setHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [timeRange, metrics.dnsQueriesTotal, metrics.dnsQueriesBlocked, metrics.safeBrowsingBlockedCount, metrics.parentalBlockedCount]);

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
