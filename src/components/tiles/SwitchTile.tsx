/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SwitchTile Component (2x1 Grid Unit)
 * Standardized switch/outlet tile with live power consumption, Phosphor battery icons, and relative time.
 */

import React from 'react';
import { Plug, Power } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { detectSwitchCapabilities } from '../../services/switchClassification';
import { TelemetryLine } from '../common/TelemetryBadge';
import CompactTile from './CompactTile';

interface SwitchTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onToggle: (entity: ResolvedEntity) => void;
  onClick?: () => void;
  onIconClick?: () => void;
  onContextMenu?: () => void;
}

export const SwitchTile: React.FC<SwitchTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onToggle,
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

  return (
    <CompactTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={subtitle}
      isActive={isOn}
      accentColor="#6366f1"
      activeBorderColor="border-indigo-400/50"
      onIconClick={onIconClick}
      icon={
        <Plug
          size={24}
          weight={isOn ? 'fill' : 'duotone'}
          className={`shrink-0 transition-transform ${
            isOn ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.75)]' : 'text-slate-400'
          }`}
        />
      }
      actionButton={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(entity);
          }}
          className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
            isOn
              ? 'bg-indigo-500 text-white font-bold shadow-xs'
              : darkMode
              ? 'bg-white/10 hover:bg-white/15 text-slate-300'
              : 'bg-slate-900/[0.06] hover:bg-slate-900/10 text-slate-700'
          }`}
          title={isOn ? 'Turn Off' : 'Turn On'}
        >
          <Power size={20} weight="bold" />
        </button>
      }
      onClick={onClick || (() => onToggle(entity))}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu();
        else if (onIconClick) onIconClick();
      }}
    />
  );
};

export default SwitchTile;
