/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Bicycle, Sliders } from '@phosphor-icons/react';
import { useMobilityData } from '../../hooks/useMobilityData';
import { CarEvTab } from './mobility/CarEvTab';
import { BikeTab } from './mobility/BikeTab';
import { VehicleCustomizerModal } from './mobility/VehicleCustomizerModal';
import { MobilityAssetType } from '../../types/mobility';

interface MobilityViewProps {
  darkMode?: boolean;
}

export default function MobilityView({ darkMode = true }: MobilityViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<MobilityAssetType>('car');
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const { carMetrics, bikeMetrics, isLiveMode, actions } = useMobilityData();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 flex flex-col">
      {/* Top Segmented Sub-View Switcher & Global Mobility Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Switcher Pills (Cleaned: No emojis) */}
        <div
          className={`p-1.5 rounded-2xl border backdrop-blur-2xl flex items-center gap-1.5 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ${
            darkMode
              ? 'bg-slate-900/60 border-white/10'
              : 'bg-white/85 border-slate-200 shadow-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]'
          }`}
        >
          {/* EV Tab */}
          <button
            type="button"
            onClick={() => setActiveSubTab('car')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'car'
                ? darkMode
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Car size={16} weight={activeSubTab === 'car' ? 'bold' : 'duotone'} />
            <span>Electric Vehicle</span>
          </button>

          {/* Cowboy E-Bike Tab */}
          <button
            type="button"
            onClick={() => setActiveSubTab('bike')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'bike'
                ? darkMode
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : darkMode
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bicycle size={16} weight={activeSubTab === 'bike' ? 'bold' : 'duotone'} />
            <span>Cowboy E-Bike</span>
          </button>
        </div>

        {/* Right Status & Customization Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isLiveMode ? 'Live Fleet Telemetry' : 'Simulated Fleet Mode'}</span>
          </div>

          <button
            type="button"
            onClick={() => setCustomizerOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              darkMode
                ? 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
            }`}
          >
            <Sliders size={15} weight="bold" className="text-cyan-500 dark:text-cyan-400" />
            <span>Customize Assets</span>
          </button>
        </div>
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'car' ? (
          <motion.div
            key="car"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full flex-1"
          >
            <CarEvTab
              metrics={carMetrics}
              actions={actions}
              onOpenCustomizer={() => setCustomizerOpen(true)}
              darkMode={darkMode}
            />
          </motion.div>
        ) : (
          <motion.div
            key="bike"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full flex-1"
          >
            <BikeTab
              metrics={bikeMetrics}
              actions={actions}
              onOpenCustomizer={() => setCustomizerOpen(true)}
              darkMode={darkMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Asset Uploader Modal */}
      <VehicleCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        target={activeSubTab}
        currentCarImage={carMetrics.customVehicleImage}
        currentCarLogo={carMetrics.customBrandLogo}
        currentBikeImage={bikeMetrics.customBikeImage}
        currentBikeLogo={bikeMetrics.customBrandLogo}
        onSaveAsset={actions.saveCustomAsset}
        onResetAssets={actions.resetCustomAssets}
        darkMode={darkMode}
      />
    </div>
  );
}
