/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, LockOpen, X, ArrowRight, ShieldCheck } from '@phosphor-icons/react';

interface UnlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmUnlock: () => Promise<void>;
  vehicleName?: string;
  darkMode?: boolean;
}

export function UnlockConfirmModal({
  isOpen,
  onClose,
  onConfirmUnlock,
  vehicleName = 'Electric Vehicle',
  darkMode = true
}: UnlockConfirmModalProps) {
  const [sliderPos, setSliderPos] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSliderPos(0);
      setIsUnlocked(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrag = (_: any, info: { point: { x: number; y: number }; offset: { x: number; y: number } }) => {
    if (!trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth - 56; // 56px handle width
    const progress = Math.min(Math.max(info.offset.x, 0), trackWidth);
    setSliderPos(progress);
  };

  const handleDragEnd = async (_: any, info: { offset: { x: number } }) => {
    if (!trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth - 56;
    if (info.offset.x >= trackWidth * 0.8) {
      // Confirmed swipe to unlock
      setIsUnlocked(true);
      setIsSubmitting(true);
      try {
        await onConfirmUnlock();
      } finally {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } else {
      // Snap back to 0
      setSliderPos(0);
    }
  };

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
          {/* Subtle Ambient Red/Amber Glow */}
          <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

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
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock size={28} weight="duotone" />
            </div>

            <h3 className="text-lg font-black tracking-tight text-white">
              Unlock {vehicleName}
            </h3>
            <p className="text-xs text-slate-400 max-w-[240px]">
              Swipe the slider below to disarm perimeter security and unlock all vehicle doors.
            </p>
          </div>

          {/* Swipe to Unlock Slider Track */}
          <div className="mt-7">
            <div
              ref={trackRef}
              className="relative w-full h-14 rounded-2xl bg-slate-950/80 border border-white/15 p-1 flex items-center overflow-hidden shadow-inner select-none"
            >
              {/* Animated shimmer text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-black uppercase tracking-widest text-white/50 pl-6 animate-pulse">
                  {isUnlocked ? 'Vehicle Unlocked' : 'Swipe to Unlock →'}
                </span>
              </div>

              {/* Progress Fill */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/30 to-amber-400/50 rounded-2xl pointer-events-none transition-all"
                style={{ width: `${sliderPos + 48}px` }}
              />

              {/* Draggable Unlock Handle */}
              <motion.div
                drag={isSubmitting ? false : 'x'}
                dragConstraints={trackRef}
                dragElastic={0.05}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={isUnlocked ? { x: 260 } : {}}
                className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-slate-950 cursor-grab active:cursor-grabbing shrink-0"
              >
                {isUnlocked ? (
                  <LockOpen size={20} weight="bold" />
                ) : (
                  <ArrowRight size={20} weight="bold" />
                )}
              </motion.div>
            </div>
          </div>

          {/* Security info */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck size={14} weight="bold" className="text-emerald-400" />
            <span>Encrypted Home Assistant Vehicle Command</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
