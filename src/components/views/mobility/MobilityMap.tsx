/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Globe, NavigationArrow, Car, Bicycle, MapPin, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCartoBasemap } from '../../../hooks/useCartoBasemap';
import { formatLastUpdated } from '../../../utils/dateFormat';

interface MobilityMapProps {
  latitude: number;
  longitude: number;
  title: string;
  type: 'car' | 'bike';
  speedKmh?: number;
  lastUpdated?: string;
  isMoving?: boolean;
  darkMode?: boolean;
  className?: string;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MobilityMap({
  latitude,
  longitude,
  title,
  type,
  speedKmh = 0,
  lastUpdated,
  isMoving = false,
  darkMode = true,
  className = ''
}: MobilityMapProps) {
  const [zoom, setZoom] = useState<number>(16);
  const { tileUrl, attribution, isCarto, cartoApiKey } = useCartoBasemap(darkMode);

  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;

  const handleZoomIn = () => setZoom((prev) => Math.min(19, prev + 1));
  const handleZoomOut = () => setZoom((prev) => Math.max(10, prev - 1));

  const markerIcon = useMemo(() => {
    const isCar = type === 'car';
    return L.divIcon({
      className: 'mobility-leaflet-marker',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(16, 185, 129, 0.25);"></span>
          <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background: #10b981; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #020617;">
            ${
              isCar
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M240,112H229.2L201.42,49.5A16,16,0,0,0,186.8,40H69.2a16,16,0,0,0-14.62,9.5L26.8,112H16a8,8,0,0,0,0,16h8v80a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16V192h96v16a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16V128h8a8,8,0,0,0,0-16ZM71.2,56H184.8l21.33,48H49.87ZM64,192H40V128H64Zm152,0H192V128h24Zm-16-48a12,12,0,1,1,12-12A12,12,0,0,1,200,144Zm-144,0a12,12,0,1,1,12-12A12,12,0,0,1,56,144Z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H176a8,8,0,0,0,0,16h20.7l-34.9,59.84A59.88,59.88,0,0,0,136,112a60.33,60.33,0,0,0-8.62.62L150,73.19a8,8,0,1,0-13.88-8L106.84,115.6a60,60,0,1,0,33.22,48.51L173.31,108l17,29.13A60,60,0,1,0,208,136a8,8,0,0,0,0-16,44,44,0,1,1,38.11,66,43.68,43.68,0,0,1-30.22-12.22l-23-39.49L216,94.63V104a8,8,0,0,0,16,0V48A8,8,0,0,0,216,40ZM60,204a44,44,0,1,1,44-44A44.05,44.05,0,0,1,60,204Z"/></svg>`
            }
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }, [type]);

  return (
    <div
      className={`relative w-full min-h-[220px] sm:min-h-[260px] rounded-2xl overflow-hidden border transition-all ${
        darkMode
          ? 'bg-[#0B0F19] border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
          : 'bg-slate-100 border-slate-200/80 shadow-md'
      } ${className}`}
    >
      {/* Map Tile Layer */}
      <div
        className={`w-full h-full min-h-[220px] sm:min-h-[260px] ${
          !isCarto && darkMode
            ? '[&_.leaflet-tile]:invert-[.9] [&_.leaflet-tile]:hue-rotate-180 [&_.leaflet-tile]:brightness-[.88] [&_.leaflet-tile]:contrast-[.98]'
            : ''
        }`}
      >
        <MapContainer
          center={[latitude, longitude]}
          zoom={zoom}
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full min-h-[220px] sm:min-h-[260px] z-0"
          style={{ width: '100%', height: '100%', minHeight: '220px' }}
        >
          {/* Key prop forces remount on theme/URL change */}
          <TileLayer attribution={attribution} key={tileUrl} url={tileUrl} />
          <Marker position={[latitude, longitude]} icon={markerIcon} />
          <MapController center={[latitude, longitude]} zoom={zoom} />
        </MapContainer>
      </div>

      {/* Top Controls Overlay HUD */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2 z-[400]">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold shadow-lg pointer-events-auto">
          <Globe size={14} weight="duotone" className="text-emerald-400 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[180px]">{title}</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider ${
              cartoApiKey
                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {cartoApiKey ? 'CARTO' : 'OSM'}
          </span>
          {isMoving && (
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase tracking-wider animate-pulse">
              {speedKmh} km/h
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom In"
            className="w-7 h-7 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
          >
            <MagnifyingGlassPlus size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="w-7 h-7 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
          >
            <MagnifyingGlassMinus size={13} weight="bold" />
          </button>
          <a
            href={osmDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in OpenStreetMap"
            className="h-7 px-2 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/30 text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors shadow-md"
          >
            <span>Live Map</span>
            <NavigationArrow size={11} weight="bold" />
          </a>
        </div>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2 z-[400]">
        <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 text-white backdrop-blur-md border border-white/15 text-[10px] font-mono shadow-md flex items-center gap-2">
          <span>{latitude.toFixed(4)}° N, {Math.abs(longitude).toFixed(4)}° {longitude >= 0 ? 'E' : 'W'}</span>
        </div>

        {lastUpdated && (
          <div className="px-2 py-1 rounded-xl bg-slate-950/80 text-slate-300 backdrop-blur-md border border-white/15 text-[10px] font-mono shadow-md truncate">
            {formatLastUpdated(lastUpdated)}
          </div>
        )}
      </div>
    </div>
  );
}
