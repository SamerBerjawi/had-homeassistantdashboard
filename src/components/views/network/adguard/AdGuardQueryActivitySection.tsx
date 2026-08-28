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
  Percent,
  GlobeHemisphereWest
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

      {/* Grid: Left Blocked Ratio Gauge (1/2 on mobile, 4 cols on desktop) + Right Donut (1/2 on mobile, 8 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: Blocked Ratio Headline Gauge */}
        <div className={`col-span-1 lg:col-span-4 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[270px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Percent size={14} weight="bold" />
              </div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                Blocked Ratio
              </span>
            </div>
            <span className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              Sinkhole
            </span>
          </div>

          <div className="w-full flex-1 min-h-[140px] sm:min-h-[190px] max-w-[280px] mx-auto flex items-center justify-center py-2">
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
        </div>

        {/* Right: Bklit Donut Component with Vertically Stacked Statistics */}
        <div className={`col-span-1 lg:col-span-8 ${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[270px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <ShieldCheck size={14} weight="duotone" />
              </div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                Query Distribution
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">
              {totalQueries.toLocaleString()}
            </span>
          </div>

          {/* 2-Column Inside Container: Left Donut + Right Vertically Stacked Stats */}
          <div className="flex flex-col md:grid md:grid-cols-12 gap-3 sm:gap-4 items-center flex-1 py-2">
            {/* Left: Large Prominent Donut Chart */}
            <div className="w-full md:col-span-7 flex flex-col items-center justify-center">
              <div className="relative w-[130px] h-[130px] sm:w-[210px] sm:h-[210px] flex items-center justify-center">
                <PieChart
                  data={donutData}
                  innerRadius={48}
                  padAngle={0.04}
                  cornerRadius={6}
                  size={145}
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
                      <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none px-1">
                        <span className="text-[7px] sm:text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          {isHovered ? data.label : 'TOTAL'}
                        </span>
                        <span className="text-xs sm:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight leading-tight">
                          {isHovered
                            ? data.value.toLocaleString()
                            : totalQueries.toLocaleString()}
                        </span>
                        <span className="text-[7px] sm:text-[9px] font-bold text-cyan-400 uppercase tracking-tight">
                          Queries
                        </span>
                      </div>
                    )}
                  </PieCenter>
                </PieChart>
              </div>
            </div>

            {/* Right: Vertically Stacked Statistics */}
            <div className="w-full md:col-span-5 flex flex-col justify-center space-y-1.5 sm:space-y-2.5">
              {/* Total Queries */}
              <div className="p-2 sm:p-3 rounded-xl bg-white/[0.03] border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <GlobeHemisphereWest size={13} weight="duotone" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-slate-400 truncate">Total Queries</span>
                </div>
                <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white">
                  {totalQueries.toLocaleString()}
                </span>
              </div>

              {/* Blocked Queries */}
              <div className="p-2 sm:p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={13} weight="duotone" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-indigo-400 truncate">Blocked</span>
                </div>
                <span className="text-xs sm:text-sm font-black font-mono text-indigo-300">
                  {blockedQueries.toLocaleString()}
                </span>
              </div>

              {/* Allowed Queries */}
              <div className="p-2 sm:p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle size={13} weight="duotone" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-slate-400 truncate">Allowed</span>
                </div>
                <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white">
                  {allowedQueries.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
