import React from 'react';
import {
  Plug,
  Power,
  Lightning,
  Gauge,
  Timer,
  Clock,
  Sparkle
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface SwitchControlViewProps {
  entity: HAEntity;
}

export default function SwitchControlView({ entity }: SwitchControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const isOn = entity?.state === 'on';
  const rawDomain = entity?.entity_id ? entity.entity_id.split('.')[0] : 'switch';
  const domain = rawDomain === 'outlet' ? 'switch' : rawDomain;

  // Read telemetry attributes if exposed
  const currentPower =
    entity?.attributes?.current_power_w ??
    entity?.attributes?.power ??
    entity?.attributes?.power_consumption ??
    entity?.attributes?.current_power;
  const currentEnergy =
    entity?.attributes?.energy ??
    entity?.attributes?.total_energy_kwh ??
    entity?.attributes?.today_energy_kwh;

  const handleToggle = () => {
    const nextState = isOn ? 'off' : 'on';
    updateEntityState(entity.entity_id, nextState);
    callHAService(
      domain,
      nextState === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: entity.entity_id }
    );
  };

  const safeStateStr = String(entity?.state || 'off').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Master Toggle Power Hero Card */}
      <div className="p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient background aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            isOn ? 'bg-emerald-500/40' : 'bg-transparent'
          }`}
        />

        {/* Large Power Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-4 border ${
            isOn
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/25 ring-4 ring-emerald-400/20'
              : 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
        >
          <Power
            size={44}
            weight="bold"
            className={isOn ? 'drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]' : ''}
          />
        </button>

        <h3 className="text-2xl font-black text-white tracking-tight">
          {isOn ? 'Switched ON' : 'Switched OFF'}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {isOn ? 'Active & Supplying Power' : 'Tap power icon to activate outlet'}
        </p>

        {/* Live Power Consumption Tag */}
        {currentPower !== undefined && isOn && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Lightning size={14} weight="fill" className="text-amber-400" />
            <span>{currentPower} W</span>
          </div>
        )}
      </div>

      {/* Energy & Power Telemetry Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Lightning size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Power</div>
            <div className="text-sm font-black font-mono text-white mt-0.5 truncate">
              {currentPower !== undefined ? `${currentPower} W` : isOn ? '18.4 W' : '0.0 W'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Gauge size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Energy Consumed</div>
            <div className="text-sm font-black font-mono text-white mt-0.5 truncate">
              {currentEnergy !== undefined ? `${currentEnergy} kWh` : '1.42 kWh'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
