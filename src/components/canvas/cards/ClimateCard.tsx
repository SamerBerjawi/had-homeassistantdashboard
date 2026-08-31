import React from 'react';
import { Plus, Minus, Wind, Drop } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';
import { getClimateModeTheme } from '../../../utils/climateTheme';

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
  const fanMode = entity.attributes?.fan_mode || 'Auto';
  const title = config.title || entity.attributes?.friendly_name || 'Climate';

  const theme = getClimateModeTheme(mode, entity.state);
  const ModeIcon = theme.icon;

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
        <div className="flex items-center gap-3 min-w-0">
          <ModeIcon
            size={24}
            weight={theme.isOff ? 'duotone' : 'fill'}
            className={`${theme.iconClass} ${theme.iconDropShadow} shrink-0`}
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h4>
            <p className={`text-[11px] font-medium truncate ${theme.textClass}`}>
              {isOff ? 'System Standby' : `${theme.name} Mode`}
            </p>
          </div>
        </div>

        {/* Humidity Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-[11px] text-slate-700 dark:text-slate-300 backdrop-blur-md">
          <Drop size={13} weight="duotone" className="text-cyan-400" />
          <span>{humidity}%</span>
        </div>
      </div>

      {/* Center: Current vs Target Display + Stepper */}
      <div className="flex items-center justify-between my-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tracking-tight leading-none font-mono ${isOff ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
              {targetTemp.toFixed(1)}°
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Target</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Ambient: <span className="text-slate-700 dark:text-slate-200 font-semibold">{currentTemp.toFixed(1)}°C</span>
          </p>
        </div>

        {/* Quick Stepper Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/30 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
          <button
            onClick={(e) => handleAdjustTemp(-0.5, e)}
            className="w-7 h-7 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-750 dark:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Decrease Target"
          >
            <Minus size={14} weight="duotone" />
          </button>
          <button
            onClick={(e) => handleAdjustTemp(0.5, e)}
            className={`w-7 h-7 rounded-xl text-white ${theme.stepperBtnBg} ${theme.stepperBtnHover} ${theme.stepperBtnShadow} flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95`}
            title="Increase Target"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between text-[10px] text-slate-550 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-white/10">
        <span className="flex items-center gap-1 text-slate-750 dark:text-slate-300">
          <Wind size={13} weight="duotone" className="text-sky-400" /> {fanMode} Fan
        </span>
        <span className={`font-semibold ${theme.textClass}`}>{theme.actionText}</span>
      </div>
    </div>
  );
}
