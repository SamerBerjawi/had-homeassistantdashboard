import React, { useState, useMemo } from 'react';
import {
  Broom,
  Play,
  Pause,
  Stop,
  ArrowArcLeft,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Fan,
  Drop,
  SpeakerHigh,
  Sparkle,
  Wrench,
  NavigationArrow,
  CheckCircle,
  Warning
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
}

export default function VacuumControlView({ entity }: VacuumControlViewProps) {
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
    <div className="space-y-5">
      {/* 1. MASTER ROBOT VACUUM HERO CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            caps.isError
              ? 'bg-rose-500/40'
              : caps.isCleaning
              ? 'bg-emerald-500/40'
              : caps.isReturning
              ? 'bg-sky-500/40'
              : caps.isPaused
              ? 'bg-amber-500/40'
              : 'bg-slate-500/20'
          }`}
        />

        {/* Animated Robot Vacuum Disc Graphic */}
        <div className="relative mb-3 group">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex items-center justify-center relative shadow-2xl transition-all ${
              caps.isCleaning
                ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/20'
                : caps.isReturning
                ? 'bg-sky-500/20 border-sky-400 ring-4 ring-sky-400/20'
                : caps.isPaused
                ? 'bg-amber-500/20 border-amber-400'
                : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <Broom
              size={48}
              weight="duotone"
              className={`transition-all ${
                caps.isCleaning
                  ? 'text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse'
                  : caps.isReturning
                  ? 'text-sky-300'
                  : caps.isPaused
                  ? 'text-amber-300'
                  : 'text-slate-400'
              }`}
            />
          </div>

          {/* Battery Status Badge on disc corner */}
          {caps.batteryLevel !== undefined && (
            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-slate-900 border border-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1 shadow-md">
              {caps.isCharging ? (
                <BatteryCharging size={13} weight="bold" className="text-emerald-400 animate-pulse" />
              ) : (
                <BatteryMedium size={13} weight="bold" className="text-slate-400" />
              )}
              <span>{caps.batteryLevel}%</span>
            </div>
          )}
        </div>

        {/* Headline */}
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight capitalize">
          {caps.isError
            ? 'Error / Stuck'
            : caps.isCleaning
            ? 'Active Cleaning'
            : caps.isReturning
            ? 'Returning to Dock'
            : caps.isPaused
            ? 'Cleaning Paused'
            : caps.isDocked
            ? 'Docked & Ready'
            : caps.state}
        </h3>

        <p className="text-xs text-slate-400 font-medium mt-1">
          {caps.isDocked && caps.isCharging ? 'Charging Battery' : 'Autonomous Robotic Care'}
          {lastChangedStr && ` • ${lastChangedStr}`}
        </p>

        {/* Master Action Transport Bar */}
        <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap justify-center">
          {caps.isCleaning ? (
            <button
              type="button"
              onClick={() => handleAction('pause')}
              disabled={isOperating !== null}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <Pause size={16} weight="fill" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction('start')}
              disabled={isOperating !== null}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <Play size={16} weight="fill" />
              <span>{caps.isPaused ? 'Resume Cleaning' : 'Start Clean'}</span>
            </button>
          )}

          {caps.supportsReturnHome && (
            <button
              type="button"
              onClick={() => handleAction('return_to_base')}
              disabled={caps.isDocked || isOperating !== null}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/10"
              title="Locate Robot (Beep)"
            >
              <SpeakerHigh size={16} weight="duotone" />
            </button>
          )}
        </div>
      </div>

      {/* 2. SUCTION FAN SPEED PRESETS (Strictly if fanSpeedList is available) */}
      {caps.fanSpeedList.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Fan size={15} weight="duotone" className="text-teal-400" />
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
                  className={`p-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer active:scale-95 text-center ${
                    isSelected
                      ? 'bg-teal-500 border-teal-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                  }`}
                >
                  {speed}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MOPPING WATER FLOW PRESETS (Strictly if waterFlowList is available) */}
      {caps.waterFlowList.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Drop size={15} weight="duotone" className="text-sky-400" />
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
                  className={`p-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer active:scale-95 text-center ${
                    isSelected
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-white/10 text-slate-300'
                  }`}
                >
                  {flow}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. REAL CONSUMABLES MAINTENANCE METERS (Strictly if physical vacuum provides them) */}
      {caps.hasConsumables && (
        <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench size={16} weight="duotone" className="text-indigo-400" />
            <span className="text-xs font-bold text-slate-300">Consumables & Maintenance</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {caps.mainBrushLeft !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Main Roller Brush</span>
                  <span className="font-mono text-white font-bold">{caps.mainBrushLeft}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${caps.mainBrushLeft}%` }} />
                </div>
              </div>
            )}

            {caps.sideBrushLeft !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Side Brushes</span>
                  <span className="font-mono text-white font-bold">{caps.sideBrushLeft}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: `${caps.sideBrushLeft}%` }} />
                </div>
              </div>
            )}

            {caps.filterLeft !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>HEPA Dust Filter</span>
                  <span className="font-mono text-white font-bold">{caps.filterLeft}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${caps.filterLeft}%` }} />
                </div>
              </div>
            )}

            {caps.sensorDirtyLeft !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Optical Sensors</span>
                  <span className="font-mono text-white font-bold">{caps.sensorDirtyLeft}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${caps.sensorDirtyLeft}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
