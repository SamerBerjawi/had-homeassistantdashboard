/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Devices,
  MagnifyingGlass,
  WarningCircle,
  CheckCircle,
  WifiHigh,
  HardDrives,
  DeviceMobile,
  Laptop,
  Television,
  Lightbulb,
  Car,
  Clock,
  Circle
} from '@phosphor-icons/react';
import { ConnectedClient, TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkConnectedClientsSectionProps {
  metrics: TpLinkRouterMetrics;
  darkMode?: boolean;
}

export const TpLinkConnectedClientsSection: React.FC<TpLinkConnectedClientsSectionProps> = ({
  metrics,
  darkMode = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const cardStyle =
    'rounded-2xl border backdrop-blur-md transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-5 ' +
    (darkMode
      ? 'bg-white/[0.04] dark:bg-slate-900/30 border-white/10'
      : 'bg-white/80 border-slate-200/80 shadow-slate-100');

  const clients = metrics.connectedClients || [];
  const expectedSum =
    metrics.mainWifiClientsCount +
    metrics.guestClientsCount +
    metrics.iotClientsCount +
    metrics.wiredClientsCount;

  const countMatches = clients.length === expectedSum;

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

  // Helper to pick device icon based on name/vendor
  const getDeviceIcon = (client: ConnectedClient) => {
    const n = client.name.toLowerCase();
    if (n.includes('macbook') || n.includes('laptop') || n.includes('pc') || n.includes('computer')) {
      return Laptop;
    }
    if (n.includes('apple tv') || n.includes('tv') || n.includes('roku') || n.includes('chromecast')) {
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

  // Helper to format connection type badge
  const renderConnTypeBadge = (type?: string) => {
    const t = (type || '2.4G').toUpperCase();
    if (t.includes('WIRE') || t.includes('LAN') || t.includes('ETH')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
          <HardDrives size={11} /> Wired LAN
        </span>
      );
    }
    if (t.includes('6G') || t.includes('6GHZ') || t.includes('6E')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <WifiHigh size={11} /> 6 GHz (6E)
        </span>
      );
    }
    if (t.includes('5G') || t.includes('5GHZ')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/20 flex items-center gap-1">
          <WifiHigh size={11} /> 5 GHz
        </span>
      );
    }
    if (t.includes('GUEST')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
          <WifiHigh size={11} /> Guest Wi-Fi
        </span>
      );
    }
    if (t.includes('IOT')) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center gap-1">
          <DeviceMobile size={11} /> IoT 2.4G
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20 flex items-center gap-1">
        <WifiHigh size={11} /> 2.4 GHz
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Devices size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Connected Clients
          </h2>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
            Section 5
          </span>

          {/* Connected Count Badge */}
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={12} weight="fill" />
            <span>{clients.length} Connected</span>
          </span>

          {/* Mismatch Flag warning */}
          {!countMatches && (
            <span
              title={`Discovered ${clients.length} trackers, but Section 3 sensors report ${expectedSum} total clients.`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 cursor-help"
            >
              <WarningCircle size={12} weight="bold" />
              <span>Count Mismatch ({clients.length} vs {expectedSum})</span>
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] max-w-xs">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search clients, IP, or band..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all ${
              darkMode
                ? 'bg-slate-800/80 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500/50'
                : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500/50'
            }`}
          />
        </div>
      </div>

      {/* Connected Clients Table / Card List */}
      <div className={cardStyle}>
        {filteredClients.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-400 mx-auto flex items-center justify-center">
              <Devices size={24} weight="duotone" />
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {searchQuery ? 'No connected clients match your search' : 'No clients currently connected'}
            </p>
            <p className="text-[10px] text-slate-400">
              {searchQuery
                ? 'Try searching with a different device name or IP address'
                : 'Any device authenticated to this router will automatically appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-2.5 font-bold">Device Name</th>
                  <th className="pb-2.5 font-bold">IP Address</th>
                  <th className="pb-2.5 font-bold">Connection Type</th>
                  <th className="pb-2.5 font-bold text-right">Status / Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-xs">
                {filteredClients.map((client) => {
                  const DeviceIcon = getDeviceIcon(client);

                  return (
                    <tr
                      key={client.entityId || client.name}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Device Name + Icon */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            <DeviceIcon size={16} weight="duotone" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {client.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {client.mac || client.entityId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {client.ip || (
                          <span className="text-slate-400 italic text-[11px]">DHCP Assigned</span>
                        )}
                      </td>

                      {/* Connection Type */}
                      <td className="py-3 px-3">
                        {renderConnTypeBadge(client.connectionType)}
                      </td>

                      {/* Status / Last Seen */}
                      <td className="py-3 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Circle size={8} weight="fill" className="text-emerald-400" />
                          <span className="font-bold text-emerald-400 text-xs">Online</span>
                        </div>
                        <div className="text-[9px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <Clock size={10} />
                          <span>{client.lastSeen || 'Active now'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
