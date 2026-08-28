/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  WifiHigh,
  UserSwitch,
  DeviceMobile,
  Broadcast,
  Radio,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkWifiControlsSectionProps {
  metrics: TpLinkRouterMetrics;
  onToggleSwitch: (entityId: string, currentState: boolean) => Promise<void>;
  darkMode?: boolean;
}

export const TpLinkWifiControlsSection: React.FC<TpLinkWifiControlsSectionProps> = ({
  metrics,
  onToggleSwitch,
  darkMode = true
}) => {
  const cardStyle =
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const { wifiSwitches } = metrics;

  // Groups configuration
  const networkGroups = [
    {
      id: 'main',
      title: 'Main Network',
      subtitle: 'Primary high-speed home network',
      icon: WifiHigh,
      accentColor: '#10B981', // Emerald
      activeGlow: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/20',
      bands: [
        {
          band: '2.4G',
          freq: '2.4 GHz (802.11ax)',
          switchItem: wifiSwitches.host24Ghz,
          defaultSsid: 'Antigravity-Home'
        },
        {
          band: '5G',
          freq: '5.0 GHz (802.11ax)',
          switchItem: wifiSwitches.host5Ghz,
          defaultSsid: 'Antigravity-Home 5G'
        },
        {
          band: '6G',
          freq: '6.0 GHz (Wi-Fi 6E)',
          switchItem: wifiSwitches.host6Ghz,
          defaultSsid: 'Antigravity-Ultra-6E'
        }
      ]
    },
    {
      id: 'guest',
      title: 'Guest Network',
      subtitle: 'Isolated visitor access subnet',
      icon: UserSwitch,
      accentColor: '#F59E0B', // Amber
      activeGlow: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/20',
      bands: [
        {
          band: '2.4G',
          freq: '2.4 GHz Guest',
          switchItem: wifiSwitches.guest24Ghz,
          defaultSsid: 'Antigravity-Guest'
        },
        {
          band: '5G',
          freq: '5.0 GHz Guest',
          switchItem: wifiSwitches.guest5Ghz,
          defaultSsid: 'Antigravity-Guest-5G'
        },
        {
          band: '6G',
          freq: '6.0 GHz Guest',
          switchItem: wifiSwitches.guest6Ghz,
          defaultSsid: 'Antigravity-Guest-6E'
        }
      ]
    },
    {
      id: 'iot',
      title: 'IoT Network',
      subtitle: 'Dedicated smart device 2.4/5G band',
      icon: DeviceMobile,
      accentColor: '#8B5CF6', // Purple
      activeGlow: 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]',
      badgeBg: 'bg-purple-500/15',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/20',
      bands: [
        {
          band: '2.4G',
          freq: '2.4 GHz IoT (20 MHz)',
          switchItem: wifiSwitches.iot24Ghz,
          defaultSsid: 'Antigravity-IoT'
        },
        {
          band: '5G',
          freq: '5.0 GHz IoT',
          switchItem: wifiSwitches.iot5Ghz,
          defaultSsid: 'Antigravity-IoT-5G'
        },
        {
          band: '6G',
          freq: '6.0 GHz IoT',
          switchItem: wifiSwitches.iot6Ghz,
          defaultSsid: 'Antigravity-IoT-6E'
        }
      ]
    }
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Broadcast size={18} weight="duotone" className="text-cyan-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Wi-Fi Radio Controls
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
            Section 4
          </span>
        </div>

        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          Independent 2.4 / 5 / 6 GHz Radio Toggles
        </div>
      </div>

      {/* 3 Column Grid for Main, Guest, IoT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {networkGroups.map((group) => {
          const GroupIcon = group.icon;
          const activeCount = group.bands.filter((b) => b.switchItem?.enabled).length;

          return (
            <div key={group.id} className={`${cardStyle} flex flex-col justify-between`}>
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{
                      backgroundColor: `${group.accentColor}1A`,
                      color: group.accentColor
                    }}
                  >
                    <GroupIcon size={18} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {group.title}
                    </h3>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">
                      {group.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border ${group.badgeBg} ${group.badgeText} ${group.badgeBorder}`}
                >
                  {activeCount}/3 Active
                </span>
              </div>

              {/* Band Rows (2.4G, 5G, 6G) */}
              <div className="space-y-2.5 py-3 my-auto">
                {group.bands.map((bandItem) => {
                  const isEnabled = bandItem.switchItem?.enabled ?? false;
                  const ssid = bandItem.switchItem?.ssid || bandItem.defaultSsid;
                  const entityId = bandItem.switchItem?.entityId;

                  return (
                    <div
                      key={bandItem.band}
                      className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-between gap-3 ${
                        isEnabled
                          ? group.activeGlow
                          : 'bg-white/[0.02] border-white/5 opacity-60 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black font-mono transition-colors ${
                            isEnabled
                              ? 'bg-white/10 dark:bg-white/10 text-white'
                              : 'bg-slate-200/60 dark:bg-white/5 text-slate-400'
                          }`}
                          style={
                            isEnabled
                              ? {
                                  backgroundColor: `${group.accentColor}25`,
                                  color: group.accentColor
                                }
                              : undefined
                          }
                        >
                          {bandItem.band}
                        </div>

                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {bandItem.band} Radio
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
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {ssid}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => {
                          if (entityId) {
                            onToggleSwitch(entityId, isEnabled);
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled
                            ? ''
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={isEnabled ? { backgroundColor: group.accentColor } : undefined}
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

              {/* Column Footer */}
              <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Radio size={12} style={{ color: group.accentColor }} />
                  <span>Band Steering &amp; DFS</span>
                </span>
                <span className="font-mono">{group.bands.length} Radios</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
