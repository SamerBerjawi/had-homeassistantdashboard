/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Car, Zap, BatteryCharging, Power, Gauge, Clock } from 'lucide-react';
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
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isCharging 
              ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shadow-emerald-500/20' 
              : 'bg-white/10 border border-white/10 text-slate-400'
          }`}>
            <Car size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-emerald-400 font-semibold truncate flex items-center gap-1">
              {isCharging ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
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
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/30'
              : 'bg-white/10 hover:bg-white/20 text-slate-400'
          }`}
          title={isCharging ? 'Stop Charging' : 'Start Fast Charge'}
        >
          <Zap size={14} className={isCharging ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Center Display: SOC Battery Percentage & Range */}
      <div className="my-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono tracking-tight leading-none">
              {batteryPct}%
            </span>
            <span className="text-xs text-slate-400 font-bold">SoC</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-white font-mono">368 km</p>
            <p className="text-[10px] text-slate-400">Total Range</p>
          </div>
        </div>

        {/* Battery Progress Bar with Target Marker */}
        <div className="relative w-full h-2.5 rounded-full bg-black/40 p-0.5 border border-white/10 mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCharging
                ? 'bg-linear-to-r from-emerald-500 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : 'bg-slate-500'
            }`}
            style={{ width: `${batteryPct}%` }}
          />
          {/* Target Limit Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-sm"
            style={{ left: `${targetPct}%` }}
            title={`Target limit: ${targetPct}%`}
          />
        </div>
      </div>

      {/* Bottom row: Time left & Rate */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="flex items-center gap-1 text-slate-300">
          <Clock size={11} className="text-emerald-400" />
          {isCharging ? '1h 15m to 80%' : 'Target: 80%'}
        </span>
        <span className="font-semibold text-slate-300 font-mono">
          3-Phase 16A (400V)
        </span>
      </div>
    </div>
  );
}
