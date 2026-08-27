/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HardDrives,
  Broadcast,
  Code,
  Eye
} from '@phosphor-icons/react';
import { BentoGrid } from '../../ui/bento-grid';
import { GenericHostMonitorView } from './GenericHostMonitorView';
import { SystemHostMetrics, SystemTimeseriesPoint, HistoryTimeRange } from '../../../hooks/useSystemMetrics';

interface UgreenNasTabProps {
  darkMode?: boolean;
}

// Simulated NAS Metrics (4-Bay RAID5 Storage Pool, 16GB RAM, Intel N100)
const SIMULATED_NAS_METRICS: SystemHostMetrics = {
  cpuUsage: 18.5,
  cpuTemp: 52.0,
  load1m: 0.45,
  load5m: 0.62,
  load15m: 0.58,
  memoryUsagePercent: 34.2,
  memoryUsedMiB: 5600.0,
  memoryFreeMiB: 10784.0,
  diskUsagePercent: 62.8,
  diskUsedGiB: 7536.0,
  diskFreeGiB: 4464.0,
  ipv4Address: '192.168.68.80',
  networkInMiB: 98450.0,
  networkOutMiB: 245300.0,
  packetsIn: 148200000,
  packetsOut: 312000000,
  uptime: '4 weeks, 2 days'
};

const SIMULATED_NAS_HISTORY: SystemTimeseriesPoint[] = Array.from({ length: 24 }).map((_, i) => {
  const date = new Date(Date.now() - (23 - i) * 3600 * 1000);
  const wave = Math.sin((i / 24) * Math.PI * 4);
  return {
    date,
    cpuUsage: Math.max(8, Math.min(65, Math.round((18 + wave * 12 + Math.random() * 5) * 10) / 10)),
    cpuTemp: Math.max(45, Math.min(65, Math.round((52 + wave * 3 + Math.random() * 2) * 10) / 10)),
    memoryUsage: Math.max(30, Math.min(42, Math.round((34 + wave * 1.5) * 10) / 10)),
    diskUsage: Math.max(60, Math.min(65, Math.round((62.8 + (i * 0.02)) * 10) / 10)),
    networkInRate: Math.max(0.5, Math.round((4.2 + wave * 3.5 + Math.random() * 1.5) * 100) / 100),
    networkOutRate: Math.max(1.0, Math.round((12.5 + wave * 8.0 + Math.random() * 2.0) * 100) / 100)
  };
});

export function UgreenNasTab({ darkMode = true }: UgreenNasTabProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [timeRange, setTimeRange] = useState<HistoryTimeRange>('24h');

  if (showPreview) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
          darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Eye size={18} weight="duotone" className="text-amber-500" />
            <span>Interactive Simulated Telemetry Preview for Ugreen NAS (RAID 5 Pool / 12TB)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-all cursor-pointer"
          >
            Back to Configuration Guide
          </button>
        </div>

        <GenericHostMonitorView
          title="UGreen DXP4800 Plus NAS"
          subtitle="UGOS Pro / 4-Bay Btrfs RAID-5 Storage Pool & Container Host"
          badgeText="SNMP / API Mock"
          icon={<HardDrives size={26} weight="duotone" className="text-amber-400" />}
          metrics={SIMULATED_NAS_METRICS}
          historyData={SIMULATED_NAS_HISTORY}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onRefresh={() => {}}
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <BentoGrid className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 sm:gap-4.5 auto-rows-auto">
      {/* Main Placeholder Card */}
      <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 p-8 sm:p-12 rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
        darkMode
          ? 'bg-black/60 border-white/10 text-white shadow-2xl'
          : 'bg-white/80 border-slate-200/90 text-slate-900 shadow-lg'
      }`}>
        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-4">
          <HardDrives size={34} weight="duotone" />
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-3">
          Integration Ready
        </span>

        <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
          UGreen NAS Integration coming soon
        </h3>
        <p className="text-xs sm:text-sm max-w-lg mb-8 leading-relaxed text-slate-400">
          Waiting for SNMP or UGOS REST API connection. Once connected, your storage pools, NVMe caching status, and 2.5GbE/10GbE network telemetry will render in real-time.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Eye size={16} weight="bold" />
            Preview NAS Dashboard Layout
          </button>
        </div>
      </div>

      {/* Integration Option 1: SNMP Sensor */}
      <div className={`col-span-4 sm:col-span-6 md:col-span-4 lg:col-span-6 p-6 rounded-3xl border backdrop-blur-xl transition-all ${
        darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white/70 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <Broadcast size={20} weight="duotone" />
          </div>
          <div>
            <h4 className="text-sm font-black">Method 1: SNMP v2c / v3 Polling</h4>
            <p className="text-[11px] text-slate-400">Standard Linux / Synology MIB OIDs</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Enable SNMP in UGOS Pro Settings &rarr; Terminal & SNMP. Add sensors to your <code className="text-cyan-400">configuration.yaml</code>:
        </p>
        <pre className="p-3 rounded-2xl bg-black/80 border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`sensor:
  - platform: snmp
    host: 192.168.68.80
    baseoid: 1.3.6.1.4.1.2021.11.11.0
    name: "UGreen NAS CPU Idle"
  - platform: snmp
    host: 192.168.68.80
    baseoid: 1.3.6.1.4.1.2021.4.6.0
    name: "UGreen NAS RAM Free"`}
        </pre>
      </div>

      {/* Integration Option 2: REST API / Docker */}
      <div className={`col-span-4 sm:col-span-6 md:col-span-4 lg:col-span-6 p-6 rounded-3xl border backdrop-blur-xl transition-all ${
        darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white/70 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <Code size={20} weight="duotone" />
          </div>
          <div>
            <h4 className="text-sm font-black">Method 2: UGOS API / Glances Exporter</h4>
            <p className="text-[11px] text-slate-400">REST API with automatic disk breakdown</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Run Glances or Node-Exporter container on UGreen Docker to automatically expose all disk pools and SMART health:
        </p>
        <pre className="p-3 rounded-2xl bg-black/80 border border-white/10 text-[11px] font-mono text-purple-300 overflow-x-auto">
{`# Docker run command on UGreen NAS:
docker run -d --restart="always" \\
  -p 61208-61209:61208-61209 \\
  -e GLANCES_OPT="-w" \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  --pid host nicolargo/glances:latest`}
        </pre>
      </div>
    </BentoGrid>
  );
}
