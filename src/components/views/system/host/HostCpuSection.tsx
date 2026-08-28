/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, Thermometer, ChartLineUp } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { SystemHostMetrics, SystemTimeseriesPoint } from '../../../../hooks/useSystemMetrics';

interface HostCpuSectionProps {
  metrics: SystemHostMetrics;
  historyData: SystemTimeseriesPoint[];
  darkMode?: boolean;
}

export function HostCpuSection({
  metrics,
  historyData,
  darkMode = true
}: HostCpuSectionProps) {
  const cardStyle =
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100') +
    ' p-3.5 sm:p-4';

  // Threshold colors matching NAS page conventions
  const cpuUsageColor =
    metrics.cpuUsage < 60 ? '#10B981' : metrics.cpuUsage < 85 ? '#F59E0B' : '#EF4444';

  const cpuTempColor =
    metrics.cpuTemp < 60 ? '#06B6D4' : metrics.cpuTemp < 75 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Cpu size={18} weight="duotone" className="text-emerald-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          CPU & Processor Load
        </h3>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
          Section 2
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Left: 2 Gauges Side by Side (5 cols) */}
        <div className={`lg:col-span-5 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Processor Metrics
            </span>
            <span className="text-[10px] text-slate-500 font-mono">60% / 85% Limits</span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 items-center">
            {/* Processor Use Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[210px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Cpu size={13} className="text-emerald-400" /> Use
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${cpuUsageColor}1A`,
                    color: cpuUsageColor
                  }}
                >
                  {metrics.cpuUsage < 60 ? 'Optimal' : metrics.cpuUsage < 85 ? 'Elevated' : 'High'}
                </span>
              </div>

              <div className="w-full h-[140px] max-w-[165px] mx-auto my-auto flex items-center justify-center">
                <Gauge
                  value={metrics.cpuUsage}
                  centerValue={metrics.cpuUsage}
                  defaultLabel="CPU"
                  suffix={metrics.cpuUsageUnit || '%'}
                  activeFill={cpuUsageColor}
                  inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  orientation="arc"
                  notchCornerRadius={2}
                  totalNotches={32}
                  className="w-full h-full"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/5 text-[9px] text-slate-400 text-center">
                Limit: &lt;60% Normal
              </div>
            </div>

            {/* Processor Temperature Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[210px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Thermometer size={13} className="text-cyan-400" /> Temp
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${cpuTempColor}1A`,
                    color: cpuTempColor
                  }}
                >
                  {metrics.cpuTemp < 60 ? 'Cool' : metrics.cpuTemp < 75 ? 'Warm' : 'Hot'}
                </span>
              </div>

              <div className="w-full h-[140px] max-w-[165px] mx-auto my-auto flex items-center justify-center">
                <Gauge
                  value={Math.min(100, (metrics.cpuTemp / 90) * 100)}
                  centerValue={metrics.cpuTemp}
                  defaultLabel="TEMP"
                  suffix={metrics.cpuTempUnit || '°C'}
                  activeFill={cpuTempColor}
                  inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  orientation="arc"
                  notchCornerRadius={2}
                  totalNotches={32}
                  className="w-full h-full"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/5 text-[9px] text-slate-400 text-center">
                Limit: &lt;60°C Cool
              </div>
            </div>
          </div>
        </div>

        {/* Right: Load Averages Line Chart (7 cols) */}
        <div className={`lg:col-span-7 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <ChartLineUp size={16} weight="duotone" className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Load Averages (1m, 5m, 15m)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> 1m: {metrics.load1m.toFixed(2)}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> 5m: {metrics.load5m.toFixed(2)}
              </span>
              <span className="flex items-center gap-1 text-purple-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> 15m: {metrics.load15m.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="w-full h-[175px] my-auto py-1">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 10, right: 10, bottom: 15, left: 25 }}
              className="w-full h-full"
            >
              <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="3,3" />
              <XAxis numTicks={4} />
              <YAxis numTicks={4} />
              <ChartTooltip />
              <Line dataKey="load1m" stroke="#06B6D4" strokeWidth={2.5} animate />
              <Line dataKey="load5m" stroke="#F59E0B" strokeWidth={2} animate />
              <Line dataKey="load15m" stroke="#A855F7" strokeWidth={1.5} animate />
            </LineChart>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Core Multi-Queue Load</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              System Load Status: {metrics.load1m < 2.0 ? 'Optimal' : 'Elevated'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
