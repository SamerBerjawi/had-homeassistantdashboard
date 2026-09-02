/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Timer,
  Waveform,
  Pulse
} from '@phosphor-icons/react';
import { SpeedTestMetrics, SpeedTestTimeseriesPoint, NetworkTimeRange } from '../../../../types/network';

interface SpeedTestSparklineGridProps {
  metrics: SpeedTestMetrics;
  historyData: SpeedTestTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

interface SpeedSparklineCard {
  id: string;
  title: string;
  mainValue: string;
  unit: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: any;
  color: string;
  data: number[];
  footerLeft: string;
  footerRight: string;
}

/**
 * Generate smooth SVG path string from points using monotonic cubic interpolation
 */
function generateSplinePath(
  data: number[],
  width: number,
  height: number,
  padBottom = 4,
  padTop = 4
): { path: string; areaPath: string } {
  if (!data || data.length === 0) {
    return {
      path: `M 0,${height - padBottom} L ${width},${height - padBottom}`,
      areaPath: `M 0,${height - padBottom} L ${width},${height - padBottom} Z`
    };
  }

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal;
  const domainMin = Math.max(0, minVal - range * 0.15);
  const domainMax = maxVal === domainMin ? domainMin + 10 : maxVal + range * 0.15;
  const domainSpan = domainMax - domainMin || 1;
  const usableHeight = height - padTop - padBottom;

  const pts = data.map((val, idx) => {
    const x = data.length === 1 ? width / 2 : (idx / (data.length - 1)) * width;
    const norm = Math.min(1, Math.max(0, (val - domainMin) / domainSpan));
    const y = height - padBottom - norm * usableHeight;
    return { x, y };
  });

  if (pts.length === 1) {
    const y = pts[0].y;
    return {
      path: `M 0,${y} L ${width},${y}`,
      areaPath: `M 0,${y} L ${width},${y} L ${width},${height} L 0,${height} Z`
    };
  }

  // Monotonic cubic curve
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    const clampedCp1y = Math.min(height - padBottom, Math.max(padTop, cp1y));
    const clampedCp2y = Math.min(height - padBottom, Math.max(padTop, cp2y));

    d += ` C ${cp1x.toFixed(1)},${clampedCp1y.toFixed(1)} ${cp2x.toFixed(1)},${clampedCp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaD = `${d} L ${lastPt.x.toFixed(1)},${height} L ${firstPt.x.toFixed(1)},${height} Z`;

  return { path: d, areaPath: areaD };
}

export const SpeedTestSparklineGrid: React.FC<SpeedTestSparklineGridProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 flex flex-col justify-between ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const timeRanges: NetworkTimeRange[] = ['24H', '7D', '30D', '90D'];

  const cards: SpeedSparklineCard[] = useMemo(() => {
    const downloadPoints = historyData.map((d) => d.downloadMbps);
    const uploadPoints = historyData.map((d) => d.uploadMbps);
    const pingPoints = historyData.map((d) => d.pingMs);
    const jitterPoints = historyData.map((d) => d.jitterMs);

    return [
      {
        id: 'download',
        title: 'Download Speed',
        mainValue: metrics.downloadSpeedMbps.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
        unit: 'Mbps',
        badgeLabel: metrics.downloadPlanCompliancePercent > 0 ? `${metrics.downloadPlanCompliancePercent}% Plan Compliance` : 'Throughput RX',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-400',
        badgeBorder: 'border-emerald-500/20',
        icon: ArrowDown,
        color: '#10B981', // Emerald
        data: downloadPoints,
        footerLeft: `Max: ${Math.max(...downloadPoints, metrics.downloadSpeedMbps).toFixed(1)} Mbps`,
        footerRight: metrics.downloadPlanCompliancePercent > 0 
          ? `Plan: ${(metrics.downloadSpeedMbps / (metrics.downloadPlanCompliancePercent / 100)).toFixed(0)} Mbps`
          : `Live: ${metrics.downloadSpeedMbps.toFixed(1)} Mbps`
      },
      {
        id: 'upload',
        title: 'Upload Speed',
        mainValue: metrics.uploadSpeedMbps.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
        unit: 'Mbps',
        badgeLabel: metrics.uploadPlanCompliancePercent > 0 ? `${metrics.uploadPlanCompliancePercent}% Plan Compliance` : 'Throughput TX',
        badgeBg: 'bg-indigo-500/15',
        badgeText: 'text-indigo-400',
        badgeBorder: 'border-indigo-500/20',
        icon: ArrowUp,
        color: '#6366F1', // Indigo
        data: uploadPoints,
        footerLeft: `Max: ${Math.max(...uploadPoints, metrics.uploadSpeedMbps).toFixed(1)} Mbps`,
        footerRight: metrics.uploadPlanCompliancePercent > 0
          ? `Plan: ${(metrics.uploadSpeedMbps / (metrics.uploadPlanCompliancePercent / 100)).toFixed(0)} Mbps`
          : `Live: ${metrics.uploadSpeedMbps.toFixed(1)} Mbps`
      },
      {
        id: 'ping',
        title: 'Ping / Latency',
        mainValue: metrics.pingMs.toFixed(1),
        unit: 'ms',
        badgeLabel: `Min ${metrics.pingMinMs} ms / Max ${metrics.pingMaxMs} ms`,
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-400',
        badgeBorder: 'border-amber-500/20',
        icon: Timer,
        color: '#F59E0B', // Amber
        data: pingPoints,
        footerLeft: `Min: ${metrics.pingMinMs} ms`,
        footerRight: `Max: ${metrics.pingMaxMs} ms`
      },
      {
        id: 'jitter',
        title: 'Jitter Stability',
        mainValue: metrics.jitterMs.toFixed(1),
        unit: 'ms',
        badgeLabel: `Down ${metrics.downloadJitterMs}ms / Up ${metrics.uploadJitterMs}ms`,
        badgeBg: 'bg-cyan-500/15',
        badgeText: 'text-cyan-400',
        badgeBorder: 'border-cyan-500/20',
        icon: Waveform,
        color: '#06B6D4', // Cyan
        data: jitterPoints,
        footerLeft: `Down Jitter: ${metrics.downloadJitterMs} ms`,
        footerRight: `Up Jitter: ${metrics.uploadJitterMs} ms`
      }
    ];
  }, [metrics, historyData]);

  return (
    <div className="space-y-3">
      {/* Section Header with Time Range Selectors */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Pulse size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Bandwidth &amp; Latency Overview
          </h2>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
          {timeRanges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Sparkline Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const { path, areaPath } = generateSplinePath(card.data, 280, 52, 2, 4);

          return (
            <div key={card.id} className={`${cardStyle} min-h-[175px]`}>
              <div>
                {/* Header of Card */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-inner"
                      style={{
                        backgroundColor: `${card.color}1A`,
                        color: card.color
                      }}
                    >
                      <Icon size={16} weight="duotone" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                      {card.title}
                    </h3>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border ${card.badgeBg} ${card.badgeText} ${card.badgeBorder} truncate max-w-[130px]`}
                  >
                    {card.badgeLabel}
                  </span>
                </div>

                {/* Big Metric Display */}
                <div className="pt-3 pb-1 flex items-baseline gap-1.5">
                  <span
                    className="text-2xl sm:text-3xl font-black font-mono tracking-tight"
                    style={{ color: card.color }}
                  >
                    {card.mainValue}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    {card.unit}
                  </span>
                </div>
              </div>

              {/* Monotonic Spline Sparkline Chart */}
              <div className="w-full h-[52px] my-1 relative overflow-hidden">
                <svg
                  viewBox="0 0 280 52"
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={card.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={card.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path d={areaPath} fill={`url(#grad-${card.id})`} />
                  {/* Stroke curve */}
                  <path
                    d={path}
                    fill="none"
                    stroke={card.color}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Sub-Footer Stats */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-white/5">
                <span>{card.footerLeft}</span>
                <span>{card.footerRight}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
