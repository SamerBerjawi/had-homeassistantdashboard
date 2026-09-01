/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SensorTile Component
 * Renders compact binary/telemetry/battery sensors (2x1) or environmental sensors
 * with embedded 24h mini sparklines (2x2), Phosphor battery indicators, and accurate live telemetry readouts.
 */

import React from 'react';
import {
  Thermometer,
  Drop,
  Sun,
  Door,
  AppWindow,
  PersonSimpleWalk,
  Warning,
  Flame,
  Lightning,
  Wind,
  Gauge,
  Pulse
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { detectSensorCapabilities } from '../../services/sensorClassification';
import { TelemetryLine, getBatteryIcon } from '../common/TelemetryBadge';
import MiniSensorSparkline from '../sensors/MiniSensorSparkline';
import DotSlider from '../ui/DotSlider';
import TileShell from './TileShell';
import CompactTile from './CompactTile';
import StandardTile from './StandardTile';

interface SensorTileProps {
  entity: ResolvedEntity;
  areaName?: string;
  darkMode?: boolean;
  onClick?: () => void;
  onIconClick?: () => void;
  onContextMenu?: () => void;
}

export const SensorTile: React.FC<SensorTileProps> = ({
  entity,
  areaName = '',
  darkMode = true,
  onClick,
  onIconClick,
  onContextMenu
}) => {
  const caps = detectSensorCapabilities(entity);
  const isTemp = caps.kind === 'temperature';
  const isHum = caps.kind === 'humidity';
  const isBattery = caps.kind === 'battery';
  const isDoor = caps.kind === 'door';
  const isWindow = caps.kind === 'window';
  const isMotion = caps.kind === 'presence';
  const isLeak = caps.kind === 'moisture';
  const isSmoke = caps.kind === 'smoke' || caps.kind === 'gas';
  const isPowerMetric =
    caps.kind === 'power' ||
    caps.kind === 'energy' ||
    caps.kind === 'voltage' ||
    caps.kind === 'current';

  const isActiveAlert = caps.isActiveAlert;
  const lastChangedStr = formatRelativeTime(caps.lastChanged || entity.last_changed || entity.last_updated);
  const rawBattery = entity.attributes?.battery_level ?? entity.attributes?.battery ?? entity.attributes?.battery_percentage ?? caps.batteryPct;
  const batteryPct = typeof rawBattery === 'number' && rawBattery >= 0 && rawBattery <= 100 ? Math.round(rawBattery) : undefined;

  // Environmental with Sparkline (2x1 compact) - strictly temperature or humidity only (never battery)
  const hasSpark = (isTemp || isHum) && !isBattery;
  const sparkColor = isTemp ? '#fb7185' : '#38bdf8';

  if (hasSpark) {
    const subtitle = (
      <TelemetryLine
        items={[
          caps.formattedValue,
          batteryPct !== undefined ? { isBattery: true, batteryLevel: batteryPct } : null,
          lastChangedStr || null
        ]}
      />
    );

    return (
      <TileShell
        darkMode={darkMode}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onContextMenu) onContextMenu();
          else if (onIconClick) onIconClick();
        }}
        className="p-3 min-h-[92px] sm:min-h-[98px] justify-between gap-1"
      >
        {/* Top Header: Icon + Title & Subtitle */}
        <div className="flex items-center justify-between gap-2 relative z-10 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {onIconClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIconClick();
                }}
                className="shrink-0 flex items-center justify-center min-w-[28px] min-h-[28px] rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isTemp ? (
                  <Thermometer size={22} weight="duotone" className="text-rose-400" />
                ) : (
                  <Drop size={22} weight="duotone" className="text-sky-400" />
                )}
              </button>
            ) : (
              <div className="shrink-0 flex items-center justify-center min-w-[28px] min-h-[28px]">
                {isTemp ? (
                  <Thermometer size={22} weight="duotone" className="text-rose-400" />
                ) : (
                  <Drop size={22} weight="duotone" className="text-sky-400" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h4
                className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {formatEntityDisplayName(entity.name, areaName)}
              </h4>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight font-medium flex items-center">
                {subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sparkline: Compact 28px height */}
        <div className="w-full pt-1">
          <MiniSensorSparkline
            entityId={entity.entity_id}
            currentValue={entity.state}
            color={sparkColor}
            height={28}
            strokeWidth={2}
          />
        </div>
      </TileShell>
    );
  }

  // Compact Binary & Telemetry Sensors (2x1)
  let Icon: React.ComponentType<any> = Gauge;
  let iconClass = 'text-slate-400';
  let badgeText = caps.isBinary
    ? caps.alertLabel || entity.state
    : caps.formattedValue || (entity.state ? `${entity.state}${caps.unit ? ` ${caps.unit}` : ''}` : 'Unknown');
  let customIconNode: React.ReactNode = null;

  // Check for percentage values (battery or % sensors)
  const isPercentageSensor = isBattery || caps.unit === '%' || (typeof caps.numericValue === 'number' && entity.attributes?.unit_of_measurement === '%');
  const pctVal = isBattery
    ? (batteryPct !== undefined ? batteryPct : caps.numericValue !== undefined ? Math.round(caps.numericValue) : 100)
    : (typeof caps.numericValue === 'number' && isPercentageSensor ? Math.round(caps.numericValue) : undefined);

  if (isBattery) {
    const batVal = pctVal ?? 100;
    customIconNode = getBatteryIcon(batVal, 24);
    badgeText = `${batVal}%`;
  } else if (isDoor) {
    Icon = Door;
    iconClass = isActiveAlert ? 'text-amber-500 animate-pulse' : 'text-slate-400';
  } else if (isWindow) {
    Icon = AppWindow;
    iconClass = isActiveAlert ? 'text-amber-500 animate-pulse' : 'text-slate-400';
  } else if (isMotion) {
    Icon = PersonSimpleWalk;
    iconClass = isActiveAlert ? 'text-emerald-500 animate-pulse' : 'text-slate-400';
  } else if (isSmoke) {
    Icon = Flame;
    iconClass = isActiveAlert ? 'text-rose-500 animate-pulse' : 'text-slate-400';
  } else if (isLeak) {
    Icon = Warning;
    iconClass = isActiveAlert ? 'text-rose-500 animate-pulse' : 'text-slate-400';
  } else if (isPowerMetric) {
    Icon = Lightning;
    iconClass = 'text-emerald-500';
  } else if (caps.kind === 'illuminance') {
    Icon = Sun;
    iconClass = 'text-amber-400';
  } else if (caps.kind === 'co2' || caps.kind === 'air_quality') {
    Icon = Wind;
    iconClass = 'text-teal-400';
  } else if (caps.kind === 'temperature') {
    Icon = Thermometer;
    iconClass = 'text-rose-400';
  } else if (caps.kind === 'humidity') {
    Icon = Drop;
    iconClass = 'text-sky-400';
  } else {
    Icon = Gauge;
    iconClass = 'text-slate-400';
  }

  const subtitle = (
    <TelemetryLine
      items={[
        isPowerMetric ? 'Power Metric' : isBattery ? 'Battery State' : null,
        !isBattery && batteryPct !== undefined ? { isBattery: true, batteryLevel: batteryPct } : null,
        lastChangedStr || null
      ]}
    />
  );

  return (
    <CompactTile
      darkMode={darkMode}
      title={formatEntityDisplayName(entity.name, areaName)}
      subtitle={subtitle || entity.state}
      isActive={isActiveAlert}
      isAlert={isSmoke || isLeak ? isActiveAlert : isBattery && batteryPct !== undefined && batteryPct < 20}
      onIconClick={onIconClick}
      icon={customIconNode || <Icon size={24} weight={isActiveAlert ? 'fill' : 'duotone'} className={iconClass} />}
      badge={
        pctVal !== undefined ? (
          <div className="flex items-center justify-between gap-2 w-full pt-0.5">
            <div className="flex-1">
              <DotSlider
                value={pctVal}
                min={0}
                max={100}
                activeColor={
                  isBattery
                    ? pctVal < 20
                      ? 'bg-rose-500'
                      : pctVal < 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                    : 'bg-amber-400'
                }
                activeGlowColor={
                  isBattery
                    ? pctVal < 20
                      ? 'rgba(244, 63, 94, 0.75)'
                      : pctVal < 50
                      ? 'rgba(251, 191, 36, 0.75)'
                      : 'rgba(52, 211, 153, 0.75)'
                    : 'rgba(251, 191, 36, 0.75)'
                }
                dotSizeClass="max-w-[7px] sm:max-w-[8px]"
              />
            </div>
            <span className="font-mono font-bold text-xs shrink-0 text-slate-700 dark:text-slate-200">
              {pctVal}%
            </span>
          </div>
        ) : (
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              isSmoke || isLeak
                ? isActiveAlert
                  ? 'bg-rose-500 text-white font-black'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : isPowerMetric
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                : isActiveAlert
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black'
                : 'bg-slate-900/[0.06] dark:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            {badgeText}
          </span>
        )
      }
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu();
        else if (onIconClick) onIconClick();
      }}
    />
  );
};

export default SensorTile;
