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
  MapTrifold
} from '@phosphor-icons/react';
import { VacuumDeviceData } from '../../types/vacuum';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../contexts/EntityPopupContext';

interface VacuumCardProps {
  vacuum: VacuumDeviceData;
  darkMode?: boolean;
}

export default function VacuumCard({ vacuum, darkMode = true }: VacuumCardProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();
  const { openEntityDetails } = useEntityPopup();

  const [isOperating, setIsOperating] = useState<string | null>(null);
  const [showMaintenance, setShowMaintenance] = useState<boolean>(false);

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
      style={{ boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)' }}
      className={`relative p-5 sm:p-6 rounded-3xl border ${stateTheme.border} backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between gap-5 overflow-hidden isolate ${
        darkMode ? 'bg-slate-900/80 text-white' : 'bg-white/80 text-slate-900'
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
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${stateTheme.bgGlow} ${stateTheme.border}`}
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
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
              <MapPin size={13} weight="bold" className="shrink-0 text-slate-400" />
              <span className="truncate">{vacuum.areaName || 'Unassigned Area'}</span>
            </div>
          </div>
        </div>

        {/* State Badge & Battery Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-xs ${stateTheme.badgeBg}`}>
            {stateTheme.badgeLabel}
          </span>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
              vacuum.batteryCharging
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : vacuum.batteryLevel <= 20
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <BatteryIcon size={16} weight={vacuum.batteryCharging ? 'fill' : 'duotone'} />
            <span>{vacuum.batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO LIDAR / MAP FLOORPLAN CANVAS                           */}
      {/* ------------------------------------------------------------- */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950/60 border border-white/10 h-36 flex items-center justify-center text-center group">
        {vacuum.mapImageUrl ? (
          <img src={vacuum.mapImageUrl} alt="Live Cleaning Map" className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            {/* Architectural Grid lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />

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

        {/* Map Snapshot Overlay Pill */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1">
          <MapTrifold size={12} weight="bold" className="text-teal-400" />
          <span>LiDAR Visual Map</span>
        </div>
      </div>

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
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Room</div>
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
          title="View Consumables & Maintenance Life"
        >
          <Wrench size={18} weight="duotone" />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. SUCTION FAN SPEED & WATER FLOW SELECTORS                    */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        {/* Fan Speed Row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-teal-400">
              <Fan size={15} weight="duotone" />
              <span>Suction Power</span>
            </span>
            <span className="font-mono text-teal-300 text-[11px] uppercase">{vacuum.fanSpeed}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10">
            {vacuum.fanSpeedList.map((speed) => {
              const isSel = (vacuum.fanSpeed || '').toLowerCase() === speed.toLowerCase();
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSetFanSpeed(speed)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                    isSel
                      ? 'bg-teal-500 text-slate-950 shadow-xs font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}
                </button>
              );
            })}
          </div>
        </div>

        {/* Water Flow Level (if mop supported) */}
        {vacuum.consumables.mopAttached && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Drop size={15} weight="duotone" />
                <span>Mop Scrub Intensity</span>
              </span>
              <span className="font-mono text-sky-300 text-[11px] uppercase">{vacuum.waterFlowLevel}</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10">
              {vacuum.waterFlowList.map((flow) => {
                const isSel = (vacuum.waterFlowLevel || '').toLowerCase() === flow.toLowerCase();
                return (
                  <button
                    key={flow}
                    type="button"
                    onClick={() => handleSetWaterFlow(flow)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                      isSel
                        ? 'bg-sky-500 text-slate-950 shadow-xs font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {flow}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. CONSUMABLES & MAINTENANCE LIFE GAUGES                       */}
      {/* ------------------------------------------------------------- */}
      {showMaintenance && (
        <div className="space-y-3 pt-3 border-t border-white/10 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Wrench size={15} weight="duotone" />
              <span>Consumable Parts Health</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Service Life %</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Main Brush */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-300">Main Roller Brush</span>
                <span className="font-mono text-teal-300">{vacuum.consumables.mainBrushPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all"
                  style={{ width: `${vacuum.consumables.mainBrushPercent}%` }}
                />
              </div>
            </div>

            {/* Side Brush */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-300">Side Edge Brush</span>
                <span className="font-mono text-teal-300">{vacuum.consumables.sideBrushPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all"
                  style={{ width: `${vacuum.consumables.sideBrushPercent}%` }}
                />
              </div>
            </div>

            {/* HEPA Filter */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-300">HEPA Air Filter</span>
                <span className="font-mono text-teal-300">{vacuum.consumables.filterPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all"
                  style={{ width: `${vacuum.consumables.filterPercent}%` }}
                />
              </div>
            </div>

            {/* Cliff & Wall Sensors */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-300">Sensors Cleanliness</span>
                <span className="font-mono text-teal-300">{vacuum.consumables.sensorCleanPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full transition-all"
                  style={{ width: `${vacuum.consumables.sensorCleanPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dustbin & Water Box Status Badges */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-400">
              Dustbin: <strong className="text-white font-semibold">{vacuum.consumables.dustbinStatus || 'Installed'}</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              Water Tank: <strong className="text-white font-semibold">{vacuum.consumables.waterBoxStatus || 'Installed'}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
