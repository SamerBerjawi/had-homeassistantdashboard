/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LightTile Component
 * Supports Dimmable (2x2) and Simple On/Off (2x1) light entities
 * with power consumption, brightness, Phosphor battery icons, and last state change telemetry.
 */

import React from 'react';
import { Lightbulb, CaretRight, Sun } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { detectLightCapabilities } from '../../services/lightClassification';
import { TelemetryLine } from '../common/TelemetryBadge';
import CompactTile from './CompactTile';
import StandardTile from './StandardTile';

interface LightTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onToggle: (entity: ResolvedEntity) => void;
  onBrightnessChange?: (entity: ResolvedEntity, brightnessPct: number) => void;
  onClick?: () => void;
  onIconClick?: () => void;
  onContextMenu?: () => void;
}

export const LightTile: React.FC<LightTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onToggle,
  onBrightnessChange,
  onClick,
  onIconClick,
  onContextMenu
}) => {
  const caps = detectLightCapabilities(entity);
  const isOn = caps.isOn;
  const brightness = caps.brightnessPct;
  const lastChangedStr = formatRelativeTime(entity.last_changed || entity.last_updated);
  
  // Power & Battery telemetry
  const rawPower = entity.attributes?.current_power_w ?? entity.attributes?.power ?? (entity as any).powerWatts;
  const powerWatts = typeof rawPower === 'number' && rawPower > 0 && isOn ? (rawPower >= 10 ? Math.round(rawPower) : parseFloat(rawPower.toFixed(1))) : undefined;

  const rawBattery = entity.attributes?.battery_level ?? entity.attributes?.battery ?? entity.attributes?.battery_percentage;
  const batteryPct = typeof rawBattery === 'number' && rawBattery >= 0 && rawBattery <= 100 ? Math.round(rawBattery) : undefined;

  const subtitle = (
    <TelemetryLine
      items={[
        isOn ? (caps.supportsBrightness ? `${brightness}%` : 'On') : 'Off',
        powerWatts !== undefined ? { text: `${powerWatts}W`, isPower: true } : null,
        batteryPct !== undefined ? { isBattery: true, batteryLevel: batteryPct } : null,
        lastChangedStr || null
      ]}
    />
  );

  if (caps.supportsBrightness && onBrightnessChange) {
    return (
      <StandardTile
        darkMode={darkMode}
        title={formatEntityDisplayName(entity.name, areaName)}
        subtitle={subtitle}
        isActive={isOn}
        accentColor="#f59e0b"
        activeBorderColor="border-amber-400/50"
        onIconClick={() => onToggle(entity)}
        icon={
          <Lightbulb
            size={24}
            weight={isOn ? 'fill' : 'duotone'}
            style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
            className={isOn ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)]' : 'text-slate-400'}
          />
        }
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
      >
        <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Sun size={12} weight="bold" /> Brightness
            </span>
            <span className="font-mono">{isOn ? `${brightness}%` : '0%'}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={isOn ? brightness : 0}
            onChange={(e) => onBrightnessChange(entity, Number(e.target.value))}
            className="w-full h-2 bg-slate-700/40 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </StandardTile>
    );
  }

  return (
    <CompactTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={subtitle}
      isActive={isOn}
      accentColor="#f59e0b"
      activeBorderColor="border-amber-400/50"
      onIconClick={() => onToggle(entity)}
      icon={
        <Lightbulb
          size={22}
          weight={isOn ? 'fill' : 'duotone'}
          className={isOn ? 'text-amber-400' : 'text-slate-400'}
        />
      }
      actionButton={
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
    />
  );
};

export default LightTile;
