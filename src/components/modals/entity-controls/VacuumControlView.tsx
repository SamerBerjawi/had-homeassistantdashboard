import React, { useState, useMemo } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  BatteryCharging,
  BatteryMedium,
  Fan,
  Drop,
  SpeakerHigh,
  Wrench
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectVacuumCapabilities,
  VacuumCapabilities
} from '../../../services/vacuumClassification';

interface VacuumControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
  customIcon?: string | null;
}

export default function VacuumControlView({ entity, darkMode = true, customIcon }: VacuumControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();
  const [isOperating, setIsOperating] = useState<string | null>(null);

  const caps: VacuumCapabilities = useMemo(() => {
    return detectVacuumCapabilities(entity);
  }, [entity]);

  const handleAction = async (action: 'start' | 'pause' | 'stop' | 'return_to_base' | 'locate' | 'clean_spot') => {
    setIsOperating(action);
    try {
      if (action === 'start') {
        updateEntityState(entity.entity_id, 'cleaning');
        await callHAService('vacuum', 'start', {}, { entity_id: entity.entity_id });
      } else if (action === 'pause') {
        updateEntityState(entity.entity_id, 'paused');
        await callHAService('vacuum', 'pause', {}, { entity_id: entity.entity_id });
      } else if (action === 'stop') {
        updateEntityState(entity.entity_id, 'idle');
        await callHAService('vacuum', 'stop', {}, { entity_id: entity.entity_id });
      } else if (action === 'return_to_base') {
        updateEntityState(entity.entity_id, 'returning');
        await callHAService('vacuum', 'return_to_base', {}, { entity_id: entity.entity_id });
      } else if (action === 'locate') {
        await callHAService('vacuum', 'locate', {}, { entity_id: entity.entity_id });
      } else if (action === 'clean_spot') {
        updateEntityState(entity.entity_id, 'cleaning');
        await callHAService('vacuum', 'clean_spot', {}, { entity_id: entity.entity_id });
      }
    } catch (err) {
      console.warn('[VacuumControlView] Service error:', err);
    } finally {
      setTimeout(() => setIsOperating(null), 600);
    }
  };

  const handleSetFanSpeed = async (speed: string) => {
    updateEntityState(entity.entity_id, entity.state, { ...entity.attributes, fan_speed: speed });
    await callHAService('vacuum', 'set_fan_speed', { fan_speed: speed }, { entity_id: entity.entity_id });
  };

  const handleSetWaterFlow = async (mode: string) => {
    updateEntityState(entity.entity_id, entity.state, { ...entity.attributes, water_box_mode: mode });
    await callHAService('vacuum', 'set_fan_speed', { fan_speed: mode }, { entity_id: entity.entity_id });
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const isCleaning = caps.isCleaning;

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW (Health Section Header Pattern)                         */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl backdrop-blur-xl flex items-center justify-between transition-all ${bentoStaticCardStyle}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
            style={{
              backgroundColor: isCleaning
                ? 'rgba(20, 184, 166, 0.15)'
                : caps.isReturning
                ? 'rgba(14, 165, 233, 0.15)'
                : 'rgba(100, 116, 139, 0.12)',
              borderColor: isCleaning
                ? 'rgba(20, 184, 166, 0.35)'
                : caps.isReturning
                ? 'rgba(14, 165, 233, 0.35)'
                : 'rgba(100, 116, 139, 0.25)',
              color: isCleaning ? '#14b8a6' : caps.isReturning ? '#0ea5e9' : '#94a3b8'
            }}
          >
            {customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight="duotone" />
            ) : (
              <Broom size={18} weight="duotone" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || 'CLEANING & ROBOTICS'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || 'Robot Vacuum'}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Master Play/Pause Action Button */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              caps.isError
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                : isCleaning
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
                : caps.isReturning
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                caps.isError
                  ? 'bg-rose-500 animate-ping'
                  : isCleaning
                  ? 'bg-teal-500 animate-pulse'
                  : caps.isReturning
                  ? 'bg-sky-500 animate-bounce'
                  : 'bg-slate-400'
              }`}
            />
            <span>
              {caps.isError
                ? 'Error'
                : isCleaning
                ? 'Cleaning'
                : caps.isReturning
                ? 'Returning'
                : caps.isPaused
                ? 'Paused'
                : caps.isDocked
                ? 'Docked'
                : 'Standby'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleAction(isCleaning ? 'pause' : 'start')}
            disabled={isOperating !== null}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
              isCleaning
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                : 'bg-teal-500 text-slate-950 border-teal-400 shadow-xs'
            }`}
            aria-label={isCleaning ? 'Pause Vacuum' : 'Start Vacuum'}
          >
            {isCleaning ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MASTER ROBOT VACUUM HERO CARD                                          */}
      {/* ========================================================================= */}
      <div
        className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
      >
        {/* Dynamic Subtle Ambient Glow Aura */}
        <div
          className={`absolute -inset-10 opacity-20 blur-3xl rounded-full transition-all duration-700 pointer-events-none ${
            caps.isError
              ? 'bg-rose-500/30'
              : isCleaning
              ? 'bg-teal-500/30'
              : caps.isReturning
              ? 'bg-sky-500/30'
              : caps.isPaused
              ? 'bg-amber-500/30'
              : 'bg-transparent'
          }`}
        />

        {/* Animated Robot Vacuum Disc Graphic */}
        <div className="relative mb-3 group">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex items-center justify-center relative shadow-[4px_6px_12px_rgba(0,0,0,0.15)] transition-all duration-300 ${
              isCleaning
                ? darkMode
                  ? 'bg-teal-500/15 border-teal-400/80 ring-4 ring-teal-400/20'
                  : 'bg-teal-100/80 border-teal-400 ring-4 ring-teal-400/25'
                : caps.isReturning
                ? darkMode
                  ? 'bg-sky-500/15 border-sky-400/80 ring-4 ring-sky-400/20'
                  : 'bg-sky-100/80 border-sky-400 ring-4 ring-sky-400/25'
                : caps.isPaused
                ? darkMode
                  ? 'bg-amber-500/15 border-amber-400/80'
                  : 'bg-amber-100/80 border-amber-400'
                : darkMode
                ? 'bg-black/40 border-white/10'
                : 'bg-white/40 border-slate-200/80'
            }`}
          >
            <Broom
              size={44}
              weight="duotone"
              className={`transition-all ${
                isCleaning
                  ? 'text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.8)] animate-pulse'
                  : caps.isReturning
                  ? 'text-sky-400'
                  : caps.isPaused
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            />
          </div>

          {/* Battery Status Badge on disc corner */}
          {caps.batteryLevel !== undefined && (
            <div
              className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-black flex items-center gap-1 shadow-xs ${
                darkMode
                  ? 'bg-black/60 border-white/20 text-white backdrop-blur-md'
                  : 'bg-white/80 border-slate-200 text-slate-900 backdrop-blur-md'
              }`}
            >
              {caps.isCharging ? (
                <BatteryCharging size={14} weight="bold" className="text-emerald-500 animate-pulse" />
              ) : (
                <BatteryMedium size={14} weight="bold" className="text-slate-400" />
              )}
              <span>{caps.batteryLevel}%</span>
            </div>
          )}
        </div>

        {/* HealthMetricCard Style Headline */}
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white capitalize my-1">
          {caps.isError
            ? 'Error / Stuck'
            : isCleaning
            ? 'Cleaning Active'
            : caps.isReturning
            ? 'Returning to Dock'
            : caps.isPaused
            ? 'Cleaning Paused'
            : caps.isDocked
            ? 'Docked & Ready'
            : caps.state}
        </h3>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
          <span>
            {caps.isDocked && caps.isCharging
              ? 'Charging Battery'
              : caps.isDocked
              ? 'Stationed at Dock'
              : isCleaning
              ? 'Vacuuming Floors'
              : 'Idle'}
          </span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* Master Action Transport Bar */}
        <div className="flex items-center gap-2.5 sm:gap-3 mt-4 flex-wrap justify-center">
          {isCleaning ? (
            <button
              type="button"
              onClick={() => handleAction('pause')}
              disabled={isOperating !== null}
              className="h-11 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(245,158,11,0.25)]"
            >
              <Pause size={16} weight="fill" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction('start')}
              disabled={isOperating !== null}
              className="h-11 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(20,184,166,0.25)]"
            >
              <Play size={16} weight="fill" />
              <span>{caps.isPaused ? 'Resume Clean' : 'Start Clean'}</span>
            </button>
          )}

          {caps.supportsReturnHome && (
            <button
              type="button"
              onClick={() => handleAction('return_to_base')}
              disabled={caps.isDocked || isOperating !== null}
              className={`h-11 px-5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 border disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
                darkMode
                  ? 'bg-black/20 hover:bg-black/30 text-slate-200 border-white/5'
                  : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
              }`}
            >
              <ArrowArcLeft size={16} weight="bold" />
              <span>Dock</span>
            </button>
          )}

          {caps.supportsLocate && (
            <button
              type="button"
              onClick={() => handleAction('locate')}
              disabled={isOperating !== null}
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
                darkMode
                  ? 'bg-black/20 hover:bg-black/30 text-slate-300 border-white/5'
                  : 'bg-white/40 hover:bg-white/60 text-slate-700 border-slate-200/50'
              }`}
              title="Locate Robot (Beep)"
            >
              <SpeakerHigh size={18} weight="duotone" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUCTION FAN SPEED PRESETS                                              */}
      {/* ========================================================================= */}
      {caps.fanSpeedList.length > 0 && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-0.5">
            <Fan size={14} weight="duotone" className="text-teal-500" />
            <span>Suction Fan Speed</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {caps.fanSpeedList.map((speed) => {
              const isSelected = caps.fanSpeed?.toLowerCase() === speed.toLowerCase();
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSetFanSpeed(speed)}
                  className={`h-11 rounded-2xl border text-xs font-black transition-all cursor-pointer active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-teal-500 border-teal-400 text-slate-950 shadow-[4px_6px_12px_rgba(20,184,166,0.25)] ring-2 ring-teal-400/30'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                  }`}
                >
                  {speed}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MOPPING WATER FLOW PRESETS                                             */}
      {/* ========================================================================= */}
      {caps.waterFlowList.length > 0 && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 px-0.5">
            <Drop size={14} weight="duotone" className="text-sky-500" />
            <span>Mopping Water Flow</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {caps.waterFlowList.map((flow) => {
              const isSelected = caps.waterFlowLevel?.toLowerCase() === flow.toLowerCase();
              return (
                <button
                  key={flow}
                  type="button"
                  onClick={() => handleSetWaterFlow(flow)}
                  className={`h-11 rounded-2xl border text-xs font-black transition-all cursor-pointer active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-[4px_6px_12px_rgba(14,165,233,0.25)] ring-2 ring-sky-400/30'
                      : darkMode
                      ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                      : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                  }`}
                >
                  {flow}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CONSUMABLES MAINTENANCE METERS                                         */}
      {/* ========================================================================= */}
      {caps.hasConsumables && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3.5 ${bentoStaticCardStyle}`}>
          <div className="flex items-center gap-2 px-0.5">
            <Wrench size={16} weight="duotone" className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Consumables & Maintenance
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-xs">
            {caps.mainBrushLeft !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Main Brush</span>
                  <span className="font-mono text-slate-900 dark:text-white">{caps.mainBrushLeft}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-black/20 dark:bg-white/10">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${caps.mainBrushLeft}%` }} />
                </div>
              </div>
            )}

            {caps.sideBrushLeft !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Side Brushes</span>
                  <span className="font-mono text-slate-900 dark:text-white">{caps.sideBrushLeft}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-black/20 dark:bg-white/10">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${caps.sideBrushLeft}%` }} />
                </div>
              </div>
            )}

            {caps.filterLeft !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>HEPA Filter</span>
                  <span className="font-mono text-slate-900 dark:text-white">{caps.filterLeft}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-black/20 dark:bg-white/10">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${caps.filterLeft}%` }} />
                </div>
              </div>
            )}

            {caps.sensorDirtyLeft !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Optical Sensors</span>
                  <span className="font-mono text-slate-900 dark:text-white">{caps.sensorDirtyLeft}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-black/20 dark:bg-white/10">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${caps.sensorDirtyLeft}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
