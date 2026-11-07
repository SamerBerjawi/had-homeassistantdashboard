/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin } from '@phosphor-icons/react';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function ZonesPanel({ s }: { s: DeviceVisibilityState }) {
  const {
    resolvedZones
  } = s;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {resolvedZones.map(zone => (
        <div key={zone.entity_id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MapPin size={20} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{zone.name}</h4>
              <span className="text-xs font-mono text-slate-400">{zone.entity_id}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 text-xs space-y-1 font-mono">
            <div>Coordinates: {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</div>
            <div>Radius: {zone.radius}m</div>
          </div>
        </div>
      ))}
    </div>
  );
}
