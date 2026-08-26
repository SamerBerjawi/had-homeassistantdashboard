import React from 'react';
import { Heartbeat, Power, Shield, ShieldCheck, Lock, LockOpen, Hash, Clock, Cpu } from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';

interface GenericDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function GenericDetailModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: GenericDetailModalProps) {
  const isLock = entity.entity_id.startsWith('lock.');
  const isSwitch = entity.entity_id.startsWith('switch.');
  const isLocked = entity.state === 'locked';
  const isOn = entity.state === 'on';

  const handleToggle = () => {
    if (isLock) {
      onUpdateEntity(entity.entity_id, isLocked ? 'unlocked' : 'locked');
    } else if (isSwitch) {
      onUpdateEntity(entity.entity_id, isOn ? 'off' : 'on');
    }
  };

  const attributes = entity.attributes || {};

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={entity.attributes?.friendly_name || entity.entity_id}
      subtitle={entity.entity_id}
      icon={<Heartbeat size={22} weight="duotone" className="text-indigo-400" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* State Banner */}
        <div className="p-5 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Current State
            </span>
            <span className="text-2xl font-black text-white font-mono uppercase">
              {entity.state}
            </span>
          </div>

          {(isLock || isSwitch) && (
            <button
              onClick={handleToggle}
              className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all cursor-pointer shadow-md ${
                isLock
                  ? isLocked
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
                  : isOn
                  ? 'bg-[#7B61FF] hover:bg-[#6A4FE8] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              {isLock ? (isLocked ? 'Unlock Latch' : 'Lock Security') : (isOn ? 'Turn Off' : 'Turn On')}
            </button>
          )}
        </div>

        {/* Entity Attributes Table */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Cpu size={15} weight="duotone" className="text-indigo-400" /> State Attributes
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5 overflow-hidden text-xs">
            {Object.entries(attributes).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between p-3">
                <span className="text-slate-400 font-mono">{key}</span>
                <span className="text-white font-semibold font-mono truncate max-w-50">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
