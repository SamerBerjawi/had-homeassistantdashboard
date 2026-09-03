/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiHigh, ArrowsDownUp, Stack } from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { SystemHostMetrics, SystemTimeseriesPoint } from '../../../../hooks/useSystemMetrics';

interface HostNetworkSectionProps {
  metrics: SystemHostMetrics;
  historyData: SystemTimeseriesPoint[];
  darkMode?: boolean;
}

export function HostNetworkSection({
  metrics,
  historyData,
  darkMode = true
}: HostNetworkSectionProps) {
  const cardStyle =
    'rounded-3xl backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900') +
    ' p-4 sm:p-5';

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <WifiHigh size={18} weight="duotone" className="text-cyan-500 dark:text-cyan-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Network Interface (end0)
        </h3>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-400 border-cyan-500/25">
          Section 5
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Chart 1: Throughput (Network In & Network Out) */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <ArrowsDownUp size={16} weight="duotone" className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Network Throughput
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> In: {metrics.networkInRate} {metrics.networkInUnit}
              </span>
              <span className="flex items-center gap-1 text-purple-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Out: {metrics.networkOutRate} {metrics.networkOutUnit}
              </span>
            </div>
          </div>

          <div className="w-full h-[195px] my-auto py-1">
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
              <Line dataKey="networkInRate" stroke="#06B6D4" strokeWidth={2.5} animate />
              <Line dataKey="networkOutRate" stroke="#A855F7" strokeWidth={2} animate />
            </LineChart>
          </div>
        </div>

        {/* Chart 2: Packets (Packets In & Packets Out) */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Stack size={16} weight="duotone" className="text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Packets Rate (In / Out)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> In: {metrics.packetsIn.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Out: {metrics.packetsOut.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="w-full h-[195px] my-auto py-1">
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
              <Line dataKey="packetsInRate" stroke="#10B981" strokeWidth={2.5} animate />
              <Line dataKey="packetsOutRate" stroke="#F59E0B" strokeWidth={2} animate />
            </LineChart>
          </div>
        </div>
      </div>
    </div>
  );
}
