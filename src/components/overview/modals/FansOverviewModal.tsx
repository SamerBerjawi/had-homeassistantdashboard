/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Fan, 
  Power, 
  ArrowsClockwise, 
  Stairs, 
  HouseLine, 
  ArrowsLeftRight, 
  Thermometer, 
  Compass, 
  Wind, 
  Sparkle,
  Plus,
  Minus
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { detectFanCapabilities } from '../../../services/fanClassification';

interface FansOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fans: ResolvedEntity[];
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function FansOverviewModal({
  isOpen,
  onClose,
  fans,
  onUpdateEntity,
  darkMode = true
}: FansOverviewModalProps) {
  const customFloors = useAutoLayoutStore(s => s.floors);
  const customAreas = useAutoLayoutStore(s => s.areas);
  const resolvedEntities = useAutoLayoutStore(s => s.resolvedEntities);
  const callHAService = useAutoLayoutStore(s => s.callHAService);

  const allEntitiesList = Object.values(resolvedEntities);
  const activeFans = fans.filter(f => f.state === 'on');
  const grouped = groupEntitiesByFloorAndArea(fans, customFloors, customAreas);

  // Toggle Power
  const handleToggleFan = async (fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    const nextPercentage = isCurrentlyOn ? 0 : 66;

    await callHAService('fan', isCurrentlyOn ? 'turn_off' : 'turn_on', {
      ...(isCurrentlyOn ? {} : { percentage: nextPercentage })
    }, { entity_id: fan.entity_id });

    onUpdateEntity(fan.entity_id, nextState, {
      percentage: nextPercentage
    });
  };

  // Set Percentage Speed / Level
  const handleSetSpeed = async (fan: ResolvedEntity, percentage: number, speedName?: string) => {
    if (percentage === 0) {
      await callHAService('fan', 'turn_off', {}, { entity_id: fan.entity_id });
      onUpdateEntity(fan.entity_id, 'off', { percentage: 0, speed: 'off' });
    } else {
      await callHAService('fan', 'set_percentage', { percentage }, { entity_id: fan.entity_id });
      onUpdateEntity(fan.entity_id, 'on', { percentage, ...(speedName ? { speed: speedName } : {}) });
    }
  };

  // Toggle Oscillation (Only for fans supporting oscillation)
  const handleToggleOscillation = async (fan: ResolvedEntity, currentOsc: boolean) => {
    const nextOsc = !currentOsc;
    await callHAService('fan', 'oscillate', { oscillating: nextOsc }, { entity_id: fan.entity_id });
    onUpdateEntity(fan.entity_id, fan.state, { oscillating: nextOsc });
  };

  // Set Oscillation Angle / Sweep Degrees (e.g. DREO 30°, 60°, 90°, 120°)
  const handleSetAngle = async (fan: ResolvedEntity, angle: number) => {
    await callHAService('fan', 'set_oscillation_angle', { angle, oscillation_angle: angle }, { entity_id: fan.entity_id });
    onUpdateEntity(fan.entity_id, fan.state, { oscillation_angle: angle, angle });
  };

  // Toggle Direction (Forward / Reverse)
  const handleToggleDirection = async (fan: ResolvedEntity, currentDir?: string) => {
    const nextDir = currentDir === 'reverse' ? 'forward' : 'reverse';
    await callHAService('fan', 'set_direction', { direction: nextDir }, { entity_id: fan.entity_id });
    onUpdateEntity(fan.entity_id, fan.state, { direction: nextDir });
  };

  // Set Preset Mode (Natural, Sleep, Auto, Turbo, Normal)
  const handleSetPresetMode = async (fan: ResolvedEntity, mode: string) => {
    await callHAService('fan', 'set_preset_mode', { preset_mode: mode }, { entity_id: fan.entity_id });
    onUpdateEntity(fan.entity_id, fan.state, { preset_mode: mode });
  };

  // Adjust Target Temperature (Tuya / Duux heater-cooler / thermostat fans)
  const handleAdjustTargetTemp = async (fan: ResolvedEntity, currentTarget: number = 22, delta: number) => {
    const newTarget = Math.max(16, Math.min(30, currentTarget + delta));
    await callHAService('fan', 'set_target_temperature', { temperature: newTarget }, { entity_id: fan.entity_id });
    onUpdateEntity(fan.entity_id, fan.state, { target_temperature: newTarget });
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Fans & Ventilation"
      subtitle={`${activeFans.length} of ${fans.length} fans actively running`}
      icon={<Fan size={22} weight="duotone" className="text-cyan-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-6">
        
        {/* Grouped Fans: Floor -> Area -> Entity */}
        <div className="space-y-6">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-4">
              
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#06b6d4'}1a`,
                      borderColor: `${floorGroup.color || '#06b6d4'}40`,
                      color: floorGroup.color || '#06b6d4'
                    }}
                  >
                    <DynamicPhosphorIcon 
                      name={floorGroup.icon} 
                      fallback={Stairs} 
                      size={15} 
                      weight="duotone" 
                      style={{ color: floorGroup.color || '#06b6d4' }}
                    />
                  </div>
                  <h4 
                    className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
                    style={{ color: floorGroup.color || undefined }}
                  >
                    {floorGroup.floorName}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    ({floorGroup.areaGroups.reduce((acc, a) => acc + a.entities.length, 0)})
                  </span>
                </div>
              )}

              {/* Area Groups */}
              <div className="space-y-4">
                {floorGroup.areaGroups.map((areaGroup) => (
                  <div key={areaGroup.areaId || 'no-area'} className="space-y-2.5">
                    
                    {/* Area Header */}
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-lg flex items-center justify-center border shrink-0"
                            style={{
                              backgroundColor: `${areaGroup.color || '#06b6d4'}1a`,
                              borderColor: `${areaGroup.color || '#06b6d4'}40`,
                              color: areaGroup.color || '#06b6d4'
                            }}
                          >
                            <DynamicPhosphorIcon 
                              name={areaGroup.icon} 
                              fallback={HouseLine} 
                              size={12} 
                              weight="duotone" 
                              style={{ color: areaGroup.color || '#06b6d4' }}
                            />
                          </div>
                          <span 
                            className="text-xs font-bold text-slate-700 dark:text-slate-300"
                            style={{ color: areaGroup.color || undefined }}
                          >
                            {areaGroup.areaName}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {areaGroup.entities.filter(e => e.state === 'on').length}/{areaGroup.entities.length} running
                        </span>
                      </div>
                    )}

                    {/* Entities List */}
                    <div className="space-y-3">
                      {areaGroup.entities.map((fan) => {
                        const caps = detectFanCapabilities(fan, allEntitiesList);
                        const isOn = caps.isOn;
                        const pct = caps.percentage;

                        return (
                          <div
                            key={fan.entity_id}
                            className={`p-4 rounded-2xl border transition-all duration-200 space-y-3 ${
                              isOn
                                ? 'bg-cyan-500/10 border-cyan-500/30 shadow-xs'
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            {/* 1. Header: Power Button, Name, Model Tag, Status */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFan(fan)}
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-95 ${
                                    isOn
                                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                                      : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                  title={isOn ? 'Turn fan off' : 'Turn fan on'}
                                >
                                  <Fan size={20} weight={isOn ? "fill" : "duotone"} className={isOn ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{fan.name}</h4>
                                    {caps.brandKind === 'dreo' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                        DREO
                                      </span>
                                    )}
                                    {caps.brandKind === 'duux' && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                        Duux
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {isOn ? (
                                      <>
                                        {caps.brandKind === 'duux'
                                          ? `Level ${Math.max(1, Math.round((pct / 100) * 12))} of 12`
                                          : `${pct}% Speed`
                                        }
                                        {caps.supportsOscillation && caps.isOscillating && ` • Oscillating${caps.currentAngle ? ` (${caps.currentAngle}°)` : ''}`}
                                        {caps.supportsPresetModes && caps.currentPresetMode && ` • ${caps.currentPresetMode.toUpperCase()}`}
                                      </>
                                    ) : 'Standby'}
                                  </p>
                                </div>
                              </div>

                              {/* Power State Badge */}
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                                isOn
                                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                                  : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                              }`}>
                                {isOn ? 'RUNNING' : 'OFF'}
                              </span>
                            </div>

                            {/* 2. Temperature Settings & Readout (Tuya / Duux smart fans) */}
                            {caps.supportsTemperature && (
                              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    <Thermometer size={14} weight="duotone" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Room Temp: </span>
                                    <span className="font-mono font-black text-slate-900 dark:text-white">
                                      {caps.currentTemperature?.toFixed(1) || '22.0'}{caps.temperatureUnit}
                                    </span>
                                  </div>
                                </div>

                                {caps.targetTemperature !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Target:</span>
                                    <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-white/10 rounded-lg p-0.5 border border-slate-300/60 dark:border-white/10 font-mono">
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustTargetTemp(fan, caps.targetTemperature, -1)}
                                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                        title="Decrease Target Temp"
                                      >
                                        <Minus size={11} weight="bold" />
                                      </button>
                                      <span className="px-1 font-bold text-slate-900 dark:text-white text-xs">
                                        {caps.targetTemperature}°
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustTargetTemp(fan, caps.targetTemperature, 1)}
                                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                        title="Increase Target Temp"
                                      >
                                        <Plus size={11} weight="bold" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 3. Speed / Level Controls */}
                            {caps.supportsSpeed && (
                              <div className="space-y-1.5 pt-1">
                                {caps.brandKind === 'duux' ? (
                                  /* Duux 12-Step Level Grid or Slider */
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                      <span>Duux Whisper Levels (1 - 12)</span>
                                      <span className="font-mono text-cyan-600 dark:text-cyan-400">
                                        {isOn ? `Level ${Math.max(1, Math.round((pct / 100) * 12))}` : 'Off'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((lvl) => {
                                        const lvlPct = Math.round((lvl / 12) * 100);
                                        const isCurLvl = isOn && Math.abs(pct - lvlPct) <= 5;

                                        return (
                                          <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => handleSetSpeed(fan, lvlPct, `level ${lvl}`)}
                                            className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                              isCurLvl
                                                ? 'bg-cyan-500 text-slate-950 font-black shadow-xs ring-1 ring-cyan-400'
                                                : 'bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300/50 dark:border-white/5'
                                            }`}
                                          >
                                            {lvl}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  /* Standard Discrete Speed Buttons (Off, Low, Med, High) */
                                  <div className="grid grid-cols-4 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSetSpeed(fan, 0, 'off')}
                                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        !isOn
                                          ? 'bg-slate-300 dark:bg-white/20 text-slate-900 dark:text-white shadow-xs'
                                          : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      Off
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetSpeed(fan, 33, 'low')}
                                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isOn && pct <= 33
                                          ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                          : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      Low
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetSpeed(fan, 66, 'medium')}
                                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isOn && pct > 33 && pct <= 66
                                          ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                          : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      Med
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetSpeed(fan, 100, 'high')}
                                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isOn && pct > 66
                                          ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                          : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      High
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 4. Advanced Controls (Oscillation, Degrees, Direction, Preset Modes) */}
                            {(caps.supportsOscillation || caps.supportsDirection || caps.supportsPresetModes) && (
                              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2.5">
                                
                                {/* Row: Oscillation Toggle & Direction Toggle */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* OSCILLATION TOGGLE (ONLY rendered if device supports oscillation) */}
                                  {caps.supportsOscillation && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleOscillation(fan, caps.isOscillating)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                        caps.isOscillating
                                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-xs'
                                          : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                                      }`}
                                    >
                                      <ArrowsClockwise size={14} weight="bold" className={caps.isOscillating ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
                                      <span>Oscillate {caps.isOscillating ? 'On' : 'Off'}</span>
                                    </button>
                                  )}

                                  {/* DIRECTION TOGGLE (ONLY rendered if device supports direction) */}
                                  {caps.supportsDirection && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDirection(fan, caps.currentDirection)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer"
                                      title="Toggle airflow direction"
                                    >
                                      <ArrowsLeftRight size={14} weight="bold" />
                                      <span>Airflow: {caps.currentDirection === 'reverse' ? 'Reverse (Up)' : 'Forward (Down)'}</span>
                                    </button>
                                  )}
                                </div>

                                {/* OSCILLATION SWEEP DEGREES (e.g. DREO 30°, 60°, 90°, 120°) */}
                                {caps.supportsOscillation && caps.supportsOscillationAngle && caps.availableAngles.length > 0 && (
                                  <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 px-1">
                                      <Compass size={13} weight="duotone" className="text-cyan-500" />
                                      Sweep:
                                    </span>
                                    <div className="flex-1 flex gap-1">
                                      {caps.availableAngles.map((deg) => (
                                        <button
                                          key={deg}
                                          type="button"
                                          onClick={() => handleSetAngle(fan, deg)}
                                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            caps.currentAngle === deg
                                              ? 'bg-cyan-500 text-slate-950 font-black shadow-xs ring-1 ring-cyan-400'
                                              : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
                                          }`}
                                        >
                                          {deg}°
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* PRESET MODES (e.g. Normal, Natural, Sleep, Auto, Turbo) */}
                                {caps.supportsPresetModes && caps.presetModes.length > 0 && (
                                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                                      <Wind size={13} weight="duotone" className="text-cyan-500" />
                                      Mode:
                                    </span>
                                    <div className="flex gap-1.5">
                                      {caps.presetModes.map((mode) => {
                                        const isSelected = caps.currentPresetMode === mode;
                                        return (
                                          <button
                                            key={mode}
                                            type="button"
                                            onClick={() => handleSetPresetMode(fan, mode)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer shrink-0 ${
                                              isSelected
                                                ? 'bg-cyan-500 text-slate-950 font-black shadow-xs ring-1 ring-cyan-400'
                                                : 'bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                          >
                                            {mode}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
