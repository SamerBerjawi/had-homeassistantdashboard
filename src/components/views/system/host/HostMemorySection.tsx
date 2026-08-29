/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Memory } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
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
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10 text-white'
      : 'bg-white/70 border-slate-200/80 text-slate-900') +
    ' p-3.5 sm:p-4';

  // Threshold color: ~70/90
  const memUsageColor =
    metrics.memoryUsagePercent < 70 ? '#6366F1' : metrics.memoryUsagePercent < 90 ? '#F59E0B' : '#EF4444';

  // Pie chart data: Used vs Free
  const donutData = useMemo(() => {
    return [
      {
        label: 'Used Memory',
        value: metrics.memoryUsed,
        fill: '#6366F1' // Indigo
      },
      {
        label: 'Free Memory',
        value: metrics.memoryFree,
        fill: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
      }
    ];
  }, [metrics.memoryUsed, metrics.memoryFree, darkMode]);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Memory size={18} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          System Memory (RAM)
        </h3>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-400 border-indigo-500/25">
          Section 3
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: Memory Usage Gauge (1/2 on mobile, 5 cols on desktop) */}
        <div className={`col-span-1 lg:col-span-5 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[260px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
              Memory Utilization
            </span>
            <span
              className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: `${memUsageColor}1A`,
                color: memUsageColor
              }}
            >
              {metrics.memoryUsagePercent < 70 ? 'Optimal' : metrics.memoryUsagePercent < 90 ? 'High' : 'Critical'}
            </span>
          </div>

          <div className="w-full h-[130px] sm:h-[155px] max-w-[170px] mx-auto my-auto flex items-center justify-center">
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
        </div>

        {/* Right: Used vs Free Pie / Donut Chart (1/2 on mobile, 7 cols on desktop) */}
        <div className={`col-span-1 lg:col-span-7 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[260px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
              Memory Allocation
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-500">
              {metrics.memoryTotal} {metrics.memoryTotalUnit}
            </span>
          </div>

          <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 items-center py-2 my-auto">
            {/* Donut */}
            <div className="sm:col-span-6 relative w-[125px] h-[125px] sm:w-[150px] sm:h-[150px] mx-auto flex items-center justify-center">
              <PieChart
                data={donutData}
                innerRadius={44}
                padAngle={0.04}
                cornerRadius={6}
                size={135}
                className="w-full h-full"
              >
                {donutData.map((_, i) => (
                  <PieSlice key={i} index={i} />
                ))}
                <PieCenter
                  defaultLabel="RAM"
                  suffix=""
                >
                  {({ isHovered, data }) => (
                    <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        {isHovered ? data.label : 'Used'}
                      </span>
                      <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-tight">
                        {isHovered ? data.value.toFixed(1) : metrics.memoryUsed.toFixed(1)}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-bold text-indigo-400">
                        {metrics.memoryTotalUnit}
                      </span>
                    </div>
                  )}
                </PieCenter>
              </PieChart>
            </div>

            {/* Breakdown Cards */}
            <div className="w-full sm:col-span-6 space-y-1.5 sm:space-y-2.5">
              <div className="p-1.5 sm:p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Used
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-indigo-300">
                    {metrics.memoryUsed.toFixed(1)} {metrics.memoryUsedUnit}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-400">
                  {metrics.memoryUsagePercent.toFixed(0)}%
                </span>
              </div>

              <div className="p-1.5 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Free
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-200">
                    {metrics.memoryFree.toFixed(1)} {metrics.memoryFreeUnit}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">
                  {(100 - metrics.memoryUsagePercent).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
