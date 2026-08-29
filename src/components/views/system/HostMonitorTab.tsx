/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { useSystemMetrics, HistoryTimeRange } from '../../../hooks/useSystemMetrics';
import { HostOverviewSection } from './host/HostOverviewSection';
import { HostCpuSection } from './host/HostCpuSection';
import { HostMemorySection } from './host/HostMemorySection';
import { HostDiskSection } from './host/HostDiskSection';
import { HostNetworkSection } from './host/HostNetworkSection';

interface HostMonitorTabProps {
  darkMode?: boolean;
}

export function HostMonitorTab({ darkMode = true }: HostMonitorTabProps) {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory
  } = useSystemMetrics();

  const timeRanges: HistoryTimeRange[] = ['1h', '6h', '24h'];

  return (
    <div className="space-y-4 w-full pb-12">
      {/* Top Toolbar: Time range selector & Refresh */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Telemetry Window:
          </span>
          <div className="flex items-center gap-1 bg-slate-900/[0.04] dark:bg-white/5 p-0.5 rounded-xl border border-slate-900/[0.08] dark:border-white/5">
            {timeRanges.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  timeRange === r
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => refreshHistory()}
          disabled={isLoadingHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <ArrowsClockwise
            size={14}
            className={`text-cyan-500 dark:text-cyan-400 ${isLoadingHistory ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* Section 1: Host Overview (top status strip) */}
      <HostOverviewSection metrics={metrics} darkMode={darkMode} />

      {/* Section 2: CPU */}
      <HostCpuSection
        metrics={metrics}
        historyData={historyData}
        darkMode={darkMode}
      />

      {/* Sections 3 & 4: Memory & Storage Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <HostMemorySection metrics={metrics} darkMode={darkMode} />
        <HostDiskSection metrics={metrics} darkMode={darkMode} />
      </div>

      {/* Section 5: Network (interface: end0) */}
      <HostNetworkSection
        metrics={metrics}
        historyData={historyData}
        darkMode={darkMode}
      />
    </div>
  );
}
