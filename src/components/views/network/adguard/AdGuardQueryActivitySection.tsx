/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  GlobeHemisphereWest,
  CheckCircle,
  Prohibit
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
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
    'rounded-3xl backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900');

  const totalQueries = metrics.dnsQueriesTotal;
  const blockedQueries = metrics.dnsQueriesBlocked;
  const allowedQueries = metrics.dnsQueriesAllowed;
  const blockedRatio = metrics.blockedRatioPercent;

  return (
    <div className={`${cardStyle} space-y-3`}>
      {/* Clean Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} weight="duotone" className="text-cyan-500 dark:text-cyan-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            DNS Query Activity
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            {totalQueries.toLocaleString()} Total
          </span>
          <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400">
            Active Filter
          </span>
        </div>
      </div>

      {/* High-Density Row: Gauge + 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
        {/* Left: Blocked Ratio Headline Arc Gauge */}
        <div className="sm:col-span-4 w-full h-[130px] max-w-[170px] mx-auto flex items-center justify-center">
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

        {/* Right: 3 Compact Data Statistics */}
        <div className="sm:col-span-8 grid grid-cols-3 gap-2 sm:gap-3">
          {/* Total Queries */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.03] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 pb-1">
              <div className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <GlobeHemisphereWest size={12} weight="duotone" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">Total</span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white truncate">
              {totalQueries.toLocaleString()}
            </span>
            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate">
              100% Inbound
            </span>
          </div>

          {/* Blocked Queries */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-500/10 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 pb-1">
              <div className="w-5 h-5 rounded-md bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <Prohibit size={12} weight="duotone" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 truncate">Blocked</span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-indigo-900 dark:text-indigo-200 truncate">
              {blockedQueries.toLocaleString()}
            </span>
            <span className="text-[9px] font-mono font-extrabold text-indigo-700 dark:text-indigo-400 truncate">
              {blockedRatio.toFixed(1)}% Filtered
            </span>
          </div>

          {/* Allowed Queries */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 pb-1">
              <div className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle size={12} weight="duotone" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">Allowed</span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-950 dark:text-emerald-200 truncate">
              {allowedQueries.toLocaleString()}
            </span>
            <span className="text-[9px] font-mono font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
              {(100 - blockedRatio).toFixed(1)}% Passed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
