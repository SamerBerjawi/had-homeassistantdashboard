/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Health Statistic Interval Chart
 * Ultra-compact, frameless chart integrating seamlessly with the parent section card.
 * Container background, borders, title, icon, and interval badge removed for seamless aesthetic integration.
 */

import React, { useMemo } from 'react';
import { LineChart } from '../../charts/line-chart';
import { Grid } from '../../charts/grid';
import { XAxis } from '../../charts/x-axis';
import { YAxis } from '../../charts/y-axis';
import { Line } from '../../charts/line';
import { ChartTooltip } from '../../charts/tooltip';
import {
  HealthMetricSummary,
  HealthTimeRange,
  HEALTH_METRIC_DEFINITIONS,
} from '../../../types/health';

interface HealthStatisticChartProps {
  summary: HealthMetricSummary;
  timeRange: HealthTimeRange;
  darkMode?: boolean;
}

export const HealthStatisticChart: React.FC<HealthStatisticChartProps> = ({
  summary,
  timeRange,
  darkMode = true,
}) => {
  const def = HEALTH_METRIC_DEFINITIONS[summary.key];
  const rawHistory = summary?.history || [];

  // Format stat helper strictly limited to at most 1 decimal digit
  const formatVal = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    if (def.decimals === 0) return Math.round(val).toLocaleString();
    const cappedDecimals = Math.min(def.decimals, 1);
    return val.toFixed(cappedDecimals);
  };

  // Transform raw history into pure interval chart data
  const chartData = useMemo(() => {
    return rawHistory.map((item) => {
      const d = item.date instanceof Date ? item.date : new Date(item.date);
      const intervalVal = Number(item.value || 0);

      return {
        date: d,
        label: item.label,
        value: intervalVal,
        min: item.min,
        max: item.max,
        mean: item.mean,
      };
    });
  }, [rawHistory]);

  return (
    <div className="w-full h-24 sm:h-28 -my-1">
      {chartData.length > 0 ? (
        <LineChart
          data={chartData as unknown as Record<string, unknown>[]}
          xDataKey="date"
          margin={{ top: 6, right: 6, bottom: 16, left: 24 }}
          className="w-full h-full"
        >
          <Grid
            stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            strokeDasharray="3,3"
          />
          <XAxis numTicks={timeRange === 'today' ? 5 : timeRange === 'week' ? 7 : 5} />
          <YAxis numTicks={3} />
          <Line
            dataKey="value"
            stroke={def.accentColor}
            strokeWidth={2}
            animate
          />
          <ChartTooltip
            showDatePill
            showCrosshair
            showDots
            rows={(p: any) => [
              {
                label: `${def.label} (Interval)`,
                value: `${formatVal(Number(p.value || 0))} ${summary?.unit || def.defaultUnit}`,
                color: def.accentColor,
              },
            ]}
          />
        </LineChart>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500">
          No interval telemetry recorded
        </div>
      )}
    </div>
  );
};
