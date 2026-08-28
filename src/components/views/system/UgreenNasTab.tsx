/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowClockwise, HardDrives } from '@phosphor-icons/react';
import { useUgreenNas } from '../../../hooks/useUgreenNas';
import { NasOverviewSection } from './ugreen/NasOverviewSection';
import { NasStoragePoolSection } from './ugreen/NasStoragePoolSection';
import { NasVolumeSection } from './ugreen/NasVolumeSection';
import { NasDisksSection } from './ugreen/NasDisksSection';

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
    pressButton,
    setFanMode,
    setPowerMode,
    isLiveMode
  } = useUgreenNas();

  return (
    <div className="space-y-5 pb-8 w-full">
      {/* Top Toolbar: Time Range Selector & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Telemetry Window:
          </span>
          <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/5">
            {(['1h', '6h', '24h'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={refreshHistory}
          disabled={isLoadingHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 disabled:opacity-50"
        >
          <ArrowClockwise size={14} className={`text-amber-400 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* SECTION 1: NAS Overview */}
      <section className="space-y-2">
        <NasOverviewSection
          metrics={metrics}
          historyData={historyData}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onPressButton={pressButton}
          onSetFanMode={setFanMode}
          onSetPowerMode={setPowerMode}
          darkMode={darkMode}
        />
      </section>

      {/* SECTION 2: Storage Pool (Pool 1) */}
      <section className="space-y-2 pt-2">
        <NasStoragePoolSection
          pool={metrics.pool1}
          darkMode={darkMode}
        />
      </section>

      {/* SECTION 3: Volume (Pool 1 | Volume 1) */}
      <section className="space-y-2 pt-2">
        <NasVolumeSection
          volume={metrics.volume1}
          historyData={historyData}
          darkMode={darkMode}
        />
      </section>

      {/* SECTION 4: Disks (4-Bay Matrix) */}
      <section className="space-y-2 pt-2">
        <NasDisksSection
          disks={metrics.disks}
          historyData={historyData}
          adoptButtonEntityId={metrics.buttons.adoptDiskEntityId}
          onPressButton={pressButton}
          darkMode={darkMode}
        />
      </section>
    </div>
  );
};
