"use client";

/**
 * @author: @dorianbaffier
 * @description: Hold Button
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import React, { useState, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useAnimation } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const holdButtonVariants = cva("relative touch-none overflow-hidden select-none transition-all duration-200 cursor-pointer", {
  variants: {
    variant: {
      amber: [
        "bg-amber-500/20",
        "hover:bg-amber-500/25",
        "text-amber-600 dark:text-amber-400",
        "border border-amber-500/50",
      ],
      red: [
        "bg-red-500/10 dark:bg-red-500/20",
        "hover:bg-red-500/15 dark:hover:bg-red-500/25",
        "text-red-600 dark:text-red-400",
        "border border-red-500/30",
      ],
      rose: [
        "bg-rose-500/20",
        "hover:bg-rose-500/25",
        "text-rose-600 dark:text-rose-300",
        "border border-rose-500/50",
      ],
      green: [
        "bg-emerald-500/20",
        "hover:bg-emerald-500/25",
        "text-emerald-600 dark:text-emerald-300",
        "border border-emerald-500/50",
      ],
      blue: [
        "bg-blue-500/20",
        "hover:bg-blue-500/25",
        "text-blue-600 dark:text-blue-300",
        "border border-blue-500/50",
      ],
      orange: [
        "bg-amber-500/20",
        "hover:bg-amber-500/25",
        "text-amber-600 dark:text-amber-400",
        "border border-amber-500/50",
      ],
      grey: [
        "bg-gray-100 dark:bg-white/10",
        "hover:bg-gray-200 dark:hover:bg-white/15",
        "text-gray-700 dark:text-slate-300",
        "border border-black/5 dark:border-white/10",
      ],
    },
  },
  defaultVariants: {
    variant: "rose",
  },
});

export interface HoldButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof holdButtonVariants> {
  holdDuration?: number;
  onHoldComplete?: () => void;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  holdingLabel?: React.ReactNode;
  active?: boolean;
}

export function HoldButton({
  className,
  variant = "rose",
  holdDuration = 1200,
  onHoldComplete,
  icon,
  label,
  holdingLabel = "Holding...",
  active = false,
  children,
  ...props
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const isCancelledRef = useRef(false);
  const controls = useAnimation();

  async function handleHoldStart(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    isCancelledRef.current = false;
    setIsHolding(true);
    controls.set({ width: "0%" });
    
    await controls.start({
      width: "100%",
      transition: {
        duration: holdDuration / 1000,
        ease: "linear",
      },
    });

    if (!isCancelledRef.current) {
      setIsHolding(false);
      controls.set({ width: "0%" });
      onHoldComplete?.();
    }
  }

  function handleHoldEnd(e?: React.MouseEvent | React.TouchEvent) {
    e?.stopPropagation();
    isCancelledRef.current = true;
    setIsHolding(false);
    controls.stop();
    controls.start({
      width: "0%",
      transition: { duration: 0.15 },
    });
  }

  return (
    <button
      type="button"
      className={cn(
        holdButtonVariants({ variant, className }),
        isHolding && "ring-2 ring-rose-500/60 scale-[0.98]"
      )}
      onMouseDown={handleHoldStart}
      onMouseLeave={handleHoldEnd}
      onMouseUp={handleHoldEnd}
      onTouchCancel={handleHoldEnd}
      onTouchEnd={handleHoldEnd}
      onTouchStart={handleHoldStart}
      {...props}
    >
      {/* Progress fill layer */}
      <motion.div
        animate={controls}
        className={cn("absolute top-0 left-0 h-full pointer-events-none z-0", {
          "bg-rose-500/35 dark:bg-rose-500/45": variant === "rose" || variant === "red",
          "bg-emerald-500/35 dark:bg-emerald-500/45": variant === "green",
          "bg-blue-500/35 dark:bg-blue-500/45": variant === "blue",
          "bg-amber-500/35 dark:bg-amber-500/45": variant === "orange" || variant === "amber",
          "bg-gray-500/30 dark:bg-white/20": variant === "grey",
        })}
        initial={{ width: "0%" }}
      />

      {/* Button content */}
      <span className="relative z-10 flex w-full items-center justify-center gap-1.5 pointer-events-none px-1">
        {icon}
        {children ? (
          children
        ) : (
          ((isHolding && holdingLabel) || label) ? (
            <span className="font-bold text-xs tracking-tight overflow-hidden whitespace-nowrap truncate">
              {isHolding ? (holdingLabel || "Hold...") : label}
            </span>
          ) : null
        )}
      </span>
    </button>
  );
}

export default HoldButton;
