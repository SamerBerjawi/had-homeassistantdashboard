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
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

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
            Filtering &amp; Performance
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
            Section 5
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Engine Latency &amp; Blocklist Database
        </div>
      </div>

      {/* Two-Up Responsive Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {/* Card 1: Active Filter Rules (Big Number) */}
        <div className={`${cardStyle} flex flex-col justify-between min-h-[220px]`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                  <ListChecks size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Active Filter Rules
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Compiled blocklists, allowlists &amp; custom regex
                  </p>
                </div>
              </div>

              <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                In-Memory DB
              </span>
            </div>

            <div className="py-4 space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {rulesCount.toLocaleString()}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  Rules Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                Optimized regex expressions and blocklist subscriptions evaluated with sub-millisecond lookup trees.
              </p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Blocklist Subscriptions Synchronized</span>
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
              {rulesCount > 100000 ? 'Comprehensive' : 'Standard'}
            </span>
          </div>
        </div>

        {/* Card 2: Average Processing Speed (Inverted Latency Gauge) */}
        <div className={`${cardStyle} flex flex-col justify-between min-h-[220px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Timer size={20} weight="duotone" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Average Processing Speed
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  DNS engine resolution &amp; upstream query latency
                </p>
              </div>
            </div>

            <span
              className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${speedColor}1A`,
                color: speedColor
              }}
            >
              {speedRating}
            </span>
          </div>

          {/* Inverted Gauge: lower latency is better */}
          <div className="w-full flex-1 min-h-[170px] max-w-[280px] mx-auto flex items-center justify-center py-2">
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

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Thresholds: &lt;25ms (Green), 25–50ms (Amber), &gt;50ms (Red)</span>
            <span className="font-mono font-bold" style={{ color: speedColor }}>
              {speed.toFixed(1)} {unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
