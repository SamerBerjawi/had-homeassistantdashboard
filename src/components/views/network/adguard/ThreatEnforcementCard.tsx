/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldWarning,
  Bug,
  UsersThree,
  ListNumbers,
  CheckCircle,
  LockKey,
  ShieldCheck,
  Funnel,
  TrendUp
} from '@phosphor-icons/react';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
import { intFmt } from '../../../charts/chart-formatters';

interface ThreatEnforcementCardProps {
  dnsQueriesTotal: number;
  dnsQueriesBlocked: number;
  blockedRatioPercent: number;
  safeBrowsingBlockedCount: number;
  parentalBlockedCount: number;
  rulesCount?: number;
  darkMode?: boolean;
}

export const ThreatEnforcementCard: React.FC<ThreatEnforcementCardProps> = ({
  dnsQueriesTotal,
  dnsQueriesBlocked,
  blockedRatioPercent,
  safeBrowsingBlockedCount,
  parentalBlockedCount,
  rulesCount = 3900756,
  darkMode = true
}) => {
  const allowedQueries = Math.max(0, dnsQueriesTotal - dnsQueriesBlocked);

  const donutData = [
    { label: 'Blocked Threats', value: dnsQueriesBlocked, color: '#F59E0B' },
    {
      label: 'Clean Traffic',
      value: allowedQueries,
      color: darkMode ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.65)'
    }
  ];

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-md transition-all duration-300 flex flex-col justify-between ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 ${cardBaseStyle}`}>
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldWarning size={20} weight="duotone" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight block">
              Threat Intelligence & Sinkhole Engine
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Live inspection of total processed DNS traffic, filter rules, and threat enforcement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            {intFmt(rulesCount)} Rules
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Zero-Trust Protection
          </span>
        </div>
      </div>

      {/* 2. Main Layout: Left 8 Columns (Row 1: 1.5 units each, Row 2: 1 unit each) + Right 4 Columns (2-Row Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 my-1 items-stretch">
        {/* LEFT AREA: 8 Columns on Desktop */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-3">
          {/* Top Row: Total DNS Queries (1.5 cols) & Blocked by Filters (1.5 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Total DNS Queries Tile (1.5 unit width) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-500/30 text-white shadow-lg flex flex-col justify-between min-h-[105px] relative overflow-hidden">
              <div className="flex items-baseline justify-between relative z-10">
                <span className="text-2xl sm:text-3xl xl:text-4xl font-mono font-black tracking-tight text-cyan-300 dark:text-cyan-200 drop-shadow-sm">
                  {intFmt(dnsQueriesTotal)}
                </span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 relative z-10">
                <TrendUp size={14} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200/90">
                  Total DNS Queries
                </span>
              </div>
            </div>

            {/* Blocked by Filters Tile (1.5 unit width) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 text-white shadow-lg flex flex-col justify-between min-h-[105px] relative overflow-hidden">
              <div className="flex items-baseline justify-between gap-2 relative z-10">
                <span className="text-2xl sm:text-3xl xl:text-4xl font-mono font-black tracking-tight text-amber-300 dark:text-amber-200 drop-shadow-sm">
                  {intFmt(dnsQueriesBlocked)}
                </span>
                <span className="text-xs sm:text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm shrink-0">
                  {blockedRatioPercent.toFixed(0)}% Blocked
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 relative z-10">
                <Funnel size={14} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200/90">
                  Blocked by Filters
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Malware & Phishing (1 col), Adult Content (1 col), Filter Rules (1 col) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Malware & Phishing (1 unit width) */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between min-h-[85px]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Bug size={16} weight="duotone" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  Malware & Phishing
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-rose-400">
                  {intFmt(safeBrowsingBlockedCount)}
                </span>
                <span className="text-[9px] text-slate-400">Blocked</span>
              </div>
            </div>

            {/* Adult Content (1 unit width) */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between min-h-[85px]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <UsersThree size={16} weight="duotone" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  Adult Content
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-amber-400">
                  {intFmt(parentalBlockedCount)}
                </span>
                <span className="text-[9px] text-slate-400">Stopped</span>
              </div>
            </div>

            {/* Filter Rules (1 unit width) */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-between min-h-[85px]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <ListNumbers size={16} weight="duotone" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  Filter Rules
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-indigo-300">
                  {intFmt(rulesCount)}
                </span>
                <span className="text-[9px] text-indigo-400 font-bold">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT AREA: 4 Columns on Desktop, Two-Rows Tall Pie Chart */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5 flex flex-col items-center justify-between min-h-[220px] sm:min-h-[235px]">
          <div className="w-full flex items-center justify-between pb-1 border-b border-slate-200/40 dark:border-white/5 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Traffic Distribution
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400">
              {blockedRatioPercent.toFixed(1)}% Sinkholed
            </span>
          </div>

          {/* Donut Graphic */}
          <div className="relative w-[150px] h-[150px] sm:w-[165px] sm:h-[165px] my-auto flex items-center justify-center">
            <PieChart
              data={donutData}
              innerRadius={50}
              padAngle={0.04}
              cornerRadius={5}
              size={160}
              className="w-full h-full"
            >
              {donutData.map((_, i) => (
                <PieSlice key={i} index={i} />
              ))}
              <PieCenter defaultLabel="DNS Traffic" formatOptions={{ maximumFractionDigits: 0 }}>
                {({ value, isHovered, data }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'Sinkhole'}
                    </span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                      {isHovered ? intFmt(value) : `${blockedRatioPercent.toFixed(0)}%`}
                    </span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          {/* Legend Row */}
          <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/40 dark:border-white/5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px] leading-tight">Clean</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {intFmt(allowedQueries)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px] leading-tight">Blocked</span>
                <span className="font-mono font-bold text-amber-400">
                  {intFmt(dnsQueriesBlocked)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="pt-2.5 mt-2 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <CheckCircle size={12} className="text-emerald-400" />
          <span>Local DNS Cache: <strong>Active (Zero-Leakage)</strong></span>
        </span>
        <span className="flex items-center gap-1 font-mono text-indigo-400 font-bold">
          <LockKey size={12} />
          <span>DNSSEC Validation Enabled</span>
        </span>
      </div>
    </div>
  );
};
