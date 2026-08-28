/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Folder,
  ShieldCheck,
  CheckCircle,
  Lightning,
  ChartLineUp,
  HardDrive
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

  const cardStyle = `rounded-2xl border p-4 sm:p-5 backdrop-blur-xl transition-all ${
    darkMode
      ? 'bg-black/50 border-white/10 text-white shadow-lg'
      : 'bg-white/70 border-slate-200 text-slate-900 shadow-sm'
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

      {/* Grid: Volume Summary + Capacity Donut + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        {/* 1. Volume Summary Card (4 cols) */}
        <div className={`md:col-span-4 ${cardStyle} flex flex-col justify-between`}>
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

            <div className="space-y-2 py-2.5 text-xs">
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

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-[9px] text-slate-400 flex items-center justify-between">
            <span>Btrfs Scrub: <strong className="text-emerald-400">Passed</strong></span>
            <span>Compression: <strong className="text-slate-300">zstd (Auto)</strong></span>
          </div>
        </div>

        {/* 2. Capacity Pie Chart (4 cols) */}
        <div className={`md:col-span-4 ${cardStyle} flex flex-col items-center justify-between`}>
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Volume Capacity
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-400">{volume.totalSize}</span>
          </div>

          <div className="relative w-[150px] h-[150px] my-auto flex items-center justify-center">
            <PieChart
              data={donutData}
              innerRadius={48}
              padAngle={0.04}
              cornerRadius={6}
              size={150}
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
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'Total Size'}
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                      {isHovered ? `${value.toFixed(2)} TB` : volume.totalSize}
                    </span>
                    <span className="text-[8px] font-bold text-blue-400">Btrfs</span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          <div className="w-full pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-[9px] text-slate-400 block">Used Size</span>
              <span className="text-[11px] font-mono font-black text-blue-400">{volume.usedSize}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[9px] text-slate-400 block">Available</span>
              <span className="text-[11px] font-mono font-black text-emerald-400">{volume.availableSize}</span>
            </div>
          </div>
        </div>

        {/* 3. Activity (Gauge + IOPS Line Chart) (4 cols) */}
        <div className={`md:col-span-4 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <ChartLineUp size={14} weight="duotone" className="text-cyan-400" /> Volume Activity & IOPS
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
              {volume.utilization.toFixed(1)}% Load
            </span>
          </div>

          {/* Top: Mini Utilization Gauge */}
          <div className="flex items-center justify-between gap-3 py-1 bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/40 dark:border-white/5 my-1">
            <div className="w-[80px] h-[70px] flex items-center justify-center shrink-0">
              <Gauge
                value={volume.utilization}
                activeFill={utilColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                orientation="arc"
                notchCornerRadius={1.5}
                totalNotches={24}
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Disk IOPS Activity</div>
              <div className="text-xs font-mono font-black text-cyan-400">Read: {volume.readIops}</div>
              <div className="text-xs font-mono font-black text-purple-400">Write: {volume.writeIops}</div>
            </div>
          </div>

          {/* Bottom: IOPS Line Chart */}
          <div className="w-full h-[95px] my-1">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 5, right: 6, bottom: 14, left: 20 }}
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

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Read IOPS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Write IOPS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
