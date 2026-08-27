/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Lightbulb,
  SpeakerHigh,
  Fan,
  Thermometer,
  Power,
  ArrowsCounterClockwise,
  X,
  Warning,
  HardDrives
} from '@phosphor-icons/react';
import { UgreenNasMetrics } from '../../../../types/ugreenNas';

interface NasControlsCardProps {
  metrics: UgreenNasMetrics;
  onToggleSwitch: (entityId: string, currentState: boolean) => void;
  onPressButton: (entityId: string) => void;
  onSetFanMode: (mode: string) => void;
  darkMode?: boolean;
}

export const NasControlsCard: React.FC<NasControlsCardProps> = ({
  metrics,
  onToggleSwitch,
  onPressButton,
  onSetFanMode,
  darkMode = true
}) => {
  const [powerModal, setPowerModal] = useState<'restart' | 'shutdown' | null>(null);

  const cardBaseStyle = `rounded-3xl p-3.5 sm:p-4 md:p-5 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[220px] sm:min-h-[250px] ${
    darkMode
      ? 'bg-black/60 border-white/10 text-white shadow-xl hover:border-white/20'
      : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-md hover:border-slate-300'
  }`;

  return (
    <div className={`col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-3 ${cardBaseStyle}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal size={16} weight="duotone" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block leading-tight">
              Hardware Controls
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">{metrics.modelName}</span>
          </div>
        </div>

        {/* System Uptime Badge */}
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
          {metrics.ugosVersion}
        </span>
      </div>

      {/* Control Buttons in Overview Badge Style */}
      <div className="flex flex-col gap-2 my-auto py-1">
        {/* Row 1: Front LED & Buzzer Toggles */}
        <div className="grid grid-cols-2 gap-2">
          {/* LED Button */}
          <button
            type="button"
            onClick={() =>
              metrics.controls.ledSwitchEntityId &&
              onToggleSwitch(metrics.controls.ledSwitchEntityId, !!metrics.controls.ledState)
            }
            className={`flex items-center justify-between px-2.5 py-2 rounded-2xl border transition-all cursor-pointer shadow-sm ${
              metrics.controls.ledState
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Lightbulb size={15} weight={metrics.controls.ledState ? 'fill' : 'regular'} className="shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold truncate">Front LED</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                metrics.controls.ledState ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-400 opacity-40'
              }`}
            />
          </button>

          {/* Buzzer Button */}
          <button
            type="button"
            onClick={() =>
              metrics.controls.buzzerSwitchEntityId &&
              onToggleSwitch(metrics.controls.buzzerSwitchEntityId, !!metrics.controls.buzzerState)
            }
            className={`flex items-center justify-between px-2.5 py-2 rounded-2xl border transition-all cursor-pointer shadow-sm ${
              metrics.controls.buzzerState
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 dark:text-rose-300'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <SpeakerHigh size={15} weight={metrics.controls.buzzerState ? 'fill' : 'regular'} className="shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold truncate">Buzzer</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                metrics.controls.buzzerState ? 'bg-rose-400 shadow-sm shadow-rose-400' : 'bg-slate-400 opacity-40'
              }`}
            />
          </button>
        </div>

        {/* Row 2: Fan Profile Segmented Switcher */}
        <div className="flex items-center justify-between gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-1 pl-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <Fan size={12} weight="duotone" className="shrink-0" />
            <span className="hidden sm:inline">Profile</span>
          </div>
          <div className="flex items-center gap-1">
            {(['Standard', 'Quiet', 'Full Speed'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSetFanMode(mode)}
                className={`text-[9px] font-bold px-2 py-1 rounded-xl transition-all cursor-pointer ${
                  metrics.fanMode === mode
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'Full Speed' ? 'Full' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Power Operations Badges */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPowerModal('restart')}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-bold transition-all cursor-pointer"
          >
            <ArrowsCounterClockwise size={13} />
            <span>Restart</span>
          </button>

          <button
            type="button"
            onClick={() => setPowerModal('shutdown')}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold transition-all cursor-pointer"
          >
            <Power size={13} />
            <span>Shutdown</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Thermometer size={12} className="text-amber-400" />
          <span>MB: <strong className="text-slate-700 dark:text-slate-200">{metrics.systemTemp}°C</strong></span>
        </span>
        <span>Up: <strong className="text-slate-700 dark:text-slate-200">{metrics.uptime}</strong></span>
      </div>

      {/* Confirmation Modal for Restart/Shutdown */}
      {powerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-white/20 p-4 sm:p-5 shadow-2xl">
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
              Are you sure you want to {powerModal === 'restart' ? 'restart' : 'shut down'} your UGREEN NAS? File sharing and ongoing sync tasks will be interrupted.
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
