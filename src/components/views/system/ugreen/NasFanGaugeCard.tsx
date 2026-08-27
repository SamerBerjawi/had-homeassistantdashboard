/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Fan } from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';

interface NasFanGaugeCardProps {
  fanSpeedRpm?: number;
  fanMode?: string;
  darkMode?: boolean;
}

export const NasFanGaugeCard: React.FC<NasFanGaugeCardProps> = ({
  fanSpeedRpm = 850,
  fanMode = 'Standard',
  darkMode = true
}) => {
  const fanPercent = Math.min(100, Math.max(0, (fanSpeedRpm / 2000) * 100));

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
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Fan size={16} weight="duotone" className="animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              Fan Cooling
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">PWM Dual Fan</span>
          </div>
        </div>
        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shrink-0">
          {fanMode}
        </span>
      </div>

      {/* Gauge */}
      <div className="my-auto py-1 flex items-center justify-center w-full min-h-[110px]">
        <div className="w-full max-w-[150px] sm:max-w-[170px] flex items-center justify-center">
          <Gauge
            value={fanPercent}
            activeFill="#10B981"
            inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            suffix="%"
            defaultLabel="FAN"
            notchCornerRadius={2}
            orientation="arc"
            className="w-full"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-mono font-bold text-emerald-400">
          {fanSpeedRpm} RPM
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Thermal State: OK
        </span>
      </div>
    </div>
  );
};
