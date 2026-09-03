/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuums & Robotic Cleaners Command Center
 * Clean layout featuring dual-view segmented tabs (Controls & Fleet vs. Cleaning Maps)
 * powered by AdaptiveSectionTabs, matching Network and System views.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Broom, MapTrifold, SlidersHorizontal } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';
import VacuumCard from '../vacuums/VacuumCard';
import VacuumMapView from '../vacuums/VacuumMapView';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface ViewProps {
  darkMode?: boolean;
}

type VacuumSubTab = 'controls' | 'maps';

export default function VacuumsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);
  const states = useAutoLayoutStore((s) => s.states);
  const entityRegistry = useAutoLayoutStore((s) => s.entityRegistry);
  const devices = useAutoLayoutStore((s) => s.devices);

  const [activeSubTab, setActiveSubTab] = useState<VacuumSubTab>('controls');

  const vacuumEntities = (domainGroups['vacuum'] || []).filter((v) => !v.disabled_by);

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

  const hasActiveCleaning = vacuums.some((v) => v.state === 'cleaning');

  const vacuumTabs: SectionTabItem[] = [
    {
      id: 'controls',
      label: 'Controls & Fleet',
      icon: SlidersHorizontal
    },
    {
      id: 'maps',
      label: 'Cleaning Maps',
      icon: MapTrifold
    }
  ];

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
      {/* Top Segmented Sub-View Switcher (AdaptiveSectionTabs) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AdaptiveSectionTabs
          tabs={vacuumTabs}
          activeTab={activeSubTab}
          onChange={(tab) => setActiveSubTab(tab as VacuumSubTab)}
          darkMode={darkMode}
        />

        <div className="flex items-center gap-2 ml-auto">
          {hasActiveCleaning ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cleaning Active</span>
            </div>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-teal-500/30 bg-teal-500/10 text-teal-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span>Fleet Docked ({vacuums.length} {vacuums.length === 1 ? 'Robot' : 'Robots'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'controls' ? (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col gap-6"
          >
            {/* Bento Grid of Robot Vacuum Cards (Focused on Controls, Speeds & Telemetry) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
              {vacuums.map((vac) => (
                <VacuumCard key={vac.entityId} vacuum={vac} darkMode={darkMode} showMap={false} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="maps"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {/* Dedicated Interactive Multi-Floor Map View */}
            <VacuumMapView vacuums={vacuums} darkMode={darkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
