/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Car, BatteryCharging, NavigationArrow } from '@phosphor-icons/react';

export type MobilityTabId = 'overview' | 'charging' | 'telemetry';

interface MobilityTabBarProps {
  activeTab: MobilityTabId;
  onChangeTab: (tab: MobilityTabId) => void;
  socPercent?: number;
  isCharging?: boolean;
  darkMode?: boolean;
}

export function MobilityTabBar({
  activeTab,
  onChangeTab,
  socPercent,
  isCharging = false,
  darkMode = true
}: MobilityTabBarProps) {
  const tabs = [
    {
      id: 'overview' as const,
      label: 'Vehicle Status',
      icon: Car,
      badge: null
    },
    {
      id: 'charging' as const,
      label: 'Energy & Charge',
      icon: BatteryCharging,
      badge: socPercent !== undefined ? `${Math.round(socPercent)}%` : null,
      badgeHighlight: isCharging
    },
    {
      id: 'telemetry' as const,
      label: 'Location & Telemetry',
      icon: NavigationArrow,
      badge: null
    }
  ];

  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-6 z-40 lg:hidden pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
      <nav
        aria-label="Vehicle Dashboard Navigation"
        className={`pointer-events-auto flex items-center justify-between gap-1 p-1.5 rounded-full shadow-2xl backdrop-blur-2xl max-w-sm w-full transition-all ${
          darkMode
            ? 'bg-slate-950/90 text-white shadow-black/70'
            : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-300/70'
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex-1 py-2 px-3 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none ${
                isActive
                  ? darkMode
                    ? 'text-white'
                    : 'text-slate-900'
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobilityActiveTabPill"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className={`absolute inset-0 rounded-full ${
                    darkMode
                      ? 'bg-white/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                      : 'bg-slate-900/10 shadow-inner'
                  }`}
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'duotone'}
                  className={`transition-transform duration-200 ${
                    isActive
                      ? darkMode
                        ? 'scale-110 text-cyan-400'
                        : 'scale-110 text-cyan-700'
                      : ''
                  }`}
                />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[9px] font-bold px-1 rounded-full font-mono shadow-xs ${
                      tab.badgeHighlight
                        ? 'bg-emerald-500 text-slate-950 animate-pulse'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="relative text-[10px] font-bold tracking-tight truncate max-w-[90px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
