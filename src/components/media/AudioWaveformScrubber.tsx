/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';

interface AudioWaveformScrubberProps {
  title?: string;
  artist?: string;
  duration: number; // in seconds
  currentPosition: number; // in seconds
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  accentColor?: 'purple' | 'pink' | 'cyan' | 'emerald';
  darkMode?: boolean;
  barCount?: number;
}

/**
 * Deterministic pseudo-random number generator based on string seed.
 * Produces realistic musical audio waveform peaks for any song title & artist.
 */
function generateTrackWaveform(title: string = '', artist: string = '', bars: number = 48): number[] {
  const seedStr = `${title}-${artist}-${title.length * 31}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  const heights: number[] = [];
  let prev = 35;

  for (let i = 0; i < bars; i++) {
    // Dynamic envelope: softer start/end, punchy chorus/mid-sections
    const progress = i / bars;
    const envelope = Math.sin(progress * Math.PI); // 0 at edges, 1 in center
    
    // Pseudo random fluctuation
    const pseudoRand = Math.abs(Math.sin(hash + i * 12.9898) * 43758.5453) % 1;
    const rawVariation = (pseudoRand * 60) + 20;
    
    // Blend with previous bar for smooth natural musical continuity
    const smoothVal = (prev * 0.4) + (rawVariation * 0.6);
    prev = smoothVal;

    // Apply envelope with a minimum height floor (18%) and max (96%)
    const finalHeight = Math.min(96, Math.max(18, (smoothVal * 0.65) + (envelope * 35)));
    heights.push(Math.round(finalHeight));
  }

  return heights;
}

function formatTime(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function AudioWaveformScrubber({
  title = 'Audio Track',
  artist = 'Unknown Artist',
  duration,
  currentPosition,
  isPlaying,
  onSeek,
  accentColor = 'purple',
  darkMode = true,
  barCount = 48
}: AudioWaveformScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  // Generate deterministic audio peak profile for this song
  const rawBars = useMemo(() => {
    return generateTrackWaveform(title, artist, barCount);
  }, [title, artist, barCount]);

  const effectiveDuration = duration > 0 ? duration : 220;
  const activePosition = isDragging && dragPosition !== null ? dragPosition : currentPosition;
  const progressRatio = Math.min(1, Math.max(0, activePosition / effectiveDuration));
  const activeBarIndex = Math.floor(progressRatio * barCount);

  // Calculate seek position from clientX coordinate
  const calcPositionFromEvent = (clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    return Math.round(ratio * effectiveDuration);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const newPos = calcPositionFromEvent(e.clientX);
    setDragPosition(newPos);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pos = calcPositionFromEvent(e.clientX);
    setHoverPosition(pos);
    if (isDragging) {
      setDragPosition(pos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const finalPos = calcPositionFromEvent(e.clientX);
      setIsDragging(false);
      setDragPosition(null);
      onSeek(finalPos);
    }
  };

  const handlePointerLeave = () => {
    setHoverPosition(null);
    if (isDragging) {
      setIsDragging(false);
      if (dragPosition !== null) {
        onSeek(dragPosition);
      }
      setDragPosition(null);
    }
  };

  const themeGradients = {
    purple: {
      played: 'bg-gradient-to-t from-purple-600 via-purple-500 to-pink-400 shadow-purple-500/50',
      head: 'bg-pink-400 ring-purple-400',
      glow: 'from-purple-500/30 via-pink-500/20'
    },
    pink: {
      played: 'bg-gradient-to-t from-pink-600 via-rose-500 to-amber-300 shadow-pink-500/50',
      head: 'bg-amber-300 ring-rose-400',
      glow: 'from-pink-500/30 via-rose-500/20'
    },
    cyan: {
      played: 'bg-gradient-to-t from-cyan-600 via-teal-400 to-emerald-300 shadow-cyan-500/50',
      head: 'bg-emerald-300 ring-cyan-400',
      glow: 'from-cyan-500/30 via-teal-500/20'
    },
    emerald: {
      played: 'bg-gradient-to-t from-emerald-600 via-emerald-400 to-lime-300 shadow-emerald-500/50',
      head: 'bg-lime-300 ring-emerald-400',
      glow: 'from-emerald-500/30 via-emerald-500/20'
    }
  }[accentColor];

  return (
    <div className="w-full max-w-sm select-none my-2 space-y-1.5">
      {/* Interactive Waveform Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative h-12 w-full flex items-center justify-between gap-[2.5px] cursor-pointer group px-1 py-1 rounded-xl hover:bg-black/10 dark:hover:bg-white/5 transition-colors"
        title="Click or drag to scrub"
      >
        {/* Playhead Hover Tooltip */}
        {hoverPosition !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[10px] font-mono font-bold shadow-xl border border-white/10 pointer-events-none z-20 whitespace-nowrap backdrop-blur-md"
            style={{
              left: `${Math.max(20, Math.min(containerRef.current ? containerRef.current.clientWidth - 20 : 0, (hoverPosition / effectiveDuration) * (containerRef.current ? containerRef.current.clientWidth : 0)))}px`
            }}
          >
            {formatTime(hoverPosition)}
          </div>
        )}

        {/* Ambient Waveform Backlight Reflection */}
        {isPlaying && (
          <div
            className={`absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t ${themeGradients.glow} to-transparent blur-md opacity-70 pointer-events-none`}
            style={{ width: `${progressRatio * 100}%` }}
          />
        )}

        {/* Waveform Bars */}
        {rawBars.map((heightPercent, index) => {
          const isPlayed = index <= activeBarIndex;
          const isCurrentPeak = isPlaying && index === activeBarIndex;
          const isAdjacentPeak = isPlaying && Math.abs(index - activeBarIndex) <= 2;

          return (
            <div
              key={index}
              className="flex-1 flex items-center justify-center h-full relative"
            >
              <div
                className={`w-full rounded-full transition-all duration-150 ${
                  isPlayed
                    ? `${themeGradients.played} shadow-xs`
                    : darkMode
                      ? 'bg-white/20 hover:bg-white/35'
                      : 'bg-slate-300/80 hover:bg-slate-400'
                } ${
                  isCurrentPeak
                    ? 'animate-pulse scale-y-110 brightness-125'
                    : isAdjacentPeak
                      ? 'scale-y-105'
                      : ''
                }`}
                style={{
                  height: `${heightPercent}%`,
                  minHeight: '4px'
                }}
              />
            </div>
          );
        })}

        {/* Glowing Playhead Scrubber Line */}
        <div
          className="absolute top-1 bottom-1 w-[2.5px] rounded-full pointer-events-none transition-all duration-100 z-10"
          style={{
            left: `${progressRatio * 100}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className={`w-full h-full ${themeGradients.head} shadow-md shadow-purple-500/80`} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white ring-2 ring-purple-500 shadow-md" />
        </div>
      </div>

      {/* Time Legend (Elapsed / Remaining / Total) */}
      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-1">
        <span className="text-purple-600 dark:text-purple-300 font-bold">{formatTime(activePosition)}</span>
        <span className="text-slate-400 dark:text-slate-500">-{formatTime(Math.max(0, effectiveDuration - activePosition))} / {formatTime(effectiveDuration)}</span>
      </div>
    </div>
  );
}
