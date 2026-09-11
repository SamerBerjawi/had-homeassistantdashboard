"use client";

/**
 * @author: @dorianbaffier
 * @description: Toolbar
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import HoldButton from "./hold-button";

export interface ToolbarItem {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color?: "orange" | "amber" | "emerald" | "rose" | "indigo" | "blue" | "default";
  activeBg?: string;
  isHold?: boolean;
  holdDuration?: number;
  onHoldComplete?: () => void;
}

export interface ToolbarProps {
  items?: ToolbarItem[];
  defaultSelected?: string;
  selected?: string | null;
  className?: string;
  activeColor?: string;
  onSelect?: (itemId: string) => void;
  onHoldComplete?: (itemId: string) => void;
  showNotification?: boolean;
  showToggle?: boolean;
}

const buttonVariants = {
  initial: {
    gap: "0.25rem",
    paddingLeft: ".6rem",
    paddingRight: ".6rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : "0.25rem",
    paddingLeft: isSelected ? "1rem" : ".6rem",
    paddingRight: isSelected ? "1rem" : ".6rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { type: "spring", bounce: 0, duration: 0.35 };

const COLOR_ACTIVE_CLASSES: Record<string, string> = {
  orange: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50 shadow-md shadow-amber-500/10 font-bold",
  amber: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50 shadow-md shadow-amber-500/10 font-bold",
  emerald: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/10 font-bold",
  rose: "bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/50 shadow-md shadow-rose-500/10 font-bold",
  indigo: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/50 shadow-md shadow-indigo-500/10 font-bold",
  blue: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/50 shadow-md shadow-blue-500/10 font-bold",
  default: "bg-white/20 text-white border border-white/30 font-bold",
};

const INACTIVE_CLASS =
  "bg-white/5 dark:bg-white/[0.04] hover:bg-white/10 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-black/5 dark:border-white/10";

export function Toolbar({
  items = [],
  defaultSelected,
  selected: controlledSelected,
  className,
  onSelect,
  onHoldComplete,
}: ToolbarProps) {
  const [internalSelected, setInternalSelected] = React.useState<string | null>(
    defaultSelected ?? null
  );

  const isControlled = controlledSelected !== undefined;
  const currentSelected = isControlled ? controlledSelected : internalSelected;

  const handleItemClick = (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isControlled) {
      setInternalSelected(currentSelected === itemId ? null : itemId);
    }
    onSelect?.(itemId);
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-2 p-0 w-full transition-all duration-200",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between w-full gap-2">
        {items.map((item) => {
          const isSelected = currentSelected === item.id;
          const activeClass = item.activeBg || COLOR_ACTIVE_CLASSES[item.color || "default"] || COLOR_ACTIVE_CLASSES.default;

          // If item uses HoldButton (e.g. Arm Away)
          if (item.isHold) {
            return (
              <HoldButton
                key={item.id}
                variant="rose"
                holdDuration={item.holdDuration ?? 1000}
                active={isSelected}
                onHoldComplete={() => {
                  if (item.onHoldComplete) {
                    item.onHoldComplete();
                  } else if (onHoldComplete) {
                    onHoldComplete(item.id);
                  }
                }}
                className={cn(
                  "h-11 sm:h-12 rounded-2xl px-2 font-bold text-xs transition-all duration-200 cursor-pointer select-none flex-1 min-w-0",
                  isSelected ? activeClass : INACTIVE_CLASS
                )}
                icon={<item.icon size={20} className="w-5 h-5 size-5 shrink-0" weight={isSelected ? "duotone" : "regular"} />}
                label={isSelected ? item.title : undefined}
                holdingLabel="Hold..."
              />
            );
          }

          // Standard toolbar animated button
          return (
            <motion.button
              key={item.id}
              animate="animate"
              initial={false}
              custom={isSelected}
              variants={buttonVariants as any}
              transition={transition as any}
              onClick={(e) => handleItemClick(item.id, e)}
              className={cn(
                "h-11 sm:h-12 relative flex items-center justify-center rounded-2xl px-2",
                "font-bold text-xs transition-all duration-200 cursor-pointer select-none flex-1 min-w-0",
                isSelected ? activeClass : INACTIVE_CLASS
              )}
            >
              <item.icon
                size={20}
                className="w-5 h-5 size-5 shrink-0"
                weight={isSelected ? "duotone" : "regular"}
              />
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.span
                    key="title"
                    animate="animate"
                    exit="exit"
                    initial="initial"
                    variants={spanVariants as any}
                    transition={transition as any}
                    className="overflow-hidden whitespace-nowrap text-xs font-bold tracking-tight"
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default Toolbar;
