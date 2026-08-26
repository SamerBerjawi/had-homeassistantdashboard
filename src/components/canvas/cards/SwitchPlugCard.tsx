/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, Coffee, Utensils, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface SwitchPlugCardProps {
  config: CardConfig;
  entity: HAEntity;
  onToggle: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function SwitchPlugCard({
  config,
  entity,
  onToggle,
  onOpenModal
}: SwitchPlugCardProps) {
  const isOn = entity.state === 'on';
  const powerWatts = entity.attributes?.power ?? (isOn ? 45 : 0);
  const title = config.title || entity.attributes?.friendly_name || 'Smart Outlet';

  const isCoffee = entity.entity_id.includes('coffee');
  const isDishwasher = entity.entity_id.includes('dishwasher');

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, isOn ? 'off' : 'on', {
      power: isOn ? 0 : 85
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isOn
              ? 'bg-purple-500/25 border border-purple-400/40 text-purple-300 shadow-purple-500/20'
              : 'bg-white/10 border border-white/10 text-slate-400'
          }`}>
            {isCoffee ? <Coffee size={20} /> : isDishwasher ? <Utensils size={20} /> : <Power size={20} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-400 truncate">
              {isOn ? 'Relay Active' : 'Switched Off'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
            isOn ? 'bg-purple-500 justify-end' : 'bg-white/15 justify-start'
          }`}
          title={isOn ? 'Switch Off' : 'Switch On'}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow-md" />
        </button>
      </div>

      {/* Center Power Demand */}
      <div className="my-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white font-mono tracking-tight leading-none">
            {powerWatts}
          </span>
          <span className="text-xs text-slate-400 font-bold">Watts</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="flex items-center gap-1 text-slate-300">
          <Zap size={11} className={isOn ? 'text-amber-400 animate-pulse' : 'text-slate-500'} />
          {isOn ? 'Drawing Power' : 'Standby 0W'}
        </span>
        <span className="text-slate-400 font-mono">16A Relay</span>
      </div>
    </div>
  );
}
