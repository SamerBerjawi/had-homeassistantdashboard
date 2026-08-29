/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Funnel, ListNumbers, ShieldCheck } from '@phosphor-icons/react';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
import { intFmt } from '../../../charts/chart-formatters';

interface DnsBlockingDonutCardProps {
  dnsQueriesTotal: number;
  dnsQueriesBlocked: number;
  blockedRatioPercent: number;
  rulesCount: number;
  darkMode?: boolean;
}

export const DnsBlockingDonutCard: React.FC<DnsBlockingDonutCardProps> = ({
  dnsQueriesTotal,
  dnsQueriesBlocked,
  blockedRatioPercent,
  rulesCount,
  darkMode = true
}) => {
  const allowedQueries = Math.max(0, dnsQueriesTotal - dnsQueriesBlocked);

  const donutData = [
    { label: 'Blocked Ads & Trackers', value: dnsQueriesBlocked, color: '#F43F5E' },
    {
      label: 'Allowed Clean Traffic',
      value: allowedQueries,
      color: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.25)'
    }
  ];

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-md transition-all duration-300 flex flex-col justify-between min-h-[340px] sm:min-h-[380px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-4 lg:col-span-4 ${cardBaseStyle}`}>
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <Funnel size={20} weight="duotone" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              DNS Sinkhole Ratio
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">24-Hour Breakdown</span>
          </div>
        </div>

        {/* Blocked % Badge */}
        <span className="text-[10px] font-black font-mono px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
          {blockedRatioPercent.toFixed(1)}% Blocked
        </span>
      </div>

      {/* 2. Donut Chart */}
      <div className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] mx-auto my-auto flex items-center justify-center py-2">
        <PieChart
          data={donutData}
          innerRadius={52}
          padAngle={0.04}
          cornerRadius={6}
          size={175}
          className="w-full h-full"
        >
          {donutData.map((_, i) => (
            <PieSlice key={i} index={i} />
          ))}
          <PieCenter
            defaultLabel="Total DNS"
            formatOptions={{ maximumFractionDigits: 0 }}
          >
            {({ value, isHovered, data }) => (
              <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {isHovered ? data.label : 'Total DNS'}
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                  {isHovered ? intFmt(value) : `${(dnsQueriesTotal / 1000).toFixed(1)}k`}
                </span>
                <span className="text-[9px] font-bold text-rose-400">Queries</span>
              </div>
            )}
          </PieCenter>
        </PieChart>
      </div>

      {/* 3. Footer: Active Filter Rules Pill */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ListNumbers size={14} className="text-emerald-400" />
          <span>Active Rules: <strong className="text-slate-700 dark:text-slate-200 font-mono font-bold">{intFmt(rulesCount)}</strong></span>
        </span>
        <span className="text-rose-400 font-mono font-bold">{intFmt(dnsQueriesBlocked)} Blocked</span>
      </div>
    </div>
  );
};
