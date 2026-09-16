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
import EntityTemperatureSlider from '../ui/EntityTemperatureSlider';
import StandardTile from './StandardTile';

interface ClimateTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onTempAdjust: (entity: ResolvedEntity, delta: number) => void;
  onTempSlider: (entity: ResolvedEntity, temp: number) => void;
  onModeChange: (entity: ResolvedEntity, mode: string) => void;
  onToggle?: (entity: ResolvedEntity) => void;
  onChevronClick?: () => void;
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
      return 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-[0_0_12px_rgba(249,115,22,0.45)] border border-orange-400/40 scale-102';
    case 'cool':
      return 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.45)] border border-cyan-300/60 scale-102';
    case 'auto':
    case 'heat_cool':
      return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black shadow-[0_0_12px_rgba(16,185,129,0.45)] border border-emerald-400/40 scale-102';
    case 'fan_only':
    case 'fan':
      return 'bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-black shadow-[0_0_12px_rgba(20,184,166,0.45)] border border-teal-400/40 scale-102';
    case 'dry':
      return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.45)] border border-amber-300/60 scale-102';
    default:
      return 'bg-slate-700/90 text-slate-200 font-bold border border-slate-600/50 shadow-xs';
  }
};

export const ClimateTile: React.FC<ClimateTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onTempAdjust,
  onTempSlider,
  onModeChange,
  onToggle,
  onChevronClick,
  onClick,
  onIconClick,
  onContextMenu
}) => {
  const caps = detectClimateCapabilities(entity);
  const currentTemp = caps.currentTemp;
  const targetTemp = caps.targetTemp;
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

  const handleOpenDetails = () => {
    if (onChevronClick) onChevronClick();
    else if (onContextMenu) onContextMenu();
  };

  const handleToggleThermostat = () => {
    if (onToggle) {
      onToggle(entity);
    } else {
      const isOff = theme.isOff;
      const activeMode = hvacModes.find((m) => m !== 'off') || 'heat';
      onModeChange(entity, isOff ? activeMode : 'off');
    }
  };

  return (
    <StandardTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={subtitle}
      isActive={!theme.isOff}
      accentColor={accentColor}
      activeBorderColor={activeBorderColor}
      onIconClick={handleToggleThermostat}
      icon={
        <ModeIcon
          size={24}
          weight={theme.isOff ? 'duotone' : 'fill'}
          className={`${theme.iconClass} ${!theme.isOff ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.85)]' : ''} shrink-0`}
        />
      }
      headerAction={
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails();
          }}
          className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Open Device Details"
        >
          <CaretRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      }
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu();
        else handleOpenDetails();
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
      {/* Redesigned Thermal Gradient Temperature Slider */}
      <div className="w-full pt-0.5" onClick={(e) => e.stopPropagation()}>
        <EntityTemperatureSlider
          targetTemp={targetTemp}
          currentTemp={currentTemp}
          minTemp={minTemp}
          maxTemp={maxTemp}
          step={0.5}
          hvacMode={currentHvacMode}
          unit="°C"
          darkMode={darkMode}
          onTempAdjust={(delta) => onTempAdjust(entity, delta)}
          onTempChange={(val) => onTempSlider(entity, val)}
        />
      </div>
    </StandardTile>
  );
};

export default ClimateTile;
