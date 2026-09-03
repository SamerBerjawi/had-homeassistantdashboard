/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VacuumMapView:
 * Dedicated full-scale interactive Cleaning Map Command Center.
 * Features multi-floor map switching, live HA camera/image stream,
 * radar pulse effects, live cleaning session telemetry HUD,
 * and floating glassmorphic robot control deck.
 */

import React, { useState } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  Sparkle,
  SpeakerHigh,
  NavigationArrow,
  Images,
  CircleNotch,
  MapPin,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Fan,
  Drop,
  ArrowsClockwise,
  MapTrifold,
  Clock,
  Gauge,
  CheckCircle,
  Warning
} from '@phosphor-icons/react';
import { VacuumDeviceData, VacuumMapItem } from '../../types/vacuum';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useHAImage } from '../../services/haImageService';

interface VacuumMapViewProps {
  vacuums: VacuumDeviceData[];
  darkMode?: boolean;
}

export default function VacuumMapView({ vacuums, darkMode = true }: VacuumMapViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const [selectedVacuumId, setSelectedVacuumId] = useState<string>(vacuums[0]?.entityId || '');
  const [isOperating, setIsOperating] = useState<string | null>(null);
  const [imgLoadFailed, setImgLoadFailed] = useState<boolean>(false);

  const activeVacuum = vacuums.find((v) => v.entityId === selectedVacuumId) || vacuums[0];

  const availableMaps: VacuumMapItem[] = activeVacuum?.availableMaps && activeVacuum.availableMaps.length > 0
    ? activeVacuum.availableMaps
    : [];

  const [selectedMapId, setSelectedMapId] = useState<string>(availableMaps[0]?.id || '');

  const activeMap = availableMaps.find((m) => m.id === selectedMapId) || availableMaps[0];

  // Resolve authenticated image URL for camera proxy & image entities
  const { imageUrl: resolvedMapUrl, isLoading: isMapLoading } = useHAImage(activeMap?.imageUrl);

  if (!activeVacuum) {
    return null;
  }

  const isCleaning = activeVacuum.state === 'cleaning';
  const isReturning = activeVacuum.state === 'returning';
  const isPaused = activeVacuum.state === 'paused';
  const isError = activeVacuum.state === 'error';
  const isDocked = activeVacuum.state === 'docked';

  // Battery Icon selection
  const BatteryIcon = activeVacuum.batteryCharging
    ? BatteryCharging
    : activeVacuum.batteryLevel >= 80
    ? BatteryFull
    : activeVacuum.batteryLevel >= 30
    ? BatteryMedium
    : activeVacuum.batteryLevel >= 15
    ? BatteryLow
    : BatteryWarning;

  const handleAction = async (action: 'start' | 'pause' | 'stop' | 'return_to_base' | 'locate' | 'clean_spot') => {
    setIsOperating(action);
    try {
      if (action === 'start') {
        updateEntityState(activeVacuum.entityId, 'cleaning');
        await callHAService('vacuum', 'start', {}, { entity_id: activeVacuum.entityId });
      } else if (action === 'pause') {
        updateEntityState(activeVacuum.entityId, 'paused');
        await callHAService('vacuum', 'pause', {}, { entity_id: activeVacuum.entityId });
      } else if (action === 'stop') {
        updateEntityState(activeVacuum.entityId, 'idle');
        await callHAService('vacuum', 'stop', {}, { entity_id: activeVacuum.entityId });
      } else if (action === 'return_to_base') {
        updateEntityState(activeVacuum.entityId, 'returning');
        await callHAService('vacuum', 'return_to_base', {}, { entity_id: activeVacuum.entityId });
      } else if (action === 'locate') {
        await callHAService('vacuum', 'locate', {}, { entity_id: activeVacuum.entityId });
      } else if (action === 'clean_spot') {
        updateEntityState(activeVacuum.entityId, 'cleaning');
        await callHAService('vacuum', 'clean_spot', {}, { entity_id: activeVacuum.entityId });
      }
    } catch (err) {
      console.warn('[VacuumMapView] Service call error:', err);
    } finally {
      setTimeout(() => setIsOperating(null), 600);
    }
  };

  const handleSetFanSpeed = async (speed: string) => {
    try {
      await callHAService('vacuum', 'set_fan_speed', { fan_speed: speed }, { entity_id: activeVacuum.entityId });
    } catch (err) {
      console.warn('[VacuumMapView] Fan speed error:', err);
    }
  };

  const handleSetWaterFlow = async (level: string) => {
    try {
      await callHAService('select', 'select_option', { option: level }, { entity_id: activeVacuum.entityId });
    } catch (err) {
      console.warn('[VacuumMapView] Water flow error:', err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Map Toolbar: Robot Selection + Floor Map Selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Robot switcher pills (if multiple vacuums) or active robot name */}
        <div className="flex items-center gap-2 flex-wrap">
          {vacuums.length > 1 ? (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
              {vacuums.map((v) => {
                const isSelected = v.entityId === selectedVacuumId;
                return (
                  <button
                    key={v.entityId}
                    type="button"
                    onClick={() => {
                      setSelectedVacuumId(v.entityId);
                      setImgLoadFailed(false);
                      if (v.availableMaps?.[0]) {
                        setSelectedMapId(v.availableMaps[0].id);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Broom size={15} weight={isSelected ? 'fill' : 'duotone'} />
                    <span>{v.name}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      v.state === 'cleaning' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <Broom size={18} weight="duotone" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white leading-snug">
                  {activeVacuum.name}
                </h3>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin size={11} />
                  {activeVacuum.areaName || 'Home'}
                </span>
              </div>
            </div>
          )}

          {/* Floor / Map Switcher Pills */}
          {availableMaps.length > 1 && (
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10">
              {availableMaps.map((m) => {
                const isSelected = activeMap?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setImgLoadFailed(false);
                      setSelectedMapId(m.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Images size={13} weight={isSelected ? 'fill' : 'regular'} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live Session Quick Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-xs flex items-center gap-1.5 ${
            isCleaning
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : isReturning
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
              : isPaused
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : isError
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : 'bg-white/5 border-white/10 text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isCleaning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
            }`} />
            <span>{activeVacuum.statusText || activeVacuum.state}</span>
          </div>

          {/* Battery Tag */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
            activeVacuum.batteryCharging
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : activeVacuum.batteryLevel <= 20
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              : 'bg-white/5 border-white/10 text-slate-300'
          }`}>
            <BatteryIcon size={15} weight={activeVacuum.batteryCharging ? 'fill' : 'duotone'} />
            <span>{activeVacuum.batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* Main Expansive Canvas Container */}
      <div className="relative w-full h-[520px] sm:h-[65vh] min-h-[460px] rounded-3xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center isolate select-none shadow-2xl">
        {/* Map Rendering or Live Fallback */}
        {resolvedMapUrl && !imgLoadFailed ? (
          <img
            src={resolvedMapUrl}
            alt={activeMap?.name || 'Cleaning Map'}
            onError={() => setImgLoadFailed(true)}
            className="w-full h-full object-contain bg-slate-950 p-2 sm:p-4 transition-all duration-300"
          />
        ) : isMapLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <CircleNotch size={32} className="animate-spin text-teal-400" />
            <span className="text-xs font-mono font-bold text-slate-300">Streaming Map from Home Assistant...</span>
          </div>
        ) : (
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            {/* Blueprint Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />

            {/* Radar Pulse Rings when cleaning */}
            {isCleaning && (
              <>
                <div className="absolute w-40 h-40 rounded-full border border-emerald-500/30 animate-ping [animation-duration:3s]" />
                <div className="absolute w-64 h-64 rounded-full border border-emerald-500/15 animate-ping [animation-duration:4.5s]" />
                <div className="absolute w-96 h-96 rounded-full border border-emerald-500/10 animate-ping [animation-duration:6s]" />
              </>
            )}

            {/* Center Robot Beacon */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${
                  isCleaning
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.7)] animate-pulse'
                    : isReturning
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.6)]'
                    : 'bg-slate-900 border-white/20 text-slate-400 shadow-xl'
                }`}
              >
                <NavigationArrow size={26} weight="fill" className={isCleaning ? 'animate-bounce' : ''} />
              </div>
              <span className="text-xs font-mono font-extrabold text-white mt-2.5 uppercase tracking-wider px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                {isCleaning ? `Cleaning: ${activeVacuum.currentRoom || 'Active Zone'}` : activeVacuum.statusText}
              </span>
            </div>
          </div>
        )}

        {/* Top-Left Floating HUD: Session Metrics */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto p-3 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-xl flex items-center gap-4 text-left">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
              <div className="text-sm font-black font-mono text-white mt-0.5 flex items-center gap-1">
                <Clock size={13} className="text-teal-400" />
                <span>{activeVacuum.cleaningTimeMinutes || 0}</span>
                <span className="text-[10px] font-normal text-slate-400">min</span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-white/15" />

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Area Cleaned</span>
              <div className="text-sm font-black font-mono text-white mt-0.5 flex items-center gap-1">
                <Gauge size={13} className="text-sky-400" />
                <span>{activeVacuum.cleanedAreaM2 || 0}</span>
                <span className="text-[10px] font-normal text-slate-400">m²</span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-white/15" />

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Room</span>
              <span className="text-xs font-bold text-teal-300 block truncate max-w-[120px] mt-0.5">
                {activeVacuum.currentRoom || 'Whole House'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom-Center Floating Action Deck: Play/Pause/Dock/Spot/Locate */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/20 shadow-2xl max-w-[95%] overflow-x-auto no-scrollbar">
          {/* Main Play / Pause CTA */}
          {isCleaning ? (
            <button
              type="button"
              onClick={() => handleAction('pause')}
              disabled={isOperating !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/25 shrink-0"
            >
              <Pause size={16} weight="fill" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction('start')}
              disabled={isOperating !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-500/25 shrink-0"
            >
              <Play size={16} weight="fill" />
              <span>{isPaused ? 'Resume' : 'Start Clean'}</span>
            </button>
          )}

          {/* Return to Base */}
          <button
            type="button"
            onClick={() => handleAction('return_to_base')}
            disabled={isOperating !== null || isDocked}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 ${
              isReturning
                ? 'bg-sky-500 text-slate-950 border border-sky-400'
                : 'bg-white/10 hover:bg-white/15 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title="Return to Docking Station"
          >
            <ArrowArcLeft size={16} weight="bold" />
            <span className="hidden sm:inline">Dock</span>
          </button>

          {/* Spot Clean */}
          <button
            type="button"
            onClick={() => handleAction('clean_spot')}
            disabled={isOperating !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer active:scale-95 shrink-0"
            title="Spot Clean Zone"
          >
            <Sparkle size={16} weight="duotone" className="text-amber-400" />
            <span className="hidden sm:inline">Spot</span>
          </button>

          {/* Locate Robot */}
          <button
            type="button"
            onClick={() => handleAction('locate')}
            disabled={isOperating !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer active:scale-95 shrink-0"
            title="Locate Robot (Chime Beep)"
          >
            <SpeakerHigh size={16} weight="duotone" className="text-sky-400" />
            <span className="hidden sm:inline">Locate</span>
          </button>

          {/* Quick Fan Speed Toggle */}
          {activeVacuum.fanSpeedList.length > 0 && (
            <div className="border-l border-white/20 pl-2 flex items-center gap-1 shrink-0">
              <Fan size={14} className="text-teal-400 hidden sm:inline" />
              <select
                value={activeVacuum.fanSpeed || activeVacuum.fanSpeedList[0]}
                onChange={(e) => handleSetFanSpeed(e.target.value)}
                className="bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold rounded-lg px-2 py-1 outline-hidden cursor-pointer border border-white/10"
              >
                {activeVacuum.fanSpeedList.map((speed) => (
                  <option key={speed} value={speed} className="bg-slate-900 text-white">
                    {speed}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Water Flow Toggle */}
          {activeVacuum.consumables.mopAttached && activeVacuum.waterFlowList.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Drop size={14} className="text-sky-400 hidden sm:inline" />
              <select
                value={activeVacuum.waterFlowLevel || activeVacuum.waterFlowList[0]}
                onChange={(e) => handleSetWaterFlow(e.target.value)}
                className="bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold rounded-lg px-2 py-1 outline-hidden cursor-pointer border border-white/10"
              >
                {activeVacuum.waterFlowList.map((flow) => (
                  <option key={flow} value={flow} className="bg-slate-900 text-white">
                    {flow}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
