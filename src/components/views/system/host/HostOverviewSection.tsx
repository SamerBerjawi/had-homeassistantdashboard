/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Clock,
  WifiHigh,
  HouseLine
} from '@phosphor-icons/react';
import { SystemHostMetrics } from '../../../../hooks/useSystemMetrics';

interface HostOverviewSectionProps {
  metrics: SystemHostMetrics;
  darkMode?: boolean;
}

export function HostOverviewSection({
  metrics,
  darkMode = true
}: HostOverviewSectionProps) {
  const cardStyle =
    'rounded-3xl backdrop-blur-md transition-all overflow-hidden isolate shadow-xs ' +
    (darkMode
      ? 'bg-slate-900/60 text-white'
      : 'bg-white/60 text-slate-900');

  const subCardStyle =
    'flex items-center gap-3 p-2.5 rounded-2xl transition-all ' +
    (darkMode
      ? 'bg-white/[0.04]'
      : 'bg-slate-900/[0.03]');

  return (
    <div className={`${cardStyle} p-3.5 sm:p-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Section 1 Header & Live Host Pill */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <HouseLine size={18} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Host Infrastructure Overview
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Host
              </span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              System Monitor Integration (Core Telemetry)
            </span>
          </div>
        </div>

        {/* Status Strip: Host Uptime & IPv4 end0 */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:w-auto">
          {/* Uptime */}
          <div className={subCardStyle}>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <Clock size={16} weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">Host Uptime</span>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200 truncate block">
                {metrics.uptime || '1 week'}
              </span>
            </div>
          </div>

          {/* IPv4 Address (end0) */}
          <div className={subCardStyle}>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <WifiHigh size={16} weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">IPv4 (end0)</span>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200 truncate block">
                {metrics.ipv4Address || '192.168.68.71'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
