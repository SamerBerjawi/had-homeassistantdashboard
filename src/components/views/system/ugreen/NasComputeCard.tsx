/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Fan,
  HardDrives,
  Lightbulb,
  SpeakerHigh,
  Thermometer,
  Power,
  ArrowsCounterClockwise,
  X,
  Warning
} from '@phosphor-icons/react';
import { Gauge } from '../../../charts/gauge';
import { UgreenNasMetrics } from '../../../../types/ugreenNas';

interface NasComputeCardProps {
  metrics: UgreenNasMetrics;
  onToggleSwitch: (entityId: string, currentState: boolean) => void;
  onPressButton: (entityId: string) => void;
  onSetFanMode: (mode: string) => void;
  darkMode?: boolean;
}

export const NasComputeCard: React.FC<NasComputeCardProps> = ({
  metrics,
  onToggleSwitch,
  onPressButton,
  onSetFanMode,
  darkMode = true
}) => {
  const [powerModal, setPowerModal] = useState<'restart' | 'shutdown' | null>(null);

  // Colors
  const cpuColor = metrics.cpuUsage > 80 ? '#F43F5E' : metrics.cpuUsage > 60 ? '#F59E0B' : '#06B6D4';
  const memColor = metrics.memoryUsagePercent > 80 ? '#F43F5E' : metrics.memoryUsagePercent > 60 ? '#F59E0B' : '#8B5CF6';

  const cardBaseStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-black/35 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between';

  return (
    <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6 ${cardBaseStyle}`}>
      {/* 1. Header with Model, OS, and Uptime */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shadow-inner shrink-0">
            <HardDrives size={16} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                {metrics.modelName}
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {metrics.ugosVersion}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
              Up: <span className="font-semibold text-slate-700 dark:text-slate-200">{metrics.uptime}</span>
            </p>
          </div>
        </div>

        {/* Power Menu Trigger */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPowerModal('restart')}
            title="Restart NAS"
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            <ArrowsCounterClockwise size={15} />
          </button>
          <button
            type="button"
            onClick={() => setPowerModal('shutdown')}
            title="Shutdown NAS"
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <Power size={15} />
          </button>
        </div>
      </div>

      {/* 2. Gauges Grid: CPU, Memory, Fan RPM */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 my-3">
        {/* CPU Gauge */}
        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5">
          <div className="w-full max-w-[110px] sm:max-w-[125px] flex items-center justify-center">
            <Gauge
              value={metrics.cpuUsage}
              activeFill={cpuColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              suffix="%"
              defaultLabel="CPU"
              notchCornerRadius={2}
              orientation="arc"
              className="w-full"
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">
            {metrics.cpuTemp.toFixed(0)}°C Temp
          </span>
        </div>

        {/* RAM Gauge */}
        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5">
          <div className="w-full max-w-[110px] sm:max-w-[125px] flex items-center justify-center">
            <Gauge
              value={metrics.memoryUsagePercent}
              activeFill={memColor}
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              suffix="%"
              defaultLabel="RAM"
              notchCornerRadius={2}
              orientation="arc"
              className="w-full"
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">
            {metrics.memoryUsedGB.toFixed(1)} / {metrics.memoryTotalGB} GB
          </span>
        </div>

        {/* Fan RPM & Mode */}
        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-500/5 border border-slate-200/40 dark:border-white/5">
          <div className="w-full max-w-[110px] sm:max-w-[125px] flex items-center justify-center">
            <Gauge
              value={Math.min(100, (metrics.fanSpeedRpm || 850) / 20)}
              activeFill="#10B981"
              inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              suffix=" RPM"
              defaultLabel="FAN"
              notchCornerRadius={2}
              orientation="arc"
              className="w-full"
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 mt-1">
            {metrics.fanSpeedRpm || 850} RPM
          </span>
        </div>
      </div>

      {/* 3. Fan Profile Selector + Thermals + Hardware Switches */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        {/* Fan Profile Selector */}
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Fan size={13} weight="duotone" className="animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/10">
            {(['Standard', 'Quiet', 'Full Speed'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSetFanMode(mode)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  metrics.fanMode === mode
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Thermals Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
            <Thermometer size={12} className="text-amber-400" />
            <span className="text-slate-500 dark:text-slate-400">MB:</span>
            <span className="font-mono text-slate-900 dark:text-white">{metrics.systemTemp}°C</span>
          </div>

          {/* Quick Hardware Toggles */}
          <button
            type="button"
            onClick={() =>
              metrics.controls.ledSwitchEntityId &&
              onToggleSwitch(metrics.controls.ledSwitchEntityId, !!metrics.controls.ledState)
            }
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-xl border transition-all cursor-pointer ${
              metrics.controls.ledState
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Front LED Indicator Toggle"
          >
            <Lightbulb size={12} weight={metrics.controls.ledState ? 'fill' : 'regular'} />
            <span>LED</span>
          </button>

          <button
            type="button"
            onClick={() =>
              metrics.controls.buzzerSwitchEntityId &&
              onToggleSwitch(metrics.controls.buzzerSwitchEntityId, !!metrics.controls.buzzerState)
            }
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-xl border transition-all cursor-pointer ${
              metrics.controls.buzzerState
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Alert Buzzer Toggle"
          >
            <SpeakerHigh size={12} weight={metrics.controls.buzzerState ? 'fill' : 'regular'} />
            <span>Buzzer</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Restart/Shutdown */}
      {powerModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-white/20 p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Warning size={16} />
                <span>Confirm {powerModal === 'restart' ? 'Restart' : 'Shutdown'}</span>
              </div>
              <button
                type="button"
                onClick={() => setPowerModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to {powerModal === 'restart' ? 'restart' : 'shut down'} your UGREEN NAS? Ongoing backups and network file shares will be interrupted.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPowerModal(null)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id =
                    powerModal === 'restart'
                      ? metrics.controls.restartButtonId || 'button.ugreen_nas_restart'
                      : metrics.controls.shutdownButtonId || 'button.ugreen_nas_shutdown';
                  onPressButton(id);
                  setPowerModal(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Confirm {powerModal === 'restart' ? 'Restart' : 'Shutdown'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
