import React from 'react';
import { Lock, LockOpen, ShieldCheck, ShieldWarning, Key } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface SecurityLockCardProps {
  config: CardConfig;
  entity: HAEntity;
  onToggle: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function SecurityLockCard({
  config,
  entity,
  onToggle,
  onOpenModal
}: SecurityLockCardProps) {
  const isLocked = entity.state === 'locked';
  const battery = entity.attributes?.battery ?? 94;
  const title = config.title || entity.attributes?.friendly_name || 'Front Entrance Deadbolt';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, isLocked ? 'unlocked' : 'locked');
  };

  const LockIcon = isLocked ? Lock : LockOpen;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <LockIcon
            size={24}
            weight="duotone"
            className={`shrink-0 ${isLocked ? 'text-emerald-400' : 'text-rose-400'}`}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-300 truncate">
              {isLocked ? 'Perimeter Secured' : 'Unlocked / Open'}
            </p>
          </div>
        </div>

        {/* Action Toggle Button */}
        <button
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
            isLocked
              ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
          }`}
        >
          {isLocked ? 'Unlock' : 'Lock Now'}
        </button>
      </div>

      {/* Center Status Badge */}
      <div className="my-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/30 border border-white/10 text-xs font-semibold text-white">
          <ShieldCheck size={16} weight="duotone" className={isLocked ? 'text-emerald-400' : 'text-rose-400'} />
          <span>{isLocked ? 'Armed & Locked' : 'Latch Open'}</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="text-slate-300 font-mono">Battery {battery}%</span>
        <span className="text-slate-400">Z-Wave Plus S2</span>
      </div>
    </div>
  );
}
