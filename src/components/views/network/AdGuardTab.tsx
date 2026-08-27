/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BentoGrid } from '../../ui/bento-grid';
import { useAdGuardHome } from '../../../hooks/useNetworkData';
import { AdGuardTopBadgesBar } from './adguard/AdGuardTopBadgesBar';
import { QueryPerformanceCard } from './adguard/QueryPerformanceCard';
import { ThreatEnforcementCard } from './adguard/ThreatEnforcementCard';
import { ArrowClockwise } from '@phosphor-icons/react';

interface AdGuardTabProps {
  darkMode?: boolean;
}

export const AdGuardTab: React.FC<AdGuardTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory,
    toggleSwitch,
    isLiveMode
  } = useAdGuardHome();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Info Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            AdGuard Home Network Protection Subsystem
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {isLiveMode ? '● Live Sensor Stream' : '○ Simulated Network'}
          </span>
          <button
            type="button"
            onClick={refreshHistory}
            disabled={isLoadingHistory}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-black/30 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
          >
            <ArrowClockwise size={13} className={isLoadingHistory ? 'animate-spin text-emerald-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Badges Controls Bar (Master Protection, Filtering, Safe Browsing, Safe Search, Parental, Query Log) */}
      <AdGuardTopBadgesBar
        metrics={metrics}
        onToggleSwitch={toggleSwitch}
        darkMode={darkMode}
      />

      {/* Bento Grid Layout */}
      <BentoGrid className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3 sm:gap-4.5 auto-rows-auto">
        {/* Row 1: Threat Intelligence & DNS Query Statistics with Integrated Pie Chart (12 columns full-width) */}
        <ThreatEnforcementCard
          dnsQueriesTotal={metrics.dnsQueriesTotal}
          dnsQueriesBlocked={metrics.dnsQueriesBlocked}
          blockedRatioPercent={metrics.blockedRatioPercent}
          safeBrowsingBlockedCount={metrics.safeBrowsingBlockedCount}
          parentalBlockedCount={metrics.parentalBlockedCount}
          rulesCount={metrics.rulesCount}
          darkMode={darkMode}
        />

        {/* Row 2: Hero Query Latency & 90-Day Volume Timeseries Line Chart (12 columns full-width) */}
        <QueryPerformanceCard
          avgProcessingSpeedMs={metrics.avgProcessingSpeedMs}
          historyData={historyData}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          darkMode={darkMode}
        />
      </BentoGrid>
    </div>
  );
};
