/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuums & Robotic Cleaners Command Center
 * Bento grid layout with interactive multi-floor maps, dock telemetry,
 * and zero filler text.
 */

import React, { useMemo } from 'react';
import { Broom, Sparkle } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';
import VacuumCard from '../vacuums/VacuumCard';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface ViewProps {
  darkMode?: boolean;
}

export default function VacuumsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);
  const states = useAutoLayoutStore((s) => s.states);
  const entityRegistry = useAutoLayoutStore((s) => s.entityRegistry);
  const devices = useAutoLayoutStore((s) => s.devices);

  const vacuumEntities = domainGroups['vacuum'] || [];

  // Discover and aggregate companion entities and maps strictly related to the vacuum device
  const { vacuums } = useMemo(() => {
    return discoverVacuumDevices(
      vacuumEntities,
      resolvedEntities,
      states,
      entityRegistry || [],
      devices || []
    );
  }, [vacuumEntities, resolvedEntities, states, entityRegistry, devices]);

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Vacuum Fleet..."
        subtitle="Discovering robotic cleaners, mop stations, multi-floor maps, and dock sensors"
        darkMode={darkMode}
      />
    );
  }

  if (vacuums.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
        <ViewEmptyState
          icon={Broom}
          title="No Vacuum Cleaners Configured"
          badgeText="Cleaning Subsystem"
          description="Connect robotic vacuums, mop stations, and cordless stick vacuums in Home Assistant to monitor cleaning status, multi-floor maps, dock telemetry, and battery levels."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Header Strip */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
            <Broom size={18} weight="duotone" />
          </div>
          <h2 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Robotic Cleaning Fleet
          </h2>
        </div>

        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
          {vacuums.length} {vacuums.length === 1 ? 'Robot' : 'Robots'}
        </span>
      </div>

      {/* Bento Grid of Robot Vacuum Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        {vacuums.map((vac) => (
          <VacuumCard key={vac.entityId} vacuum={vac} darkMode={darkMode} />
        ))}
      </div>
    </div>
  );
}
