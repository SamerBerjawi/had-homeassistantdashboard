/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { HAEntity, ResolvedEntity } from '../types';

interface MediaPositionResult {
  currentPosition: number;
  duration: number;
  progressPercent: number;
  isPlaying: boolean;
  formatTime: (secs: number) => string;
}

export function formatMediaTime(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const totalSeconds = Math.floor(secs);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Calculates accurate, real-time media position synchronized with Home Assistant's
 * `media_position` and `media_position_updated_at` timestamps.
 */
export function useMediaPosition(
  entity: HAEntity | ResolvedEntity | undefined | null,
  isSeeking: boolean = false,
  seekPositionOverride: number | null = null
): MediaPositionResult {
  const isPlaying = entity?.state === 'playing';
  const duration = Number(entity?.attributes?.media_duration) || 0;
  const rawBasePosition = Number(entity?.attributes?.media_position) || 0;
  const updatedAt = entity?.attributes?.media_position_updated_at;
  const mediaTitle = entity?.attributes?.media_title;

  const [displayPosition, setDisplayPosition] = useState<number>(rawBasePosition);
  const lastSyncRef = useRef<{ basePos: number; updatedAtMs: number; title?: string }>({
    basePos: rawBasePosition,
    updatedAtMs: updatedAt ? new Date(updatedAt).getTime() : Date.now(),
    title: mediaTitle
  });

  // Re-anchor clock whenever Home Assistant updates attributes or song changes
  useEffect(() => {
    const updatedAtMs = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    lastSyncRef.current = {
      basePos: rawBasePosition,
      updatedAtMs,
      title: mediaTitle
    };

    if (!isSeeking && seekPositionOverride === null) {
      if (isPlaying && updatedAt) {
        const elapsed = Math.max(0, (Date.now() - updatedAtMs) / 1000);
        const computed = rawBasePosition + elapsed;
        setDisplayPosition(duration > 0 ? Math.min(duration, computed) : computed);
      } else {
        setDisplayPosition(rawBasePosition);
      }
    }
  }, [rawBasePosition, updatedAt, mediaTitle, isPlaying, duration, isSeeking, seekPositionOverride]);

  // High-precision ticker (every 250ms) to ensure smooth, accurate, drift-free playback time
  useEffect(() => {
    if (!isPlaying || isSeeking || seekPositionOverride !== null) return;

    const tick = () => {
      const { basePos, updatedAtMs } = lastSyncRef.current;
      const now = Date.now();
      const elapsedSecs = Math.max(0, (now - updatedAtMs) / 1000);
      const exactPos = basePos + elapsedSecs;
      const clamped = duration > 0 ? Math.min(duration, exactPos) : exactPos;
      setDisplayPosition(clamped);
    };

    // Immediate initial tick
    tick();

    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [isPlaying, duration, isSeeking, seekPositionOverride]);

  const activePos = isSeeking && seekPositionOverride !== null 
    ? seekPositionOverride 
    : displayPosition;

  const effectiveDuration = duration > 0 ? duration : (activePos > 0 ? activePos * 1.5 : 220);
  const progressPercent = Math.min(100, Math.max(0, (activePos / (effectiveDuration || 1)) * 100));

  return {
    currentPosition: activePos,
    duration: duration > 0 ? duration : 0,
    progressPercent,
    isPlaying,
    formatTime: formatMediaTime
  };
}
