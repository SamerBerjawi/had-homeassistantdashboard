/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  GitFork, 
  Lightning,
  Sparkle
} from '@phosphor-icons/react';
import { DailyTotalsEnergy, DeviceConsumer } from './energyCalculator';
import { SankeyChart } from '../charts/sankey/sankey-chart';
import { SankeyNode } from '../charts/sankey/sankey-node';
import { SankeyLink } from '../charts/sankey/sankey-link';
import { SankeyTooltip } from '../charts/sankey/sankey-tooltip';

interface EnergySankeyChartProps {
  dailyTotals: DailyTotalsEnergy;
  deviceConsumers: DeviceConsumer[];
  darkMode?: boolean;
}

export default function EnergySankeyChart({
  dailyTotals,
  deviceConsumers,
  darkMode = true
}: EnergySankeyChartProps) {
  const totalInputKWh = Number((dailyTotals.solarProductionKWh + dailyTotals.gridImportKWh + dailyTotals.batteryDischargedKWh).toFixed(2));

  // Build SankeyData format for @bklit SankeyChart
  const sankeyData = useMemo(() => {
    // 1. Define Nodes Array
    const nodes = [
      // Sources (Indices 0, 1, 2)
      { name: 'Solar PV', color: '#F59E0B' },
      { name: 'Grid Import', color: '#0284C7' },
      { name: 'Battery Discharge', color: '#10B981' },
      
      // Central Distribution Panel (Index 3)
      { name: 'Main Distribution Panel', color: '#8B5CF6' },

      // Sinks (Indices 4, 5, 6...)
      { name: 'Grid Feed-in', color: '#6366F1' },
      { name: 'Battery Storage', color: '#06B6D4' },
      ...deviceConsumers.map(dev => ({
        name: dev.name,
        color: dev.color
      }))
    ];

    // 2. Define Links Array
    const links = [
      // Sources -> Main Panel (Target = 3)
      { source: 0, target: 3, value: Math.max(0.1, dailyTotals.solarProductionKWh), color: '#F59E0B' },
      { source: 1, target: 3, value: Math.max(0.1, dailyTotals.gridImportKWh), color: '#0284C7' },
      { source: 2, target: 3, value: Math.max(0.1, dailyTotals.batteryDischargedKWh), color: '#10B981' },

      // Main Panel (Source = 3) -> Sinks
      { source: 3, target: 4, value: Math.max(0.1, dailyTotals.gridExportKWh), color: '#6366F1' },
      { source: 3, target: 5, value: Math.max(0.1, dailyTotals.batteryChargedKWh), color: '#06B6D4' },
      ...deviceConsumers.map((dev, idx) => ({
        source: 3,
        target: 6 + idx,
        value: Math.max(0.1, dev.energyKWh),
        color: dev.color
      }))
    ];

    return { nodes, links };
  }, [dailyTotals, deviceConsumers]);

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-500 flex items-center justify-center shadow-xs">
            <GitFork size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Energy Flow Sankey
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                bklit Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Source generation to main distribution panel and sub-circuit consumer sinks
            </p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
          darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          Total Input: <strong className="text-slate-900 dark:text-white font-mono">{totalInputKWh} kWh</strong>
        </div>
      </div>

      {/* bklit SankeyChart Container */}
      <div className="relative w-full h-[460px] my-2 select-none">
        <SankeyChart
          data={sankeyData}
          nodeWidth={18}
          nodePadding={18}
          margin={{ top: 20, right: 160, bottom: 20, left: 140 }}
          className="w-full h-full"
        >
          <SankeyLink />
          <SankeyNode />
          <SankeyTooltip />
        </SankeyChart>
      </div>

      {/* Sankey Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10">
        {deviceConsumers.slice(0, 6).map(dev => (
          <div 
            key={dev.id}
            className={`p-2.5 rounded-2xl border transition-all ${
              darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold truncate">
              <span className="truncate">{dev.name.split(' ')[0]}</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{dev.percentage}%</span>
            </div>
            <div className="text-xs font-black font-mono mt-1 text-slate-900 dark:text-white">
              {dev.energyKWh} <span className="text-[10px] font-sans font-normal text-slate-400">kWh</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
