/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fan, X, Check, Thermometer, Clock } from '@phosphor-icons/react';

interface ClimateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isActive: boolean;
  targetTemp?: number;
  timeRemaining?: number;
  vehicleName?: string;
  darkMode?: boolean;
}

export function ClimateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isActive,
  targetTemp = 21,
  timeRemaining = 15,
  vehicleName = 'Electric Vehicle',
  darkMode = true
}: ClimateConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-3xl p-6 bg-slate-900/95 border border-white/15 text-white shadow-2xl overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute -top-16 -left-16 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
              isActive ? 'bg-rose-500/20' : 'bg-cyan-500/20'
            }`}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>

          {/* Header Icon */}
          <div className="flex flex-col items-center text-center space-y-2 mt-2">
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg ${
                isActive
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
              }`}
            >
              <Fan size={28} weight="duotone" className={isActive ? 'animate-spin' : ''} />
            </div>

            <h3 className="text-lg font-black tracking-tight text-white">
              {isActive ? 'Stop Preconditioning' : 'Start Preconditioning'}
            </h3>
            <p className="text-xs text-slate-400 max-w-[260px]">
              {isActive
                ? `Vehicle cabin is currently preconditioning. Turn off remote climate for ${vehicleName}?`
                : `Start remote climate to condition the cabin to ${targetTemp}°C for 15 minutes before your drive.`}
            </p>
          </div>

          {/* Parameters Badges */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
              <Thermometer size={18} weight="duotone" className="text-cyan-400" />
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Target</span>
                <span className="text-sm font-bold font-mono text-white">{targetTemp}°C</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
              <Clock size={18} weight="duotone" className="text-amber-400" />
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Duration</span>
                <span className="text-sm font-bold font-mono text-white">15 Minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold transition-all cursor-pointer text-slate-300 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                await onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              <Check size={16} weight="bold" />
              <span>{isActive ? 'Stop Climate' : 'Start Climate'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
