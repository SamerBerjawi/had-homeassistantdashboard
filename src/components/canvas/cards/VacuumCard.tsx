/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bot, Play, Pause, Home, Battery, Sparkles } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface VacuumCardProps {
  config: CardConfig;
  entity: HAEntity;
  onToggle: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function VacuumCard({
  config,
  entity,
  onToggle,
  onOpenModal
}: VacuumCardProps) {
  const isCleaning = entity.state === 'on' || entity.state === 'cleaning';
  const battery = entity.attributes?.battery ?? 88;
  const mode = entity.attributes?.mode || 'Eco';
  const title = config.title || entity.attributes?.friendly_name || 'Homz Vacuum S10';

  const handleStartStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, isCleaning ? 'off' : 'on', {
      mode: isCleaning ? 'Docked' : 'Turbo'
    });
  };

  const handleDock = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, 'off', { mode: 'Returning to Dock' });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isCleaning 
              ? 'bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 shadow-indigo-500/20' 
              : 'bg-white/10 border border-white/10 text-slate-400'
          }`}>
            <Bot size={20} className={isCleaning ? 'animate-pulse' : ''} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-300 truncate">
              {isCleaning ? 'Active Cleaning Cycle' : 'Docked & Recharged'}
            </p>
          </div>
        </div>

        {/* Battery pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-mono text-slate-200">
          <Battery size={13} className="text-emerald-400" />
          <span>{battery}%</span>
        </div>
      </div>

      {/* Center Action Controls */}
      <div className="flex items-center justify-between my-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartStop}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-md ${
              isCleaning
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isCleaning ? <Pause size={13} /> : <Play size={13} />}
            <span>{isCleaning ? 'Pause Clean' : 'Start Auto Clean'}</span>
          </button>

          <button
            onClick={handleDock}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Return to Dock"
          >
            <Home size={15} />
          </button>
        </div>

        <span className="text-[11px] text-indigo-300 font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/15">
          {mode}
        </span>
      </div>

      {/* Bottom stats */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="flex items-center gap-1 text-slate-300">
          <Sparkles size={11} className="text-amber-400" /> Bin Filter: OK
        </span>
        <span className="text-slate-400">Area: 48 m²</span>
      </div>
    </div>
  );
}
