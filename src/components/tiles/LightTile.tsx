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

const LightTileComponent: React.FC<LightTileProps> = ({
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

  const hasCustomColor = isOn && caps.supportsColor && Boolean(caps.displayColor);
  const iconGlowClass = isOn
    ? hasCustomColor
      ? 'drop-shadow-[0_0_5px_rgba(0,0,0,0.15)]'
      : 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]'
    : 'text-slate-400';

  if (caps.supportsBrightness && onBrightnessChange) {
    return (
      <TileShell
        darkMode={darkMode}
        isActive={isOn}
        accentColor="#FBBF24"
        activeBorderColor={darkMode ? 'border-amber-400/20' : 'border-amber-500/20'}
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
                className="shrink-0 flex items-center justify-center min-w-[28px] min-h-[28px] rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {entity.icon ? (
                  <DynamicPhosphorIcon
                    name={entity.icon}
                    size={22}
                    weight={isOn ? 'fill' : 'duotone'}
                    style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
                    className={iconGlowClass}
                  />
                ) : (
                  <Lightbulb
                    size={22}
                    weight={isOn ? 'fill' : 'duotone'}
                    style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
                    className={iconGlowClass}
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

          {/* Capsule Brightness Slider */}
          <div className="w-full pt-0.5" onClick={(e) => e.stopPropagation()}>
            <DotSlider
              value={isOn ? brightness : 0}
              min={0}
              max={100}
              step={1}
              activeColor={hasCustomColor ? '' : 'bg-amber-400 dark:bg-amber-400'}
              activeStyle={hasCustomColor ? { backgroundColor: caps.displayColor } : undefined}
              activeGlowColor={hasCustomColor ? `${caps.displayColor}44` : 'rgba(251, 191, 36, 0.25)'}
              inactiveColor={darkMode ? 'bg-white/10' : 'bg-slate-300/60'}
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
      accentColor="#FBBF24"
      activeBorderColor={darkMode ? 'border-amber-400/20' : 'border-amber-500/20'}
      onIconClick={() => onToggle(entity)}
      icon={
        entity.icon ? (
          <DynamicPhosphorIcon
            name={entity.icon}
            size={22}
            weight={isOn ? 'fill' : 'duotone'}
            style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
            className={iconGlowClass}
          />
        ) : (
          <Lightbulb
            size={22}
            weight={isOn ? 'fill' : 'duotone'}
            style={{ color: isOn && caps.supportsColor ? caps.displayColor : undefined }}
            className={iconGlowClass}
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

function areLightPropsEqual(prev: LightTileProps, next: LightTileProps): boolean {
  if (prev.darkMode !== next.darkMode) return false;
  if (prev.areaName !== next.areaName) return false;
  if (prev.entity.state !== next.entity.state) return false;
  if (prev.entity.last_changed !== next.entity.last_changed) return false;
  if (prev.entity.last_updated !== next.entity.last_updated) return false;
  const prevAttrs = prev.entity.attributes || {};
  const nextAttrs = next.entity.attributes || {};
  if (prevAttrs.brightness !== nextAttrs.brightness) return false;
  if (prevAttrs.color_temp !== nextAttrs.color_temp) return false;
  if (prevAttrs.current_power_w !== nextAttrs.current_power_w) return false;
  if (prevAttrs.power !== nextAttrs.power) return false;
  if (prevAttrs.battery_level !== nextAttrs.battery_level) return false;
  if (prevAttrs.battery !== nextAttrs.battery) return false;
  if (prevAttrs.friendly_name !== nextAttrs.friendly_name) return false;
  return true;
}

export const LightTile = React.memo<LightTileProps>(LightTileComponent, areLightPropsEqual);
export default LightTile;
