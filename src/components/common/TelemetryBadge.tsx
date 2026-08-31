/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Telemetry and Battery Icon Helpers
 * Provides clean Phosphor-based battery indicators and telemetry badges without raw emojis,
 * with strict nowrap truncation to prevent awkward multi-line dot wraps.
 */

import React from 'react';
import {
  BatteryFull,
  BatteryHigh,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Drop,
  Lightning
} from '@phosphor-icons/react';

export function getBatteryIcon(level: number, size = 13): React.ReactElement {
  if (level >= 80) {
    return <BatteryFull size={size} weight="duotone" className="text-emerald-500 dark:text-emerald-400 shrink-0" />;
  }
  if (level >= 50) {
    return <BatteryHigh size={size} weight="duotone" className="text-emerald-500 dark:text-emerald-400 shrink-0" />;
  }
  if (level >= 25) {
    return <BatteryMedium size={size} weight="duotone" className="text-amber-500 dark:text-amber-400 shrink-0" />;
  }
  if (level >= 15) {
    return <BatteryLow size={size} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0" />;
  }
  return <BatteryWarning size={size} weight="fill" className="text-rose-500 animate-pulse shrink-0" />;
}

export interface TelemetryLineProps {
  items: Array<{
    text?: string | number | null;
    icon?: React.ReactNode;
    color?: string;
    isBattery?: boolean;
    batteryLevel?: number;
    isHumidity?: boolean;
    isPower?: boolean;
  } | string | null | undefined | false>;
  className?: string;
}

export const TelemetryLine: React.FC<TelemetryLineProps> = ({ items, className = '' }) => {
  const validItems = items.filter(Boolean);

  if (validItems.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis truncate max-w-full ${className}`}>
      {validItems.map((item, idx) => {
        const isLast = idx === validItems.length - 1;

        if (typeof item === 'string' || typeof item === 'number') {
          return (
            <React.Fragment key={idx}>
              <span className="shrink-0">{item}</span>
              {!isLast && <span className="opacity-40 text-[9px] shrink-0">•</span>}
            </React.Fragment>
          );
        }

        if (!item) return null;

        return (
          <React.Fragment key={idx}>
            <span className={`inline-flex items-center gap-1 shrink-0 ${item.color || ''}`}>
              {item.isBattery && typeof item.batteryLevel === 'number' && (
                <>
                  {getBatteryIcon(item.batteryLevel)}
                  <span>{item.batteryLevel}%</span>
                </>
              )}
              {item.isHumidity && (
                <>
                  <Drop size={12} weight="duotone" className="text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>{item.text}</span>
                </>
              )}
              {item.isPower && (
                <>
                  <Lightning size={12} weight="duotone" className="text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>{item.text}</span>
                </>
              )}
              {!item.isBattery && !item.isHumidity && !item.isPower && (
                <>
                  {item.icon}
                  {item.text !== undefined && <span>{item.text}</span>}
                </>
              )}
            </span>
            {!isLast && <span className="opacity-40 text-[9px] shrink-0">•</span>}
          </React.Fragment>
        );
      })}
    </span>
  );
};
