/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, X, KeyRound, ShieldAlert, Check, Delete } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  mode: 'unlock' | 'set_pin' | 'remove_pin';
  onClose: () => void;
  onUnlock: (pin: string) => boolean;
  onSetPin: (pin: string) => void;
}

export default function PinLockModal({
  isOpen,
  mode,
  onClose,
  onUnlock,
  onSetPin
}: PinLockModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError(false);

      if (next.length === 4) {
        // Auto submit on 4th digit
        if (mode === 'unlock') {
          const success = onUnlock(next);
          if (!success) {
            setError(true);
            setTimeout(() => setPin(''), 600);
          } else {
            setPin('');
          }
        } else if (mode === 'set_pin') {
          onSetPin(next);
          setSuccessMessage('PIN Code Configured');
          setTimeout(() => {
            setPin('');
            setSuccessMessage('');
          }, 800);
        } else if (mode === 'remove_pin') {
          const success = onUnlock(next);
          if (success) {
            onSetPin('');
            setSuccessMessage('PIN Lock Removed');
            setTimeout(() => {
              setPin('');
              setSuccessMessage('');
            }, 800);
          } else {
            setError(true);
            setTimeout(() => setPin(''), 600);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* PIN Card Shell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`relative w-full max-w-sm rounded-3xl overflow-hidden tunet-card-shell bg-slate-900/90 backdrop-blur-2xl border border-white/20 p-6 shadow-2xl text-white z-10 text-center ${
          error ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Top Highlight Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon & Title */}
        <div className="w-14 h-14 rounded-3xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/20">
          {mode === 'unlock' ? <Lock size={26} /> : <KeyRound size={26} />}
        </div>

        <h3 className="text-lg font-black text-white">
          {mode === 'unlock' ? 'Kiosk Mode Locked' : mode === 'set_pin' ? 'Set 4-Digit PIN Lock' : 'Confirm Current PIN'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          {mode === 'unlock' ? 'Enter administrator PIN to enable canvas edit mode' : 'Enter 4 digits for wall display tamper protection'}
        </p>

        {/* 4-Digit Dots Indicator */}
        <div className="flex items-center justify-center gap-3.5 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] scale-110'
                    : isFilled
                    ? 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)] scale-110'
                    : 'bg-white/15 border border-white/20'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Success message */}
        {error && (
          <p className="text-xs font-bold text-rose-400 mb-3 flex items-center justify-center gap-1">
            <ShieldAlert size={14} /> Incorrect PIN Code. Try again.
          </p>
        )}
        {successMessage && (
          <p className="text-xs font-bold text-emerald-400 mb-3 flex items-center justify-center gap-1">
            <Check size={14} /> {successMessage}
          </p>
        )}

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-65 mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/20 active:bg-indigo-600 border border-white/10 text-xl font-bold font-mono text-white transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            Clear
          </button>

          {/* Zero Button */}
          <button
            onClick={() => handleKeyPress('0')}
            className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/20 active:bg-indigo-600 border border-white/10 text-xl font-bold font-mono text-white transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            onClick={handleBackspace}
            className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Backspace"
          >
            <Delete size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
