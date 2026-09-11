import React, { useMemo } from 'react';
import {
  Plug,
  Power,
  Lightning,
  Gauge
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
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
  customIcon?: string | null;
}

export default function SwitchControlView({ entity, darkMode = true, customIcon }: SwitchControlViewProps) {
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

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const isOutlet = caps.deviceClass === 'outlet';

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
              backgroundColor: isOn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.12)',
              borderColor: isOn ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.25)',
              color: isOn ? '#10b981' : '#94a3b8'
            }}
          >
            {customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight={isOn ? 'fill' : 'duotone'} />
            ) : isOutlet ? (
              <Plug size={18} weight={isOn ? 'fill' : 'duotone'} />
            ) : (
              <Power size={18} weight={isOn ? 'bold' : 'duotone'} />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || (isOutlet ? 'POWER OUTLET' : 'SWITCH')}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || (isOutlet ? 'Smart Outlet' : 'Power Switch')}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Master Power Button */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isOn
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isOn ? 'Active' : 'Off'}</span>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
              isOn
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                : darkMode
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-xs'
            }`}
            aria-label={isOn ? 'Turn Switch Off' : 'Turn Switch On'}
          >
            <Power size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MASTER TOGGLE HERO SECTION (Health Metric Card Typography)             */}
      {/* ========================================================================= */}
      <div
        className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
      >
        {/* Dynamic Subtle Ambient Glow Aura */}
        <div
          className={`absolute -inset-10 opacity-25 blur-3xl rounded-full transition-all duration-700 pointer-events-none ${
            isOn ? 'bg-emerald-500/30' : 'bg-transparent'
          }`}
        />

        {/* Large Tactile Power Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] mb-3 border ${
            isOn
              ? darkMode
                ? 'bg-emerald-500/15 border-emerald-400/80 text-emerald-300 ring-4 ring-emerald-400/20'
                : 'bg-emerald-100/80 border-emerald-400 text-emerald-600 ring-4 ring-emerald-400/25'
              : darkMode
                ? 'bg-black/20 hover:bg-black/30 border-white/10 text-slate-500 hover:text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500 hover:text-slate-800'
          }`}
          title={isOn ? 'Click to Turn Off' : 'Click to Turn On'}
        >
          {isOutlet ? (
            <Plug
              size={40}
              weight={isOn ? 'fill' : 'duotone'}
              className={isOn ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' : ''}
            />
          ) : (
            <Power
              size={40}
              weight="bold"
              className={isOn ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' : ''}
            />
          )}
        </button>

        {/* HealthMetricCard Style Big Values */}
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white my-1">
          {isOn ? 'Power Active' : 'Switched Off'}
        </h3>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
          <span>{isOn ? 'Supplying continuous power' : 'Standby / Disconnected'}</span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* Live Power Consumption Pill (if actively drawing power) */}
        {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined && isOn && (
          <div
            className={`mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-mono font-black ${
              darkMode
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700'
            }`}
          >
            <Lightning size={14} weight="fill" className="text-amber-500" />
            <span>{caps.currentPowerWatts} W Live</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. ENERGY & POWER TELEMETRY BENTO DECK                                    */}
      {/* ========================================================================= */}
      {(caps.hasPowerMonitoring || caps.hasEnergyMonitoring || caps.voltage !== undefined || caps.currentAmps !== undefined) && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-0.5">
            Telemetry & Power Analytics
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined && (
              <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    color: '#f59e0b'
                  }}
                >
                  <Lightning size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Current Power
                  </div>
                  <div className="text-sm font-black font-mono mt-0.5 truncate text-slate-900 dark:text-white">
                    {caps.currentPowerWatts} W
                  </div>
                </div>
              </div>
            )}

            {caps.hasEnergyMonitoring && caps.energyKwh !== undefined && (
              <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                    color: '#10b981'
                  }}
                >
                  <Gauge size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Total Energy
                  </div>
                  <div className="text-sm font-black font-mono mt-0.5 truncate text-slate-900 dark:text-white">
                    {caps.energyKwh} kWh
                  </div>
                </div>
              </div>
            )}

            {caps.voltage !== undefined && (
              <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'rgba(14, 165, 233, 0.15)',
                    borderColor: 'rgba(14, 165, 233, 0.35)',
                    color: '#0ea5e9'
                  }}
                >
                  <Lightning size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Line Voltage
                  </div>
                  <div className="text-sm font-black font-mono mt-0.5 truncate text-slate-900 dark:text-white">
                    {caps.voltage} V
                  </div>
                </div>
              </div>
            )}

            {caps.currentAmps !== undefined && (
              <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
                <div
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    borderColor: 'rgba(168, 85, 247, 0.35)',
                    color: '#a855f7'
                  }}
                >
                  <Gauge size={20} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Current Flow
                  </div>
                  <div className="text-sm font-black font-mono mt-0.5 truncate text-slate-900 dark:text-white">
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
