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
}

export default function VacuumControlView({ entity, darkMode = true }: VacuumControlViewProps) {
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

  return (
    <div className="space-y-6">
      {/* 1. MASTER ROBOT VACUUM HERO CARD */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          darkMode
            ? 'bg-slate-800/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.36)]'
            : 'bg-white/70 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
        }`}
      >
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            caps.isError
              ? 'bg-rose-500/40'
              : caps.isCleaning
              ? 'bg-teal-500/35'
              : caps.isReturning
              ? 'bg-sky-500/35'
              : caps.isPaused
              ? 'bg-amber-500/35'
              : 'bg-slate-500/20'
          }`}
        />

        {/* Animated Robot Vacuum Disc Graphic */}
        <div className="relative mb-3 group">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex items-center justify-center relative shadow-2xl transition-all duration-300 ${
              caps.isCleaning
                ? darkMode
                  ? 'bg-teal-500/20 border-teal-400 ring-4 ring-teal-400/25'
                  : 'bg-teal-100 border-teal-400 ring-4 ring-teal-400/20'
                : caps.isReturning
                ? darkMode
                  ? 'bg-sky-500/20 border-sky-400 ring-4 ring-sky-400/25'
                  : 'bg-sky-100 border-sky-400 ring-4 ring-sky-400/20'
                : caps.isPaused
                ? darkMode
                  ? 'bg-amber-500/20 border-amber-400'
                  : 'bg-amber-100 border-amber-400'
                : darkMode
                ? 'bg-slate-800/80 border-slate-700'
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            <Broom
              size={48}
              weight="duotone"
              className={`transition-all ${
                caps.isCleaning
                  ? 'text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.8)] animate-pulse'
                  : caps.isReturning
                  ? 'text-sky-400'
                  : caps.isPaused
                  ? 'text-amber-400'
                  : darkMode
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            />
          </div>

          {/* Battery Status Badge on disc corner */}
          {caps.batteryLevel !== undefined && (
            <div
              className={`absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-extrabold flex items-center gap-1 shadow-md ${
                darkMode
                  ? 'bg-slate-900 border-white/20 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
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

        {/* Headline */}
        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight capitalize ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {caps.isError
            ? 'Error / Stuck'
            : caps.isCleaning
            ? 'Cleaning Active'
            : caps.isReturning
            ? 'Returning to Dock'
            : caps.isPaused
            ? 'Cleaning Paused'
            : caps.isDocked
            ? 'Docked & Ready'
            : caps.state}
        </h3>

        <p
          className={`text-xs font-medium mt-1 flex items-center gap-1.5 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>
            {caps.isDocked && caps.isCharging
              ? 'Charging Battery'
              : caps.isDocked
              ? 'Stationed at Dock'
              : caps.isCleaning
              ? 'Cleaning in Progress'
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
          {caps.isCleaning ? (
            <button
              type="button"
              onClick={() => handleAction('pause')}
              disabled={isOperating !== null}
              className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <Pause size={18} weight="fill" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction('start')}
              disabled={isOperating !== null}
              className="h-12 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <Play size={18} weight="fill" />
              <span>{caps.isPaused ? 'Resume Clean' : 'Start Clean'}</span>
            </button>
          )}

          {caps.supportsReturnHome && (
            <button
              type="button"
              onClick={() => handleAction('return_to_base')}
              disabled={caps.isDocked || isOperating !== null}
              className={`h-12 px-5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 border disabled:opacity-40 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <ArrowArcLeft size={18} weight="bold" />
              <span>Dock</span>
            </button>
          )}

          {caps.supportsLocate && (
            <button
              type="button"
              onClick={() => handleAction('locate')}
              disabled={isOperating !== null}
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Locate Robot (Beep)"
            >
              <SpeakerHigh size={18} weight="duotone" />
            </button>
          )}
        </div>
      </div>

      {/* 2. SUCTION FAN SPEED PRESETS */}
      {caps.fanSpeedList.length > 0 && (
        <div className="space-y-2.5">
          <label
            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-1 ${
              darkMode ? 'text-teal-400' : 'text-teal-600'
            }`}
          >
            <Fan size={15} weight="duotone" />
            <span>Suction Fan Speed</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {caps.fanSpeedList.map((speed) => {
              const isSelected = caps.fanSpeed?.toLowerCase() === speed.toLowerCase();
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSetFanSpeed(speed)}
                  className={`h-11 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-teal-500 border-teal-400 text-slate-950 font-black shadow-md ring-2 ring-teal-400/30'
                      : darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {speed}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MOPPING WATER FLOW PRESETS */}
      {caps.waterFlowList.length > 0 && (
        <div className="space-y-2.5">
          <label
            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-1 ${
              darkMode ? 'text-sky-400' : 'text-sky-600'
            }`}
          >
            <Drop size={15} weight="duotone" />
            <span>Mopping Water Flow</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {caps.waterFlowList.map((flow) => {
              const isSelected = caps.waterFlowLevel?.toLowerCase() === flow.toLowerCase();
              return (
                <button
                  key={flow}
                  type="button"
                  onClick={() => handleSetWaterFlow(flow)}
                  className={`h-11 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer active:scale-95 capitalize ${
                    isSelected
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-black shadow-md ring-2 ring-sky-400/30'
                      : darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  {flow}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CONSUMABLES MAINTENANCE METERS */}
      {caps.hasConsumables && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
            darkMode
              ? 'bg-slate-800/40 border-white/10'
              : 'bg-white/70 border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wrench size={18} weight="duotone" className="text-indigo-400" />
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Consumables & Maintenance
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-xs">
            {caps.mainBrushLeft !== undefined && (
              <div className="space-y-1.5">
                <div
                  className={`flex justify-between text-[11px] font-bold ${
                    darkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <span>Main Brush</span>
                  <span className="font-mono">{caps.mainBrushLeft}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${caps.mainBrushLeft}%` }} />
                </div>
              </div>
            )}

            {caps.sideBrushLeft !== undefined && (
              <div className="space-y-1.5">
                <div
                  className={`flex justify-between text-[11px] font-bold ${
                    darkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <span>Side Brushes</span>
                  <span className="font-mono">{caps.sideBrushLeft}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${caps.sideBrushLeft}%` }} />
                </div>
              </div>
            )}

            {caps.filterLeft !== undefined && (
              <div className="space-y-1.5">
                <div
                  className={`flex justify-between text-[11px] font-bold ${
                    darkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <span>HEPA Filter</span>
                  <span className="font-mono">{caps.filterLeft}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${caps.filterLeft}%` }} />
                </div>
              </div>
            )}

            {caps.sensorDirtyLeft !== undefined && (
              <div className="space-y-1.5">
                <div
                  className={`flex justify-between text-[11px] font-bold ${
                    darkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <span>Optical Sensors</span>
                  <span className="font-mono">{caps.sensorDirtyLeft}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
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
