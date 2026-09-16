/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AdGuardSparklineGrid Component
 * Recreates the native AdGuard Home 4-card overview sparkline row
 * driven strictly by live entity metrics and Home Assistant recorder statistics,
 * rendered with interactive Recharts monotone curves, gradients, and custom tooltips.
 */

import React, { useMemo } from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldWarning,
  UserSwitch,
  Clock
} from '@phosphor-icons/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  YAxis
} from 'recharts';
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
        color: '#6366F1', // Electric Indigo
        accentBadgeColor: 'rgba(99, 102, 241, 0.15)',
        badgeTextColor: '#818CF8',
        icon: Globe
      },
      {
        id: 'blockedQueries',
        title: 'Blocked by Filters',
        footerLabel: 'Blocked by Filters',
        totalValue: metrics.dnsQueriesBlocked,
        percentage: blockedRatio,
        color: '#F97316', // Vibrant Orange / Coral
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

  const cardBgStyle =
    'rounded-3xl backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] hover:border-slate-300/80 dark:hover:border-white/15 ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900');

  const formatPointTime = (dateObj: Date) => {
    if (timeRange === '24H') {
      return dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (timeRange === '7D') {
      return dateObj.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', hour12: true });
    }
    return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderTooltip = (props: any, card: SparklineItem) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div
        className={`px-3 py-2 rounded-2xl shadow-2xl border text-[11px] font-sans backdrop-blur-2xl ${
          darkMode
            ? 'bg-black/60 border-white/15 text-white'
            : 'bg-white/70 border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}
      >
        <div className="text-[10px] font-mono text-slate-400 pb-1 border-b border-white/10">
          {point.timeFormatted}
        </div>
        <div className="flex items-center gap-2 pt-1.5 font-bold">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
          <span className="font-mono">{Number(point.value || 0).toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 font-normal">queries</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header bar with Timeline Range Selector */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Globe size={18} weight="duotone" className="text-indigo-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            DNS Traffic Overview
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            AdGuard Native
          </span>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
          <Clock size={12} className="text-slate-400 ml-1 mr-0.5" />
          {timeRanges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onTimeRangeChange(r)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer select-none ${
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
          const Icon = card.icon;
          const cardData = historyData.map((d) => {
            const dateObj = d.date instanceof Date ? d.date : new Date(d.date);
            return {
              date: dateObj,
              timeFormatted: formatPointTime(dateObj),
              value: Number(d[card.id] || 0)
            };
          });

          const gradientId = `spark-grad-${card.id}`;
          const latestVal = cardData.length > 0 ? cardData[cardData.length - 1].value : 0;

          return (
            <div
              key={card.id}
              className={`relative p-4 sm:p-5 flex flex-col justify-between min-h-[155px] ${cardBgStyle}`}
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

              {/* Middle: Interactive Recharts Monotone Area Chart */}
              <div className="w-full h-[62px] my-1 relative">
                {cardData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-medium">
                    No recorded telemetry
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cardData}
                      margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={card.color} stopOpacity={0.42} />
                          <stop offset="70%" stopColor={card.color} stopOpacity={0.10} />
                          <stop offset="100%" stopColor={card.color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip
                        content={(props) => renderTooltip(props, card)}
                        cursor={{
                          stroke: card.color,
                          strokeWidth: 1.2,
                          strokeDasharray: '2 2',
                          opacity: 0.6
                        }}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={card.color}
                        strokeWidth={2.2}
                        fill={`url(#${gradientId})`}
                        dot={false}
                        activeDot={{
                          r: 3.5,
                          fill: card.color,
                          stroke: darkMode ? '#020617' : '#ffffff',
                          strokeWidth: 2
                        }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bottom: Footer Label matching native AdGuard */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/40 dark:border-white/5">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} weight="duotone" style={{ color: card.color }} />
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: darkMode ? (card.percentage !== undefined ? card.badgeTextColor : '#94A3B8') : '#475569'
                    }}
                  >
                    {card.footerLabel}
                  </span>
                </div>
                {latestVal > 0 && (
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    +{latestVal.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
