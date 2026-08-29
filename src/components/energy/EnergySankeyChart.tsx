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
  const MIN_KWH = 0.01;
  const totalInputKWh = Number((
    (dailyTotals.solarProductionKWh  >= MIN_KWH ? dailyTotals.solarProductionKWh  : 0) +
    (dailyTotals.gridImportKWh       >= MIN_KWH ? dailyTotals.gridImportKWh       : 0) +
    (dailyTotals.batteryDischargedKWh>= MIN_KWH ? dailyTotals.batteryDischargedKWh: 0)
  ).toFixed(2));


  // Build SankeyData format for @bklit SankeyChart
  const sankeyData = useMemo(() => {
    const MIN_KWH = 0.01; // suppress ghost links below 10 Wh

    // Determine which sources are actually active
    const hasSolar    = dailyTotals.solarProductionKWh  >= MIN_KWH;
    const hasImport   = dailyTotals.gridImportKWh       >= MIN_KWH;
    const hasDischarge= dailyTotals.batteryDischargedKWh>= MIN_KWH;
    const hasExport   = dailyTotals.gridExportKWh       >= MIN_KWH;
    const hasCharge   = dailyTotals.batteryChargedKWh   >= MIN_KWH;

    // Build nodes dynamically (only include active sources/sinks + panel + devices)
    type SankeyNodeDef = { name: string; color: string };
    const nodeList: SankeyNodeDef[] = [];

    // Source indices
    const solarIdx     = hasSolar    ? (nodeList.push({ name: 'Solar PV',           color: '#F59E0B' }), nodeList.length - 1) : -1;
    const importIdx    = hasImport   ? (nodeList.push({ name: 'Grid Import',         color: '#0284C7' }), nodeList.length - 1) : -1;
    const dischargeIdx = hasDischarge? (nodeList.push({ name: 'Battery Discharge',   color: '#10B981' }), nodeList.length - 1) : -1;

    // Central panel
    nodeList.push({ name: 'Main Distribution Panel', color: '#8B5CF6' });
    const panelIdx = nodeList.length - 1;

    // Sink indices
    const exportIdx  = hasExport ? (nodeList.push({ name: 'Grid Feed-in',   color: '#6366F1' }), nodeList.length - 1) : -1;
    const chargeIdx  = hasCharge ? (nodeList.push({ name: 'Battery Storage', color: '#06B6D4' }), nodeList.length - 1) : -1;
    const deviceStart = nodeList.length;
    deviceConsumers.forEach(dev => nodeList.push({ name: dev.name, color: dev.color }));

    // Build links (only for active sources/sinks)
    type SankeyLinkDef = { source: number; target: number; value: number; color: string };
    const linkList: SankeyLinkDef[] = [];

    if (solarIdx    >= 0) linkList.push({ source: solarIdx,     target: panelIdx, value: dailyTotals.solarProductionKWh,   color: '#F59E0B' });
    if (importIdx   >= 0) linkList.push({ source: importIdx,    target: panelIdx, value: dailyTotals.gridImportKWh,        color: '#0284C7' });
    if (dischargeIdx>= 0) linkList.push({ source: dischargeIdx, target: panelIdx, value: dailyTotals.batteryDischargedKWh, color: '#10B981' });
    if (exportIdx   >= 0) linkList.push({ source: panelIdx, target: exportIdx,  value: dailyTotals.gridExportKWh,       color: '#6366F1' });
    if (chargeIdx   >= 0) linkList.push({ source: panelIdx, target: chargeIdx,  value: dailyTotals.batteryChargedKWh,   color: '#06B6D4' });
    deviceConsumers.forEach((dev, idx) => {
      if (dev.energyKWh >= MIN_KWH) {
        linkList.push({ source: panelIdx, target: deviceStart + idx, value: dev.energyKWh, color: dev.color });
      }
    });

    return { nodes: nodeList, links: linkList };
  }, [dailyTotals, deviceConsumers]);

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col justify-between ${
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
