/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Network,
  DownloadSimple,
  UploadSimple,
  ArrowsClockwise,
  Check,
  Copy,
  Clock,
  CloudArrowUp
} from '@phosphor-icons/react';
import { LineChart } from '../../../charts/line-chart';
import { Line } from '../../../charts/line';
import { Grid } from '../../../charts/grid';
import { XAxis } from '../../../charts/x-axis';
import { YAxis } from '../../../charts/y-axis';
import { ChartTooltip } from '../../../charts/tooltip';
import { UgreenNasMetrics, NasTimeseriesPoint } from '../../../../types/ugreenNas';
import { HistoryTimeRange } from '../../../../hooks/useSystemMetrics';

interface NasNetworkTaskCardProps {
  metrics: UgreenNasMetrics;
  historyData: NasTimeseriesPoint[];
  timeRange: HistoryTimeRange;
  onTimeRangeChange: (range: HistoryTimeRange) => void;
  onRunBackup: (entityId?: string) => void;
  darkMode?: boolean;
}

export const NasNetworkTaskCard: React.FC<NasNetworkTaskCardProps> = ({
  metrics,
  historyData,
  timeRange,
  onTimeRangeChange,
  onRunBackup,
  darkMode = true
}) => {
  const [copiedIp, setCopiedIp] = useState<boolean>(false);
  const [backupTriggered, setBackupTriggered] = useState<boolean>(false);

  const ip = metrics.network.interfaces[0]?.ipAddress || '192.168.68.80';

  const handleCopyIp = () => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleStartBackup = () => {
    setBackupTriggered(true);
    onRunBackup(metrics.backup?.triggerButtonEntityId);
    setTimeout(() => setBackupTriggered(false), 3000);
  };

  const cardBaseStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-black/35 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between';

  return (
    <div className={`col-span-4 sm:col-span-6 md:col-span-4 lg:col-span-6 ${cardBaseStyle}`}>
      {/* 1. Header with Time Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
            <Network size={16} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                Throughput
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
              Bandwidth & Backup
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/10">
          {(['1h', '6h', '24h'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onTimeRangeChange(r)}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                timeRange === r
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Bklit Line Chart */}
      <div className="w-full h-[150px] sm:h-[165px] my-2">
        <LineChart
          data={historyData as unknown as Record<string, unknown>[]}
          xDataKey="date"
          margin={{ top: 10, right: 10, bottom: 20, left: 25 }}
          className="w-full h-full"
        >
          <Grid stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeDasharray="4,4" />
          <XAxis numTicks={3} />
          <YAxis numTicks={4} />
          <Line dataKey="downloadKBps" stroke="#10B981" strokeWidth={2} animate />
          <Line dataKey="uploadKBps" stroke="#6366F1" strokeWidth={1.5} animate />
          <ChartTooltip
            showDatePill
            showCrosshair
            showDots
            rows={(p) => [
              { label: 'Download', value: `${Number(p.downloadKBps || 0).toFixed(1)} MB/s`, color: '#10B981' },
              { label: 'Upload', value: `${Number(p.uploadKBps || 0).toFixed(1)} MB/s`, color: '#6366F1' }
            ]}
          />
        </LineChart>
      </div>

      {/* 3. Multi-NIC & Backup Control Bar */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* NIC Badges & IP Copy */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-700 dark:text-slate-200">LAN 1:</span>
            <span className="text-emerald-400">2.5 GbE</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="font-bold text-slate-700 dark:text-slate-200">LAN 2:</span>
            <span className="text-indigo-400">10 GbE</span>
          </div>

          <button
            type="button"
            onClick={handleCopyIp}
            title="Click to copy IP Address"
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-slate-300 hover:text-cyan-400 cursor-pointer"
          >
            {copiedIp ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{ip}</span>
          </button>
        </div>

        {/* Backup Task Trigger */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <Clock size={12} />
            <span>Last Sync: {metrics.backup?.lastBackupTime || 'Today, 03:00 AM'}</span>
          </div>

          <button
            type="button"
            onClick={handleStartBackup}
            disabled={backupTriggered}
            className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-md ${
              backupTriggered
                ? 'bg-emerald-500 border-emerald-400 text-white'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
            }`}
          >
            {backupTriggered ? (
              <>
                <ArrowsClockwise size={12} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <CloudArrowUp size={12} weight="bold" />
                <span>Run Backup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
