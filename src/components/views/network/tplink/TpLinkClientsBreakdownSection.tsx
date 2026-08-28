/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { PieChart } from '../../../charts/pie-chart';
import { PieSlice } from '../../../charts/pie-slice';
import { PieCenter } from '../../../charts/pie-center';
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
    'relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 ' +
    (darkMode
      ? 'bg-slate-900/60 border-white/10 backdrop-blur-md shadow-lg shadow-black/20'
      : 'bg-white/90 border-slate-200/80 backdrop-blur-md shadow-md shadow-slate-200/50');

  const mainWifiCount = metrics.mainWifiClientsCount;
  const guestWifiCount = metrics.guestClientsCount;
  const iotCount = metrics.iotClientsCount;
  const wiredCount = metrics.wiredClientsCount;
  const totalCount = metrics.connectedClientsCount || (mainWifiCount + guestWifiCount + iotCount + wiredCount);

  const pieData = useMemo(() => {
    return [
      {
        label: 'Main Wi-Fi',
        value: mainWifiCount,
        color: '#10B981',
        icon: WifiHigh,
        desc: 'Primary SSID clients'
      },
      {
        label: 'Guest Wi-Fi',
        value: guestWifiCount,
        color: '#F59E0B',
        icon: UserSwitch,
        desc: 'Isolated guest clients'
      },
      {
        label: 'IoT Network',
        value: iotCount,
        color: '#8B5CF6',
        icon: DeviceMobile,
        desc: 'Smart home & 2.4G sensors'
      },
      {
        label: 'Wired LAN',
        value: wiredCount,
        color: '#06B6D4',
        icon: HardDrives,
        desc: 'Direct Ethernet patch'
      }
    ];
  }, [mainWifiCount, guestWifiCount, iotCount, wiredCount]);

  const activeSlices = pieData.filter((d) => d.value > 0);
  const displayPieData = activeSlices.length > 0 ? pieData : [{ label: 'No Clients', value: 1, color: '#64748B', icon: WifiHigh, desc: 'Empty' }];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <UsersThree size={18} weight="duotone" className="text-purple-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Clients Breakdown
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400">
            Section 3
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-black text-purple-400">
            {totalCount} Total Devices
          </span>
        </div>
      </div>

      {/* Main Breakdown Card */}
      <div className={`${cardStyle} flex flex-col justify-between`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Client Distribution by Network Layer
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Live device categorization across Wi-Fi radios and Ethernet LAN ports
            </p>
          </div>
          <div className="text-right font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <span>{activeSlices.length} Active Segment{activeSlices.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Center: Pie Chart */}
        <div className="py-4 my-auto flex flex-col items-center justify-center">
          <div className="relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] flex items-center justify-center">
            <PieChart
              data={displayPieData}
              innerRadius={58}
              padAngle={0.04}
              cornerRadius={6}
              size={200}
              className="w-full h-full"
            >
              {displayPieData.map((_, i) => (
                <PieSlice key={i} index={i} />
              ))}
              <PieCenter
                defaultLabel="TOTAL"
                suffix=" Clients"
              >
                {({ isHovered, data }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      {isHovered ? data.label : 'TOTAL'}
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white leading-tight">
                      {isHovered ? data.value : totalCount}
                    </span>
                    <span className="text-[8px] font-bold text-purple-400">
                      Clients
                    </span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>
        </div>

        {/* Small Legend/Stat Row under the chart */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {pieData.map((item) => {
            const Icon = item.icon;
            const percent = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(0) : '0';
            return (
              <div
                key={item.label}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <Icon size={12} style={{ color: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{percent}%</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {item.value}
                  </span>
                  <span className="text-[9px] text-slate-400">{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
