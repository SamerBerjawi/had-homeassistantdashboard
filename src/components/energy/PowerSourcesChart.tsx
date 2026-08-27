/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Lightning, 
  Sun, 
  Plug, 
  BatteryCharging, 
  House, 
  Sparkle,
  Check
} from '@phosphor-icons/react';
import { TimeseriesEnergyPoint } from './energyCalculator';
import { LineChart } from '../charts/line-chart';
import { Line } from '../charts/line';
import { Area } from '../charts/area';
import { Grid } from '../charts/grid';
import { XAxis } from '../charts/x-axis';
import { YAxis } from '../charts/y-axis';
import { ChartTooltip } from '../charts/tooltip/chart-tooltip';

interface PowerSourcesChartProps {
  timeseries24h: TimeseriesEnergyPoint[];
  timeseries7d?: TimeseriesEnergyPoint[];
  timeseriesMonth?: TimeseriesEnergyPoint[];
  darkMode?: boolean;
}

export default function PowerSourcesChart({
  timeseries24h,
  timeseries7d,
  timeseriesMonth,
  darkMode = true
}: PowerSourcesChartProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  
  // Layer visibility toggles
  const [showSolar, setShowSolar] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showConsumption, setShowConsumption] = useState(true);

  // Active dataset based on time range
  const activeSourceData = useMemo(() => {
    if (timeRange === 'week' && timeseries7d && timeseries7d.length > 0) {
      return timeseries7d;
    }
    if (timeRange === 'month' && timeseriesMonth && timeseriesMonth.length > 0) {
      return timeseriesMonth;
    }
    return timeseries24h;
  }, [timeRange, timeseries24h, timeseries7d, timeseriesMonth]);

  // Transform data for bklit LineChart
  const chartData = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    return activeSourceData.map((d, index) => {
      let pointDate: Date;
      if (timeRange === 'today') {
        const hour = Math.floor(d.hour);
        const minute = Math.round((d.hour % 1) * 60);
        pointDate = new Date(year, month, day, hour, minute, 0);
      } else if (timeRange === 'week') {
        pointDate = new Date(year, month, day - (6 - index), 12, 0);
      } else {
        pointDate = new Date(year, month, index + 1, 12, 0);
      }

      return {
        date: pointDate,
        solar: showSolar ? d.solar : 0,
        gridImport: showGrid ? d.gridImport : 0,
        gridExport: showGrid ? Math.abs(d.gridExport) : 0,
        batteryDischarge: showBattery ? d.batteryDischarge : 0,
        batteryCharge: showBattery ? Math.abs(d.batteryCharge) : 0,
        consumption: showConsumption ? d.consumption : 0
      };
    });
  }, [activeSourceData, timeRange, showSolar, showGrid, showBattery, showConsumption]);

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* Header Banner & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
            <Lightning size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Power Sources & Demand Profile
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                bklit Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Real-time solar yield, grid import/export, and battery storage timeseries
            </p>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className={`flex items-center p-1 rounded-2xl border ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}>
          {(['today', 'week', 'month'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setTimeRange(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                timeRange === tab
                  ? darkMode
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'today' ? 'Today (24h)' : tab === 'week' ? 'Last 7 Days' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {/* bklit Line/Area Chart Container */}
      <div className="relative w-full h-[360px] sm:h-[400px] my-3 select-none">
        <LineChart
          data={chartData}
          xDataKey="date"
          margin={{ top: 20, right: 30, bottom: 40, left: 45 }}
          className="w-full h-full"
        >
          <Grid />
          <XAxis />
          <YAxis />
          
          {/* Areas for Power Sources */}
          {showSolar && (
            <Area
              dataKey="solar"
              fill="#F59E0B"
              fillOpacity={0.25}
              stroke="#F59E0B"
              strokeWidth={2.5}
            />
          )}

          {showGrid && (
            <Area
              dataKey="gridImport"
              fill="#0284C7"
              fillOpacity={0.2}
              stroke="#0284C7"
              strokeWidth={2}
            />
          )}

          {showBattery && (
            <Area
              dataKey="batteryDischarge"
              fill="#10B981"
              fillOpacity={0.2}
              stroke="#10B981"
              strokeWidth={2}
            />
          )}

          {/* Consumption Line Overlay (White Line) */}
          {showConsumption && (
            <Line
              dataKey="consumption"
              stroke="#FFFFFF"
              strokeWidth={2.5}
            />
          )}

          <ChartTooltip />
        </LineChart>
      </div>

      {/* Bottom Interactive Checkable Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs font-bold select-none">
        
        {/* 1. Solar */}
        <button
          type="button"
          onClick={() => setShowSolar(!showSolar)}
          className={`flex items-center gap-2 transition-all cursor-pointer ${
            showSolar ? 'opacity-100' : 'opacity-35'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#F59E0B] flex items-center justify-center text-black shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Solar PV</span>
        </button>

        {/* 2. Grid */}
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center gap-2 transition-all cursor-pointer ${
            showGrid ? 'opacity-100' : 'opacity-35'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#0284C7] flex items-center justify-center text-white shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Grid Import</span>
        </button>

        {/* 3. Battery */}
        <button
          type="button"
          onClick={() => setShowBattery(!showBattery)}
          className={`flex items-center gap-2 transition-all cursor-pointer ${
            showBattery ? 'opacity-100' : 'opacity-35'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center text-white shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Battery</span>
        </button>

        {/* 4. Consumption */}
        <button
          type="button"
          onClick={() => setShowConsumption(!showConsumption)}
          className={`flex items-center gap-2 transition-all cursor-pointer ${
            showConsumption ? 'opacity-100' : 'opacity-35'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-black shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Home Demand</span>
        </button>

      </div>
    </div>
  );
}
