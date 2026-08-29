/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HardDrive,
  CheckCircle,
  WarningCircle,
  Thermometer,
  ShieldCheck,
  PlusCircle,
  Clock,
  ArrowsClockwise,
  Moon,
  Pulse,
  Warning
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { NasDiskInfo, NasThroughputPoint } from '../../../../types/ugreenNas';

interface NasDisksSectionProps {
  disks: NasDiskInfo[];
  historyData: NasThroughputPoint[];
  adoptButtonEntityId: string;
  onPressButton: (id: string) => void;
  darkMode?: boolean;
}

export const NasDisksSection: React.FC<NasDisksSectionProps> = ({
  disks,
  historyData,
  adoptButtonEntityId,
  onPressButton,
  darkMode = true
}) => {
  const cardStyle = `rounded-2xl border p-3.5 sm:p-4 backdrop-blur-md transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col justify-between ${darkMode
    ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10 text-white'
    : 'bg-white/80 border-slate-200/80 text-slate-900 shadow-slate-100'
    }`;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
            <HardDrive size={15} weight="duotone" />
          </div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Physical Disks & Bays (4-Bay Matrix)
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
          3 Active Disks • 1 Empty Bay
        </span>
      </div>

      {/* 4 Equal-Width Cards Grid (1 col mobile, 2 cols tablet, 4 cols desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {disks.map((disk) => {
          // Empty slot card for Bay 4
          if (!disk.isInstalled || disk.bay === 4) {
            return (
              <div
                key={`bay-${disk.bay}`}
                className={`rounded-2xl border-2 border-dashed p-4 backdrop-blur-md transition-all flex flex-col justify-between min-h-[380px] ${darkMode
                  ? 'border-white/15 bg-white/[0.02] text-slate-400'
                  : 'border-slate-300 bg-slate-50/50 text-slate-500'
                  }`}
              >
                {/* Empty Card Header */}
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
                      <HardDrive size={18} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">Bay 4</h4>
                      <span className="text-[9px] text-slate-400">Slot 4 (SATA 6Gb/s)</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">
                    Empty
                  </span>
                </div>

                {/* Empty Card Body */}
                <div className="flex flex-col items-center justify-center text-center p-4 my-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
                    <PlusCircle size={28} weight="light" className="opacity-60" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      No disk detected
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                      Install a 3.5&quot; SATA HDD or 2.5&quot; SSD in Bay 4 to expand Storage Pool 1.
                    </p>
                  </div>

                  {/* Adopt Disk Button */}
                  <button
                    type="button"
                    onClick={() => onPressButton(adoptButtonEntityId)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 transition-all cursor-pointer shadow-sm"
                  >
                    <PlusCircle size={14} weight="bold" />
                    <span>Adopt Disk</span>
                  </button>
                </div>
              </div>
            );
          }

          // Active Installed Disk Card (Bay 1, 2, 3)
          const isHealthy =
            disk.status.toLowerCase() === 'normal' ||
            disk.status.toLowerCase() === 'healthy' ||
            disk.status.toLowerCase() === 'ok';

          const isSmartPass =
            disk.smartLastResult.toLowerCase() === 'pass' ||
            disk.smartLastResult.toLowerCase() === 'ok' ||
            disk.smartLastResult.toLowerCase() === 'normal';

          const tempColor =
            disk.temperature >= 50 ? '#F43F5E' : disk.temperature >= 40 ? '#F59E0B' : '#10B981';

          const utilColor =
            disk.utilization >= 80 ? '#F43F5E' : disk.utilization >= 50 ? '#F59E0B' : '#6366F1';

          const readKey = disk.bay === 1 ? 'disk1Read' : disk.bay === 2 ? 'disk2Read' : 'disk3Read';
          const writeKey = disk.bay === 1 ? 'disk1Write' : disk.bay === 2 ? 'disk2Write' : 'disk3Write';

          return (
            <div key={`bay-${disk.bay}`} className={`${cardStyle} min-h-[380px] space-y-2`}>
              {/* Card Header: Brand, Model, Status Badge */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                    <HardDrive size={20} weight="duotone" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                        Bay {disk.bay}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                        {disk.brand}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5" title={disk.model}>
                      {disk.model}
                    </p>
                  </div>
                </div>

                {/* Status Badge (top-right) */}
                <span
                  className={`text-[10px] sm:text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg border shrink-0 flex items-center gap-1.5 ${isHealthy
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {disk.status}
                </span>
              </div>

              {/* Body: Identity Details Row */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-[12px]">
                  <span className="text-slate-400 font-medium">Capacity &amp; Type</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{disk.size} • {disk.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-[12px]">
                  <span className="text-slate-400 font-medium">Serial &amp; Slot</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{disk.serial} ({disk.slot})</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-[12px]">
                  <span className="text-slate-400 font-medium">Interface</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-300">{disk.interfaceType}</span>
                </div>
              </div>

              {/* Body: Health & SMART Row */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-[12px]">
                  <span className="text-slate-400 font-medium">SMART Status</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg text-[11px] sm:text-xs flex items-center gap-1.5 ${isSmartPass ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}
                  >
                    {isSmartPass ? <CheckCircle size={13} weight="fill" /> : <WarningCircle size={13} weight="fill" />}
                    {disk.smartLastResult}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-[12px]">
                  <span className="text-slate-400 font-medium">Power On Stats</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{disk.powerOnHours} • {disk.powerOnCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-[12px]">
                  <span className="text-slate-400 font-medium">Sleep State</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> {disk.sleepState}
                  </span>
                </div>
              </div>

              {/* Gauges: Temperature & Utilization (Same size and style as CPU metrics) */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-0.5">
                {/* Temp Gauge */}
                <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[190px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/40 dark:border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Thermometer size={13} className="text-cyan-400" /> Temp
                    </span>
                    <span
                      className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                      style={{
                        backgroundColor: `${tempColor}1A`,
                        color: tempColor
                      }}
                    >
                      {disk.temperature < 40 ? 'Optimal' : disk.temperature < 50 ? 'Warm' : 'Hot'}
                    </span>
                  </div>

                  <div className="w-full h-[140px] max-w-[165px] mx-auto my-auto flex items-center justify-center">
                    <Gauge
                      value={Math.min(100, (disk.temperature / 65) * 100)}
                      centerValue={disk.temperature}
                      defaultLabel="TEMP"
                      suffix="°C"
                      activeFill={tempColor}
                      inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                      orientation="arc"
                      notchCornerRadius={2}
                      totalNotches={32}
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Utilization Gauge */}
                <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[190px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/40 dark:border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Pulse size={13} className="text-indigo-400" /> Load
                    </span>
                    <span
                      className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                      style={{
                        backgroundColor: `${utilColor}1A`,
                        color: utilColor
                      }}
                    >
                      {disk.utilization < 50 ? 'Idle' : disk.utilization < 80 ? 'Active' : 'High'}
                    </span>
                  </div>

                  <div className="w-full h-[140px] max-w-[165px] mx-auto my-auto flex items-center justify-center">
                    <Gauge
                      value={disk.utilization}
                      centerValue={disk.utilization}
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
                </div>
              </div>

              {/* Line Chart: Read Rate + Write Rate */}
              <div className="w-full h-[125px] my-1">
                <LineChart
                  data={historyData as unknown as Record<string, unknown>[]}
                  xDataKey="date"
                  margin={{ top: 6, right: 6, bottom: 14, left: 18 }}
                  className="w-full h-full"
                >
                  <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                  <XAxis numTicks={2} />
                  <YAxis numTicks={2} />
                  <Line dataKey={readKey} stroke="#10B981" strokeWidth={1.5} animate />
                  <Line dataKey={writeKey} stroke="#6366F1" strokeWidth={1.2} animate />
                  <ChartTooltip
                    showDatePill
                    showCrosshair
                    showDots
                    rows={(p) => [
                      { label: 'Read', value: `${Number(p[readKey] || 0).toFixed(1)} MB/s`, color: '#10B981' },
                      { label: 'Write', value: `${Number(p[writeKey] || 0).toFixed(1)} MB/s`, color: '#6366F1' }
                    ]}
                  />
                </LineChart>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
