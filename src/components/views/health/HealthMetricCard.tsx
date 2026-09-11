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
      className="group relative select-none h-[136px] flex flex-col justify-between"
    >
      <div className="flex flex-col h-full justify-between">
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
        <div className="mt-1.5 min-w-0">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate" title={def.label}>
            {def.label}
          </h3>
        </div>

        {/* Row 3: Big Value, Unit & Change Indicator */}
        <div className="flex items-baseline justify-between gap-1.5 mt-auto pt-1">
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
    </BentoCard>
  );
};
