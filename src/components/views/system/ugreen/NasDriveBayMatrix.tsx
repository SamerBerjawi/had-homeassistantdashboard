/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HardDrive,
  Cpu,
  CheckCircle,
  WarningCircle,
  Moon,
  Thermometer,
  ShieldCheck
} from '@phosphor-icons/react';
import { DriveSlot } from '../../../../types/ugreenNas';

interface NasDriveBayMatrixProps {
  drives: DriveSlot[];
}

export const NasDriveBayMatrix: React.FC<NasDriveBayMatrixProps> = ({ drives }) => {
  const hddBays = drives.filter((d) => d.type === 'hdd');
  const nvmeSlots = drives.filter((d) => d.type === 'nvme_ssd');

  const cardBaseStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-black/35 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between';

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 ${cardBaseStyle}`}>
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
            <HardDrive size={16} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                Drive Bay Matrix
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                4x SATA HDD + 2x M.2 NVMe
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
              Real-time hardware health, spin states, and thermals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active</span>
          <span className="w-2 h-2 rounded-full bg-blue-400 ml-2" />
          <span>Standby</span>
        </div>
      </div>

      {/* 2. Bay Grid: 4 HDDs + 2 NVMe Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 my-3">
        {/* 3.5" SATA Bays */}
        {hddBays.map((bay) => {
          const isStandby = bay.isSleeping || bay.status === 'standby';
          return (
            <div
              key={bay.slot}
              className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-2.5 ${
                isStandby
                  ? 'bg-blue-500/5 border-blue-500/20 text-slate-400'
                  : 'bg-slate-500/5 border-slate-200/60 dark:border-white/10 hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isStandby
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                  }`}
                >
                  {isStandby ? <Moon size={16} weight="duotone" /> : <HardDrive size={16} weight="duotone" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Bay {bay.slot}
                    </span>
                    {isStandby ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400">
                        Standby
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[150px]">
                    {bay.model}
                  </p>
                </div>
              </div>

              {/* Status & Temp */}
              <div className="flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                  <Thermometer size={11} className={bay.temperature > 45 ? 'text-rose-400' : 'text-amber-400'} />
                  <span>{bay.temperature}°C</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {bay.smartHealthy ? (
                    <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle size={10} weight="fill" /> OK
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-rose-400 flex items-center gap-0.5">
                      <WarningCircle size={10} weight="fill" /> Warning
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* M.2 NVMe Slots */}
        {nvmeSlots.map((slot) => (
          <div
            key={slot.slot}
            className="p-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 transition-all duration-300 flex items-center justify-between gap-2.5 sm:col-span-1"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
                <Cpu size={16} weight="duotone" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    M.2 #{slot.slot - 4}
                  </span>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400">
                    NVMe
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[150px]">
                  {slot.model}
                </p>
              </div>
            </div>

            {/* NVMe Endurance & Temp */}
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                <Thermometer size={11} className="text-amber-400" />
                <span>{slot.temperature}°C</span>
              </div>
              <span className="text-[9px] font-bold text-purple-400 mt-0.5">
                {slot.lifespanPercent || 99}% Life
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Footer */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>S.M.A.R.T. Periodic Self-Test: <strong>Active (Passed)</strong></span>
        </span>
        <span>Auto-Spindown: <strong className="text-blue-400">20 min</strong></span>
      </div>
    </div>
  );
};
