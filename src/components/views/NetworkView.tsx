/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Network & Infrastructure Command Center
 * Clean layout featuring TP-Link Router and AdGuard Home DNS protection
 * with floating AdaptiveSectionTabs.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ShieldCheck, Speedometer } from '@phosphor-icons/react';
import { TpLinkRouterTab } from './network/TpLinkRouterTab';
import { AdGuardTab } from './network/AdGuardTab';
import { SpeedTestTab } from './network/SpeedTestTab';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

interface NetworkViewProps {
  darkMode?: boolean;
}

type NetworkSubTab = 'tplink_router' | 'adguard_home' | 'speed_test';

export default function NetworkView({ darkMode = true }: NetworkViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<NetworkSubTab>('tplink_router');

  const networkTabs: SectionTabItem[] = [
    {
      id: 'tplink_router',
      label: 'TP-Link Router',
      icon: Globe
    },
    {
      id: 'adguard_home',
      label: 'AdGuard Home',
      icon: ShieldCheck
    },
    {
      id: 'speed_test',
      label: 'Speed Test',
      icon: Speedometer
    }
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Segmented Sub-View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AdaptiveSectionTabs
          tabs={networkTabs}
          activeTab={activeSubTab}
          onChange={(tab) => setActiveSubTab(tab as NetworkSubTab)}
          darkMode={darkMode}
        />

        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local Network Active</span>
        </div>
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'tplink_router' && (
          <motion.div
            key="tplink_router"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <TpLinkRouterTab darkMode={darkMode} />
          </motion.div>
        )}

        {activeSubTab === 'adguard_home' && (
          <motion.div
            key="adguard_home"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <AdGuardTab darkMode={darkMode} />
          </motion.div>
        )}

        {activeSubTab === 'speed_test' && (
          <motion.div
            key="speed_test"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <SpeedTestTab darkMode={darkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
