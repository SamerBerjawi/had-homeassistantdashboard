/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  Funnel,
  ShieldWarning,
  UsersThree,
  MagnifyingGlass,
  ListBullets
} from '@phosphor-icons/react';
import { AdGuardMetrics } from '../../../../types/network';

interface AdGuardTopBadgesBarProps {
  metrics: AdGuardMetrics;
  onToggleSwitch: (entityId: string, currentState: boolean) => void;
  darkMode?: boolean;
}

export const AdGuardTopBadgesBar: React.FC<AdGuardTopBadgesBarProps> = ({
  metrics,
  onToggleSwitch,
  darkMode = true
}) => {
  return (
    <div className="w-full flex items-center justify-between flex-wrap gap-2.5 pb-1">
      {/* Horizontal Badges Controls Bar in Overview Badge Style */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Master Protection Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              metrics.switches.protection || 'switch.adguard_protection',
              metrics.protectionEnabled
            )
          }
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-sm ${
            metrics.protectionEnabled
              ? darkMode
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-emerald-50 border-emerald-400 text-emerald-800'
              : darkMode
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-rose-50 border-rose-300 text-rose-700'
          }`}
        >
          <ShieldCheck size={16} weight={metrics.protectionEnabled ? 'fill' : 'regular'} />
          <span>Master Protection</span>
          <span
            className={`w-2 h-2 rounded-full ${
              metrics.protectionEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
        </button>

        {/* DNS Filtering Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              metrics.switches.filtering || 'switch.adguard_filtering',
              metrics.filteringEnabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            metrics.filteringEnabled
              ? darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <Funnel size={14} weight={metrics.filteringEnabled ? 'fill' : 'regular'} />
          <span>DNS Filtering</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              metrics.filteringEnabled ? 'bg-emerald-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* Safe Browsing Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              metrics.switches.safeBrowsing || 'switch.adguard_safe_browsing',
              metrics.safeBrowsingEnabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            metrics.safeBrowsingEnabled
              ? darkMode
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-cyan-50 border-cyan-300 text-cyan-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <ShieldWarning size={14} weight={metrics.safeBrowsingEnabled ? 'fill' : 'regular'} />
          <span>Safe Browsing</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              metrics.safeBrowsingEnabled ? 'bg-cyan-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* Safe Search Enforcement Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              metrics.switches.safeSearch || 'switch.adguard_safe_search',
              metrics.safeSearchEnabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            metrics.safeSearchEnabled
              ? darkMode
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                : 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <MagnifyingGlass size={14} weight={metrics.safeSearchEnabled ? 'fill' : 'regular'} />
          <span>Safe Search</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              metrics.safeSearchEnabled ? 'bg-indigo-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* Parental Control Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              metrics.switches.parentalControl || 'switch.adguard_parental_control',
              metrics.parentalControlEnabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            metrics.parentalControlEnabled
              ? darkMode
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-purple-50 border-purple-300 text-purple-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <UsersThree size={14} weight={metrics.parentalControlEnabled ? 'fill' : 'regular'} />
          <span>Parental Control</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              metrics.parentalControlEnabled ? 'bg-purple-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* Query Log Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              metrics.switches.queryLog || 'switch.adguard_query_log',
              metrics.queryLogEnabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            metrics.queryLogEnabled
              ? darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-amber-50 border-amber-300 text-amber-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <ListBullets size={14} weight={metrics.queryLogEnabled ? 'fill' : 'regular'} />
          <span>Query Logging</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              metrics.queryLogEnabled ? 'bg-amber-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
