/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldWarning,
  Bug,
  UsersThree,
  MagnifyingGlass,
  CheckCircle,
  LockKey
} from '@phosphor-icons/react';
import { intFmt } from '../../../charts/chart-formatters';

interface ThreatEnforcementCardProps {
  safeBrowsingBlockedCount: number;
  parentalBlockedCount: number;
  safeSearchEnabled: boolean;
  darkMode?: boolean;
}

export const ThreatEnforcementCard: React.FC<ThreatEnforcementCardProps> = ({
  safeBrowsingBlockedCount,
  parentalBlockedCount,
  safeSearchEnabled,
  darkMode = true
}) => {
  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[220px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 ${cardBaseStyle}`}>
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldWarning size={20} weight="duotone" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight block">
              Threat Intelligence & Content Enforcement
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Malicious endpoints blocked and safety compliance
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
          Zero-Trust Inspection
        </span>
      </div>

      {/* 2. Security Threat Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        {/* Malware & Phishing */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Bug size={18} weight="duotone" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Malware / Phishing</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Security Blacklists</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black font-mono text-rose-400 block leading-none">
              {intFmt(safeBrowsingBlockedCount)}
            </span>
            <span className="text-[9px] text-slate-400">Blocked</span>
          </div>
        </div>

        {/* Parental Triggers */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <UsersThree size={18} weight="duotone" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Adult Content</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Parental Control</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black font-mono text-amber-400 block leading-none">
              {intFmt(parentalBlockedCount)}
            </span>
            <span className="text-[9px] text-slate-400">Stopped</span>
          </div>
        </div>

        {/* Safe Search Enforcement */}
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <MagnifyingGlass size={18} weight="duotone" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Safe Search</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Google/Bing/DuckDuckGo</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {safeSearchEnabled ? 'Enforced' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <CheckCircle size={12} className="text-emerald-400" />
          <span>Local DNS Cache: <strong>Active (Zero-Leakage)</strong></span>
        </span>
        <span className="flex items-center gap-1 font-mono text-indigo-400 font-bold">
          <LockKey size={12} />
          <span>DNSSEC Validation Enabled</span>
        </span>
      </div>
    </div>
  );
};
