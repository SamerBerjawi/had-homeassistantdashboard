/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Devices,
  Television,
  ChargingStation,
  ThermometerHot,
  CookingPot,
  Lightbulb,
  Plug,
  Cpu
} from '@phosphor-icons/react';
import { TransformedDevice } from '../../services/energyDataTransformer';

interface DevicesEnergyGraphCardProps {
  devices: TransformedDevice[];
  untrackedKwh: number;
  untrackedPercentage: number;
  totalHomeConsumption: number;
  darkMode?: boolean;
}

function getDeviceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('heat') || lower.includes('hvac') || lower.includes('climate') || lower.includes('pump')) {
    return <ThermometerHot size={18} className="text-rose-400" />;
  }
  if (lower.includes('ev') || lower.includes('charger') || lower.includes('wallbox') || lower.includes('car')) {
    return <ChargingStation size={18} className="text-emerald-400" />;
  }
  if (lower.includes('kitchen') || lower.includes('cook') || lower.includes('oven') || lower.includes('fridge')) {
    return <CookingPot size={18} className="text-amber-400" />;
  }
  if (lower.includes('light') || lower.includes('lamp')) {
    return <Lightbulb size={18} className="text-yellow-400" />;
  }
  if (lower.includes('tv') || lower.includes('media') || lower.includes('entertainment')) {
    return <Television size={18} className="text-sky-400" />;
  }
  return <Plug size={18} className="text-purple-400" />;
}

export default function DevicesEnergyGraphCard({
  devices = [],
  untrackedKwh = 0,
  untrackedPercentage = 0,
  totalHomeConsumption = 0,
  darkMode = true
}: DevicesEnergyGraphCardProps) {
  if (devices.length === 0) return null;

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white shadow-2xl'
          : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-xl'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Devices size={18} weight="fill" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Monitored Devices</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Individual consumer breakdown ({devices.length} devices)
            </p>
          </div>
        </div>

        <div className="text-xs font-mono font-bold text-slate-400">
          Ranked by Consumption
        </div>
      </div>

      {/* Device List & Progress Bars */}
      <div className="space-y-3.5">
        {devices.map((device) => (
          <div key={device.statId} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2 truncate max-w-[70%]">
                <div className="p-1 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  {getDeviceIcon(device.name)}
                </div>
                <span className="truncate text-slate-200">{device.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className="text-slate-400 text-[11px]">{device.percentage.toFixed(1)}%</span>
                <span className="text-white font-bold">{device.kwh.toFixed(2)} kWh</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(1, device.percentage))}%`,
                  backgroundColor: device.color || '#818cf8'
                }}
              />
            </div>
          </div>
        ))}

        {/* Untracked / Other Consumption Bar */}
        {untrackedKwh > 0.05 && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="p-1 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Cpu size={18} className="text-slate-400" />
                </div>
                <span>Other / Untracked Consumption</span>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className="text-slate-500 text-[11px]">{untrackedPercentage.toFixed(1)}%</span>
                <span className="text-slate-300 font-bold">{untrackedKwh.toFixed(2)} kWh</span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-800/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(1, untrackedPercentage))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
