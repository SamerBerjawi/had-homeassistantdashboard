/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Health Cumulative Line Chart Component
 * Implements @bklit/line-chart with cumulative progress tracking,
 * interval inspection, crosshairs, date ticker, and metric switcher pills.
 */

import React, { useState, useMemo } from 'react';
import { LineChart } from '../../charts/line-chart';
import { Grid } from '../../charts/grid';
import { XAxis } from '../../charts/x-axis';
import { YAxis } from '../../charts/y-axis';
import { Line } from '../../charts/line';
import { ChartTooltip } from '../../charts/tooltip';
import {
  HealthMetricKey,
  HealthMetricSummary,
  HealthTimeRange,
  HEALTH_METRIC_DEFINITIONS,
} from '../../../types/health';
import {
  ChartLineUp,
  Flame,
  Footprints,
  Heartbeat,
  Scales,
  Drop,
  TrendUp,
  ChartBar,
} from '@phosphor-icons/react';

interface HealthTimeseriesChartProps {
  summaries: Record<HealthMetricKey, HealthMetricSummary>;
  timeRange: HealthTimeRange;
  darkMode?: boolean;
}

const FEATURED_METRIC_KEYS: { key: HealthMetricKey; label: string; icon: any }[] = [
  { key: 'healthSteps', label: 'Steps', icon: Footprints },
  { key: 'activeEnergy', label: 'Active Energy', icon: Flame },
  { key: 'heartRate', label: 'Heart Rate', icon: Heartbeat },
  { key: 'bloodOxygen', label: 'Blood Oxygen', icon: Drop },
  { key: 'weight', label: 'Weight', icon: Scales },
];

