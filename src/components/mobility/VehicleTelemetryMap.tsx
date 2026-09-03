/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  NavigationArrow,
  Gauge as GaugeIcon,
  Globe,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Car,
  CheckCircle,
  Pulse
} from '@phosphor-icons/react';
import { CarEvMetrics } from '../../types/mobility';
import { LineChart } from '../charts/line-chart';
import { Line } from '../charts/line';
import { formatDecimal } from '../../utils/numberFormat';

interface VehicleTelemetryMapProps {
  metrics: CarEvMetrics;
  darkMode?: boolean;
}

export function VehicleTelemetryMap({
  metrics,
  darkMode = true
}: VehicleTelemetryMapProps) {
  const [zoomDelta, setZoomDelta] = useState<number>(0.007);
  const lat = metrics.gps?.latitude || 37.7749;
  const lon = metrics.gps?.longitude || -122.4194;

  const delta = Math.max(0.002, Math.min(0.04, zoomDelta));
  const latMin = lat - delta * 0.7;
  const latMax = lat + delta * 0.7;
  const lonMin = lon - delta;
  const lonMax = lon + delta;

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lonMin}%2C${latMin}%2C${lonMax}%2C${latMax}&layer=mapnik&marker=${lat}%2C${lon}`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  const handleZoomIn = () => setZoomDelta((prev) => Math.max(0.002, prev * 0.6));
  const handleZoomOut = () => setZoomDelta((prev) => Math.min(0.04, prev * 1.5));

  const tpms = metrics.tirePressure;

  // 24-hour speed data statistics
  const speedHistory = metrics.speedTimeseries || [];
  const peakSpeed = useMemo(() => {
    if (!speedHistory.length) return metrics.speed || 0;
    return Math.max(...speedHistory.map((p) => p.speed));
  }, [speedHistory, metrics.speed]);

  return (
    <div
      className={`w-full h-full rounded-3xl p-3.5 sm:p-7 backdrop-blur-2xl transition-all relative overflow-hidden flex flex-col justify-between gap-5 ${
        darkMode
          ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
          : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              darkMode ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-800'
            }`}
          >
            <NavigationArrow size={22} weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight uppercase">
              Location & Telemetry
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              GPS navigation & vehicle vitals
            </p>
          </div>
        </div>

        {/* Zone Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono shadow-xs ${
            darkMode
              ? 'bg-white/5 text-cyan-300'
              : 'bg-cyan-100 text-cyan-900'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <span>{metrics.locationZone}</span>
        </div>
      </div>

      {/* Interactive Mini-Map Frame with HUD */}
      <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md group">
        <iframe
          title="Vehicle Location Map"
          src={osmEmbedUrl}
          style={
            darkMode
              ? {
                  filter: 'invert(90%) hue-rotate(180deg) brightness(88%) contrast(98%)',
                }
              : {}
          }
          className="w-full h-full border-0 pointer-events-auto opacity-95 transition-opacity"
          loading="lazy"
        />

        {/* Map Top HUD */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-bold shadow-lg pointer-events-auto">
            <Globe size={13} weight="duotone" className="text-emerald-400 shrink-0" />
            <span className="font-mono text-[10px]">
              {lat.toFixed(4)}°, {lon.toFixed(4)}°
            </span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom In"
              className="w-7 h-7 rounded-lg bg-slate-950/85 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
            >
              <MagnifyingGlassPlus size={13} weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom Out"
              className="w-7 h-7 rounded-lg bg-slate-950/85 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
            >
              <MagnifyingGlassMinus size={13} weight="bold" />
            </button>
            <a
              href={osmDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase transition-colors shadow-md"
            >
              <span>Map</span>
              <NavigationArrow size={10} weight="bold" />
            </a>
          </div>
        </div>

        {/* Target Pinpoint Center Radar */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-cyan-500/30 animate-ping" />
            <span className="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-pulse" />
            <div className="relative w-8 h-8 rounded-full bg-cyan-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950">
              <Car size={16} weight="bold" />
            </div>
          </div>
        </div>

        {/* Bottom map footer */}
        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
          <div className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-[9px] font-mono text-slate-300">
            {metrics.lastRefreshed}
          </div>
        </div>
      </div>

      {/* 24-Hour Speed History Line Chart */}
      <div
        className={`p-4 rounded-2xl space-y-2 shadow-xs ${
          darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/90 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={`flex items-center gap-1.5 uppercase tracking-wider text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <Pulse size={15} weight="bold" className="text-cyan-500 animate-pulse" />
            <span>24-Hour Speed History</span>
          </span>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Peak: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{formatDecimal(peakSpeed)}</strong> {metrics.speedUnit}
            </span>
            <span className="text-slate-400">•</span>
            <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              Live: {formatDecimal(metrics.speed)} {metrics.speedUnit}
            </span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="w-full h-40 relative pt-1">
          <LineChart
            data={speedHistory}
            xDataKey="date"
            className="w-full h-full"
            margin={{ top: 8, right: 8, bottom: 20, left: 8 }}
          >
            <Line
              dataKey="speed"
              stroke={darkMode ? '#06B6D4' : '#0284C7'}
              strokeWidth={2.5}
            />
          </LineChart>
        </div>

        {/* Time labels below chart */}
        <div className={`flex items-center justify-between text-[10px] font-mono px-1 ${darkMode ? 'text-slate-500' : 'text-slate-500 font-semibold'}`}>
          <span>24h ago</span>
          <span>18h</span>
          <span>12h</span>
          <span>6h</span>
          <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Now</span>
        </div>
      </div>

      {/* 4-Corner Chassis Tire Pressure (TPMS) Visualization */}
      <div
        className={`p-4 rounded-2xl space-y-3 shadow-xs ${
          darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/90 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={`uppercase tracking-wider text-[10px] flex items-center gap-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <GaugeIcon size={14} weight="duotone" className="text-sky-500" />
            <span>Tire Pressure Monitor (TPMS)</span>
          </span>
          <span className={`font-mono text-[11px] flex items-center gap-1 font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
            <CheckCircle size={12} weight="fill" />
            <span>{tpms.status}</span>
          </span>
        </div>

        {/* 4-Wheel Visual Layout */}
        <div className="grid grid-cols-2 gap-2">
          {/* Front Left */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Front Left</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.frontLeft)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>

          {/* Front Right */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Front Right</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.frontRight)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>

          {/* Rear Left */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Rear Left</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.rearLeft)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>

          {/* Rear Right */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Rear Right</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.rearRight)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
