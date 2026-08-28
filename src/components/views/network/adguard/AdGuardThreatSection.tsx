/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LockKey,
  ShieldWarning,
  MagnifyingGlass,
  Target
} from '@phosphor-icons/react';
import { AdGuardMetrics } from '../../../../types/network';

interface AdGuardThreatSectionProps {
  metrics: AdGuardMetrics;
  darkMode?: boolean;
}

export const AdGuardThreatSection: React.FC<AdGuardThreatSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const threatCards = [
    {
      id: 'parental',
      title: 'Parental Control Blocks',
      subtitle: 'Adult domain & content restrictions',
      count: metrics.parentalBlockedCount,
      icon: LockKey,
      accentColor: '#F59E0B', // Amber
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/20',
      statLabel: 'Blocked Attempts',
      desc: 'Restricted domain requests dropped by family protection rules'
    },
    {
      id: 'safe_browsing',
      title: 'Safe Browsing Blocks',
      subtitle: 'Phishing, malware & scam sites',
      count: metrics.safeBrowsingBlockedCount,
      icon: ShieldWarning,
      accentColor: '#F43F5E', // Rose
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/20',
      statLabel: 'Malicious Drops',
      desc: 'Known malicious hosts neutralized in real-time before connecting'
    },
    {
      id: 'safe_search',
      title: 'Safe Searches Enforced',
      subtitle: 'Engine-level search sanitization',
      count: metrics.safeSearchesEnforcedCount,
      icon: MagnifyingGlass,
      accentColor: '#06B6D4', // Cyan
      badgeBg: 'bg-cyan-500/15',
      badgeText: 'text-cyan-400',
      badgeBorder: 'border-cyan-500/20',
      statLabel: 'Sanitized Queries',
      desc: 'Enforced strict content parameters across Google, Bing, DuckDuckGo & YouTube'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Target size={18} weight="duotone" className="text-amber-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Threat &amp; Enforcement Breakdown
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">
            Section 4
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Independent Policy Counter Metrics
        </div>
      </div>

      {/* 3 Dedicated Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {threatCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.id} className={`${cardStyle} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                      style={{
                        backgroundColor: `${card.accentColor}1A`,
                        color: card.accentColor
                      }}
                    >
                      <Icon size={20} weight="duotone" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        {card.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border ${card.badgeBg} ${card.badgeText} ${card.badgeBorder}`}
                  >
                    Active Policy
                  </span>
                </div>

                {/* Big Number Count */}
                <div className="py-4 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-3xl sm:text-4xl font-black font-mono tracking-tight"
                      style={{ color: card.accentColor }}
                    >
                      {card.count.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      {card.statLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                    {card.desc}
                  </p>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                <span>Cumulative Sensor Stream</span>
                <span className="font-mono" style={{ color: card.accentColor }}>
                  {card.count > 0 ? 'Threats Mitigated' : 'Zero Infractions'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
