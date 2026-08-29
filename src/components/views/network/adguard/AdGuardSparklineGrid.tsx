/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AdGuardSparklineGrid Component
 * Recreates the native AdGuard Home 4-card overview sparkline row
 * driven strictly by live entity metrics and Home Assistant recorder statistics.
 */

import React, { useMemo } from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldWarning,
  UserSwitch,
  Clock
} from '@phosphor-icons/react';
import { AdGuardMetrics, AdGuardTimeseriesPoint, NetworkTimeRange } from '../../../../types/network';

interface AdGuardSparklineGridProps {
  metrics: AdGuardMetrics;
  historyData: AdGuardTimeseriesPoint[];
  timeRange: NetworkTimeRange;
  onTimeRangeChange: (range: NetworkTimeRange) => void;
  darkMode?: boolean;
}

interface SparklineItem {
  id: keyof AdGuardTimeseriesPoint;
  title: string;
  footerLabel: string;
  totalValue: number;
  percentage?: number;
  color: string;
  accentBadgeColor: string;
  badgeTextColor: string;
  icon: any;
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
    return { path: `M 0,${height - padBottom} L ${width},${height - padBottom}`, areaPath: `M 0,${height - padBottom} L ${width},${height - padBottom} Z` };
  }

  const maxVal = Math.max(...data, 0);
  const domainMax = maxVal === 0 ? 5 : maxVal * 1.15;
  const usableHeight = height - padTop - padBottom;

  const pts = data.map((val, idx) => {
    const x = data.length === 1 ? width / 2 : (idx / (data.length - 1)) * width;
    const norm = Math.min(1, Math.max(0, val / domainMax));
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

  // Build monotonic cubic curve
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

    // Constrain control points to prevent overshoot below baseline
    const clampedCp1y = Math.min(height - padBottom, Math.max(padTop, cp1y));
    const clampedCp2y = Math.min(height - padBottom, Math.max(padTop, cp2y));

    d += ` C ${cp1x.toFixed(1)},${clampedCp1y.toFixed(1)} ${cp2x.toFixed(1)},${clampedCp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  const lastPt = pts[pts.length - 1];
  const firstPt = pts[0];
  const areaD = `${d} L ${lastPt.x.toFixed(1)},${height} L ${firstPt.x.toFixed(1)},${height} Z`;

  return { path: d, areaPath: areaD };
}

export const AdGuardSparklineGrid: React.FC<AdGuardSparklineGridProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  darkMode = true
}) => {
  const timeRanges: NetworkTimeRange[] = ['24H', '7D', '30D', '90D'];

  const blockedRatio =
    metrics.dnsQueriesTotal > 0
      ? Number(((metrics.dnsQueriesBlocked / metrics.dnsQueriesTotal) * 100).toFixed(0))
      : 0;

  const malwareRatio =
    metrics.dnsQueriesTotal > 0
      ? Number(((metrics.safeBrowsingBlockedCount / metrics.dnsQueriesTotal) * 100).toFixed(0))
      : 0;

  const parentalRatio =
    metrics.dnsQueriesTotal > 0
      ? Number(((metrics.parentalBlockedCount / metrics.dnsQueriesTotal) * 100).toFixed(0))
      : 0;

  const cards: SparklineItem[] = useMemo(() => {
    return [
      {
        id: 'totalQueries',
        title: 'DNS Queries',
        footerLabel: 'DNS Queries',
        totalValue: metrics.dnsQueriesTotal,
        color: '#818CF8', // Electric Indigo
        accentBadgeColor: 'rgba(129, 140, 248, 0.15)',
        badgeTextColor: '#A5B4FC',
        icon: Globe
      },
      {
        id: 'blockedQueries',
        title: 'Blocked by Filters',
        footerLabel: 'Blocked by Filters',
        totalValue: metrics.dnsQueriesBlocked,
        percentage: blockedRatio,
        color: '#F97316', // Orange / Coral
        accentBadgeColor: 'rgba(249, 115, 22, 0.18)',
        badgeTextColor: '#FB923C',
        icon: ShieldCheck
      },
      {
        id: 'safeBrowsingBlocked',
        title: 'Blocked malware/phishing',
        footerLabel: 'Blocked malware/phishing',
        totalValue: metrics.safeBrowsingBlockedCount,
        percentage: malwareRatio,
        color: '#EAB308', // Amber / Yellow
        accentBadgeColor: 'rgba(234, 179, 8, 0.18)',
        badgeTextColor: '#FDE047',
        icon: ShieldWarning
      },
      {
        id: 'parentalBlocked',
        title: 'Blocked adult websites',
        footerLabel: 'Blocked adult websites',
        totalValue: metrics.parentalBlockedCount,
        percentage: parentalRatio,
        color: '#A855F7', // Violet / Purple
        accentBadgeColor: 'rgba(168, 85, 247, 0.18)',
        badgeTextColor: '#D8B4FE',
        icon: UserSwitch
      }
    ];
  }, [metrics, blockedRatio, malwareRatio, parentalRatio]);

  const cardBgStyle = darkMode
    ? 'bg-slate-900/60 border-white/10 hover:border-white/20'
    : 'bg-white/90 border-slate-200/90 shadow-sm hover:border-slate-300';

  return (
    <div className="space-y-3">
      {/* Header bar with Timeline Range Selector */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Globe size={18} weight="duotone" className="text-indigo-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            DNS Traffic Overview
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400">
            AdGuard Native
          </span>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10">
          <Clock size={12} className="text-slate-400 ml-1 mr-0.5" />
          {timeRanges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onTimeRangeChange(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer select-none ${
                timeRange === r
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Card Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card) => {
          const seriesData = historyData.map((d) => Number(d[card.id] || 0));
          const { path, areaPath } = generateSplinePath(seriesData, 280, 56, 4, 6);
          const gradientId = `spark-grad-${card.id}`;

          return (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all p-4.5 flex flex-col justify-between min-h-[140px] ${cardBgStyle}`}
            >
              {/* Top Row: Big Primary Metric + Top-Right Percentage Badge */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white leading-none">
                    {card.totalValue.toLocaleString()}
                  </div>
                </div>

                {card.percentage !== undefined && (
                  <div
                    className="px-2 py-0.5 rounded-md text-[11px] font-black font-mono"
                    style={{
                      backgroundColor: card.accentBadgeColor,
                      color: card.badgeTextColor
                    }}
                  >
                    {card.percentage}%
                  </div>
                )}
              </div>

              {/* Middle: Sparkline SVG Chart */}
              <div className="w-full h-[56px] my-2 relative">
                <svg
                  viewBox="0 0 280 56"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={card.color} stopOpacity={0.35} />
                      <stop offset="85%" stopColor={card.color} stopOpacity={0.05} />
                      <stop offset="100%" stopColor={card.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area Fill */}
                  <path d={areaPath} fill={`url(#${gradientId})`} />

                  {/* Spline Stroke Line */}
                  <path
                    d={path}
                    fill="none"
                    stroke={card.color}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Bottom: Footer Label matching native AdGuard */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/40 dark:border-white/5">
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: darkMode ? (card.percentage !== undefined ? card.badgeTextColor : '#94A3B8') : '#475569'
                  }}
                >
                  {card.footerLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
