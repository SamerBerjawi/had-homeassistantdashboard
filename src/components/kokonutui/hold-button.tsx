"use client";

/**
 * @author: @dorianbaffier
 * @description: Hold Button
 * @version: 1.1.0
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import React, { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface HoldButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "rose" | "amber" | "green" | "blue" | "orange" | "grey" | "red";
  holdDuration?: number;
  onHoldComplete?: () => void;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  holdingLabel?: React.ReactNode;
  active?: boolean;
  activeBg?: string;
  darkMode?: boolean;
  compact?: boolean;
}

export function HoldButton({
  className,
  variant = "rose",
  holdDuration = 1000,
  onHoldComplete,
  icon,
  label,
  holdingLabel = "Holding...",
  active = false,
  activeBg,
  darkMode = true,
  compact = false,
  onClick,
  ...props
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (active) return; // Already in this mode

    completedRef.current = false;
    setIsHolding(true);
    setProgress(0);
    holdStartTimeRef.current = performance.now();

    const loop = (time: number) => {
      if (!holdStartTimeRef.current) return;
      const elapsed = time - holdStartTimeRef.current;
      const currentProgress = Math.min(1, elapsed / holdDuration);
      setProgress(currentProgress);

      if (currentProgress >= 1) {
        completedRef.current = true;
        setIsHolding(false);
        setProgress(0);
        holdStartTimeRef.current = null;
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(50);
          } catch {}
        }
        onHoldComplete?.();
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const endHold = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    if (active) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // If hold was released early and didn't complete
    if (isHolding && !completedRef.current) {
      const elapsed = holdStartTimeRef.current ? performance.now() - holdStartTimeRef.current : 0;
      // If user tapped briefly without holding, show helper hint
      if (elapsed < 350) {
        setShowHint(true);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = setTimeout(() => setShowHint(false), 1600);
      }
    }

    setIsHolding(false);
    setProgress(0);
    holdStartTimeRef.current = null;
  };

  // 1. ACTIVE PILL STATE
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex-1 min-w-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 cursor-pointer select-none shrink-0",
          compact
            ? "h-7 sm:h-8 px-2 sm:px-2.5 gap-1 text-[11px]"
            : "h-9 sm:h-10 px-3.5 sm:px-4 gap-1.5 sm:gap-2 text-xs",
          activeBg || "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/25",
          className
        )}
      >
        {icon}
        <span className="overflow-hidden whitespace-nowrap tracking-tight truncate">
          {label}
        </span>
      </button>
    );
  }

  // 2. INACTIVE MINIMIZED CIRCULAR ICON WITH HOLD BEHAVIOR
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <button
        type="button"
        title={typeof label === "string" ? label : "Hold to arm"}
        aria-label={typeof label === "string" ? label : "Hold to arm"}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onTouchCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "rounded-full flex items-center justify-center shrink-0 relative",
          compact
            ? "w-7 h-7 sm:w-8 sm:h-8"
            : "w-9 h-9 sm:w-10 sm:h-10",
          "transition-all duration-200 select-none touch-none cursor-pointer",
          "text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95",
          isHolding && "scale-105 shadow-md shadow-rose-500/20 bg-rose-500/15",
          className
        )}
        {...props}
      >
        {/* Circular SVG Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 origin-center pointer-events-none p-0.5"
          viewBox="0 0 36 36"
        >
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="opacity-15 text-rose-500"
          />
          {progress > 0 && (
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="94.25"
              strokeDashoffset={94.25 * (1 - progress)}
              strokeLinecap="round"
              className="text-rose-500"
            />
          )}
        </svg>

        <div className="relative z-10 flex items-center justify-center pointer-events-none">
          {icon}
        </div>
      </button>

      {/* Floating hints */}
      <AnimatePresence>
        {isHolding && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 dark:bg-black/95 text-[10px] font-bold text-rose-400 whitespace-nowrap shadow-lg border border-rose-500/30 pointer-events-none z-30"
          >
            {holdingLabel || "Holding..."}
          </motion.div>
        )}
        {!isHolding && showHint && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 dark:bg-black/95 text-[10px] font-bold text-rose-400 whitespace-nowrap shadow-lg border border-rose-500/30 pointer-events-none z-30"
          >
            Hold to Arm
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HoldButton;
