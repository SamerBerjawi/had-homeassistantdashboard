/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SwitchTile Component (2x1 Grid Unit)
 * Standardized switch/outlet tile with live power consumption, Phosphor battery icons, and relative time.
 */

import React from 'react';
import { Plug, CaretRight } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { detectSwitchCapabilities } from '../../services/switchClassification';
import { TelemetryLine } from '../common/TelemetryBadge';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import CompactTile from './CompactTile';

interface SwitchTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onToggle: (entity: ResolvedEntity) => void;
  onChevronClick?: () => void;
  onClick?: () => void;
  onIconClick?: () => void;
  onContextMenu?: () => void;
}

const SwitchTileComponent: React.FC<SwitchTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onToggle,
  onChevronClick,
  onClick,
  onIconClick,
  onContextMenu
}) => {
  const caps = detectSwitchCapabilities(entity);
  const isOn = caps.isOn;
  const lastChangedStr = formatRelativeTime(entity.last_changed || entity.last_updated);
  
  // Extract power & battery telemetry
  const rawPower = caps.currentPowerWatts ?? entity.attributes?.current_power_w ?? entity.attributes?.power ?? (entity as any).powerWatts;
  const powerWatts = typeof rawPower === 'number' && rawPower > 0 ? (rawPower >= 10 ? Math.round(rawPower) : parseFloat(rawPower.toFixed(1))) : undefined;
  
  const rawBattery = entity.attributes?.battery_level ?? entity.attributes?.battery ?? entity.attributes?.battery_percentage;
  const batteryPct = typeof rawBattery === 'number' && rawBattery >= 0 && rawBattery <= 100 ? Math.round(rawBattery) : undefined;

  const subtitle = (
    <TelemetryLine
      items={[
        isOn ? 'Active' : 'Off',
        powerWatts !== undefined && isOn ? { text: `${powerWatts}W`, isPower: true } : null,
        batteryPct !== undefined ? { isBattery: true, batteryLevel: batteryPct } : null,
        lastChangedStr || null
      ]}
    />
  );

  const handleOpenDetails = () => {
    if (onChevronClick) onChevronClick();
    else if (onContextMenu) onContextMenu();
  };

  const handleTileClick = () => {
    if (onClick) onClick();
    else onToggle(entity);
  };

  return (
    <CompactTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={subtitle}
      isActive={isOn}
      accentColor="#6366f1"
      activeBorderColor="border-indigo-400/50"
      onIconClick={() => onToggle(entity)}
      icon={
        entity.icon ? (
          <DynamicPhosphorIcon
            name={entity.icon}
            size={22}
            weight={isOn ? 'fill' : 'duotone'}
            className={`shrink-0 transition-transform ${
              isOn ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.75)]' : 'text-slate-400'
            }`}
          />
        ) : (
          <Plug
            size={22}
            weight={isOn ? 'fill' : 'duotone'}
            className={`shrink-0 transition-transform ${
              isOn ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.75)]' : 'text-slate-400'
            }`}
          />
        )
      }
      actionButton={
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
      onClick={handleTileClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu();
        else handleOpenDetails();
      }}
    />
  );
};

function areSwitchPropsEqual(prev: SwitchTileProps, next: SwitchTileProps): boolean {
  if (prev.darkMode !== next.darkMode) return false;
  if (prev.areaName !== next.areaName) return false;
  if (prev.entity.state !== next.entity.state) return false;
  if (prev.entity.last_changed !== next.entity.last_changed) return false;
  if (prev.entity.last_updated !== next.entity.last_updated) return false;
  const prevAttrs = prev.entity.attributes || {};
  const nextAttrs = next.entity.attributes || {};
  if (prevAttrs.current_power_w !== nextAttrs.current_power_w) return false;
  if (prevAttrs.power !== nextAttrs.power) return false;
  if (prevAttrs.battery_level !== nextAttrs.battery_level) return false;
  if (prevAttrs.battery !== nextAttrs.battery) return false;
  if (prevAttrs.friendly_name !== nextAttrs.friendly_name) return false;
  return true;
}

export const SwitchTile = React.memo<SwitchTileProps>(SwitchTileComponent, areSwitchPropsEqual);
export default SwitchTile;
