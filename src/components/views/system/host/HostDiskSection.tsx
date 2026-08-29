/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { HardDrive } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
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
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10 text-white'
      : 'bg-white/70 border-slate-200/80 text-slate-900') +
    ' p-3.5 sm:p-4';

  // Threshold color: ~80/95
  const diskUsageColor =
    metrics.diskUsagePercent < 80 ? '#3B82F6' : metrics.diskUsagePercent < 95 ? '#F59E0B' : '#EF4444';

  // Pie chart data: Used vs Free
  const donutData = useMemo(() => {
    return [
      {
        label: 'Used Storage',
        value: metrics.diskUsed,
        fill: '#3B82F6' // Blue
      },
      {
        label: 'Free Storage',
        value: metrics.diskFree,
        fill: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
      }
    ];
  }, [metrics.diskUsed, metrics.diskFree, darkMode]);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <HardDrive size={18} weight="duotone" className="text-blue-500 dark:text-blue-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Primary Storage (Disk)
        </h3>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-blue-500/10 dark:bg-blue-500/15 text-blue-800 dark:text-blue-400 border-blue-500/25">
          Section 4
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: Disk Usage Gauge (1/2 on mobile, 5 cols on desktop) */}
        <div className={`col-span-1 lg:col-span-5 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[260px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
              Disk Utilization
            </span>
            <span
              className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: `${diskUsageColor}1A`,
                color: diskUsageColor
              }}
            >
              {metrics.diskUsagePercent < 80 ? 'Healthy' : metrics.diskUsagePercent < 95 ? 'Warning' : 'Critical'}
            </span>
          </div>

          <div className="w-full h-[130px] sm:h-[155px] max-w-[170px] mx-auto my-auto flex items-center justify-center">
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
        </div>

        {/* Right: Used vs Free Pie / Donut Chart (1/2 on mobile, 7 cols on desktop) */}
        <div className={`col-span-1 lg:col-span-7 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[260px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
              Storage Capacity
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-500">
              {metrics.diskTotal} {metrics.diskTotalUnit}
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
                  defaultLabel="Disk"
                  suffix=""
                >
                  {({ isHovered, data }) => (
                    <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        {isHovered ? data.label : 'Used'}
                      </span>
                      <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-tight">
                        {isHovered ? data.value.toFixed(1) : metrics.diskUsed.toFixed(1)}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-bold text-blue-400">
                        {metrics.diskTotalUnit}
                      </span>
                    </div>
                  )}
                </PieCenter>
              </PieChart>
            </div>

            {/* Breakdown Cards */}
            <div className="w-full sm:col-span-6 space-y-1.5 sm:space-y-2.5">
              <div className="p-1.5 sm:p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-400 block">
                    Used
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-blue-300">
                    {metrics.diskUsed.toFixed(1)} {metrics.diskUsedUnit}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-blue-400">
                  {metrics.diskUsagePercent.toFixed(0)}%
                </span>
              </div>

              <div className="p-1.5 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Free
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-200">
                    {metrics.diskFree.toFixed(1)} {metrics.diskFreeUnit}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400">
                  {(100 - metrics.diskUsagePercent).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
