import React from 'react';
import { Power, Coffee, ForkKnife, Lightning, Plug } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';
import { detectSwitchCapabilities } from '../../../services/switchClassification';

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
  const caps = detectSwitchCapabilities(entity);
  const isOn = caps.isOn;
  const title = config.title || entity.attributes?.friendly_name || 'Smart Outlet';

  const isCoffee = entity.entity_id.includes('coffee');
  const isDishwasher = entity.entity_id.includes('dishwasher');
  const IconComponent = isCoffee ? Coffee : isDishwasher ? ForkKnife : caps.deviceClass === 'outlet' ? Plug : Power;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(entity.entity_id, isOn ? 'off' : 'on');
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <IconComponent
            size={24}
            weight="duotone"
            className={`shrink-0 transition-colors ${
              isOn ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-slate-400'
            }`}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isOn ? 'Power Active' : 'Switched Off'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
            isOn ? 'bg-emerald-500 justify-end' : 'bg-slate-200 dark:bg-white/15 justify-start'
          }`}
          title={isOn ? 'Switch Off' : 'Switch On'}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow-md" />
        </button>
      </div>

      {/* Center Power Demand or Status */}
      <div className="my-1">
        {caps.hasPowerMonitoring && caps.currentPowerWatts !== undefined ? (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
              {caps.currentPowerWatts}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Watts</span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isOn ? 'Relay Energized' : 'Relay Open'}
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-white/10">
        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
          <Lightning size={13} weight="duotone" className={isOn ? 'text-amber-400 animate-pulse' : 'text-slate-500'} />
          {isOn ? (caps.hasPowerMonitoring ? 'Drawing Power' : 'Active') : 'Standby'}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono">
          {caps.hasEnergyMonitoring && caps.energyKwh !== undefined ? `${caps.energyKwh} kWh` : caps.deviceClassLabel}
        </span>
      </div>
    </div>
  );
}
