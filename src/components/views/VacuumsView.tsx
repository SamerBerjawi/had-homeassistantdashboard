/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuums & Robotic Cleaners Subsystem View
 * Magic UI Bento Grid layout with interactive multi-floor maps
 */

import React, { useMemo } from 'react';
import { Broom } from '@phosphor-icons/react';
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
      <div className="w-full flex-1 flex flex-col items-center justify-center">
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
    <div className="w-full flex-1 flex flex-col space-y-6 animate-fadeIn pb-24 md:pb-8">
      {/* ------------------------------------------------------------- */}
      {/* BENTO GRID OF ROBOT VACUUM CARDS                              */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vacuums.map((vac) => (
          <VacuumCard key={vac.entityId} vacuum={vac} darkMode={darkMode} />
        ))}
      </div>
    </div>
  );
}
