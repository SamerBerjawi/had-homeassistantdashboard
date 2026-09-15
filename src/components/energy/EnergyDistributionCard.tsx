/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SolarPanel,
  Broadcast,
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
  const isLive = viewMode === 'live' && !!realtime;

  const solarVal = isLive ? (realtime?.solarPowerKW ?? 0) : totals.solar;
  const solarUnit = isLive ? 'kW' : 'kWh';

  const gridImportVal = isLive ? (realtime?.gridImportPowerKW ?? 0) : totals.gridImport;
  const gridExportVal = isLive ? (realtime?.gridExportPowerKW ?? 0) : totals.gridExport;

  const batteryInVal = isLive ? (realtime?.batteryChargePowerKW ?? 0) : totals.batteryCharge;
  const batteryOutVal = isLive ? (realtime?.batteryDischargePowerKW ?? 0) : totals.batteryDischarge;

  // Battery SoC is only valid in Live mode. In historical period/Total Yield mode,
  // showing live SoC mixes current instantaneous state with historical totals.
  const batterySoc = isLive ? (realtime?.batterySoC ?? null) : null;

  const homeVal = isLive ? (realtime?.homeConsumptionKW ?? 0) : totals.homeConsumption;

  // Flow magnitude calculations
  const liveSolar = realtime?.solarPowerKW ?? 0;
  const liveGridExport = realtime?.gridExportPowerKW ?? 0;
  const liveBatteryCharge = realtime?.batteryChargePowerKW ?? 0;
  const liveGridImport = realtime?.gridImportPowerKW ?? 0;
  const liveBatteryDischarge = realtime?.batteryDischargePowerKW ?? 0;

  // Exact HA live flow allocation (conservation of energy)
  const liveSolarToGrid = Math.min(liveSolar, liveGridExport);
  const liveSolarRemaining = Math.max(0, liveSolar - liveSolarToGrid);
  const liveSolarToBattery = Math.min(liveSolarRemaining, liveBatteryCharge);
  const liveSolarToHome = Math.max(0, liveSolarRemaining - liveSolarToBattery);

  const liveGridToBattery = Math.max(0, liveBatteryCharge - liveSolarToBattery);
  const liveBatteryToGrid = Math.max(0, liveGridExport - liveSolarToGrid);
  const liveBatteryToHome = Math.max(0, liveBatteryDischarge - liveBatteryToGrid);
  const liveGridToHome = Math.max(0, liveGridImport - liveGridToBattery);

  const solarToHomeVal = isLive ? liveSolarToHome : totals.solarToHome;
  const solarToGridVal = isLive ? liveSolarToGrid : totals.solarToGrid;
  const solarToBatteryVal = isLive ? liveSolarToBattery : totals.solarToBattery;
  const gridToHomeVal = isLive ? liveGridToHome : totals.gridToHome;
  const batteryToHomeVal = isLive ? liveBatteryToHome : totals.batteryToHome;
  const gridToBatteryVal = isLive ? liveGridToBattery : (totals.gridToBattery ?? 0);
  const batteryToGridVal = isLive ? liveBatteryToGrid : (totals.batteryToGrid ?? 0);

  // Dynamic flow threshold: 0.01 kW (10W) in live mode, 0.05 kWh (50Wh) in period mode
  const flowThreshold = isLive ? 0.01 : 0.05;

  // Active Flow Flags (> flowThreshold and hardware presence)
  const hasSolarToHome = hasSolar && solarToHomeVal > flowThreshold;
  const hasSolarToGrid = hasSolar && hasGrid && solarToGridVal > flowThreshold;
  const hasSolarToBattery = hasSolar && hasBattery && solarToBatteryVal > flowThreshold;
  const hasGridToHome = hasGrid && gridToHomeVal > flowThreshold;
  const hasBatteryToHome = hasBattery && batteryToHomeVal > flowThreshold;
  const hasGridToBattery = hasGrid && hasBattery && gridToBatteryVal > flowThreshold;
  const hasBatteryToGrid = hasGrid && hasBattery && batteryToGridVal > flowThreshold;
  const hasGasFlow = hasGas && totals.gasUsage > 0.01;
  const hasWaterFlow = hasWater && totals.waterUsage > 0.01;

  // Invariant Verification (Dev Mode)
  if (import.meta.env?.DEV) {
    const inboundSum = (hasSolarToHome ? solarToHomeVal : 0) +
                       (hasGridToHome ? gridToHomeVal : 0) +
                       (hasBatteryToHome ? batteryToHomeVal : 0);
    if (Math.abs(homeVal - inboundSum) > (isLive ? 0.02 : 0.05)) {
      console.warn(
        `[EnergyDistributionCard] Invariant mismatch: Home node value (${homeVal.toFixed(2)}) differs from sum of rendered inbound flows (${inboundSum.toFixed(2)}) by > ${isLive ? 0.02 : 0.05}.`,
        { homeVal, inboundSum, isLive, totals }
      );
    }
  }

  // Scale active path stroke width and particle duration proportionally to flow magnitude
  const activeFlowValues = [
    hasSolarToHome ? solarToHomeVal : 0,
    hasSolarToGrid ? solarToGridVal : 0,
    hasSolarToBattery ? solarToBatteryVal : 0,
    hasGridToHome ? gridToHomeVal : 0,
    hasBatteryToHome ? batteryToHomeVal : 0,
    hasGridToBattery ? gridToBatteryVal : 0,
    hasBatteryToGrid ? batteryToGridVal : 0,
  ].filter(v => v > flowThreshold);

  const maxActiveFlow = activeFlowValues.length > 0 ? Math.max(...activeFlowValues, 1) : 1;

  const getFlowStrokeWidth = (val: number): string => {
    const ratio = Math.min(1, Math.max(0, val / maxActiveFlow));
    return (2.0 + ratio * 3.0).toFixed(1); // 2.0px to 5.0px
  };

  const getParticleDuration = (val: number): string => {
    const ratio = Math.min(1, Math.max(0, val / maxActiveFlow));
    return (2.2 - ratio * 0.9).toFixed(2); // 2.2s down to 1.3s
  };

  // Home Node Segmented Donut Ring (proportional source arcs)
  const homeCircumference = 2 * Math.PI * 34; // ~213.63
  const totalInbound = (solarToHomeVal > 0 ? solarToHomeVal : 0) +
                       (gridToHomeVal > 0 ? gridToHomeVal : 0) +
                       (batteryToHomeVal > 0 ? batteryToHomeVal : 0);
  const safeTotalInbound = totalInbound > 0 ? totalInbound : 1;
  const solarArc = totalInbound > 0 ? (Math.max(0, solarToHomeVal) / safeTotalInbound) * homeCircumference : 0;
  const gridArc = totalInbound > 0 ? (Math.max(0, gridToHomeVal) / safeTotalInbound) * homeCircumference : 0;
  const batteryArc = totalInbound > 0 ? (Math.max(0, batteryToHomeVal) / safeTotalInbound) * homeCircumference : 0;

  return (
    <div
      className={`w-full h-full rounded-3xl p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-col justify-between ${
        darkMode
          ? 'bg-black/20 text-white'
          : 'bg-white/40 text-slate-900'
      } ${className}`}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: darkMode
            ? 'radial-gradient(circle 240px at 50% 18%, rgba(245, 158, 11, 0.08) 0%, transparent 70%), radial-gradient(circle 240px at 50% 82%, rgba(13, 148, 136, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle 240px at 50% 18%, rgba(245, 158, 11, 0.05) 0%, transparent 70%), radial-gradient(circle 240px at 50% 82%, rgba(13, 148, 136, 0.05) 0%, transparent 70%)',
        }}
      />

      {/* Card Header & Live/Period Toggle */}
      <div className="flex items-center justify-between gap-3 mb-1 z-10">
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
            <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Energy distribution
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

      {/* Interactive SVG Flow Diagram (Home Assistant Rounded Cross Circuit Layout) */}
      <div className="relative w-full flex-1 min-h-[290px] flex items-center justify-center select-none my-auto py-1">
        <svg
          viewBox="30 5 420 320"
          className="w-full h-full max-h-[340px] overflow-visible"
        >
          {/* ────────────────── FLOW PATHS (WIRES & MOVING PARTICLES) ────────────────── */}

          {/* 1. Solar -> Home (Amber #f59e0b) - Curves from top to right */}
          {hasSolar && (
            <g>
              <path
                d="M 256 94 Q 256 144 356 144"
                fill="none"
                stroke={hasSolarToHome ? '#f59e0b' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasSolarToHome ? getFlowStrokeWidth(solarToHomeVal) : '1.5'}
                opacity={hasSolarToHome ? 0.9 : 0.4}
              />
              {hasSolarToHome && (
                <circle r="4" fill="#f59e0b" filter="drop-shadow(0 0 4px #f59e0b)">
                  <animateMotion
                    path="M 256 94 Q 256 144 356 144"
                    dur={`${getParticleDuration(solarToHomeVal)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 2. Solar -> Grid (Export) (Purple #8b5cf6) - Curves from top to left */}
          {hasSolar && hasGrid && (
            <g>
              <path
                d="M 224 94 Q 224 144 124 144"
                fill="none"
                stroke={hasSolarToGrid ? '#8b5cf6' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasSolarToGrid ? getFlowStrokeWidth(solarToGridVal) : '1.5'}
                opacity={hasSolarToGrid ? 0.9 : 0.4}
              />
              {hasSolarToGrid && (
                <circle r="4" fill="#8b5cf6" filter="drop-shadow(0 0 4px #8b5cf6)">
                  <animateMotion
                    path="M 224 94 Q 224 144 124 144"
                    dur={`${getParticleDuration(solarToGridVal)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 3. Solar -> Battery (Purple #8b5cf6) - Straight vertical line down */}
          {hasSolar && hasBattery && (
            <g>
              <path
                d="M 240 94 L 240 221"
                fill="none"
                stroke={hasSolarToBattery ? '#8b5cf6' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasSolarToBattery ? getFlowStrokeWidth(solarToBatteryVal) : '1.5'}
                opacity={hasSolarToBattery ? 0.9 : 0.4}
              />
              {hasSolarToBattery && (
                <circle r="4" fill="#8b5cf6" filter="drop-shadow(0 0 4px #8b5cf6)">
                  <animateMotion
                    path="M 240 94 L 240 221"
                    dur={`${getParticleDuration(solarToBatteryVal)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 4. Grid -> Home (Import) (Sky Blue #0284c7) - Straight horizontal line */}
          {hasGrid && (
            <g>
              <path
                d="M 124 160 L 356 160"
                fill="none"
                stroke={hasGridToHome ? '#0284c7' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasGridToHome ? getFlowStrokeWidth(gridToHomeVal) : '1.5'}
                opacity={hasGridToHome ? 0.9 : 0.4}
              />
              {hasGridToHome && (
                <circle r="4" fill="#0284c7" filter="drop-shadow(0 0 4px #0284c7)">
                  <animateMotion
                    path="M 124 160 L 356 160"
                    dur={`${getParticleDuration(gridToHomeVal)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 5. Grid -> Battery (Purple #8b5cf6) - Curves from left to bottom */}
          {hasGrid && hasBattery && (
            <g>
              <path
                d="M 124 176 Q 224 176 224 221"
                fill="none"
                stroke={hasGridToBattery ? '#8b5cf6' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasGridToBattery ? getFlowStrokeWidth(gridToBatteryVal) : '1.5'}
                opacity={hasGridToBattery ? 0.9 : 0.4}
              />
              {hasGridToBattery && (
                <circle r="4" fill="#8b5cf6" filter="drop-shadow(0 0 4px #8b5cf6)">
                  <animateMotion
                    path="M 124 176 Q 224 176 224 221"
                    dur={`${getParticleDuration(gridToBatteryVal)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 6. Battery -> Grid (Rose #f43f5e) - Curves from bottom to left */}
          {hasGrid && hasBattery && hasBatteryToGrid && (
            <g>
              <path
                d="M 224 221 Q 224 176 124 176"
                fill="none"
                stroke="#f43f5e"
                strokeWidth={getFlowStrokeWidth(batteryToGridVal)}
                opacity={0.9}
              />
              <circle r="4" fill="#f43f5e" filter="drop-shadow(0 0 4px #f43f5e)">
                <animateMotion
                  path="M 224 221 Q 224 176 124 176"
                  dur={`${getParticleDuration(batteryToGridVal)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}

          {/* 7. Battery -> Home (Teal #0d9488) - Curves from bottom to right */}
          {hasBattery && (
            <g>
              <path
                d="M 256 221 Q 256 176 356 176"
                fill="none"
                stroke={hasBatteryToHome ? '#0d9488' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasBatteryToHome ? getFlowStrokeWidth(batteryToHomeVal) : '1.5'}
                opacity={hasBatteryToHome ? 0.9 : 0.4}
              />
              {hasBatteryToHome && (
                <circle r="4" fill="#0d9488" filter="drop-shadow(0 0 4px #0d9488)">
                  <animateMotion
                    path="M 256 221 Q 256 176 356 176"
                    dur={`${getParticleDuration(batteryToHomeVal)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 8. Gas -> Home (if configured) */}
          {hasGas && (
            <g>
              <path
                d="M 390 35 L 390 126"
                fill="none"
                stroke={hasGasFlow ? '#f97316' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasGasFlow ? '3' : '1.5'}
                opacity={hasGasFlow ? 0.8 : 0.3}
              />
              {hasGasFlow && (
                <circle r="3.5" fill="#f97316">
                  <animateMotion
                    path="M 390 35 L 390 126"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* 9. Water -> Home (if configured) */}
          {hasWater && (
            <g>
              <path
                d="M 390 285 L 390 194"
                fill="none"
                stroke={hasWaterFlow ? '#06b6d4' : (darkMode ? '#334155' : '#e2e8f0')}
                strokeWidth={hasWaterFlow ? '3' : '1.5'}
                opacity={hasWaterFlow ? 0.8 : 0.3}
              />
              {hasWaterFlow && (
                <circle r="3.5" fill="#06b6d4">
                  <animateMotion
                    path="M 390 285 L 390 194"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )}

          {/* ────────────────── NODES (CIRCLES & AUTHENTIC HA LABELS) ────────────────── */}

          {/* 1. SOLAR PV NODE (Top Center: x=240, y=60) */}
          {hasSolar && (
            <g transform="translate(240, 60)">
              {/* Label ABOVE circle */}
              <text
                y="-42"
                textAnchor="middle"
                className={`text-[12px] font-semibold tracking-tight ${darkMode ? 'fill-slate-300' : 'fill-slate-700'}`}
              >
                Solar
              </text>
              <circle
                r="34"
                className={`${darkMode ? 'fill-slate-900' : 'fill-white'}`}
                stroke="#f59e0b"
                strokeWidth="2.5"
                filter="drop-shadow(0 2px 8px rgba(245, 158, 11, 0.2))"
              />
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <SolarPanel size={22} weight="duotone" className="text-amber-500" />
                  <span className={`text-[12px] font-bold font-mono leading-none mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {solarVal.toFixed(1)} {solarUnit}
                  </span>
                </div>
              </foreignObject>
            </g>
          )}

          {/* 2. GRID NODE (Left Center: x=90, y=160) */}
          {hasGrid && (
            <g transform="translate(90, 160)">
              <circle
                r="34"
                className={`${darkMode ? 'fill-slate-900' : 'fill-white'}`}
                stroke="#0284c7"
                strokeWidth="2.5"
                filter="drop-shadow(0 2px 8px rgba(2, 132, 199, 0.2))"
              />
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Broadcast size={18} weight="duotone" className="text-sky-500" />
                  <div className="flex flex-col items-center justify-center mt-0.5 leading-tight">
                    {gridExportVal > flowThreshold && (
                      <span className="text-[10px] font-bold font-mono text-purple-500">
                        ← {gridExportVal.toFixed(2)} {solarUnit}
                      </span>
                    )}
                    {gridImportVal > flowThreshold && (
                      <span className="text-[10px] font-bold font-mono text-sky-500">
                        → {gridImportVal.toFixed(2)} {solarUnit}
                      </span>
                    )}
                    {gridExportVal <= flowThreshold && gridImportVal <= flowThreshold && (
                      <span className={`text-[10px] font-bold font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        0.0 {solarUnit}
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
              {/* Label BELOW circle */}
              <text
                y="48"
                textAnchor="middle"
                className={`text-[12px] font-semibold tracking-tight ${darkMode ? 'fill-slate-300' : 'fill-slate-700'}`}
              >
                Grid
              </text>
            </g>
          )}

          {/* 3. BATTERY NODE (Bottom Center: x=240, y=255) */}
          {hasBattery && (
            <g transform="translate(240, 255)">
              <circle
                r="34"
                className={`${darkMode ? 'fill-slate-900' : 'fill-white'}`}
                stroke="#0d9488"
                strokeWidth="2.5"
                filter="drop-shadow(0 2px 8px rgba(13, 148, 136, 0.2))"
              />
              <foreignObject x="-32" y="-32" width="64" height="64">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="flex items-center justify-center gap-1">
                    <BatteryCharging size={16} weight="fill" className="text-emerald-500" />
                    {batterySoc !== null && (
                      <span className={`text-[11px] font-bold font-mono leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {batterySoc} %
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center mt-0.5 leading-tight">
                    {batteryInVal > flowThreshold && (
                      <span className="text-[10px] font-bold font-mono text-purple-500">
                        ↓ {batteryInVal.toFixed(2)} {solarUnit}
                      </span>
                    )}
                    {batteryOutVal > flowThreshold && (
                      <span className="text-[10px] font-bold font-mono text-teal-500">
                        ↑ {batteryOutVal.toFixed(2)} {solarUnit}
                      </span>
                    )}
                    {batteryInVal <= flowThreshold && batteryOutVal <= flowThreshold && (
                      <span className={`text-[10px] font-bold font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        0.0 {solarUnit}
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
              {/* Label BELOW circle */}
              <text
                y="48"
                textAnchor="middle"
                className={`text-[12px] font-semibold tracking-tight ${darkMode ? 'fill-slate-300' : 'fill-slate-700'}`}
              >
                Battery
              </text>
            </g>
          )}

          {/* 4. HOME CONSUMPTION NODE (Right Center: x=390, y=160) */}
          <g transform="translate(390, 160)">
            {/* Background circle */}
            <circle
              r="34"
              className={`${darkMode ? 'fill-slate-900' : 'fill-white'}`}
              strokeWidth="0"
              filter="drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))"
            />

            {/* Segmented Donut Arc (Rotated -90deg so arc starts at 12 o'clock) */}
            <g transform="rotate(-90)">
              {totalInbound <= 0.05 ? (
                <circle
                  r="34"
                  fill="none"
                  stroke={darkMode ? '#475569' : '#94a3b8'}
                  strokeWidth="3.5"
                />
              ) : (
                <>
                  {/* Solar segment (Orange #f59e0b) */}
                  {solarArc > 0 && (
                    <circle
                      r="34"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeDasharray={`${solarArc} ${homeCircumference}`}
                      strokeDashoffset="0"
                    />
                  )}
                  {/* Grid segment (Sky Blue #0284c7) */}
                  {gridArc > 0 && (
                    <circle
                      r="34"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="3.5"
                      strokeDasharray={`${gridArc} ${homeCircumference}`}
                      strokeDashoffset={-solarArc}
                    />
                  )}
                  {/* Battery segment (Teal #0d9488) */}
                  {batteryArc > 0 && (
                    <circle
                      r="34"
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3.5"
                      strokeDasharray={`${batteryArc} ${homeCircumference}`}
                      strokeDashoffset={-(solarArc + gridArc)}
                    />
                  )}
                </>
              )}
            </g>

            <foreignObject x="-32" y="-32" width="64" height="64">
              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                <House size={20} weight="fill" className={darkMode ? 'text-white' : 'text-slate-800'} />
                <span className={`text-[12px] font-bold font-mono leading-none mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {homeVal.toFixed(1)} {solarUnit}
                </span>
              </div>
            </foreignObject>
            {/* Label BELOW circle */}
            <text
              y="48"
              textAnchor="middle"
              className={`text-[12px] font-semibold tracking-tight ${darkMode ? 'fill-slate-300' : 'fill-slate-700'}`}
            >
              Home
            </text>
          </g>

          {/* 5. GAS NODE (if configured) */}
          {hasGas && (
            <g transform="translate(390, 25)">
              <circle
                r="20"
                className={`${darkMode ? 'fill-slate-900' : 'fill-white'}`}
                stroke="#f97316"
                strokeWidth="2"
              />
              <foreignObject x="-18" y="-18" width="36" height="36">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Fire size={14} weight="duotone" className="text-orange-500" />
                  <span className={`text-[9px] font-bold font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totals.gasUsage.toFixed(1)}
                  </span>
                </div>
              </foreignObject>
              <text x="24" y="4" textAnchor="start" className={`text-[10px] font-semibold ${darkMode ? 'fill-orange-400' : 'fill-orange-600'}`}>
                Gas
              </text>
            </g>
          )}

          {/* 6. WATER NODE (if configured) */}
          {hasWater && (
            <g transform="translate(390, 295)">
              <circle
                r="20"
                className={`${darkMode ? 'fill-slate-900' : 'fill-white'}`}
                stroke="#06b6d4"
                strokeWidth="2"
              />
              <foreignObject x="-18" y="-18" width="36" height="36">
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <Drop size={14} weight="duotone" className="text-cyan-500" />
                  <span className={`text-[9px] font-bold font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totals.waterUsage.toFixed(0)}
                  </span>
                </div>
              </foreignObject>
              <text x="24" y="4" textAnchor="start" className={`text-[10px] font-semibold ${darkMode ? 'fill-cyan-400' : 'fill-cyan-600'}`}>
                Water
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Summary Flow Chips */}
      <div className={`flex flex-wrap gap-x-4 gap-y-2 pt-2.5 border-t z-10 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex flex-col min-w-[70px]">
          <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grid Import</span>
          <span className="text-xs font-bold font-mono text-sky-500">
            {gridImportVal.toFixed(2)} {solarUnit}
          </span>
        </div>
        {hasSolar && (
          <div className="flex flex-col min-w-[70px]">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Solar to Home</span>
            <span className="text-xs font-bold font-mono text-amber-500">
              {solarToHomeVal.toFixed(2)} {solarUnit}
            </span>
          </div>
        )}
        {hasSolar && (isLive ? solarToGridVal > flowThreshold : totals.solarToGrid > 0) && (
          <div className="flex flex-col min-w-[70px]">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Solar to Grid</span>
            <span className="text-xs font-bold font-mono text-purple-500">
              {solarToGridVal.toFixed(2)} {solarUnit}
            </span>
          </div>
        )}
        {hasBattery && (
          <div className="flex flex-col min-w-[70px]">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Battery to Home</span>
            <span className="text-xs font-bold font-mono text-teal-500">
              {batteryToHomeVal.toFixed(2)} {solarUnit}
            </span>
          </div>
        )}
        {hasGrid && hasBattery && (isLive ? gridToBatteryVal > flowThreshold : (totals.gridToBattery ?? 0) > 0) && (
          <div className="flex flex-col min-w-[70px]">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grid to Battery</span>
            <span className="text-xs font-bold font-mono text-purple-500">
              {gridToBatteryVal.toFixed(2)} {solarUnit}
            </span>
          </div>
        )}
        {hasGrid && hasBattery && (isLive ? batteryToGridVal > flowThreshold : (totals.batteryToGrid ?? 0) > 0) && (
          <div className="flex flex-col min-w-[70px]">
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Battery to Grid</span>
            <span className="text-xs font-bold font-mono text-rose-500">
              {batteryToGridVal.toFixed(2)} {solarUnit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
