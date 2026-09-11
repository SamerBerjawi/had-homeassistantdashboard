import React, { useMemo } from 'react';
import {
  Plug,
  Power,
  Lightning,
  Gauge
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
  darkMode?: boolean;
}

export default function SwitchControlView({ entity, darkMode = true }: SwitchControlViewProps) {
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
    <div className="space-y-6">
      {/* Master Toggle Power Hero Card */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          darkMode
            ? 'bg-slate-800/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.36)]'
            : 'bg-white/70 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
        }`}
      >
        {/* Glow ambient background aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            isOn ? 'bg-emerald-500/35' : 'bg-transparent'
          }`}
        />

        {/* Large Tactile Power Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-22 h-22 sm:w-26 sm:h-26 rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isOn
              ? darkMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-emerald-500/30 ring-4 ring-emerald-400/20'
                : 'bg-emerald-100/90 border-emerald-400 text-emerald-600 shadow-emerald-500/20 ring-4 ring-emerald-400/25'
              : darkMode
              ? 'bg-slate-800/80 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
          title={isOn ? 'Click to Turn Off' : 'Click to Turn On'}
        >
          {caps.deviceClass === 'outlet' ? (
            <Plug
              size={44}
              weight={isOn ? 'fill' : 'duotone'}
              className={isOn ? 'drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]' : ''}
            />
          ) : (
            <Power
              size={44}
              weight="bold"
              className={isOn ? 'drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]' : ''}
            />
          )}
        </button>

        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {isOn ? 'Power Active' : 'Switched Off'}
        </h3>
        <p
          className={`text-xs font-medium mt-1 flex items-center gap-1.5 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>{isOn ? 'Supplying Power' : 'Standby / Off'}</span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* Live Power Consumption Chip (if actively drawing power) */}
        {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined && isOn && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-mono font-extrabold ${
              darkMode
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700'
            }`}
          >
            <Lightning size={14} weight="fill" className="text-amber-500" />
            <span>{caps.currentPowerWatts} W</span>
          </div>
        )}

        {/* Quick Power Toggle */}
        <button
          type="button"
          onClick={handleToggle}
          className={`mt-4 px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs font-extrabold shadow-md border ${
            isOn
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border-emerald-400'
              : darkMode
              ? 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          <Power size={15} weight="bold" />
          <span>{isOn ? 'Turn Power Off' : 'Turn Power On'}</span>
        </button>
      </div>

      {/* Energy & Power Telemetry Grid */}
      {(caps.hasPowerMonitoring || caps.hasEnergyMonitoring || caps.voltage !== undefined || caps.currentAmps !== undefined) && (
        <div className="space-y-2.5">
          <span
            className={`text-xs font-bold uppercase tracking-wider block px-1 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Telemetry & Consumption
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  darkMode
                    ? 'bg-slate-800/40 border-white/10'
                    : 'bg-white/70 border-slate-200/80 shadow-xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    darkMode
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-amber-100 text-amber-600 border-amber-200'
                  }`}
                >
                  <Lightning size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Current Power
                  </div>
                  <div
                    className={`text-sm font-black font-mono mt-0.5 truncate ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {caps.currentPowerWatts} W
                  </div>
                </div>
              </div>
            )}

            {caps.hasEnergyMonitoring && caps.energyKwh !== undefined && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  darkMode
                    ? 'bg-slate-800/40 border-white/10'
                    : 'bg-white/70 border-slate-200/80 shadow-xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    darkMode
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                  }`}
                >
                  <Gauge size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Total Energy
                  </div>
                  <div
                    className={`text-sm font-black font-mono mt-0.5 truncate ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {caps.energyKwh} kWh
                  </div>
                </div>
              </div>
            )}

            {caps.voltage !== undefined && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  darkMode
                    ? 'bg-slate-800/40 border-white/10'
                    : 'bg-white/70 border-slate-200/80 shadow-xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    darkMode
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'bg-sky-100 text-sky-600 border-sky-200'
                  }`}
                >
                  <Lightning size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Line Voltage
                  </div>
                  <div
                    className={`text-sm font-black font-mono mt-0.5 truncate ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {caps.voltage} V
                  </div>
                </div>
              </div>
            )}

            {caps.currentAmps !== undefined && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  darkMode
                    ? 'bg-slate-800/40 border-white/10'
                    : 'bg-white/70 border-slate-200/80 shadow-xs'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    darkMode
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-purple-100 text-purple-600 border-purple-200'
                  }`}
                >
                  <Gauge size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Current Flow
                  </div>
                  <div
                    className={`text-sm font-black font-mono mt-0.5 truncate ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {caps.currentAmps} A
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
