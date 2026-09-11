/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldWarning, 
  Lightning, 
  Timer, 
  HourglassMedium, 
  X,
  CaretRight
} from '@phosphor-icons/react';

interface ArmAwayConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (delaySeconds: number) => void;
  alarmName?: string;
  darkMode?: boolean;
}

export default function ArmAwayConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  alarmName = 'Security Guard',
  darkMode = true
}: ArmAwayConfirmModalProps) {
  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`fixed inset-0 backdrop-blur-sm transition-opacity cursor-pointer z-10 ${
              darkMode ? 'bg-black/50' : 'bg-slate-950/20'
            }`}
            aria-hidden="true"
          />

          {/* Centering Wrapper with pointer-events-none so backdrop gets outside clicks */}
          <div className="fixed inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
            {/* Modal Card - pointer-events-auto restores clicks */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden border pointer-events-auto z-30 backdrop-blur-2xl transition-all ${
                darkMode
                  ? 'bg-black/40 border-white/15 text-white shadow-2xl shadow-black/80'
                  : 'bg-white/95 border-slate-200/80 text-slate-900 shadow-2xl'
              }`}
            >
              {/* Subtle Ambient Red Glow */}
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl"
                style={{
                  backgroundImage: 'radial-gradient(circle 180px at 50% 0%, rgba(244, 63, 94, 0.22) 0%, transparent 70%)'
                }}
              />

              {/* Close 'X' button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer pointer-events-auto z-50 ${
                  darkMode 
                    ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Close modal"
              >
                <X size={18} weight="bold" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center space-y-2 mt-1 relative z-20">
                <div className="w-13 h-13 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/15">
                  <ShieldWarning size={28} weight="duotone" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Arm Alarm (Away)
                  </h3>
                  <p className={`text-xs max-w-[260px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    All exterior perimeter sensors and interior motion detectors will be armed on <span className="font-semibold text-rose-500">{alarmName}</span>.
                  </p>
                </div>
              </div>

              {/* Exit Delay Options */}
              <div className="mt-5 space-y-2.5 relative z-20">
                {/* 1. Arm Right Away */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(0);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold transition-all shadow-md shadow-rose-500/25 flex items-center justify-between cursor-pointer pointer-events-auto group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Lightning size={20} weight="fill" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-black tracking-tight">Arm Right Away</div>
                      <div className="text-[10px] text-white/80 font-medium">Instant arming • No exit delay</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0">
                    0s
                  </span>
                </button>

                {/* 2. Delay 30 Seconds */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(30);
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer pointer-events-auto group active:scale-[0.98] backdrop-blur-md shadow-xs ${
                    darkMode
                      ? 'bg-white/10 hover:bg-white/15 active:bg-white/20 border-white/10 hover:border-rose-500/40 text-white'
                      : 'bg-slate-50/80 hover:bg-white active:bg-slate-100 border-slate-200/80 hover:border-rose-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      darkMode ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-600'
                    }`}>
                      <Timer size={20} weight="duotone" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-bold tracking-tight">Delay 30 Seconds</div>
                      <div className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Standard grace period to exit & lock
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      30s
                    </span>
                    <CaretRight size={14} weight="bold" className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 3. Delay 1 Minute */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(60);
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer pointer-events-auto group active:scale-[0.98] backdrop-blur-md shadow-xs ${
                    darkMode
                      ? 'bg-white/10 hover:bg-white/15 active:bg-white/20 border-white/10 hover:border-indigo-500/40 text-white'
                      : 'bg-slate-50/80 hover:bg-white active:bg-slate-100 border-slate-200/80 hover:border-indigo-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      <HourglassMedium size={20} weight="duotone" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-bold tracking-tight">Delay 1 Minute</div>
                      <div className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Extended delay for garage or family exit
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      60s
                    </span>
                    <CaretRight size={14} weight="bold" className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Cancel Button */}
              <div className="mt-4 relative z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-sm shadow-xs ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200/80 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
