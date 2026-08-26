import React, { useState } from 'react';
import { Thermometer, Plus, Minus, Wind, Drop, Power, Flame, Snowflake, Sparkle, Fan } from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';

interface ClimateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

const MODES = [
  { id: 'cool', label: 'Cooling', icon: Snowflake, color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30' },
  { id: 'heat', label: 'Heating', icon: Flame, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
  { id: 'eco', label: 'Eco Save', icon: Sparkle, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
  { id: 'off', label: 'Off', icon: Power, color: 'text-slate-400 bg-white/5 border-white/10' }
];

const FAN_SPEEDS = ['Auto', 'Quiet', 'Medium', 'Turbo'];

export default function ClimateDetailModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: ClimateDetailModalProps) {
  const currentTargetTemp = entity.attributes?.target_temp ?? entity.attributes?.temperature ?? 21.0;
  const currentAmbientTemp = entity.attributes?.current_temperature ?? entity.attributes?.temperature ?? 21.5;
  const currentHumidity = entity.attributes?.humidity ?? 48;
  const currentMode = entity.attributes?.mode || entity.state || 'cool';
  const currentFan = entity.attributes?.fan_mode || 'Auto';

  const [targetTemp, setTargetTemp] = useState<number>(currentTargetTemp);
  const [activeMode, setActiveMode] = useState<string>(currentMode);
  const [fanSpeed, setFanSpeed] = useState<string>(currentFan);

  const handleAdjustTemp = (delta: number) => {
    const next = Math.round((targetTemp + delta) * 2) / 2;
    if (next >= 16 && next <= 30) {
      setTargetTemp(next);
      onUpdateEntity(entity.entity_id, activeMode === 'off' ? 'on' : entity.state, {
        target_temp: next,
        temperature: next
      });
    }
  };

  const handleSelectMode = (modeId: string) => {
    setActiveMode(modeId);
    onUpdateEntity(entity.entity_id, modeId === 'off' ? 'off' : 'on', {
      mode: modeId
    });
  };

  const handleSelectFan = (speed: string) => {
    setFanSpeed(speed);
    onUpdateEntity(entity.entity_id, entity.state, {
      fan_mode: speed
    });
  };

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={entity.attributes?.friendly_name || 'Thermostat Zone'}
      subtitle={entity.entity_id}
      icon={<Thermometer size={22} weight="duotone" className="text-sky-400" />}
    >
      <div className="space-y-6">
        {/* Central Circular Temperature Display with Steppers */}
        <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-black/30 border border-white/10 relative overflow-hidden">
          <div className="flex items-center gap-6 z-10">
            {/* Minus Button */}
            <button
              onClick={() => handleAdjustTemp(-0.5)}
              className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
              title="Decrease Temp"
            >
              <Minus size={20} weight="duotone" />
            </button>

            {/* Big Temperature Gauge */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-5xl font-black text-white font-mono tracking-tight leading-none">
                {targetTemp.toFixed(1)}°
              </span>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mt-1">
                Target Setpoint
              </span>
            </div>

            {/* Plus Button */}
            <button
              onClick={() => handleAdjustTemp(0.5)}
              className="w-12 h-12 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-sky-500/30"
              title="Increase Temp"
            >
              <Plus size={20} weight="bold" />
            </button>
          </div>

          {/* Sub Stats Row */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Thermometer size={15} weight="duotone" className="text-slate-400" />
              <span>Ambient: <strong className="text-white font-mono">{currentAmbientTemp.toFixed(1)}°C</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Drop size={15} weight="duotone" className="text-cyan-400" />
              <span>Humidity: <strong className="text-white font-mono">{currentHumidity}%</strong></span>
            </div>
          </div>
        </div>

        {/* HVAC Operation Mode Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 block">Operation Mode</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {MODES.map((mode) => {
              const IconComponent = mode.icon;
              const isActive = activeMode.toLowerCase().includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode.id)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? `${mode.color} shadow-lg scale-105 font-extrabold`
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <IconComponent size={22} weight="duotone" />
                  <span className="text-xs">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fan Speed Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Fan size={15} weight="duotone" className="text-sky-400" /> Fan Speed
          </div>
          <div className="grid grid-cols-4 gap-2">
            {FAN_SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => handleSelectFan(speed)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  fanSpeed === speed
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                }`}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