export const HealthTimeseriesChart: React.FC<HealthTimeseriesChartProps> = ({
  summaries,
  timeRange,
  darkMode = true,
}) => {
  const [activeMetricKey, setActiveMetricKey] = useState<HealthMetricKey>('healthSteps');
  const [plotMode, setPlotMode] = useState<'cumulative' | 'interval'>('cumulative');

  const activeSummary = summaries[activeMetricKey];
  const def = HEALTH_METRIC_DEFINITIONS[activeMetricKey];
  const rawHistory = activeSummary?.history || [];

  const isCumulativeApplicable = def.chartType === 'bar';

  // Transform raw history into cumulative bklit timeseries data
  const chartData = useMemo(() => {
    let runningSum = 0;

    return rawHistory.map((item) => {
      const d = item.date instanceof Date ? item.date : new Date(item.date);
      const intervalVal = Number(item.value || 0);
      runningSum += intervalVal;

      return {
        date: d,
        label: item.label,
        intervalValue: intervalVal,
        cumulativeValue: def.decimals === 0 ? Math.round(runningSum) : Math.round(runningSum * 100) / 100,
        // Active display value based on mode
        value: plotMode === 'cumulative' && isCumulativeApplicable ? runningSum : intervalVal,
        min: item.min,
        max: item.max,
        mean: item.mean,
      };
    });
  }, [rawHistory, plotMode, isCumulativeApplicable, def.decimals]);

  const timeRangeLabel = {
    today: 'Today (Hourly Cumulative Flow)',
    week: 'This Week (Daily Cumulative Flow)',
    month: 'This Month (Daily Aggregate Flow)',
    year: 'This Year (Monthly Cumulative Flow)',
  }[timeRange];

  // Current headline display number
  const headlineValue = useMemo(() => {
    if (plotMode === 'cumulative' && isCumulativeApplicable && chartData.length > 0) {
      return chartData[chartData.length - 1].cumulativeValue;
    }
    return activeSummary?.currentValue ?? (chartData.length > 0 ? chartData[chartData.length - 1].value : null);
  }, [plotMode, isCumulativeApplicable, chartData, activeSummary?.currentValue]);

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-6 backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] ${
        darkMode
          ? 'bg-slate-900/50 border-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
          : 'bg-white/80 border-slate-200/80 text-slate-900 shadow-slate-100'
      }`}
    >
      {/* Chart Top Header & Metric Selector Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${def.accentColor}20`,
              borderColor: `${def.accentColor}40`,
              color: def.accentColor,
            }}
          >
            <ChartLineUp size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                {def.label}
              </h2>
              {isCumulativeApplicable && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {plotMode === 'cumulative' ? 'Cumulative Curve' : 'Interval View'}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {timeRangeLabel}
            </p>
          </div>
        </div>

        {/* Metric Selector Pills & Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cumulative vs Interval Toggle for cumulative metrics */}
          {isCumulativeApplicable && (
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPlotMode('cumulative')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  plotMode === 'cumulative'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendUp size={13} weight="bold" />
                <span>Cumulative</span>
              </button>
              <button
                type="button"
                onClick={() => setPlotMode('interval')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  plotMode === 'interval'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ChartBar size={13} weight="bold" />
                <span>Interval</span>
              </button>
            </div>
          )}

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
            {FEATURED_METRIC_KEYS.map((item) => {
              const isSelected = activeMetricKey === item.key;
              const Icon = item.icon;
              const itemDef = HEALTH_METRIC_DEFINITIONS[item.key];

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveMetricKey(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'shadow-sm text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: itemDef.accentColor }
                      : undefined
                  }
                >
                  <Icon size={14} weight="bold" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aggregate Stats Summary Ribbon */}
      <div className="flex items-center justify-between flex-wrap gap-4 my-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {headlineValue !== null && headlineValue !== undefined
              ? def.decimals === 0
                ? Number(headlineValue).toLocaleString()
                : Number(headlineValue).toFixed(def.decimals)
              : '—'}
          </span>
          <span className="text-xs font-bold uppercase text-slate-400">
            {activeSummary?.unit || def.defaultUnit}
          </span>
          {activeSummary?.changePercent !== undefined && activeSummary.changePercent !== 0 && (
            <span
              className={`text-xs font-bold ml-2 ${
                activeSummary.changePercent > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activeSummary.changePercent > 0 ? '+' : ''}
              {activeSummary.changePercent}% vs period avg
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          {activeSummary?.totalSum !== undefined && (
            <div>
              Total Sum: <strong className="text-slate-700 dark:text-slate-200">{activeSummary.totalSum.toLocaleString()}</strong>
            </div>
          )}
          {activeSummary?.average !== undefined && (
            <div>
              Avg: <strong className="text-slate-700 dark:text-slate-200">{activeSummary.average}</strong>
            </div>
          )}
          {activeSummary?.min !== undefined && (
            <div>
              Min: <strong className="text-slate-700 dark:text-slate-200">{activeSummary.min}</strong>
            </div>
          )}
          {activeSummary?.max !== undefined && (
            <div>
              Max: <strong className="text-slate-700 dark:text-slate-200">{activeSummary.max}</strong>
            </div>
          )}
        </div>
      </div>

      {/* @bklit/line-chart LineChart Container */}
      <div className="w-full h-64 sm:h-72 mt-2">
        {chartData.length > 0 ? (
          <LineChart
            data={chartData as unknown as Record<string, unknown>[]}
            xDataKey="date"
            margin={{ top: 12, right: 12, bottom: 24, left: 36 }}
            className="w-full h-full"
          >
            <Grid
              stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              strokeDasharray="3,3"
            />
            <XAxis numTicks={timeRange === 'today' ? 6 : timeRange === 'week' ? 7 : 6} />
            <YAxis numTicks={5} />
            <Line
              dataKey="value"
              stroke={def.accentColor}
              strokeWidth={2.8}
              animate
            />
            <ChartTooltip
              showDatePill
              showCrosshair
              showDots
              rows={(p: any) => [
                {
                  label: plotMode === 'cumulative' && isCumulativeApplicable ? 'Cumulative Total' : def.label,
                  value: `${(def.decimals === 0
                    ? Number(p.value || 0).toLocaleString()
                    : Number(p.value || 0).toFixed(def.decimals))} ${activeSummary?.unit || def.defaultUnit}`,
                  color: def.accentColor,
                },
                ...(isCumulativeApplicable && plotMode === 'cumulative' && p.intervalValue !== undefined
                  ? [
                      {
                        label: 'Bucket Reading',
                        value: `+${Number(p.intervalValue).toLocaleString()} ${activeSummary?.unit || def.defaultUnit}`,
                        color: '#94A3B8',
                      },
                    ]
                  : []),
                ...(p.min !== undefined && p.max !== undefined && p.min !== p.max
                  ? [
                      {
                        label: 'Min / Max Range',
                        value: `${p.min} – ${p.max} ${activeSummary?.unit || def.defaultUnit}`,
                        color: '#64748B',
                      },
                    ]
                  : []),
              ]}
            />
          </LineChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No historical metrics available
          </div>
        )}
      </div>
    </div>
  );
};
