/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Devices,
  MagnifyingGlass,
  WifiHigh,
  Network,
  Broadcast,
  ArrowDown,
  ArrowUp,
  Desktop,
  DeviceMobile,
  Television,
  Laptop
} from '@phosphor-icons/react';
import { ConnectedClient } from '../../../../types/network';

interface ConnectedClientsCardProps {
  clients: ConnectedClient[];
  totalClientsCount: number;
  wiredCount: number;
  wirelessCount: number;
  darkMode?: boolean;
}

type BandFilter = 'all' | '6ghz' | '5ghz' | '2.4ghz' | 'ethernet';

export const ConnectedClientsCard: React.FC<ConnectedClientsCardProps> = ({
  clients,
  totalClientsCount,
  wiredCount,
  wirelessCount,
  darkMode = true
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bandFilter, setBandFilter] = useState<BandFilter>('all');

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.ip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.mac.toLowerCase().includes(searchQuery.toLowerCase());

      const matchBand = bandFilter === 'all' || client.connectionType === bandFilter;
      return matchSearch && matchBand;
    });
  }, [clients, searchQuery, bandFilter]);

  const getDeviceIcon = (name: string, type: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('macbook') || lower.includes('laptop')) return <Laptop size={16} weight="duotone" />;
    if (lower.includes('ipad') || lower.includes('phone')) return <DeviceMobile size={16} weight="duotone" />;
    if (lower.includes('apple tv') || lower.includes('tv')) return <Television size={16} weight="duotone" />;
    if (type === 'ethernet') return <Network size={16} weight="duotone" />;
    return <Desktop size={16} weight="duotone" />;
  };

  const getBandBadge = (type: string) => {
    switch (type) {
      case '6ghz':
        return <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">6 GHz (6E)</span>;
      case '5ghz':
        return <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">5 GHz</span>;
      case '2.4ghz':
        return <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">2.4 GHz</span>;
      case 'ethernet':
        return <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">1 GbE LAN</span>;
      default:
        return null;
    }
  };

  const cardBaseStyle = `rounded-3xl p-4 sm:p-5 md:p-6 border backdrop-blur-md transition-all duration-300 flex flex-col justify-between min-h-[340px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 ${cardBaseStyle}`}>
      {/* 1. Header with Search and Band Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
            <Devices size={20} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                Connected Clients Matrix
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {totalClientsCount} Active ({wirelessCount} Wi-Fi, {wiredCount} LAN)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Real-time device tracking, band allocation, and bandwidth
            </p>
          </div>
        </div>

        {/* Search Bar & Band Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex items-center">
            <MagnifyingGlass size={13} className="absolute left-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search devices or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 w-36 sm:w-48 transition-all"
            />
          </div>

          {/* Band Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10">
            {(['all', '6ghz', '5ghz', '2.4ghz', 'ethernet'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBandFilter(b)}
                className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  bandFilter === b
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {b === 'all' ? 'All' : b === 'ethernet' ? 'LAN' : b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Client Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 my-3">
        {filteredClients.map((client) => (
          <div
            key={client.mac}
            className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 transition-all duration-200 flex flex-col justify-between gap-2"
          >
            {/* Top row: Icon + Name + Band */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                  {getDeviceIcon(client.name, client.connectionType)}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {client.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                    {client.ip || 'DHCP lease'}
                  </span>
                </div>
              </div>
              {getBandBadge(client.connectionType)}
            </div>

            {/* Bottom row: Speeds + Signal */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2 font-mono">
                {client.downloadSpeedKBps !== undefined && (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <ArrowDown size={10} /> {(client.downloadSpeedKBps / 1000).toFixed(1)}M
                  </span>
                )}
                {client.uploadSpeedKBps !== undefined && (
                  <span className="text-indigo-400 flex items-center gap-0.5">
                    <ArrowUp size={10} /> {(client.uploadSpeedKBps / 1000).toFixed(1)}M
                  </span>
                )}
              </div>

              {client.signalDbm !== undefined && client.signalDbm !== 0 && (
                <span className="text-slate-400 text-[9px] font-mono">
                  {client.signalDbm} dBm
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Footer */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>DHCP Subnet: <strong className="text-slate-700 dark:text-slate-200">192.168.68.0/24 (Lease: 24h)</strong></span>
        <span>Showing <strong>{filteredClients.length}</strong> of {clients.length} devices</span>
      </div>
    </div>
  );
};
