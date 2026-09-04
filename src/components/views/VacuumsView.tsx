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
import { Broom, Robot } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';
import RobotVacuumTab from './vacuums/RobotVacuumTab';
import StickVacuumTab from './vacuums/StickVacuumTab';

interface ViewProps {
  darkMode?: boolean;
}

type VacuumSubTab = 'robot' | 'stick';

export default function VacuumsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);
  const states = useAutoLayoutStore((s) => s.states);
  const entityRegistry = useAutoLayoutStore((s) => s.entityRegistry);
  const devices = useAutoLayoutStore((s) => s.devices);

  const [activeSubTab, setActiveSubTab] = useState<VacuumSubTab>('robot');

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
      id: 'robot',
      label: 'Robot Vacuum',
      icon: Robot
    },
    {
      id: 'stick',
      label: 'Stick Vacuum',
      icon: Broom
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

        {hasActiveCleaning && activeSubTab === 'robot' && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cleaning Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'robot' ? (
          <motion.div
            key="robot"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {vacuums.length > 0 ? (
              <RobotVacuumTab vacuums={vacuums} darkMode={darkMode} />
            ) : (
              <div className="w-full flex-1 flex flex-col items-center justify-center py-16">
                <ViewEmptyState
                  icon={Robot}
                  title="No Robot Vacuums Configured"
                  badgeText="Dreame & Robot Cleaners"
                  description="Connect your Dreame or robotic vacuum cleaner in Home Assistant to monitor live telemetry, multi-floor cleaning maps, consumable wear, and dock controls."
                  configPath="Settings → Devices & Services → Dreame Vacuum"
                  darkMode={darkMode}
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="stick"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <StickVacuumTab darkMode={darkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
