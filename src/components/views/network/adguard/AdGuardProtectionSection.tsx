/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  ShieldSlash,
  Funnel,
  LockKey,
  GlobeHemisphereWest,
  MagnifyingGlass,
  FileText,
  SlidersHorizontal,
  Warning
} from '@phosphor-icons/react';
import { AdGuardMetrics } from '../../../../types/network';

interface AdGuardProtectionSectionProps {
  metrics: AdGuardMetrics;
  onToggleSwitch: (entityId: string, currentState: boolean) => Promise<void>;
  darkMode?: boolean;
}

export const AdGuardProtectionSection: React.FC<AdGuardProtectionSectionProps> = ({
  metrics,
  onToggleSwitch,
  darkMode = true
}) => {
  const isMasterOn = metrics.protectionEnabled;

  const cardStyle =
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const subSwitches = [
    {
      id: 'filtering',
      title: 'DNS Filtering',
      desc: 'Block ads, trackers & phishing domains across all clients',
      icon: Funnel,
      enabled: metrics.filteringEnabled,
      entityId: metrics.switches.filtering,
      color: '#10B981', // Emerald
      glowClass: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
    },
    {
      id: 'safe_browsing',
      title: 'Safe Browsing',
      desc: 'Real-time protection against malicious websites & malware',
      icon: GlobeHemisphereWest,
      enabled: metrics.safeBrowsingEnabled,
      entityId: metrics.switches.safeBrowsing,
      color: '#F43F5E', // Rose
      glowClass: 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
    },
    {
      id: 'parental_control',
      title: 'Parental Control',
      desc: 'Block adult content and enforce safe search by family policy',
      icon: LockKey,
      enabled: metrics.parentalControlEnabled,
      entityId: metrics.switches.parentalControl,
      color: '#F59E0B', // Amber
      glowClass: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
    },
    {
      id: 'safe_search',
      title: 'Safe Search',
      desc: 'Enforce strict SafeSearch on Google, Bing & YouTube',
      icon: MagnifyingGlass,
      enabled: metrics.safeSearchEnabled,
      entityId: metrics.switches.safeSearch,
      color: '#06B6D4', // Cyan
      glowClass: 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
    },
    {
      id: 'query_log',
      title: 'Query Log',
      desc: 'Anonymized client DNS request auditing & real-time telemetry',
      icon: FileText,
      enabled: metrics.queryLogEnabled,
      entityId: metrics.switches.queryLog,
      color: '#8B5CF6', // Purple
      glowClass: 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Protection Controls
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
            Section 1
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Native Home Assistant Switch Service
        </div>
      </div>

      {/* Grid: Master Card + Sub-Switches Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Master Protection Switch (Hero Card, 4 Cols on Desktop) */}
        <div
          className={`lg:col-span-4 ${cardStyle} flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
            isMasterOn
              ? 'bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
              : 'border-rose-500/30'
          }`}
        >
          {/* Subtle Ambient Radial Glow when Master is active */}
          {isMasterOn && (
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />
          )}

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-200 ${
                    isMasterOn
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isMasterOn ? (
                    <ShieldCheck size={24} weight="duotone" />
                  ) : (
                    <ShieldSlash size={24} weight="duotone" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    Master Protection
                  </h3>
                  <span
                    className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${
                      isMasterOn
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                    }`}
                  >
                    {isMasterOn ? '● Shield Active' : '○ Protection Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 pt-3 leading-relaxed">
              Global killswitch for all AdGuard Home DNS blocking rules, malware sinks, and parental control engines across the network.
            </p>
          </div>

          {/* Master Toggle Button */}
          <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isMasterOn ? 'Enabled for all clients' : 'Shields Down'}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isMasterOn}
              onClick={() => {
                if (metrics.switches.protection) {
                  onToggleSwitch(metrics.switches.protection, isMasterOn);
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${
                isMasterOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isMasterOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sub-Toggles Grid (8 Cols on Desktop) */}
        <div className={`lg:col-span-8 ${cardStyle} relative flex flex-col justify-between`}>
          {/* Master Inactive Overlay Dimmer */}
          {!isMasterOn && (
            <div className="absolute inset-0 z-20 backdrop-blur-[2px] bg-slate-900/50 flex flex-col items-center justify-center p-4 rounded-2xl animate-fadeIn text-center">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center gap-2 max-w-sm shadow-xl">
                <Warning size={20} weight="fill" className="shrink-0" />
                <div className="text-left text-xs font-bold">
                  <div>Inactive — Master Protection Disabled</div>
                  <div className="text-[10px] font-normal text-amber-300/80">
                    Enable Master Protection to activate individual filtering policies.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Security &amp; Privacy Policies
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Granular control over specific DNS inspection and blocking layers
                </p>
              </div>

              <span className="text-[10px] font-mono font-bold text-slate-500">
                {subSwitches.filter((s) => s.enabled).length}/{subSwitches.length} Active
              </span>
            </div>

            {/* Sub-switches list/grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
              {subSwitches.map((item) => {
                const Icon = item.icon;
                const isEnabled = item.enabled;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-between gap-3 ${
                      isEnabled
                        ? item.glowClass
                        : 'bg-white/[0.02] border-white/5 opacity-60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${item.color}1A`,
                          color: item.color
                        }}
                      >
                        <Icon size={16} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </span>
                          <span
                            className={`text-[8px] font-mono font-bold px-1 rounded uppercase ${
                              isEnabled
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-slate-500/15 text-slate-400'
                            }`}
                          >
                            {isEnabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      disabled={!isMasterOn}
                      aria-checked={isEnabled}
                      onClick={() => {
                        if (item.entityId) {
                          onToggleSwitch(item.entityId, isEnabled);
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? '' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      style={isEnabled ? { backgroundColor: item.color } : undefined}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span>Switches synchronized via Home Assistant WebSocket</span>
            <span className="font-mono">Instant Policy Enforcement</span>
          </div>
        </div>
      </div>
    </div>
  );
};
