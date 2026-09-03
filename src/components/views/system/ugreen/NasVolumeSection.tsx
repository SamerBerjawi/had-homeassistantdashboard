/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Folder,
  ShieldCheck,
  CheckCircle,
  Lightning,
  ChartLineUp,
  SquareSplitHorizontal,
  SquaresFour
} from '@phosphor-icons/react';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
import { Gauge } from '../../../charts/gauge';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { NasVolume1, NasThroughputPoint } from '../../../../types/ugreenNas';

interface NasVolumeSectionProps {
  volume: NasVolume1;
  historyData: NasThroughputPoint[];
  darkMode?: boolean;
}

export const NasVolumeSection: React.FC<NasVolumeSectionProps> = ({
  volume,
  historyData,
  darkMode = true
}) => {
  const [iopsViewMode, setIopsViewMode] = useState<'unified' | 'split'>('unified');

  const isHealthy =
    volume.health.toLowerCase().includes('health') ||
    volume.health.toLowerCase().includes('normal') ||
    volume.health.toLowerCase().includes('ok');

  const donutData = [
    { label: 'Used Size', value: Math.max(0.01, volume.usedSizeVal), color: '#3B82F6' },
    { label: 'Available', value: Math.max(0.01, volume.availableSizeVal), color: '#10B981' }
  ];

  const utilColor =
    volume.utilization >= 85 ? '#F43F5E' : volume.utilization >= 60 ? '#F59E0B' : '#06B6D4';

  const cardStyle = `rounded-3xl p-5 sm:p-6 backdrop-blur-2xl transition-all overflow-hidden isolate ${
    darkMode
      ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80'
  }`;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Folder size={15} weight="duotone" />
          </div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Volume (Pool 1 | Volume 1)
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25">
          {volume.filesystem}
        </span>
      </div>

      {/* 4-Card Grid: 30% Info, 20% Capacity, 20% IOPS Gauge, 30% IOPS Chart */}
      <div className="grid grid-cols-2 lg:grid-cols-10 gap-3 sm:gap-4 items-stretch">
        {/* 1. Volume Summary & Info Card (30% on desktop, col-span-3 / col-span-2 on mobile) */}
        <div className={`col-span-2 lg:col-span-3 ${cardStyle} flex flex-col justify-between min-h-[260px]`}>
          <div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {volume.label}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{volume.name}</p>
              </div>

              {/* Health Badge */}
              <span
                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  isHealthy
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {isHealthy ? <CheckCircle size={11} weight="fill" /> : <ShieldCheck size={11} weight="fill" />}
                <span>{volume.health}</span>
              </span>
            </div>

            <div className="space-y-1.5 py-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">File System</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{volume.filesystem}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Assigned Pool</span>
                <span className="font-bold text-amber-400">{volume.poolName}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">SSD Cache Acceleration</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Lightning size={12} weight="fill" /> {volume.hasCache}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Mount Status</span>
                <span className="font-bold text-slate-900 dark:text-white">{volume.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Capacity Donut Card (20% on desktop, col-span-2 / col-span-1 on mobile) */}
        <div className={`col-span-1 lg:col-span-2 ${cardStyle} flex flex-col items-center justify-between min-h-[260px]`}>
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
              Capacity
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-400">{volume.totalSize}</span>
          </div>

          <div className="relative w-[130px] h-[130px] sm:w-[145px] sm:h-[145px] my-auto flex items-center justify-center">
            <PieChart
              data={donutData}
              innerRadius={44}
              padAngle={0.04}
              cornerRadius={6}
              size={135}
              className="w-full h-full"
            >
              {donutData.map((_, i) => (
                <PieSlice key={i} index={i} />
              ))}
              <PieCenter
                defaultLabel="Volume Total"
                suffix=""
              >
                {({ value, isHovered, data }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none px-1">
                    <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'Total Size'}
                    </span>
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                      {isHovered ? `${value.toFixed(1)} TB` : volume.totalSize}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-blue-400">Btrfs</span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          <div className="w-full pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 gap-1.5 text-center text-xs">
            <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-[8px] sm:text-[9px] text-slate-400 block">Used</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-blue-400 truncate block">{volume.usedSize}</span>
            </div>
            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[8px] sm:text-[9px] text-slate-400 block">Avail</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-emerald-400 truncate block">{volume.availableSize}</span>
            </div>
          </div>
        </div>

        {/* 3. Dedicated IOPS Utilization Gauge Card (20% on desktop, col-span-2 / col-span-1 on mobile) */}
        <div className={`col-span-1 lg:col-span-2 ${cardStyle} flex flex-col justify-between min-h-[260px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
              Volume Load
            </span>
            <span
              className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
              style={{
                backgroundColor: `${utilColor}1A`,
                color: utilColor
              }}
            >
              {volume.utilization < 50 ? 'Optimal' : volume.utilization < 80 ? 'Active' : 'Heavy'}
            </span>
          </div>

          <div className="w-full h-[125px] sm:h-[135px] max-w-[155px] mx-auto my-auto flex items-center justify-center">
            <Gauge
              value={volume.utilization}
              centerValue={volume.utilization}
              defaultLabel="LOAD"
              suffix="%"
              activeFill={utilColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              orientation="arc"
              notchCornerRadius={2}
              totalNotches={32}
              className="w-full h-full"
            />
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 gap-1.5 text-center text-xs">
            <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-[8px] sm:text-[9px] text-slate-400 block">Read IOPS</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-cyan-400 truncate block">{volume.readIops}</span>
            </div>
            <div className="p-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-[8px] sm:text-[9px] text-slate-400 block">Write IOPS</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black text-purple-400 truncate block">{volume.writeIops}</span>
            </div>
          </div>
        </div>

        {/* 4. Dedicated IOPS Line Chart Card (30% on desktop, col-span-3 / col-span-2 on mobile) */}
        <div className={`col-span-2 lg:col-span-3 ${cardStyle} flex flex-col justify-between min-h-[260px]`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <ChartLineUp size={14} weight="duotone" className="text-cyan-400" /> IOPS History
            </span>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIopsViewMode('unified')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    iopsViewMode === 'unified'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Unified Chart"
                >
                  <SquareSplitHorizontal size={10} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setIopsViewMode('split')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    iopsViewMode === 'split'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Separate Charts"
                >
                  <SquaresFour size={10} weight="bold" />
                </button>
              </div>
            </div>
          </div>

          {/* Line Chart Body */}
          {iopsViewMode === 'unified' ? (
            <div className="w-full h-[180px] my-auto">
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 6, right: 6, bottom: 16, left: 22 }}
                className="w-full h-full"
              >
                <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="3,3" />
                <XAxis numTicks={3} />
                <YAxis numTicks={3} />
                <Line dataKey="volumeReadIops" stroke="#06B6D4" strokeWidth={1.8} animate />
                <Line dataKey="volumeWriteIops" stroke="#C084FC" strokeWidth={1.5} animate />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  showDots
                  rows={(p) => [
                    { label: 'Read IOPS', value: `${Number(p.volumeReadIops || 0).toFixed(0)} IOPS`, color: '#06B6D4' },
                    { label: 'Write IOPS', value: `${Number(p.volumeWriteIops || 0).toFixed(0)} IOPS`, color: '#C084FC' }
                  ]}
                />
              </LineChart>
            </div>
          ) : (
            <div className="space-y-1.5 my-auto">
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-cyan-400">
                  <span>Read IOPS</span>
                  <span>{volume.readIops}</span>
                </div>
                <div className="w-full h-[75px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 4, bottom: 10, left: 16 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="volumeReadIops" stroke="#06B6D4" strokeWidth={1.8} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Read IOPS', value: `${Number(p.volumeReadIops || 0).toFixed(0)} IOPS`, color: '#06B6D4' }]}
                    />
                  </LineChart>
                </div>
              </div>

              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-purple-400">
                  <span>Write IOPS</span>
                  <span>{volume.writeIops}</span>
                </div>
                <div className="w-full h-[75px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 4, bottom: 10, left: 16 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="volumeWriteIops" stroke="#C084FC" strokeWidth={1.8} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Write IOPS', value: `${Number(p.volumeWriteIops || 0).toFixed(0)} IOPS`, color: '#C084FC' }]}
                    />
                  </LineChart>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

