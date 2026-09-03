/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Globe,
  ArrowsLeftRight,
  ArrowClockwise,
  Power,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Broadcast,
  Copy,
  Check,
  WifiHigh
} from '@phosphor-icons/react';
import { TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkOverviewSectionProps {
  metrics: TpLinkRouterMetrics;
  onToggleSwitch: (entityId: string, currentState: boolean) => Promise<void>;
  onPressButton: (entityId: string) => Promise<void>;
  isLiveMode?: boolean;
  darkMode?: boolean;
}

export const TpLinkOverviewSection: React.FC<TpLinkOverviewSectionProps> = ({
  metrics,
  onToggleSwitch,
  onPressButton,
  isLiveMode = false,
  darkMode = true
}) => {
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const cardStyle =
    'rounded-3xl backdrop-blur-2xl transition-all p-5 sm:p-6 ' +
    (darkMode
      ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80');

  const tileStyle =
    'p-3.5 rounded-2xl backdrop-blur-xl transition-all ' +
    (darkMode
      ? 'bg-white/[0.04] text-white'
      : 'bg-slate-100/90 text-slate-900 shadow-xs');

  const isDataFetchingOn = metrics.wifiSwitches.routerDataFetching?.enabled ?? true;
  const isWanConnected = metrics.wanStatus === 'connected';

  const handleCopyIp = (ip: string) => {
    if (!ip) return;
    navigator.clipboard?.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleConfirmReboot = async () => {
    setIsRebooting(true);
    if (metrics.rebootButtonEntityId) {
      await onPressButton(metrics.rebootButtonEntityId);
    }
    setTimeout(() => {
      setIsRebooting(false);
      setShowRebootModal(false);
    }, 2500);
  };

  return (
    <div className="space-y-3">
      {/* Section Header with Reboot Action & Uptime */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <Globe size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Router Overview &amp; Gateway
          </h2>
          <span
            className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isWanConnected
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isWanConnected ? (
              <>
                <CheckCircle size={10} weight="fill" /> Online
              </>
            ) : (
              <>
                <WarningCircle size={10} weight="fill" /> Offline
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Uptime Pill */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isWanConnected ? 'bg-emerald-400' : 'bg-rose-400'
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isWanConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span>Uptime: {metrics.uptime}</span>
          </div>

          {/* Action Button: Reboot Router with Confirmation Modal */}
          <button
            type="button"
            onClick={() => setShowRebootModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Power size={13} weight="bold" />
            <span>Reboot</span>
          </button>
        </div>
      </div>

      {/* Overview Main Card (5 Responsive Status Tiles) */}
      <div className={cardStyle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Connection Protocol */}
          <div className={`${tileStyle} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowsLeftRight size={12} className="text-indigo-400" /> Protocol
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-500">Active</span>
            </div>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
              {metrics.connectionType || 'Dynamic IP'}
            </div>
            <div className="text-[9px] text-slate-400">WAN Connection Type</div>
          </div>

          {/* 2. Public IP Address */}
          <div className={`${tileStyle} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Globe size={12} className="text-sky-400" /> Public IP
              </span>
              <button
                type="button"
                onClick={() => handleCopyIp(metrics.publicIp || '84.115.182.49')}
                className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                title="Click to copy Public IP"
              >
                {copiedIp === (metrics.publicIp || '84.115.182.49') ? (
                  <>
                    <Check size={10} weight="bold" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">
              {metrics.publicIp || '84.115.182.49'}
            </div>
            <div className="text-[9px] text-slate-400">External Internet IP</div>
          </div>

          {/* 3. WAN IPv4 Address */}
          <div className={`${tileStyle} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Globe size={12} className="text-cyan-400" /> WAN IPv4
              </span>
              <span className="text-[9px] font-mono font-bold text-cyan-400">Gateway</span>
            </div>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">
              {metrics.wanIpv4 || 'Unavailable'}
            </div>
            <div className="text-[9px] text-slate-400">ISP Uplink Gateway IP</div>
          </div>

          {/* 4. LAN IPv4 Address */}
          <div className={`${tileStyle} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-amber-400" /> LAN IPv4
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-400">/24</span>
            </div>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">
              {metrics.lanIpv4 || '192.168.68.1'}
            </div>
            <div className="text-[9px] text-slate-400">Router Subnet IP</div>
          </div>

          {/* 5. Live Data Fetching Toggle Switch with Active Glow */}
          <div
            className={`p-3 rounded-xl border backdrop-blur-md flex flex-col justify-between transition-all duration-200 ${
              isDataFetchingOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-white/[0.03] border-white/[0.06] text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Broadcast size={12} className={isDataFetchingOn ? 'text-emerald-400' : 'text-slate-400'} /> Polling
              </span>
              <span
                className={`text-[9px] font-mono font-bold uppercase ${
                  isDataFetchingOn ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {isDataFetchingOn ? 'Live' : 'Paused'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Live Polling
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDataFetchingOn}
                onClick={() => {
                  if (metrics.wifiSwitches.routerDataFetching?.entityId) {
                    onToggleSwitch(
                      metrics.wifiSwitches.routerDataFetching.entityId,
                      isDataFetchingOn
                    );
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDataFetchingOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isDataFetchingOn ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reboot Confirm Modal */}
      {showRebootModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
              darkMode
                ? 'bg-slate-900 border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200/50 dark:border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Power size={22} weight="bold" />
              </div>
              <div>
                <h4 className="text-base font-black">Confirm Router Reboot</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {metrics.model} (Living Room)
                </p>
              </div>
            </div>

            <div className="py-4 text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to reboot the TP-Link router? All connected devices will
                temporarily lose Wi-Fi and wired Internet connectivity for approximately 60–90
                seconds.
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] flex items-center gap-2">
                <WarningCircle size={16} weight="bold" className="shrink-0" />
                <span>Active downloads and smart home streaming sessions will be interrupted.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/50 dark:border-white/10">
              <button
                type="button"
                disabled={isRebooting}
                onClick={() => setShowRebootModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRebooting}
                onClick={handleConfirmReboot}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-500/25"
              >
                {isRebooting ? (
                  <>
                    <ArrowClockwise size={13} className="animate-spin" />
                    <span>Rebooting...</span>
                  </>
                ) : (
                  <>
                    <Power size={13} weight="bold" />
                    <span>Confirm Reboot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
