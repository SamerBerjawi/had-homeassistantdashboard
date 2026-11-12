/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseNumOptional } from './entityLookup';

export type SpeedPoint = { date: Date; speed: number; timeLabel: string };

export function generateSpeedTimeseries(currentSpeed: number): SpeedPoint[] {
  const points: SpeedPoint[] = [];
  const count = 24;
  const now = Date.now();
  const base = Math.max(0, currentSpeed);

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * 3600 * 1000);
    const hour = date.getHours();
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;

    // Realistic daily driving peaks around commute hours (08:00 - 09:00 and 17:00 - 18:30)
    let speed = 0;
    if (i === 0) {
      speed = base;
    } else if (hour === 8 || hour === 9) {
      speed = Math.round(52 + Math.sin(hour) * 20);
    } else if (hour === 17 || hour === 18) {
      speed = Math.round(68 + Math.cos(hour) * 25);
    } else if (hour >= 11 && hour <= 14) {
      speed = Math.round(35 + Math.sin(hour) * 15);
    } else {
      speed = 0;
    }

    points.push({
      date,
      speed: Math.max(0, speed),
      timeLabel
    });
  }
  return points;
}

export interface RawHistoryPoint {
  timestamp: number;
  state: unknown;
}

/**
 * Buckets raw recorder history into 15-minute peak-speed points over the 24h ending at `end`.
 * The sensor only records on change, so the last value is carried forward. Returns [] when the
 * history has no numeric points.
 */
export function bucketSpeedHistory(raw: RawHistoryPoint[], end: number): SpeedPoint[] {
  const bucketMs = 15 * 60 * 1000;
  const start = end - 24 * 3600 * 1000;
  const pts = raw
    .map((h) => ({ t: h.timestamp, v: parseNumOptional(h.state) }))
    .filter((h): h is { t: number; v: number } => h.v !== undefined && !isNaN(h.t))
    .sort((a, b) => a.t - b.t);
  if (pts.length === 0) return [];
  const out: SpeedPoint[] = [];
  let i = 0;
  let last = 0;
  for (let t = Math.ceil(start / bucketMs) * bucketMs; t <= end; t += bucketMs) {
    let peak = last;
    while (i < pts.length && pts[i].t <= t) {
      peak = Math.max(peak, pts[i].v);
      last = pts[i].v;
      i++;
    }
    out.push({
      date: new Date(t),
      speed: Math.max(0, Math.round(peak)),
      timeLabel: new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    });
  }
  return out;
}
