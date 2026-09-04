/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RobotVacuumTab Component
 * Panoramic glassmorphism command center for Dreame and robotic vacuums,
 * featuring real-time controls, multi-floor maps, and maintenance consumables.
 */

import React, { useState, useRef } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  Sparkle,
  SpeakerHigh,
  NavigationArrow,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Fan,
  Drop,
  Wrench,
  CheckCircle,
  WarningCircle,
  MapTrifold,
  Clock,
  Gauge,
  ArrowsClockwise,
  CornersOut,
  Camera,
  Trash
} from '@phosphor-icons/react';
import { VacuumDeviceData, VacuumMapItem } from '../../../types/vacuum';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';
import { useHAImage } from '../../../services/haImageService';
import { useUserConfig } from '../../../contexts/ConfigContext';
import { optimizeImageForUpload } from '../../../utils/imageOptimizer';

interface RobotVacuumTabProps {
  vacuums: VacuumDeviceData[];
  darkMode?: boolean;
}

export const RobotVacuumTab: React.FC<RobotVacuumTabProps> = ({
  vacuums,
  darkMode = true
}) => {
  const { callHAService } = useAutoLayoutStore();
  const { openEntityDetails } = useEntityPopup();
  const { config, updateConfig, uploadVehicleAsset } = useUserConfig();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localImage, setLocalImage] = useState<string | null>(() => {
    return localStorage.getItem('had_robot_vacuum_image') || null;
  });

  const robotImage = localImage || config.vacuums?.robotImageUrl || config.vacuums?.robot?.imageUrl;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeImageForUpload(file, {
        maxDimension: 1200,
        maxSizeBytes: 1.5 * 1024 * 1024
      });
      localStorage.setItem('had_robot_vacuum_image', optimized.dataUrl);
      setLocalImage(optimized.dataUrl);
      await uploadVehicleAsset(optimized.dataUrl, 'robot_vacuum_image');
    } catch (err) {
      console.error('Failed to upload robot vacuum image:', err);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('had_robot_vacuum_image');
    setLocalImage(null);
    updateConfig((prev) => ({
      vacuums: {
        ...(prev.vacuums || {}),
        robotImageUrl: undefined,
        robot: { ...(prev.vacuums?.robot || {}), imageUrl: undefined }
      }
    }));
  };

  const [selectedVacuumId, setSelectedVacuumId] = useState<string>(vacuums[0]?.entityId || '');
  const [isOperating, setIsOperating] = useState<string | null>(null);

  const activeVacuum = vacuums.find((v) => v.entityId === selectedVacuumId) || vacuums[0];

  // Multi-Map Toggle state
  const availableMaps: VacuumMapItem[] =
    activeVacuum?.availableMaps && activeVacuum.availableMaps.length > 0
      ? activeVacuum.availableMaps
      : [];

  const [selectedMapId, setSelectedMapId] = useState<string>(availableMaps[0]?.id || '');
  const activeMap = availableMaps.find((m) => m.id === selectedMapId) || availableMaps[0];

  // Resolve authenticated image for camera/image entities
  const { imageUrl: resolvedMapUrl, isLoading: isMapLoading } = useHAImage(activeMap?.imageUrl);

  const isCleaning = activeVacuum?.state === 'cleaning';
  const isReturning = activeVacuum?.state === 'returning';
  const isPaused = activeVacuum?.state === 'paused';
  const isDocked = activeVacuum?.state === 'docked';
  const isError = activeVacuum?.state === 'error';

  // Quick Service Handlers
  const handleVacuumService = async (service: string, extraData: Record<string, any> = {}) => {
    if (!activeVacuum) return;
    setIsOperating(service);
    try {
      await callHAService('vacuum', service, extraData, { entity_id: activeVacuum.entityId });
    } catch (e) {
      console.error(`Failed to call vacuum ${service}:`, e);
    } finally {
      setTimeout(() => setIsOperating(null), 1200);
    }
  };

  const setFanSpeed = (speed: string) => {
    handleVacuumService('set_fan_speed', { fan_speed: speed });
  };

  const getBatteryIcon = (pct: number) => {
    if (pct >= 80) return BatteryFull;
    if (pct >= 40) return BatteryMedium;
    return BatteryLow;
  };

  const BatteryIcon = getBatteryIcon(activeVacuum?.batteryLevel || 100);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start animate-fadeIn">
      {/* ========================================================================= */}
      {/* COLUMN 1: Controls & Cockpit (Hero, Battery, Action Dock, Speeds)        */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
        <div className="relative p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Ambient Glow with corner containment */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
            style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
          >
            <div
              className={`absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl opacity-25 transition-all duration-700 ${isCleaning
                  ? 'bg-emerald-500'
                  : isReturning
                    ? 'bg-cyan-500'
                    : isError
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                }`}
            />
          </div>

          {/* Section Header with Robot Image in Top Right Corner */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                  <Broom size={18} weight="duotone" />
                </div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                  {activeVacuum?.name || 'Robot Vacuum'}
                </h2>
              </div>

              {/* Live State Badge */}
              <div className="inline-flex items-center">
                <div
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xs ${isCleaning
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 animate-pulse'
                      : isReturning
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/40'
                        : isError
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isCleaning
                        ? 'bg-emerald-500 animate-ping'
                        : isError
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                  />
                  <span className="capitalize">{activeVacuum?.statusText || 'Docked'}</span>
                </div>
              </div>
            </div>

            {/* Top Right Corner Image & Upload Option */}
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {robotImage ? (
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/30 dark:bg-black/40 border border-slate-200/50 dark:border-white/10 shadow-xs overflow-hidden flex items-center justify-center">
                  <img
                    src={robotImage}
                    alt="Robot Vacuum"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                      title="Change image"
                    >
                      <Camera size={15} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash size={15} weight="bold" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-sky-500 dark:hover:border-sky-400 bg-white/10 dark:bg-black/20 hover:bg-sky-500/5 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer p-1 group"
                  title="Upload Robot Vacuum Image"
                >
                  <Camera size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Upload</span>
                </button>
              )}
            </div>
          </div>

          {/* Multiple Robot Switcher (if user has > 1 robot) */}
          {vacuums.length > 1 && (
            <div className="relative z-10 flex items-center gap-1 p-1 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm">
              {vacuums.map((vac) => (
                <button
                  key={vac.entityId}
                  type="button"
                  onClick={() => setSelectedVacuumId(vac.entityId)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${vac.entityId === selectedVacuumId
                      ? 'bg-sky-500 text-slate-950 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {vac.name}
                </button>
              ))}
            </div>
          )}

          {/* Battery & Charging Card */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-all ${activeVacuum?.batteryCharging
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-cyan-500/20 text-cyan-500'
                  }`}
              >
                {activeVacuum?.batteryCharging ? (
                  <BatteryCharging size={26} weight="duotone" className="animate-pulse" />
                ) : (
                  <BatteryIcon size={26} weight="duotone" />
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {activeVacuum?.batteryLevel ?? 100}%
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {activeVacuum?.batteryCharging ? 'Charging' : 'Battery'}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-16 flex flex-col gap-1 items-end">
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${(activeVacuum?.batteryLevel || 100) > 50
                      ? 'bg-emerald-500'
                      : (activeVacuum?.batteryLevel || 100) > 20
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  style={{ width: `${activeVacuum?.batteryLevel || 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                {activeVacuum?.areaName || 'Home'}
              </span>
            </div>
          </div>

          {/* Primary Action Dock */}
          <div className="relative z-10 grid grid-cols-4 gap-2">
            {/* Action 1: Play / Pause */}
            <button
              type="button"
              onClick={() => handleVacuumService(isCleaning ? 'pause' : 'start')}
              disabled={isOperating !== null}
              className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${isCleaning
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black'
                }`}
            >
              {isCleaning ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
              <span className="text-[10px] font-black">{isCleaning ? 'Pause' : 'Clean'}</span>
            </button>

            {/* Action 2: Return to Dock */}
            <button
              type="button"
              onClick={() => handleVacuumService('return_to_base')}
              disabled={isOperating !== null || isDocked}
              className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${isDocked
                  ? 'bg-white/10 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                  : 'bg-white/20 dark:bg-white/10 hover:bg-white/30 text-slate-900 dark:text-white'
                }`}
            >
              <ArrowArcLeft size={18} weight="bold" />
              <span className="text-[10px] font-bold">Dock</span>
            </button>

            {/* Action 3: Spot Clean */}
            <button
              type="button"
              onClick={() => handleVacuumService('clean_spot')}
              disabled={isOperating !== null}
              className="py-3 px-2 rounded-2xl bg-white/20 dark:bg-white/10 hover:bg-white/30 text-slate-900 dark:text-white flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Sparkle size={18} weight="bold" />
              <span className="text-[10px] font-bold">Spot</span>
            </button>

            {/* Action 4: Locate */}
            <button
              type="button"
              onClick={() => handleVacuumService('locate')}
              disabled={isOperating !== null}
              className="py-3 px-2 rounded-2xl bg-white/20 dark:bg-white/10 hover:bg-white/30 text-slate-900 dark:text-white flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <SpeakerHigh size={18} weight="bold" />
              <span className="text-[10px] font-bold">Locate</span>
            </button>
          </div>

          {/* Suction Speed Selector */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Fan size={13} weight="bold" />
                <span>Suction Fan Power</span>
              </span>
              <span className="font-mono font-bold text-sky-500 text-[11px]">
                {activeVacuum?.fanSpeed || 'Balanced'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm">
              {(activeVacuum?.fanSpeedList || ['Quiet', 'Balanced', 'Turbo', 'Max']).map((spd) => {
                const isSelected = (activeVacuum?.fanSpeed || 'Balanced').toLowerCase() === spd.toLowerCase();
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setFanSpeed(spd)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${isSelected
                        ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {spd}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cleaning Session Telemetry HUD */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                <Gauge size={16} weight="bold" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Area Cleaned
                </span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {activeVacuum?.cleanedAreaM2 ? `${activeVacuum.cleanedAreaM2} m²` : '—'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Clock size={16} weight="bold" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Clean Duration
                </span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {activeVacuum?.cleaningTimeMinutes ? `${activeVacuum.cleaningTimeMinutes} min` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: Live Multi-Floor Cleaning Map                                   */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
        <div className="relative p-3 sm:p-4 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-3 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
            style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
          >
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          </div>

          {/* Section Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                <MapTrifold size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Cleaning Map
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => activeVacuum && openEntityDetails(activeVacuum.entityId)}
              className="p-2 rounded-xl bg-white/20 dark:bg-white/10 hover:bg-white/30 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
              title="Full map controls"
            >
              <CornersOut size={14} weight="bold" />
            </button>
          </div>

          {/* Floor / Map Switcher Pills */}
          {availableMaps.length > 1 && (
            <div className="relative z-10 flex items-center gap-1 p-1 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm overflow-x-auto scrollbar-none">
              {availableMaps.map((mapItem) => {
                const isMapActive = mapItem.id === selectedMapId;
                return (
                  <button
                    key={mapItem.id}
                    type="button"
                    onClick={() => setSelectedMapId(mapItem.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${isMapActive
                        ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {mapItem.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Map Viewer Canvas - Doubled Size */}
          <div className="relative z-10 w-full h-[520px] sm:h-[580px] min-h-[460px] rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 bg-transparent flex items-center justify-center p-0">
            {resolvedMapUrl ? (
              <img
                src={resolvedMapUrl}
                alt={activeMap?.name || 'Cleaning Map'}
                className="w-full h-full object-contain filter contrast-105 p-0"
              />
            ) : (
              /* Fallback Styled LiDAR Map Canvas */
              <div className="w-full h-full relative flex items-center justify-center bg-transparent p-0">
                {/* Floorplan grid lines */}
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* SVG Mock Floorplan Path */}
                <svg viewBox="0 0 200 150" className="w-full h-full opacity-60">
                  <rect x="20" y="20" width="160" height="110" rx="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 30 35 L 150 35 L 150 55 L 40 55 L 40 75 L 160 75 L 160 95 L 30 95 L 30 115 L 140 115" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                  <circle cx="140" cy="115" r="4" fill="#38bdf8" />
                </svg>

                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-white/20 dark:bg-black/40 border border-slate-200/40 dark:border-white/10 text-[10px] font-mono text-slate-700 dark:text-slate-300 backdrop-blur-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LiDAR Stream Active</span>
                </div>
              </div>
            )}

            {/* Live Scanning Pulse HUD if Active */}
            {isCleaning && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Mapping</span>
              </div>
            )}
          </div>

          {/* Current Room & Target Telemetry */}
          <div className="relative z-10 p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NavigationArrow size={18} weight="duotone" className="text-cyan-400" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Target Zone
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {activeVacuum?.currentRoom || 'Whole Floor Cleaning'}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold text-slate-400">
              {activeMap?.name || 'Ground Floor'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: Maintenance, Consumables & Station Tanks                        */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
        <div className="relative p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
            style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
          >
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          </div>

          {/* Section Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Wrench size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Maintenance &amp; Tanks
                </h2>
              </div>
            </div>
          </div>

          {/* Consumables Progress Bars */}
          <div className="relative z-10 p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm space-y-3">
            {/* 1. Main Brush */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Main Roller Brush
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {activeVacuum?.consumables?.mainBrushPercent ?? 84}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${activeVacuum?.consumables?.mainBrushPercent ?? 84}%` }}
                />
              </div>
            </div>

            {/* 2. Side Brush */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Side Edge Brush
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {activeVacuum?.consumables?.sideBrushPercent ?? 92}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${activeVacuum?.consumables?.sideBrushPercent ?? 92}%` }}
                />
              </div>
            </div>

            {/* 3. HEPA Filter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  HEPA Air Filter
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {activeVacuum?.consumables?.filterPercent ?? 78}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${activeVacuum?.consumables?.filterPercent ?? 78}%` }}
                />
              </div>
            </div>

            {/* 4. Sensors Cleanliness */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Cliff &amp; LiDAR Sensors
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {activeVacuum?.consumables?.sensorCleanPercent ?? 95}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${activeVacuum?.consumables?.sensorCleanPercent ?? 95}%` }}
                />
              </div>
            </div>
          </div>

          {/* Base Station & Tank Status */}
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Base Station &amp; Tanks
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Drop size={14} weight="fill" className="text-sky-400" />
                  <span>Clean Water</span>
                </div>
                <span className="font-mono font-bold text-[10px] text-emerald-400">Full</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Drop size={14} weight="bold" className="text-amber-400" />
                  <span>Dirty Water</span>
                </div>
                <span className="font-mono font-bold text-[10px] text-slate-400">Empty</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                  <span>Dustbin</span>
                </div>
                <span className="font-mono font-bold text-[10px] text-emerald-400">
                  {activeVacuum?.consumables?.dustbinStatus || 'Installed'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkle size={14} weight="fill" className="text-indigo-400" />
                  <span>Mop Pad</span>
                </div>
                <span className="font-mono font-bold text-[10px] text-indigo-400">
                  {activeVacuum?.consumables?.mopAttached ? 'Attached' : 'Detached'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotVacuumTab;
