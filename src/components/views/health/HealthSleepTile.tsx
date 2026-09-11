/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Square Apple Health Sleep Bento Cards
 * 1. HealthSleepDurationCard: Square tile with sleep duration & backlit distribution pie/donut chart
 * 2. HealthSleepStagesCard: Square tile with detailed breakdown of Awake, REM, Core, and Deep stages
 *
 * Designed to seamlessly match the rest of the square metric cards in the dashboard.
 */

import React, { useMemo } from 'react';
import { MoonStars, Bed, Sparkle } from '@phosphor-icons/react';
import { BentoCard } from '../../ui/BentoCard';
import { AnimatedBadge } from '../../ui/AnimatedBadge';
import { HealthMetricSummary } from '../../../types/health';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';
import { parseSleepDuration } from '../../../services/haHealthStatistics';

interface HealthSleepCardsProps {
  summary?: HealthMetricSummary; // sleepDuration
  sleepDuration?: HealthMetricSummary;
  awake?: HealthMetricSummary;
  coreSleep?: HealthMetricSummary;
  deepSleep?: HealthMetricSummary;
  remSleep?: HealthMetricSummary;
  darkMode?: boolean;
}

/**
 * Tile 1: Square Sleep Duration Card with Backlit Pie / Donut Chart
 */
