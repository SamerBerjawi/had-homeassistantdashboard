/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HouseLine,
  Clock,
  GlobeHemisphereWest,
  Cpu,
  CheckCircle,
  WifiHigh
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
    'rounded-2xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/80 dark:border-white/10 p-3 sm:p-4 shadow-sm';

  return (
    <div className="space-y-3">
      {/* Top Banner & Info Strip */}
      <div className={`${cardStyle} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        {/* Left: Host Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <HouseLine size={24} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                Home Assistant Host
              </h2>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Host
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              Debian 12 / Home Assistant OS Core Telemetry (System Monitor)
            </p>
          </div>
        </div>

        {/* Right: Section 1 spec items (Uptime & IPv4 end0) in a clean inline strip */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
          {/* Uptime */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <Clock size={16} weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Host Uptime</span>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200 truncate block">
                {metrics.uptime || '1 week'}
              </span>
            </div>
          </div>

          {/* IPv4 Address (end0) */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <WifiHigh size={16} weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">IPv4 (end0)</span>
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
