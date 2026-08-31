/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mobility & Fleet Command Center
 * Clean layout with floating AdaptiveSectionTabs, live battery and range telemetry,
 * and quick asset customization.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Bicycle, Sliders } from '@phosphor-icons/react';
import { useMobilityData } from '../../hooks/useMobilityData';
import { CarEvTab } from './mobility/CarEvTab';
import { BikeTab } from './mobility/BikeTab';
import { VehicleCustomizerModal } from './mobility/VehicleCustomizerModal';
import { MobilityAssetType } from '../../types/mobility';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewLoadingState from '../ui/ViewLoadingState';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

interface MobilityViewProps {
  darkMode?: boolean;
}

export default function MobilityView({ darkMode = true }: MobilityViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const [activeSubTab, setActiveSubTab] = useState<MobilityAssetType>('car');
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const { carMetrics, bikeMetrics, isLiveMode, actions } = useMobilityData();

  const mobilityTabs: SectionTabItem[] = useMemo(() => [
    {
      id: 'car',
      label: 'Electric Vehicle',
      icon: Car,
      badge: `${Math.round(carMetrics.soc || 0)}%`,
      badgeColor: (carMetrics.soc || 0) <= 20 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-cyan-500/20 text-cyan-300 font-bold'
    },
    {
      id: 'bike',
      label: 'Cowboy E-Bike',
      icon: Bicycle,
      badge: `${Math.round(bikeMetrics.batteryPercent || 0)}%`,
      badgeColor: (bikeMetrics.batteryPercent || 0) <= 20 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-amber-500/20 text-amber-300 font-bold'
    }
  ], [carMetrics.soc, bikeMetrics.batteryPercent]);

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Mobility & Fleet..."
        subtitle="Connecting to electric vehicle and smart bike telemetry"
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Controls: Floating Switcher & Customize Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AdaptiveSectionTabs
          tabs={mobilityTabs}
          activeTab={activeSubTab}
          onChange={(tab) => setActiveSubTab(tab as MobilityAssetType)}
          darkMode={darkMode}
        />

        <div className="flex items-center gap-2.5 ml-auto">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isLiveMode ? 'Live Fleet' : 'Fleet Simulation'}</span>
          </div>

          <button
            type="button"
            onClick={() => setCustomizerOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              darkMode
                ? 'bg-black/40 hover:bg-white/10 border-white/10 text-white'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <Sliders size={14} weight="bold" className="text-cyan-500 dark:text-cyan-400" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Animated Sub-View Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'car' ? (
          <motion.div
            key="car"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
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
