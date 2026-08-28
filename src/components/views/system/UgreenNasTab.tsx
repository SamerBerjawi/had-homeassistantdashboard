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
    <div className="space-y-6 pb-8 max-w-[1600px] mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shadow-inner shrink-0">
            <HardDrives size={18} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {metrics.identity.name} ({metrics.identity.model})
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                {isLiveMode ? 'Live HA Integration' : 'Simulated Telemetry'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              4-Bay Desktop NAS Subsystem • UGOS Pro v{metrics.identity.ugosVersion.replace(/^UGOS\s*(Pro)?\s*v?/i, '')}
            </p>
          </div>
        </div>

        {/* Global Time Range Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/60 dark:border-white/10">
            {(['1h', '6h', '24h'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={refreshHistory}
            disabled={isLoadingHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-black/30 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-200"
          >
            <ArrowClockwise size={13} className={isLoadingHistory ? 'animate-spin text-amber-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
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
