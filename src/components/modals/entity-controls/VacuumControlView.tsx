import React, { useState } from 'react';
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

interface VacuumControlViewProps {
  entity: HAEntity;
}

export default function VacuumControlView({ entity }: VacuumControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const [isOperating, setIsOperating] = useState<string | null>(null);

  const rawState = (entity?.state || 'docked').toLowerCase();
  const isCleaning = rawState === 'cleaning' || rawState === 'on';
  const isReturning = rawState === 'returning';
  const isPaused = rawState === 'paused';
  const isError = rawState === 'error';
  const isDocked = rawState === 'docked';

  const rawBattery = entity?.attributes?.battery_level ?? entity?.attributes?.battery;
  const batteryLevel = typeof rawBattery === 'number' ? Math.round(rawBattery) : 100;
  const batteryCharging = Boolean(
    entity?.attributes?.battery_icon?.includes('charging') ||
    isDocked ||
    rawState.includes('charging')
  );

  const fanSpeed = entity?.attributes?.fan_speed ? String(entity.attributes.fan_speed) : 'Balanced';
  const fanSpeedList: string[] = Array.isArray(entity?.attributes?.fan_speed_list)
    ? entity.attributes.fan_speed_list
    : ['Quiet', 'Balanced', 'Turbo', 'Max'];

  const waterFlowLevel = entity?.attributes?.water_box_mode || entity?.attributes?.water_level || 'Medium';
  const waterFlowList: string[] = Array.isArray(entity?.attributes?.water_box_mode_list)
    ? entity.attributes.water_box_mode_list
    : ['Off', 'Low', 'Medium', 'High'];

  const mainBrush = entity?.attributes?.main_brush_left ? Math.round(entity.attributes.main_brush_left) : 84;
  const sideBrush = entity?.attributes?.side_brush_left ? Math.round(entity.attributes.side_brush_left) : 92;
  const filter = entity?.attributes?.filter_left ? Math.round(entity.attributes.filter_left) : 78;
  const sensors = entity?.attributes?.sensor_dirty_left ? Math.round(entity.attributes.sensor_dirty_left) : 95;

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
    try {
      updateEntityState(entity.entity_id, entity.state, { ...entity.attributes, fan_speed: speed });
      await callHAService('vacuum', 'set_fan_speed', { fan_speed: speed }, { entity_id: entity.entity_id });
    } catch (err) {
      console.warn('[VacuumControlView] Fan speed error:', err);
    }
  };

  const handleSetWaterFlow = async (level: string) => {
    try {
      updateEntityState(entity.entity_id, entity.state, { ...entity.attributes, water_box_mode: level });
      await callHAService('select', 'select_option', { option: level }, { entity_id: entity.entity_id });
    } catch (err) {
      console.warn('[VacuumControlView] Water flow error:', err);
    }
  };

  const BatteryIcon = batteryCharging
    ? BatteryCharging
    : batteryLevel >= 80
    ? BatteryFull
    : batteryLevel >= 30
    ? BatteryMedium
    : batteryLevel >= 15
    ? BatteryLow
    : BatteryWarning;

  return (
    <div className="space-y-6">
      {/* Hero Status Canvas */}
      <div className="p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full pointer-events-none transition-all ${
            isCleaning ? 'bg-emerald-500/40' : isReturning ? 'bg-sky-500/30' : 'bg-teal-500/20'
          }`}
        />

        <div
          className={`w-20 h-20 rounded-3xl border flex items-center justify-center mb-3 shadow-xl ${
            isCleaning
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/20 animate-pulse'
              : isReturning
              ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sky-500/20'
              : 'bg-teal-500/20 border-teal-400/30 text-teal-300 shadow-teal-500/20'
          }`}
        >
          <Broom size={36} weight="duotone" className={isCleaning ? 'animate-spin [animation-duration:3s]' : ''} />
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight uppercase">
          {rawState.replace(/_/g, ' ')}
        </h3>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-300">
            <BatteryIcon size={16} weight={batteryCharging ? 'fill' : 'duotone'} className={batteryCharging ? 'text-emerald-400' : ''} />
            <span>{batteryLevel}%</span>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {isCleaning ? 'Active Cleaning Mission' : isDocked ? 'Docked & Charging' : 'Ready on Standby'}
          </span>
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="flex items-center gap-2">
        {isCleaning ? (
          <button
            type="button"
            onClick={() => handleAction('pause')}
            disabled={isOperating !== null}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Pause size={18} weight="fill" />
            <span>Pause Clean</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleAction('start')}
            disabled={isOperating !== null}
            className="flex-1 py-3 px-4 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <Play size={18} weight="fill" />
            <span>{isPaused ? 'Resume Clean' : 'Start Clean'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleAction('return_to_base')}
          disabled={isOperating !== null || isDocked}
          className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
            isReturning
              ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-md'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          title="Return to Dock"
        >
          <ArrowArcLeft size={18} weight="bold" />
        </button>

        <button
          type="button"
          onClick={() => handleAction('clean_spot')}
          disabled={isOperating !== null}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          title="Spot Clean"
        >
          <Sparkle size={18} weight="duotone" className="text-amber-400" />
        </button>

        <button
          type="button"
          onClick={() => handleAction('locate')}
          disabled={isOperating !== null}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
          title="Locate (Beep)"
        >
          <SpeakerHigh size={18} weight="duotone" className="text-sky-400" />
        </button>
      </div>

      {/* Fan Speed & Water Flow Selectors */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-teal-400">
              <Fan size={15} weight="duotone" />
              <span>Suction Power</span>
            </span>
            <span className="font-mono text-teal-300 text-[11px] uppercase">{fanSpeed}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10">
            {fanSpeedList.map((speed) => {
              const isSel = fanSpeed.toLowerCase() === speed.toLowerCase();
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Drop size={15} weight="duotone" />
              <span>Mop Scrub Intensity</span>
            </span>
            <span className="font-mono text-sky-300 text-[11px] uppercase">{waterFlowLevel}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10">
            {waterFlowList.map((flow) => {
              const isSel = String(waterFlowLevel).toLowerCase() === flow.toLowerCase();
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
      </div>

      {/* Consumables & Maintenance Health Gauges */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Wrench size={15} weight="duotone" />
            <span>Consumables Service Life</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Remaining %</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-300">Main Roller Brush</span>
              <span className="font-mono text-teal-300">{mainBrush}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full transition-all" style={{ width: `${mainBrush}%` }} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-300">Side Edge Brush</span>
              <span className="font-mono text-teal-300">{sideBrush}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full transition-all" style={{ width: `${sideBrush}%` }} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-300">HEPA Air Filter</span>
              <span className="font-mono text-teal-300">{filter}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full transition-all" style={{ width: `${filter}%` }} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-300">Sensors Clean</span>
              <span className="font-mono text-teal-300">{sensors}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full transition-all" style={{ width: `${sensors}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
