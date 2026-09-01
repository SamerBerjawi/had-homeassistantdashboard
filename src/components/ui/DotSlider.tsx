/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DotSlider Component:
 * Modern LED dot-matrix bead slider and gauge indicator.
 * Displays a sleek row of glowing dots that dynamically adapts to container width and screen size.
 */

import React, { useState, useEffect, useRef } from 'react';

export interface DotSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  totalDots?: number;
  activeColor?: string;
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
  activeColor = 'bg-amber-400',
  activeGlowColor = 'rgba(251, 191, 36, 0.75)',
  inactiveColor = 'bg-slate-700/60 dark:bg-white/15',
  onChange,
  disabled = false,
  className = '',
  dotSizeClass = 'max-w-[8px] sm:max-w-[9px]'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(160);

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

  // Compute optimal number of dots based on measured container width (approx 1 dot per 11px)
  const computedDots = totalDots ?? Math.max(8, Math.min(24, Math.floor((containerWidth - 4) / 11)));

  const safeMin = Number(min);
  const safeMax = Number(max) > safeMin ? Number(max) : safeMin + 1;
  const safeVal = Math.min(Math.max(Number(value || 0), safeMin), safeMax);
  const fraction = (safeVal - safeMin) / (safeMax - safeMin);
  const activeDotsCount = safeVal <= safeMin ? 0 : Math.max(1, Math.round(fraction * computedDots));

  const isInteractive = typeof onChange === 'function' && !disabled;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-between w-full select-none py-1 overflow-hidden ${
        isInteractive ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {/* Visual Responsive Dot Row */}
      <div className="flex items-center justify-between w-full gap-[3px] sm:gap-1 pointer-events-none overflow-hidden">
        {Array.from({ length: computedDots }).map((_, idx) => {
          const isActive = idx < activeDotsCount;
          return (
            <span
              key={idx}
              style={
                isActive && activeGlowColor
                  ? {
                      boxShadow: `0 0 6px ${activeGlowColor}`
                    }
                  : undefined
              }
              className={`aspect-square flex-1 min-w-[3px] rounded-full shrink-0 transition-all duration-150 transform-gpu ${dotSizeClass} ${
                isActive
                  ? `${activeColor} scale-100`
                  : `${inactiveColor} scale-90 opacity-75`
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
