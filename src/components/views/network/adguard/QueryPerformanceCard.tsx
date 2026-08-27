/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, TrendUp, ShieldCheck } from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { AdGuardTimeseriesPoint, NetworkTimeRange } from '../../../../types/network';
import { intFmt } from '../../../charts/chart-formatters';

interface QueryPerformanceCardProps {
  avgProcessingSpeedMs: number;
  historyData: AdGuardTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

const TIME_RANGES: { key: NetworkTimeRange; label: string }[] = [
  { key: '24H', label: '24 Hours' },
  { key: '7D', label: '7 Days' },
  { key: '30D', label: '30 Days' },
  { key: '90D', label: '90 Days' }
];

export const QueryPerformanceCard: React.FC<QueryPerformanceCardProps> = ({
  avgProcessingSpeedMs,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[360px] sm:min-h-[400px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  // Normalized active key for selector
  const activeKey =
    timeRange === '1D'
      ? '24H'
      : timeRange === '1W'
      ? '7D'
      : timeRange === '1M'
      ? '30D'
      : timeRange === '3M' || timeRange === '6M' || timeRange === '1Y' || timeRange === 'ALL'
      ? '90D'
      : timeRange;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 ${cardBaseStyle}`}>
      {/* 1. Header with Timeline Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendUp size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                DNS Traffic History (Up to 90 Days)
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                Daily Resolution
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Timeseries curve of total daily DNS queries vs. blocked threats
            </p>
          </div>
        </div>

        {/* Latency Badge */}
        <div className="flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1.5 rounded-xl border bg-slate-100 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-amber-400">
          <Clock size={14} />
          <span>{avgProcessingSpeedMs.toFixed(1)} ms Latency</span>
        </div>
      </div>

      {/* 2. Timeline Selector Bar (24H, 7D, 30D, 90D) */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 pb-1">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Timeline Window:
        </span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/80 dark:border-white/10">
          {TIME_RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onTimeRangeChange(key)}
              title={label}
              className={`text-[10px] font-bold px-3 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeKey === key
                  ? 'bg-cyan-500 text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Spacious Dual-Line Timeseries Curve with Daily Increments */}
      <div className="w-full h-[220px] sm:h-[260px] my-auto py-2">
        <LineChart
          data={historyData as unknown as Record<string, unknown>[]}
          xDataKey="date"
          margin={{ top: 10, right: 14, bottom: 20, left: 38 }}
          className="w-full h-full"
        >
          <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
          <XAxis numTicks={5} />
          <YAxis numTicks={5} />
          <Line dataKey="totalQueries" stroke="#06B6D4" strokeWidth={2.5} animate />
          <Line dataKey="blockedQueries" stroke="#F59E0B" strokeWidth={2} animate />
          <ChartTooltip
            showDatePill
            showCrosshair
            showDots
            rows={(p) => [
              { label: 'DNS Queries', value: `${intFmt(Number(p.totalQueries || 0))} queries`, color: '#06B6D4' },
              { label: 'Blocked by Filters', value: `${intFmt(Number(p.blockedQueries || 0))} queries`, color: '#F59E0B' }
            ]}
          />
        </LineChart>
      </div>

      {/* 4. Footer */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span>Resolution: <strong className="text-slate-700 dark:text-slate-200">Daily Increments</strong></span>
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <ShieldCheck size={13} />
          <span>Real-Time Filtering Engine</span>
        </span>
      </div>
    </div>
  );
};
