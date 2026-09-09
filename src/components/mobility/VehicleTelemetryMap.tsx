/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  NavigationArrow,
  Gauge as GaugeIcon,
  Globe,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CheckCircle,
  Pulse
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CarEvMetrics } from '../../types/mobility';
import { LineChart } from '../charts/line-chart';
import { Line } from '../charts/line';
import { formatDecimal } from '../../utils/numberFormat';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { haWebSocketService } from '../../services/haWebSocket';
import { useUserConfig } from '../../contexts/ConfigContext';
import { formatLastUpdated } from '../../utils/dateFormat';

interface VehicleTelemetryMapProps {
  metrics: CarEvMetrics;
  darkMode?: boolean;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function VehicleTelemetryMap({
  metrics,
  darkMode = true
}: VehicleTelemetryMapProps) {
  const { config } = useUserConfig();
  const cartoApiKey = config.cartoApiKey?.trim();
  const isDarkMode = darkMode;

  let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  if (cartoApiKey) {
    tileUrl = isDarkMode
      ? `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`
      : `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${cartoApiKey}`;
    attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  }

  const [zoom, setZoom] = useState<number>(16);

  const resolvedZones = useAutoLayoutStore((s) => s.resolvedZones);
  const homeZone = resolvedZones?.find(
    (z) => z.entity_id === 'zone.home' || z.name?.toLowerCase() === 'home'
  );
  const isDemo = haWebSocketService.isDemo();
  const fallbackLat = homeZone?.latitude ?? (isDemo ? 37.7749 : undefined);
  const fallbackLon = homeZone?.longitude ?? (isDemo ? -122.4194 : undefined);
  const lat = metrics.gps?.latitude ?? fallbackLat;
  const lon = metrics.gps?.longitude ?? fallbackLon;
  const hasGps = lat !== undefined && lon !== undefined;

  const osmDirectUrl = hasGps
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`
    : '';

  const handleZoomIn = () => setZoom((prev) => Math.min(19, prev + 1));
  const handleZoomOut = () => setZoom((prev) => Math.max(10, prev - 1));

  const vehicleMarkerIcon = useMemo(() => {
    return L.divIcon({
      className: 'vehicle-leaflet-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(6, 182, 212, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(6, 182, 212, 0.25);"></span>
          <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #020617;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M240,112H229.2L201.42,49.5A16,16,0,0,0,186.8,40H69.2a16,16,0,0,0-14.62,9.5L26.8,112H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V192h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V128h8a8,8,0,0,0,0-16ZM71.2,56H184.8l21.33,48H49.87ZM64,192H40V128H64Zm152,0H192V128h24Zm-16-48a12,12,0,1,1,12-12A12,12,0,0,1,200,144Zm-144,0a12,12,0,1,1,12-12A12,12,0,0,1,56,144Z" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }, []);

  const tpms = metrics.tirePressure;

  // 24-hour speed data statistics
  const speedHistory = metrics.speedTimeseries || [];
  const peakSpeed = useMemo(() => {
    if (!speedHistory.length) return metrics.speed;
    return Math.max(...speedHistory.map((p) => p.speed));
  }, [speedHistory, metrics.speed]);

  return (
    <div
      className={`w-full h-full rounded-3xl p-3.5 sm:p-7 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all relative overflow-hidden flex flex-col justify-between gap-5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
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
      {hasGps && lat !== undefined && lon !== undefined ? (
        <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md group border border-slate-200/50 dark:border-white/10">
          <div
            className={`w-full h-full ${
              !cartoApiKey && isDarkMode
                ? '[&_.leaflet-tile]:invert-[.9] [&_.leaflet-tile]:hue-rotate-180 [&_.leaflet-tile]:brightness-[.88] [&_.leaflet-tile]:contrast-[.98]'
                : ''
            }`}
          >
            <MapContainer
              center={[lat, lon]}
              zoom={zoom}
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full z-0"
              style={{ width: '100%', height: '100%' }}
            >
              {/* The 'key' prop is mandatory to force a remount when the URL changes */}
              <TileLayer attribution={attribution} key={tileUrl} url={tileUrl} />
              <Marker position={[lat, lon]} icon={vehicleMarkerIcon} />
              <MapController center={[lat, lon]} zoom={zoom} />
            </MapContainer>
          </div>

          {/* Map Top HUD */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2 z-[400]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-bold shadow-lg pointer-events-auto">
              <Globe size={13} weight="duotone" className="text-emerald-400 shrink-0" />
              <span className="font-mono text-[10px]">
                {lat.toFixed(4)}°, {lon.toFixed(4)}°
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  cartoApiKey
                    ? 'bg-sky-500/25 text-sky-300 border border-sky-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {cartoApiKey ? 'CARTO' : 'OSM'}
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

          {/* Bottom map footer */}
          <div className="absolute bottom-2.5 left-2.5 z-[400] pointer-events-none">
            <div className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-[9px] font-mono text-slate-300">
              {formatLastUpdated(metrics.lastRefreshed)}
            </div>
          </div>
        </div>
      ) : (
        <div className={`relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md flex flex-col items-center justify-center p-6 text-center border ${
          darkMode ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-slate-100/60 border-slate-200 text-slate-500'
        }`}>
          <Globe size={32} weight="duotone" className="mb-2 opacity-60 text-slate-400" />
          <span className="text-xs font-bold">GPS Coordinates Unavailable</span>
          <span className="text-[11px] opacity-75 mt-1">No GPS telemetry received from vehicle or Home zone.</span>
        </div>
      )}

      {/* 24-Hour Speed History Line Chart */}
      <div
        className={`p-4 rounded-2xl space-y-2 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={`flex items-center gap-1.5 uppercase tracking-wider text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <Pulse size={15} weight="bold" className="text-cyan-500 animate-pulse" />
            <span>24-Hour Speed History</span>
          </span>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Peak: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{peakSpeed !== undefined ? formatDecimal(peakSpeed) : '--'}</strong> {metrics.speedUnit}
            </span>
            <span className="text-slate-400">•</span>
            <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              Live: {metrics.speed !== undefined ? formatDecimal(metrics.speed) : '--'} {metrics.speedUnit}
            </span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="w-full h-40 relative pt-1 flex items-center justify-center">
          {speedHistory.length > 0 ? (
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
          ) : (
            <div className={`text-xs font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No speed history recorded
            </div>
          )}
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
        className={`p-4 rounded-2xl space-y-3 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
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
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-slate-900'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Front Left</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.frontLeft)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>

          {/* Front Right */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-slate-900'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Front Right</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.frontRight)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>

          {/* Rear Left */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-slate-900'}`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Rear Left</div>
            <div className={`font-mono text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatDecimal(tpms.rearLeft)} <span className="text-[10px] text-slate-400 font-normal">{tpms.unit}</span>
            </div>
          </div>

          {/* Rear Right */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between shadow-xs ${darkMode ? 'bg-white/10 text-white' : 'bg-white/60 text-slate-900'}`}>
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
