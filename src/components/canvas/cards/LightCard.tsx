import React from 'react';
import { Lightbulb, Sun, Power } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';
import { detectLightCapabilities } from '../../../services/lightClassification';

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
  const caps = detectLightCapabilities(entity);
  const isOn = caps.isOn;
  const brightness = caps.brightnessPct;
  const color = caps.displayColor;
  const title = config.title || entity.attributes?.friendly_name || 'Light';

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = isOn ? 'off' : 'on';
    if (caps.supportsBrightness) {
      onToggle(entity.entity_id, nextState, {
        ...entity.attributes,
        brightness: nextState === 'on' ? (caps.brightness255 || 204) : 0
      });
    } else {
      onToggle(entity.entity_id, nextState, {
        ...entity.attributes
      });
    }
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
              isOn ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-400'
            }`}
            style={{ color: isOn ? color : undefined }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h4>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                {caps.typeBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isOn
                ? caps.supportsBrightness
                  ? `${brightness}% brightness`
                  : 'Power Active'
                : 'Powered Off'}
            </p>
          </div>
        </div>

        {/* Quick Power Toggle Button */}
        <button
          onClick={handleToggleClick}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isOn
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400 shadow-inner'
              : 'bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white'
          }`}
          title={isOn ? 'Turn Off' : 'Turn On'}
        >
          <Power size={15} weight="duotone" />
        </button>
      </div>

      {/* Interactive Brightness Bar Indicator (Only for lights supporting brightness) */}
      {caps.supportsBrightness ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Sun size={12} weight="duotone" /> Level
            </span>
            <span className="text-slate-900 dark:text-white font-mono">{isOn ? `${brightness}%` : '0%'}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-black/30 overflow-hidden p-0.5 border border-slate-300 dark:border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOn ? 'shadow-[0_0_12px_rgba(251,191,36,0.6)]' : 'bg-slate-300 dark:bg-slate-700/40'
              }`}
              style={{
                width: isOn ? `${Math.max(brightness, 8)}%` : '0%',
                backgroundColor: isOn ? color : undefined
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-slate-400 font-medium">
          <span>{isOn ? 'Switch Active' : 'Switch Inactive'}</span>
        </div>
      )}
    </div>
  );
}
