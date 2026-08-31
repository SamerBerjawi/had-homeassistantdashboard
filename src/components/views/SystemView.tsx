/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * System & Host Command Center
 * Clean layout featuring Home Assistant Host and UGreen NAS system telemetry
 * with floating AdaptiveSectionTabs.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HouseLine, HardDrives } from '@phosphor-icons/react';
import { HostMonitorTab } from './system/HostMonitorTab';
import { UgreenNasTab } from './system/UgreenNasTab';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

interface SystemViewProps {
  darkMode?: boolean;
}

type SystemSubTab = 'ha_host' | 'ugreen_nas';

export default function SystemView({ darkMode = true }: SystemViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>('ha_host');

  const systemTabs: SectionTabItem[] = [
    {
      id: 'ha_host',
      label: 'Home Assistant Host',
      icon: HouseLine
    },
    {
      id: 'ugreen_nas',
      label: 'UGreen NAS',
      icon: HardDrives
    }
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Segmented Sub-View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AdaptiveSectionTabs
          tabs={systemTabs}
          activeTab={activeSubTab}
          onChange={(tab) => setActiveSubTab(tab as SystemSubTab)}
          darkMode={darkMode}
        />

        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Healthy</span>
        </div>
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'ha_host' ? (
          <motion.div
            key="ha_host"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <HostMonitorTab darkMode={darkMode} />
          </motion.div>
        ) : (
          <motion.div
            key="ugreen_nas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <UgreenNasTab darkMode={darkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
