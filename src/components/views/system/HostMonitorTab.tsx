/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HouseLine } from '@phosphor-icons/react';
import { useSystemMetrics } from '../../../hooks/useSystemMetrics';
import { GenericHostMonitorView } from './GenericHostMonitorView';

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

  return (
    <GenericHostMonitorView
      title="Home Assistant Host"
      subtitle="Debian 12 / Home Assistant OS 2026.8 Core Telemetry"
      badgeText="Live Host"
      icon={<HouseLine size={26} weight="duotone" className="text-cyan-400" />}
      metrics={metrics}
      historyData={historyData}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      onRefresh={refreshHistory}
      isLoadingHistory={isLoadingHistory}
      darkMode={darkMode}
    />
  );
}
