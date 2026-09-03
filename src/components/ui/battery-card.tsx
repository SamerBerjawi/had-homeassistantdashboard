/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Lightning } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

export interface BatteryCardProps {
  deviceName?: string;
  deviceIcon?: React.ReactNode;
  batteryLevel: number;
  isCharging?: boolean;
  timeToFull?: string;
  estimateLabel?: string;
  className?: string;
}

export const BatteryCard: React.FC<BatteryCardProps> = ({
  deviceName = 'Battery',
  deviceIcon,
  batteryLevel = 0,
  isCharging = false,
  timeToFull,
  estimateLabel = 'Time to full charge',
  className
}) => {
  const level = Math.min(Math.max(Math.round(batteryLevel), 0), 100);

  const getStatusColor = (pct: number) => {
    if (pct <= 20) return {
      gradient: 'from-rose-500 to-red-600',
      glow: 'shadow-rose-500/40',
      text: 'text-rose-400',
      border: 'border-rose-500/30'
    };
    if (pct <= 45) return {
      gradient: 'from-amber-400 to-orange-500',
      glow: 'shadow-amber-500/40',
      text: 'text-amber-400',
      border: 'border-amber-500/30'
    };
    return {
      gradient: 'from-emerald-400 to-green-500',
      glow: 'shadow-emerald-500/40',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30'
    };
  };

  const status = getStatusColor(level);

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-hidden shadow-lg transition-all',
        className
      )}
    >
      {/* Background Ambient Glow when Charging */}
      {isCharging && (
        <motion.div
          animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-1 bg-emerald-500/20 blur-2xl pointer-events-none"
        />
      )}

      {/* Top Header: Device Name & Device Icon */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {deviceIcon && (
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
              {deviceIcon}
            </div>
          )}
          <span className="text-xs font-bold text-white tracking-tight truncate">
            {deviceName}
          </span>
        </div>

        {/* Live Status Pill */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md',
            isCharging
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-white/5 border-white/10 text-slate-400'
          )}
        >
          {isCharging ? (
            <>
              <Lightning size={11} weight="fill" className="text-emerald-400 animate-pulse" />
              <span>Charging</span>
            </>
          ) : (
            <span>In Use</span>
          )}
        </div>
      </div>

      {/* Horizontal Battery Shell with Liquid Fill */}
      <div className="relative z-10 py-1">
        <div className="relative w-full h-10 sm:h-12 border-2 border-white/20 rounded-xl p-1 flex items-center bg-black/50 shadow-inner">
          {/* Anode Terminal Cap */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-white/30 rounded-r-sm" />

          {/* Liquid Fill Level */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn(
              'relative h-full rounded-lg bg-gradient-to-r shadow-md flex items-center justify-end overflow-hidden',
              status.gradient,
              status.glow
            )}
          >
            {/* Energy Wave Shimmer when Charging */}
            {isCharging && (
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12"
              />
            )}
          </motion.div>

          {/* Centered Percentage Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {isCharging && (
              <Lightning size={14} weight="fill" className="text-white drop-shadow animate-pulse" />
            )}
            <span className="text-sm sm:text-base font-black tracking-tight text-white drop-shadow font-mono">
              {level}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Time to Full & Estimation Label */}
      <div className="relative z-10 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 text-[10px] uppercase font-semibold">
          {estimateLabel}
        </span>
        <span className="font-mono font-bold text-white">
          {timeToFull || (isCharging ? 'Calculating...' : `${level}% Available`)}
        </span>
      </div>
    </div>
  );
};
