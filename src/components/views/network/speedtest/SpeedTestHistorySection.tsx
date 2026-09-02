/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ChartLineUp,
  ArrowDown,
  ArrowUp,
  Timer,
  Waveform,
  ClockAfternoon
} from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { Line } from '../../../charts/line';
import { ChartTooltip } from '../../../charts/tooltip';
import { SpeedTestMetrics, SpeedTestTimeseriesPoint, NetworkTimeRange } from '../../../../types/network';

interface SpeedTestHistorySectionProps {
  metrics: SpeedTestMetrics;
  historyData: SpeedTestTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

export const SpeedTestHistorySection: React.FC<SpeedTestHistorySectionProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 flex flex-col justify-between ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const timeRanges: NetworkTimeRange[] = ['24H', '7D', '30D', '90D'];

  const hasHistory = historyData && historyData.length > 0;

  // Max stats for footer calculation
  const maxDown = hasHistory
    ? Math.max(...historyData.map((d) => d.downloadMbps), metrics.downloadSpeedMbps)
    : metrics.downloadSpeedMbps;
  const maxUp = hasHistory
    ? Math.max(...historyData.map((d) => d.uploadMbps), metrics.uploadSpeedMbps)
    : metrics.uploadSpeedMbps;

  return (
    <div className="space-y-3">
      {/* Section Header with Time Range Selectors */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ChartLineUp size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Performance, Bandwidth &amp; Latency Trends
          </h2>
        </div>

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

      {/* Two-Column Responsive Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Throughput Bandwidth (Download & Upload) */}
        <div className={`${cardStyle} min-h-[340px] sm:min-h-[370px]`}>
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <ArrowDown size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Bandwidth Throughput
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Download and upload bandwidth history
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {metrics.downloadPlanCompliancePercent > 0
                    ? `${metrics.downloadPlanCompliancePercent}% Plan`
                    : 'Download RX'}
                </span>
                <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  {metrics.uploadPlanCompliancePercent > 0
                    ? `${metrics.uploadPlanCompliancePercent}% Plan`
                    : 'Upload TX'}
                </span>
              </div>
            </div>

            {/* Metric Displays Row (Integrated from former sparkline cards) */}
            <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-200/40 dark:border-white/5">
              {/* Download Stat */}
              <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 uppercase">
                  <ArrowDown size={12} weight="bold" />
                  <span>Download</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
                    {metrics.downloadSpeedMbps.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2
                    })}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    Mbps
                  </span>
                </div>
              </div>

              {/* Upload Stat */}
              <div className="p-2.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-400 uppercase">
                  <ArrowUp size={12} weight="bold" />
                  <span>Upload</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-400">
                    {metrics.uploadSpeedMbps.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2
                    })}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    Mbps
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart Area or Empty State */}
          <div className="w-full h-[180px] sm:h-[195px] my-auto py-2">
            {hasHistory ? (
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 14, bottom: 16, left: 38 }}
                className="w-full h-full"
              >
                <Grid
                  stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                  strokeDasharray="3,3"
                />
                <XAxis numTicks={4} />
                <YAxis numTicks={4} formatValue={(v) => `${Math.round(v)}`} />
                <Line
                  dataKey="downloadMbps"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  animate
                />
                <Line
                  dataKey="uploadMbps"
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
                      label: 'Download',
                      value: `${Number(p.downloadMbps || 0).toFixed(1)} Mbps`,
                      color: '#10B981'
                    },
                    {
                      label: 'Upload',
                      value: `${Number(p.uploadMbps || 0).toFixed(1)} Mbps`,
                      color: '#6366F1'
                    }
                  ]}
                />
              </LineChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <ClockAfternoon size={28} weight="duotone" className="text-slate-400 mb-1.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  No historical data available for {timeRange}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Charts will automatically plot as new Ookla speed tests are recorded.
                </p>
              </div>
            )}
          </div>

          {/* Sub-Footer Stats */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/40 dark:border-white/5">
            <span>Peak Down: {maxDown.toFixed(1)} Mbps</span>
            <span>Peak Up: {maxUp.toFixed(1)} Mbps</span>
          </div>
        </div>

        {/* Card 2: Latency & Jitter Stability (Ping & Jitter) */}
        <div className={`${cardStyle} min-h-[340px] sm:min-h-[370px]`}>
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Timer size={18} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Latency &amp; Stability
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Round-trip ping time and packet delay variation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  {metrics.pingMinMs > 0 ? `Min ${metrics.pingMinMs}ms` : 'Ping'}
                </span>
                <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  {metrics.downloadJitterMs > 0 ? `Jitter ${metrics.jitterMs}ms` : 'Jitter'}
                </span>
              </div>
            </div>

            {/* Metric Displays Row (Integrated from former sparkline cards) */}
            <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-200/40 dark:border-white/5">
              {/* Ping Stat */}
              <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 uppercase">
                  <Timer size={12} weight="duotone" />
                  <span>Ping / Latency</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-400">
                    {metrics.pingMs.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    ms
                  </span>
                </div>
              </div>

              {/* Jitter Stat */}
              <div className="p-2.5 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 uppercase">
                  <Waveform size={12} weight="bold" />
                  <span>Jitter Stability</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-cyan-400">
                    {metrics.jitterMs.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart Area or Empty State */}
          <div className="w-full h-[180px] sm:h-[195px] my-auto py-2">
            {hasHistory ? (
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 14, bottom: 16, left: 38 }}
                className="w-full h-full"
              >
                <Grid
                  stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                  strokeDasharray="3,3"
                />
                <XAxis numTicks={4} />
                <YAxis numTicks={4} formatValue={(v) => `${v.toFixed(0)} ms`} />
                <Line
                  dataKey="pingMs"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  animate
                />
                <Line
                  dataKey="jitterMs"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  animate
                />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  showDots
                  rows={(p) => [
                    {
                      label: 'Ping (Latency)',
                      value: `${Number(p.pingMs || 0).toFixed(1)} ms`,
                      color: '#F59E0B'
                    },
                    {
                      label: 'Jitter',
                      value: `${Number(p.jitterMs || 0).toFixed(1)} ms`,
                      color: '#06B6D4'
                    }
                  ]}
                />
              </LineChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <ClockAfternoon size={28} weight="duotone" className="text-slate-400 mb-1.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  No latency history recorded for {timeRange}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Charts will automatically plot as new Ookla speed tests are recorded.
                </p>
              </div>
            )}
          </div>

          {/* Sub-Footer Stats */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/40 dark:border-white/5">
            <span>
              {metrics.pingMinMs > 0 && metrics.pingMaxMs > 0
                ? `Range: ${metrics.pingMinMs}ms - ${metrics.pingMaxMs}ms`
                : `Ping: ${metrics.pingMs.toFixed(1)}ms`}
            </span>
            <span>
              {metrics.downloadJitterMs > 0
                ? `RX Jitter: ${metrics.downloadJitterMs}ms / TX Jitter: ${metrics.uploadJitterMs}ms`
                : `Jitter: ${metrics.jitterMs.toFixed(1)}ms`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
