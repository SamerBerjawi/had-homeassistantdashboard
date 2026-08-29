/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChartLineUp,
  SquareSplitHorizontal,
  SquaresFour,
  Funnel,
  ShieldWarning,
  LockKey,
  Globe
} from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { Line } from '../../../charts/line';
import { ChartTooltip } from '../../../charts/tooltip';
import {
  AdGuardTimeseriesPoint,
  NetworkTimeRange
} from '../../../../types/network';

interface AdGuardTrafficHistorySectionProps {
  historyData: AdGuardTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

export const AdGuardTrafficHistorySection: React.FC<AdGuardTrafficHistorySectionProps> = ({
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const cardStyle =
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const timeRanges: NetworkTimeRange[] = ['24H', '7D', '30D', '90D'];

  const seriesConfig = [
    {
      id: 'totalQueries',
      name: 'Total DNS Queries',
      color: '#6366F1', // Indigo
      icon: Globe,
      strokeWidth: 2.5
    },
    {
      id: 'blockedQueries',
      name: 'Blocked Queries',
      color: '#F43F5E', // Rose
      icon: Funnel,
      strokeWidth: 2.2
    },
    {
      id: 'safeBrowsingBlocked',
      name: 'Malware & Phishing',
      color: '#F59E0B', // Amber
      icon: ShieldWarning,
      strokeWidth: 1.8
    },
    {
      id: 'parentalBlocked',
      name: 'Adult & Parental Blocks',
      color: '#A855F7', // Purple
      icon: LockKey,
      strokeWidth: 1.8
    }
  ];

  return (
    <div className="space-y-3">
      {/* Section Header with View Mode Pill Switcher & Time Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <ChartLineUp size={18} weight="duotone" className="text-indigo-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            DNS Traffic History
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400">
            Section 3
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher (Unified vs. Split View) */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SquareSplitHorizontal size={12} weight="bold" />
              <span>Unified View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SquaresFour size={12} weight="bold" />
              <span>Split View</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
            {timeRanges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onTimeRangeChange(range)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
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
      </div>

      {/* Main Chart Body */}
      {viewMode === 'unified' ? (
        /* Unified View: 1 Large Single Synchronized Chart */
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Synchronized 4-Series DNS Activity
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Overlay of total throughput against blocked, malware, and parental categories
              </p>
            </div>

            {/* Interactive Legend Row */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold">
              {seriesConfig.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5" style={{ color: s.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Line Chart Area */}
          <div className="w-full h-[210px] my-auto py-2">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 10, right: 10, bottom: 20, left: 32 }}
              className="w-full h-full"
            >
              <Grid
                stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeDasharray="3,3"
              />
              <XAxis numTicks={timeRange === '24H' ? 6 : timeRange === '7D' ? 7 : 5} />
              <YAxis numTicks={4} />
              <Line
                dataKey="totalQueries"
                stroke="#6366F1"
                strokeWidth={2.5}
                animate
              />
              <Line
                dataKey="blockedQueries"
                stroke="#F43F5E"
                strokeWidth={2.2}
                animate
              />
              <Line
                dataKey="safeBrowsingBlocked"
                stroke="#F59E0B"
                strokeWidth={1.8}
                animate
              />
              <Line
                dataKey="parentalBlocked"
                stroke="#A855F7"
                strokeWidth={1.8}
                animate
              />
              <ChartTooltip
                showDatePill
                showCrosshair
                showDots
                rows={(p) => [
                  {
                    label: 'Total Queries',
                    value: Number(p.totalQueries || 0).toLocaleString(),
                    color: '#6366F1'
                  },
                  {
                    label: 'Blocked Queries',
                    value: Number(p.blockedQueries || 0).toLocaleString(),
                    color: '#F43F5E'
                  },
                  {
                    label: 'Malware & Phishing',
                    value: Number(p.safeBrowsingBlocked || 0).toLocaleString(),
                    color: '#F59E0B'
                  },
                  {
                    label: 'Parental Blocks',
                    value: Number(p.parentalBlocked || 0).toLocaleString(),
                    color: '#A855F7'
                  }
                ]}
              />
            </LineChart>
          </div>
        </div>
      ) : (
        /* Split View: 4 Individual Responsive Mini-Charts in a 4-Column Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {seriesConfig.map((s) => {
            const Icon = s.icon;

            return (
              <div key={s.id} className={`${cardStyle} flex flex-col justify-between min-h-[190px]`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${s.color}1A`,
                        color: s.color
                      }}
                    >
                      <Icon size={14} weight="duotone" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                      {s.name}
                    </span>
                  </div>

                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded"
                    style={{
                      backgroundColor: `${s.color}1A`,
                      color: s.color
                    }}
                  >
                    {(historyData[historyData.length - 1]?.[s.id] as number || 0).toLocaleString()}
                  </span>
                </div>

                {/* Individual Series Line Chart */}
                <div className="w-full h-[140px] my-auto py-1">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 6, right: 6, bottom: 12, left: 20 }}
                    className="w-full h-full"
                  >
                    <Grid
                      stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                      strokeDasharray="2,2"
                    />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={3} />
                    <Line
                      dataKey={s.id}
                      stroke={s.color}
                      strokeWidth={2}
                      animate
                    />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [
                        {
                          label: s.name,
                          value: Number(p[s.id] || 0).toLocaleString(),
                          color: s.color
                        }
                      ]}
                    />
                  </LineChart>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
