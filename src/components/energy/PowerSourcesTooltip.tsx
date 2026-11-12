/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Power Sources chart tooltip (dual-mode: single period vs year-over-year comparison).
 */

import React from 'react';
import { Sun, Plug, BatteryCharging, House } from '@phosphor-icons/react';
import type { PowerDataPoint } from '../../services/energy/powerSources';

export interface PowerSourcesTooltipContext {
  isSingleDay: boolean;
  darkMode: boolean;
  comparison: { isCompareEnabled: boolean; currentYear: number; compareYear: number };
  hasSolar: boolean;
  showSolar: boolean;
  hasGrid: boolean;
  showGrid: boolean;
  hasBattery: boolean;
  showBattery: boolean;
  showHome: boolean;
}

// Helper for percentage difference rendering in comparison tooltip
export const renderDiffBadge = (curr: number, prev: number | null | undefined) => {
  if (prev === null || prev === undefined || Math.abs(prev) < 0.005) {
    if (Math.abs(curr) < 0.005) return <span className="text-slate-500 font-mono">0%</span>;
    return <span className="text-emerald-400 font-mono font-bold">+100%</span>;
  }
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return <span className="text-slate-400 font-mono">0%</span>;
  const isPos = pct > 0;
  return (
    <span className={`font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
      {isPos ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`}
    </span>
  );
};

// Custom Home Assistant Style Tooltip (Dual-mode: Single Period vs YoY Comparison)
export function renderPowerSourcesTooltip(props: any, ctx: PowerSourcesTooltipContext) {
  const { isSingleDay, darkMode, comparison, hasSolar, showSolar, hasGrid, showGrid, hasBattery, showBattery, showHome } = ctx;
  const { active, payload } = props;
  if (!active || !payload || payload.length === 0) return null;

  const data: PowerDataPoint = payload[0].payload;
  if (!data) return null;

  const unit = isSingleDay ? ' kW' : ' kWh';

  if (comparison.isCompareEnabled) {
    return (
      <div
        className={`px-3.5 py-2.5 rounded-2xl shadow-2xl border text-xs font-sans backdrop-blur-xl ${
          darkMode
            ? 'bg-slate-950/95 border-white/15 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
        style={{ minWidth: 260 }}
      >
        <div className="flex items-center justify-between font-bold text-[11px] mb-2 pb-1 border-b border-white/10 text-slate-400">
          <span>{data.timeFormatted}</span>
          <span className="font-mono text-amber-500 dark:text-amber-400 font-extrabold">
            {comparison.currentYear} vs {comparison.compareYear}
          </span>
        </div>

        <table className="w-full text-left font-medium text-xs">
          <thead>
            <tr className={`text-[11px] uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <th className="pb-1 font-semibold">Flow</th>
              <th className="pb-1 font-semibold text-right">{comparison.currentYear}</th>
              <th className="pb-1 font-semibold text-right">{comparison.compareYear}</th>
              <th className="pb-1 font-semibold text-right">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {hasSolar && showSolar && (
              <tr>
                <td className="py-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                  <Sun size={12} weight="duotone" /> Solar
                </td>
                <td className="py-1 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                  {data.solar.toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right font-mono text-slate-400">
                  {(data.compareSolar ?? 0).toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right">
                  {renderDiffBadge(data.solar, data.compareSolar)}
                </td>
              </tr>
            )}
            {showHome && (
              <tr>
                <td className="py-1 flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                  <House size={12} weight="duotone" /> Home
                </td>
                <td className="py-1 text-right font-mono font-bold">
                  {data.homeConsumption.toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right font-mono text-slate-400">
                  {(data.compareHome ?? 0).toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right">
                  {renderDiffBadge(data.homeConsumption, data.compareHome)}
                </td>
              </tr>
            )}
            {hasGrid && showGrid && (
              <tr>
                <td className="py-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
                  <Plug size={12} weight="duotone" /> Grid
                </td>
                <td className="py-1 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                  {data.gridImport.toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right font-mono text-slate-400">
                  {(data.compareGridImport ?? 0).toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right">
                  {renderDiffBadge(data.gridImport, data.compareGridImport)}
                </td>
              </tr>
            )}
            {hasBattery && showBattery && (
              <tr>
                <td className="py-1 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                  <BatteryCharging size={12} weight="duotone" /> Battery
                </td>
                <td className="py-1 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400">
                  {data.batteryDischarge.toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right font-mono text-slate-400">
                  {(data.compareBatteryDischarge ?? 0).toFixed(2)}{unit}
                </td>
                <td className="py-1 text-right">
                  {renderDiffBadge(data.batteryDischarge, data.compareBatteryDischarge)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl shadow-2xl border text-xs font-sans backdrop-blur-xl ${
        darkMode
          ? 'bg-slate-950/90 border-white/15 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900'
      }`}
      style={{ minWidth: 175 }}
    >
      <div className="font-bold text-[11px] mb-2 pb-1 border-b border-white/10 text-slate-400">
        {data.timeFormatted}
      </div>
      <div className="space-y-1.5 font-medium">
        {hasSolar && (
          <div className="flex items-center justify-between gap-3 text-amber-500 dark:text-amber-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              Solar:
            </span>
            <span className="font-mono font-bold">{data.solar.toFixed(2)}{unit}</span>
          </div>
        )}

        {hasBattery && (
          <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {data.netBattery >= 0 ? 'Battery Discharge:' : 'Battery Charge:'}
            </span>
            <span className="font-mono font-bold">
              {data.netBattery >= 0 ? `+${data.netBattery.toFixed(2)}` : data.netBattery.toFixed(2)}{unit}
            </span>
          </div>
        )}

        {hasGrid && (
          <div className="flex items-center justify-between gap-3 text-sky-600 dark:text-sky-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
              {data.netGrid >= 0 ? 'Grid Import:' : 'Grid Export:'}
            </span>
            <span className="font-mono font-bold">
              {data.netGrid >= 0 ? `+${data.netGrid.toFixed(2)}` : data.netGrid.toFixed(2)}{unit}
            </span>
          </div>
        )}

        <div className={`flex items-center justify-between gap-3 pt-1 border-t ${darkMode ? 'text-slate-200 border-white/10' : 'text-slate-800 border-slate-200'}`}>
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full border ${darkMode ? 'border-slate-300' : 'border-slate-700'}`} />
            Home Load:
          </span>
          <span className="font-mono font-bold">{data.homeConsumption.toFixed(2)}{unit}</span>
        </div>
      </div>
    </div>
  );
}
