/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';

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
  layout?: 'stacked' | 'inline';
}

/**
 * High-Resolution deterministic pseudo-random waveform generator.
 * Produces intricate, multi-harmonic musical peaks with verse/chorus dynamic curves,
 * harmonic micro-steps, and natural audio track mastering profiles.
 */
function generateTrackWaveform(title: string = '', artist: string = '', bars: number = 64): number[] {
  const seedStr = `${title}-${artist}-${title.length * 31}-${artist.length * 17}`;
  let hash1 = 0;
  let hash2 = 0;

  for (let i = 0; i < seedStr.length; i++) {
    const code = seedStr.charCodeAt(i);
    hash1 = (hash1 << 5) - hash1 + code;
    hash1 |= 0;
    hash2 = (hash2 << 7) + hash2 ^ code;
    hash2 |= 0;
  }

  const heights: number[] = [];
  let prevVal = 35;

  for (let i = 0; i < bars; i++) {
    const progress = i / bars;

    // Macro Song Structure (Intro, Verse 1, Chorus, Verse 2, Climax, Outro)
    const introEnvelope = Math.sin(Math.min(1, progress * 4) * (Math.PI / 2));
    const outroEnvelope = Math.sin(Math.min(1, (1 - progress) * 4) * (Math.PI / 2));
    const macroEnvelope = introEnvelope * outroEnvelope;

    // Chorus / Climax Energy Waves (Rhythmic Peaks at 30% and 70%)
    const chorus1 = Math.exp(-Math.pow((progress - 0.35) * 8, 2)) * 32;
    const chorus2 = Math.exp(-Math.pow((progress - 0.75) * 8, 2)) * 40;
    const rhythmicHarmonic = Math.sin(progress * Math.PI * 16) * 12;

    // Pseudo-random high-frequency texture & micro-steps
    const rand1 = Math.abs(Math.sin(hash1 + i * 14.1234) * 43758.5453) % 1;
    const rand2 = Math.abs(Math.cos(hash2 + i * 29.5678) * 23421.6789) % 1;
    const microTexture = rand1 * 40 + rand2 * 20;

    // Composite raw audio energy
    const rawEnergy = 20 + chorus1 + chorus2 + rhythmicHarmonic + microTexture;

    // Smooth blending with previous bar for authentic frequency continuity
    const blended = prevVal * 0.35 + rawEnergy * 0.65;
    prevVal = blended;

    // Final scaling with min floor (14%) and max ceiling (98%)
    const finalHeight = Math.min(98, Math.max(14, (blended * 0.7) + (macroEnvelope * 22)));
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
  barCount = 64,
  layout = 'stacked'
}: AudioWaveformScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  // Generate high-resolution audio peak profile for this song
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
      played: 'bg-gradient-to-t from-violet-600 via-purple-500 to-pink-300 shadow-purple-500/60',
      head: 'bg-pink-300 ring-purple-400',
      glow: 'from-purple-500/35 via-pink-500/20'
    },
    pink: {
      played: 'bg-gradient-to-t from-pink-600 via-rose-500 to-amber-300 shadow-pink-500/60',
      head: 'bg-amber-300 ring-rose-400',
      glow: 'from-pink-500/35 via-rose-500/20'
    },
    cyan: {
      played: 'bg-gradient-to-t from-cyan-600 via-teal-400 to-emerald-300 shadow-cyan-500/60',
      head: 'bg-emerald-300 ring-cyan-400',
      glow: 'from-cyan-500/35 via-teal-500/20'
    },
    emerald: {
      played: 'bg-gradient-to-t from-emerald-600 via-emerald-400 to-lime-300 shadow-emerald-500/60',
      head: 'bg-lime-300 ring-emerald-400',
      glow: 'from-emerald-500/35 via-emerald-500/20'
    }
  }[accentColor];

  const waveformCanvas = (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="relative h-11 w-full flex-1 flex items-center justify-between gap-[1.5px] sm:gap-[2px] cursor-pointer group px-0.5 py-1"
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

      {/* High-Resolution Waveform Bars */}
      {rawBars.map((heightPercent, index) => {
        const isPlayed = index <= activeBarIndex;
        const isCurrentPeak = isPlaying && index === activeBarIndex;
        const isAdjacentPeak = isPlaying && Math.abs(index - activeBarIndex) <= 2;

        return (
          <div
            key={index}
            className="flex-1 flex items-center justify-center h-full relative min-w-[1px]"
          >
            <div
              className={`w-full rounded-full transition-all duration-100 ${
                isPlayed
                  ? `${themeGradients.played} shadow-xs`
                  : darkMode
                    ? 'bg-white/18 hover:bg-white/35'
                    : 'bg-slate-300/80 hover:bg-slate-400'
              } ${
                isCurrentPeak
                  ? 'animate-pulse scale-y-110 brightness-130'
                  : isAdjacentPeak
                    ? 'scale-y-105'
                    : ''
              }`}
              style={{
                height: `${heightPercent}%`,
                minHeight: '3px'
              }}
            />
          </div>
        );
      })}

      {/* Glowing Playhead Scrubber Pin */}
      <div
        className="absolute top-1 bottom-1 w-[2.5px] rounded-full pointer-events-none transition-all duration-75 z-10"
        style={{
          left: `${progressRatio * 100}%`,
          transform: 'translateX(-50%)'
        }}
      >
        <div className={`w-full h-full ${themeGradients.head} shadow-md shadow-purple-500/80`} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-purple-500 shadow-md" />
      </div>
    </div>
  );

  if (layout === 'inline') {
    return (
      <div className="w-full flex items-center gap-2 sm:gap-2.5 select-none py-0.5">
        <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-300 shrink-0 min-w-[32px]">
          {formatTime(activePosition)}
        </span>
        {waveformCanvas}
        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0 min-w-[36px] text-right">
          -{formatTime(Math.max(0, effectiveDuration - activePosition))}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm select-none my-2 space-y-1.5">
      {waveformCanvas}
      {/* Time Legend (Elapsed / Remaining / Total) */}
      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-1">
        <span className="text-purple-600 dark:text-purple-300 font-bold">{formatTime(activePosition)}</span>
        <span className="text-slate-400 dark:text-slate-500">-{formatTime(Math.max(0, effectiveDuration - activePosition))} / {formatTime(effectiveDuration)}</span>
      </div>
    </div>
  );
}
