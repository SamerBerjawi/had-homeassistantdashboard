/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, Memory, Gauge as GaugeIcon } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkPerformanceSectionProps {
  metrics: TpLinkRouterMetrics;
  darkMode?: boolean;
}

export const TpLinkPerformanceSection: React.FC<TpLinkPerformanceSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 ' +
    (darkMode
      ? 'bg-slate-900/60 border-white/10 backdrop-blur-md shadow-lg shadow-black/20'
      : 'bg-white/90 border-slate-200/80 backdrop-blur-md shadow-md shadow-slate-200/50');

  // CPU threshold colors (~60/85)
  const cpuUsageColor =
    metrics.cpuUsage < 60 ? '#10B981' : metrics.cpuUsage < 85 ? '#F59E0B' : '#EF4444';

  // Memory threshold colors (~70/90)
  const memUsageColor =
    metrics.memoryUsage < 70 ? '#10B981' : metrics.memoryUsage < 90 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <GaugeIcon size={18} weight="duotone" className="text-cyan-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Router Performance
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
            Section 2
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Dual-Core Hardware Engine
        </div>
      </div>

      {/* Side-by-Side Performance Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: CPU Utilization */}
        <div className={`${cardStyle} flex flex-col justify-between min-h-[225px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Cpu size={14} weight="duotone" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                CPU Utilization
              </span>
            </div>
            <span
              className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${cpuUsageColor}1A`,
                color: cpuUsageColor
              }}
            >
              {metrics.cpuUsage < 60 ? 'Optimal' : metrics.cpuUsage < 85 ? 'Elevated' : 'High Load'}
            </span>
          </div>

          <div className="w-full h-[145px] max-w-[170px] mx-auto my-auto flex items-center justify-center">
            <Gauge
              value={metrics.cpuUsage}
              centerValue={metrics.cpuUsage}
              defaultLabel="CPU"
              suffix="%"
              activeFill={cpuUsageColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Thresholds: ~60% / 85%</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
              {metrics.cpuUsage.toFixed(1)}% Load
            </span>
          </div>
        </div>

        {/* Card 2: Memory Utilization */}
        <div className={`${cardStyle} flex flex-col justify-between min-h-[225px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Memory size={14} weight="duotone" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Memory Utilization
              </span>
            </div>
            <span
              className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${memUsageColor}1A`,
                color: memUsageColor
              }}
            >
              {metrics.memoryUsage < 70 ? 'Optimal' : metrics.memoryUsage < 90 ? 'Elevated' : 'High RAM'}
            </span>
          </div>

          <div className="w-full h-[145px] max-w-[170px] mx-auto my-auto flex items-center justify-center">
            <Gauge
              value={metrics.memoryUsage}
              centerValue={metrics.memoryUsage}
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

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Thresholds: ~70% / 90%</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
              {metrics.memoryUsage.toFixed(1)}% Used
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
