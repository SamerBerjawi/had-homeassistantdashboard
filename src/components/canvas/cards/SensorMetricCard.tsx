/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Gauge, TrendingUp, Zap, Wind, Battery, Droplets } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface SensorMetricCardProps {
  config: CardConfig;
  entity: HAEntity;
  onOpenModal: () => void;
}

export default function SensorMetricCard({
  config,
  entity,
  onOpenModal
}: SensorMetricCardProps) {
  const title = config.title || entity.attributes?.friendly_name || 'Metric Sensor';
  const stateStr = entity.state || '0';
  const unit = entity.attributes?.unit_of_measurement || (stateStr.includes('kW') ? 'kW' : stateStr.includes('%') ? '%' : stateStr.includes('°C') ? '°C' : '');
  const cleanVal = stateStr.replace(/[^0-9.-]/g, '') || stateStr;

  // Determine icon & color based on entity domain or id
  const isPower = entity.entity_id.includes('power') || entity.entity_id.includes('solar') || entity.entity_id.includes('grid');
  const isBattery = entity.entity_id.includes('battery');
  const isAir = entity.entity_id.includes('air') || entity.entity_id.includes('quality');

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
            isPower
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : isBattery
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
          }`}>
            {isPower ? <Zap size={20} /> : isBattery ? <Battery size={20} /> : <Activity size={20} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-400 truncate">Telemetry Metric</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-slate-300">
          Active
        </span>
      </div>

      {/* Center value display */}
      <div className="my-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-white font-mono tracking-tight leading-none">
            {cleanVal}
          </span>
          <span className="text-xs text-slate-400 font-bold">{unit}</span>
        </div>
      </div>

      {/* Bottom Sparkline / Trend Status */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <TrendingUp size={12} /> Normal Range
        </span>
        <span className="text-slate-400 font-mono">24h Logged</span>
      </div>
    </div>
  );
}
