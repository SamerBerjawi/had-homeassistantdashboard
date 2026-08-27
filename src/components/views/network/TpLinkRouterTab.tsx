/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BentoGrid } from '../../ui/bento-grid';
import { useTpLinkRouter } from '../../../hooks/useNetworkData';
import { TpLinkTopBadgesBar } from './tplink/TpLinkTopBadgesBar';
import { RouterOverviewCard } from './tplink/RouterOverviewCard';
import { BandwidthTrafficCard } from './tplink/BandwidthTrafficCard';
import { ConnectedClientsCard } from './tplink/ConnectedClientsCard';
import { ArrowClockwise } from '@phosphor-icons/react';

interface TpLinkRouterTabProps {
  darkMode?: boolean;
}

export const TpLinkRouterTab: React.FC<TpLinkRouterTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory,
    toggleSwitch,
    pressButton,
    isLiveMode
  } = useTpLinkRouter();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Info Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {metrics.model} Gateway Subsystem
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {isLiveMode ? 'Live HA Integration' : 'Simulated Telemetry'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshHistory}
            disabled={isLoadingHistory}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-black/30 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
          >
            <ArrowClockwise size={13} className={isLoadingHistory ? 'animate-spin text-sky-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Badges Controls Bar (2.4G, 5G, 6G, Guest Wi-Fi with QR, IoT, VPN) */}
      <TpLinkTopBadgesBar
        wifiSwitches={metrics.wifiSwitches}
        onToggleSwitch={toggleSwitch}
        darkMode={darkMode}
      />

      {/* Bento Grid Layout */}
      <BentoGrid className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3 sm:gap-4.5 auto-rows-auto">
        {/* Row 1: Hero Bandwidth Timeseries Chart (Spacious 8 columns on desktop) */}
        <BandwidthTrafficCard
          currentDownloadSpeedKBps={metrics.currentDownloadSpeedKBps}
          currentUploadSpeedKBps={metrics.currentUploadSpeedKBps}
          totalDownloadGB={metrics.totalDownloadGB}
          totalUploadGB={metrics.totalUploadGB}
          historyData={historyData}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          darkMode={darkMode}
        />

        {/* Row 1: Gateway Overview Card (4 columns companion on desktop) */}
        <RouterOverviewCard
          metrics={metrics}
          onReboot={pressButton}
          darkMode={darkMode}
        />

        {/* Row 2: Full-Width Connected Clients Matrix (12 columns) */}
        <ConnectedClientsCard
          clients={metrics.clients}
          totalClientsCount={metrics.connectedClientsCount}
          wiredCount={metrics.wiredClientsCount}
          wirelessCount={metrics.wirelessClientsCount}
          darkMode={darkMode}
        />
      </BentoGrid>
    </div>
  );
};
