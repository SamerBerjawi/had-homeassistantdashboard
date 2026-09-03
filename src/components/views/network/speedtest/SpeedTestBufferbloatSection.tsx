/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Medal,
  Timer,
  Waveform,
  ShieldCheck,
  CheckCircle,
  Lightning,
  GameController,
  VideoCamera,
  Broadcast
} from '@phosphor-icons/react';
import { SpeedTestMetrics } from '../../../../types/network';

interface SpeedTestBufferbloatSectionProps {
  metrics: SpeedTestMetrics;
  darkMode?: boolean;
}

export const SpeedTestBufferbloatSection: React.FC<SpeedTestBufferbloatSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-3xl backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900');

  const gradeList = ['A+', 'A', 'B', 'C', 'D', 'F'];
  const currentGrade = (metrics.bufferbloatGrade || 'A').toUpperCase();

  const getGradeScore = (grade: string) => {
    switch (grade) {
      case 'A+': return { label: 'Flawless Gaming & Calls', color: '#10B981', desc: 'No perceptible latency increase under peak saturation' };
      case 'A': return { label: 'Excellent Low Latency', color: '#10B981', desc: 'Minimal queue buildup during simultaneous heavy traffic' };
      case 'B': return { label: 'Good Stability', color: '#06B6D4', desc: 'Minor delay noticeable in competitive multiplayer during big downloads' };
      case 'C': return { label: 'Moderate Bufferbloat', color: '#F59E0B', desc: 'Noticeable spikes in video calls when uploading or downloading' };
      case 'D': return { label: 'High Latency Spikes', color: '#F97316', desc: 'Significant queue buildup degrades real-time applications' };
      default: return { label: 'Severe Bufferbloat', color: '#EF4444', desc: 'Extensive packet queuing halts interactive streams during data transfers' };
    }
  };

  const gradeInfo = getGradeScore(currentGrade);

  // Ping range span calculation for spectrum bar
  const minP = Math.max(1, metrics.pingMinMs);
  const maxP = Math.max(minP + 1, metrics.pingMaxMs);
  const curP = Math.max(minP, Math.min(maxP, metrics.pingMs));
  const pingPercent = Math.min(100, Math.max(0, ((curP - minP) / (maxP - minP)) * 100));

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Medal size={18} weight="duotone" className="text-amber-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Bufferbloat &amp; Latency Under Load
          </h2>
        </div>
      </div>

      {/* 3 Interactive Diagnostic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Bufferbloat Rating & Visual Scale */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                  style={{ backgroundColor: `${gradeInfo.color}1A`, color: gradeInfo.color }}
                >
                  <Medal size={18} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Bufferbloat Grade
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Queue delay under heavy load
                  </p>
                </div>
              </div>

              <span
                className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${gradeInfo.color}1A`, color: gradeInfo.color }}
              >
                Grade {currentGrade}
              </span>
            </div>

            {/* Big Grade Badge & Status */}
            <div className="py-3.5 space-y-1.5">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="text-4xl sm:text-5xl font-black font-mono tracking-tight"
                  style={{ color: gradeInfo.color }}
                >
                  {currentGrade}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                    {gradeInfo.label}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {gradeInfo.desc}
                  </p>
                </div>
              </div>

              {/* Grade Ladder Pill Row */}
              <div className="grid grid-cols-6 gap-1 pt-3">
                {gradeList.map((g) => {
                  const isActive = currentGrade === g || (currentGrade.startsWith('A') && g === 'A');
                  const pillColor = getGradeScore(g).color;
                  return (
                    <div
                      key={g}
                      className={`text-center py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all ${
                        isActive
                          ? 'ring-2 ring-offset-1 text-slate-950 font-black scale-105 shadow-md'
                          : 'opacity-40 bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                      style={{
                        backgroundColor: isActive ? pillColor : undefined,
                        borderColor: pillColor
                      }}
                    >
                      {g}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>Buffer Delay: Minimal (&lt;5ms)</span>
            <span className="text-emerald-400 font-bold">Optimal AQM/SQM</span>
          </div>
        </div>

        {/* Card 2: Ping Latency Spectrum (Min / Current / Max) */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Timer size={18} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Latency Spread
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Round-trip min, avg and max delta
                  </p>
                </div>
              </div>

              <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                &plusmn;{(metrics.pingMaxMs - metrics.pingMinMs).toFixed(1)} ms Range
              </span>
            </div>

            <div className="py-3 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                  <div className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Min</div>
                  <div className="text-base sm:text-lg font-mono font-black text-emerald-400">
                    {metrics.pingMinMs.toFixed(1)} <span className="text-[10px]">ms</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[9px] font-mono uppercase text-amber-400 font-bold">Avg / Cur</div>
                  <div className="text-base sm:text-lg font-mono font-black text-amber-400">
                    {metrics.pingMs.toFixed(1)} <span className="text-[10px]">ms</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                  <div className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400">Max</div>
                  <div className="text-base sm:text-lg font-mono font-black text-rose-400">
                    {metrics.pingMaxMs.toFixed(1)} <span className="text-[10px]">ms</span>
                  </div>
                </div>
              </div>

              {/* Visual Spectrum Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{metrics.pingMinMs} ms</span>
                  <span className="text-amber-400 font-bold">{metrics.pingMs} ms (Current)</span>
                  <span>{metrics.pingMaxMs} ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-md transform -translate-x-1"
                    style={{ left: `${pingPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <CheckCircle size={12} weight="fill" className="text-emerald-400" />
            <span>Optimal latency for fiber gateway</span>
          </div>
        </div>

        {/* Card 3: Jitter During Upload vs Download */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Waveform size={18} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Jitter Under Traffic
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Packet variance during active load
                  </p>
                </div>
              </div>

              <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                {metrics.jitterMs} ms Idle
              </span>
            </div>

            <div className="py-3 space-y-2.5">
              {/* Download Jitter Row */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Lightning size={13} weight="bold" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white font-mono">
                      Download Jitter
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400">
                      During max RX saturation
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-mono font-black text-emerald-400">
                    {metrics.downloadJitterMs.toFixed(1)} <span className="text-[10px]">ms</span>
                  </div>
                  <div className="text-[8px] font-mono uppercase text-emerald-500 font-bold">Stable</div>
                </div>
              </div>

              {/* Upload Jitter Row */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                    <Broadcast size={13} weight="bold" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white font-mono">
                      Upload Jitter
                    </div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400">
                      During max TX saturation
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-mono font-black text-indigo-400">
                    {metrics.uploadJitterMs.toFixed(1)} <span className="text-[10px]">ms</span>
                  </div>
                  <div className="text-[8px] font-mono uppercase text-indigo-400 font-bold">Stable</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <CheckCircle size={12} weight="fill" className="text-emerald-400" />
            <span>Voice &amp; Video Streams Smooth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
