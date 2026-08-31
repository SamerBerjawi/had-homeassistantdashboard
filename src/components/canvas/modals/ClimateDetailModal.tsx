import React, { useState, useEffect } from 'react';
import { Plus, Minus, Drop, Power, Flame, Snowflake, Sparkle, Fan } from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';
import { getClimateModeTheme } from '../../../utils/climateTheme';

interface ClimateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity?: HAEntity | null;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

const MODES = [
  { id: 'cool', label: 'Cooling', icon: Snowflake, activeClass: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40 shadow-cyan-500/20' },
  { id: 'heat', label: 'Heating', icon: Flame, activeClass: 'text-orange-400 bg-orange-500/20 border-orange-500/40 shadow-orange-500/20' },
  { id: 'auto', label: 'Auto', icon: Sparkle, activeClass: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40 shadow-emerald-500/20' },
  { id: 'fan_only', label: 'Fan Only', icon: Fan, activeClass: 'text-teal-400 bg-teal-500/20 border-teal-500/40 shadow-teal-500/20' },
  { id: 'off', label: 'Off', icon: Power, activeClass: 'text-slate-400 bg-white/10 border-white/20 shadow-black/20' }
];

const FAN_SPEEDS = ['Auto', 'Quiet', 'Medium', 'Turbo'];

export default function ClimateDetailModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: ClimateDetailModalProps) {
  if (!isOpen || !entity) return null;

  return (
    <ClimateDetailModalContent
      isOpen={isOpen}
      onClose={onClose}
      entity={entity}
      onUpdateEntity={onUpdateEntity}
    />
  );
}

function ClimateDetailModalContent({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}) {
  const currentTargetTemp = Number(entity.attributes?.target_temp ?? entity.attributes?.temperature ?? 21.0);
  const currentAmbientTemp = Number(entity.attributes?.current_temperature ?? entity.attributes?.temperature ?? 21.5);
  const currentHumidity = Number(entity.attributes?.humidity ?? 48);
  const currentMode = entity.attributes?.mode || entity.state || 'cool';
  const currentFan = entity.attributes?.fan_mode || 'Auto';

  const [targetTemp, setTargetTemp] = useState<number>(isNaN(currentTargetTemp) ? 21 : currentTargetTemp);
  const [activeMode, setActiveMode] = useState<string>(currentMode);
  const [fanSpeed, setFanSpeed] = useState<string>(currentFan);

  useEffect(() => {
    if (entity) {
      const t = Number(entity.attributes?.target_temp ?? entity.attributes?.temperature ?? 21.0);
      setTargetTemp(isNaN(t) ? 21 : t);
      setActiveMode(entity.attributes?.mode || entity.state || 'cool');
      setFanSpeed(entity.attributes?.fan_mode || 'Auto');
    }
  }, [entity?.entity_id, entity?.state, entity?.attributes]);

  const theme = getClimateModeTheme(activeMode, activeMode === 'off' ? 'off' : 'on');
  const HeaderIcon = theme.icon || Flame;

  const handleAdjustTemp = (delta: number) => {
    const next = Math.round((targetTemp + delta) * 2) / 2;
    if (next >= 10 && next <= 35) {
      setTargetTemp(next);
      onUpdateEntity(entity.entity_id, activeMode === 'off' ? 'on' : entity.state, {
        target_temp: next,
        temperature: next
      });
    }
  };

  const handleSelectMode = (modeId: string) => {
    setActiveMode(modeId);
    onUpdateEntity(entity.entity_id, modeId === 'off' ? 'off' : modeId, {
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
      icon={<HeaderIcon size={22} weight={theme.isOff ? 'duotone' : 'fill'} className={`${theme.iconClass} ${theme.iconDropShadow}`} />}
    >
      <div className="space-y-6">
        {/* Central Circular Temperature Display with Steppers */}
        <div className={`flex flex-col items-center justify-center p-6 rounded-3xl bg-black/30 border ${theme.borderDark} relative overflow-hidden transition-all backdrop-blur-md`}>
          <div className="flex items-center gap-6 z-10">
            {/* Minus Button */}
            <button
              type="button"
              onClick={() => handleAdjustTemp(-0.5)}
              className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
              title="Decrease Temp"
            >
              <Minus size={20} weight="duotone" />
            </button>

            {/* Big Temperature Gauge */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className={`text-5xl font-black tracking-tight leading-none font-mono ${theme.isOff ? 'text-slate-400' : 'text-white'}`}>
                {Number(targetTemp || 21).toFixed(1)}°
              </span>
              <span className={`text-xs font-bold uppercase tracking-widest mt-1 ${theme.textClass}`}>
                {theme.isOff ? 'System Standby' : `${theme.name} Target Setpoint`}
              </span>
            </div>

            {/* Plus Button */}
            <button
              type="button"
              onClick={() => handleAdjustTemp(0.5)}
              className={`w-12 h-12 rounded-2xl text-white ${theme.stepperBtnBg} ${theme.stepperBtnHover} ${theme.stepperBtnShadow} flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg`}
              title="Increase Temp"
            >
              <Plus size={20} weight="bold" />
            </button>
          </div>

          {/* Ambient telemetry indicators */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/10 text-xs text-slate-300">
            <span className="flex items-center gap-1 font-mono">
              Current: <strong className="text-white">{Number(currentAmbientTemp || 21.5).toFixed(1)}°C</strong>
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1">
              <Drop size={14} weight="fill" className="text-cyan-400" />
              <span>{currentHumidity}% Humidity</span>
            </span>
          </div>
        </div>

        {/* HVAC Operation Mode Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">HVAC Operation Mode</label>
          <div className="grid grid-cols-5 gap-2">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = activeMode === mode.id;
              const modeTheme = getClimateModeTheme(mode.id, mode.id === 'off' ? 'off' : 'on');
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleSelectMode(mode.id)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? `${modeTheme.badgeBgDark} ${modeTheme.badgeBorderDark} ${modeTheme.badgeTextDark} border shadow-lg scale-105 font-bold`
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                  }`}
                >
                  <Icon size={20} weight={isSelected ? 'fill' : 'duotone'} />
                  <span className="text-xs font-semibold">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fan Speed Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Blower & Fan Speed</label>
          <div className="grid grid-cols-4 gap-2">
            {FAN_SPEEDS.map((speed) => {
              const isSelected = fanSpeed.toLowerCase() === speed.toLowerCase();
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSelectFan(speed)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                  }`}
                >
                  {speed}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
