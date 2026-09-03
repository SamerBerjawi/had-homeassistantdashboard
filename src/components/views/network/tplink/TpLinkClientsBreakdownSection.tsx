/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  UsersThree,
  WifiHigh,
  DeviceMobile,
  HardDrives,
  UserSwitch
} from '@phosphor-icons/react';
import { TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkClientsBreakdownSectionProps {
  metrics: TpLinkRouterMetrics;
  darkMode?: boolean;
}

export const TpLinkClientsBreakdownSection: React.FC<TpLinkClientsBreakdownSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-3xl backdrop-blur-2xl transition-all p-5 sm:p-6 ' +
    (darkMode
      ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80');

  const mainWifiCount = metrics.mainWifiClientsCount;
  const guestWifiCount = metrics.guestClientsCount;
  const iotCount = metrics.iotClientsCount;
  const wiredCount = metrics.wiredClientsCount;
  const totalCount = metrics.connectedClientsCount || (mainWifiCount + guestWifiCount + iotCount + wiredCount);

  const categories = useMemo(() => {
    return [
      {
        id: 'main',
        label: 'Main Wi-Fi',
        value: mainWifiCount,
        color: '#10B981',
        bgLight: 'bg-emerald-500/10',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        icon: WifiHigh,
        desc: 'Primary 2.4/5/6G'
      },
      {
        id: 'guest',
        label: 'Guest Wi-Fi',
        value: guestWifiCount,
        color: '#F59E0B',
        bgLight: 'bg-amber-500/10',
        textColor: 'text-amber-700 dark:text-amber-400',
        icon: UserSwitch,
        desc: 'Isolated Guests'
      },
      {
        id: 'iot',
        label: 'IoT Network',
        value: iotCount,
        color: '#8B5CF6',
        bgLight: 'bg-purple-500/10',
        textColor: 'text-purple-700 dark:text-purple-400',
        icon: DeviceMobile,
        desc: 'Smart Home Devices'
      },
      {
        id: 'wired',
        label: 'Wired LAN',
        value: wiredCount,
        color: '#06B6D4',
        bgLight: 'bg-cyan-500/10',
        textColor: 'text-cyan-700 dark:text-cyan-400',
        icon: HardDrives,
        desc: 'Ethernet Ports'
      }
    ];
  }, [mainWifiCount, guestWifiCount, iotCount, wiredCount]);

  return (
    <div className={`${cardStyle} space-y-3.5`}>
      {/* Clean Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersThree size={18} weight="duotone" className="text-purple-500 dark:text-purple-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Client Distribution
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
            {totalCount} Active Devices
          </span>
        </div>
      </div>

      {/* Proportional Segmented Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-900/[0.05] dark:bg-white/[0.08] flex">
          {totalCount > 0 ? (
            categories.map((cat) => {
              const widthPct = (cat.value / totalCount) * 100;
              if (widthPct === 0) return null;
              return (
                <div
                  key={cat.id}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: cat.color
                  }}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  title={`${cat.label}: ${cat.value} (${widthPct.toFixed(0)}%)`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-slate-300 dark:bg-slate-700 rounded-full" />
          )}
        </div>
      </div>

      {/* 4 High-Density Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const percent = totalCount > 0 ? ((cat.value / totalCount) * 100).toFixed(0) : '0';

          return (
            <div
              key={cat.id}
              className={`p-3 rounded-xl ${cat.bgLight} flex flex-col justify-between transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} style={{ color: cat.color }} weight="duotone" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {cat.label}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold ${cat.textColor}`}>
                  {percent}%
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {cat.value}
                </span>
                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                  {cat.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
