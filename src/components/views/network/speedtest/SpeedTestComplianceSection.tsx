/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ShieldCheck
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { SpeedTestMetrics } from '../../../../types/network';

interface SpeedTestComplianceSectionProps {
  metrics: SpeedTestMetrics;
  darkMode?: boolean;
}

export const SpeedTestComplianceSection: React.FC<SpeedTestComplianceSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-3xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900');

  const downCompliance = metrics.downloadPlanCompliancePercent;
  const upCompliance = metrics.uploadPlanCompliancePercent;

  const getComplianceStatus = (pct: number) => {
    if (pct <= 0) return { label: 'Unmetered', color: '#6366F1', badgeBg: 'bg-indigo-500/15', badgeText: 'text-indigo-400', badgeBorder: 'border-indigo-500/20' };
    if (pct >= 90) return { label: 'Optimal SLA', color: '#10B981', badgeBg: 'bg-emerald-500/15', badgeText: 'text-emerald-400', badgeBorder: 'border-emerald-500/20' };
    if (pct >= 75) return { label: 'Acceptable', color: '#06B6D4', badgeBg: 'bg-cyan-500/15', badgeText: 'text-cyan-400', badgeBorder: 'border-cyan-500/20' };
    if (pct >= 50) return { label: 'Degraded', color: '#F59E0B', badgeBg: 'bg-amber-500/15', badgeText: 'text-amber-400', badgeBorder: 'border-amber-500/20' };
    return { label: 'Critical Violation', color: '#EF4444', badgeBg: 'bg-rose-500/15', badgeText: 'text-rose-400', badgeBorder: 'border-rose-500/20' };
  };

  const downStatus = getComplianceStatus(downCompliance);
  const upStatus = getComplianceStatus(upCompliance);

  const estimatedDownPlan = downCompliance > 0
    ? Math.round(metrics.downloadSpeedMbps / (downCompliance / 100))
    : Math.round(metrics.downloadSpeedMbps);

  const estimatedUpPlan = upCompliance > 0
    ? Math.round(metrics.uploadSpeedMbps / (upCompliance / 100))
    : Math.round(metrics.uploadSpeedMbps);

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Plan Compliance &amp; ISP SLA Verification
          </h2>
        </div>
      </div>

      {/* Two-Column Responsive Grid for Download & Upload SLA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Download Plan Compliance */}
        <div className={`${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[250px]`}>
          <div>
            <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <ArrowDown size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                    Download Plan Compliance
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Provisioned speed tier vs observed throughput
                  </p>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${downStatus.badgeBg} ${downStatus.badgeText} ${downStatus.badgeBorder}`}
              >
                {downStatus.label}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
                  {downCompliance > 0 ? `${downCompliance}%` : `${metrics.downloadSpeedMbps.toFixed(1)} Mbps`}
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {downCompliance > 0
                    ? `${metrics.downloadSpeedMbps.toFixed(1)} Mbps / ${estimatedDownPlan} Mbps Plan`
                    : 'Live Measured Download Speed'}
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>{downCompliance > 0 ? 'Peak Target: 100%' : 'Direct Telemetry'}</span>
              </div>
            </div>
          </div>

          {/* Arc Gauge for Download Compliance */}
          <div className="w-full h-[125px] sm:h-[145px] max-w-[240px] mx-auto flex items-center justify-center py-1">
            <Gauge
              value={downCompliance > 0 ? Math.min(100, Math.max(0, downCompliance)) : Math.min(100, (metrics.downloadSpeedMbps / 1000) * 100)}
              centerValue={downCompliance > 0 ? downCompliance : metrics.downloadSpeedMbps}
              defaultLabel={downCompliance > 0 ? 'DOWN SLA' : 'DOWN SPEED'}
              suffix={downCompliance > 0 ? '%' : ' M'}
              activeFill={downStatus.color}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Card 2: Upload Plan Compliance */}
        <div className={`${cardStyle} flex flex-col justify-between min-h-[220px] sm:min-h-[250px]`}>
          <div>
            <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                  <ArrowUp size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                    Upload Plan Compliance
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Upstream throughput delivery ratio
                  </p>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${upStatus.badgeBg} ${upStatus.badgeText} ${upStatus.badgeBorder}`}
              >
                {upStatus.label}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-400">
                  {upCompliance > 0 ? `${upCompliance}%` : `${metrics.uploadSpeedMbps.toFixed(1)} Mbps`}
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {upCompliance > 0
                    ? `${metrics.uploadSpeedMbps.toFixed(1)} Mbps / ${estimatedUpPlan} Mbps Plan`
                    : 'Live Measured Upload Speed'}
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>{upCompliance > 0 ? 'Peak Target: 100%' : 'Direct Telemetry'}</span>
              </div>
            </div>
          </div>

          {/* Arc Gauge for Upload Compliance */}
          <div className="w-full h-[125px] sm:h-[145px] max-w-[240px] mx-auto flex items-center justify-center py-1">
            <Gauge
              value={upCompliance > 0 ? Math.min(100, Math.max(0, upCompliance)) : Math.min(100, (metrics.uploadSpeedMbps / 500) * 100)}
              centerValue={upCompliance > 0 ? upCompliance : metrics.uploadSpeedMbps}
              defaultLabel={upCompliance > 0 ? 'UP SLA' : 'UP SPEED'}
              suffix={upCompliance > 0 ? '%' : ' M'}
              activeFill={upStatus.color}
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
