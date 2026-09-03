/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Health Metric Bento Card
 * Individual metric card showing real-time state, unit, status badge,
 * mini sparkline, min/max bounds, and native HA entity detail drilldown.
 */

import React from 'react';
import { CaretUp, CaretDown, Heartbeat } from '@phosphor-icons/react';
import { BentoCard } from '../../ui/BentoCard';
import { NumberTicker } from '../../ui/NumberTicker';
import { AnimatedBadge, BadgeVariant } from '../../ui/AnimatedBadge';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { HealthMetricSummary, HEALTH_METRIC_DEFINITIONS } from '../../../types/health';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';

interface HealthMetricCardProps {
  summary: HealthMetricSummary;
  darkMode?: boolean;
  highlighted?: boolean;
  colSpan?: 1 | 2;
  onClick?: () => void;
}

export const HealthMetricCard: React.FC<HealthMetricCardProps> = ({
  summary,
  darkMode = true,
  highlighted = false,
  colSpan = 1,
  onClick,
}) => {
  const { openEntityDetails } = useEntityPopup();
  const def = HEALTH_METRIC_DEFINITIONS[summary.key];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (summary.entityId) {
      openEntityDetails(summary.entityId);
    }
  };

  // Status badge variant mapping
  let badgeVariant: BadgeVariant = 'neutral';
  let badgeLabel = 'Normal';
  switch (summary.status) {
    case 'optimal':
      badgeVariant = 'emerald';
      badgeLabel = 'Optimal';
      break;
    case 'elevated':
      badgeVariant = 'rose';
      badgeLabel = 'Elevated';
      break;
    case 'low':
      badgeVariant = 'amber';
      badgeLabel = 'Low';
      break;
    case 'normal':
      badgeVariant = 'cyan';
      badgeLabel = 'Normal';
      break;
  }

  // Mini sparkline SVG path calculation
  const historyVals = (summary.history || []).map((h) => h.value);
  const minVal = historyVals.length > 0 ? Math.min(...historyVals) : 0;
  const maxVal = historyVals.length > 0 ? Math.max(...historyVals) : 1;
  const valRange = maxVal - minVal || 1;

  const sparkWidth = 100;
  const sparkHeight = 32;
  const sparkPoints = historyVals
    .map((v, i) => {
      const x = (i / Math.max(1, historyVals.length - 1)) * sparkWidth;
      const y = sparkHeight - ((v - minVal) / valRange) * (sparkHeight - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <BentoCard
      colSpan={colSpan}
      hasBorderBeam={highlighted}
      borderBeamColorFrom={def.accentColor}
      borderBeamColorTo="#AF52DE"
      darkMode={darkMode}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (summary.entityId) openEntityDetails(summary.entityId);
      }}
      className="group relative select-none"
    >
      <div>
        {/* Card Header: Icon, Label, Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${def.accentColor}18`,
                borderColor: `${def.accentColor}35`,
                color: def.accentColor,
              }}
            >
              <DynamicPhosphorIcon
                name={def.iconName}
                fallback={Heartbeat}
                size={18}
                weight="duotone"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold truncate text-slate-800 dark:text-white">
                {def.label}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {summary.entityId ? 'Home Assistant' : 'Demo Metric'}
              </p>
            </div>
          </div>

          <AnimatedBadge variant={badgeVariant} showDot={summary.status !== 'unknown'}>
            {badgeLabel}
          </AnimatedBadge>
        </div>

        {/* Big Number & Unit */}
        <div className="flex items-baseline justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-1.5">
            {summary.currentValue !== null ? (
              <NumberTicker
                value={summary.currentValue}
                decimalPlaces={def.decimals}
                className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight"
              />
            ) : (
              <span className="text-2xl font-black text-slate-400">—</span>
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {summary.unit}
            </span>
          </div>

          {/* Change Delta Indicator */}
          {summary.changePercent !== undefined && summary.changePercent !== 0 && (
            <div
              className={`flex items-center text-xs font-bold ${
                summary.changePercent > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.changePercent > 0 ? (
                <CaretUp size={14} weight="bold" />
              ) : (
                <CaretDown size={14} weight="bold" />
              )}
              <span>{Math.abs(summary.changePercent)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Sparkline & Min/Max/Avg Stat Ribbon */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 space-x-2">
          {def.chartType === 'bar' && summary.totalSum !== undefined ? (
            <span>
              Total: <strong className="text-slate-700 dark:text-slate-300">{summary.totalSum.toLocaleString()}</strong>
            </span>
          ) : (
            <>
              {summary.min !== undefined && (
                <span>
                  Min: <strong className="text-slate-700 dark:text-slate-300">{summary.min}</strong>
                </span>
              )}
              {summary.max !== undefined && (
                <span>
                  Max: <strong className="text-slate-700 dark:text-slate-300">{summary.max}</strong>
                </span>
              )}
            </>
          )}
        </div>

        {/* Mini Sparkline */}
        {sparkPoints && (
          <div className="shrink-0 w-24 h-7">
            <svg viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={`sparkGrad-${summary.key}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={def.accentColor} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={def.accentColor} stopOpacity={1} />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke={`url(#sparkGrad-${summary.key})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparkPoints}
              />
            </svg>
          </div>
        )}
      </div>
    </BentoCard>
  );
};
