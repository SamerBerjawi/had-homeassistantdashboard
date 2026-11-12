/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overview section tabs with their live badges, and the shared tile surface classes.
 * Icons are passed in so this module stays free of React and icon imports.
 */

import type { ResolvedEntity } from '../../types';
import type { TransformedEnergyTotals } from '../energy/types';

export type OverviewTabIconKey =
  | 'all' | 'lights' | 'switches' | 'energy' | 'security' | 'cameras' | 'climate' | 'openings' | 'media' | 'vacuums';

export interface OverviewTab<TIcon> {
  id: string;
  label: string;
  icon: TIcon;
  color: string;
  badge?: string;
  badgeColor?: string;
}

export interface OverviewTabsInputs<TIcon> {
  icons: Record<OverviewTabIconKey, TIcon>;
  onLights: ResolvedEntity[];
  onSwitches: ResolvedEntity[];
  switchEntities: ResolvedEntity[];
  openDoors: ResolvedEntity[];
  openWindows: ResolvedEntity[];
  activeMotion: ResolvedEntity[];
  activeLeaks: ResolvedEntity[];
  activeSmoke: ResolvedEntity[];
  energyTotals: TransformedEnergyTotals | undefined;
  activeFans: ResolvedEntity[];
  playingMediaEntities: ResolvedEntity[];
  vacuumEntities: ResolvedEntity[];
  activeVacuums: ResolvedEntity[];
  surveillanceCameras: ResolvedEntity[];
  isEditMode: boolean;
}

// Compute adaptive section tabs with real-time badges
export function buildOverviewTabs<TIcon>(p: OverviewTabsInputs<TIcon>): OverviewTab<TIcon>[] {
  const {
    icons, onLights, onSwitches, switchEntities, openDoors, openWindows, activeMotion, activeLeaks, activeSmoke,
    energyTotals, activeFans, playingMediaEntities, vacuumEntities, activeVacuums, surveillanceCameras, isEditMode
  } = p;
  const totalOpenings = openDoors.length + openWindows.length;
  const totalSecurityAlerts = totalOpenings + activeMotion.length + activeLeaks.length + activeSmoke.length;

  const tabs: OverviewTab<TIcon>[] = [
    {
      id: 'all',
      label: 'All',
      icon: icons.all,
      color: '#38bdf8'
    },
    {
      id: 'lights',
      label: 'Lights',
      icon: icons.lights,
      color: '#eab308',
      badge: onLights.length > 0 ? `${onLights.length} on` : undefined,
      badgeColor: onLights.length > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : undefined
    },
    ...((switchEntities.length > 0 || isEditMode)
      ? [
          {
            id: 'switches',
            label: 'Switches',
            icon: icons.switches,
            color: '#10b981',
            badge: onSwitches.length > 0 ? `${onSwitches.length} on` : undefined,
            badgeColor: onSwitches.length > 0 ? 'bg-emerald-500/20 text-emerald-300 font-bold' : undefined
          }
        ]
      : []),
    {
      id: 'energy',
      label: 'Energy',
      icon: icons.energy,
      color: '#10b981',
      badge: energyTotals?.homeConsumption && energyTotals.homeConsumption > 0
        ? `${Math.min(100, Math.round((((energyTotals.solarToHome || 0) + (energyTotals.batteryToHome || 0)) / energyTotals.homeConsumption) * 100))}%`
        : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold'
    },
    {
      id: 'security',
      label: 'Security',
      icon: icons.security,
      color: '#ef4444',
      badge: totalSecurityAlerts > 0 ? `${totalSecurityAlerts}` : undefined,
      badgeColor: totalSecurityAlerts > 0 ? 'bg-rose-500/20 text-rose-300 font-bold' : undefined
    },
    ...(surveillanceCameras.length > 0
      ? [
          {
            id: 'cameras',
            label: 'Cameras',
            icon: icons.cameras,
            color: '#8b5cf6',
            badge: `${surveillanceCameras.length}`
          }
        ]
      : []),
    {
      id: 'climate',
      label: 'Climate',
      icon: icons.climate,
      color: '#06b6d4',
      badge: activeFans.length > 0 ? `${activeFans.length} active` : undefined,
      badgeColor: activeFans.length > 0 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : undefined
    },
    {
      id: 'openings',
      label: 'Windows & Doors',
      icon: icons.openings,
      color: '#8b5cf6',
      badge: totalOpenings > 0 ? `${totalOpenings} open` : undefined,
      badgeColor: totalOpenings > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : undefined
    },
    {
      id: 'media',
      label: 'Media',
      icon: icons.media,
      color: '#ec4899',
      badge: playingMediaEntities.length > 0 ? `${playingMediaEntities.length} active` : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 font-bold'
    }
  ];

  if (vacuumEntities.length > 0) {
    tabs.push({
      id: 'vacuums',
      label: 'Vacuums',
      icon: icons.vacuums,
      color: '#f97316',
      badge: activeVacuums.length > 0 ? `${activeVacuums.length} active` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold'
    });
  }

  return tabs;
}

export function getTileBaseClass(
  darkMode: boolean,
  isActive: boolean,
  activeColorClass: string,
  isAlert: boolean = false,
  _is2x: boolean = false
) {
  return `w-full group relative h-36 rounded-3xl backdrop-blur-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
    isAlert
      ? darkMode
        ? 'bg-rose-950/60 text-white border-rose-500/30'
        : 'bg-rose-100 text-rose-950 border-rose-200'
      : isActive
      ? activeColorClass
      : darkMode
      ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
      : 'bg-white/20 hover:bg-white/30 text-slate-900 border-slate-200/50'
  }`;
}
