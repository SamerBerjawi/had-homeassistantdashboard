/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';

// ---------------------------------------------------------------------------
// Smooth Bezier Curve Helper
// ---------------------------------------------------------------------------
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx = (p0.x + p1.x) / 2;
    d += ` C ${cpx.toFixed(1)} ${p0.y.toFixed(1)}, ${cpx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

function createAreaPath(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) return '';
  const linePath = createSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

function createStackedAreaPath(
  upperPoints: { x: number; y: number }[],
  lowerPoints: { x: number; y: number }[]
): string {
  if (upperPoints.length === 0 || lowerPoints.length === 0) return '';
  const topPath = createSmoothPath(upperPoints);
  let d = topPath;
  for (let i = lowerPoints.length - 1; i >= 0; i--) {
    d += ` L ${lowerPoints[i].x.toFixed(1)} ${lowerPoints[i].y.toFixed(1)}`;
  }
  d += ' Z';
  return d;
}

// ---------------------------------------------------------------------------
// 1. Minimalist Power Flow Chart
// Matches PowerSourcesChart.tsx exactly (stacking, gradients, contours, Home load overlay)
// ---------------------------------------------------------------------------
interface MinimalistPowerFlowChartProps {
  buckets: TransformedEnergyBucket[];
  darkMode?: boolean;
  className?: string;
  hasSolar?: boolean;
  hasGrid?: boolean;
  hasBattery?: boolean;
}

export function MinimalistPowerFlowChart({
  buckets = [],
  darkMode = true,
  className = '',
  hasSolar = true,
  hasGrid = true,
  hasBattery = true
}: MinimalistPowerFlowChartProps) {
  const width = 300;
  const height = 80;
  const paddingTop = 6;
  const paddingBottom = 6;
  const effectiveHeight = height - paddingTop - paddingBottom;

  const {
    solarPoints,
    gridImportPoints,
    batteryDischargePoints,
    batChargePoints,
    gridExportPoints,
    homePoints,
    baselinePoints,
    solarArea,
    gridImportArea,
    batDischargeArea,
    batChargeArea,
    gridExportArea,
    zeroY,
    hasNegative,
    hasActiveSolar,
    hasActiveGridImport,
    hasActiveGridExport,
    hasActiveBatDischarge,
    hasActiveBatCharge
  } = useMemo(() => {
    // Need at least 2 points; synthesize 24 slots if empty
    const dataList = buckets.length >= 2
      ? buckets
      : Array.from({ length: 24 }, () => ({
          solar: 0,
          homeConsumption: 0,
          gridImport: 0,
          gridExport: 0,
          batteryCharge: 0,
          batteryDischarge: 0
        }));

    // Find max positive stacked value (Solar + Grid Import + Battery Discharge)
    const maxPositive = Math.max(
      0.5,
      ...dataList.map((b) => {
        const s = hasSolar ? (b.solar || 0) : 0;
        const gi = hasGrid ? (b.gridImport || 0) : 0;
        const bd = hasBattery ? (b.batteryDischarge || 0) : 0;
        const hc = b.homeConsumption || 0;
        return Math.max(s + gi + bd, hc);
      })
    );

    // Find max negative stacked value (Battery Charge + Grid Export)
    const maxNegative = Math.max(
      0,
      ...dataList.map((b) => {
        const bc = hasBattery ? (b.batteryCharge || 0) : 0;
        const ge = hasGrid ? (b.gridExport || 0) : 0;
        return bc + ge;
      })
    );

    const hasNeg = maxNegative > 0.05;
    const totalSpan = hasNeg ? maxPositive + maxNegative : maxPositive;

    // Calculate vertical zero baseline
    const calculatedZeroY = hasNeg
      ? paddingTop + (maxPositive / totalSpan) * effectiveHeight
      : height - paddingBottom;

    const stepX = width / Math.max(1, dataList.length - 1);

    // Baseline points array
    const basePts = dataList.map((_, i) => ({ x: i * stepX, y: calculatedZeroY }));

    // Positive stack 1: Solar (stacked above baseline)
    const sPts = dataList.map((b, i) => {
      const s = hasSolar ? (b.solar || 0) : 0;
      const y = calculatedZeroY - (s / totalSpan) * effectiveHeight;
      return { x: i * stepX, y };
    });

    // Positive stack 2: Grid Import (stacked on top of Solar)
    const giPts = dataList.map((b, i) => {
      const s = hasSolar ? (b.solar || 0) : 0;
      const gi = hasGrid ? (b.gridImport || 0) : 0;
      const y = calculatedZeroY - ((s + gi) / totalSpan) * effectiveHeight;
      return { x: i * stepX, y };
    });

    // Positive stack 3: Battery Discharge (stacked on top of Grid Import)
    const bdPts = dataList.map((b, i) => {
      const s = hasSolar ? (b.solar || 0) : 0;
      const gi = hasGrid ? (b.gridImport || 0) : 0;
      const bd = hasBattery ? (b.batteryDischarge || 0) : 0;
      const y = calculatedZeroY - ((s + gi + bd) / totalSpan) * effectiveHeight;
      return { x: i * stepX, y };
    });

    // Negative stack 1: Battery Charge (stacked below baseline)
    const bcPts = dataList.map((b, i) => {
      const bc = hasBattery ? (b.batteryCharge || 0) : 0;
      const y = calculatedZeroY + (bc / totalSpan) * effectiveHeight;
      return { x: i * stepX, y };
    });

    // Negative stack 2: Grid Export (stacked below Battery Charge)
    const gePts = dataList.map((b, i) => {
      const bc = hasBattery ? (b.batteryCharge || 0) : 0;
      const ge = hasGrid ? (b.gridExport || 0) : 0;
      const y = calculatedZeroY + ((bc + ge) / totalSpan) * effectiveHeight;
      return { x: i * stepX, y };
    });

    // Unstacked Home Consumption overlay curve
    const hPts = dataList.map((b, i) => {
      const val = b.homeConsumption || 0;
      const y = calculatedZeroY - (val / totalSpan) * effectiveHeight;
      return { x: i * stepX, y };
    });

    return {
      solarPoints: sPts,
      gridImportPoints: giPts,
      batteryDischargePoints: bdPts,
      batChargePoints: bcPts,
      gridExportPoints: gePts,
      homePoints: hPts,
      baselinePoints: basePts,
      solarArea: createStackedAreaPath(sPts, basePts),
      gridImportArea: createStackedAreaPath(giPts, sPts),
      batDischargeArea: createStackedAreaPath(bdPts, giPts),
      batChargeArea: createStackedAreaPath(bcPts, basePts),
      gridExportArea: createStackedAreaPath(gePts, bcPts),
      zeroY: calculatedZeroY,
      hasNegative: hasNeg,
      hasActiveSolar: dataList.some((b) => (b.solar || 0) > 0.01),
      hasActiveGridImport: dataList.some((b) => (b.gridImport || 0) > 0.01),
      hasActiveGridExport: dataList.some((b) => (b.gridExport || 0) > 0.01),
      hasActiveBatDischarge: dataList.some((b) => (b.batteryDischarge || 0) > 0.01),
      hasActiveBatCharge: dataList.some((b) => (b.batteryCharge || 0) > 0.01)
    };
  }, [buckets, width, height, effectiveHeight, paddingTop, paddingBottom, hasSolar, hasGrid, hasBattery]);

  const uniqueId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  return (
    <div className={`w-full h-full relative overflow-hidden flex items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Solar Linear Gradient - exact match to PowerSourcesChart.tsx */}
          <linearGradient id={`pf-solar-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.88} />
            <stop offset="60%" stopColor="#d97706" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#b45309" stopOpacity={0.08} />
          </linearGradient>

          {/* Grid Import Linear Gradient (Sky Blue) - exact match */}
          <linearGradient id={`pf-grid-import-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity={0.88} />
            <stop offset="60%" stopColor="#0369a1" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#075985" stopOpacity={0.08} />
          </linearGradient>

          {/* Battery Discharge Linear Gradient (Emerald Green) - exact match */}
          <linearGradient id={`pf-bat-discharge-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.88} />
            <stop offset="60%" stopColor="#059669" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#047857" stopOpacity={0.08} />
          </linearGradient>

          {/* Battery Charge Linear Gradient (Cyan Negative Stack) - exact match */}
          <linearGradient id={`pf-bat-charge-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.08} />
            <stop offset="60%" stopColor="#0891b2" stopOpacity={0.50} />
            <stop offset="100%" stopColor="#164e63" stopOpacity={0.82} />
          </linearGradient>

          {/* Grid Export Linear Gradient (Indigo Negative Stack) - exact match */}
          <linearGradient id={`pf-grid-export-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.08} />
            <stop offset="60%" stopColor="#4f46e5" stopOpacity={0.50} />
            <stop offset="100%" stopColor="#312e81" stopOpacity={0.82} />
          </linearGradient>
        </defs>

        {/* Zero Baseline Reference Line */}
        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke={darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
          strokeWidth="1.5"
          strokeDasharray={hasNegative ? '3 3' : undefined}
        />

        {/* NEGATIVE STACK AREAS (Fill only) */}
        {hasBattery && hasActiveBatCharge && (
          <path d={batChargeArea} fill={`url(#pf-bat-charge-${uniqueId})`} />
        )}
        {hasGrid && hasActiveGridExport && (
          <path d={gridExportArea} fill={`url(#pf-grid-export-${uniqueId})`} />
        )}

        {/* POSITIVE STACK AREAS (Fill only) */}
        {hasSolar && hasActiveSolar && (
          <path d={solarArea} fill={`url(#pf-solar-${uniqueId})`} />
        )}
        {hasGrid && hasActiveGridImport && (
          <path d={gridImportArea} fill={`url(#pf-grid-import-${uniqueId})`} />
        )}
        {hasBattery && hasActiveBatDischarge && (
          <path d={batDischargeArea} fill={`url(#pf-bat-discharge-${uniqueId})`} />
        )}

        {/* ACTIVE FLOW CONTOUR LINES - exact matching strokeWidth and colors */}
        {hasSolar && hasActiveSolar && (
          <path
            d={createSmoothPath(solarPoints)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hasGrid && hasActiveGridImport && (
          <path
            d={createSmoothPath(gridImportPoints)}
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hasBattery && hasActiveBatDischarge && (
          <path
            d={createSmoothPath(batteryDischargePoints)}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hasBattery && hasActiveBatCharge && (
          <path
            d={createSmoothPath(batChargePoints)}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hasGrid && hasActiveGridExport && (
          <path
            d={createSmoothPath(gridExportPoints)}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* HOME CONSUMPTION OVERLAY LINE (exact match to PowerSourcesChart.tsx) */}
        <path
          d={createSmoothPath(homePoints)}
          fill="none"
          stroke={darkMode ? 'rgba(255, 255, 255, 0.85)' : '#334155'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Minimalist Energy Usage & Return Chart
// Matches EnergyUsageGraphCard.tsx exactly:
// Positive consumption bars (Amber=Solar, Emerald=Battery, Sky=Grid)
// Negative return bars (Indigo=Grid Export, Teal=Battery Charge)
// ---------------------------------------------------------------------------
interface MinimalistEnergyUsageChartProps {
  buckets: TransformedEnergyBucket[];
  darkMode?: boolean;
  className?: string;
}

export function MinimalistEnergyUsageChart({
  buckets = [],
  darkMode = true,
  className = ''
}: MinimalistEnergyUsageChartProps) {
  const width = 300;
  const height = 80;
  const paddingTop = 6;
  const paddingBottom = 6;
  const effectiveHeight = height - paddingTop - paddingBottom;

  const { bars, zeroY, hasNegative } = useMemo(() => {
    // 24 hourly buckets
    const list = buckets.length > 0
      ? buckets.slice(-24)
      : Array.from({ length: 24 }, () => ({
          homeConsumption: 0,
          gridImport: 0,
          gridExport: 0,
          solarToHome: 0,
          batteryToHome: 0,
          gridToHome: 0,
          batteryCharge: 0
        }));

    const maxPositive = Math.max(
      0.5,
      ...list.map((b) => {
        const total = (b.solarToHome || 0) + (b.batteryToHome || 0) + (b.gridToHome || 0);
        return Math.max(total, b.homeConsumption || 0);
      })
    );

    const maxNegative = Math.max(
      0,
      ...list.map((b) => (b.gridExport || 0) + (b.batteryCharge || 0))
    );

    const hasNeg = maxNegative > 0.05;
    const totalSpan = hasNeg ? maxPositive + maxNegative : maxPositive;

    const calculatedZeroY = hasNeg
      ? paddingTop + (maxPositive / totalSpan) * effectiveHeight
      : height - paddingBottom;

    const slotWidth = width / list.length;
    const barWidth = Math.max(2.5, slotWidth * 0.65);
    const gap = (slotWidth - barWidth) / 2;

    const barItems = list.map((b, i) => {
      // Positive breakdown matching EnergyUsageGraphCard.tsx
      let solarPart = b.solarToHome || 0;
      let batPart = b.batteryToHome || 0;
      let gridPart = b.gridToHome || 0;
      let totalPos = solarPart + batPart + gridPart;

      if (totalPos === 0 && (b.homeConsumption || 0) > 0) {
        totalPos = b.homeConsumption;
        gridPart = b.homeConsumption;
      }

      const hTotalPos = (totalPos / totalSpan) * effectiveHeight;
      const hSolar = totalPos > 0 ? (solarPart / totalPos) * hTotalPos : 0;
      const hBat = totalPos > 0 ? (batPart / totalPos) * hTotalPos : 0;
      const hGrid = totalPos > 0 ? (gridPart / totalPos) * hTotalPos : 0;

      // Negative breakdown matching EnergyUsageGraphCard.tsx
      const exportPart = b.gridExport || 0;
      const chargePart = b.batteryCharge || 0;
      const totalNeg = exportPart + chargePart;

      const hTotalNeg = (totalNeg / totalSpan) * effectiveHeight;
      const hExport = totalNeg > 0 ? (exportPart / totalNeg) * hTotalNeg : 0;
      const hCharge = totalNeg > 0 ? (chargePart / totalNeg) * hTotalNeg : 0;

      const x = i * slotWidth + gap;

      return {
        x,
        barWidth,
        totalPos,
        totalNeg,
        hTotalPos: Math.max(totalPos > 0 ? 3 : 0, hTotalPos),
        hSolar,
        hBat,
        hGrid,
        hTotalNeg: Math.max(totalNeg > 0 ? 3 : 0, hTotalNeg),
        hExport,
        hCharge
      };
    });

    return {
      bars: barItems,
      zeroY: calculatedZeroY,
      hasNegative: hasNeg
    };
  }, [buckets, width, height, effectiveHeight, paddingTop, paddingBottom]);

  return (
    <div className={`w-full h-full relative overflow-hidden flex items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        {/* Zero Baseline Divider */}
        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke={darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}
          strokeWidth="1.2"
        />

        {bars.map((bar, i) => {
          const rx = Math.min(bar.barWidth / 2, 2.5);

          return (
            <g key={i}>
              {/* Positive Stacked Bar: Extends UPWARDS from zeroY */}
              {bar.totalPos > 0 && (
                <g>
                  {/* Clip path for rounded top of positive bar */}
                  <clipPath id={`pos-clip-${i}`}>
                    <rect
                      x={bar.x}
                      y={zeroY - bar.hTotalPos}
                      width={bar.barWidth}
                      height={bar.hTotalPos}
                      rx={rx}
                    />
                  </clipPath>
                  <g clipPath={`url(#pos-clip-${i})`}>
                    {/* Solar to Home: Amber #f59e0b */}
                    {bar.hSolar > 0 && (
                      <rect
                        x={bar.x}
                        y={zeroY - bar.hSolar}
                        width={bar.barWidth}
                        height={bar.hSolar}
                        fill="#f59e0b"
                      />
                    )}
                    {/* Battery to Home: Emerald #10b981 */}
                    {bar.hBat > 0 && (
                      <rect
                        x={bar.x}
                        y={zeroY - bar.hSolar - bar.hBat}
                        width={bar.barWidth}
                        height={bar.hBat}
                        fill="#10b981"
                      />
                    )}
                    {/* Grid Import to Home: Sky #38bdf8 */}
                    {bar.hGrid > 0 && (
                      <rect
                        x={bar.x}
                        y={zeroY - bar.hSolar - bar.hBat - bar.hGrid}
                        width={bar.barWidth}
                        height={bar.hGrid}
                        fill="#38bdf8"
                      />
                    )}
                  </g>
                </g>
              )}

              {/* Negative Stacked Bar: Extends DOWNWARDS from zeroY */}
              {bar.totalNeg > 0 && (
                <g>
                  {/* Clip path for rounded bottom of negative bar */}
                  <clipPath id={`neg-clip-${i}`}>
                    <rect
                      x={bar.x}
                      y={zeroY}
                      width={bar.barWidth}
                      height={bar.hTotalNeg}
                      rx={rx}
                    />
                  </clipPath>
                  <g clipPath={`url(#neg-clip-${i})`}>
                    {/* Grid Export: Indigo #818cf8 */}
                    {bar.hExport > 0 && (
                      <rect
                        x={bar.x}
                        y={zeroY}
                        width={bar.barWidth}
                        height={bar.hExport}
                        fill="#818cf8"
                      />
                    )}
                    {/* Battery Charge: Teal #2dd4bf */}
                    {bar.hCharge > 0 && (
                      <rect
                        x={bar.x}
                        y={zeroY + bar.hExport}
                        width={bar.barWidth}
                        height={bar.hCharge}
                        fill="#2dd4bf"
                      />
                    )}
                  </g>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Minimalist Solar Production & Forecast Chart
// Matches SolarProductionGraphCard.tsx exactly:
// Amber gradient hourly bars (#d97706 to #fbbf24) + Striped forecast line (#94a3b8 / #64748b)
// ---------------------------------------------------------------------------
interface MinimalistSolarProductionChartProps {
  buckets: TransformedEnergyBucket[];
  forecastTotal?: number;
  darkMode?: boolean;
  className?: string;
}

export function MinimalistSolarProductionChart({
  buckets = [],
  forecastTotal,
  darkMode = true,
  className = ''
}: MinimalistSolarProductionChartProps) {
  const width = 300;
  const height = 80;
  const paddingBottom = 6;
  const paddingTop = 6;
  const effectiveHeight = height - paddingTop - paddingBottom;

  const { bars, forecastPoints } = useMemo(() => {
    const list = buckets.length > 0
      ? buckets.slice(-24)
      : Array.from({ length: 24 }, () => ({
          solar: 0,
          solarForecast: null
        }));

    // Find peak between solar and forecast
    let maxVal = 0.5;
    list.forEach((b) => {
      if ((b.solar || 0) > maxVal) maxVal = b.solar;
      if ((b.solarForecast || 0) > maxVal) maxVal = b.solarForecast!;
    });

    const slotWidth = width / list.length;
    const barWidth = Math.max(2.5, slotWidth * 0.65);
    const gap = (slotWidth - barWidth) / 2;

    const barItems = list.map((b, i) => {
      const solar = b.solar || 0;
      const barH = (solar / maxVal) * effectiveHeight;
      const x = i * slotWidth + gap;
      const y = height - paddingBottom - barH;

      return {
        x,
        barWidth,
        height: Math.max(solar > 0 ? 3 : 0, barH),
        y: height - paddingBottom - Math.max(solar > 0 ? 3 : 0, barH),
        hasSolar: solar > 0.005
      };
    });

    // Striped forecast line points: matching SolarProductionGraphCard
    const stepX = width / Math.max(1, list.length - 1);
    const fPts = list.map((b, i) => {
      let val = b.solarForecast;
      if (val === null || val === undefined) {
        if (forecastTotal && forecastTotal > 0) {
          const center = 12.5;
          const sigma = 3.5;
          const dist = Math.abs(i - center);
          val = (forecastTotal / 6) * Math.exp(-(dist * dist) / (2 * sigma * sigma));
        } else {
          val = 0;
        }
      }
      const y = height - paddingBottom - (val / maxVal) * effectiveHeight;
      return { x: i * stepX, y };
    });

    return {
      bars: barItems,
      forecastPoints: fPts
    };
  }, [buckets, forecastTotal, width, height, effectiveHeight, paddingTop, paddingBottom]);

  const uniqueId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  return (
    <div className={`w-full h-full relative overflow-hidden flex items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Solar Bar Gradient - exact match to SolarProductionGraphCard from-amber-600 to-amber-400 */}
          <linearGradient id={`solar-bar-${uniqueId}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Baseline Divider */}
        <line
          x1="0"
          y1={height - paddingBottom}
          x2={width}
          y2={height - paddingBottom}
          stroke={darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
          strokeWidth="1"
        />

        {/* 24 Hourly Production Bars - exact match */}
        {bars.map((bar, i) => (
          bar.hasSolar ? (
            <rect
              key={i}
              x={bar.x}
              y={bar.y}
              width={bar.barWidth}
              height={bar.height}
              rx={Math.min(bar.barWidth / 2, 2.5)}
              fill={`url(#solar-bar-${uniqueId})`}
            />
          ) : null
        ))}

        {/* Continuous Striped Forecast Line - exact match to SolarProductionGraphCard */}
        <path
          d={createSmoothPath(forecastPoints)}
          fill="none"
          stroke={darkMode ? '#94a3b8' : '#64748b'}
          strokeWidth="2.2"
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

