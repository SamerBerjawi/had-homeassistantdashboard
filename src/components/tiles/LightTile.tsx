/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LightTile Component
 * Supports Dimmable (2x2) and Simple On/Off (2x1) light entities
 * with power consumption, brightness, Phosphor battery icons, and last state change telemetry.
 */

import React from 'react';
import { Lightbulb, CaretRight } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { detectLightCapabilities } from '../../services/lightClassification';
import { TelemetryLine } from '../common/TelemetryBadge';
import DotSlider from '../ui/DotSlider';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import TileShell from './TileShell';
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
      <TileShell
        darkMode={darkMode}
        isActive={isOn}
        accentColor="#f59e0b"
        activeBorderColor="border-amber-400/50"
        onClick={onClick || onContextMenu || onIconClick}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onContextMenu) onContextMenu();
          else if (onClick) onClick();
          else if (onIconClick) onIconClick();
        }}
        className="p-3 sm:p-3.5 min-h-[92px] sm:min-h-[98px] justify-center"
      >
        <div className="flex flex-col justify-center h-full w-full relative z-10 my-auto gap-1">
          {/* Main Row: Icon + Title & Subtitle + Right Chevron */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(entity);
                }}
                title="Toggle Power"
                className="shrink-0 flex items-center justify-center min-w-[28px] min-h-[28px] rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {entity.icon ? (
                  <DynamicPhosphorIcon
                    name={entity.icon}
                    size={22}
                    weight={isOn ? 'fill' : 'duotone'}
                    style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
                    className={isOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]' : 'text-slate-400'}
                  />
                ) : (
                  <Lightbulb
                    size={22}
                    weight={isOn ? 'fill' : 'duotone'}
                    style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
                    className={isOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]' : 'text-slate-400'}
                  />
                )}
              </button>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h4
                  className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {formatEntityDisplayName(entity.name, areaName)}
                </h4>
                {subtitle && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight font-medium flex items-center">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Right Chevron to open details */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick();
                else if (onContextMenu) onContextMenu();
                else if (onIconClick) onIconClick();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Open Device Details"
            >
              <CaretRight size={15} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Dotted Brightness Slider */}
          <div className="w-full pt-0.5" onClick={(e) => e.stopPropagation()}>
            <DotSlider
              value={isOn ? brightness : 0}
              min={0}
              max={100}
              step={1}
              activeColor="bg-amber-400"
              activeGlowColor="rgba(251, 191, 36, 0.75)"
              onChange={(val) => onBrightnessChange(entity, val)}
            />
          </div>
        </div>
      </TileShell>
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
        entity.icon ? (
          <DynamicPhosphorIcon
            name={entity.icon}
            size={22}
            weight={isOn ? 'fill' : 'duotone'}
            className={isOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]' : 'text-slate-400'}
          />
        ) : (
          <Lightbulb
            size={22}
            weight={isOn ? 'fill' : 'duotone'}
            className={isOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]' : 'text-slate-400'}
          />
        )
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
