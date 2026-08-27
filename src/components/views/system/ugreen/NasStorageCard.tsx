/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database, ShieldCheck } from '@phosphor-icons/react';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
import { UgreenNasMetrics } from '../../../../types/ugreenNas';

interface NasStorageCardProps {
  metrics: UgreenNasMetrics;
  darkMode?: boolean;
}

export const NasStorageCard: React.FC<NasStorageCardProps> = ({
  metrics
}) => {
  const pool = metrics.storagePools[0] || {
    id: 'pool_1',
    name: 'Storage Pool 1',
    status: 'healthy',
    usagePercent: 66.7,
    usedTB: 14.55,
    totalTB: 21.82,
    freeTB: 7.27,
    raidType: 'RAID 5'
  };

  const donutData = [
    { label: 'Used Storage', value: pool.usedTB, color: '#F59E0B' },
    { label: 'Free Space', value: pool.freeTB, color: '#3B82F6' }
  ];

  const healthyDrivesCount = metrics.drives.filter((d) => d.smartHealthy).length;
  const totalDrivesCount = metrics.drives.length;

  const cardBaseStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-black/35 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between';

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-4 lg:col-span-6 ${cardBaseStyle}`}>
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shadow-inner shrink-0">
            <Database size={16} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                {pool.name}
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {pool.raidType || 'RAID 5'}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
              Raw: <span className="font-semibold text-slate-700 dark:text-slate-200">{pool.totalTB} TB</span>
            </p>
          </div>
        </div>

        {/* SMART Badge */}
        <div className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck size={13} weight="fill" />
          <span>{healthyDrivesCount}/{totalDrivesCount} SMART OK</span>
        </div>
      </div>

      {/* 2. Middle Content: Donut & Headroom Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 my-2">
        {/* Bklit Donut */}
        <div className="relative w-[140px] h-[140px] sm:w-[155px] sm:h-[155px] mx-auto flex items-center justify-center">
          <PieChart
            data={donutData}
            innerRadius={46}
            padAngle={0.04}
            cornerRadius={6}
            size={145}
            className="w-full h-full"
          >
            {donutData.map((_, i) => (
              <PieSlice key={i} index={i} />
            ))}
            <PieCenter
              defaultLabel="Pool Total"
              suffix=" TB"
              formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            >
              {({ value, isHovered, data }) => (
                <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {isHovered ? data.label : 'Pool Total'}
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                    {isHovered ? value.toFixed(2) : pool.totalTB}
                  </span>
                  <span className="text-[8px] font-bold text-amber-400">TB</span>
                </div>
              )}
            </PieCenter>
          </PieChart>
        </div>

        {/* Breakdown Stats & Progress */}
        <div className="flex flex-col justify-center gap-2.5">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 dark:text-slate-200">Volume Allocation</span>
              <span className="font-mono font-black text-amber-400">{pool.usagePercent.toFixed(1)}%</span>
            </div>
            {/* Multi-segment progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-l-full transition-all duration-500"
                style={{ width: `${pool.usagePercent}%` }}
              />
              <div
                className="h-full bg-blue-500/80 rounded-r-full transition-all duration-500"
                style={{ width: `${100 - pool.usagePercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Used Space
              </span>
              <span className="text-xs sm:text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {pool.usedTB.toFixed(2)} <span className="text-[9px] font-normal text-slate-400">TB</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col">
              <span className="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Free Headroom
              </span>
              <span className="text-xs sm:text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white">
                {pool.freeTB.toFixed(2)} <span className="text-[9px] font-normal text-slate-400">TB</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Details */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>File System: <strong className="text-slate-700 dark:text-slate-200">Btrfs (COW with Integrity)</strong></span>
        <span>Rebuild Status: <strong className="text-emerald-400">Normal</strong></span>
      </div>
    </div>
  );
};
