/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Thermometer,
  ChartLineUp,
  SquareSplitHorizontal,
  SquaresFour
} from '@phosphor-icons/react';
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
  const [loadViewMode, setLoadViewMode] = useState<'unified' | 'split'>('unified');

  const cardStyle =
    'rounded-3xl backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900') +
    ' p-4 sm:p-5';

  // Threshold colors matching NAS page conventions
  const cpuUsageColor =
    metrics.cpuUsage < 60 ? '#10B981' : metrics.cpuUsage < 85 ? '#F59E0B' : '#EF4444';

  const cpuTempColor =
    metrics.cpuTemp < 60 ? '#06B6D4' : metrics.cpuTemp < 75 ? '#F59E0B' : '#EF4444';

  const loadSeries = [
    {
      key: 'load1m' as const,
      label: '1m Load',
      value: metrics.load1m,
      color: '#06B6D4', // Cyan
      strokeWidth: 2.5,
      desc: 'Immediate short-term queue'
    },
    {
      key: 'load5m' as const,
      label: '5m Load',
      value: metrics.load5m,
      color: '#F59E0B', // Amber
      strokeWidth: 2.2,
      desc: 'Medium-term average'
    },
    {
      key: 'load15m' as const,
      label: '15m Load',
      value: metrics.load15m,
      color: '#A855F7', // Purple
      strokeWidth: 2.0,
      desc: 'Long-term trend baseline'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Cpu size={18} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            CPU &amp; Processor Load
          </h3>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/25">
            Section 2
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Core Utilization &amp; Multi-Queue Metrics
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: 2 Gauges Side by Side (5 cols) */}
        <div className={`lg:col-span-5 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Processor Metrics
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">60% / 85% Limits</span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 items-stretch">
            {/* Processor Use Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.03] min-h-[200px]">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 flex items-center gap-1">
                  <Cpu size={13} weight="duotone" className="text-emerald-500 dark:text-emerald-400" /> Use
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md"
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
            </div>

            {/* Processor Temperature Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.03] min-h-[200px]">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 flex items-center gap-1">
                  <Thermometer size={13} weight="duotone" className="text-cyan-400" /> Temp
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md"
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
            </div>
          </div>
        </div>

        {/* Right: Load Averages Line Chart with Unified vs Split Option (7 cols) */}
        <div className={`lg:col-span-7 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <ChartLineUp size={16} weight="duotone" className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Load Averages
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Unified vs Split View Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/[0.08] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setLoadViewMode('unified')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    loadViewMode === 'unified'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show all load averages on one unified chart"
                >
                  <SquareSplitHorizontal size={11} weight="bold" />
                  <span>Unified</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoadViewMode('split')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    loadViewMode === 'split'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show 1m, 5m, and 15m separately"
                >
                  <SquaresFour size={11} weight="bold" />
                  <span>Split</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-mono">
                {loadSeries.map((s) => (
                  <span key={s.key} className="flex items-center gap-1 font-bold" style={{ color: s.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}: {s.value.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Content Area */}
          {loadViewMode === 'unified' ? (
            /* Unified Single Chart with All 3 Series */
            <div className="w-full h-[180px] my-auto py-1">
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 12, bottom: 15, left: 20 }}
                className="w-full h-full"
              >
                <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="3,3" />
                <XAxis numTicks={4} />
                <YAxis numTicks={4} />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  rows={(p) =>
                    loadSeries.map((s) => ({
                      label: s.label,
                      value: Number(p[s.key] || 0).toFixed(2),
                      color: s.color
                    }))
                  }
                />
                {loadSeries.map((s) => (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={s.strokeWidth}
                    animate
                  />
                ))}
              </LineChart>
            </div>
          ) : (
            /* Separate / Split View: 3 individual mini charts */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 py-1 my-auto">
              {loadSeries.map((s) => (
                <div
                  key={s.key}
                  className="p-2.5 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.03] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {s.label}
                    </span>
                    <span
                      className="text-xs font-black font-mono"
                      style={{ color: s.color }}
                    >
                      {s.value.toFixed(2)}
                    </span>
                  </div>

                  <div className="w-full h-[120px] py-1">
                    <LineChart
                      data={historyData as unknown as Record<string, unknown>[]}
                      xDataKey="date"
                      margin={{ top: 6, right: 6, bottom: 12, left: 18 }}
                      className="w-full h-full"
                    >
                      <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="2,2" />
                      <XAxis numTicks={2} />
                      <YAxis numTicks={3} />
                      <Line dataKey={s.key} stroke={s.color} strokeWidth={2.2} animate />
                      <ChartTooltip
                        showDatePill
                        showCrosshair
                        rows={(p) => [
                          {
                            label: s.label,
                            value: Number(p[s.key] || 0).toFixed(2),
                            color: s.color
                          }
                        ]}
                      />
                    </LineChart>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
