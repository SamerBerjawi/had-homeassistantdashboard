/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ShieldCheck } from '@phosphor-icons/react';
import { TpLinkRouterTab } from './network/TpLinkRouterTab';
import { AdGuardTab } from './network/AdGuardTab';

interface NetworkViewProps {
  darkMode?: boolean;
}

type NetworkSubTab = 'tplink_router' | 'adguard_home';

export default function NetworkView({ darkMode = true }: NetworkViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<NetworkSubTab>('tplink_router');

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      {/* Top Segmented Sub-View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          className={`p-1.5 rounded-2xl flex items-center gap-1.5 transition-all ${
            darkMode ? 'bg-white/[0.04]' : 'bg-slate-900/[0.04] shadow-xs'
          }`}
        >
          {/* TP-Link Router Tab */}
          <button
            type="button"
            onClick={() => setActiveSubTab('tplink_router')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'tplink_router'
                ? darkMode
                  ? 'bg-sky-500 text-black shadow-lg shadow-sky-500/20'
                  : 'bg-sky-500 text-slate-950 shadow-sm'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-900/[0.04]'
            }`}
          >
            <Globe size={16} weight={activeSubTab === 'tplink_router' ? 'bold' : 'duotone'} />
            <span>TP-Link Router</span>
          </button>

          {/* AdGuard Home Tab */}
          <button
            type="button"
            onClick={() => setActiveSubTab('adguard_home')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'adguard_home'
                ? darkMode
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-500 text-slate-950 shadow-sm'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-900/[0.04]'
            }`}
          >
            <ShieldCheck size={16} weight={activeSubTab === 'adguard_home' ? 'bold' : 'duotone'} />
            <span>AdGuard Home</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local Network Infrastructure</span>
        </div>
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'tplink_router' ? (
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
        ) : (
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
      </AnimatePresence>
    </div>
  );
}
