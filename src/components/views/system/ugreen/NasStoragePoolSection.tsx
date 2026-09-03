/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database, ShieldCheck, HardDrives, CheckCircle } from '@phosphor-icons/react';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
import { NasStoragePool1 } from '../../../../types/ugreenNas';

interface NasStoragePoolSectionProps {
  pool: NasStoragePool1;
  darkMode?: boolean;
}

export const NasStoragePoolSection: React.FC<NasStoragePoolSectionProps> = ({
  pool,
  darkMode = true
}) => {
  const isHealthy = pool.status.toLowerCase().includes('health') || pool.status.toLowerCase().includes('normal') || pool.status.toLowerCase().includes('ok');

  const donutData = [
    { label: 'Used Storage', value: Math.max(0.01, pool.usedSizeVal), color: '#F59E0B' },
    { label: 'Free Space', value: Math.max(0.01, pool.freeSizeVal), color: '#3B82F6' }
  ];

  const totalNumeric = (pool.usedSizeVal + pool.freeSizeVal).toFixed(2);
  const usedPercent = pool.usedSizeVal + pool.freeSizeVal > 0
    ? ((pool.usedSizeVal / (pool.usedSizeVal + pool.freeSizeVal)) * 100).toFixed(1)
    : '0.0';

  const cardStyle = `rounded-3xl p-4 sm:p-5 backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
    darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900'
  }`;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Database size={15} weight="duotone" />
          </div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Storage Pool (Pool 1)
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
          {pool.level} Array
        </span>
      </div>

      {/* Main Container: Pool Summary & Capacity Pie Chart */}
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center ${cardStyle}`}>
        {/* Left: Pool Summary Card Details */}
        <div className="md:col-span-6 space-y-3 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-white/10 pb-4 md:pb-0 md:pr-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {pool.label}
                </h4>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pool.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pool.name}</p>
            </div>

            {/* Health Badge */}
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                isHealthy
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {isHealthy ? <CheckCircle size={13} weight="fill" /> : <ShieldCheck size={13} weight="fill" />}
              <span>{pool.status}</span>
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <HardDrives size={12} className="text-amber-400" /> Member Disks
              </span>
              <span className="text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white block">
                {pool.diskCount} Disks Active
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Database size={12} className="text-cyan-400" /> Total Capacity
              </span>
              <span className="text-sm font-black font-mono mt-0.5 text-slate-900 dark:text-white block">
                {pool.totalSize}
              </span>
            </div>
          </div>

          {/* Allocation Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-slate-600 dark:text-slate-300">Pool Allocation</span>
              <span className="font-mono text-amber-400">{usedPercent}% Used</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                style={{ width: `${usedPercent}%` }}
              />
              <div
                className="h-full bg-blue-500/80 transition-all duration-500"
                style={{ width: `${100 - Number(usedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Bklit Capacity Pie Chart */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-[160px] h-[160px] sm:w-[175px] sm:h-[175px] flex items-center justify-center">
            <PieChart
              data={donutData}
              innerRadius={52}
              padAngle={0.04}
              cornerRadius={6}
              size={165}
              className="w-full h-full"
            >
              {donutData.map((_, i) => (
                <PieSlice key={i} index={i} />
              ))}
              <PieCenter
                defaultLabel="Total Pool"
                suffix=""
              >
                {({ value, isHovered, data }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'Pool Total'}
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                      {isHovered ? `${value.toFixed(2)} TB` : pool.totalSize}
                    </span>
                    <span className="text-[9px] font-bold text-amber-400">
                      {isHovered ? `${((value / (pool.usedSizeVal + pool.freeSizeVal)) * 100).toFixed(0)}%` : 'RAID 5'}
                    </span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          {/* Breakdown Badges & Available Caption */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400 text-[10px]">Used:</span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-[11px]">{pool.usedSize}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-500 dark:text-slate-400 text-[10px]">Free:</span>
              <span className="font-mono font-black text-slate-900 dark:text-white text-[11px]">{pool.freeSize}</span>
            </div>
          </div>

          {/* Small Caption under chart as requested */}
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 text-center">
            {pool.availableSize}
          </p>
        </div>
      </div>
    </div>
  );
};
