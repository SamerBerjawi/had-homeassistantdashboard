/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HardDrives,
  Cpu,
  Thermometer,
  Memory,
  Network,
  Fan,
  Lightning,
  Power,
  ArrowsCounterClockwise,
  Sun,
  PlusCircle,
  Clock,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  XCircle,
  Warning
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { UgreenNasMetrics, NasThroughputPoint } from '../../../../types/ugreenNas';
import { HistoryTimeRange } from '../../../../hooks/useSystemMetrics';

interface NasOverviewSectionProps {
  metrics: UgreenNasMetrics;
  historyData: NasThroughputPoint[];
  timeRange: HistoryTimeRange;
  onTimeRangeChange: (r: HistoryTimeRange) => void;
  onPressButton: (id: string) => void;
  onSetFanMode: (mode: string) => void;
  onSetPowerMode: (mode: string) => void;
  darkMode?: boolean;
}

export const NasOverviewSection: React.FC<NasOverviewSectionProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  onPressButton,
  onSetFanMode,
  onSetPowerMode,
  darkMode = true
}) => {
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const { identity, compute, throughput, fansPower, buttons } = metrics;

  // Gauge color helpers
  const cpuUsageColor =
    compute.cpuUsage >= 85 ? '#F43F5E' : compute.cpuUsage >= 60 ? '#F59E0B' : '#10B981';
  const cpuTempColor =
    compute.cpuTemp >= 70 ? '#F43F5E' : compute.cpuTemp >= 55 ? '#F59E0B' : '#06B6D4';
  const ramUsageColor =
    compute.ramUsage >= 85 ? '#F43F5E' : compute.ramUsage >= 60 ? '#F59E0B' : '#6366F1';

  // Server status badge styling
  const isServerOnline = identity.serverStatus.toLowerCase().includes('online') || identity.serverStatus.toLowerCase().includes('normal');
  const serverBadgeClass = isServerOnline
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

  const isSystemOk = identity.systemStatusCode.toLowerCase() === 'normal' || identity.systemStatusCode.toLowerCase() === 'ok';
  const isTempOk = identity.tempStatusCode.toLowerCase() === 'normal' || identity.tempStatusCode.toLowerCase() === 'ok';

  const cardStyle = `rounded-2xl border p-3.5 sm:p-4 backdrop-blur-xl transition-all ${
    darkMode
      ? 'bg-black/50 border-white/10 text-white shadow-lg'
      : 'bg-white/70 border-slate-200 text-slate-900 shadow-sm'
  }`;

  const triggerAction = (id: string, name: string) => {
    setActiveAction(name);
    onPressButton(id);
    setTimeout(() => setActiveAction(null), 2500);
  };

  return (
    <div className="space-y-4">
      {/* 1. Identity & Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Device Name & Model */}
        <div className={`col-span-2 ${cardStyle} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <HardDrives size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                  {identity.name}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  {identity.model}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                SN: <span className="font-mono">{identity.serial}</span> • {identity.type}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1 ${serverBadgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isServerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {identity.serverStatus}
            </span>
          </div>
        </div>

        {/* UGOS Version & Owner */}
        <div className={`${cardStyle} flex flex-col justify-center min-w-0`}>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">UGOS & Owner</span>
          <span className="text-xs font-black truncate text-slate-900 dark:text-white mt-0.5">{identity.ugosVersion}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Owner: {identity.owner}</span>
        </div>

        {/* Combined System Status */}
        <div className={`${cardStyle} flex flex-col justify-center min-w-0`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">System Status</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
              isSystemOk ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {identity.systemStatusCode}
            </span>
          </div>
          {!isSystemOk && (
            <span className="text-[9px] text-amber-400 mt-1 truncate" title={identity.systemMessage}>
              {identity.systemMessage}
            </span>
          )}
          {isSystemOk && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
              <CheckCircle size={12} className="text-emerald-400" /> Normal Operations
            </span>
          )}
        </div>

        {/* Combined Thermal Status */}
        <div className={`${cardStyle} flex flex-col justify-center min-w-0`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Thermal Status</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
              isTempOk ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              {identity.tempStatusCode}
            </span>
          </div>
          {!isTempOk && (
            <span className="text-[9px] text-rose-400 mt-1 truncate" title={identity.tempMessage}>
              {identity.tempMessage}
            </span>
          )}
          {isTempOk && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
              <Thermometer size={12} className="text-cyan-400" /> Optimal Thermals
            </span>
          )}
        </div>

        {/* Runtime & Last Boot */}
        <div className={`${cardStyle} flex flex-col justify-center min-w-0`}>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Clock size={11} /> Total Runtime
          </span>
          <span className="text-xs font-black truncate text-slate-900 dark:text-white mt-0.5">{identity.totalRuntime}</span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate">Boot: {identity.lastBoot}</span>
        </div>
      </div>

      {/* 2. CPU & RAM Gauges + Spec Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        {/* Left: 3 Side-by-Side Gauges in a unified container */}
        <div className={`md:col-span-8 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Compute & Memory Load
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
                Real-time Telemetry
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">60% / 85% Warning Limits</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2 items-center">
            {/* CPU Usage Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[195px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cpu size={14} className="text-emerald-400" /> CPU Load
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${cpuUsageColor}1A`,
                    color: cpuUsageColor
                  }}
                >
                  {compute.cpuUsage < 60 ? 'Optimal' : compute.cpuUsage < 85 ? 'Elevated' : 'High'}
                </span>
              </div>

              <div className="w-full h-[125px] max-w-[155px] mx-auto my-auto flex items-center justify-center">
                <Gauge
                  value={compute.cpuUsage}
                  centerValue={compute.cpuUsage}
                  defaultLabel="CPU"
                  suffix="%"
                  activeFill={cpuUsageColor}
                  inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  orientation="arc"
                  notchCornerRadius={2}
                  totalNotches={32}
                  className="w-full h-full"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                <span>Threshold: &lt;60%</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{compute.cpuCores}C / {compute.cpuThreads}T</span>
              </div>
            </div>

            {/* CPU Temperature Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[195px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Thermometer size={14} className="text-cyan-400" /> CPU Temp
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${cpuTempColor}1A`,
                    color: cpuTempColor
                  }}
                >
                  {compute.cpuTemp < 55 ? 'Cool' : compute.cpuTemp < 70 ? 'Warm' : 'Hot'}
                </span>
              </div>

              <div className="w-full h-[125px] max-w-[155px] mx-auto my-auto flex items-center justify-center">
                <Gauge
                  value={Math.min(100, (compute.cpuTemp / 90) * 100)}
                  centerValue={compute.cpuTemp}
                  defaultLabel="TEMP"
                  suffix="°C"
                  activeFill={cpuTempColor}
                  inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  orientation="arc"
                  notchCornerRadius={2}
                  totalNotches={32}
                  className="w-full h-full"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                <span>Threshold: &lt;55°C</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{compute.cpuSpeed}</span>
              </div>
            </div>

            {/* RAM Usage Gauge */}
            <div className="flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[195px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Memory size={14} className="text-indigo-400" /> RAM Usage
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${ramUsageColor}1A`,
                    color: ramUsageColor
                  }}
                >
                  {compute.ramUsage < 60 ? 'Optimal' : compute.ramUsage < 85 ? 'Elevated' : 'High'}
                </span>
              </div>

              <div className="w-full h-[125px] max-w-[155px] mx-auto my-auto flex items-center justify-center">
                <Gauge
                  value={compute.ramUsage}
                  centerValue={compute.ramUsage}
                  defaultLabel="RAM"
                  suffix="%"
                  activeFill={ramUsageColor}
                  inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  orientation="arc"
                  notchCornerRadius={2}
                  totalNotches={32}
                  className="w-full h-full"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                <span>Used: {compute.ramUsedGB}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{compute.ramTotalSize}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>Platform: <strong className="text-slate-700 dark:text-slate-200">{compute.cpuModel}</strong></span>
            <span>Memory Total: <strong className="text-indigo-400">{compute.ramTotalSize}</strong></span>
          </div>
        </div>

        {/* Right: Small Hardware Specification Card */}
        <div className={`md:col-span-4 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu size={15} weight="duotone" className="text-amber-400" /> Hardware Specs
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">x86_64</span>
          </div>

          <div className="space-y-2 py-2 text-xs">
            {/* CPU Details */}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">CPU Architecture</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={compute.cpuModel}>
                  {compute.cpuModel}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Cores / Threads</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{compute.cpuCores}C / {compute.cpuThreads}T</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Clock Speed</span>
                <span className="font-mono font-bold text-cyan-400">{compute.cpuSpeed}</span>
              </div>
            </div>

            {/* RAM Details */}
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">RAM Used / Total</span>
                <span className="font-mono font-bold text-indigo-400">{compute.ramUsedGB} / {compute.ramTotalSize}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Free / Usable RAM</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{compute.ramFree} / {compute.ramUsable}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Buffer Cache</span>
                <span className="font-mono font-semibold text-emerald-400">{compute.ramCache}</span>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 text-[9px] text-slate-400 flex items-center justify-between">
            <span>Hardware Health: <strong className="text-emerald-400">Optimal</strong></span>
            <span>ECC: <strong className="text-slate-300">Non-ECC DDR5</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Throughput Grid: Network, Disk I/O, Volume I/O */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Network LAN Chart */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Network size={14} weight="duotone" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block leading-tight">
                  Network Throughput
                </span>
                <span className="text-[9px] text-slate-500">LAN Download & Upload</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono font-bold">
              <div className="text-emerald-400">↓ {throughput.netDownload}</div>
              <div className="text-indigo-400">↑ {throughput.netUpload}</div>
            </div>
          </div>

          <div className="w-full h-[120px] my-1">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 8, right: 8, bottom: 18, left: 24 }}
              className="w-full h-full"
            >
              <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="3,3" />
              <XAxis numTicks={3} />
              <YAxis numTicks={3} />
              <Line dataKey="netDownload" stroke="#10B981" strokeWidth={2} animate />
              <Line dataKey="netUpload" stroke="#6366F1" strokeWidth={1.5} animate />
              <ChartTooltip
                showDatePill
                showCrosshair
                showDots
                rows={(p) => [
                  { label: 'Download', value: `${Number(p.netDownload || 0).toFixed(1)} MB/s`, color: '#10B981' },
                  { label: 'Upload', value: `${Number(p.netUpload || 0).toFixed(1)} MB/s`, color: '#6366F1' }
                ]}
              />
            </LineChart>
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Down ({throughput.netDownload})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Up ({throughput.netUpload})
            </span>
          </div>
        </div>

        {/* Disk I/O Chart */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <HardDrives size={14} weight="duotone" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block leading-tight">
                  Overall Disk I/O
                </span>
                <span className="text-[9px] text-slate-500">Physical HDD Read / Write</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono font-bold">
              <div className="text-amber-400">R: {throughput.diskReadRate}</div>
              <div className="text-rose-400">W: {throughput.diskWriteRate}</div>
            </div>
          </div>

          <div className="w-full h-[120px] my-1">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 8, right: 8, bottom: 18, left: 24 }}
              className="w-full h-full"
            >
              <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="3,3" />
              <XAxis numTicks={3} />
              <YAxis numTicks={3} />
              <Line dataKey="diskRead" stroke="#F59E0B" strokeWidth={2} animate />
              <Line dataKey="diskWrite" stroke="#F43F5E" strokeWidth={1.5} animate />
              <ChartTooltip
                showDatePill
                showCrosshair
                showDots
                rows={(p) => [
                  { label: 'Disk Read', value: `${Number(p.diskRead || 0).toFixed(1)} MB/s`, color: '#F59E0B' },
                  { label: 'Disk Write', value: `${Number(p.diskWrite || 0).toFixed(1)} MB/s`, color: '#F43F5E' }
                ]}
              />
            </LineChart>
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Read ({throughput.diskReadRate})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Write ({throughput.diskWriteRate})
            </span>
          </div>
        </div>

        {/* Volume I/O Chart */}
        <div className={`${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <Cpu size={14} weight="duotone" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block leading-tight">
                  Volume I/O
                </span>
                <span className="text-[9px] text-slate-500">Logical Volume Read / Write</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono font-bold">
              <div className="text-cyan-400">R: {throughput.volumeReadRate}</div>
              <div className="text-purple-400">W: {throughput.volumeWriteRate}</div>
            </div>
          </div>

          <div className="w-full h-[120px] my-1">
            <LineChart
              data={historyData as unknown as Record<string, unknown>[]}
              xDataKey="date"
              margin={{ top: 8, right: 8, bottom: 18, left: 24 }}
              className="w-full h-full"
            >
              <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="3,3" />
              <XAxis numTicks={3} />
              <YAxis numTicks={3} />
              <Line dataKey="volumeRead" stroke="#06B6D4" strokeWidth={2} animate />
              <Line dataKey="volumeWrite" stroke="#A855F7" strokeWidth={1.5} animate />
              <ChartTooltip
                showDatePill
                showCrosshair
                showDots
                rows={(p) => [
                  { label: 'Vol Read', value: `${Number(p.volumeRead || 0).toFixed(1)} MB/s`, color: '#06B6D4' },
                  { label: 'Vol Write', value: `${Number(p.volumeWrite || 0).toFixed(1)} MB/s`, color: '#A855F7' }
                ]}
              />
            </LineChart>
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Read ({throughput.volumeReadRate})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Write ({throughput.volumeWriteRate})
            </span>
          </div>
        </div>
      </div>

      {/* 4. Fans & Power (Compact status row) */}
      <div className={`${cardStyle} flex flex-wrap items-center justify-between gap-3`}>
        {/* Fan Statuses */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
              <Fan size={16} weight="duotone" className="animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Fan Overall</span>
              <span className="font-bold text-slate-900 dark:text-white">{fansPower.fanStatusOverall}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">CPU Fan:</span> <strong className="font-mono text-slate-900 dark:text-white">{fansPower.cpuFan}</strong>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Device Fan:</span> <strong className="font-mono text-slate-900 dark:text-white">{fansPower.deviceFan}</strong>
          </div>
        </div>

        {/* Interactive Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Fan Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fan Profile:</span>
            <select
              value={fansPower.fanMode}
              onChange={(e) => onSetFanMode(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-neutral-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {fansPower.fanOptions.map((opt) => (
                <option key={opt} value={opt} className="dark:bg-neutral-900 text-slate-900 dark:text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Power Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Power Mode:</span>
            <select
              value={fansPower.powerMode}
              onChange={(e) => onSetPowerMode(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-neutral-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {fansPower.powerOptions.map((opt) => (
                <option key={opt} value={opt} className="dark:bg-neutral-900 text-slate-900 dark:text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Action Buttons Row */}
      <div className={`${cardStyle} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Lightning size={16} weight="duotone" className="text-amber-400" /> Power & Hardware Actions
          </span>
          {activeAction && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
              Sent command: {activeAction}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Wake Up Button */}
          <button
            type="button"
            onClick={() => triggerAction(buttons.wakeUpEntityId, 'Wake Up')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 transition-all cursor-pointer shadow-sm"
          >
            <Sun size={14} weight="bold" />
            <span>Wake Up (WoL)</span>
          </button>

          {/* Adopt Disk Button */}
          <button
            type="button"
            onClick={() => triggerAction(buttons.adoptDiskEntityId, 'Adopt Disk')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 transition-all cursor-pointer shadow-sm"
          >
            <PlusCircle size={14} weight="bold" />
            <span>Adopt Disk</span>
          </button>

          {/* Reboot Button */}
          <button
            type="button"
            onClick={() => triggerAction(buttons.rebootEntityId, 'Reboot')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm"
          >
            <ArrowsCounterClockwise size={14} weight="bold" />
            <span>Reboot</span>
          </button>

          {/* Shutdown Button with Confirmation */}
          <button
            type="button"
            onClick={() => setShowShutdownConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition-all cursor-pointer shadow-sm"
          >
            <Power size={14} weight="bold" />
            <span>Shutdown</span>
          </button>
        </div>
      </div>

      {/* Shutdown Confirmation Modal */}
      {showShutdownConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`max-w-md w-full rounded-2xl border p-5 shadow-2xl space-y-4 ${
            darkMode ? 'bg-neutral-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Warning size={22} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-black">Confirm NAS Shutdown</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to shut down <strong>{identity.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
              Shutting down the NAS will terminate all ongoing SMB/NFS file transfers, media streaming, and background sync services.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowShutdownConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowShutdownConfirm(false);
                  triggerAction(buttons.shutdownEntityId, 'Shutdown');
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Confirm Shutdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
