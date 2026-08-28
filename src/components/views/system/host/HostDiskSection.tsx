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
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100') +
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
        <HardDrive size={18} weight="duotone" className="text-blue-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Primary Storage (Disk)
        </h3>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400">
          Section 4
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        {/* Left: Disk Usage Gauge (5 cols) */}
        <div className={`md:col-span-5 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Disk Utilization
            </span>
            <span
              className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
              style={{
                backgroundColor: `${diskUsageColor}1A`,
                color: diskUsageColor
              }}
            >
              {metrics.diskUsagePercent < 80 ? 'Healthy' : metrics.diskUsagePercent < 95 ? 'Warning' : 'Critical'}
            </span>
          </div>

          <div className="w-full h-[140px] max-w-[170px] mx-auto my-auto flex items-center justify-center">
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

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Threshold: &lt;80%</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {metrics.diskUsagePercent.toFixed(1)}% Root Partition
            </span>
          </div>
        </div>

        {/* Right: Used vs Free Pie / Donut Chart (7 cols) */}
        <div className={`md:col-span-7 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Storage Capacity (Used vs Free)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Total: {metrics.diskTotal} {metrics.diskTotalUnit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center py-1">
            {/* Donut */}
            <div className="sm:col-span-6 relative w-[140px] h-[140px] mx-auto flex items-center justify-center">
              <PieChart
                data={donutData}
                innerRadius={46}
                padAngle={0.04}
                cornerRadius={6}
                size={140}
                className="w-full h-full"
              >
                {donutData.map((_, i) => (
                  <PieSlice key={i} index={i} />
                ))}
                <PieCenter
                  defaultLabel="Total Disk"
                  suffix={` ${metrics.diskTotalUnit}`}
                >
                  {({ isHovered, data }) => (
                    <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        {isHovered ? data.label : 'Total Disk'}
                      </span>
                      <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-tight">
                        {isHovered ? data.value.toFixed(1) : metrics.diskTotal}
                      </span>
                      <span className="text-[8px] font-bold text-blue-400">
                        {metrics.diskTotalUnit}
                      </span>
                    </div>
                  )}
                </PieCenter>
              </PieChart>
            </div>

            {/* Breakdown Cards */}
            <div className="sm:col-span-6 space-y-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 block">
                    Used Storage
                  </span>
                  <span className="text-sm font-black font-mono text-blue-300">
                    {metrics.diskUsed.toFixed(1)} {metrics.diskUsedUnit}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {metrics.diskUsagePercent.toFixed(1)}%
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Free Storage
                  </span>
                  <span className="text-sm font-black font-mono text-slate-200">
                    {metrics.diskFree.toFixed(1)} {metrics.diskFreeUnit}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {(100 - metrics.diskUsagePercent).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Mountpoint: / (Root FS)</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              Available: {metrics.diskFree.toFixed(1)} {metrics.diskFreeUnit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
