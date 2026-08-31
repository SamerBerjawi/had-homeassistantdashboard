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

  // Environmental with Sparkline (2x2) - strictly temperature or humidity only (never battery)
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
      <StandardTile
        darkMode={darkMode}
        title={formatEntityDisplayName(entity.name, areaName)}
        subtitle={subtitle}
        onIconClick={onIconClick}
        icon={
          isTemp ? (
            <Thermometer size={24} weight="duotone" className="text-rose-400" />
          ) : (
            <Drop size={24} weight="duotone" className="text-sky-400" />
          )
        }
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onContextMenu) onContextMenu();
          else if (onIconClick) onIconClick();
        }}
      >
        <div className="w-full pt-1.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>24h trend</span>
            <span className={isTemp ? 'text-rose-400' : 'text-sky-400'}>
              {isTemp ? 'Temperature' : 'Humidity'}
            </span>
          </div>
          <MiniSensorSparkline
            entityId={entity.entity_id}
            currentValue={entity.state}
            color={sparkColor}
            height={34}
            strokeWidth={2}
          />
        </div>
      </StandardTile>
    );
  }

  // Compact Binary & Telemetry Sensors (2x1)
  let Icon: React.ComponentType<any> = Gauge;
  let iconClass = 'text-slate-400';
  let badgeText = caps.isBinary
    ? caps.alertLabel || entity.state
    : caps.formattedValue || (entity.state ? `${entity.state}${caps.unit ? ` ${caps.unit}` : ''}` : 'Unknown');
  let customIconNode: React.ReactNode = null;

  if (isBattery) {
    const batVal = batteryPct !== undefined ? batteryPct : caps.numericValue !== undefined ? Math.round(caps.numericValue) : 100;
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
        <span
          className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
            isSmoke || isLeak
              ? isActiveAlert
                ? 'bg-rose-500 text-white font-black'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : isBattery
              ? batteryPct !== undefined && batteryPct < 20
                ? 'bg-rose-500/20 text-rose-300 font-black'
                : 'bg-slate-900/[0.06] dark:bg-white/10 text-slate-700 dark:text-slate-200'
              : isPowerMetric
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
              : isActiveAlert
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black'
              : 'bg-slate-900/[0.06] dark:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
        >
          {badgeText}
        </span>
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
