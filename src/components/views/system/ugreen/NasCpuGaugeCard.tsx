/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, Thermometer } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';

interface NasCpuGaugeCardProps {
  cpuUsage: number;
  cpuTemp: number;
  darkMode?: boolean;
}

export const NasCpuGaugeCard: React.FC<NasCpuGaugeCardProps> = ({
  cpuUsage,
  cpuTemp,
  darkMode = true
}) => {
  const cpuColor = cpuUsage > 80 ? '#F43F5E' : cpuUsage > 60 ? '#F59E0B' : '#06B6D4';

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
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <Cpu size={16} weight="duotone" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              CPU Load
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">Intel N100 / x86</span>
          </div>
        </div>
        <span
          className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full border shrink-0"
          style={{
            backgroundColor: `${cpuColor}1A`,
            borderColor: `${cpuColor}4D`,
            color: cpuColor
          }}
        >
          {cpuUsage.toFixed(1)}%
        </span>
      </div>

      {/* Gauge */}
      <div className="my-auto py-1 flex items-center justify-center w-full min-h-[110px]">
        <div className="w-full max-w-[150px] sm:max-w-[170px] flex items-center justify-center">
          <Gauge
            value={cpuUsage}
            activeFill={cpuColor}
            inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            suffix="%"
            defaultLabel="CPU"
            notchCornerRadius={2}
            orientation="arc"
            className="w-full"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 font-medium">
          <Thermometer size={12} className={cpuTemp > 65 ? 'text-rose-400' : 'text-amber-400'} />
          <span className="text-slate-700 dark:text-slate-200 font-mono font-bold">{cpuTemp.toFixed(1)}°C</span>
        </span>
        <span className="font-semibold text-cyan-400">4 Cores / 4T</span>
      </div>
    </div>
  );
};
