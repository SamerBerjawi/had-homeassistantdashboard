/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bicycle,
  Lock,
  LockOpen,
  Lightning,
  MapPin,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { BikeMetrics } from '../../types/mobility';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { useUserConfig } from '../../contexts/ConfigContext';

interface BikeCompanionCardProps {
  metrics: BikeMetrics;
  actions: {
    toggleBikeLock: (shouldLock: boolean) => Promise<void>;
    requestBikeSync?: () => Promise<void>;
  };
  onOpenCustomizer?: () => void;
  darkMode?: boolean;
}

export function BikeCompanionCard({
  metrics,
  actions,
  onOpenCustomizer,
  darkMode = true
}: BikeCompanionCardProps) {
  const { config } = useUserConfig();
  const [imageError, setImageError] = useState(false);
  const resolvedBikeImage = resolveAssetUrl(metrics.customBikeImage, config?.updatedAt);
  const bikeName = config.mobility?.bike?.customName || 'Smart E-Bike';

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden flex flex-col justify-between gap-4 ${
        darkMode
          ? 'bg-slate-900/60 border-white/10 text-white'
          : 'bg-white/80 border-slate-200 text-slate-900 shadow-xl'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bicycle size={20} weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{bikeName}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Secondary Fleet Asset</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              metrics.isLocked
                ? 'bg-slate-800 border-white/10 text-slate-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {metrics.isLocked ? 'Locked' : 'Unlocked'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-center">
        {/* Render Image or Silhouette */}
        <div className="flex items-center justify-center h-24 relative">
          {resolvedBikeImage && !imageError ? (
            <img
              src={resolvedBikeImage}
              alt={bikeName}
              className="max-h-20 w-auto object-contain drop-shadow"
              onError={() => setImageError(true)}
            />
          ) : (
            <Bicycle size={56} weight="duotone" className="text-amber-400/80" />
          )}
        </div>

        {/* Battery & Range Stats */}
        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Battery</span>
            <div className="text-lg font-black font-mono text-amber-400">
              {Math.round(metrics.batteryPercent)}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Range</span>
            <div className="text-lg font-black font-mono text-white">
              {Math.round(metrics.remainingRangeKm)} <span className="text-xs text-slate-400">km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lock Button */}
      <button
        type="button"
        onClick={() => actions.toggleBikeLock(!metrics.isLocked)}
        className={`w-full py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
          metrics.isLocked
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
        }`}
      >
        {metrics.isLocked ? <Lock size={15} weight="bold" /> : <LockOpen size={15} weight="bold" />}
        <span>{metrics.isLocked ? 'Unlock E-Bike' : 'Lock E-Bike'}</span>
      </button>
    </div>
  );
}
