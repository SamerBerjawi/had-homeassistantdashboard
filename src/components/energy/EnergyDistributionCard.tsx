/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sun,
  Plug,
  BatteryCharging,
  House,
  Fire,
  Drop,
  ArrowDown,
  ArrowUp,
  Lightning,
  Sparkle
} from '@phosphor-icons/react';
import { TransformedEnergyTotals } from '../../services/energyDataTransformer';
import { InstantaneousPowerTelemetry } from '../../utils/energyMath';

interface EnergyDistributionCardProps {
  totals: TransformedEnergyTotals;
  realtime?: InstantaneousPowerTelemetry;
  hasSolar: boolean;
  hasGrid: boolean;
  hasBattery: boolean;
  hasGas: boolean;
  hasWater: boolean;
  darkMode?: boolean;
}

export default function EnergyDistributionCard({
  totals,
  realtime,
  hasSolar,
  hasGrid,
  hasBattery,
  hasGas,
  hasWater,
  darkMode = true
}: EnergyDistributionCardProps) {
  const [viewMode, setViewMode] = useState<'period' | 'live'>('period');

  // Determine active flows based on selected view mode
  const isLive = viewMode === 'live' && realtime;

  const solarVal = isLive ? (realtime?.solarPowerKW ?? 0) : totals.solar;
  const solarUnit = isLive ? 'kW' : 'kWh';

  const gridImportVal = isLive ? (realtime?.gridImportPowerKW ?? 0) : totals.gridImport;
  const gridExportVal = isLive ? (realtime?.gridExportPowerKW ?? 0) : totals.gridExport;

  const batteryInVal = isLive ? (realtime?.batteryChargePowerKW ?? 0) : totals.batteryCharge;
  const batteryOutVal = isLive ? (realtime?.batteryDischargePowerKW ?? 0) : totals.batteryDischarge;
  const batterySoc = realtime?.batterySoC ?? null;

  const homeVal = isLive ? (realtime?.homeConsumptionKW ?? 0) : totals.homeConsumption;

  // Active Flow Flags for particle animation
  const hasSolarToHome = (isLive ? (realtime?.solarPowerKW ?? 0) > 0.05 : totals.solarToHome > 0.05);
  const hasSolarToGrid = (isLive ? (realtime?.gridExportPowerKW ?? 0) > 0.05 : totals.solarToGrid > 0.05);
  const hasSolarToBattery = (isLive ? (realtime?.batteryChargePowerKW ?? 0) > 0.05 : totals.solarToBattery > 0.05);
  const hasGridToHome = (isLive ? (realtime?.gridImportPowerKW ?? 0) > 0.05 : totals.gridToHome > 0.05);
  const hasGridToBattery = (!isLive && totals.gridToBattery > 0.05);
  const hasBatteryToHome = (isLive ? (realtime?.batteryDischargePowerKW ?? 0) > 0.05 : totals.batteryToHome > 0.05);
  const hasGasFlow = totals.gasUsage > 0.01;
  const hasWaterFlow = totals.waterUsage > 0.01;

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white shadow-2xl'
          : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-xl'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header & Live/Period Toggle */}
      <div className="flex items-center justify-between gap-3 mb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Lightning size={18} weight="fill" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Energy Distribution</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {isLive ? 'Real-time power balance' : 'Energy flows over selected period'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div
          className={`flex items-center p-1 rounded-xl border text-[11px] font-bold ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setViewMode('period')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'period'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Total Yield
          </button>
          <button
            type="button"
            onClick={() => setViewMode('live')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'live'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Power</span>
          </button>
        </div>
      </div>

      {/* Interactive SVG Flow Diagram */}
      <div className="relative w-full h-[320px] sm:h-[360px] flex items-center justify-center select-none">
        <svg
          viewBox="0 0 560 360"
          className="w-full h-full max-h-[360px] overflow-visible"
        >
          <defs>
            {/* Gradients for flow paths */}
            <linearGradient id="flow-solar-home" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="flow-solar-grid" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="flow-solar-battery" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="flow-grid-home" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="flow-battery-home" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* Dash flow animation */}
            <style>
              {`
                @keyframes flowForward {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
                @keyframes flowReverse {
                  from { stroke-dashoffset: 0; }
                  to { stroke-dashoffset: 24; }
                }
                .flow-active {
                  animation: flowForward 1.2s linear infinite;
                }
                .flow-active-fast {
                  animation: flowForward 0.8s linear infinite;
                }
              `}
            </style>
          </defs>

          {/* ────────────────── FLOW PATHS (WIRES) ────────────────── */}

          {/* Solar -> Home */}
          {hasSolar && (
            <path
              d="M 280 80 Q 360 80 430 180"
              fill="none"
              stroke={hasSolarToHome ? '#f59e0b' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasSolarToHome ? '3.5' : '1.5'}
              strokeDasharray={hasSolarToHome ? '6 6' : 'none'}
              className={hasSolarToHome ? 'flow-active' : ''}
              opacity={hasSolarToHome ? 0.9 : 0.4}
            />
          )}

          {/* Solar -> Grid (Export) */}
          {hasSolar && hasGrid && (
            <path
              d="M 280 80 Q 200 80 130 180"
              fill="none"
              stroke={hasSolarToGrid ? '#38bdf8' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasSolarToGrid ? '3.5' : '1.5'}
              strokeDasharray={hasSolarToGrid ? '6 6' : 'none'}
              className={hasSolarToGrid ? 'flow-active' : ''}
              opacity={hasSolarToGrid ? 0.9 : 0.4}
            />
          )}

          {/* Solar -> Battery */}
          {hasSolar && hasBattery && (
            <path
              d="M 280 80 Q 220 180 150 280"
              fill="none"
              stroke={hasSolarToBattery ? '#10b981' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasSolarToBattery ? '3.5' : '1.5'}
              strokeDasharray={hasSolarToBattery ? '6 6' : 'none'}
              className={hasSolarToBattery ? 'flow-active' : ''}
              opacity={hasSolarToBattery ? 0.9 : 0.4}
            />
          )}

          {/* Grid -> Home (Import) */}
          {hasGrid && (
            <path
              d="M 130 180 L 430 180"
              fill="none"
              stroke={hasGridToHome ? '#38bdf8' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasGridToHome ? '3.5' : '1.5'}
              strokeDasharray={hasGridToHome ? '6 6' : 'none'}
              className={hasGridToHome ? 'flow-active' : ''}
              opacity={hasGridToHome ? 0.9 : 0.4}
            />
          )}

          {/* Battery -> Home */}
          {hasBattery && (
            <path
              d="M 150 280 Q 300 300 430 180"
              fill="none"
              stroke={hasBatteryToHome ? '#10b981' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasBatteryToHome ? '3.5' : '1.5'}
              strokeDasharray={hasBatteryToHome ? '6 6' : 'none'}
              className={hasBatteryToHome ? 'flow-active' : ''}
              opacity={hasBatteryToHome ? 0.9 : 0.4}
            />
          )}

          {/* Gas -> Home */}
          {hasGas && (
            <path
              d="M 430 60 L 430 180"
              fill="none"
              stroke={hasGasFlow ? '#f97316' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasGasFlow ? '3' : '1.5'}
              strokeDasharray={hasGasFlow ? '5 5' : 'none'}
              className={hasGasFlow ? 'flow-active' : ''}
              opacity={hasGasFlow ? 0.8 : 0.3}
            />
          )}

          {/* Water -> Home */}
          {hasWater && (
            <path
              d="M 430 300 L 430 180"
              fill="none"
              stroke={hasWaterFlow ? '#06b6d4' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasWaterFlow ? '3' : '1.5'}
              strokeDasharray={hasWaterFlow ? '5 5' : 'none'}
              className={hasWaterFlow ? 'flow-active' : ''}
              opacity={hasWaterFlow ? 0.8 : 0.3}
            />
          )}

          {/* ────────────────── NODES (CIRCLES & LABELS) ────────────────── */}

          {/* 1. SOLAR PV NODE (Top Center: 280, 80) */}
          {hasSolar && (
            <g transform="translate(280, 80)">
              <circle
                r="38"
                className={`${darkMode ? 'fill-slate-900 stroke-amber-500/50' : 'fill-white stroke-amber-400'}`}
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 12px rgba(245, 158, 11, 0.25))"
              />
              <foreignObject x="-36" y="-36" width="72" height="72">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Sun size={22} weight="duotone" className="text-amber-500 animate-spin-slow" />
                  <span className="text-[11px] font-black font-mono leading-none mt-1">
                    {solarVal.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                    {solarUnit}
                  </span>
                </div>
              </foreignObject>
              <text y="52" textAnchor="middle" className="text-[11px] font-extrabold fill-amber-500">
                Solar PV
              </text>
            </g>
          )}

          {/* 2. GRID NODE (Center Left: 130, 180) */}
          {hasGrid && (
            <g transform="translate(130, 180)">
              <circle
                r="38"
                className={`${darkMode ? 'fill-slate-900 stroke-sky-500/50' : 'fill-white stroke-sky-400'}`}
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 12px rgba(56, 189, 248, 0.25))"
              />
              <foreignObject x="-36" y="-36" width="72" height="72">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Plug size={22} weight="duotone" className="text-sky-400" />
                  <span className="text-[11px] font-black font-mono leading-none mt-1">
                    {gridImportVal.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                    {solarUnit}
                  </span>
                </div>
              </foreignObject>
              <text y="52" textAnchor="middle" className="text-[11px] font-extrabold fill-sky-400">
                Grid
              </text>
              {/* Return to grid tag */}
              {gridExportVal > 0 && (
                <text y="64" textAnchor="middle" className="text-[9px] font-mono font-bold fill-slate-400">
                  Export: {gridExportVal.toFixed(1)} {solarUnit}
                </text>
              )}
            </g>
          )}

          {/* 3. BATTERY NODE (Bottom Left: 150, 280) */}
          {hasBattery && (
            <g transform="translate(150, 280)">
              <circle
                r="36"
                className={`${darkMode ? 'fill-slate-900 stroke-emerald-500/50' : 'fill-white stroke-emerald-400'}`}
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 12px rgba(16, 185, 129, 0.25))"
              />
              <foreignObject x="-34" y="-34" width="68" height="68">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <BatteryCharging size={20} weight="duotone" className="text-emerald-400" />
                  <span className="text-[11px] font-black font-mono leading-none mt-1">
                    {batterySoc !== null ? `${batterySoc}%` : `${batteryOutVal.toFixed(1)}`}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                    {batterySoc !== null ? 'SoC' : solarUnit}
                  </span>
                </div>
              </foreignObject>
              <text y="50" textAnchor="middle" className="text-[11px] font-extrabold fill-emerald-400">
                Battery
              </text>
            </g>
          )}

          {/* 4. HOME CONSUMPTION NODE (Center Right: 430, 180) */}
          <g transform="translate(430, 180)">
            <circle
              r="42"
              className={`${darkMode ? 'fill-slate-900 stroke-purple-500/60' : 'fill-white stroke-purple-400'}`}
              strokeWidth="3"
              filter="drop-shadow(0 6px 16px rgba(168, 85, 247, 0.3))"
            />
            <foreignObject x="-40" y="-40" width="80" height="80">
              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                <House size={24} weight="duotone" className="text-purple-400" />
                <span className="text-xs font-black font-mono leading-none mt-1">
                  {homeVal.toFixed(1)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                  {solarUnit}
                </span>
              </div>
            </foreignObject>
            <text y="56" textAnchor="middle" className="text-[11px] font-extrabold fill-purple-400">
              Home
            </text>
          </g>

          {/* 5. GAS NODE (Top Right: 430, 40) */}
          {hasGas && (
            <g transform="translate(430, 40)">
              <circle
                r="26"
                className={`${darkMode ? 'fill-slate-900 stroke-orange-500/50' : 'fill-white stroke-orange-400'}`}
                strokeWidth="2"
              />
              <foreignObject x="-24" y="-24" width="48" height="48">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Fire size={16} weight="duotone" className="text-orange-500" />
                  <span className="text-[10px] font-bold font-mono leading-none mt-0.5">
                    {totals.gasUsage.toFixed(1)}
                  </span>
                </div>
              </foreignObject>
              <text x="34" y="4" textAnchor="start" className="text-[10px] font-bold fill-orange-500">
                Gas ({totals.gasUnit})
              </text>
            </g>
          )}

          {/* 6. WATER NODE (Bottom Right: 430, 320) */}
          {hasWater && (
            <g transform="translate(430, 320)">
              <circle
                r="26"
                className={`${darkMode ? 'fill-slate-900 stroke-cyan-500/50' : 'fill-white stroke-cyan-400'}`}
                strokeWidth="2"
              />
              <foreignObject x="-24" y="-24" width="48" height="48">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Drop size={16} weight="duotone" className="text-cyan-400" />
                  <span className="text-[10px] font-bold font-mono leading-none mt-0.5">
                    {totals.waterUsage.toFixed(0)}
                  </span>
                </div>
              </foreignObject>
              <text x="34" y="4" textAnchor="start" className="text-[10px] font-bold fill-cyan-400">
                Water ({totals.waterUnit})
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Summary Flow Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Grid Import</span>
          <span className="text-xs font-bold font-mono text-sky-400">
            {totals.gridImport.toFixed(2)} kWh
          </span>
        </div>
        {hasSolar && (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Solar to Home</span>
            <span className="text-xs font-bold font-mono text-amber-400">
              {totals.solarToHome.toFixed(2)} kWh
            </span>
          </div>
        )}
        {hasSolar && totals.solarToGrid > 0 && (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Solar to Grid</span>
            <span className="text-xs font-bold font-mono text-indigo-400">
              {totals.solarToGrid.toFixed(2)} kWh
            </span>
          </div>
        )}
        {hasBattery && (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Battery to Home</span>
            <span className="text-xs font-bold font-mono text-emerald-400">
              {totals.batteryToHome.toFixed(2)} kWh
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
