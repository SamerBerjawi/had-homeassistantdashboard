/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Thermometer,
  HardDrives,
  HardDrive,
  Network,
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  Check,
  ArrowsClockwise,
  Pulse,
  Waveform,
  Desktop,
  CheckCircle,
  Database,
  ChartLineUp,
  Gauge as GaugeIcon
} from '@phosphor-icons/react';
import { BentoGrid } from '../../ui/bento-grid';
import { Gauge } from '../../charts/gauge';
import { PieChart } from '../../charts/pie-chart';
import { PieSlice } from '../../charts/pie-slice';
import { PieCenter } from '../../charts/pie-center';
import { LineChart } from '../../charts/line-chart';
import { Line } from '../../charts/line';
import { Grid } from '../../charts/grid';
import { XAxis } from '../../charts/x-axis';
import { YAxis } from '../../charts/y-axis';
import { ChartTooltip } from '../../charts/tooltip';
import { SystemHostMetrics, SystemTimeseriesPoint, HistoryTimeRange } from '../../../hooks/useSystemMetrics';

export interface GenericHostMonitorViewProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  icon?: React.ReactNode;
  metrics: SystemHostMetrics;
  historyData: SystemTimeseriesPoint[];
  timeRange: HistoryTimeRange;
  onTimeRangeChange: (range: HistoryTimeRange) => void;
  onRefresh: () => void;
  isLoadingHistory?: boolean;
  darkMode?: boolean;
}

type CardViewMode = 'gauge' | 'trend';

