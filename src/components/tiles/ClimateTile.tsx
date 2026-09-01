/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClimateTile Component (2x2 Grid Units)
 * Thermostat tile with dynamic state-based color theming and ergonomic inline slider steppers.
 */

import React from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { detectClimateCapabilities } from '../../services/climateClassification';
import { getClimateModeTheme } from '../../utils/climateTheme';
import { TelemetryLine } from '../common/TelemetryBadge';
import StandardTile from './StandardTile';

interface ClimateTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onTempAdjust: (entity: ResolvedEntity, delta: number) => void;
  onTempSlider: (entity: ResolvedEntity, temp: number) => void;
  onModeChange: (entity: ResolvedEntity, mode: string) => void;
  onClick?: () => void;
  onIconClick?: () => void;
  onContextMenu?: () => void;
}

const getModeAccentColor = (modeId: string): string => {
  switch (modeId) {
    case 'heat':
      return '#f97316';
    case 'cool':
      return '#06b6d4';
    case 'auto':
      return '#10b981';
    case 'fan_only':
    case 'fan':
      return '#14b8a6';
    case 'dry':
      return '#f59e0b';
    default:
      return '#64748b';
  }
};

const getSelectedModeBtnClass = (mode: string): string => {
  switch (mode) {
    case 'heat':
      return 'bg-orange-500 text-white font-black shadow-xs';
    case 'cool':
      return 'bg-cyan-500 text-slate-950 font-black shadow-xs';
    case 'auto':
    case 'heat_cool':
      return 'bg-emerald-500 text-white font-black shadow-xs';
    case 'fan_only':
    case 'fan':
      return 'bg-teal-500 text-slate-950 font-black shadow-xs';
    case 'dry':
      return 'bg-amber-500 text-slate-950 font-black shadow-xs';
    default:
      return 'bg-slate-700 text-white font-bold shadow-xs';
  }
};

export const ClimateTile: React.FC<ClimateTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onTempAdjust,
  onTempSlider,
  onModeChange,
  onClick,
  onIconClick,
  onContextMenu
}) => {
  const caps = detectClimateCapabilities(entity);
  const currentTemp = caps.currentTemp;
  const targetTemp = caps.targetTemp ?? 21;
  const minTemp = caps.minTemp;
  const maxTemp = caps.maxTemp;
  const hvacModes = caps.hvacModes;
  const currentHvacMode = caps.hvacMode;
  const theme = getClimateModeTheme(currentHvacMode, entity.state);
  const ModeIcon = theme.icon;
  const accentColor = getModeAccentColor(theme.id);
  const activeBorderColor = darkMode ? theme.borderDark : theme.borderLight;
  const lastChangedStr = formatRelativeTime(entity.last_changed || entity.last_updated);
  const humidity = entity.attributes?.current_humidity;

  const rawBattery = entity.attributes?.battery_level ?? entity.attributes?.battery ?? entity.attributes?.battery_percentage;
  const batteryPct = typeof rawBattery === 'number' && rawBattery >= 0 && rawBattery <= 100 ? Math.round(rawBattery) : undefined;

  const subtitle = (
    <TelemetryLine
      items={[
        currentTemp !== undefined ? `${currentTemp}°C` : null,
        typeof humidity === 'number' && humidity > 0 && humidity <= 100 ? { text: `${humidity}%`, isHumidity: true } : null,
        batteryPct !== undefined ? { isBattery: true, batteryLevel: batteryPct } : null,
        theme.name,
        lastChangedStr || null
      ]}
    />
  );

  return (
    <StandardTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={subtitle}
      isActive={!theme.isOff}
      accentColor={accentColor}
      activeBorderColor={activeBorderColor}
      onIconClick={onIconClick || onClick}
      icon={<ModeIcon size={24} weight={theme.isOff ? 'duotone' : 'fill'} className={`${theme.iconClass} shrink-0`} />}
      headerAction={
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
            else if (onContextMenu) onContextMenu();
            else if (onIconClick) onIconClick();
          }}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          title="Open Device Details"
        >
          <CaretRight size={15} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      }
      onClick={onClick || onContextMenu || onIconClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu();
        else if (onClick) onClick();
        else if (onIconClick) onIconClick();
      }}
      footer={
        <div className="flex items-center gap-1.5 flex-wrap w-full" onClick={(e) => e.stopPropagation()}>
          {hvacModes.slice(0, 4).map((mode) => {
            const isSelected = currentHvacMode === mode;
            const selectedClass = isSelected
              ? getSelectedModeBtnClass(mode)
              : darkMode
              ? 'bg-white/10 text-slate-400 hover:bg-white/15'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200';

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onModeChange(entity, mode)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${selectedClass}`}
              >
                <span className="capitalize">{mode === 'fan_only' ? 'Fan' : mode}</span>
              </button>
            );
          })}
        </div>
      }
    >
      {/* Target Temperature Readout + Steppers & Full-Width Range Slider */}
      <div className="space-y-1.5 pt-0.5 w-full" onClick={(e) => e.stopPropagation()}>
        {/* Row 1: Target Temp Label & Readout */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500 dark:text-slate-400">Target Temp</span>
          <span className="font-mono font-black text-sm sm:text-base text-slate-800 dark:text-white">
            {targetTemp}°C
          </span>
        </div>

        {/* Row 2: Steppers and Full-Width Slider */}
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={() => onTempAdjust(entity, -0.5)}
            className="w-8 h-8 rounded-xl bg-slate-900/[0.06] dark:bg-white/10 hover:bg-slate-900/10 dark:hover:bg-white/15 flex items-center justify-center font-bold text-sm cursor-pointer active:scale-90 shrink-0 select-none"
            title="Decrease Temp"
          >
            -
          </button>
          <div className="flex-1 px-1 flex items-center">
            <input
              type="range"
              min={minTemp}
              max={maxTemp}
              step="0.5"
              value={targetTemp}
              onChange={(e) => onTempSlider(entity, Number(e.target.value))}
              className={`w-full h-2 bg-slate-700/40 dark:bg-white/10 rounded-lg appearance-none cursor-pointer ${theme.sliderAccent}`}
            />
          </div>
          <button
            type="button"
            onClick={() => onTempAdjust(entity, 0.5)}
            className={`w-8 h-8 rounded-xl text-white ${theme.stepperBtnBg} ${theme.stepperBtnHover} ${theme.stepperBtnShadow} flex items-center justify-center font-bold text-sm cursor-pointer active:scale-90 shrink-0 select-none`}
            title="Increase Temp"
          >
            +
          </button>
        </div>
      </div>
    </StandardTile>
  );
};

export default ClimateTile;
