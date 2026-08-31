import React, { useMemo } from 'react';
import {
  Plug,
  Power,
  Lightning,
  Gauge,
  Info
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectSwitchCapabilities,
  SwitchCapabilities
} from '../../../services/switchClassification';

interface SwitchControlViewProps {
  entity: HAEntity;
}

export default function SwitchControlView({ entity }: SwitchControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: SwitchCapabilities = useMemo(() => {
    return detectSwitchCapabilities(entity);
  }, [entity]);

  const isOn = caps.isOn;
  const rawDomain = entity?.entity_id ? entity.entity_id.split('.')[0] : 'switch';
  const domain = rawDomain === 'outlet' ? 'switch' : rawDomain;

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

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  return (
    <div className="space-y-5">
      {/* Master Toggle Power Hero Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient background aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            isOn ? 'bg-emerald-500/40' : 'bg-transparent'
          }`}
        />

        {/* Large Tactile Power Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isOn
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/25 ring-4 ring-emerald-400/20'
              : 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
          }`}
          title={isOn ? 'Click to Turn Off' : 'Click to Turn On'}
        >
          {caps.deviceClass === 'outlet' ? (
            <Plug
              size={40}
              weight={isOn ? 'fill' : 'duotone'}
              className={isOn ? 'drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]' : ''}
            />
          ) : (
            <Power
              size={40}
              weight="bold"
              className={isOn ? 'drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]' : ''}
            />
          )}
        </button>

        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {isOn ? 'Power Active' : 'Switched Off'}
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {isOn ? 'Supplying Power' : 'Off'}
          {lastChangedStr && ` • ${lastChangedStr}`}
        </p>

        {/* Live Power Consumption Chip (if actively drawing power) */}
        {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined && isOn && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Lightning size={14} weight="fill" className="text-amber-400" />
            <span>{caps.currentPowerWatts} W</span>
          </div>
        )}
      </div>

      {/* Energy & Power Telemetry Grid (Only shown if real telemetry exists) */}
      {(caps.hasPowerMonitoring || caps.hasEnergyMonitoring || caps.voltage !== undefined) && (
        <div className="grid grid-cols-2 gap-2.5">
          {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined && (
            <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Lightning size={18} weight="duotone" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Power</div>
                <div className="text-sm font-black font-mono text-white mt-0.5 truncate">
                  {caps.currentPowerWatts} W
                </div>
              </div>
            </div>
          )}

          {caps.hasEnergyMonitoring && caps.energyKwh !== undefined && (
            <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Gauge size={18} weight="duotone" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Energy</div>
                <div className="text-sm font-black font-mono text-white mt-0.5 truncate">
                  {caps.energyKwh} kWh
                </div>
              </div>
            </div>
          )}

          {caps.voltage !== undefined && (
            <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Lightning size={18} weight="duotone" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Voltage</div>
                <div className="text-sm font-black font-mono text-white mt-0.5 truncate">
                  {caps.voltage} V
                </div>
              </div>
            </div>
          )}

          {caps.currentAmps !== undefined && (
            <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Gauge size={18} weight="duotone" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current</div>
                <div className="text-sm font-black font-mono text-white mt-0.5 truncate">
                  {caps.currentAmps} A
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
