/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BentoGrid } from '../../ui/bento-grid';
import { useUgreenNas } from '../../../hooks/useUgreenNas';
import { NasCpuGaugeCard } from './ugreen/NasCpuGaugeCard';
import { NasRamGaugeCard } from './ugreen/NasRamGaugeCard';
import { NasFanGaugeCard } from './ugreen/NasFanGaugeCard';
import { NasControlsCard } from './ugreen/NasControlsCard';
import { NasStorageCard } from './ugreen/NasStorageCard';
import { NasNetworkTaskCard } from './ugreen/NasNetworkTaskCard';
import { NasDriveBayMatrix } from './ugreen/NasDriveBayMatrix';
import { ArrowClockwise } from '@phosphor-icons/react';

interface UgreenNasTabProps {
  darkMode?: boolean;
}

export const UgreenNasTab: React.FC<UgreenNasTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    historyData,
    timeRange,
    setTimeRange,
    isLoadingHistory,
    refreshHistory,
    toggleSwitch,
    pressButton,
    setFanMode,
    isLiveMode
  } = useUgreenNas();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Info Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {metrics.modelName} Subsystem
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
            <ArrowClockwise size={13} className={isLoadingHistory ? 'animate-spin text-cyan-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Asymmetrical Bento Grid with Varied Spans & Heights */}
      <BentoGrid className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3 sm:gap-4.5 auto-rows-auto">
        {/* Row 1: 3 Separated Gauges + 1 Hardware Controls Tile */}
        {/* (2-by-2 on mobile, 4-in-a-row on desktop) */}

        {/* 1. CPU Gauge Tile */}
        <NasCpuGaugeCard
          cpuUsage={metrics.cpuUsage}
          cpuTemp={metrics.cpuTemp}
          darkMode={darkMode}
        />

        {/* 2. Memory Gauge Tile */}
        <NasRamGaugeCard
          memoryUsagePercent={metrics.memoryUsagePercent}
          memoryUsedGB={metrics.memoryUsedGB}
          memoryTotalGB={metrics.memoryTotalGB}
          darkMode={darkMode}
        />

        {/* 3. Fan Gauge Tile */}
        <NasFanGaugeCard
          fanSpeedRpm={metrics.fanSpeedRpm}
          fanMode={metrics.fanMode}
          darkMode={darkMode}
        />

        {/* 4. Dedicated Controls & Power Section (Overview Badge Style) */}
        <NasControlsCard
          metrics={metrics}
          onToggleSwitch={toggleSwitch}
          onPressButton={pressButton}
          onSetFanMode={setFanMode}
          darkMode={darkMode}
        />

        {/* Row 2: Storage Donut & Network Timeseries (Dual Hero Cards) */}
        {/* (Full width on mobile, half width on desktop) */}

        {/* 5. Storage Pool Donut & Volume Allocation */}
        <NasStorageCard
          metrics={metrics}
          darkMode={darkMode}
        />

        {/* 6. Network Timeseries Line Chart & Cloud Backup Trigger */}
        <NasNetworkTaskCard
          metrics={metrics}
          historyData={historyData}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onRunBackup={pressButton}
          darkMode={darkMode}
        />

        {/* Row 3: Physical Drive Bay Visualizer Matrix (Full Width Hero) */}
        {/* (Spans all 12 columns on desktop for optimal horizontal space) */}

        {/* 7. Drive Bay Matrix (4x HDD + 2x M.2 NVMe) */}
        <NasDriveBayMatrix
          drives={metrics.drives}
        />
      </BentoGrid>
    </div>
  );
};