export function GenericHostMonitorView({
  title,
  subtitle,
  badgeText = 'Active Host',
  icon,
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  isLoadingHistory = false,
  darkMode = true
}: GenericHostMonitorViewProps) {
  const [copiedIp, setCopiedIp] = useState(false);

  // Individual card view mode states (gauge vs trend)
  const [cpuView, setCpuView] = useState<CardViewMode>('gauge');
  const [ramView, setRamView] = useState<CardViewMode>('gauge');
  const [diskView, setDiskView] = useState<CardViewMode>('gauge');
  const [netView, setNetView] = useState<CardViewMode>('trend');

  const handleCopyIp = () => {
    if (metrics.ipv4Address && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(metrics.ipv4Address);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  // Toggle all cards at once
  const handleToggleAll = (mode: CardViewMode) => {
    setCpuView(mode);
    setRamView(mode);
    setDiskView(mode);
    setNetView(mode);
  };

  // Threshold colors
  const cpuColor =
    metrics.cpuUsage > 80
      ? '#EF4444' // Red
      : metrics.cpuUsage > 60
      ? '#F59E0B' // Amber
      : '#10B981'; // Green

  const ramColor =
    metrics.memoryUsagePercent > 85
      ? '#EF4444'
      : metrics.memoryUsagePercent > 70
      ? '#8B5CF6' // Purple
      : '#06B6D4'; // Cyan

  const diskColor =
    metrics.diskUsagePercent > 85
      ? '#EF4444'
      : metrics.diskUsagePercent > 70
      ? '#F59E0B'
      : '#10B981';

  // 1. RAM Donut Data
  const totalRamGiB = ((metrics.memoryUsedMiB + metrics.memoryFreeMiB) / 1024).toFixed(2);
  const ramChartData = [
    {
      label: 'Used Memory',
      value: Math.max(0.01, metrics.memoryUsedMiB),
      color: '#8B5CF6'
    },
    {
      label: 'Free Memory',
      value: Math.max(0.01, metrics.memoryFreeMiB),
      color: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.25)'
    }
  ];

  // 2. Disk Donut Data
  const totalDiskGiB = (metrics.diskUsedGiB + metrics.diskFreeGiB).toFixed(2);
  const diskChartData = [
    {
      label: 'Used Space',
      value: Math.max(0.01, metrics.diskUsedGiB),
      color: '#F59E0B'
    },
    {
      label: 'Available Space',
      value: Math.max(0.01, metrics.diskFreeGiB),
      color: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(100, 116, 139, 0.25)'
    }
  ];

  const formatGB = (mib: number) => {
    const gb = mib / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const formatPackets = (p: number) => {
    if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
    if (p >= 1_000) return `${(p / 1_000).toFixed(1)}k`;
    return p.toString();
  };

  const cardBaseStyle = `rounded-3xl p-3.5 sm:p-5 md:p-6 border backdrop-blur-xl transition-all duration-300 ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-2xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <BentoGrid className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3 sm:gap-4.5 auto-rows-auto">
      {/* ========================================================= */}
      {/* 1. HOST HEADER & TELEMETRY CONTROLS                        */}
      {/* ========================================================= */}
      <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 ${cardBaseStyle} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/10 shrink-0">
            {icon || <Desktop size={24} weight="duotone" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {badgeText}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Global Controls: View Mode Toggle & Time Range */}
        <div className="flex items-center gap-2 self-stretch sm:self-center justify-between sm:justify-end flex-wrap">
          {/* Quick All-Cards Toggle */}
          <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => handleToggleAll('gauge')}
              title="Switch all cards to Gauge view"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                cpuView === 'gauge' && ramView === 'gauge' && diskView === 'gauge'
                  ? darkMode
                    ? 'bg-white/20 text-white shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : darkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GaugeIcon size={14} weight="duotone" />
              <span className="hidden xs:inline">Gauges</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll('trend')}
              title="Switch all cards to Historical Curves view"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                cpuView === 'trend' && ramView === 'trend' && diskView === 'trend'
                  ? darkMode
                    ? 'bg-white/20 text-white shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : darkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChartLineUp size={14} weight="duotone" />
              <span className="hidden xs:inline">Trends</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            {(['1h', '6h', '24h'] as HistoryTimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onTimeRangeChange(r)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === r
                    ? darkMode
                      ? 'bg-cyan-500 text-black shadow-xs'
                      : 'bg-cyan-600 text-white shadow-xs'
                    : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh historical telemetry"
            disabled={isLoadingHistory}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              darkMode
                ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ArrowsClockwise
              size={16}
              weight="bold"
              className={isLoadingHistory ? 'animate-spin text-cyan-400' : ''}
            />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. COMBINED METRICS TILES (GAUGE & LINE CHART WITH TOGGLE) */}
      {/* 2 Tiles side-by-side on mobile: col-span-2                 */}
      {/* ========================================================= */}

      {/* TILE 1: CPU UTILIZATION & THERMAL */}
      <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between min-h-[260px] sm:min-h-[290px]`}>
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <Cpu size={16} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                CPU Load
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {metrics.cpuTemp.toFixed(0)}°C | {metrics.load1m.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCpuView(cpuView === 'gauge' ? 'trend' : 'gauge')}
              title={cpuView === 'gauge' ? 'Switch to Trend Chart' : 'Switch to Gauge View'}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                cpuView === 'trend'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {cpuView === 'gauge' ? <ChartLineUp size={14} /> : <GaugeIcon size={14} />}
            </button>
            <span
              className="text-[10px] font-black font-mono px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0"
              style={{
                backgroundColor: `${cpuColor}1A`,
                borderColor: `${cpuColor}4D`,
                color: cpuColor
              }}
            >
              {metrics.cpuUsage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* View Switcher: Gauge vs LineChart */}
        <div className="my-auto py-2 flex items-center justify-center w-full min-h-[140px]">
          {cpuView === 'gauge' ? (
            <div className="w-full flex items-center justify-center">
              <Gauge
                value={metrics.cpuUsage}
                activeFill={cpuColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                suffix="%"
                defaultLabel="CPU"
                notchCornerRadius={2}
                orientation="arc"
                className="w-full max-w-[200px]"
              />
            </div>
          ) : (
            <div className="w-full h-[140px] sm:h-[160px]">
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 10, bottom: 20, left: 25 }}
                className="w-full h-full"
              >
                <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
                <XAxis numTicks={3} />
                <YAxis numTicks={4} />
                <Line dataKey="cpuUsage" stroke="#06B6D4" strokeWidth={2} animate />
                <Line dataKey="cpuTemp" stroke="#F59E0B" strokeWidth={1.5} animate />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  showDots
                  rows={(p) => [
                    { label: 'CPU', value: `${Number(p.cpuUsage || 0).toFixed(1)}%`, color: '#06B6D4' },
                    { label: 'Temp', value: `${Number(p.cpuTemp || 0).toFixed(1)}°C`, color: '#F59E0B' }
                  ]}
                />
              </LineChart>
            </div>
          )}
        </div>

        {/* Card Footer Subtitles */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium truncate">
            <Thermometer size={13} className="text-amber-500 shrink-0" />
            {metrics.cpuTemp.toFixed(1)} °C
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
            Load: {metrics.load1m.toFixed(2)}
          </span>
        </div>
      </div>

      {/* TILE 2: RAM (MEMORY) PRESSURE */}
      <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between min-h-[260px] sm:min-h-[290px]`}>
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Waveform size={16} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                RAM Load
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {(metrics.memoryUsedMiB / 1024).toFixed(1)}G / {totalRamGiB}G
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRamView(ramView === 'gauge' ? 'trend' : 'gauge')}
              title={ramView === 'gauge' ? 'Switch to Trend Chart' : 'Switch to Gauge View'}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                ramView === 'trend'
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {ramView === 'gauge' ? <ChartLineUp size={14} /> : <GaugeIcon size={14} />}
            </button>
            <span
              className="text-[10px] font-black font-mono px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0"
              style={{
                backgroundColor: `${ramColor}1A`,
                borderColor: `${ramColor}4D`,
                color: ramColor
              }}
            >
              {metrics.memoryUsagePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* View Switcher: Gauge vs LineChart */}
        <div className="my-auto py-2 flex items-center justify-center w-full min-h-[140px]">
          {ramView === 'gauge' ? (
            <div className="w-full flex items-center justify-center">
              <Gauge
                value={metrics.memoryUsagePercent}
                activeFill={ramColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                suffix="%"
                defaultLabel="RAM"
                notchCornerRadius={2}
                orientation="arc"
                className="w-full max-w-[200px]"
              />
            </div>
          ) : (
            <div className="w-full h-[140px] sm:h-[160px]">
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 10, bottom: 20, left: 25 }}
                className="w-full h-full"
              >
                <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
                <XAxis numTicks={3} />
                <YAxis numTicks={4} />
                <Line dataKey="memoryUsage" stroke="#8B5CF6" strokeWidth={2} animate />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  showDots
                  rows={(p) => [
                    { label: 'RAM Pressure', value: `${Number(p.memoryUsage || 0).toFixed(1)}%`, color: '#8B5CF6' }
                  ]}
                />
              </LineChart>
            </div>
          )}
        </div>

        {/* Card Footer Subtitles */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium truncate text-purple-400">
            {(metrics.memoryUsedMiB / 1024).toFixed(2)} GB Used
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {(metrics.memoryFreeMiB / 1024).toFixed(2)} GB Free
          </span>
        </div>
      </div>

      {/* TILE 3: PRIMARY DISK USAGE */}
      <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between min-h-[260px] sm:min-h-[290px]`}>
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <HardDrive size={16} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                Disk Root (/)
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {metrics.diskUsedGiB.toFixed(1)}G / {totalDiskGiB}G
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDiskView(diskView === 'gauge' ? 'trend' : 'gauge')}
              title={diskView === 'gauge' ? 'Switch to Trend Chart' : 'Switch to Gauge View'}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                diskView === 'trend'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {diskView === 'gauge' ? <ChartLineUp size={14} /> : <GaugeIcon size={14} />}
            </button>
            <span
              className="text-[10px] font-black font-mono px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0"
              style={{
                backgroundColor: `${diskColor}1A`,
                borderColor: `${diskColor}4D`,
                color: diskColor
              }}
            >
              {metrics.diskUsagePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* View Switcher: Gauge vs LineChart */}
        <div className="my-auto py-2 flex items-center justify-center w-full min-h-[140px]">
          {diskView === 'gauge' ? (
            <div className="w-full flex items-center justify-center">
              <Gauge
                value={metrics.diskUsagePercent}
                activeFill={diskColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                suffix="%"
                defaultLabel="DISK"
                notchCornerRadius={2}
                orientation="arc"
                className="w-full max-w-[200px]"
              />
            </div>
          ) : (
            <div className="w-full h-[140px] sm:h-[160px]">
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 10, bottom: 20, left: 25 }}
                className="w-full h-full"
              >
                <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
                <XAxis numTicks={3} />
                <YAxis numTicks={4} />
                <Line dataKey="diskUsage" stroke="#F59E0B" strokeWidth={2} animate />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  showDots
                  rows={(p) => [
                    { label: 'Disk Used', value: `${Number(p.diskUsage || 0).toFixed(1)}%`, color: '#F59E0B' }
                  ]}
                />
              </LineChart>
            </div>
          )}
        </div>

        {/* Card Footer Subtitles */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium truncate text-amber-400">
            {metrics.diskUsedGiB.toFixed(1)} GB Used
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
            {metrics.diskFreeGiB.toFixed(1)} GB Free
          </span>
        </div>
      </div>

      {/* TILE 4: NETWORK THROUGHPUT */}
      <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between min-h-[260px] sm:min-h-[290px]`}>
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Network size={16} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
                Throughput
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
                end0 (1GbE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNetView(netView === 'gauge' ? 'trend' : 'gauge')}
              title={netView === 'gauge' ? 'Switch to Trend Chart' : 'Switch to Gauge View'}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                netView === 'trend'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {netView === 'gauge' ? <ChartLineUp size={14} /> : <GaugeIcon size={14} />}
            </button>
            <span className="text-[10px] font-black font-mono px-1.5 sm:px-2 py-0.5 rounded-full border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shrink-0">
              LIVE
            </span>
          </div>
        </div>

        {/* View Switcher: Gauge vs LineChart */}
        <div className="my-auto py-2 flex items-center justify-center w-full min-h-[140px]">
          {netView === 'gauge' ? (
            <div className="w-full flex items-center justify-center">
              <Gauge
                value={Math.min(100, (metrics.networkInMiB % 100))}
                activeFill="#10B981"
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                suffix=" MB/s"
                defaultLabel="NET"
                notchCornerRadius={2}
                orientation="arc"
                className="w-full max-w-[200px]"
              />
            </div>
          ) : (
            <div className="w-full h-[140px] sm:h-[160px]">
              <LineChart
                data={historyData as unknown as Record<string, unknown>[]}
                xDataKey="date"
                margin={{ top: 10, right: 10, bottom: 20, left: 25 }}
                className="w-full h-full"
              >
                <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
                <XAxis numTicks={3} />
                <YAxis numTicks={4} />
                <Line dataKey="networkInRate" stroke="#10B981" strokeWidth={2} animate />
                <Line dataKey="networkOutRate" stroke="#6366F1" strokeWidth={1.5} animate />
                <ChartTooltip
                  showDatePill
                  showCrosshair
                  showDots
                  rows={(p) => [
                    { label: 'Inbound', value: `${Number(p.networkInRate || 0).toFixed(2)} MB/s`, color: '#10B981' },
                    { label: 'Outbound', value: `${Number(p.networkOutRate || 0).toFixed(2)} MB/s`, color: '#6366F1' }
                  ]}
                />
              </LineChart>
            </div>
          )}
        </div>

        {/* Card Footer Subtitles */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium truncate text-emerald-400 flex items-center gap-0.5">
            <ArrowDown size={11} /> {formatGB(metrics.networkInMiB)}
          </span>
          <span className="font-medium truncate text-indigo-400 flex items-center gap-0.5">
            <ArrowUp size={11} /> {formatGB(metrics.networkOutMiB)}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. STORAGE & RAM BREAKDOWN DONUTS (2 CARDS)                */}
      {/* ========================================================= */}

      {/* ========================================================= */}
      {/* 3. STORAGE & RAM BREAKDOWN DONUTS (COMPACT)               */}
      {/* 2-by-2 on mobile (col-span-2), col-span-3 on desktop       */}
      {/* ========================================================= */}

      {/* RAM Breakdown Donut */}
      <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between min-h-[260px] sm:min-h-[290px]`}>
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10 mb-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Database size={16} weight="duotone" />
            </div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              RAM Donut
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            {totalRamGiB} GiB
          </span>
        </div>

        <div className="relative w-[130px] h-[130px] sm:w-[145px] sm:h-[145px] mx-auto my-auto flex items-center justify-center py-1">
          <PieChart
            data={ramChartData}
            innerRadius={42}
            padAngle={0.04}
            cornerRadius={5}
            size={135}
            className="w-full h-full"
          >
            {ramChartData.map((_, i) => (
              <PieSlice key={i} index={i} />
            ))}
            <PieCenter
              defaultLabel="RAM"
              suffix=" GiB"
              formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            >
              {({ value, isHovered, data }) => (
                <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {isHovered ? data.label : 'RAM'}
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                    {isHovered ? (value / 1024).toFixed(1) : totalRamGiB}
                  </span>
                  <span className="text-[8px] font-bold text-purple-400">GiB</span>
                </div>
              )}
            </PieCenter>
          </PieChart>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
          <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
            <span className="text-[9px] font-bold text-purple-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Used
            </span>
            <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 text-slate-900 dark:text-white">
              {metrics.memoryUsedMiB.toFixed(0)} <span className="text-[8px] font-normal text-slate-400">M</span>
            </span>
          </div>

          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-500/10 border border-slate-500/20 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Free
            </span>
            <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 text-slate-900 dark:text-white">
              {metrics.memoryFreeMiB.toFixed(0)} <span className="text-[8px] font-normal text-slate-400">M</span>
            </span>
          </div>
        </div>
      </div>

      {/* Disk Breakdown Donut */}
      <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between min-h-[260px] sm:min-h-[290px]`}>
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10 mb-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <HardDrives size={16} weight="duotone" />
            </div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              Disk Donut
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {totalDiskGiB} GiB
          </span>
        </div>

        <div className="relative w-[130px] h-[130px] sm:w-[145px] sm:h-[145px] mx-auto my-auto flex items-center justify-center py-1">
          <PieChart
            data={diskChartData}
            innerRadius={42}
            padAngle={0.04}
            cornerRadius={5}
            size={135}
            className="w-full h-full"
          >
            {diskChartData.map((_, i) => (
              <PieSlice key={i} index={i} />
            ))}
            <PieCenter
              defaultLabel="Disk"
              suffix=" GiB"
              formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            >
              {({ value, isHovered, data }) => (
                <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {isHovered ? data.label : 'Root'}
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none my-0.5">
                    {isHovered ? value.toFixed(1) : totalDiskGiB}
                  </span>
                  <span className="text-[8px] font-bold text-amber-400">GiB</span>
                </div>
              )}
            </PieCenter>
          </PieChart>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
          <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
            <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Used
            </span>
            <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 text-slate-900 dark:text-white">
              {metrics.diskUsedGiB.toFixed(1)} <span className="text-[8px] font-normal text-slate-400">GB</span>
            </span>
          </div>

          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-500/10 border border-slate-500/20 flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Free
            </span>
            <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 text-slate-900 dark:text-white">
              {metrics.diskFreeGiB.toFixed(1)} <span className="text-[8px] font-normal text-slate-400">GB</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. HOST INFORMATION & NETWORK TELEMETRY BENTO GRID         */}
      {/* 2-by-2 on mobile: col-span-2 (except full IP tile if wide) */}
      {/* ========================================================= */}

      {/* Tile 1: IP Address */}
      <div className={`col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between`}>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-semibold text-[11px]">IPv4 Address</span>
          <button
            type="button"
            onClick={handleCopyIp}
            title="Copy IP Address"
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {copiedIp ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
        <div>
          <span className="text-xs sm:text-sm md:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight break-all">
            {metrics.ipv4Address || '192.168.68.71'}
          </span>
          <p className="text-[9px] sm:text-[10px] text-emerald-500 font-semibold mt-0.5 truncate">
            {copiedIp ? 'Copied!' : 'Static lease'}
          </p>
        </div>
      </div>

      {/* Tile 2: Primary Interface */}
      <div className={`col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-2 ${cardBaseStyle} flex flex-col justify-between`}>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-semibold text-[11px]">Interface</span>
          <Network size={15} className="text-cyan-400" />
        </div>
        <div>
          <span className="text-xs sm:text-sm md:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight">
            end0
          </span>
          <p className="text-[9px] sm:text-[10px] text-cyan-400 font-semibold mt-0.5 truncate">
            Ethernet 1GbE
          </p>
        </div>
      </div>

      {/* Tile 3: Cumulative Traffic */}
      <div className={`col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-2 ${cardBaseStyle} flex flex-col justify-between`}>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-semibold text-[11px]">Cumulative I/O</span>
          <div className="flex items-center gap-1 text-[9px]">
            <ArrowDown size={10} className="text-emerald-400" />
            <ArrowUp size={10} className="text-indigo-400" />
          </div>
        </div>
        <div>
          <span className="text-[11px] sm:text-xs font-black font-mono text-slate-900 dark:text-white tracking-tight truncate block">
            {formatGB(metrics.networkInMiB)} / {formatGB(metrics.networkOutMiB)}
          </span>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
            Total I/O boot
          </p>
        </div>
      </div>

      {/* Tile 4: Total Packets */}
      <div className={`col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-2 ${cardBaseStyle} flex flex-col justify-between`}>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-semibold text-[11px]">Packets</span>
          <Pulse size={15} className="text-amber-400" />
        </div>
        <div>
          <span className="text-[11px] sm:text-xs font-black font-mono text-slate-900 dark:text-white tracking-tight truncate block">
            {formatPackets(metrics.packetsIn)} / {formatPackets(metrics.packetsOut)}
          </span>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
            0 drop / 0 err
          </p>
        </div>
      </div>

      {/* Tile 5: System Uptime & Status */}
      <div className={`col-span-4 sm:col-span-2 md:col-span-4 lg:col-span-3 ${cardBaseStyle} flex flex-col justify-between`}>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-semibold text-[11px]">Uptime & Health</span>
          <Clock size={15} className="text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm md:text-base font-black font-mono text-slate-900 dark:text-white tracking-tight truncate">
              {metrics.uptime || '1 week'}
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-emerald-500 font-semibold mt-0.5 flex items-center gap-1 truncate">
            <CheckCircle size={12} weight="fill" />
            Core Synced & Healthy
          </p>
        </div>
      </div>
    </BentoGrid>
  );
}
