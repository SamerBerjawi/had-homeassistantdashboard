import React, { useState } from 'react';
import { Car, Lightning, BatteryCharging, Power, Gauge, Clock } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface EVChargingCardProps {
  config: CardConfig;
  entity?: HAEntity;
  onOpenModal: () => void;
}

export default function EVChargingCard({
  config,
  entity,
  onOpenModal
}: EVChargingCardProps) {
  const [isCharging, setIsCharging] = useState(true);
  const [batteryPct, setBatteryPct] = useState(74);
  const chargePowerKw = isCharging ? 11.2 : 0;
  const targetPct = 80;
  const title = config.title || 'Tesla Model 3 EV';

  const handleToggleCharging = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCharging(!isCharging);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Car
            size={24}
            weight="duotone"
            className={`shrink-0 ${isCharging ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h4>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate flex items-center gap-1">
              {isCharging ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Charging ({chargePowerKw} kW)
                </>
              ) : 'Connected • Idle'}
            </p>
          </div>
        </div>

        {/* Quick Power Toggle */}
        <button
          onClick={handleToggleCharging}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isCharging
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/30 border-transparent'
              : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-slate-400'
          }`}
          title={isCharging ? 'Stop Charging' : 'Start Fast Charge'}
        >
          <Lightning size={15} weight="duotone" />
        </button>
      </div>

      {/* Center Display: SOC Battery Percentage & Range */}
      <div className="my-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
              {batteryPct}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">SoC</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 dark:text-white font-mono">368 km</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Range</p>
          </div>
        </div>

        {/* Battery Progress Bar with Target Marker */}
        <div className="relative w-full h-2.5 rounded-full bg-slate-200 dark:bg-black/40 p-0.5 border border-slate-300 dark:border-white/10 mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCharging
                ? 'bg-linear-to-r from-emerald-500 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : 'bg-slate-400 dark:bg-slate-600'
            }`}
            style={{ width: `${batteryPct}%` }}
          />
          {/* Target Limit Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 dark:bg-amber-400 shadow-xs"
            style={{ left: `${targetPct}%` }}
            title={`Target limit: ${targetPct}%`}
          />
        </div>
      </div>

      {/* Bottom row: Time left & Rate */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-white/10">
        <span className="flex items-center gap-1 text-slate-750 dark:text-slate-300">
          <Clock size={12} weight="duotone" className="text-emerald-500" />
          {isCharging ? '1h 15m to 80%' : 'Target: 80%'}
        </span>
        <span className="font-semibold text-slate-750 dark:text-slate-300 font-mono">
          3-Phase 16A (400V)
        </span>
      </div>
    </div>
  );
}
