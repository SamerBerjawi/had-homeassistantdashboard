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

  // Mini sparkline SVG path calculation with internal padding to prevent clipping
  const historyVals = (summary.history || []).map((h) => h.value);
  const minVal = historyVals.length > 0 ? Math.min(...historyVals) : 0;
  const maxVal = historyVals.length > 0 ? Math.max(...historyVals) : 1;
  const valRange = maxVal - minVal || 1;

  const sparkWidth = 70;
  const sparkHeight = 24;
  const padX = 2;
  const padY = 3;
  const sparkPoints = historyVals
    .map((v, i) => {
      const x = padX + (i / Math.max(1, historyVals.length - 1)) * (sparkWidth - padX * 2);
      const y = sparkHeight - padY - ((v - minVal) / valRange) * (sparkHeight - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Format stat helper strictly limited to at most 1 decimal digit
  const formatStatVal = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    if (def.decimals === 0) return Math.round(val).toLocaleString();
    const cappedDecimals = Math.min(def.decimals, 1);
    return val.toFixed(cappedDecimals);
  };

  return (
    <BentoCard
      colSpan={colSpan}
      hasBorderBeam={false}
      darkMode={darkMode}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (summary.entityId) openEntityDetails(summary.entityId);
      }}
      className="group relative select-none"
    >
      <div>
        {/* Row 1: Icon on Left, Status Badge on Right (never overlap) */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${def.accentColor}18`,
              borderColor: `${def.accentColor}35`,
              color: def.accentColor,
            }}
          >
            <DynamicPhosphorIcon
              name={def.iconName}
              fallback={Heartbeat}
              size={17}
              weight="duotone"
            />
          </div>

          <AnimatedBadge variant={badgeVariant} showDot={summary.status !== 'unknown'}>
            {badgeLabel}
          </AnimatedBadge>
        </div>

        {/* Row 2: Metric Name / Title (Full width, no badge crowding) */}
        <div className="mt-2 min-w-0">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate" title={def.label}>
            {def.label}
          </h3>
        </div>

        {/* Row 3: Big Value, Unit & Change Indicator */}
        <div className="flex items-baseline justify-between gap-1.5 mt-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            {summary.currentValue !== null ? (
              <NumberTicker
                value={summary.currentValue}
                decimalPlaces={Math.min(def.decimals, 1)}
                className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight"
              />
            ) : (
              <span className="text-2xl font-black text-slate-400">—</span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
              {summary.unit}
            </span>
          </div>

          {/* Change Delta Indicator */}
          {summary.changePercent !== undefined && summary.changePercent !== 0 && (
            <div
              className={`flex items-center text-[11px] font-bold shrink-0 ${
                summary.changePercent > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.changePercent > 0 ? (
                <CaretUp size={13} weight="bold" />
              ) : (
                <CaretDown size={13} weight="bold" />
              )}
              <span>{Math.abs(summary.changePercent)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Sparkline & Min/Max/Total Ribbon */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 overflow-hidden">
        <div className="min-w-0 flex-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate leading-tight">
          {def.chartType === 'bar' && summary.totalSum !== undefined ? (
            <span className="truncate block">
              Total: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatStatVal(summary.totalSum)}</strong>
            </span>
          ) : (
            <span className="truncate block">
              {summary.min !== undefined && (
                <>Min: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatStatVal(summary.min)}</strong></>
              )}
              {summary.max !== undefined && (
                <> · Max: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatStatVal(summary.max)}</strong></>
              )}
            </span>
          )}
        </div>

        {/* Mini Sparkline (Bounded and non-clipping) */}
        {sparkPoints && (
          <div className="shrink-0 w-14 h-5 overflow-hidden">
            <svg viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} className="w-full h-full block">
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
