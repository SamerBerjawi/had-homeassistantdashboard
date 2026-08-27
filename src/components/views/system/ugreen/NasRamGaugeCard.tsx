/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';

interface NasRamGaugeCardProps {
  memoryUsagePercent: number;
  memoryUsedGB: number;
  memoryTotalGB: number;
  darkMode?: boolean;
}

export const NasRamGaugeCard: React.FC<NasRamGaugeCardProps> = ({
  memoryUsagePercent,
  memoryUsedGB,
  memoryTotalGB,
  darkMode = true
}) => {
  const memColor = memoryUsagePercent > 80 ? '#F43F5E' : memoryUsagePercent > 60 ? '#F59E0B' : '#8B5CF6';

  const cardBaseStyle = `rounded-3xl p-3.5 sm:p-4 md:p-5 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[220px] sm:min-h-[250px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <Database size={16} weight="duotone" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              Memory Pressure
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">DDR5 SODIMM</span>
          </div>
        </div>
        <span
          className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full border shrink-0"
          style={{
            backgroundColor: `${memColor}1A`,
            borderColor: `${memColor}4D`,
            color: memColor
          }}
        >
          {memoryUsagePercent.toFixed(1)}%
        </span>
      </div>

      {/* Gauge */}
      <div className="my-auto py-1 flex items-center justify-center w-full min-h-[110px]">
        <div className="w-full max-w-[150px] sm:max-w-[170px] flex items-center justify-center">
          <Gauge
            value={memoryUsagePercent}
            activeFill={memColor}
            inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            suffix="%"
            defaultLabel="RAM"
            notchCornerRadius={2}
            orientation="arc"
            className="w-full"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-medium text-purple-400 font-mono">
          {memoryUsedGB.toFixed(1)} GB Used
        </span>
        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
          {(memoryTotalGB - memoryUsedGB).toFixed(1)} GB Free
        </span>
      </div>
    </div>
  );
};
