/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowsDownUp,
  ArrowDown,
  ArrowUp,
  Pulse
} from '@phosphor-icons/react';
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

interface TpLinkThroughputSectionProps {
  metrics: TpLinkRouterMetrics;
  historyData: RouterTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

export const TpLinkThroughputSection: React.FC<TpLinkThroughputSectionProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const cardStyle =
    'relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 ' +
    (darkMode
      ? 'bg-slate-900/60 border-white/10 backdrop-blur-md shadow-lg shadow-black/20'
      : 'bg-white/90 border-slate-200/80 backdrop-blur-md shadow-md shadow-slate-200/50');

  const downloadMBps = (metrics.currentDownloadSpeedKBps / 1000).toFixed(1);
  const uploadMBps = (metrics.currentUploadSpeedKBps / 1000).toFixed(1);

  const timeRanges: NetworkTimeRange[] = ['24H', '7D', '30D', '90D'];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ArrowsDownUp size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Network Throughput &amp; Traffic
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
            Telemetry
          </span>
        </div>

        {/* Time range selector pills */}
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

      {/* Main Throughput Card */}
      <div className={`${cardStyle} flex flex-col justify-between`}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Pulse size={18} weight="duotone" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                WAN Bandwidth Activity
              </h3>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">
                Real-time inbound download &amp; outbound upload rate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-black">
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <ArrowDown size={13} weight="bold" />
              <span>{downloadMBps} MB/s In</span>
            </span>
            <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              <ArrowUp size={13} weight="bold" />
              <span>{uploadMBps} MB/s Out</span>
            </span>
          </div>
        </div>

        {/* Throughput Line Chart */}
        <div className="w-full h-[175px] my-auto py-2">
          <LineChart
            data={historyData as unknown as Record<string, unknown>[]}
            xDataKey="date"
            margin={{ top: 10, right: 10, bottom: 18, left: 28 }}
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

        {/* Bottom Stat Strip */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Total Down: <strong className="font-mono text-slate-800 dark:text-slate-200">{metrics.totalDownloadGB} GB</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Total Up: <strong className="font-mono text-slate-800 dark:text-slate-200">{metrics.totalUploadGB} GB</strong></span>
            </span>
          </div>

          <div className="font-mono text-[9px] text-slate-400">
            Sampling: Live Gateway Metric
          </div>
        </div>
      </div>
    </div>
  );
};
