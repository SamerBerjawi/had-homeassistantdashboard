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

  // Pie chart data
  const donutData = useMemo(() => {
    return [
      {
        label: 'Blocked Queries',
        value: blockedQueries,
        color: '#F43F5E', // Rose
        desc: 'Threats & telemetry blocked'
      },
      {
        label: 'Allowed Queries',
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

      {/* Grid: Left Blocked Ratio Gauge (4 Cols) + Right Donut & Summary (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left: Blocked Ratio Headline Gauge (4 cols on desktop) */}
        <div className={`lg:col-span-4 ${cardStyle} flex flex-col justify-between min-h-[250px]`}>
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

          {/* Solid Indigo/Cyan Accent Gauge (not green-to-red danger ramp) */}
          <div className="w-full h-[145px] max-w-[170px] mx-auto my-auto flex items-center justify-center">
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

        {/* Right: Bklit Donut Component & Summary Stat Row (8 cols on desktop) */}
        <div className={`lg:col-span-8 ${cardStyle} flex flex-col justify-between min-h-[250px]`}>
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

          {/* Donut Area */}
          <div className="py-2 my-auto flex items-center justify-center">
            <div className="relative w-[155px] h-[155px] sm:w-[170px] sm:h-[170px] flex items-center justify-center">
              <PieChart
                data={donutData}
                innerRadius={50}
                padAngle={0.04}
                cornerRadius={6}
                size={170}
                className="w-full h-full"
              >
                {donutData.map((_, i) => (
                  <PieSlice key={i} index={i} />
                ))}
                <PieCenter
                  defaultLabel="TOTAL"
                  suffix=" Queries"
                >
                  {({ isHovered, data }) => (
                    <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        {isHovered ? data.label : 'TOTAL'}
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white leading-tight">
                        {isHovered ? data.value.toLocaleString() : totalQueries.toLocaleString()}
                      </span>
                      <span className="text-[8px] font-bold text-cyan-400">
                        DNS Queries
                      </span>
                    </div>
                  )}
                </PieCenter>
              </PieChart>
            </div>
          </div>

          {/* Summary Stat Row Under Donut */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-3 gap-2.5">
            {/* Total Queries */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1 truncate">
                <CheckCircle size={11} className="text-cyan-400" /> Total Queries
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white pt-0.5">
                {totalQueries.toLocaleString()}
              </div>
              <div className="text-[8px] text-slate-400">All inbound DNS</div>
            </div>

            {/* Blocked Queries */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1 truncate">
                <Prohibit size={11} className="text-rose-400" /> Blocked
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-rose-500 pt-0.5">
                {blockedQueries.toLocaleString()}
              </div>
              <div className="text-[8px] text-slate-400">Sinkholed traffic</div>
            </div>

            {/* Blocked Ratio */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1 truncate">
                <Percent size={11} className="text-indigo-400" /> Block Ratio
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-indigo-400 pt-0.5">
                {blockedRatio.toFixed(1)}%
              </div>
              <div className="text-[8px] text-slate-400">Filter percentage</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
