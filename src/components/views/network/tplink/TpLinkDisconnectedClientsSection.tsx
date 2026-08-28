/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ClockCounterClockwise,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  Laptop,
  Television,
  Lightbulb,
  Car,
  DeviceMobile,
  HardDrives,
  Clock,
  CircleDashed,
  WifiSlash
} from '@phosphor-icons/react';
import { ConnectedClient, TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkDisconnectedClientsSectionProps {
  metrics: TpLinkRouterMetrics;
  darkMode?: boolean;
}

export const TpLinkDisconnectedClientsSection: React.FC<TpLinkDisconnectedClientsSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  // Collapsed by default as requested
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cardStyle =
    'rounded-2xl border backdrop-blur-xl transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const clients = metrics.disconnectedClients || [];

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ip && c.ip.toLowerCase().includes(q)) ||
        (c.mac && c.mac.toLowerCase().includes(q)) ||
        (c.connectionType && c.connectionType.toLowerCase().includes(q))
    );
  }, [clients, searchQuery]);

  const getDeviceIcon = (client: ConnectedClient) => {
    const n = client.name.toLowerCase();
    if (n.includes('macbook') || n.includes('laptop') || n.includes('pc') || n.includes('computer')) {
      return Laptop;
    }
    if (n.includes('apple tv') || n.includes('tv') || n.includes('roku') || n.includes('chromecast') || n.includes('nintendo') || n.includes('switch')) {
      return Television;
    }
    if (n.includes('lamp') || n.includes('light') || n.includes('plug') || n.includes('switch') || n.includes('thermostat')) {
      return Lightbulb;
    }
    if (n.includes('tesla') || n.includes('ev') || n.includes('charger') || n.includes('wall connector')) {
      return Car;
    }
    if (n.includes('nas') || n.includes('server') || n.includes('host') || n.includes('green')) {
      return HardDrives;
    }
    return DeviceMobile;
  };

  return (
    <div className="space-y-3">
      {/* Collapsible Header Accordion Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all"
      >
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={18} weight="duotone" className="text-slate-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Disconnected Clients
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-500/15 text-slate-400">
            Section 6
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
            {clients.length} Offline
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>{isExpanded ? 'Collapse List' : 'Expand Historical List'}</span>
          {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
        </div>
      </div>

      {/* Expanded Table Section */}
      {isExpanded && (
        <div className={cardStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Offline &amp; Historical DHCP Leases
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Registered device trackers currently in state <code>not_home</code>
              </p>
            </div>

            {/* Search filter */}
            <div className="relative min-w-[200px] max-w-xs">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search disconnected devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all ${
                  darkMode
                    ? 'bg-slate-800/80 border-white/10 text-white placeholder-slate-500 focus:border-slate-500/50'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-500/50'
                }`}
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-400 mx-auto flex items-center justify-center">
                <WifiSlash size={24} weight="duotone" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {searchQuery ? 'No offline devices match your search' : 'No disconnected clients found'}
              </p>
              <p className="text-[10px] text-slate-400">
                All registered network devices are currently connected and active.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 font-bold">Device Name</th>
                    <th className="pb-2.5 font-bold">Last Known IP</th>
                    <th className="pb-2.5 font-bold">Previous Network</th>
                    <th className="pb-2.5 font-bold text-right">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-xs">
                  {filteredClients.map((client) => {
                    const DeviceIcon = getDeviceIcon(client);

                    return (
                      <tr
                        key={client.entityId || client.name}
                        className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors opacity-75"
                      >
                        {/* Device Name + Icon */}
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
                              <DeviceIcon size={16} weight="duotone" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {client.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 truncate">
                                {client.mac || client.entityId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Last Known IP */}
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {client.ip || (
                            <span className="italic text-[11px]">Expired Lease</span>
                          )}
                        </td>

                        {/* Previous Connection */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/15">
                            {client.connectionType || 'Wi-Fi'}
                          </span>
                        </td>

                        {/* Prominent Last Seen */}
                        <td className="py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-mono font-bold text-slate-400 text-xs">
                            <Clock size={12} className="text-amber-400/80" />
                            <span>{client.lastSeen || 'Unknown'}</span>
                          </div>
                          <div className="text-[9px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                            <CircleDashed size={9} />
                            <span>Disconnected</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 mt-1 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span>Historical lease entries preserved from Home Assistant</span>
            <span className="font-mono">{filteredClients.length} Offline Devices</span>
          </div>
        </div>
      )}
    </div>
  );
};
