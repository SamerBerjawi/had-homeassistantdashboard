/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Speedometer,
  Play,
  ArrowSquareOut,
  Buildings,
  HardDrives,
  Medal,
  Clock,
  CheckCircle,
  WarningCircle,
  Sparkle
} from '@phosphor-icons/react';
import { SpeedTestMetrics } from '../../../../types/network';

interface SpeedTestOverviewSectionProps {
  metrics: SpeedTestMetrics;
  isRunningTest: boolean;
  testProgress: number;
  onRunTest: () => Promise<void>;
  darkMode?: boolean;
}

export const SpeedTestOverviewSection: React.FC<SpeedTestOverviewSectionProps> = ({
  metrics,
  isRunningTest,
  testProgress,
  onRunTest,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-3xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900');

  const tileStyle =
    'p-3.5 rounded-2xl backdrop-blur-sm transition-all ' +
    (darkMode
      ? 'bg-white/[0.04] text-white hover:bg-white/[0.07]'
      : 'bg-slate-900/[0.03] text-slate-900 hover:bg-slate-900/[0.06]');

  // Bufferbloat grade styling helper
  const getGradeColor = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20' };
    if (g.startsWith('B')) return { text: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/20' };
    if (g.startsWith('C')) return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' };
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/20' };
  };

  const gradeColors = getGradeColor(metrics.bufferbloatGrade);

  return (
    <div className="space-y-3">
      {/* Section Header with Actions & Last Tested Pill */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <Speedometer size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Speed Test &amp; WAN Performance
          </h2>
          <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={10} weight="fill" /> Ookla Verified
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Last Test Pill */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
            <Clock size={13} weight="duotone" className="text-slate-400" />
            <span>Last Test: {metrics.lastTest}</span>
          </div>

          {/* Ookla Result External Link */}
          {metrics.resultUrl && (
            <a
              href={metrics.resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all cursor-pointer"
            >
              <span>Result Link</span>
              <ArrowSquareOut size={12} weight="bold" />
            </a>
          )}

          {/* Interactive Run Test Button */}
          <button
            type="button"
            onClick={onRunTest}
            disabled={isRunningTest}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md ${
              isRunningTest
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/25 active:scale-95'
            }`}
          >
            {isRunningTest ? (
              <>
                <Sparkle size={14} weight="fill" className="animate-spin" />
                <span>Testing ({testProgress}%)</span>
              </>
            ) : (
              <>
                <Play size={13} weight="fill" />
                <span>Run Speed Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Overview Card with 4 Telemetry Tiles */}
      <div className={cardStyle}>
        {isRunningTest && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Sparkle size={16} weight="fill" className="animate-spin" />
              <span>Executing active Ookla Speedtest telemetry benchmark...</span>
            </div>
            <span className="font-bold">{testProgress}%</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tile 1: ISP */}
          <div className={tileStyle}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Buildings size={14} weight="duotone" className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider">ISP Provider</span>
              </div>
              <span className="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Active WAN
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-mono">
              {metrics.isp}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Gateway Service
            </p>
          </div>

          {/* Tile 2: Server */}
          <div className={tileStyle}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <HardDrives size={14} weight="duotone" className="text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-wider">Test Server</span>
              </div>
              <span className="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                Measurement
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-mono">
              {metrics.server}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Active Speedtest host
            </p>
          </div>

          {/* Tile 3: Bufferbloat Grade */}
          <div className={tileStyle}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Medal size={14} weight="duotone" className={gradeColors.text} />
                <span className="text-[10px] font-black uppercase tracking-wider">Bufferbloat</span>
              </div>
              <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${gradeColors.bg} ${gradeColors.text} ${gradeColors.border}`}>
                Grade {metrics.bufferbloatGrade}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${gradeColors.text}`}>
                {metrics.bufferbloatGrade}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {metrics.bufferbloatGrade.startsWith('A') ? 'Low Latency Under Load' : metrics.bufferbloatGrade === 'B' ? 'Good Stability' : 'Moderate Queueing'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Quality under heavy load
            </p>
          </div>

          {/* Tile 4: SLA Compliance Summary */}
          <div className={tileStyle}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <CheckCircle size={14} weight="duotone" className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-wider">Plan SLA</span>
              </div>
              <span className="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                {metrics.downloadPlanCompliancePercent > 0 ? 'Compliance' : 'Bandwidth'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {metrics.downloadPlanCompliancePercent > 0 ? `${metrics.downloadPlanCompliancePercent}%` : `${metrics.downloadSpeedMbps.toFixed(1)}M`}
              </span>
              <span className="text-[11px] font-mono text-indigo-400 font-bold">
                {metrics.downloadPlanCompliancePercent > 0
                  ? `Down / ${metrics.uploadPlanCompliancePercent}% Up`
                  : `Down / ${metrics.uploadSpeedMbps.toFixed(1)}M Up`}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {metrics.downloadPlanCompliancePercent > 0 ? 'Subscribed speed achieved' : 'Observed throughput'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
