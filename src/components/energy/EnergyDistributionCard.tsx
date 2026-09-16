/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Sun,
  SolarPanel,
  Broadcast,
  BatteryCharging,
  House,
  Fire,
  Drop,
  Lightning,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight
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
  // Real-time instantaneous live power telemetry (in kW)
  const liveSolar = realtime?.solarPowerKW ?? 0;
  const liveGridExport = realtime?.gridExportPowerKW ?? 0;
  const liveBatteryCharge = realtime?.batteryChargePowerKW ?? 0;
  const liveGridImport = realtime?.gridImportPowerKW ?? 0;
  const liveBatteryDischarge = realtime?.batteryDischargePowerKW ?? 0;
  const homeVal = realtime?.homeConsumptionKW ?? 0;
  const batterySoc = realtime?.batterySoC ?? null;

  // Exact HA live flow allocation (conservation of energy)
  const solarToGridVal = Math.min(liveSolar, liveGridExport);
  const liveSolarRemaining = Math.max(0, liveSolar - solarToGridVal);
  const solarToBatteryVal = Math.min(liveSolarRemaining, liveBatteryCharge);
  const solarToHomeVal = Math.max(0, liveSolarRemaining - solarToBatteryVal);

  const gridToBatteryVal = Math.max(0, liveBatteryCharge - solarToBatteryVal);
  const batteryToGridVal = Math.max(0, liveGridExport - solarToGridVal);
  const batteryToHomeVal = Math.max(0, liveBatteryDischarge - batteryToGridVal);
  const gridToHomeVal = Math.max(0, liveGridImport - gridToBatteryVal);

  // Dynamic flow threshold: 0.01 kW (10W)
  const flowThreshold = 0.01;

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
    const trueInbound = (hasSolar ? solarToHomeVal : 0) +
                        (hasGrid ? gridToHomeVal : 0) +
                        (hasBattery ? batteryToHomeVal : 0);
    if (Math.abs(homeVal - trueInbound) > 0.02) {
      console.warn(
        `[EnergyDistributionCard] Invariant mismatch: Home node value (${homeVal.toFixed(2)}) differs from sum of inbound flows (${trueInbound.toFixed(2)}) by > 0.02.`,
        { homeVal, trueInbound, totals }
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

  // Streamlined Daily Cumulative Groups (Only values > 0.005)
  const solarItems: { label: string; val: number; type: 'home' | 'battery' | 'grid' }[] = [];
  if (hasSolar) {
    if (totals.solarToHome > 0.005) solarItems.push({ label: 'Home', val: totals.solarToHome, type: 'home' });
    if (hasBattery && totals.solarToBattery > 0.005) solarItems.push({ label: 'Battery', val: totals.solarToBattery, type: 'battery' });
    if (hasGrid && totals.solarToGrid > 0.005) solarItems.push({ label: 'Grid', val: totals.solarToGrid, type: 'grid' });
  }

  const batteryItems: { label: string; val: number; type: 'home' | 'battery' | 'grid' }[] = [];
  if (hasBattery) {
    if (totals.batteryToHome > 0.005) batteryItems.push({ label: 'Home', val: totals.batteryToHome, type: 'home' });
    if (hasGrid && (totals.batteryToGrid ?? 0) > 0.005) batteryItems.push({ label: 'Grid', val: totals.batteryToGrid, type: 'grid' });
  }

  const gridItems: { label: string; val: number; type: 'home' | 'battery' | 'grid' }[] = [];
  if (hasGrid) {
    if (totals.gridToHome > 0.005) gridItems.push({ label: 'Home', val: totals.gridToHome, type: 'home' });
    if (hasBattery && (totals.gridToBattery ?? 0) > 0.005) gridItems.push({ label: 'Battery', val: totals.gridToBattery, type: 'battery' });
  }

  const hasAnyTotals =
    solarItems.length > 0 ||
    batteryItems.length > 0 ||
    gridItems.length > 0 ||
    (hasGas && totals.gasUsage > 0.005) ||
    (hasWater && totals.waterUsage > 0.005);

  const renderDestinationIcon = (type: 'home' | 'battery' | 'grid') => {
    switch (type) {
      case 'home':
        return <House size={14} weight="duotone" className="shrink-0 text-amber-600 dark:text-amber-400" />;
      case 'battery':
        return <BatteryCharging size={14} weight="duotone" className="shrink-0 text-emerald-600 dark:text-emerald-400" />;
      case 'grid':
        return <Broadcast size={14} weight="duotone" className="shrink-0 text-sky-600 dark:text-sky-400" />;
    }
  };

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

      {/* Card Header & Live Status Badge */}
      <div className="flex items-center justify-between gap-3 mb-1 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${
              darkMode
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Lightning size={18} weight="duotone" />
          </div>
          <div>
            <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Energy distribution
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-time power balance & daily distribution
            </p>
          </div>
        </div>

        {/* Live Power Indicator Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
            darkMode
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Flow</span>
        </div>
      </div>

      {/* Interactive SVG Flow Diagram (Home Assistant Rounded Cross Circuit Layout) */}
      <div className="relative w-full flex-1 min-h-[290px] flex items-center justify-center select-none my-auto py-1">
        <svg
          viewBox="20 0 440 335"
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

          {/* ────────────────── NODES (CIRCLES WITH DUOTONE ICONS) ────────────────── */}

          {/* 1. SOLAR PV NODE (Top Center: x=240, y=60) */}
          {hasSolar && (
            <g transform="translate(240, 60)">
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
                  <span className="text-xs font-bold font-mono leading-none mt-1 text-amber-500">
                    {liveSolar.toFixed(2)} kW
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
                  <Broadcast size={22} weight="duotone" className="text-sky-500" />
                  <div className="flex items-center justify-center gap-0.5 mt-1 text-[11px] font-bold font-mono text-sky-500">
                    {liveGridExport > flowThreshold && (
                      <>
                        <ArrowLeft size={11} weight="bold" className="text-purple-500" />
                        <span className="text-purple-500">{liveGridExport.toFixed(2)} kW</span>
                      </>
                    )}
                    {liveGridImport > flowThreshold && (
                      <>
                        <ArrowRight size={11} weight="bold" className="text-sky-500" />
                        <span>{liveGridImport.toFixed(2)} kW</span>
                      </>
                    )}
                    {liveGridExport <= flowThreshold && liveGridImport <= flowThreshold && (
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                        0.00 kW
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
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
                    <BatteryCharging size={22} weight="duotone" className="text-emerald-500" />
                    {batterySoc !== null && (
                      <span className={`text-[11px] font-bold font-mono leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {batterySoc}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 mt-1 text-[11px] font-bold font-mono">
                    {liveBatteryCharge > flowThreshold && (
                      <span className="flex items-center gap-0.5 text-emerald-500 dark:text-emerald-400">
                        <ArrowDown size={11} weight="bold" />
                        {liveBatteryCharge.toFixed(2)} kW
                      </span>
                    )}
                    {liveBatteryDischarge > flowThreshold && (
                      <span className="flex items-center gap-0.5 text-teal-500">
                        <ArrowUp size={11} weight="bold" />
                        {liveBatteryDischarge.toFixed(2)} kW
                      </span>
                    )}
                    {liveBatteryCharge <= flowThreshold && liveBatteryDischarge <= flowThreshold && (
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                        0.00 kW
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
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
                <House size={22} weight="duotone" className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                <span className={`text-xs font-bold font-mono leading-none mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {homeVal.toFixed(2)} kW
                </span>
              </div>
            </foreignObject>
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
                  <Fire size={15} weight="duotone" className="text-orange-500" />
                  <span className={`text-[9px] font-bold font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totals.gasUsage.toFixed(2)}
                  </span>
                </div>
              </foreignObject>
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
                  <Drop size={15} weight="duotone" className="text-cyan-500" />
                  <span className={`text-[9px] font-bold font-mono leading-none mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {totals.waterUsage.toFixed(2)}
                  </span>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Summary: Streamlined Daily Totals (Organized by Source) */}
      <div className={`pt-3 border-t z-10 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Today's Totals
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Solar Streamlined Pill */}
          {solarItems.length > 0 && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                darkMode
                  ? 'bg-amber-500/10 border-amber-500/20 text-slate-200'
                  : 'bg-amber-50 border-amber-300/80 text-slate-900 shadow-sm'
              }`}
            >
              <Sun size={14} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold text-amber-800 dark:text-amber-400">Solar:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {solarItems.map((item, idx) => (
                  <span key={item.label} className="flex items-center gap-1">
                    {idx > 0 && (
                      <span className={`mx-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>|</span>
                    )}
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>→</span>
                    {renderDestinationIcon(item.type)}
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      {item.label}:
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      {item.val.toFixed(2)} kWh
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Battery Streamlined Pill (High-Contrast Rich Emerald Green for Light Mode) */}
          {batteryItems.length > 0 && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                darkMode
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-200'
                  : 'bg-emerald-50 border-emerald-300/90 text-slate-900 shadow-sm'
              }`}
            >
              <BatteryCharging size={14} weight="duotone" className="text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-800 dark:text-emerald-400">Battery:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {batteryItems.map((item, idx) => (
                  <span key={item.label} className="flex items-center gap-1">
                    {idx > 0 && (
                      <span className={`mx-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>|</span>
                    )}
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>→</span>
                    {renderDestinationIcon(item.type)}
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      {item.label}:
                    </span>
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">
                      {item.val.toFixed(2)} kWh
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grid Streamlined Pill */}
          {gridItems.length > 0 && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                darkMode
                  ? 'bg-sky-500/10 border-sky-500/20 text-slate-200'
                  : 'bg-sky-50 border-sky-300/80 text-slate-900 shadow-sm'
              }`}
            >
              <Broadcast size={14} weight="duotone" className="text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-bold text-sky-800 dark:text-sky-400">Grid:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {gridItems.map((item, idx) => (
                  <span key={item.label} className="flex items-center gap-1">
                    {idx > 0 && (
                      <span className={`mx-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>|</span>
                    )}
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>→</span>
                    {renderDestinationIcon(item.type)}
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                      {item.label}:
                    </span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      {item.val.toFixed(2)} kWh
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Gas Pill (if configured and > 0) */}
          {hasGas && totals.gasUsage > 0.005 && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                darkMode
                  ? 'bg-orange-500/10 border-orange-500/20 text-slate-200'
                  : 'bg-orange-50 border-orange-300/80 text-slate-900 shadow-sm'
              }`}
            >
              <Fire size={14} weight="duotone" className="text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="font-bold text-orange-800 dark:text-orange-400">Gas:</span>
              <span className="font-mono font-bold text-orange-700 dark:text-orange-400">
                {totals.gasUsage.toFixed(2)} {totals.gasUnit || 'm³'}
              </span>
            </div>
          )}

          {/* Water Pill (if configured and > 0) */}
          {hasWater && totals.waterUsage > 0.005 && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                darkMode
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-slate-200'
                  : 'bg-cyan-50 border-cyan-300/80 text-slate-900 shadow-sm'
              }`}
            >
              <Drop size={14} weight="duotone" className="text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="font-bold text-cyan-800 dark:text-cyan-400">Water:</span>
              <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                {totals.waterUsage.toFixed(2)} {totals.waterUnit || 'L'}
              </span>
            </div>
          )}

          {/* Fallback if no cumulative totals recorded today */}
          {!hasAnyTotals && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 py-0.5">
              <Lightning size={14} weight="duotone" className="text-slate-400" />
              <span>No energy distribution recorded today</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
