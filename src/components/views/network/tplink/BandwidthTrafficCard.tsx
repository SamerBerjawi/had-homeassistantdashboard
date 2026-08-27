/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowDown, ArrowUp, ChartLineUp, Broadcast } from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { RouterTimeseriesPoint } from '../../../../types/network';
import { HistoryTimeRange } from '../../../../hooks/useSystemMetrics';

interface BandwidthTrafficCardProps {
  currentDownloadSpeedKBps: number;
  currentUploadSpeedKBps: number;
  totalDownloadGB: number;
  totalUploadGB: number;
  historyData: RouterTimeseriesPoint[];
  timeRange: HistoryTimeRange;
  onTimeRangeChange: (range: HistoryTimeRange) => void;
  darkMode?: boolean;
}

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

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[340px] sm:min-h-[380px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-8 ${cardBaseStyle}`}>
      {/* 1. Header with Live Rates & Time Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/10">
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
              Real-time Inbound (Download) vs. Outbound (Upload) throughput curves
            </p>
          </div>
        </div>

        {/* Live Rates & Time Range Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <ArrowDown size={12} /> {downMBs} MB/s
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-400 font-bold flex items-center gap-0.5">
              <ArrowUp size={12} /> {upMBs} MB/s
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10">
            {(['1h', '6h', '24h'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onTimeRangeChange(r)}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
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
