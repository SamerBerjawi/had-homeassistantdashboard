/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Thermometer, Plus, Minus, Wind, Droplets } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface ClimateCardProps {
  config: CardConfig;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function ClimateCard({
  config,
  entity,
  onUpdateEntity,
  onOpenModal
}: ClimateCardProps) {
  const isOff = entity.state === 'off';
  const targetTemp = entity.attributes?.target_temp ?? entity.attributes?.temperature ?? 21.0;
  const currentTemp = entity.attributes?.current_temperature ?? entity.attributes?.temperature ?? 21.5;
  const humidity = entity.attributes?.humidity ?? 45;
  const mode = entity.attributes?.mode || entity.state || 'Comfort';
  const title = config.title || entity.attributes?.friendly_name || 'Climate';

  const handleAdjustTemp = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTemp = Math.round((targetTemp + delta) * 2) / 2;
    onUpdateEntity(entity.entity_id, isOff ? 'on' : entity.state, {
      target_temp: newTemp,
      temperature: newTemp
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Top row: Icon & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center shadow-md shadow-sky-500/10">
            <Thermometer size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-sky-300 font-medium truncate">
              {isOff ? 'System Standby' : `${mode} Mode`}
            </p>
          </div>
        </div>

        {/* Humidity Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] text-slate-300">
          <Droplets size={12} className="text-cyan-400" />
          <span>{humidity}%</span>
        </div>
      </div>

      {/* Center: Current vs Target Display + Stepper */}
      <div className="flex items-center justify-between my-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white tracking-tight leading-none font-mono">
              {targetTemp.toFixed(1)}°
            </span>
            <span className="text-xs text-slate-400 font-bold">Target</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Ambient: <span className="text-slate-200 font-semibold">{currentTemp.toFixed(1)}°C</span>
          </p>
        </div>

        {/* Quick Stepper Buttons */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-2xl border border-white/10">
          <button
            onClick={(e) => handleAdjustTemp(-0.5, e)}
            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Decrease Target"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={(e) => handleAdjustTemp(0.5, e)}
            className="w-7 h-7 rounded-xl bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm shadow-sky-500/30"
            title="Increase Target"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="flex items-center gap-1 text-slate-300">
          <Wind size={12} className="text-sky-400" /> Auto Fan
        </span>
        <span className="font-semibold text-emerald-400">Optimal Temp</span>
      </div>
    </div>
  );
}
