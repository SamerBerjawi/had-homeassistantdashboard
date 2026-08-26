/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Activity, 
  RefreshCw, 
  Power, 
  ShieldCheck, 
  Terminal, 
  Radio, 
  Database, 
  Download, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Workflow, 
  Wifi, 
  Clock, 
  Sliders, 
  Zap, 
  Archive, 
  FileText,
  Trash2
} from 'lucide-react';
import { LogMessage, HAEntity, Room } from '../types';

interface SystemViewProps {
  logs: LogMessage[];
  entities: HAEntity[];
  rooms: Room[];
  darkMode: boolean;
  onClearLogs: () => void;
  onRestartCore: () => void;
  onReloadYAML: () => void;
  onCreateBackup: () => void;
  setActiveTab: (tab: string) => void;
}

export default function SystemView({
  logs,
  entities,
  rooms,
  darkMode,
  onClearLogs,
  onRestartCore,
  onReloadYAML,
  onCreateBackup,
  setActiveTab
}: SystemViewProps) {
  const [activeLogLevel, setActiveLogLevel] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isRestarting, setIsRestarting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Hardware metrics
  const systemMetrics = {
    cpuLoad: 14,
    cpuTemp: 41.2,
    ramUsedGb: 2.8,
    ramTotalGb: 8.0,
    storageUsedGb: 124,
    storageTotalGb: 512,
    uptime: '18 days, 4 hours, 12 min',
    coreVersion: '2026.8.4',
    osVersion: 'Home Assistant OS 12.2',
    supervisorVersion: '2026.08.1',
    nodeName: 'hass.homz.internal',
    ipAddress: '192.168.1.180',
    pingMs: 1.8
  };

  // Connected integrations
  const integrations = [
    { id: 'zigbee', name: 'Zigbee2MQTT', status: 'Connected', devices: 32, coordinator: 'Texas Instruments CC2652P' },
    { id: 'zwave', name: 'Z-Wave JS UI', status: 'Connected', devices: 18, coordinator: 'Zooz 800 Series Gen7' },
    { id: 'matter', name: 'Matter / Thread Border Router', status: 'Active', devices: 14, coordinator: 'Silicon Labs OTBR' },
    { id: 'homekit', name: 'Apple HomeKit Bridge', status: 'Synced', devices: 42, coordinator: 'HAP-NodeJS v0.12' },
    { id: 'solaredge', name: 'SolarEdge Modbus TCP', status: 'Online', devices: 3, coordinator: 'TCP Port 502' },
    { id: 'hue', name: 'Philips Hue Bridge', status: 'Synced', devices: 22, coordinator: 'Hue Bridge v2' },
    { id: 'sonos', name: 'Sonos Sound Architecture', status: 'Connected', devices: 4, coordinator: 'Sonos S2 API' }
  ];

  const filteredLogs = logs.filter(l => {
    if (activeLogLevel === 'error' && l.type !== 'error') return false;
    if (activeLogLevel === 'warning' && l.type !== 'warning') return false;
    if (activeLogLevel === 'info' && l.type !== 'info' && l.type !== 'service_call') return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      return l.message.toLowerCase().includes(q) || (l.entity_id && l.entity_id.toLowerCase().includes(q));
    }
    return true;
  });

  const handleRestartClick = () => {
    setIsRestarting(true);
    onRestartCore();
    setTimeout(() => {
      setIsRestarting(false);
    }, 2500);
  };

  const handleReloadClick = () => {
    setIsReloading(true);
    onReloadYAML();
    setTimeout(() => {
      setIsReloading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              System Architecture & Core Node
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Healthy • Online
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Hardware resource monitoring, network integrations, backup manager, and audit logs
          </p>
        </div>

        {/* Server Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleReloadClick}
            disabled={isReloading}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
              isReloading
                ? 'bg-indigo-600 text-white'
                : darkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
            <span>Reload YAML</span>
          </button>

          <button
            onClick={onCreateBackup}
            className="px-3.5 py-2 rounded-2xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#7B61FF]/30 transition-all cursor-pointer"
          >
            <Archive size={14} />
            <span>Create Snapshot</span>
          </button>

          <button
            onClick={handleRestartClick}
            disabled={isRestarting}
            className="px-3.5 py-2 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Power size={14} className={isRestarting ? 'animate-spin' : ''} />
            <span>Restart Core</span>
          </button>
        </div>
      </div>

      {/* 1. HARDWARE PERFORMANCE TELEMETRY GAUGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Load */}
        <div className={`rounded-2xl p-5 border transition-all ${
          darkMode ? 'bg-slate-900/80 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-[#9D8BFF] flex items-center justify-center">
                <Cpu size={18} />
              </div>
              <span className="text-xs font-bold text-slate-400">CPU Compute</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{systemMetrics.cpuTemp}°C</span>
          </div>

          <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {systemMetrics.cpuLoad}%
          </p>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-[#7B61FF]" style={{ width: `${systemMetrics.cpuLoad}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-2">Quad Core ARMv8 Cortex-A76</span>
        </div>

        {/* RAM Usage */}
        <div className={`rounded-2xl p-5 border transition-all ${
          darkMode ? 'bg-slate-900/80 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <MemoryStick size={18} />
              </div>
              <span className="text-xs font-bold text-slate-400">RAM Memory</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">35%</span>
          </div>

          <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {systemMetrics.ramUsedGb} <span className="text-sm font-semibold text-slate-400">/ {systemMetrics.ramTotalGb} GB</span>
          </p>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-teal-400" style={{ width: '35%' }} />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-2">LPDDR4X Low-Power Shared</span>
        </div>

        {/* Storage */}
        <div className={`rounded-2xl p-5 border transition-all ${
          darkMode ? 'bg-slate-900/80 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <HardDrive size={18} />
              </div>
              <span className="text-xs font-bold text-slate-400">NVMe SSD</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">24%</span>
          </div>

          <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {systemMetrics.storageUsedGb} <span className="text-sm font-semibold text-slate-400">/ {systemMetrics.storageTotalGb} GB</span>
          </p>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width: '24%' }} />
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-2">388 GB Available Capacity</span>
        </div>

        {/* Uptime & Latency */}
        <div className={`rounded-2xl p-5 border transition-all ${
          darkMode ? 'bg-slate-900/80 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Wifi size={18} />
              </div>
              <span className="text-xs font-bold text-slate-400">Network Latency</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{systemMetrics.pingMs} ms</span>
          </div>

          <p className={`text-sm font-extrabold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {systemMetrics.nodeName}
          </p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{systemMetrics.ipAddress}</p>
          <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
            <Clock size={11} />
            <span>Up {systemMetrics.uptime}</span>
          </div>
        </div>
      </div>

      {/* 2. CONNECTED INTEGRATIONS & PROTOCOLS */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[#7B61FF]" />
            <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Hardware Integrations & Mesh Protocols
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">{integrations.length} Radios Connected</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {integrations.map(integ => (
            <div
              key={integ.id}
              className={`rounded-2xl p-4 border transition-all ${
                darkMode ? 'bg-slate-900/70 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className={`text-xs font-black leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {integ.name}
                </h4>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {integ.status}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-medium">{integ.coordinator}</p>

              <div className={`mt-3 pt-2 border-t text-[10px] text-slate-400 flex items-center justify-between ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <span>Synced Entities:</span>
                <strong className={darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'}>{integ.devices} Devices</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SYSTEM LOGS VIEWER & AUDIT TRAIL */}
      <div className={`rounded-3xl p-5 sm:p-6 border ${
        darkMode ? 'bg-slate-900/80 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#7B61FF]" />
            <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              System Telemetry & Event Stream ({filteredLogs.length})
            </h3>
          </div>

          {/* Log Filters & Clear */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'error', 'warning', 'info'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setActiveLogLevel(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                  activeLogLevel === lvl
                    ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                    : darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {lvl}
              </button>
            ))}

            <button
              onClick={onClearLogs}
              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Clear logs"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Logs Terminal Window */}
        <div className="h-64 overflow-y-auto touch-scroll-container rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No event logs matching active filters
            </div>
          ) : (
            filteredLogs.map(l => (
              <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 select-none shrink-0">{l.timestamp}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                  l.type === 'error' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : l.type === 'warning' 
                      ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                      : 'bg-indigo-950 text-indigo-300'
                }`}>
                  {l.type}
                </span>
                <span className="break-all">{l.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
