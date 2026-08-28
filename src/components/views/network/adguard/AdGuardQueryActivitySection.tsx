/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  ChartPie,
  ShieldCheck,
  Prohibit,
  CheckCircle,
  Percent
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
import { AdGuardMetrics } from '../../../../types/network';

interface AdGuardQueryActivitySectionProps {
  metrics: AdGuardMetrics;
  darkMode?: boolean;
}

export const AdGuardQueryActivitySection: React.FC<AdGuardQueryActivitySectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const totalQueries = metrics.dnsQueriesTotal;
  const blockedQueries = metrics.dnsQueriesBlocked;
  const allowedQueries = metrics.dnsQueriesAllowed;
  const blockedRatio = metrics.blockedRatioPercent;

  // Pie chart data: Blocked (Rose) vs Allowed (Emerald)
  const donutData = useMemo(() => {
    return [
      {
        label: 'Blocked',
        value: blockedQueries,
        color: '#F43F5E', // Rose
        desc: 'Threats & telemetry blocked'
      },
      {
        label: 'Allowed',
        value: allowedQueries,
        color: '#10B981', // Emerald
        desc: 'Legitimate resolved DNS'
      }
    ];
  }, [blockedQueries, allowedQueries]);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ChartPie size={18} weight="duotone" className="text-cyan-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Query Activity &amp; Blocking Ratio
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
            Section 2
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Inspection &amp; Sinkhole Breakdown
        </div>
      </div>

      {/* Grid: Left Blocked Ratio Gauge (4 Cols) + Right Donut with Vertically Stacked Stats (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: Blocked Ratio Headline Gauge (4 cols on desktop) */}
        <div className={`lg:col-span-4 ${cardStyle} flex flex-col justify-between min-h-[270px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Percent size={14} weight="bold" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Blocked Ratio
              </span>
            </div>
            <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              Sinkhole Efficiency
            </span>
          </div>

          {/* Solid Accent Gauge */}
          <div className="w-full flex-1 min-h-[175px] max-w-[280px] mx-auto flex items-center justify-center py-2">
            <Gauge
              value={blockedRatio}
              centerValue={blockedRatio}
              defaultLabel="BLOCKED"
              suffix="%"
              activeFill="#6366F1"
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>DNS Request Filter Rate</span>
            <span className="font-mono text-indigo-400 font-bold">
              {blockedRatio.toFixed(1)}% Intercepted
            </span>
          </div>
        </div>

        {/* Right: Bklit Donut Component with Vertically Stacked Statistics (8 cols on desktop) */}
        <div className={`lg:col-span-8 ${cardStyle} flex flex-col justify-between min-h-[270px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <ShieldCheck size={14} weight="duotone" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Query Distribution (Blocked vs Allowed)
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Total: {totalQueries.toLocaleString()}
            </span>
          </div>

          {/* 2-Column Inside Container: Left Donut + Right Vertically Stacked Stats */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-1 py-2">
            {/* Left: Large Prominent Donut Chart (7 cols on desktop) */}
            <div className="md:col-span-7 flex flex-col items-center justify-center">
              <div className="relative w-[210px] h-[210px] sm:w-[225px] sm:h-[225px] flex items-center justify-center">
                <PieChart
                  data={donutData}
                  innerRadius={72}
                  padAngle={0.04}
                  cornerRadius={6}
                  size={225}
                  className="w-full h-full"
                >
                  {donutData.map((_, i) => (
                    <PieSlice key={i} index={i} />
                  ))}
                  <PieCenter
                    defaultLabel="TOTAL"
                    suffix=""
                  >
                    {({ isHovered, data }) => (
                      <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none px-2">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          {isHovered ? data.label : 'TOTAL'}
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight leading-tight">
                          {isHovered
                            ? data.value.toLocaleString()
                            : totalQueries.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-tight">
                          DNS Queries
                        </span>
                      </div>
                    )}
                  </PieCenter>
                </PieChart>
              </div>
            </div>

            {/* Right: Vertically Stacked Statistics (5 cols on desktop) */}
            <div className="md:col-span-5 flex flex-col justify-center space-y-2.5">
              {/* Total Queries */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                    <CheckCircle size={18} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Total Queries</span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white truncate block">
                      {totalQueries.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-400 shrink-0">100%</span>
              </div>

              {/* Blocked Threats */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                    <Prohibit size={18} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Blocked Threats</span>
                    <span className="text-sm font-black font-mono text-rose-500 truncate block">
                      {blockedQueries.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-rose-400 font-bold shrink-0">{blockedRatio.toFixed(1)}%</span>
              </div>

              {/* Allowed Queries */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Allowed DNS</span>
                    <span className="text-sm font-black font-mono text-emerald-400 truncate block">
                      {allowedQueries.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold shrink-0">
                  {(100 - blockedRatio).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
