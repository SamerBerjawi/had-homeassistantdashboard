/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lightning, Clock, TrendUp, ShieldCheck } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { AdGuardTimeseriesPoint } from '../../../../types/network';

interface QueryPerformanceCardProps {
  avgProcessingSpeedMs: number;
  historyData: AdGuardTimeseriesPoint[];
  darkMode?: boolean;
}

export const QueryPerformanceCard: React.FC<QueryPerformanceCardProps> = ({
  avgProcessingSpeedMs,
  historyData,
  darkMode = true
}) => {
  const speedColor =
    avgProcessingSpeedMs > 50 ? '#F43F5E' : avgProcessingSpeedMs > 20 ? '#F59E0B' : '#10B981';

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[340px] sm:min-h-[380px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-8 ${cardBaseStyle}`}>
      {/* 1. Header with Average Speed Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendUp size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                DNS Query Volume & Latency
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                24h Timeseries
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Total queries handled vs. malicious requests sinkholed
            </p>
          </div>
        </div>

        {/* Latency Pill */}
        <div className="flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1.5 rounded-xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
          <Clock size={14} />
          <span>{avgProcessingSpeedMs.toFixed(1)} ms Latency</span>
        </div>
      </div>

      {/* 2. Body: Latency Gauge + Spacious 24h Line Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 my-auto py-2">
        {/* Latency Gauge (4 cols on desktop) */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5">
          <div className="w-full max-w-[130px] flex items-center justify-center">
            <Gauge
              value={Math.min(100, (avgProcessingSpeedMs / 50) * 100)}
              activeFill={speedColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              suffix="ms"
              defaultLabel="SPEED"
              notchCornerRadius={2}
              orientation="arc"
              className="w-full"
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
            Upstream Response
          </span>
        </div>

        {/* Spacious Query Volume Line Chart (8 cols on desktop) */}
        <div className="w-full h-[200px] sm:h-[240px] sm:col-span-8">
          <LineChart
            data={historyData as unknown as Record<string, unknown>[]}
            xDataKey="date"
            margin={{ top: 10, right: 12, bottom: 20, left: 32 }}
            className="w-full h-full"
          >
            <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
            <XAxis numTicks={4} />
            <YAxis numTicks={5} />
            <Line dataKey="totalQueries" stroke="#06B6D4" strokeWidth={2.5} animate />
            <Line dataKey="blockedQueries" stroke="#F43F5E" strokeWidth={2} animate />
            <ChartTooltip
              showDatePill
              showCrosshair
              showDots
              rows={(p) => [
                { label: 'Total Queries', value: Number(p.totalQueries || 0), color: '#06B6D4' },
                { label: 'Blocked Ads & Trackers', value: Number(p.blockedQueries || 0), color: '#F43F5E' }
              ]}
            />
          </LineChart>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span>Upstream Encrypted DNS: <strong className="text-slate-700 dark:text-slate-200">Cloudflare & Quad9 (DNS-over-HTTPS)</strong></span>
        <span className="text-cyan-400 font-semibold">Local DNS Cache Hit Rate: 68.4%</span>
      </div>
    </div>
  );
};
