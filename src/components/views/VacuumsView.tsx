/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Broom } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface ViewProps {
  darkMode?: boolean;
}

export default function VacuumsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const vacuumEntities = domainGroups['vacuum'] || [];

  if (isLoading) {
    return <ViewLoadingState title="Loading Vacuum Cleaners..." subtitle="Querying robotic cleaners, mop stations, and dock sensors" darkMode={darkMode} />;
  }

  if (vacuumEntities.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <ViewEmptyState
          icon={Broom}
          title="No Vacuum Cleaners Configured"
          badgeText="Cleaning Subsystem"
          description="Connect robotic vacuums, mop stations, and cordless stick vacuums in Home Assistant to monitor cleaning status, dock telemetry, and battery levels."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vacuumEntities.map((vac) => (
          <div key={vac.entity_id} className={`p-5 rounded-3xl border backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Broom size={20} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-bold">{vac.name}</h4>
                <p className="text-xs text-slate-400 capitalize">{vac.state}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
