"use client";

/**
 * @author: @dorianbaffier
 * @description: Toolbar
 * @version: 1.1.0
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
  darkMode?: boolean;
  compact?: boolean;
}

const COLOR_CONFIG: Record<
  string,
  {
    activePill: string;
    inactiveIcon: string;
  }
> = {
  amber: {
    activePill: "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25",
    inactiveIcon: "text-amber-500 dark:text-amber-400 hover:bg-amber-500/10",
  },
  orange: {
    activePill: "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25",
    inactiveIcon: "text-amber-500 dark:text-amber-400 hover:bg-amber-500/10",
  },
  emerald: {
    activePill: "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/25",
    inactiveIcon: "text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10",
  },
  rose: {
    activePill: "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/25",
    inactiveIcon: "text-rose-500 dark:text-rose-400 hover:bg-rose-500/10",
  },
  indigo: {
    activePill: "bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/25",
    inactiveIcon: "text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10",
  },
  blue: {
    activePill: "bg-blue-500 text-white font-bold shadow-md shadow-blue-500/25",
    inactiveIcon: "text-blue-500 dark:text-blue-400 hover:bg-blue-500/10",
  },
  default: {
    activePill: "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/25",
    inactiveIcon: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/10",
  },
};

export function Toolbar({
  items = [],
  defaultSelected,
  selected: controlledSelected,
  className,
  onSelect,
  onHoldComplete,
  darkMode = true,
  compact = false,
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

  const iconSize = compact ? 15 : 18;

  return (
    <div
      role="tablist"
      className={cn(
        "relative flex items-center justify-between border transition-all w-full select-none backdrop-blur-xl",
        compact ? "p-0.5 sm:p-1 gap-0.5 sm:gap-1 rounded-full" : "p-1 gap-1 sm:gap-1.5 rounded-full",
        darkMode
          ? "bg-black/30 border-white/10 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.5),0_2px_6px_-1px_rgba(0,0,0,0.3)]"
          : "bg-white/80 border-slate-200/80 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.08),0_2px_6px_-1px_rgba(0,0,0,0.04)]",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => {
        const isSelected = currentSelected === item.id;
        const colorConfig = COLOR_CONFIG[item.color || "default"] || COLOR_CONFIG.default;

        // If item uses HoldButton (e.g. Arm Away)
        if (item.isHold) {
          return (
            <HoldButton
              key={item.id}
              active={isSelected}
              variant={(item.color as any) || "rose"}
              holdDuration={item.holdDuration ?? 1000}
              icon={
                <item.icon
                  size={iconSize}
                  className="shrink-0"
                  weight={isSelected ? "bold" : "duotone"}
                />
              }
              label={item.title}
              darkMode={darkMode}
              compact={compact}
              activeBg={item.activeBg || colorConfig.activePill}
              onHoldComplete={() => {
                if (item.onHoldComplete) {
                  item.onHoldComplete();
                } else if (onHoldComplete) {
                  onHoldComplete(item.id);
                }
              }}
              onClick={(e) => handleItemClick(item.id, e)}
            />
          );
        }

        // Standard toolbar tab button
        if (isSelected) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => handleItemClick(item.id, e)}
              className={cn(
                "flex-1 min-w-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 cursor-pointer select-none shrink-0",
                compact
                  ? "h-7 sm:h-8 px-2 sm:px-2.5 gap-1 text-[11px]"
                  : "h-9 sm:h-10 px-3.5 sm:px-4 gap-1.5 sm:gap-2 text-xs",
                item.activeBg || colorConfig.activePill
              )}
            >
              <item.icon size={iconSize} className="shrink-0" weight="bold" />
              <AnimatePresence initial={false}>
                <motion.span
                  key="title"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden whitespace-nowrap tracking-tight truncate"
                >
                  {item.title}
                </motion.span>
              </AnimatePresence>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            aria-label={item.title}
            onClick={(e) => handleItemClick(item.id, e)}
            className={cn(
              "rounded-full flex items-center justify-center shrink-0",
              compact
                ? "w-7 h-7 sm:w-8 sm:h-8"
                : "w-9 h-9 sm:w-10 sm:h-10",
              "transition-all duration-200 cursor-pointer select-none active:scale-90",
              colorConfig.inactiveIcon
            )}
          >
            <item.icon size={iconSize} className="shrink-0" weight="duotone" />
          </button>
        );
      })}
    </div>
  );
}

export default Toolbar;
