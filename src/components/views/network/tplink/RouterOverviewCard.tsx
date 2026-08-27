/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Globe,
  ArrowsCounterClockwise,
  Check,
  Copy,
  Warning,
  X,
  ShieldCheck,
  HardDrives,
  WifiHigh,
  Network,
  LockKey,
  Radio
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { TpLinkRouterMetrics } from '../../../../types/network';

interface RouterOverviewCardProps {
  metrics: TpLinkRouterMetrics;
  onReboot: (entityId?: string) => void;
  darkMode?: boolean;
}

export const RouterOverviewCard: React.FC<RouterOverviewCardProps> = ({
  metrics,
  onReboot,
  darkMode = true
}) => {
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [showRebootModal, setShowRebootModal] = useState<boolean>(false);

  const handleCopyIp = (ip: string, label: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(label);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const cpuColor = metrics.cpuUsage > 80 ? '#F43F5E' : metrics.cpuUsage > 60 ? '#F59E0B' : '#06B6D4';
  const memColor = metrics.memoryUsage > 80 ? '#F43F5E' : metrics.memoryUsage > 60 ? '#F59E0B' : '#8B5CF6';

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[360px] sm:min-h-[400px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-4 lg:col-span-4 ${cardBaseStyle}`}>
      {/* 1. Header with Model & Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 shadow-inner">
            <Globe size={20} weight="duotone" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              Gateway Overview
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] block">
              {metrics.model}
            </span>
          </div>
        </div>

        {/* Online / Connection Mode Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 uppercase">
            {metrics.connectionType || 'Dynamic IP'}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* 2. WAN & LAN IPs + Gauges */}
      <div className="my-auto py-1.5 flex flex-col gap-2.5">
        {/* IPs Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* WAN IP */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">WAN:</span>
            <button
              type="button"
              onClick={() => handleCopyIp(metrics.wanIpv4, 'wan')}
              title="Click to copy WAN IP"
              className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-cyan-400 cursor-pointer"
            >
              {copiedIp === 'wan' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span className="truncate max-w-[85px]">{metrics.wanIpv4}</span>
            </button>
          </div>

          {/* LAN IP */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">LAN:</span>
            <button
              type="button"
              onClick={() => handleCopyIp(metrics.lanIpv4 || '192.168.68.1', 'lan')}
              title="Click to copy LAN IP"
              className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-cyan-400 cursor-pointer"
            >
              {copiedIp === 'lan' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span className="truncate max-w-[85px]">{metrics.lanIpv4 || '192.168.68.1'}</span>
            </button>
          </div>
        </div>

        {/* Gauges Row: CPU Used & RAM Used */}
        <div className="grid grid-cols-2 gap-2">
          {/* CPU Gauge */}
          <div className="p-2 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5 flex flex-col items-center justify-center">
            <div className="w-full max-w-[100px] flex items-center justify-center">
              <Gauge
                value={metrics.cpuUsage}
                activeFill={cpuColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                suffix="%"
                defaultLabel="CPU"
                notchCornerRadius={2}
                orientation="arc"
                className="w-full"
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              CPU Load ({metrics.cpuUsage.toFixed(1)}%)
            </span>
          </div>

          {/* RAM Gauge */}
          <div className="p-2 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5 flex flex-col items-center justify-center">
            <div className="w-full max-w-[100px] flex items-center justify-center">
              <Gauge
                value={metrics.memoryUsage}
                activeFill={memColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                suffix="%"
                defaultLabel="RAM"
                notchCornerRadius={2}
                orientation="arc"
                className="w-full"
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              Memory ({metrics.memoryUsage.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Client Distribution Breakdown */}
        <div className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-slate-500 dark:text-slate-400">Total:</span>
            <span className="font-mono text-slate-900 dark:text-white">{metrics.connectedClientsCount}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-semibold">
            <span className="text-sky-400 flex items-center gap-0.5" title="Main Wi-Fi Clients">
              <WifiHigh size={11} /> {metrics.mainWifiClientsCount}
            </span>
            <span className="text-emerald-400 flex items-center gap-0.5" title="Wired Clients">
              <Network size={11} /> {metrics.wiredClientsCount}
            </span>
            <span className="text-amber-400 flex items-center gap-0.5" title="IoT Clients">
              <LockKey size={11} /> {metrics.iotClientsCount}
            </span>
            <span className="text-purple-400 flex items-center gap-0.5" title="Guest Clients">
              <Radio size={11} /> {metrics.guestClientsCount}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Footer: Uptime & Reboot Trigger */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>Uptime: <strong className="text-slate-700 dark:text-slate-200">{metrics.uptime}</strong></span>

        <button
          type="button"
          onClick={() => setShowRebootModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer font-bold text-[10px]"
        >
          <ArrowsCounterClockwise size={12} />
          <span>Reboot</span>
        </button>
      </div>

      {/* Reboot Modal Dialog */}
      {showRebootModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Warning size={16} />
                <span>Confirm Router Reboot</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRebootModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to reboot the gateway router? All Wi-Fi connections and Internet access will drop for ~90 seconds.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRebootModal(false)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onReboot(metrics.rebootButtonEntityId);
                  setShowRebootModal(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Confirm Reboot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
