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
            className={`shrink-0 ${isLocked ? 'text-emerald-500' : 'text-rose-500'}`}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {isLocked ? 'Perimeter Secured' : 'Unlocked / Open'}
            </p>
          </div>
        </div>

        {/* Action Toggle Button */}
        <button
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
            isLocked
              ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
          }`}
        >
          {isLocked ? 'Unlock' : 'Lock Now'}
        </button>
      </div>

      {/* Center Status Badge */}
      <div className="my-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white">
          <ShieldCheck size={16} weight="duotone" className={isLocked ? 'text-emerald-500' : 'text-rose-500'} />
          <span>{isLocked ? 'Armed & Locked' : 'Latch Open'}</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between text-[10px] text-slate-550 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-white/10">
        <span className="text-slate-750 dark:text-slate-300 font-mono">Battery {battery}%</span>
        <span className="text-slate-500 dark:text-slate-400">Z-Wave Plus S2</span>
      </div>
    </div>
  );
}
