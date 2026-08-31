/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Home Assistant History Service
 * Fetches and normalizes live entity history over WebSocket and REST APIs.
 * Correctly parses modern HA compressed minimal_response payloads (`s`, `lu`, `lc`)
 * and converts Unix epoch seconds to JavaScript milliseconds.
 */

import { haWebSocketService } from './haWebSocket';
import { getActiveHAToken } from './haAuth';
import { getHAHttpBaseUrl } from './haImageService';

export interface HAHistoryPoint {
  state: string;
  value: number;
  timestamp: number;
  timeFormatted: string;
}

export interface HAStateChangeEvent {
  id: string;
  state: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  timeFormatted: string;
  isCurrent: boolean;
}

/**
 * Normalizes any timestamp from Home Assistant (seconds, float, ms, or ISO string)
 * into a valid JavaScript epoch millisecond number.
 */
export function normalizeHATimestamp(raw: any, fallbackMs = Date.now()): number {
  if (raw === undefined || raw === null) return fallbackMs;

  if (typeof raw === 'number') {
    // If timestamp is in seconds (e.g. 1725110400.123), convert to ms
    return raw < 1e11 ? Math.round(raw * 1000) : Math.round(raw);
  }

  if (typeof raw === 'string') {
    const num = Number(raw);
    if (!isNaN(num)) {
      return num < 1e11 ? Math.round(num * 1000) : Math.round(num);
    }
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  return fallbackMs;
}

/**
 * Extracts raw state string from any Home Assistant history point format.
 * HA minimal_response uses `p.s`, standard uses `p.state`.
 */
export function extractHAState(point: any): string | null {
  if (!point || typeof point !== 'object') return null;
  if (point.s !== undefined && point.s !== null) return String(point.s);
  if (point.state !== undefined && point.state !== null) return String(point.state);
  return null;
}

/**
 * Extracts timestamp in milliseconds from any Home Assistant history point format.
 * HA minimal_response uses `p.lu` (last_updated) or `p.lc` (last_changed) in epoch seconds.
 */
export function extractHATimestamp(point: any, fallbackMs = Date.now()): number {
  if (!point || typeof point !== 'object') return fallbackMs;
  const raw = point.lu ?? point.last_updated ?? point.lc ?? point.last_changed;
  return normalizeHATimestamp(raw, fallbackMs);
}

/**
 * Fetches real historical state changes from Home Assistant.
 * Tries WebSocket `history/history_during_period` first, falling back to HTTP REST `/api/history/period`.
 */
export async function fetchLiveEntityHistory(
  entityId: string,
  startTimeISO: string,
  endTimeISO?: string
): Promise<Array<{ state: string; timestamp: number }>> {
  if (!entityId) return [];

  // 1. Primary: WebSocket Query
  try {
    if (typeof haWebSocketService?.sendRequest === 'function') {
      const payload: Record<string, any> = {
        start_time: startTimeISO,
        entity_ids: [entityId],
        minimal_response: true,
        no_attributes: true
      };
      if (endTimeISO) {
        payload.end_time = endTimeISO;
      }

      const res = await haWebSocketService.sendRequest<any>('history/history_during_period', payload);

      let rawPoints: any[] = [];
      if (res) {
        if (Array.isArray(res)) {
          if (res.length > 0 && Array.isArray(res[0])) {
            rawPoints = res[0];
          } else if (res.length > 0 && typeof res[0] === 'object') {
            rawPoints = res;
          }
        } else if (typeof res === 'object' && res[entityId]) {
          rawPoints = res[entityId];
        }
      }

      if (Array.isArray(rawPoints) && rawPoints.length > 0) {
        const normalized = rawPoints
          .map((pt) => {
            const state = extractHAState(pt);
            if (state === null || state === 'unavailable' || state === 'unknown') return null;
            const ts = extractHATimestamp(pt);
            return { state, timestamp: ts };
          })
          .filter((p): p is { state: string; timestamp: number } => p !== null);

        if (normalized.length > 0) {
          return normalized;
        }
      }
    }
  } catch (wsErr) {
    console.warn('[HA History] WebSocket query failed, trying REST fallback:', wsErr);
  }

  // 2. Secondary Fallback: Home Assistant REST API
  try {
    const baseUrl = getHAHttpBaseUrl();
    const token = getActiveHAToken();
    if (baseUrl && token) {
      const url = `${baseUrl}/api/history/period/${encodeURIComponent(startTimeISO)}?filter_entity_id=${encodeURIComponent(entityId)}&minimal_response=1&no_attributes=1`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let rawPoints: any[] = [];
        if (Array.isArray(data) && data.length > 0) {
          rawPoints = Array.isArray(data[0]) ? data[0] : data;
        }

        if (rawPoints.length > 0) {
          const normalized = rawPoints
            .map((pt) => {
              const state = extractHAState(pt);
              if (state === null || state === 'unavailable' || state === 'unknown') return null;
              const ts = extractHATimestamp(pt);
              return { state, timestamp: ts };
            })
            .filter((p): p is { state: string; timestamp: number } => p !== null);

          if (normalized.length > 0) {
            return normalized;
          }
        }
      }
    }
  } catch (restErr) {
    console.warn('[HA History] REST query failed:', restErr);
  }

  return [];
}
