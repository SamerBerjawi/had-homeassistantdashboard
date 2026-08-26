import React from 'react';
import { Heartbeat, Gauge, TrendUp, Lightning, Wind, BatteryCharging, Drop } from '@phosphor-icons/react';
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
  const IconComp = isPower ? Lightning : isBattery ? BatteryCharging : Heartbeat;
  const iconColor = isPower ? 'text-amber-400' : isBattery ? 'text-emerald-400' : 'text-indigo-400';

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <IconComp
            size={24}
            weight="duotone"
            className={`${iconColor} shrink-0`}
          />
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
          <TrendUp size={13} weight="duotone" /> Normal Range
        </span>
        <span className="text-slate-400 font-mono">24h Logged</span>
      </div>
    </div>
  );
}
