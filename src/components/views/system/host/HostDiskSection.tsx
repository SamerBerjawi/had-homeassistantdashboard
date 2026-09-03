/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HardDrive } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { SystemHostMetrics } from '../../../../hooks/useSystemMetrics';

interface HostDiskSectionProps {
  metrics: SystemHostMetrics;
  darkMode?: boolean;
}

export function HostDiskSection({
  metrics,
  darkMode = true
}: HostDiskSectionProps) {
  const cardStyle =
    'rounded-3xl backdrop-blur-2xl transition-all overflow-hidden isolate ' +
    (darkMode
      ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80') +
    ' p-4 sm:p-5';

  // Threshold color: ~80/95
  const diskUsageColor =
    metrics.diskUsagePercent < 80 ? '#3B82F6' : metrics.diskUsagePercent < 95 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <HardDrive size={18} weight="duotone" className="text-blue-500 dark:text-blue-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Primary Storage (Disk)
          </h3>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-blue-500/10 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-500/25">
            Section 4
          </span>
        </div>

        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
          Total: {metrics.diskTotal} {metrics.diskTotalUnit}
        </span>
      </div>

      {/* Main Card with Gauge and Merged Data Labels */}
      <div className={`${cardStyle} flex-1 flex flex-col justify-between`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Disk Utilization
          </span>
          <span
            className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${diskUsageColor}1A`,
              color: diskUsageColor
            }}
          >
            {metrics.diskUsagePercent < 80 ? 'Healthy' : metrics.diskUsagePercent < 95 ? 'Elevated' : 'Critical'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-2 flex-1 my-auto">
          {/* Left: Disk Usage Arc Gauge */}
          <div className="sm:col-span-6 w-full h-[140px] max-w-[170px] mx-auto flex items-center justify-center">
            <Gauge
              value={metrics.diskUsagePercent}
              centerValue={metrics.diskUsagePercent}
              defaultLabel="DISK"
              suffix="%"
              activeFill={diskUsageColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>

          {/* Right: Merged Data Statistics */}
          <div className="sm:col-span-6 space-y-2">
            {/* Used Storage */}
            <div className="p-2.5 rounded-xl bg-blue-500/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 block">
                  Used Storage
                </span>
                <span className="text-sm font-black font-mono text-blue-900 dark:text-blue-200">
                  {metrics.diskUsed.toFixed(1)} {metrics.diskUsedUnit}
                </span>
              </div>
              <span className="text-xs font-mono font-extrabold text-blue-700 dark:text-blue-400">
                {metrics.diskUsagePercent.toFixed(0)}%
              </span>
            </div>

            {/* Free Storage */}
            <div className="p-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.03] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Free Storage
                </span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                  {metrics.diskFree.toFixed(1)} {metrics.diskFreeUnit}
                </span>
              </div>
              <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400">
                {(100 - metrics.diskUsagePercent).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
