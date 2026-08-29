/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Cpu,
  Memory,
  Gauge as GaugeIcon,
  Pulse,
  ArrowDown,
  ArrowUp
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { LineChart } from '../../../charts/line-chart';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { Line } from '../../../charts/line';
import { ChartTooltip } from '../../../charts/tooltip';
import {
  TpLinkRouterMetrics,
  RouterTimeseriesPoint,
  NetworkTimeRange
} from '../../../../types/network';

interface TpLinkPerformanceThroughputSectionProps {
  metrics: TpLinkRouterMetrics;
  historyData: RouterTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

export const TpLinkPerformanceThroughputSection: React.FC<TpLinkPerformanceThroughputSectionProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  // CPU threshold colors (~60/85)
  const cpuUsageColor =
    metrics.cpuUsage < 60 ? '#10B981' : metrics.cpuUsage < 85 ? '#F59E0B' : '#EF4444';

  // Memory threshold colors (~70/90)
  const memUsageColor =
    metrics.memoryUsage < 70 ? '#10B981' : metrics.memoryUsage < 90 ? '#F59E0B' : '#EF4444';

  const downloadMBps = (metrics.currentDownloadSpeedKBps / 1000).toFixed(1);
  const uploadMBps = (metrics.currentUploadSpeedKBps / 1000).toFixed(1);

  const timeRanges: NetworkTimeRange[] = ['24H', '7D', '30D', '90D'];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <GaugeIcon size={18} weight="duotone" className="text-cyan-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Performance &amp; Bandwidth Throughput
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
            Section 2
          </span>
        </div>

        {/* Time range selector pills for throughput */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
          {timeRanges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Item Grid: 2 Half-Width Gauges on Mobile + Full-Width Line Chart */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* 1/2 Width on Mobile, 1/4 Width on Desktop: CPU Load Gauge */}
        <div className={`col-span-1 lg:col-span-3 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[250px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Cpu size={14} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                CPU Load
              </span>
            </div>
            <span
              className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${cpuUsageColor}1A`,
                color: cpuUsageColor
              }}
            >
              {metrics.cpuUsage < 60 ? 'Optimal' : metrics.cpuUsage < 85 ? 'Elevated' : 'High'}
            </span>
          </div>

          <div className="w-full h-[130px] sm:h-[155px] max-w-[160px] mx-auto my-auto flex items-center justify-center">
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
        </div>

        {/* 1/2 Width on Mobile, 1/4 Width on Desktop: Memory RAM Gauge */}
        <div className={`col-span-1 lg:col-span-3 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[250px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Memory size={14} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                Memory RAM
              </span>
            </div>
            <span
              className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${memUsageColor}1A`,
                color: memUsageColor
              }}
            >
              {metrics.memoryUsage < 70 ? 'Optimal' : metrics.memoryUsage < 90 ? 'Elevated' : 'High'}
            </span>
          </div>

          <div className="w-full h-[130px] sm:h-[155px] max-w-[160px] mx-auto my-auto flex items-center justify-center">
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
        </div>

        {/* Full Width on Mobile (col-span-2), 1/2 Width on Desktop: Bandwidth Throughput Line Chart */}
        <div className={`col-span-2 lg:col-span-6 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[250px]`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Pulse size={14} weight="duotone" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Bandwidth Throughput
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono font-black">
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                <ArrowDown size={11} weight="bold" />
                <span>{downloadMBps} MB/s In</span>
              </span>
              <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                <ArrowUp size={11} weight="bold" />
                <span>{uploadMBps} MB/s Out</span>
              </span>
            </div>
          </div>

          {/* Line chart area */}
          <div className="w-full h-[175px] my-auto py-1">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 8, right: 10, bottom: 16, left: 24 }}
              className="w-full h-full"
            >
              <Grid
                stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeDasharray="3,3"
              />
              <XAxis numTicks={4} />
              <YAxis numTicks={4} />
              <Line
                dataKey="downloadKBps"
                stroke="#10B981"
                strokeWidth={2.5}
                animate
              />
              <Line
                dataKey="uploadKBps"
                stroke="#6366F1"
                strokeWidth={2}
                animate
              />
              <ChartTooltip
                showDatePill
                showCrosshair
                showDots
                rows={(p) => [
                  {
                    label: 'Download (In)',
                    value: `${(Number(p.downloadKBps || 0)).toFixed(1)} MB/s`,
                    color: '#10B981'
                  },
                  {
                    label: 'Upload (Out)',
                    value: `${(Number(p.uploadKBps || 0)).toFixed(1)} MB/s`,
                    color: '#6366F1'
                  }
                ]}
              />
            </LineChart>
          </div>
        </div>
      </div>
    </div>
  );
};
