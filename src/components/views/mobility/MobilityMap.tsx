/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Globe, NavigationArrow, Car, Bicycle, MapPin, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';

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
  const [zoomOffset, setZoomOffset] = useState<number>(0.008);

  const delta = Math.max(0.002, Math.min(0.05, zoomOffset));
  const latMin = latitude - delta * 0.7;
  const latMax = latitude + delta * 0.7;
  const lonMin = longitude - delta;
  const lonMax = longitude + delta;

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lonMin}%2C${latMin}%2C${lonMax}%2C${latMax}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  const handleZoomIn = () => setZoomOffset((prev) => Math.max(0.002, prev * 0.6));
  const handleZoomOut = () => setZoomOffset((prev) => Math.min(0.04, prev * 1.5));

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border transition-all ${
      darkMode 
        ? 'bg-[#0B0F19] border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]' 
        : 'bg-slate-100 border-slate-200/80 shadow-md'
    } ${className}`}>
      {/* Embedded Map Frame */}
      <iframe
        title={`OpenStreetMap for ${title}`}
        src={osmEmbedUrl}
        style={
          darkMode
            ? {
                filter: 'invert(90%) hue-rotate(180deg) brightness(88%) contrast(98%)',
              }
            : {}
        }
        className="w-full h-full min-h-[220px] sm:min-h-[260px] border-0 pointer-events-auto opacity-95 hover:opacity-100 transition-opacity"
        loading="lazy"
      />

      {/* Top Controls Overlay HUD */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold shadow-lg pointer-events-auto">
          <Globe size={14} weight="duotone" className="text-emerald-400 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[180px]">{title}</span>
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

      {/* Pinpoint Center Target Radar */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute w-10 h-10 rounded-full bg-emerald-500/30 animate-ping" />
          <span className="absolute w-6 h-6 rounded-full bg-emerald-500/20 animate-pulse" />
          <div className="relative w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950">
            {type === 'car' ? (
              <Car size={16} weight="bold" />
            ) : type === 'bike' ? (
              <Bicycle size={16} weight="bold" />
            ) : (
              <MapPin size={16} weight="bold" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2">
        <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 text-white backdrop-blur-md border border-white/15 text-[10px] font-mono shadow-md flex items-center gap-2">
          <span>{latitude.toFixed(4)}° N, {Math.abs(longitude).toFixed(4)}° {longitude >= 0 ? 'E' : 'W'}</span>
        </div>

        {lastUpdated && (
          <div className="px-2 py-1 rounded-xl bg-slate-950/80 text-slate-300 backdrop-blur-md border border-white/15 text-[10px] font-mono shadow-md truncate">
            {lastUpdated}
          </div>
        )}
      </div>
    </div>
  );
}
