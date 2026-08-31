/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Memory } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { SystemHostMetrics } from '../../../../hooks/useSystemMetrics';

interface HostMemorySectionProps {
  metrics: SystemHostMetrics;
  darkMode?: boolean;
}

export function HostMemorySection({
  metrics,
  darkMode = true
}: HostMemorySectionProps) {
  const cardStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900') +
    ' p-4 sm:p-5';

  // Threshold color: ~70/90
  const memUsageColor =
    metrics.memoryUsagePercent < 70 ? '#6366F1' : metrics.memoryUsagePercent < 90 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Memory size={18} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            System Memory (RAM)
          </h3>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400 border-indigo-500/25">
            Section 3
          </span>
        </div>

        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
          Total: {metrics.memoryTotal} {metrics.memoryTotalUnit}
        </span>
      </div>

      {/* Main Card with Gauge and Merged Data Labels */}
      <div className={`${cardStyle} flex-1 flex flex-col justify-between`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Memory Utilization
          </span>
          <span
            className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${memUsageColor}1A`,
              color: memUsageColor
            }}
          >
            {metrics.memoryUsagePercent < 70 ? 'Optimal' : metrics.memoryUsagePercent < 90 ? 'Elevated' : 'Critical'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-2 flex-1 my-auto">
          {/* Left: Memory Usage Arc Gauge */}
          <div className="sm:col-span-6 w-full h-[140px] max-w-[170px] mx-auto flex items-center justify-center">
            <Gauge
              value={metrics.memoryUsagePercent}
              centerValue={metrics.memoryUsagePercent}
              defaultLabel="RAM"
              suffix="%"
              activeFill={memUsageColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>

          {/* Right: Merged Data Statistics */}
          <div className="sm:col-span-6 space-y-2">
            {/* Used Memory */}
            <div className="p-2.5 rounded-xl bg-indigo-500/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block">
                  Used Memory
                </span>
                <span className="text-sm font-black font-mono text-indigo-900 dark:text-indigo-200">
                  {metrics.memoryUsed.toFixed(1)} {metrics.memoryUsedUnit}
                </span>
              </div>
              <span className="text-xs font-mono font-extrabold text-indigo-700 dark:text-indigo-400">
                {metrics.memoryUsagePercent.toFixed(0)}%
              </span>
            </div>

            {/* Free Memory */}
            <div className="p-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.03] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Free Memory
                </span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                  {metrics.memoryFree.toFixed(1)} {metrics.memoryFreeUnit}
                </span>
              </div>
              <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400">
                {(100 - metrics.memoryUsagePercent).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
