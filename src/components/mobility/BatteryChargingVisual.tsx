/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface BatteryChargingVisualProps {
  soc: number; // 0 to 100
  isCharging: boolean;
  powerKw?: number;
}

export const BatteryChargingVisual: React.FC<BatteryChargingVisualProps> = ({
  soc,
  isCharging,
  powerKw = 0,
}) => {
  const getBatteryColor = (level: number) => {
    if (level <= 20) return 'from-rose-500 to-red-600 shadow-red-500/30';
    if (level <= 45) return 'from-amber-400 to-orange-500 shadow-orange-500/30';
    return 'from-emerald-400 to-green-500 shadow-emerald-500/30';
  };

  const clampedSoc = Math.min(Math.max(Math.round(soc), 0), 100);

  return (
    <div className="relative flex flex-col items-center justify-center p-5 sm:p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-hidden w-full shadow-inner">
      {/* Background Ambient Aura */}
      {isCharging && (
        <motion.div
          animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-emerald-500/20 blur-3xl pointer-events-none"
        />
      )}

      {/* Battery Shell */}
      <div className="relative w-48 sm:w-56 h-24 sm:h-28 border-2 border-white/20 rounded-2xl p-1.5 flex items-center bg-black/40 shadow-inner">
        {/* Anode Terminal Tip */}
        <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-9 bg-white/30 rounded-r-md" />

        {/* Liquid Charge Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedSoc}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className={`relative h-full rounded-xl bg-gradient-to-r shadow-lg ${getBatteryColor(clampedSoc)} flex items-center justify-end overflow-hidden`}
        >
          {/* Energy Surge Wave Overlay */}
          {isCharging && (
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
            />
          )}
        </motion.div>

        {/* Centered Stat Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
          {isCharging && (
            <motion.svg
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-5 h-5 text-white drop-shadow-md fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </motion.svg>
          )}
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md font-mono">
            {clampedSoc}%
          </span>
        </div>
      </div>

      {/* Sub-label */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-white/60 font-semibold">
          {isCharging ? `Charging at ${powerKw.toFixed(1)} kW` : 'Battery Level (SoC)'}
        </span>
      </div>
    </div>
  );
};
