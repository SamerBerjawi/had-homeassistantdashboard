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
  Wind,
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
  Warning,
  SquareSplitHorizontal,
  SquaresFour
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

interface ConfirmModalConfig {
  actionType: 'wake' | 'adopt' | 'reboot' | 'shutdown';
  title: string;
  subtitle: string;
  details: string;
  impactText: string;
  confirmLabel: string;
  confirmButtonClass: string;
  icon: React.ReactNode;
  entityId: string;
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
  const [activeConfirm, setActiveConfirm] = useState<ConfirmModalConfig | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Per-chart Unified vs Separate toggles
  const [netViewMode, setNetViewMode] = useState<'unified' | 'split'>('unified');
  const [diskViewMode, setDiskViewMode] = useState<'unified' | 'split'>('unified');
  const [volViewMode, setVolViewMode] = useState<'unified' | 'split'>('unified');

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

  const cardStyle = `rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
    darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900'
  }`;

  const triggerAction = (id: string, name: string) => {
    setActiveAction(name);
    onPressButton(id);
    setTimeout(() => setActiveAction(null), 3000);
  };

  const openConfirmModal = (actionType: 'wake' | 'adopt' | 'reboot' | 'shutdown') => {
    if (actionType === 'wake') {
      setActiveConfirm({
        actionType: 'wake',
        title: 'Confirm Wake Up (WoL)',
        subtitle: `Broadcast Wake-on-LAN to ${identity.name}`,
        details: 'This will send an Ethernet Wake-on-LAN magic packet targeting the hardware MAC address to awaken the NAS controller from sleep or standby state.',
        impactText: 'Network traffic will temporarily spike during link synchronization.',
        confirmLabel: 'Send Wake Packet',
        confirmButtonClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30',
        icon: <Sun size={24} weight="duotone" className="text-amber-400" />,
        entityId: buttons.wakeUpEntityId
      });
    } else if (actionType === 'adopt') {
      setActiveConfirm({
        actionType: 'adopt',
        title: 'Confirm Adopt Standalone Disk',
        subtitle: `Provision Bay 4 Storage Drive on ${identity.name}`,
        details: 'Adopting the newly inserted unallocated disk into UGOS storage subsystem enables expanding Storage Pool 1 or configuring a dedicated volume.',
        impactText: 'Ensure any required disk initialization is backed up beforehand.',
        confirmLabel: 'Adopt Disk',
        confirmButtonClass: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30',
        icon: <PlusCircle size={24} weight="duotone" className="text-cyan-400" />,
        entityId: buttons.adoptDiskEntityId
      });
    } else if (actionType === 'reboot') {
      setActiveConfirm({
        actionType: 'reboot',
        title: 'Confirm NAS Reboot',
        subtitle: `Graceful system restart for ${identity.name}`,
        details: 'Rebooting will safely flush disk caches, unmount file volumes, and restart the host OS kernel.',
        impactText: 'Active SMB/NFS file transfers, media streaming, and Docker containers will be temporarily disconnected.',
        confirmLabel: 'Reboot System',
        confirmButtonClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30',
        icon: <ArrowsCounterClockwise size={24} weight="duotone" className="text-amber-400" />,
        entityId: buttons.rebootEntityId
      });
    } else if (actionType === 'shutdown') {
      setActiveConfirm({
        actionType: 'shutdown',
        title: 'Confirm NAS Shutdown',
        subtitle: `Power off ${identity.name}`,
        details: 'Shutting down the NAS will safely unmount storage pools and terminate all host background services.',
        impactText: 'A physical power button press or Wake-on-LAN packet is required to turn the NAS back on.',
        confirmLabel: 'Confirm Shutdown',
        confirmButtonClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30',
        icon: <Power size={24} weight="duotone" className="text-rose-400" />,
        entityId: buttons.shutdownEntityId
      });
    }
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {identity.name}
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">
                  {identity.model}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {identity.ugosVersion} • {identity.type}
              </p>
            </div>
          </div>
        </div>

        {/* Server Online Status */}
        <div className={`${cardStyle} flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Server Status</span>
            <span className="text-xs font-black font-mono mt-0.5 block text-slate-900 dark:text-white truncate">
              {identity.serverStatus}
            </span>
          </div>
          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${serverBadgeClass}`}>
            {isServerOnline ? '● Online' : '○ Offline'}
          </span>
        </div>

        {/* System & Temp Status */}
        <div className={`${cardStyle} flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Health State</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-mono font-bold ${isSystemOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                Sys: {identity.systemStatusCode}
              </span>
              <span className="text-slate-500">•</span>
              <span className={`text-xs font-mono font-bold ${isTempOk ? 'text-cyan-400' : 'text-rose-400'}`}>
                Temp: {identity.tempStatusCode}
              </span>
            </div>
          </div>
        </div>

        {/* System Total Runtime */}
        <div className={`${cardStyle} flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Runtime</span>
            <span className="text-xs font-black font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
              {identity.totalRuntime}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <Clock size={16} weight="duotone" />
          </div>
        </div>

        {/* Serial Number */}
        <div className={`${cardStyle} flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Serial Number</span>
            <span className="text-xs font-black font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
              {identity.serial}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
            <Network size={16} weight="duotone" />
          </div>
        </div>
      </div>

      {/* 2. Top Actionable Entities: Power Actions & Fan/Power Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Left: Power & Hardware Actions (5 cols on desktop) */}
        <div className={`lg:col-span-5 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Lightning size={14} weight="duotone" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Power &amp; Hardware Actions
              </span>
            </div>
            {activeAction && (
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                Executed: {activeAction}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 py-2">
            {/* Wake Up (WoL) */}
            <button
              type="button"
              onClick={() => openConfirmModal('wake')}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer shadow-sm group"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sun size={15} weight="bold" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[11px] font-black block truncate leading-tight">Wake Up</span>
                <span className="text-[9px] font-mono text-amber-400/80 block">WoL Packet</span>
              </div>
            </button>

            {/* Adopt Disk */}
            <button
              type="button"
              onClick={() => openConfirmModal('adopt')}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all cursor-pointer shadow-sm group"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <PlusCircle size={15} weight="bold" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[11px] font-black block truncate leading-tight">Adopt Disk</span>
                <span className="text-[9px] font-mono text-cyan-400/80 block">Bay 4 Provision</span>
              </div>
            </button>

            {/* Reboot */}
            <button
              type="button"
              onClick={() => openConfirmModal('reboot')}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 group-hover:rotate-180 transition-transform duration-500">
                <ArrowsCounterClockwise size={15} weight="bold" className="text-amber-400" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[11px] font-black block truncate leading-tight">Reboot NAS</span>
                <span className="text-[9px] font-mono text-slate-400 block">Graceful Restart</span>
              </div>
            </button>

            {/* Shutdown */}
            <button
              type="button"
              onClick={() => openConfirmModal('shutdown')}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer shadow-sm group"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Power size={15} weight="bold" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[11px] font-black block truncate leading-tight">Shutdown</span>
                <span className="text-[9px] font-mono text-rose-400/80 block">Power Off System</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Fan & Thermal Profiles (7 cols on desktop) */}
        <div className={`lg:col-span-7 ${cardStyle} flex flex-col justify-between space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <Fan size={14} weight="duotone" className="animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Fan &amp; Thermal Profile Controls
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
              <span className="text-slate-400">CPU: <strong className="text-teal-400">{fansPower.cpuFan}</strong></span>
              <span className="text-slate-400">Device: <strong className="text-cyan-400">{fansPower.deviceFan}</strong></span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/20 uppercase text-[9px]">
                {fansPower.fanStatusOverall}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            {/* Fan Profile Segmented Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1">
                  <Wind size={12} className="text-teal-400" /> Fan Profile
                </span>
                <span className="font-mono text-teal-400 capitalize">{fansPower.fanMode}</span>
              </div>
              <div
                className="grid gap-1 p-1 rounded-xl bg-black/20 dark:bg-white/5 border border-slate-200/50 dark:border-white/5"
                style={{ gridTemplateColumns: `repeat(${fansPower.fanOptions.length}, minmax(0, 1fr))` }}
              >
                {fansPower.fanOptions.map((opt) => {
                  const cur = (fansPower.fanMode || '').toLowerCase().trim();
                  const target = opt.toLowerCase().trim();
                  const isActive =
                    cur === target ||
                    ((cur === 'default' || cur === 'standard') && (target === 'default' || target === 'standard')) ||
                    ((cur === 'full power' || cur === 'full speed') && (target === 'full power' || target === 'full speed'));

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSetFanMode(opt)}
                      className={`px-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center truncate ${
                        isActive
                          ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20 font-black'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Power Mode Segmented Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1">
                  <Lightning size={12} className="text-amber-400" /> Power Mode
                </span>
                <span className="font-mono text-amber-400 capitalize">{fansPower.powerMode}</span>
              </div>
              <div
                className="grid gap-1 p-1 rounded-xl bg-black/20 dark:bg-white/5 border border-slate-200/50 dark:border-white/5"
                style={{ gridTemplateColumns: `repeat(${fansPower.powerOptions.length}, minmax(0, 1fr))` }}
              >
                {fansPower.powerOptions.map((opt) => {
                  const cur = (fansPower.powerMode || '').toLowerCase().trim();
                  const target = opt.toLowerCase().trim();
                  const isActive =
                    cur === target ||
                    ((cur === 'balance' || cur === 'balanced') && (target === 'balance' || target === 'balanced')) ||
                    ((cur === 'performance' || cur === 'high performance') && (target === 'performance' || target === 'high performance')) ||
                    ((cur === 'power saving' || cur === 'energy saving') && (target === 'power saving' || target === 'energy saving'));

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSetPowerMode(opt)}
                      className={`px-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center truncate ${
                        isActive
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compute Resources & Hardware Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        {/* Left: CPU, Temp, RAM 3 Gauges (8 cols) */}
        <div className={`md:col-span-8 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu size={15} weight="duotone" className="text-emerald-400" /> Compute Resources
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Telemetry Window: {timeRange}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 py-2 items-center flex-1">
            {/* CPU Usage Gauge (1/2 on mobile) */}
            <div className="col-span-1 flex flex-col justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[175px] sm:min-h-[190px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Cpu size={13} className="text-emerald-400" /> CPU Load
                </span>
                <span
                  className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${cpuUsageColor}1A`,
                    color: cpuUsageColor
                  }}
                >
                  {compute.cpuUsage < 60 ? 'Optimal' : compute.cpuUsage < 85 ? 'Elevated' : 'High'}
                </span>
              </div>

              <div className="w-full h-[120px] sm:h-[135px] max-w-[160px] mx-auto my-auto flex items-center justify-center">
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
            </div>

            {/* CPU Temperature Gauge (1/2 on mobile) */}
            <div className="col-span-1 flex flex-col justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[175px] sm:min-h-[190px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Thermometer size={13} className="text-cyan-400" /> CPU Temp
                </span>
                <span
                  className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${cpuTempColor}1A`,
                    color: cpuTempColor
                  }}
                >
                  {compute.cpuTemp < 55 ? 'Cool' : compute.cpuTemp < 70 ? 'Warm' : 'Hot'}
                </span>
              </div>

              <div className="w-full h-[120px] sm:h-[135px] max-w-[160px] mx-auto my-auto flex items-center justify-center">
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
            </div>

            {/* RAM Usage Gauge (Full width on mobile, 1/3 on desktop) */}
            <div className="col-span-2 sm:col-span-1 flex flex-col justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 min-h-[175px] sm:min-h-[190px]">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Memory size={13} className="text-indigo-400" /> RAM Usage
                </span>
                <span
                  className="text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md"
                  style={{
                    backgroundColor: `${ramUsageColor}1A`,
                    color: ramUsageColor
                  }}
                >
                  {compute.ramUsage < 60 ? 'Optimal' : compute.ramUsage < 85 ? 'Elevated' : 'High'}
                </span>
              </div>

              <div className="w-full h-[120px] sm:h-[135px] max-w-[160px] mx-auto my-auto flex items-center justify-center">
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
            </div>
          </div>
        </div>

        {/* Right: Hardware Specification Card */}
        <div className={`md:col-span-4 ${cardStyle} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu size={15} weight="duotone" className="text-amber-400" /> Hardware Specs
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">x86_64</span>
          </div>

          <div className="space-y-2 py-2 text-xs flex-1 flex flex-col justify-center">
            {/* CPU Details */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-1.5">
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
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 space-y-1.5">
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
        </div>
      </div>

      {/* 3. Throughput Grid: Network, Disk I/O, Volume I/O with Unified vs Separate Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
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
                <span className="text-[9px] text-slate-500">LAN Traffic</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setNetViewMode('unified')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    netViewMode === 'unified'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Unified Chart"
                >
                  <SquareSplitHorizontal size={10} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setNetViewMode('split')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    netViewMode === 'split'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Separate Charts"
                >
                  <SquaresFour size={10} weight="bold" />
                </button>
              </div>

              <div className="text-right text-[10px] font-mono font-bold leading-tight">
                <div className="text-emerald-400">↓ {throughput.netDownload}</div>
                <div className="text-indigo-400">↑ {throughput.netUpload}</div>
              </div>
            </div>
          </div>

          {netViewMode === 'unified' ? (
            <div className="w-full h-[180px] my-1">
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
          ) : (
            <div className="space-y-1.5 my-1">
              {/* Download Mini-Chart */}
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-emerald-400">
                  <span>↓ Download Rate</span>
                  <span>{throughput.netDownload}</span>
                </div>
                <div className="w-full h-[80px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 6, bottom: 12, left: 18 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="netDownload" stroke="#10B981" strokeWidth={2} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Download', value: `${Number(p.netDownload || 0).toFixed(1)} MB/s`, color: '#10B981' }]}
                    />
                  </LineChart>
                </div>
              </div>

              {/* Upload Mini-Chart */}
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-indigo-400">
                  <span>↑ Upload Rate</span>
                  <span>{throughput.netUpload}</span>
                </div>
                <div className="w-full h-[80px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 6, bottom: 12, left: 18 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="netUpload" stroke="#6366F1" strokeWidth={1.8} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Upload', value: `${Number(p.netUpload || 0).toFixed(1)} MB/s`, color: '#6366F1' }]}
                    />
                  </LineChart>
                </div>
              </div>
            </div>
          )}
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
                <span className="text-[9px] text-slate-500">Physical HDD R/W</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setDiskViewMode('unified')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    diskViewMode === 'unified'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Unified Chart"
                >
                  <SquareSplitHorizontal size={10} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setDiskViewMode('split')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    diskViewMode === 'split'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Separate Charts"
                >
                  <SquaresFour size={10} weight="bold" />
                </button>
              </div>

              <div className="text-right text-[10px] font-mono font-bold leading-tight">
                <div className="text-amber-400">R: {throughput.diskReadRate}</div>
                <div className="text-rose-400">W: {throughput.diskWriteRate}</div>
              </div>
            </div>
          </div>

          {diskViewMode === 'unified' ? (
            <div className="w-full h-[180px] my-1">
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
          ) : (
            <div className="space-y-1.5 my-1">
              {/* Read Mini-Chart */}
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-amber-400">
                  <span>Physical Disk Read</span>
                  <span>{throughput.diskReadRate}</span>
                </div>
                <div className="w-full h-[80px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 6, bottom: 12, left: 18 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="diskRead" stroke="#F59E0B" strokeWidth={2} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Disk Read', value: `${Number(p.diskRead || 0).toFixed(1)} MB/s`, color: '#F59E0B' }]}
                    />
                  </LineChart>
                </div>
              </div>

              {/* Write Mini-Chart */}
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-rose-400">
                  <span>Physical Disk Write</span>
                  <span>{throughput.diskWriteRate}</span>
                </div>
                <div className="w-full h-[80px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 6, bottom: 12, left: 18 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="diskWrite" stroke="#F43F5E" strokeWidth={1.8} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Disk Write', value: `${Number(p.diskWrite || 0).toFixed(1)} MB/s`, color: '#F43F5E' }]}
                    />
                  </LineChart>
                </div>
              </div>
            </div>
          )}
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
                <span className="text-[9px] text-slate-500">Logical Volume R/W</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setVolViewMode('unified')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    volViewMode === 'unified'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Unified Chart"
                >
                  <SquareSplitHorizontal size={10} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setVolViewMode('split')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    volViewMode === 'split'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Separate Charts"
                >
                  <SquaresFour size={10} weight="bold" />
                </button>
              </div>

              <div className="text-right text-[10px] font-mono font-bold leading-tight">
                <div className="text-cyan-400">R: {throughput.volumeReadRate}</div>
                <div className="text-purple-400">W: {throughput.volumeWriteRate}</div>
              </div>
            </div>
          </div>

          {volViewMode === 'unified' ? (
            <div className="w-full h-[180px] my-1">
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
          ) : (
            <div className="space-y-1.5 my-1">
              {/* Volume Read Mini-Chart */}
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-cyan-400">
                  <span>Logical Volume Read</span>
                  <span>{throughput.volumeReadRate}</span>
                </div>
                <div className="w-full h-[80px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 6, bottom: 12, left: 18 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="volumeRead" stroke="#06B6D4" strokeWidth={2} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Vol Read', value: `${Number(p.volumeRead || 0).toFixed(1)} MB/s`, color: '#06B6D4' }]}
                    />
                  </LineChart>
                </div>
              </div>

              {/* Volume Write Mini-Chart */}
              <div className="p-1.5 rounded-xl bg-white/[0.02] border border-slate-200/40 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold px-1 text-purple-400">
                  <span>Logical Volume Write</span>
                  <span>{throughput.volumeWriteRate}</span>
                </div>
                <div className="w-full h-[80px]">
                  <LineChart
                    data={historyData as unknown as Record<string, unknown>[]}
                    xDataKey="date"
                    margin={{ top: 4, right: 6, bottom: 12, left: 18 }}
                    className="w-full h-full"
                  >
                    <Grid stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeDasharray="2,2" />
                    <XAxis numTicks={2} />
                    <YAxis numTicks={2} />
                    <Line dataKey="volumeWrite" stroke="#A855F7" strokeWidth={1.8} animate />
                    <ChartTooltip
                      showDatePill
                      showCrosshair
                      rows={(p) => [{ label: 'Vol Write', value: `${Number(p.volumeWrite || 0).toFixed(1)} MB/s`, color: '#A855F7' }]}
                    />
                  </LineChart>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Universal Action Confirmation Modal for Power & Hardware Actions */}
      {activeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`max-w-md w-full rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
              darkMode ? 'bg-neutral-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                {activeConfirm.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black tracking-tight">{activeConfirm.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeConfirm.subtitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeConfirm.details}
            </p>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Warning size={16} weight="duotone" className="text-amber-400 shrink-0 mt-0.5" />
              <span>{activeConfirm.impactText}</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cfg = activeConfirm;
                  setActiveConfirm(null);
                  triggerAction(cfg.entityId, cfg.confirmLabel);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeConfirm.confirmButtonClass}`}
              >
                {activeConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
