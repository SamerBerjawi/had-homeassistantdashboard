/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Lightning, 
  Sun, 
  Plug, 
  BatteryCharging, 
  House, 
  Sparkle,
  Check
} from '@phosphor-icons/react';
import { TimeseriesEnergyPoint } from './energyCalculator';
import type { EnergyHistoryPeriod } from '../../services/haEnergyStatistics';

interface PowerSourcesChartProps {
  /** Active-period timeseries (whatever period is currently selected) */
  timeseries24h: TimeseriesEnergyPoint[];
  /** Individual period caches passed from parent so chart always shows the right data */
  timeseriesYesterday?: TimeseriesEnergyPoint[];
  timeseries7d?: TimeseriesEnergyPoint[];
  timeseriesMonth?: TimeseriesEnergyPoint[];
  timeseriesYear?: TimeseriesEnergyPoint[];
  /** Current period selected in EnergyDashboardView — drives dataset selection */
  period?: EnergyHistoryPeriod;
  darkMode?: boolean;
}

export default function PowerSourcesChart({
  timeseries24h,
  timeseriesYesterday,
  timeseries7d,
  timeseriesMonth,
  timeseriesYear,
  period = 'today',
  darkMode = true
}: PowerSourcesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1100);
  
  // Layer visibility toggles
  const [showSolar, setShowSolar] = useState(true);
  const [showGridImport, setShowGridImport] = useState(true);
  const [showBatteryDischarge, setShowBatteryDischarge] = useState(true);
  const [showGridExport, setShowGridExport] = useState(true);
  const [showBatteryCharge, setShowBatteryCharge] = useState(true);
  const [showConsumption, setShowConsumption] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Measure container width for responsive 100% full-width rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth;
        if (clientWidth > 0) {
          setContainerWidth(clientWidth);
        }
      }
    };
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Active dataset driven by the global period prop (no internal toggle needed)
  const activeSourceData = useMemo(() => {
    if (period === 'yesterday' && timeseriesYesterday && timeseriesYesterday.length > 0) {
      return timeseriesYesterday;
    }
    if (period === '7d' && timeseries7d && timeseries7d.length > 0) {
      return timeseries7d;
    }
    if (period === 'month' && timeseriesMonth && timeseriesMonth.length > 0) {
      return timeseriesMonth;
    }
    if (period === 'year' && timeseriesYear && timeseriesYear.length > 0) {
      return timeseriesYear;
    }
    return timeseries24h || [];
  }, [period, timeseries24h, timeseriesYesterday, timeseries7d, timeseriesMonth, timeseriesYear]);

  const data = activeSourceData;

  // Chart Dimensions & Dynamic Width Coordinate Math
  const width = Math.max(600, containerWidth);
  const height = 360;
  const padding = { top: 35, right: 35, bottom: 40, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Compute dynamic domain from actual data
  const { maxPositive, minNegative, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return { maxPositive: 4.0, minNegative: -3.0, yTicks: [4, 3, 2, 1, 0, -1, -2, -3] };
    }
    let maxPos = 1.0;
    let minNeg = -0.5;

    data.forEach(d => {
      const stackedPos = (showSolar ? d.solar : 0) + 
                         (showGridImport ? d.gridImport : 0) + 
                         (showBatteryDischarge ? d.batteryDischarge : 0);
      const demandPos = showConsumption ? d.consumption : 0;
      const stackedNeg = (showGridExport ? d.gridExport : 0) + 
                         (showBatteryCharge ? d.batteryCharge : 0);

      maxPos = Math.max(maxPos, stackedPos, demandPos);
      minNeg = Math.min(minNeg, stackedNeg);
    });

    const maxPositive = Math.max(2.0, Math.ceil(maxPos * 1.15));
    const minNegative = Math.min(-1.0, Math.floor(minNeg * 1.15));

    const ticks: number[] = [];
    for (let t = maxPositive; t >= minNegative; t -= 1) {
      ticks.push(t);
    }

    return { maxPositive, minNegative, yTicks: ticks };
  }, [data, showSolar, showGridImport, showBatteryDischarge, showGridExport, showBatteryCharge, showConsumption]);

  const totalRange = maxPositive - minNegative;
  const zeroY = padding.top + (maxPositive / totalRange) * innerHeight;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const ratio = (maxPositive - val) / totalRange;
    return padding.top + ratio * innerHeight;
  };

  // Smooth Bezier Curve generator
  const makeCurve = (points: [number, number][]) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
    let path = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return path;
  };

  // Build Zero-Baseline Stacked Area Curves
  const {
    solarPathStr,
    gridImportPathStr,
    batDischargePathStr,
    gridExportPathStr,
    batChargePathStr,
    consumptionLineStr
  } = useMemo(() => {
    if (data.length === 0) {
      return {
        solarPathStr: '',
        gridImportPathStr: '',
        batDischargePathStr: '',
        gridExportPathStr: '',
        batChargePathStr: '',
        consumptionLineStr: ''
      };
    }

    // -------------------------------------------------------------
    // POSITIVE Y-AXIS STACKING (Above 0 kW)
    // -------------------------------------------------------------
    // 1. Solar generation (Amber/Orange #F59E0B)
    const solarUpper: [number, number][] = data.map((d, i) => [
      getX(i), 
      getY(showSolar ? d.solar : 0)
    ] as [number, number]);
    const zeroLine: [number, number][] = data.map((_, i) => [
      getX(i), 
      zeroY
    ] as [number, number]);
    const solarBase: [number, number][] = zeroLine.slice().reverse();
    const solarPath = `${makeCurve(solarUpper)} L ${solarBase[0][0]},${solarBase[0][1]} ${makeCurve(solarBase).replace('M', 'L')} Z`;

    // 2. Grid Import (Blue #0284C7) stacked on top of Solar
    const gridImportUpper: [number, number][] = data.map((d, i) => [
      getX(i), 
      getY((showSolar ? d.solar : 0) + (showGridImport ? d.gridImport : 0))
    ] as [number, number]);
    const gridImportBase: [number, number][] = solarUpper.slice().reverse();
    const gridImportPath = `${makeCurve(gridImportUpper)} L ${gridImportBase[0][0]},${gridImportBase[0][1]} ${makeCurve(gridImportBase).replace('M', 'L')} Z`;

    // 3. Battery Discharge (Teal/Green #10B981) stacked on top of Solar + Grid Import
    const batDischargeUpper: [number, number][] = data.map((d, i) => [
      getX(i), 
      getY((showSolar ? d.solar : 0) + (showGridImport ? d.gridImport : 0) + (showBatteryDischarge ? d.batteryDischarge : 0))
    ] as [number, number]);
    const batDischargeBase: [number, number][] = gridImportUpper.slice().reverse();
    const batDischargePath = `${makeCurve(batDischargeUpper)} L ${batDischargeBase[0][0]},${batDischargeBase[0][1]} ${makeCurve(batDischargeBase).replace('M', 'L')} Z`;

    // -------------------------------------------------------------
    // NEGATIVE Y-AXIS STACKING (Below 0 kW)
    // -------------------------------------------------------------
    // 4. Grid Export (Feed-in, Dark Blue #1E3A8A) below 0 baseline
    const gridExportLower: [number, number][] = data.map((d, i) => [
      getX(i), 
      getY(showGridExport ? d.gridExport : 0)
    ] as [number, number]);
    const gridExportBase: [number, number][] = zeroLine.slice().reverse();
    const gridExportPath = `${makeCurve(gridExportLower)} L ${gridExportBase[0][0]},${gridExportBase[0][1]} ${makeCurve(gridExportBase).replace('M', 'L')} Z`;

    // 5. Battery Charging (Cyan #06B6D4) stacked below Grid Export
    const batChargeLower: [number, number][] = data.map((d, i) => [
      getX(i), 
      getY((showGridExport ? d.gridExport : 0) + (showBatteryCharge ? d.batteryCharge : 0))
    ] as [number, number]);
    const batChargeBase: [number, number][] = gridExportLower.slice().reverse();
    const batChargePath = `${makeCurve(batChargeLower)} L ${batChargeBase[0][0]},${batChargeBase[0][1]} ${makeCurve(batChargeBase).replace('M', 'L')} Z`;

    // -------------------------------------------------------------
    // OVERLAY LINE: Total Home Consumption (Dashed White Line)
    // -------------------------------------------------------------
    const consumptionPoints: [number, number][] = data.map((d, i) => [
      getX(i), 
      getY(showConsumption ? d.consumption : 0)
    ] as [number, number]);
    const consumptionPath = makeCurve(consumptionPoints);

    return {
      solarPathStr: solarPath,
      gridImportPathStr: gridImportPath,
      batDischargePathStr: batDischargePath,
      gridExportPathStr: gridExportPath,
      batChargePathStr: batChargePath,
      consumptionLineStr: consumptionPath
    };
  }, [data, showSolar, showGridImport, showBatteryDischarge, showGridExport, showBatteryCharge, showConsumption, zeroY, width]);

  // Handle Mouse Hover Crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = ((e.clientX - rect.left) / rect.width) * width;
    const relativeX = Math.max(0, Math.min(innerWidth, xPos - padding.left));
    const index = Math.round((relativeX / innerWidth) * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < data.length ? data[hoverIndex] : null;

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* Header Banner & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
            <Lightning size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Power Sources & Energy Balance
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Zero-Baseline Stacked Area
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Stacked generation (+), grid export / battery charge (-), and dashed home demand overlay
            </p>
          </div>
        </div>

        {/* Active period badge — synced to parent's global period selector */}
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
          darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          {period === 'today' ? 'Today (24h)'
            : period === 'yesterday' ? 'Yesterday'
            : period === '7d' ? 'Last 7 Days'
            : period === 'month' ? 'This Month'
            : 'This Year'}
        </span>
      </div>

      {/* SVG Zero-Baseline Stacked Area Graph */}
      <div ref={containerRef} className="relative w-full h-[340px] sm:h-[380px] my-3 select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Solar Amber Gradient */}
            <linearGradient id="solarAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#B45309" stopOpacity="0.45" />
            </linearGradient>

            {/* Grid Import Blue Gradient */}
            <linearGradient id="gridImportGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#0369A1" stopOpacity="0.50" />
            </linearGradient>

            {/* Battery Discharge Teal/Green Gradient */}
            <linearGradient id="batDischargeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.50" />
            </linearGradient>

            {/* Grid Export Dark Blue Gradient (Negative) */}
            <linearGradient id="gridExportGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.50" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.85" />
            </linearGradient>

            {/* Battery Charge Cyan Gradient (Negative) */}
            <linearGradient id="batChargeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0891B2" stopOpacity="0.50" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Top Y-Axis Unit */}
          <text
            x={padding.left - 12}
            y={padding.top - 12}
            textAnchor="end"
            className="text-[11px] font-semibold fill-slate-400 dark:fill-slate-400"
          >
            kW
          </text>

          {/* Horizontal Grid Lines */}
          {yTicks.map(val => {
            const y = getY(val);
            const isZero = val === 0;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isZero ? (darkMode ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.35)') : (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}
                  strokeWidth={isZero ? 1.5 : 1}
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className={`text-[11px] font-medium font-sans ${isZero ? 'font-bold fill-slate-200' : 'fill-slate-400 dark:fill-slate-400'}`}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Grid Lines */}
          {(() => {
            if (data.length <= 1) return null;
            const stepCount = Math.min(8, Math.max(4, Math.floor(innerWidth / 120)));
            const indices: number[] = [];
            for (let s = 0; s <= stepCount; s++) {
              const idx = Math.min(data.length - 1, Math.round((s / stepCount) * (data.length - 1)));
              if (!indices.includes(idx)) indices.push(idx);
            }
            return indices.map(idx => {
              const x = getX(idx);
              return (
                <line
                  key={idx}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                  strokeWidth="1"
                />
              );
            });
          })()}

          {/* --------------------------------------------------------- */}
          {/* STACKED AREA CURVES                                       */}
          {/* --------------------------------------------------------- */}

          {/* 1. Solar Generation Area (+ Amber/Orange #F59E0B) */}
          {showSolar && (
            <path
              d={solarPathStr}
              fill="url(#solarAreaGrad)"
              stroke="#F59E0B"
              strokeWidth="1.5"
            />
          )}

          {/* 2. Grid Import Area (+ Blue #0284C7) */}
          {showGridImport && (
            <path
              d={gridImportPathStr}
              fill="url(#gridImportGrad)"
              stroke="#0284C7"
              strokeWidth="1.5"
            />
          )}

          {/* 3. Battery Discharge Area (+ Teal/Green #10B981) */}
          {showBatteryDischarge && (
            <path
              d={batDischargePathStr}
              fill="url(#batDischargeGrad)"
              stroke="#10B981"
              strokeWidth="1.5"
            />
          )}

          {/* 4. Grid Export Area (- Dark Blue #1E3A8A) */}
          {showGridExport && (
            <path
              d={gridExportPathStr}
              fill="url(#gridExportGrad)"
              stroke="#1E3A8A"
              strokeWidth="1.5"
            />
          )}

          {/* 5. Battery Charging Area (- Cyan #06B6D4) */}
          {showBatteryCharge && (
            <path
              d={batChargePathStr}
              fill="url(#batChargeGrad)"
              stroke="#06B6D4"
              strokeWidth="1.5"
            />
          )}

          {/* 6. Total Home Consumption Overlay (Dashed White Line) */}
          {showConsumption && (
            <path
              d={consumptionLineStr}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="5, 4"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))' }}
            />
          )}

          {/* X-Axis Time Labels (Dynamic for 5-minute and multi-interval series) */}
          {(() => {
            if (data.length === 0) return null;
            const stepCount = Math.min(8, Math.max(4, Math.floor(innerWidth / 120)));
            const indices: number[] = [];
            for (let s = 0; s <= stepCount; s++) {
              const idx = Math.min(data.length - 1, Math.round((s / stepCount) * (data.length - 1)));
              if (!indices.includes(idx)) indices.push(idx);
            }

            return indices.map((idx, i) => {
              const d = data[idx];
              const align = i === 0 ? 'start' : i === indices.length - 1 ? 'end' : 'middle';
              return (
                <text
                  key={idx}
                  x={getX(idx)}
                  y={height - 15}
                  textAnchor={align}
                  className="text-[11px] font-medium fill-slate-400 select-none"
                >
                  {d?.label || ''}
                </text>
              );
            });
          })()}

          {/* Hover Cursor Crosshair */}
          {hoverIndex !== null && activePoint && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="#FFFFFF"
                strokeWidth="1"
                opacity="0.6"
              />
              {/* Point on Solar */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activePoint.solar)}
                r="3.5"
                fill="#F59E0B"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Point on Consumption */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activePoint.consumption)}
                r="4"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Floating Instant Figures Tooltip */}
        {hoverIndex !== null && activePoint && (
          <div 
            className="absolute z-20 pointer-events-none p-3.5 rounded-2xl border border-white/15 bg-black/90 backdrop-blur-md shadow-2xl text-xs font-mono text-white space-y-1.5 min-w-[200px]"
            style={{
              left: `${Math.min(78, Math.max(22, (hoverIndex / (data.length - 1)) * 100))}%`,
              top: '10%',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-sans font-bold text-slate-200 border-b border-white/10 pb-1 flex items-center justify-between">
              <span>{activePoint.timestamp}</span>
              <span className="text-[10px] text-slate-400 font-normal">Active Power</span>
            </div>
            <div className="flex items-center justify-between text-[#F59E0B]">
              <span>Solar PV:</span>
              <span className="font-bold">+{activePoint.solar.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center justify-between text-[#0284C7]">
              <span>Grid Import:</span>
              <span className="font-bold">+{activePoint.gridImport.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center justify-between text-[#10B981]">
              <span>Battery Discharge:</span>
              <span className="font-bold">+{activePoint.batteryDischarge.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center justify-between text-[#60A5FA]">
              <span>Grid Export:</span>
              <span className="font-bold">{activePoint.gridExport.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center justify-between text-[#06B6D4]">
              <span>Battery Charging:</span>
              <span className="font-bold">{activePoint.batteryCharge.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center justify-between text-white pt-1 border-t border-white/10 font-bold">
              <span>Home Demand:</span>
              <span>{activePoint.consumption.toFixed(2)} kW</span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE CHECKABLE LEGEND BUTTONS                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs font-bold select-none">
        
        {/* 1. Solar Generation (+ Amber/Orange) */}
        <button
          type="button"
          onClick={() => setShowSolar(!showSolar)}
          className={`flex items-center gap-1.5 transition-all cursor-pointer ${showSolar ? 'opacity-100' : 'opacity-35'}`}
        >
          <div className="w-4 h-4 rounded-full bg-[#F59E0B] flex items-center justify-center text-black shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Solar (Amber)</span>
        </button>

        {/* 2. Grid Import (+ Blue) */}
        <button
          type="button"
          onClick={() => setShowGridImport(!showGridImport)}
          className={`flex items-center gap-1.5 transition-all cursor-pointer ${showGridImport ? 'opacity-100' : 'opacity-35'}`}
        >
          <div className="w-4 h-4 rounded-full bg-[#0284C7] flex items-center justify-center text-white shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Grid Import (Blue)</span>
        </button>

        {/* 3. Battery Discharge (+ Teal/Green) */}
        <button
          type="button"
          onClick={() => setShowBatteryDischarge(!showBatteryDischarge)}
          className={`flex items-center gap-1.5 transition-all cursor-pointer ${showBatteryDischarge ? 'opacity-100' : 'opacity-35'}`}
        >
          <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center text-white shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Battery Discharge (Green)</span>
        </button>

        {/* 4. Grid Export (- Dark Blue) */}
        <button
          type="button"
          onClick={() => setShowGridExport(!showGridExport)}
          className={`flex items-center gap-1.5 transition-all cursor-pointer ${showGridExport ? 'opacity-100' : 'opacity-35'}`}
        >
          <div className="w-4 h-4 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Grid Export (Dark Blue)</span>
        </button>

        {/* 5. Battery Charging (- Cyan) */}
        <button
          type="button"
          onClick={() => setShowBatteryCharge(!showBatteryCharge)}
          className={`flex items-center gap-1.5 transition-all cursor-pointer ${showBatteryCharge ? 'opacity-100' : 'opacity-35'}`}
        >
          <div className="w-4 h-4 rounded-full bg-[#06B6D4] flex items-center justify-center text-white shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Battery Charging (Cyan)</span>
        </button>

        {/* 6. Home Consumption (Dashed White Line) */}
        <button
          type="button"
          onClick={() => setShowConsumption(!showConsumption)}
          className={`flex items-center gap-1.5 transition-all cursor-pointer ${showConsumption ? 'opacity-100' : 'opacity-35'}`}
        >
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-black shadow-xs">
            <Check size={11} weight="bold" />
          </div>
          <span className="text-slate-800 dark:text-slate-200">Consumption (Dashed)</span>
        </button>

      </div>
    </div>
  );
}
