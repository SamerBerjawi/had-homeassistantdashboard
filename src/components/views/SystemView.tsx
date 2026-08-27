/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HouseLine, HardDrives } from '@phosphor-icons/react';
import { HostMonitorTab } from './system/HostMonitorTab';
import { UgreenNasTab } from './system/UgreenNasTab';

interface SystemViewProps {
  darkMode?: boolean;
}

type SystemSubTab = 'ha_host' | 'ugreen_nas';

export default function SystemView({ darkMode = true }: SystemViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>('ha_host');

  return (
    <div className="w-full flex-1 flex flex-col gap-5 sm:gap-6">
      {/* Top Segmented Sub-View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          className={`p-1.5 rounded-2xl border backdrop-blur-xl flex items-center gap-1.5 transition-all shadow-md ${
            darkMode ? 'bg-black/60 border-white/10' : 'bg-white/80 border-slate-200 shadow-slate-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('ha_host')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'ha_host'
                ? darkMode
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HouseLine size={16} weight={activeSubTab === 'ha_host' ? 'bold' : 'duotone'} />
            <span>Home Assistant Host</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ugreen_nas')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'ugreen_nas'
                ? darkMode
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HardDrives size={16} weight={activeSubTab === 'ugreen_nas' ? 'bold' : 'duotone'} />
            <span>UGreen NAS</span>
            <span
              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                activeSubTab === 'ugreen_nas'
                  ? 'bg-black/20 text-black dark:text-black'
                  : 'bg-amber-500/20 text-amber-500'
              }`}
            >
              UGOS API
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Infrastructure Monitor</span>
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
