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
  Lightning
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
  className?: string;
}

export default function EnergyDistributionCard({
  totals,
  realtime,
  hasSolar,
  hasGrid,
  hasBattery,
  hasGas,
  hasWater,
  darkMode = true,
  className = ''
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
  const hasBatteryToHome = (isLive ? (realtime?.batteryDischargePowerKW ?? 0) > 0.05 : totals.batteryToHome > 0.05);
  const hasGasFlow = totals.gasUsage > 0.01;
  const hasWaterFlow = totals.waterUsage > 0.01;

  return (
    <div
      className={`w-full h-full rounded-3xl p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-col justify-between ${
        darkMode
          ? 'bg-black/20 text-white'
          : 'bg-white/20 text-slate-900'
      } ${className}`}
    >
      {/* Ambient background glow rendered via smooth radial gradients (eliminates GPU blur box clipping) */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: darkMode
            ? 'radial-gradient(circle 220px at 75% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 70%), radial-gradient(circle 220px at 25% 85%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle 220px at 75% 20%, rgba(245, 158, 11, 0.06) 0%, transparent 70%), radial-gradient(circle 220px at 25% 85%, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
        }}
      />

      {/* Card Header & Live/Period Toggle */}
      <div className="flex items-center justify-between gap-3 mb-2 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${
              darkMode
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Lightning size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Energy Distribution
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isLive ? 'Real-time power balance' : 'Energy flows over selected period'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div
          className={`flex items-center p-1 rounded-xl text-[11px] font-bold ${
            darkMode ? 'bg-white/5' : 'bg-slate-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setViewMode('period')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'period'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : darkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
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
                : darkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Power</span>
          </button>
        </div>
      </div>

      {/* Interactive SVG Flow Diagram */}
      <div className="relative w-full flex-1 min-h-[260px] flex items-center justify-center select-none my-auto py-2">
        <svg
          viewBox="65 15 400 280"
          className="w-full h-full max-h-[320px] overflow-visible"
        >
          <defs>
            <style>
              {`
                @keyframes flowForward {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
                .flow-active {
                  animation: flowForward 1.2s linear infinite;
                }
              `}
            </style>
          </defs>

          {/* ────────────────── FLOW PATHS (WIRES) ────────────────── */}

          {/* Solar -> Home */}
          {hasSolar && (
            <path
              d="M 265 60 Q 350 60 415 155"
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
              d="M 265 60 Q 180 60 115 155"
              fill="none"
              stroke={hasSolarToGrid ? '#818cf8' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasSolarToGrid ? '3.5' : '1.5'}
              strokeDasharray={hasSolarToGrid ? '6 6' : 'none'}
              className={hasSolarToGrid ? 'flow-active' : ''}
              opacity={hasSolarToGrid ? 0.9 : 0.4}
            />
          )}

          {/* Solar -> Battery */}
          {hasSolar && hasBattery && (
            <path
              d="M 265 60 Q 200 145 140 245"
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
              d="M 115 155 L 415 155"
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
              d="M 140 245 Q 280 255 415 155"
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
              d="M 415 35 L 415 155"
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
              d="M 415 275 L 415 155"
              fill="none"
              stroke={hasWaterFlow ? '#06b6d4' : (darkMode ? '#334155' : '#cbd5e1')}
              strokeWidth={hasWaterFlow ? '3' : '1.5'}
              strokeDasharray={hasWaterFlow ? '5 5' : 'none'}
              className={hasWaterFlow ? 'flow-active' : ''}
              opacity={hasWaterFlow ? 0.8 : 0.3}
            />
          )}

          {/* ────────────────── NODES (CIRCLES & LABELS) ────────────────── */}

          {/* 1. SOLAR PV NODE */}
          {hasSolar && (
            <g transform="translate(265, 60)">
              <circle
                r="34"
                className={`${darkMode ? 'fill-slate-900 stroke-amber-500/50' : 'fill-white stroke-amber-400'}`}
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 12px rgba(245, 158, 11, 0.25))"
              />
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Sun size={20} weight="duotone" className="text-amber-500" />
                  <span className={`text-[11px] font-black font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {solarVal.toFixed(1)}
                  </span>
                  <span className={`text-[8px] font-bold uppercase leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {solarUnit}
                  </span>
                </div>
              </foreignObject>
              <text y="48" textAnchor="middle" className={`text-[11px] font-extrabold ${darkMode ? 'fill-amber-400' : 'fill-amber-600'}`}>
                Solar PV
              </text>
            </g>
          )}

          {/* 2. GRID NODE */}
          {hasGrid && (
            <g transform="translate(115, 155)">
              <circle
                r="34"
                className={`${darkMode ? 'fill-slate-900 stroke-sky-500/50' : 'fill-white stroke-sky-400'}`}
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 12px rgba(56, 189, 248, 0.25))"
              />
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Plug size={20} weight="duotone" className="text-sky-400" />
                  <span className={`text-[11px] font-black font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {gridImportVal.toFixed(1)}
                  </span>
                  <span className={`text-[8px] font-bold uppercase leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {solarUnit}
                  </span>
                </div>
              </foreignObject>
              <text y="48" textAnchor="middle" className={`text-[11px] font-extrabold ${darkMode ? 'fill-sky-400' : 'fill-sky-600'}`}>
                Grid
              </text>
              {gridExportVal > 0 && (
                <text y="60" textAnchor="middle" className={`text-[9px] font-mono font-bold ${darkMode ? 'fill-slate-400' : 'fill-slate-500'}`}>
                  Export: {gridExportVal.toFixed(1)} {solarUnit}
                </text>
              )}
            </g>
          )}

          {/* 3. BATTERY NODE */}
          {hasBattery && (
            <g transform="translate(140, 245)">
              <circle
                r="32"
                className={`${darkMode ? 'fill-slate-900 stroke-emerald-500/50' : 'fill-white stroke-emerald-400'}`}
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 12px rgba(16, 185, 129, 0.25))"
              />
              <foreignObject x="-30" y="-30" width="60" height="60">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <BatteryCharging size={18} weight="duotone" className="text-emerald-400" />
                  <span className={`text-[11px] font-black font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {batterySoc !== null ? `${batterySoc}%` : `${batteryOutVal.toFixed(1)}`}
                  </span>
                  <span className={`text-[8px] font-bold uppercase leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {batterySoc !== null ? 'SoC' : solarUnit}
                  </span>
                </div>
              </foreignObject>
              <text y="46" textAnchor="middle" className={`text-[11px] font-extrabold ${darkMode ? 'fill-emerald-400' : 'fill-emerald-600'}`}>
                Battery
              </text>
            </g>
          )}

          {/* 4. HOME CONSUMPTION NODE */}
          <g transform="translate(415, 155)">
            <circle
              r="38"
              className={`${darkMode ? 'fill-slate-900 stroke-purple-500/60' : 'fill-white stroke-purple-400'}`}
              strokeWidth="3"
              filter="drop-shadow(0 6px 16px rgba(168, 85, 247, 0.3))"
            />
            <foreignObject x="-36" y="-36" width="72" height="72">
              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                <House size={22} weight="duotone" className="text-purple-500" />
                <span className={`text-xs font-black font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {homeVal.toFixed(1)}
                </span>
                <span className={`text-[8px] font-bold uppercase leading-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {solarUnit}
                </span>
              </div>
            </foreignObject>
            <text y="52" textAnchor="middle" className={`text-[11px] font-extrabold ${darkMode ? 'fill-purple-400' : 'fill-purple-600'}`}>
              Home
            </text>
          </g>

          {/* 5. GAS NODE */}
          {hasGas && (
            <g transform="translate(415, 35)">
              <circle
                r="24"
                className={`${darkMode ? 'fill-slate-900 stroke-orange-500/50' : 'fill-white stroke-orange-400'}`}
                strokeWidth="2"
              />
              <foreignObject x="-22" y="-22" width="44" height="44">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Fire size={15} weight="duotone" className="text-orange-500" />
                  <span className={`text-[9px] font-bold font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totals.gasUsage.toFixed(1)}
                  </span>
                </div>
              </foreignObject>
              <text x="30" y="4" textAnchor="start" className={`text-[10px] font-bold ${darkMode ? 'fill-orange-400' : 'fill-orange-600'}`}>
                Gas ({totals.gasUnit})
              </text>
            </g>
          )}

          {/* 6. WATER NODE */}
          {hasWater && (
            <g transform="translate(415, 275)">
              <circle
                r="24"
                className={`${darkMode ? 'fill-slate-900 stroke-cyan-500/50' : 'fill-white stroke-cyan-400'}`}
                strokeWidth="2"
              />
              <foreignObject x="-22" y="-22" width="44" height="44">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Drop size={15} weight="duotone" className="text-cyan-500" />
                  <span className={`text-[9px] font-bold font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totals.waterUsage.toFixed(0)}
                  </span>
                </div>
              </foreignObject>
              <text x="30" y="4" textAnchor="start" className={`text-[10px] font-bold ${darkMode ? 'fill-cyan-400' : 'fill-cyan-600'}`}>
                Water ({totals.waterUnit})
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Summary Flow Chips */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t z-10 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex flex-col">
          <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grid Import</span>
          <span className="text-xs font-bold font-mono text-sky-500">
            {totals.gridImport.toFixed(2)} kWh
          </span>
        </div>
        {hasSolar && (
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Solar to Home</span>
            <span className="text-xs font-bold font-mono text-amber-500">
              {totals.solarToHome.toFixed(2)} kWh
            </span>
          </div>
        )}
        {hasSolar && totals.solarToGrid > 0 && (
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Solar to Grid</span>
            <span className="text-xs font-bold font-mono text-indigo-500">
              {totals.solarToGrid.toFixed(2)} kWh
            </span>
          </div>
        )}
        {hasBattery && (
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Battery to Home</span>
            <span className="text-xs font-bold font-mono text-emerald-500">
              {totals.batteryToHome.toFixed(2)} kWh
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
