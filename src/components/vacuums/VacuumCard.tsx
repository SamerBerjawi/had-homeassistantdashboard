/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuum Card Component (Magic UI Bento Grid & Interactive Multi-Map Switcher)
 */

import React, { useState } from 'react';
import {
  Broom,
  Play,
  Pause,
  Stop,
  ArrowArcLeft,
  MapPin,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Fan,
  Drop,
  CheckCircle,
  Warning,
  SpeakerHigh,
  Sparkle,
  HouseLine,
  Gauge,
  Timer,
  Wrench,
  NavigationArrow,
  ArrowsClockwise,
  MapTrifold,
  Images,
  CircleNotch
} from '@phosphor-icons/react';
import { VacuumDeviceData, VacuumMapItem } from '../../types/vacuum';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../contexts/EntityPopupContext';
import { useHAImage } from '../../services/haImageService';

interface VacuumCardProps {
  vacuum: VacuumDeviceData;
  darkMode?: boolean;
  showMap?: boolean;
}

export default function VacuumCard({ vacuum, darkMode = true, showMap = false }: VacuumCardProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();
  const { openEntityDetails } = useEntityPopup();

  const [isOperating, setIsOperating] = useState<string | null>(null);
  const [showMaintenance, setShowMaintenance] = useState<boolean>(false);
  const [imgLoadFailed, setImgLoadFailed] = useState<boolean>(false);

  // Multi-Map Toggle state
  const availableMaps = vacuum.availableMaps && vacuum.availableMaps.length > 0
    ? vacuum.availableMaps
    : [];

  const [selectedMapId, setSelectedMapId] = useState<string>(availableMaps[0]?.id || '');

  const activeMap = availableMaps.find((m) => m.id === selectedMapId) || availableMaps[0];

  // Resolve HA authenticated image URL for camera proxy & image entities
  const { imageUrl: resolvedMapUrl, isLoading: isMapLoading } = useHAImage(activeMap?.imageUrl);

  const isCleaning = vacuum.state === 'cleaning';
  const isReturning = vacuum.state === 'returning';
  const isPaused = vacuum.state === 'paused';
  const isError = vacuum.state === 'error';
  const isDocked = vacuum.state === 'docked';

  // State styling
  const stateTheme = isCleaning
    ? {
        border: 'border-emerald-500/40',
        bgGlow: 'bg-emerald-500/20',
        badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
        badgeLabel: 'CLEANING',
        aura: 'bg-emerald-500/15'
      }
    : isReturning
    ? {
        border: 'border-sky-500/40',
        bgGlow: 'bg-sky-500/20',
        badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
        badgeLabel: 'RETURNING',
        aura: 'bg-sky-500/15'
      }
    : isPaused
    ? {
        border: 'border-amber-500/40',
        bgGlow: 'bg-amber-500/20',
        badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
        badgeLabel: 'PAUSED',
        aura: 'bg-amber-500/15'
      }
    : isError
    ? {
        border: 'border-rose-500/40',
        bgGlow: 'bg-rose-500/20',
        badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
        badgeLabel: 'ATTENTION',
        aura: 'bg-rose-500/20'
      }
    : {
        border: 'border-slate-200/80 dark:border-white/10',
        bgGlow: 'bg-teal-500/10',
        badgeBg: 'bg-slate-200/80 dark:bg-white/10 border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300',
        badgeLabel: 'DOCKED',
        aura: 'bg-teal-500/5'
      };

  // Actions
  const handleAction = async (action: 'start' | 'pause' | 'stop' | 'return_to_base' | 'locate' | 'clean_spot') => {
    setIsOperating(action);
    try {
      if (action === 'start') {
        updateEntityState(vacuum.entityId, 'cleaning');
        await callHAService('vacuum', 'start', {}, { entity_id: vacuum.entityId });
      } else if (action === 'pause') {
        updateEntityState(vacuum.entityId, 'paused');
        await callHAService('vacuum', 'pause', {}, { entity_id: vacuum.entityId });
      } else if (action === 'stop') {
        updateEntityState(vacuum.entityId, 'idle');
        await callHAService('vacuum', 'stop', {}, { entity_id: vacuum.entityId });
      } else if (action === 'return_to_base') {
        updateEntityState(vacuum.entityId, 'returning');
        await callHAService('vacuum', 'return_to_base', {}, { entity_id: vacuum.entityId });
      } else if (action === 'locate') {
        await callHAService('vacuum', 'locate', {}, { entity_id: vacuum.entityId });
      } else if (action === 'clean_spot') {
        updateEntityState(vacuum.entityId, 'cleaning');
        await callHAService('vacuum', 'clean_spot', {}, { entity_id: vacuum.entityId });
      }
    } catch (err) {
      console.warn('[VacuumCard] Service call error:', err);
    } finally {
      setTimeout(() => setIsOperating(null), 600);
    }
  };

  const handleSetFanSpeed = async (speed: string) => {
    try {
      await callHAService('vacuum', 'set_fan_speed', { fan_speed: speed }, { entity_id: vacuum.entityId });
    } catch (err) {
      console.warn('[VacuumCard] Fan speed error:', err);
    }
  };

  const handleSetWaterFlow = async (level: string) => {
    try {
      await callHAService('select', 'select_option', { option: level }, { entity_id: vacuum.entityId });
    } catch (err) {
      console.warn('[VacuumCard] Water flow error:', err);
    }
  };

  // Battery Icon selection
  const BatteryIcon = vacuum.batteryCharging
    ? BatteryCharging
    : vacuum.batteryLevel >= 80
    ? BatteryFull
    : vacuum.batteryLevel >= 30
    ? BatteryMedium
    : vacuum.batteryLevel >= 15
    ? BatteryLow
    : BatteryWarning;

  return (
    <div
      className={`relative p-5 sm:p-6 rounded-3xl backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between gap-5 overflow-hidden isolate ${
        darkMode ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80'
      }`}
    >
      {/* Dynamic Ambient Aura Background */}
      <div
        className={`absolute -inset-10 opacity-40 blur-3xl rounded-full pointer-events-none transition-all duration-700 ${stateTheme.aura}`}
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER: ICON, NAME, AREA, STATE BADGE, BATTERY        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => openEntityDetails(vacuum.entityId)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-xs ${stateTheme.bgGlow}`}
            title="Click to view full entity details & telemetry"
          >
            <Broom
              size={26}
              weight="duotone"
              className={`${
                isCleaning
                  ? 'text-emerald-400 animate-spin [animation-duration:4s] drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                  : isReturning
                  ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                  : 'text-teal-400'
              }`}
            />
          </button>

          <div className="min-w-0">
            <h4 className="text-base font-extrabold truncate tracking-tight">{vacuum.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
              <MapPin size={13} weight="bold" className="shrink-0 text-slate-400" />
              <span className="truncate">{vacuum.areaName || 'Unassigned Area'}</span>
            </div>
          </div>
        </div>

        {/* State Badge & Battery Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-xs ${stateTheme.badgeBg}`}>
            {stateTheme.badgeLabel}
          </span>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold shadow-xs ${
              vacuum.batteryCharging
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
                : vacuum.batteryLevel <= 20
                ? 'bg-rose-500/15 text-rose-800 dark:text-rose-400'
                : darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100/90 text-slate-800'
            }`}
          >
            <BatteryIcon size={16} weight={vacuum.batteryCharging ? 'fill' : 'duotone'} />
            <span>{vacuum.batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO MAP CANVAS WITH AUTHENTICATED HA PROXY STREAM        */}
      {/* ------------------------------------------------------------- */}
      {showMap && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950/80 border border-white/10 h-44 flex items-center justify-center text-center group">
          {/* Intelligently Rendered Map Image or Live Radar Fallback */}
          {resolvedMapUrl && !imgLoadFailed ? (
            <img
              src={resolvedMapUrl}
              alt={activeMap?.name || 'Cleaning Map'}
              onError={() => setImgLoadFailed(true)}
              className="w-full h-full object-contain bg-slate-950/90 transition-all duration-300"
            />
          ) : isMapLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <CircleNotch size={24} className="animate-spin text-teal-400" />
              <span className="text-[11px] font-mono">Loading map...</span>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
              {/* Architectural Grid lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

              {/* Radar Pulse Rings when cleaning */}
              {isCleaning && (
                <>
                  <div className="absolute w-24 h-24 rounded-full border border-emerald-500/40 animate-ping [animation-duration:3s]" />
                  <div className="absolute w-36 h-36 rounded-full border border-emerald-500/20 animate-ping [animation-duration:4s]" />
                </>
              )}

              {/* Center Robot Beacon */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                    isCleaning
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-pulse'
                      : isReturning
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                      : 'bg-slate-800 border-white/20 text-slate-400'
                  }`}
                >
                  <NavigationArrow size={18} weight="fill" className={isCleaning ? 'animate-bounce' : ''} />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-300 mt-1.5 uppercase tracking-wider">
                  {isCleaning ? `Cleaning ${vacuum.currentRoom}` : vacuum.statusText}
                </span>
              </div>
            </div>
          )}

          {/* Top Floating Map Toggle Pill Bar (Strictly Camera / Image Maps) */}
          {availableMaps.length > 1 && (
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center bg-black/85 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-lg max-w-[90%] overflow-x-auto no-scrollbar gap-1">
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Images size={12} weight={isSelected ? 'fill' : 'regular'} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CLEANING SESSION TELEMETRY STRIP                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
        <div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Time</div>
          <div className="text-base font-black font-mono text-white mt-0.5">
            {vacuum.cleaningTimeMinutes || 0}
            <span className="text-[10px] font-normal text-slate-400 ml-0.5">min</span>
          </div>
        </div>
        <div className="border-x border-white/10">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Area Cleaned</div>
          <div className="text-base font-black font-mono text-white mt-0.5">
            {vacuum.cleanedAreaM2 || 0}
            <span className="text-[10px] font-normal text-slate-400 ml-0.5">m²</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Room</div>
          <div className="text-xs font-bold text-teal-300 truncate mt-1" title={vacuum.currentRoom || 'Whole House'}>
            {vacuum.currentRoom || 'Whole House'}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MASTER CONTROLS BAR (START / PAUSE / DOCK / LOCATE)        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2">
        {/* Main Start / Pause Toggle */}
        {isCleaning ? (
          <button
            type="button"
            onClick={() => handleAction('pause')}
            disabled={isOperating !== null}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Pause size={18} weight="fill" />
            <span>Pause Cleaning</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleAction('start')}
            disabled={isOperating !== null}
            className="flex-1 py-3 px-4 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <Play size={18} weight="fill" />
            <span>{isPaused ? 'Resume Clean' : 'Start Cleaning'}</span>
          </button>
        )}

        {/* Return to Base */}
        <button
          type="button"
          onClick={() => handleAction('return_to_base')}
          disabled={isOperating !== null || isDocked}
          className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
            isReturning
              ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          title="Return to Docking Station"
        >
          <ArrowArcLeft size={18} weight="bold" />
        </button>

        {/* Spot Clean */}
        <button
          type="button"
          onClick={() => handleAction('clean_spot')}
          disabled={isOperating !== null}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          title="Spot Clean Current Zone"
        >
          <Sparkle size={18} weight="duotone" className="text-amber-400" />
        </button>

        {/* Locate Vacuum */}
        <button
          type="button"
          onClick={() => handleAction('locate')}
          disabled={isOperating !== null}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          title="Locate Robot (Chime Beep)"
        >
          <SpeakerHigh size={18} weight="duotone" className="text-sky-400" />
        </button>

        {/* Toggle Maintenance Accordion */}
        <button
          type="button"
          onClick={() => setShowMaintenance(!showMaintenance)}
          className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
            showMaintenance
              ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
          }`}
          title="View Consumables & Maintenance Gauges"
        >
          <Wrench size={18} weight="duotone" />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODE SELECTORS: SUCTION FAN SPEED & WATER FLOW LEVEL        */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-1 border-t border-white/10">
        {/* Fan Speed Pill Selector */}
        {vacuum.fanSpeedList.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
              <Fan size={15} weight="duotone" className="text-teal-400" />
              <span>Suction</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {vacuum.fanSpeedList.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSetFanSpeed(speed)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    vacuum.fanSpeed?.toLowerCase() === speed.toLowerCase()
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Water Flow Level Selector (if mop supported) */}
        {vacuum.consumables.mopAttached && vacuum.waterFlowList.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
              <Drop size={15} weight="duotone" className="text-sky-400" />
              <span>Mopping Water</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {vacuum.waterFlowList.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleSetWaterFlow(level)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    vacuum.waterFlowLevel?.toLowerCase() === level.toLowerCase()
                      ? 'bg-sky-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. COLLAPSIBLE CONSUMABLES & HEALTH GAUGES                     */}
      {/* ------------------------------------------------------------- */}
      {showMaintenance && (
        <div className="space-y-3 pt-3 border-t border-white/10 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Wrench size={14} weight="duotone" className="text-amber-400" />
              <span>Consumables & Wear Lifespans</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Sensors: {vacuum.consumables.sensorCleanPercent || 100}% Clean</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Main Brush */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] text-slate-400">Main Brush</div>
              <div className="text-sm font-black font-mono text-white mt-0.5">
                {vacuum.consumables.mainBrushPercent ?? 84}%
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (vacuum.consumables.mainBrushPercent ?? 84) > 20 ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${vacuum.consumables.mainBrushPercent ?? 84}%` }}
                />
              </div>
            </div>

            {/* Side Brush */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] text-slate-400">Side Brush</div>
              <div className="text-sm font-black font-mono text-white mt-0.5">
                {vacuum.consumables.sideBrushPercent ?? 92}%
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (vacuum.consumables.sideBrushPercent ?? 92) > 20 ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${vacuum.consumables.sideBrushPercent ?? 92}%` }}
                />
              </div>
            </div>

            {/* HEPA Filter */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] text-slate-400">HEPA Filter</div>
              <div className="text-sm font-black font-mono text-white mt-0.5">
                {vacuum.consumables.filterPercent ?? 78}%
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (vacuum.consumables.filterPercent ?? 78) > 20 ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${vacuum.consumables.filterPercent ?? 78}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
