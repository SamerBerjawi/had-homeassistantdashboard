/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ListChecks,
  Timer,
  Lightning,
  ShieldCheck
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { AdGuardMetrics } from '../../../../types/network';

interface AdGuardPerformanceSectionProps {
  metrics: AdGuardMetrics;
  darkMode?: boolean;
}

export const AdGuardPerformanceSection: React.FC<AdGuardPerformanceSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-3xl backdrop-blur-2xl transition-all p-5 sm:p-6 ' +
    (darkMode
      ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80');

  const rulesCount = metrics.rulesCount;
  const speed = metrics.avgProcessingSpeedMs;
  const unit = metrics.avgProcessingSpeedUnit || 'ms';

  // Inverted color ramp for latency (<25ms = Green, 25-50ms = Amber, >50ms = Red)
  const speedColor =
    speed < 25 ? '#10B981' : speed <= 50 ? '#F59E0B' : '#EF4444';

  const speedRating =
    speed < 25 ? 'Ultra-Fast' : speed <= 50 ? 'Moderate' : 'High Latency';

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Lightning size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Performance
          </h2>
        </div>
      </div>

      {/* Two-Up Responsive Row: 1/2 on mobile (grid-cols-2) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* Card 1: Active Filter Rules (1/2 on mobile) */}
        <div className={`col-span-1 ${cardStyle} flex flex-col justify-between min-h-[190px] sm:min-h-[220px]`}>
          <div>
            <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                  <ListChecks size={18} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                    Filter Rules
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                    Compiled blocklists &amp; allowlists
                  </p>
                </div>
              </div>

              <span className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                In-Memory
              </span>
            </div>

            <div className="py-2.5 sm:py-4 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {rulesCount.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-400">
                  Active
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                Evaluated with sub-millisecond lookup trees.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Average Processing Speed (1/2 on mobile) */}
        <div className={`col-span-1 ${cardStyle} flex flex-col justify-between min-h-[190px] sm:min-h-[220px]`}>
          <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Timer size={18} weight="duotone" />
              </div>
              <div>
                <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                  Processing Speed
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  DNS engine resolution latency
                </p>
              </div>
            </div>

            <span
              className="text-[8px] sm:text-[9px] font-mono font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${speedColor}1A`,
                color: speedColor
              }}
            >
              {speedRating}
            </span>
          </div>

          {/* Inverted Gauge: lower latency is better */}
          <div className="w-full flex-1 min-h-[130px] sm:min-h-[185px] max-w-[280px] mx-auto flex items-center justify-center py-1 sm:py-2">
            <Gauge
              value={Math.min(100, Math.max(0, speed))}
              centerValue={speed}
              defaultLabel="LATENCY"
              suffix={` ${unit}`}
              activeFill={speedColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
