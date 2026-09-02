/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSpeedTestData } from '../../../hooks/useSpeedTestData';
import { SpeedTestOverviewSection } from './speedtest/SpeedTestOverviewSection';
import { SpeedTestHistorySection } from './speedtest/SpeedTestHistorySection';
import { SpeedTestBufferbloatSection } from './speedtest/SpeedTestBufferbloatSection';
import { SpeedTestComplianceSection } from './speedtest/SpeedTestComplianceSection';

interface SpeedTestTabProps {
  darkMode?: boolean;
}

export const SpeedTestTab: React.FC<SpeedTestTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isRunningTest,
    testProgress,
    runSpeedTest
  } = useSpeedTestData();

  return (
    <div className="space-y-6 sm:space-y-7 pb-10">
      {/* Section 1: Overview, ISP Gateway & Run Test Action */}
      <SpeedTestOverviewSection
        metrics={metrics}
        isRunningTest={isRunningTest}
        testProgress={testProgress}
        onRunTest={runSpeedTest}
        darkMode={darkMode}
      />

      {/* Section 2: Combined Performance, Bandwidth & Latency Trends (Metrics + Charts) */}
      <SpeedTestHistorySection
        metrics={metrics}
        historyData={historyData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        darkMode={darkMode}
      />

      {/* Section 4: Bufferbloat & Latency Under Load Breakdown */}
      <SpeedTestBufferbloatSection
        metrics={metrics}
        darkMode={darkMode}
      />

      {/* Section 5: Plan Compliance & ISP SLA Verification Gauges */}
      <SpeedTestComplianceSection
        metrics={metrics}
        darkMode={darkMode}
      />
    </div>
  );
};
