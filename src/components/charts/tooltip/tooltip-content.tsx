/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { ReactNode } from "react";
import { intFmt } from "../chart-formatters";

export interface TooltipRow {
  color: string;
  label: string;
  value: string | number;
}

export interface TooltipContentProps {
  title?: string;
  rows: TooltipRow[];
  /** Optional additional content (e.g., markers) */
  children?: ReactNode;
}

export function TooltipContent({ title, rows, children }: TooltipContentProps) {
  return (
    <div className="overflow-hidden">
      <div className="px-3.5 py-2.5">
        {title && (
          <div className="mb-2 text-left font-bold text-slate-800 dark:text-slate-100 text-xs pb-1.5 border-b border-slate-200/80 dark:border-white/10 tracking-tight">
            {title}
          </div>
        )}
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div
              className="flex items-center justify-between gap-4"
              key={`${row.label}-${row.color}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                  {row.label}
                </span>
              </div>
              <span className="font-bold font-mono text-slate-900 dark:text-white text-xs tabular-nums">
                {typeof row.value === "number" ? intFmt(row.value) : row.value}
              </span>
            </div>
          ))}
        </div>

        {children && (
          <div className="mt-2 transition-opacity duration-200 ease-out">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

TooltipContent.displayName = "TooltipContent";

export default TooltipContent;
