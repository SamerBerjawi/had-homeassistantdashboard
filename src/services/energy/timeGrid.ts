/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timestamp collection and the canonical slot grid for a statistics period.
 */

import type { HAStatisticsResponse, SolarForecastResponse } from '../haEnergyStatistics';
import type { EnergyPeriodType } from './types';

export function collectTimestamps(p: {
  allStatisticIds: string[];
  stats: HAStatisticsResponse;
  forecastData: SolarForecastResponse | null;
  startTimeMs?: number;
  endTimeMs?: number;
}): { rawTimestamps: number[]; forecastWhHours: Record<string, number> } {
  const { allStatisticIds, stats, forecastData, startTimeMs, endTimeMs } = p;
  // 1. Gather all timestamps across all requested statistics
  const rawTimestamps: number[] = [];
  for (const id of allStatisticIds) {
    const entries = stats[id];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const raw = entry.start;
        const start = typeof raw === 'number'
          ? (raw > 1e11 ? raw : raw * 1000)
          : new Date(raw).getTime();
        if (!isNaN(start)) {
          if (typeof startTimeMs === 'number' && start < startTimeMs) continue;
          if (typeof endTimeMs === 'number' && start > endTimeMs) continue;
          rawTimestamps.push(start);
        }
      }
    }
  }

  // Also include forecast timestamps if available and strictly within the requested period
  const forecastWhHours: Record<string, number> = {};
  if (forecastData) {
    if ('wh_hours' in forecastData && typeof forecastData.wh_hours === 'object') {
      Object.assign(forecastWhHours, forecastData.wh_hours);
    } else if (typeof forecastData === 'object') {
      // Forecast dictionary keyed by config_entry_id
      for (const fc of Object.values(forecastData)) {
        if (fc && typeof fc === 'object' && 'wh_hours' in fc && fc.wh_hours) {
          for (const [k, v] of Object.entries(fc.wh_hours)) {
            forecastWhHours[k] = (forecastWhHours[k] || 0) + (Number(v) || 0);
          }
        }
      }
    }

    // Include forecast timestamps ONLY if within the requested period window
    // (Prevents upcoming 48-hour forecasts from leaking into past periods)
    for (const fKey of Object.keys(forecastWhHours)) {
      const fTime = new Date(fKey).getTime();
      if (!isNaN(fTime)) {
        if (typeof startTimeMs === 'number' && fTime < startTimeMs) continue;
        if (typeof endTimeMs === 'number' && fTime > endTimeMs) continue;
        rawTimestamps.push(fTime);
      }
    }
  }

  return { rawTimestamps, forecastWhHours };
}

/** Uniform, fixed canonical slot grid so devices reporting at slightly different times line up. */
export function buildSlotGrid(p: {
  rawTimestamps: number[];
  periodType: EnergyPeriodType;
  daysInPeriod: number;
  startTimeMs?: number;
  endTimeMs?: number;
}): number[] {
  const { rawTimestamps, periodType, daysInPeriod, startTimeMs, endTimeMs } = p;
  const sortedTimestamps: number[] = [];

  if (rawTimestamps.length > 0 || (typeof startTimeMs === 'number' && typeof endTimeMs === 'number')) {
    const minTime = rawTimestamps.length > 0 ? Math.min(...rawTimestamps) : (startTimeMs || 0);
    const maxTime = rawTimestamps.length > 0 ? Math.max(...rawTimestamps) : (endTimeMs || 0);

    if (periodType === '5minute') {
      const STEP_MS = 5 * 60 * 1000;
      const baseDate = new Date(minTime);
      const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0).getTime();

      // Align start to midnight of the day if within 24h, else to nearest 5-min epoch
      const isSingleDay = daysInPeriod === 1 && (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000);
      const startSlot = isSingleDay
        ? dayStart
        : Math.floor(minTime / STEP_MS) * STEP_MS;

      // In a 1-day period, 5-minute slots strictly cover the 24 hours of that day:
      // from 00:00 (slot 0) to 23:55 (slot 287). Prevents next-day midnight slot from leaking in.
      const maxAllowedSlot = isSingleDay
        ? dayStart + 24 * 3600 * 1000 - STEP_MS
        : Math.floor(maxTime / STEP_MS) * STEP_MS;

      const endSlot = Math.min(Math.floor(maxTime / STEP_MS) * STEP_MS, maxAllowedSlot);

      for (let t = startSlot; t <= endSlot; t += STEP_MS) {
        sortedTimestamps.push(t);
      }
    } else if (periodType === 'hour') {
      const STEP_MS = 60 * 60 * 1000;
      const baseDate = new Date(minTime);
      const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = dayStart + 23 * STEP_MS;

      const startSlot = (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000)
        ? dayStart
        : Math.floor(minTime / STEP_MS) * STEP_MS;

      const endSlot = (dayStart <= minTime && minTime - dayStart < 24 * 3600 * 1000)
        ? Math.max(dayEnd, Math.floor(maxTime / STEP_MS) * STEP_MS)
        : Math.floor(maxTime / STEP_MS) * STEP_MS;

      for (let t = startSlot; t <= endSlot; t += STEP_MS) {
        sortedTimestamps.push(t);
      }
    } else if (periodType === 'day') {
      if (typeof startTimeMs === 'number' && typeof endTimeMs === 'number' && startTimeMs < endTimeMs) {
        // Build all consecutive days between start and end of the period
        const s = new Date(startTimeMs);
        s.setHours(0, 0, 0, 0);
        const e = new Date(endTimeMs);
        e.setHours(0, 0, 0, 0);
        const cur = new Date(s);
        while (cur.getTime() <= e.getTime()) {
          sortedTimestamps.push(cur.getTime());
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        const dayMap = new Map<string, number>();
        for (const ts of rawTimestamps) {
          const d = new Date(ts);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          if (!dayMap.has(key)) {
            const dayMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
            dayMap.set(key, dayMidnight);
          }
        }
        sortedTimestamps.push(...Array.from(dayMap.values()).sort((a, b) => a - b));
      }
    } else if (periodType === 'month') {
      if (typeof startTimeMs === 'number' && typeof endTimeMs === 'number' && startTimeMs < endTimeMs) {
        const s = new Date(startTimeMs);
        const e = new Date(endTimeMs);
        const cur = new Date(s.getFullYear(), s.getMonth(), 1, 0, 0, 0, 0);
        const endMonth = new Date(e.getFullYear(), e.getMonth(), 1, 0, 0, 0, 0);
        while (cur.getTime() <= endMonth.getTime()) {
          sortedTimestamps.push(cur.getTime());
          cur.setMonth(cur.getMonth() + 1);
        }
      } else {
        const monthMap = new Map<string, number>();
        for (const ts of rawTimestamps) {
          const d = new Date(ts);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
          if (!monthMap.has(key)) {
            const monthFirst = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
            monthMap.set(key, monthFirst);
          }
        }
        sortedTimestamps.push(...Array.from(monthMap.values()).sort((a, b) => a - b));
      }
    }

    // Safety filter: ensure no slot exceeds endTimeMs + 1 hour or precedes startTimeMs - 1 hour
    if (typeof startTimeMs === 'number' || typeof endTimeMs === 'number') {
      const bounded = sortedTimestamps.filter((t) => {
        if (typeof startTimeMs === 'number' && t < startTimeMs - 3600000) return false;
        if (typeof endTimeMs === 'number' && t > endTimeMs + 3600000) return false;
        return true;
      });
      sortedTimestamps.length = 0;
      sortedTimestamps.push(...bounded);
    }
  }
  return sortedTimestamps;
}
