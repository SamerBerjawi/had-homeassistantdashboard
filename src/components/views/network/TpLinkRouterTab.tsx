/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTpLinkRouter } from '../../../hooks/useNetworkData';
import { TpLinkOverviewSection } from './tplink/TpLinkOverviewSection';
import { TpLinkPerformanceThroughputSection } from './tplink/TpLinkPerformanceThroughputSection';
import { TpLinkClientsBreakdownSection } from './tplink/TpLinkClientsBreakdownSection';
import { TpLinkWifiControlsSection } from './tplink/TpLinkWifiControlsSection';
import { TpLinkConnectedClientsSection } from './tplink/TpLinkConnectedClientsSection';
import { TpLinkDisconnectedClientsSection } from './tplink/TpLinkDisconnectedClientsSection';

interface TpLinkRouterTabProps {
  darkMode?: boolean;
}

export const TpLinkRouterTab: React.FC<TpLinkRouterTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    toggleSwitch,
    pressButton,
    isLiveMode
  } = useTpLinkRouter();

  return (
    <div className="space-y-6 sm:space-y-7 pb-10">
      {/* Section 1: Router Overview & Gateway */}
      <TpLinkOverviewSection
        metrics={metrics}
        onToggleSwitch={toggleSwitch}
        onPressButton={pressButton}
        isLiveMode={isLiveMode}
        darkMode={darkMode}
      />

      {/* Section 2: Performance & Bandwidth (1/4 CPU + 1/4 RAM + 1/2 Bandwidth Throughput row) */}
      <TpLinkPerformanceThroughputSection
        metrics={metrics}
        historyData={historyData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        darkMode={darkMode}
      />

      {/* Section 3: Clients Breakdown (Pie Chart + Legend Stats) */}
      <TpLinkClientsBreakdownSection
        metrics={metrics}
        darkMode={darkMode}
      />

      {/* Section 4: Wi-Fi Radio Controls (3x3 Matrix: Main, Guest, IoT) */}
      <TpLinkWifiControlsSection
        metrics={metrics}
        onToggleSwitch={toggleSwitch}
        darkMode={darkMode}
      />

      {/* Section 5: Connected Clients (Live device_tracker entities in state home) */}
      <TpLinkConnectedClientsSection
        metrics={metrics}
        darkMode={darkMode}
      />

      {/* Section 6: Disconnected Clients (device_tracker entities in state not_home, collapsed) */}
      <TpLinkDisconnectedClientsSection
        metrics={metrics}
        darkMode={darkMode}
      />
    </div>
  );
};
