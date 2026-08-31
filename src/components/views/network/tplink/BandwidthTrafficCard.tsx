/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowDown, ArrowUp, ChartLineUp } from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { RouterTimeseriesPoint, NetworkTimeRange } from '../../../../types/network';

interface BandwidthTrafficCardProps {
  currentDownloadSpeedKBps: number;
  currentUploadSpeedKBps: number;
  totalDownloadGB: number;
  totalUploadGB: number;
  historyData: RouterTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

const TIME_RANGES: { key: NetworkTimeRange; label: string }[] = [
  { key: '1D', label: '1 Day' },
  { key: '1W', label: '1 Week' },
  { key: '1M', label: '1 Month' },
  { key: '3M', label: '3 Months' },
  { key: '6M', label: '6 Months' },
  { key: '1Y', label: '1 Year' },
  { key: 'ALL', label: 'All Time' }
];

export const BandwidthTrafficCard: React.FC<BandwidthTrafficCardProps> = ({
  currentDownloadSpeedKBps,
  currentUploadSpeedKBps,
  totalDownloadGB,
  totalUploadGB,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const downMBs = (currentDownloadSpeedKBps / 1000).toFixed(1);
  const upMBs = (currentUploadSpeedKBps / 1000).toFixed(1);

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm transition-all duration-300 flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] min-h-[360px] sm:min-h-[400px] ${
    darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-8 ${cardBaseStyle}`}>
      {/* 1. Header with Live Rates & Timeline Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <ChartLineUp size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                Bandwidth & Traffic Timeseries
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live Gateway
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Download (↓) vs. Upload (↑) throughput curves
            </p>
          </div>
        </div>

        {/* Live Rates Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
            <ArrowDown size={12} /> {downMBs} MB/s
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-indigo-400 font-bold flex items-center gap-0.5">
            <ArrowUp size={12} /> {upMBs} MB/s
          </span>
        </div>
      </div>

      {/* Timeline Selector Bar (1D, 1W, 1M, 3M, 6M, 1Y, ALL) */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2.5 pb-1">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Timeline Window:
        </span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto max-w-full">
          {TIME_RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onTimeRangeChange(key)}
              title={label}
              className={`text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                timeRange === key
                  ? 'bg-emerald-500 text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Spacious Dual-Line Bklit Chart */}
      <div className="w-full h-[220px] sm:h-[260px] my-auto py-2">
        <LineChart
          data={historyData as unknown as Record<string, unknown>[]}
          xDataKey="date"
          margin={{ top: 12, right: 12, bottom: 22, left: 32 }}
          className="w-full h-full"
        >
          <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
          <XAxis numTicks={4} />
          <YAxis numTicks={5} />
          <Line dataKey="downloadKBps" stroke="#10B981" strokeWidth={2.5} animate />
          <Line dataKey="uploadKBps" stroke="#6366F1" strokeWidth={2} animate />
          <ChartTooltip
            showDatePill
            showCrosshair
            showDots
            rows={(p) => [
              { label: 'Inbound Download', value: `${Number(p.downloadKBps || 0).toFixed(2)} MB/s`, color: '#10B981' },
              { label: 'Outbound Upload', value: `${Number(p.uploadKBps || 0).toFixed(2)} MB/s`, color: '#6366F1' }
            ]}
          />
        </LineChart>
      </div>

      {/* 3. Footer: Total Traffic Transfer */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>Period Download: <strong className="text-emerald-400 font-mono font-bold">{totalDownloadGB.toFixed(1)} GB</strong></span>
          <span>•</span>
          <span>Period Upload: <strong className="text-indigo-400 font-mono font-bold">{totalUploadGB.toFixed(1)} GB</strong></span>
        </div>
        <span className="text-slate-400 font-medium">WAN Port: 10Gbps SFP+ Multi-Gig</span>
      </div>
    </div>
  );
};
