/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity } from '../../types';
import { getWeatherConditionInfo } from './weatherIcons';

interface WeatherBadgeProps {
  onClick: () => void;
  className?: string;
  darkMode?: boolean;
}

export default function WeatherBadge({
  onClick,
  className = '',
  darkMode = true
}: WeatherBadgeProps) {
  const domainGroups = useAutoLayoutStore(s => s.domainGroups);
  const selectedWeatherEntityId = useAutoLayoutStore(s => s.selectedWeatherEntityId);

  const weatherEntities: ResolvedEntity[] = domainGroups['weather'] || [];
  if (weatherEntities.length === 0) return null;

  const activeEntity: ResolvedEntity = 
    weatherEntities.find(w => w.entity_id === selectedWeatherEntityId) || 
    weatherEntities[0];

  const state = activeEntity?.state || 'partlycloudy';
  const attr = activeEntity?.attributes || {};
  const isNight = state.toLowerCase().includes('night');
  const conditionInfo = getWeatherConditionInfo(state, isNight, 15);

  const temp = typeof attr.temperature === 'number' ? Math.round(attr.temperature) : 22;
  const tempUnit = attr.temperature_unit || '°';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 group ${
        darkMode 
          ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/60 text-slate-200 hover:border-sky-500/50' 
          : 'bg-white/90 hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-sky-400'
      } ${className}`}
      title={`Weather: ${conditionInfo.name} (${temp}${tempUnit}) - Click for details`}
    >
      <div className="shrink-0 group-hover:rotate-12 transition-transform">
        {conditionInfo.icon}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <span className="font-mono tracking-tight text-slate-900 dark:text-white">
          {temp}{tempUnit}
        </span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline truncate max-w-[80px]">
          {conditionInfo.name}
        </span>
      </div>
    </button>
  );
}
