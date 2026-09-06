/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DotSlider Component (Bento Capsule Slider)
 * Modern hi-fi tactile capsule slider and level gauge.
 * Features an integrated recessed glass track with curated, rounded pill segments,
 * luminous leading indicator, smooth touch/mouse scrubbing, and adaptive sizing.
 */

import React, { useState, useEffect, useRef } from 'react';

export interface DotSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  totalDots?: number;
  activeColor?: string;
  activeStyle?: React.CSSProperties;
  activeGlowColor?: string;
  inactiveColor?: string;
  onChange?: (val: number) => void;
  disabled?: boolean;
  className?: string;
  dotSizeClass?: string;
}

export const DotSlider: React.FC<DotSliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  totalDots,
  activeColor = 'bg-amber-400 dark:bg-amber-400',
  activeStyle,
  activeGlowColor = 'rgba(251, 191, 36, 0.3)',
  inactiveColor = 'bg-slate-300/60 dark:bg-white/10',
  onChange,
  disabled = false,
  className = '',
  dotSizeClass
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(180);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };

    updateWidth();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) setContainerWidth(w);
        }
      });
      resizeObserver.observe(el);
    } else {
      window.addEventListener('resize', updateWidth);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Curated segment count: smaller, sleek pills
  const computedDots =
    totalDots ??
    (containerWidth < 130 ? 10 : containerWidth < 200 ? 12 : containerWidth < 300 ? 14 : 16);

  const safeMin = Number(min);
  const safeMax = Number(max) > safeMin ? Number(max) : safeMin + 1;
  const safeVal = Math.min(Math.max(Number(value || 0), safeMin), safeMax);
  const fraction = (safeVal - safeMin) / (safeMax - safeMin);
  const activeDotsCount = safeVal <= safeMin ? 0 : Math.max(1, Math.round(fraction * computedDots));

  const isInteractive = typeof onChange === 'function' && !disabled;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center w-full select-none py-1 ${
        isInteractive ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {/* Capsule Pill Row */}
      <div
        className="flex items-center justify-between w-full h-1.5 sm:h-2 gap-1 sm:gap-1.5 pointer-events-none"
      >
        {Array.from({ length: computedDots }).map((_, idx) => {
          const isActive = idx < activeDotsCount;
          const isLeading = idx === activeDotsCount - 1 && isActive;

          return (
            <span
              key={idx}
              style={
                isActive
                  ? {
                      ...activeStyle,
                      boxShadow:
                        isLeading && activeGlowColor
                          ? `0 0 6px ${activeGlowColor}`
                          : activeGlowColor
                          ? `0 0 2px ${activeGlowColor}`
                          : undefined
                    }
                  : undefined
              }
              className={`h-full flex-1 rounded-full transition-all duration-200 transform-gpu ${
                dotSizeClass ? dotSizeClass : 'max-w-[12px] sm:max-w-[14px]'
              } ${
                isActive
                  ? `${activeColor} ${
                      isLeading
                        ? 'brightness-110 scale-y-110'
                        : 'opacity-90'
                    }`
                  : `${inactiveColor} opacity-70`
              }`}
            />
          );
        })}
      </div>

      {/* Invisible Interactive Range Slider Overlay */}
      {isInteractive && (
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={safeVal}
          disabled={disabled}
          onChange={(e) => {
            const nextVal = Number(e.target.value);
            onChange(nextVal);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0 p-0"
        />
      )}
    </div>
  );
};

export default DotSlider;