export const HealthSleepDurationCard: React.FC<HealthSleepCardsProps> = ({
  summary,
  sleepDuration,
  awake,
  coreSleep,
  deepSleep,
  remSleep,
  darkMode = true,
}) => {
  const { openEntityDetails } = useEntityPopup();
  const activeSleep = summary || sleepDuration;

  const parsedDuration = useMemo(() => {
    return parseSleepDuration(activeSleep?.currentValue, activeSleep?.unit);
  }, [activeSleep?.currentValue, activeSleep?.unit]);

  const parsedAwake = useMemo(() => {
    return parseSleepDuration(awake?.currentValue, awake?.unit || 'min');
  }, [awake?.currentValue, awake?.unit]);

  const parsedCore = useMemo(() => {
    return parseSleepDuration(coreSleep?.currentValue, coreSleep?.unit);
  }, [coreSleep?.currentValue, coreSleep?.unit]);

  const parsedDeep = useMemo(() => {
    return parseSleepDuration(deepSleep?.currentValue, deepSleep?.unit);
  }, [deepSleep?.currentValue, deepSleep?.unit]);

  const parsedRem = useMemo(() => {
    return parseSleepDuration(remSleep?.currentValue, remSleep?.unit);
  }, [remSleep?.currentValue, remSleep?.unit]);

  // Stage distribution calculations
  const totalStageMins =
    parsedAwake.totalMinutes +
    parsedRem.totalMinutes +
    parsedCore.totalMinutes +
    parsedDeep.totalMinutes;

  const totalMinutes = Math.max(
    totalStageMins,
    parsedDuration.totalMinutes + parsedAwake.totalMinutes,
    1
  );

  // SVG Donut geometry for compact backlit pie chart
  const radius = 18;
  const strokeWidth = 4.5;
  const circumference = 2 * Math.PI * radius; // ~113.1

  const stageSlices = useMemo(() => {
    const raw = [
      { key: 'awake', name: 'Awake', mins: parsedAwake.totalMinutes, color: '#FF9F0A' }, // Amber
      { key: 'rem', name: 'REM', mins: parsedRem.totalMinutes, color: '#64D2FF' }, // Cyan
      { key: 'core', name: 'Core', mins: parsedCore.totalMinutes, color: '#0A84FF' }, // Blue
      { key: 'deep', name: 'Deep', mins: parsedDeep.totalMinutes, color: '#5E5CE6' }, // Violet
    ];

    let currentOffset = 0;
    return raw.map((st) => {
      const pct = totalMinutes > 0 ? st.mins / totalMinutes : 0;
      const strokeDash = pct * circumference;
      const offset = currentOffset;
      currentOffset += strokeDash;
      return {
        ...st,
        pct: Math.round(pct * 100),
        dashArray: `${strokeDash} ${circumference}`,
        dashOffset: -offset,
      };
    });
  }, [parsedAwake, parsedRem, parsedCore, parsedDeep, totalMinutes, circumference]);

  // Goal & status
  const sleepGoalMinutes = 8 * 60;
  const goalPct = Math.min(150, Math.round((parsedDuration.totalMinutes / sleepGoalMinutes) * 100));

  let badgeVariant: 'emerald' | 'cyan' | 'amber' | 'neutral' = 'neutral';
  let badgeLabel = 'Normal';
  if (parsedDuration.hours >= 7 && parsedDuration.hours <= 9) {
    badgeVariant = 'emerald';
    badgeLabel = 'Optimal';
  } else if (parsedDuration.hours > 9) {
    badgeVariant = 'cyan';
    badgeLabel = 'Extended';
  } else if (parsedDuration.hours > 0 && parsedDuration.hours < 6) {
    badgeVariant = 'amber';
    badgeLabel = 'Low';
  } else if (parsedDuration.hours === 0) {
    badgeVariant = 'neutral';
    badgeLabel = 'No Data';
  }

  const handleClick = () => {
    if (activeSleep?.entityId) openEntityDetails(activeSleep.entityId);
  };

  return (
    <BentoCard
      colSpan={1}
      hasBorderBeam={false}
      darkMode={darkMode}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (activeSleep?.entityId) openEntityDetails(activeSleep.entityId);
      }}
      className="group relative select-none cursor-pointer h-[136px] flex flex-col justify-between"
    >
      <div className="flex flex-col h-full justify-between">
        {/* Row 1: Icon on Left, Status Badge on Right */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'rgba(94, 92, 230, 0.15)',
              borderColor: 'rgba(94, 92, 230, 0.35)',
              color: '#5E5CE6',
            }}
          >
            <MoonStars size={17} weight="duotone" />
          </div>

          <AnimatedBadge variant={badgeVariant} showDot={parsedDuration.totalMinutes > 0}>
            {badgeLabel}
          </AnimatedBadge>
        </div>

        {/* Row 2: Card Title */}
        <div className="mt-1.5 min-w-0">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate">
            Sleep Duration
          </h3>
        </div>

        {/* Row 3: Big Value on Left & Backlit Pie Chart on Right */}
        <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
          <div className="min-w-0 flex flex-col">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {parsedDuration.formatted !== '—' ? parsedDuration.formatted : '—'}
            </span>
            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mt-1 truncate">
              {goalPct > 0 ? `${goalPct}% of 8h goal` : '/ 8h goal'}
            </span>
          </div>

          {/* Backlit Pie / Donut Chart */}
          <div className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
            {/* Ambient Glow Backlight */}
            <div
              className="absolute inset-0 rounded-full blur-xs opacity-50 pointer-events-none transition-opacity duration-300 group-hover:opacity-75"
              style={{
                background: 'radial-gradient(circle, rgba(94, 92, 230, 0.5) 0%, rgba(10, 132, 255, 0.3) 60%, transparent 80%)',
              }}
            />

            <svg viewBox="0 0 46 46" className="w-full h-full block -rotate-90">
              {/* Background Track */}
              <circle
                cx="23"
                cy="23"
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="none"
                className="text-slate-200/50 dark:text-white/5"
              />

              {/* Backlit Glow Ring */}
              <circle
                cx="23"
                cy="23"
                r={radius}
                stroke="#5E5CE6"
                strokeWidth={strokeWidth + 2}
                fill="none"
                opacity={0.3}
                style={{ filter: 'blur(2px)' }}
              />

              {/* Proportional Stage Segments */}
              {stageSlices.map((slice) => {
                if (slice.mins <= 0) return null;
                return (
                  <circle
                    key={slice.key}
                    cx="23"
                    cy="23"
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={slice.dashArray}
                    strokeDashoffset={slice.dashOffset}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </BentoCard>
  );
};

/**
 * Tile 2: Square Sleep Stages Card with Awake, REM, Core, Deep breakdown
 */
export const HealthSleepStagesCard: React.FC<HealthSleepCardsProps> = ({
  sleepDuration,
  awake,
  coreSleep,
  deepSleep,
  remSleep,
  darkMode = true,
}) => {
  const { openEntityDetails } = useEntityPopup();

  const parsedAwake = useMemo(() => {
    return parseSleepDuration(awake?.currentValue, awake?.unit || 'min');
  }, [awake?.currentValue, awake?.unit]);

  const parsedCore = useMemo(() => {
    return parseSleepDuration(coreSleep?.currentValue, coreSleep?.unit);
  }, [coreSleep?.currentValue, coreSleep?.unit]);

  const parsedDeep = useMemo(() => {
    return parseSleepDuration(deepSleep?.currentValue, deepSleep?.unit);
  }, [deepSleep?.currentValue, deepSleep?.unit]);

  const parsedRem = useMemo(() => {
    return parseSleepDuration(remSleep?.currentValue, remSleep?.unit);
  }, [remSleep?.currentValue, remSleep?.unit]);

  const parsedDuration = useMemo(() => {
    return parseSleepDuration(sleepDuration?.currentValue, sleepDuration?.unit);
  }, [sleepDuration?.currentValue, sleepDuration?.unit]);

  // Total in bed
  const totalInBedMins = Math.max(
    parsedAwake.totalMinutes +
      parsedRem.totalMinutes +
      parsedCore.totalMinutes +
      parsedDeep.totalMinutes,
    parsedDuration.totalMinutes + parsedAwake.totalMinutes,
    1
  );

  const inBedHours = Math.floor(totalInBedMins / 60);
  const inBedMins = Math.round(totalInBedMins % 60);
  const inBedFormatted = inBedHours > 0 ? `${inBedHours}h ${inBedMins}m` : `${inBedMins}m`;

  const stages = [
    {
      key: 'awake',
      label: 'Awake',
      color: '#FF9F0A',
      summary: awake,
      time: parsedAwake.formatted,
      pct: Math.round((parsedAwake.totalMinutes / totalInBedMins) * 100),
    },
    {
      key: 'rem',
      label: 'REM',
      color: '#64D2FF',
      summary: remSleep,
      time: parsedRem.formatted,
      pct: Math.round((parsedRem.totalMinutes / totalInBedMins) * 100),
    },
    {
      key: 'core',
      label: 'Core',
      color: '#0A84FF',
      summary: coreSleep,
      time: parsedCore.formatted,
      pct: Math.round((parsedCore.totalMinutes / totalInBedMins) * 100),
    },
    {
      key: 'deep',
      label: 'Deep',
      color: '#5E5CE6',
      summary: deepSleep,
      time: parsedDeep.formatted,
      pct: Math.round((parsedDeep.totalMinutes / totalInBedMins) * 100),
    },
  ];

  const handleStageClick = (e: React.MouseEvent, entityId?: string) => {
    e.stopPropagation();
    if (entityId) openEntityDetails(entityId);
  };

  return (
    <BentoCard
      colSpan={1}
      hasBorderBeam={false}
      darkMode={darkMode}
      onClick={() => {
        if (deepSleep?.entityId) openEntityDetails(deepSleep.entityId);
      }}
      className="group relative select-none h-[136px] flex flex-col justify-between"
    >
      <div className="flex flex-col h-full justify-between">
        {/* Row 1: Icon on Left, In Bed Badge on Right */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: 'rgba(10, 132, 255, 0.15)',
              borderColor: 'rgba(10, 132, 255, 0.35)',
              color: '#0A84FF',
            }}
          >
            <Bed size={15} weight="duotone" />
          </div>

          <AnimatedBadge variant="neutral">
            {inBedFormatted} In Bed
          </AnimatedBadge>
        </div>

        {/* Row 2: Vertical List of Stage Breakdown ("dot" "Stage" "duration" "percentage") */}
        <div className="flex flex-col gap-1 my-auto">
          {stages.map((st) => {
            const hasEntity = Boolean(st.summary?.entityId);
            return (
              <button
                key={st.key}
                type="button"
                onClick={(e) => handleStageClick(e, st.summary?.entityId)}
                disabled={!hasEntity}
                className={`flex items-center justify-between py-0.5 px-1 -mx-1 rounded-md transition-all text-left ${
                  hasEntity
                    ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99]'
                    : 'cursor-default'
                }`}
                title={
                  hasEntity
                    ? `Click to view entity details for ${st.summary?.entityId}`
                    : st.label
                }
              >
                {/* Left: Dot & Stage Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate leading-tight">
                    {st.label}
                  </span>
                </div>

                {/* Right: Duration & Percentage */}
                <div className="flex items-center gap-2 shrink-0 leading-tight">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                    {st.time}
                  </span>
                  <span
                    className="text-[9.5px] font-bold tabular-nums w-6 text-right"
                    style={{ color: st.color }}
                  >
                    {st.pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </BentoCard>
  );
};

// Export combined alias for flexibility
export const HealthSleepTile = HealthSleepDurationCard;
