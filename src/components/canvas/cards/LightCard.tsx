import React from 'react';
import { Lightbulb, Sun, Power } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface LightCardProps {
  config: CardConfig;
  entity: HAEntity;
  onToggle: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onOpenModal: () => void;
}

export default function LightCard({
  config,
  entity,
  onToggle,
  onOpenModal
}: LightCardProps) {
  const isOn = entity.state === 'on';
  const brightness = typeof entity.attributes?.brightness === 'number' ? entity.attributes.brightness : isOn ? 100 : 0;
  const color = entity.attributes?.color || '#ffffff';
  const title = config.title || entity.attributes?.friendly_name || 'Light';

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = isOn ? 'off' : 'on';
    onToggle(entity.entity_id, nextState, {
      brightness: nextState === 'on' ? 80 : 0
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header with Icon and Quick Power Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Lightbulb
            size={24}
            weight="duotone"
            className={`shrink-0 transition-colors ${
              isOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-400'
            }`}
            style={isOn && color && color !== '#ffffff' ? { color } : undefined}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-400 truncate">
              {isOn ? `${brightness}% brightness` : 'Powered Off'}
            </p>
          </div>
        </div>

        {/* Quick Power Toggle Button */}
        <button
          onClick={handleToggleClick}
          className={`w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center transition-all cursor-pointer ${
            isOn
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-inner'
              : 'text-slate-500 hover:text-white hover:bg-white/15'
          }`}
          title={isOn ? 'Turn Off' : 'Turn On'}
        >
          <Power size={15} weight="duotone" />
        </button>
      </div>

      {/* Interactive Brightness Bar Indicator */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
          <span className="flex items-center gap-1">
            <Sun size={12} weight="duotone" /> Level
          </span>
          <span className="text-white font-mono">{isOn ? `${brightness}%` : '0%'}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden p-0.5 border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOn ? 'bg-linear-to-r from-amber-400 to-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : 'bg-slate-700/40'
            }`}
            style={{ 
              width: isOn ? `${Math.max(brightness, 8)}%` : '0%',
              backgroundColor: isOn && color && color !== '#ffffff' ? color : undefined
            }}
          />
        </div>
      </div>
    </div>
  );
}
