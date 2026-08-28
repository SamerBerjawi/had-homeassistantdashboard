/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAdGuardData } from '../../../hooks/useAdGuardData';
import { AdGuardProtectionSection } from './adguard/AdGuardProtectionSection';
import { AdGuardSparklineGrid } from './adguard/AdGuardSparklineGrid';
import { AdGuardQueryActivitySection } from './adguard/AdGuardQueryActivitySection';
import { AdGuardTrafficHistorySection } from './adguard/AdGuardTrafficHistorySection';
import { AdGuardThreatSection } from './adguard/AdGuardThreatSection';
import { AdGuardPerformanceSection } from './adguard/AdGuardPerformanceSection';

interface AdGuardTabProps {
  darkMode?: boolean;
}

export const AdGuardTab: React.FC<AdGuardTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    toggleSwitch
  } = useAdGuardData();

  return (
    <div className="space-y-6 sm:space-y-7 pb-10">
      {/* Section 1: Native AdGuard 4-Card Sparkline Overview Grid */}
      <AdGuardSparklineGrid
        metrics={metrics}
        historyData={historyData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        darkMode={darkMode}
      />

      {/* Section 2: Protection Controls (Master Switch & Sub-Toggles Grid) */}
      <AdGuardProtectionSection
        metrics={metrics}
        onToggleSwitch={toggleSwitch}
        darkMode={darkMode}
      />

      {/* Section 3: Query Activity (Blocked Ratio Gauge, Donut Breakdown & Summary Stats) */}
      <AdGuardQueryActivitySection
        metrics={metrics}
        darkMode={darkMode}
      />

      {/* Section 3: DNS Traffic History (Bklit Line Chart with Unified vs. Split View Toggle) */}
      <AdGuardTrafficHistorySection
        historyData={historyData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        darkMode={darkMode}
      />

      {/* Section 4: Threat & Enforcement Breakdown (Independent Metric Cards) */}
      <AdGuardThreatSection
        metrics={metrics}
        darkMode={darkMode}
      />

      {/* Section 5: Filtering & Performance (Rules Count & Inverted Latency Gauge) */}
      <AdGuardPerformanceSection
        metrics={metrics}
        darkMode={darkMode}
      />
    </div>
  );
};
