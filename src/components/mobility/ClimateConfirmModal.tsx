/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Preconditioning confirmation; the dialog shell is the shared ConfirmDialog (UI-012).
 */

import React from 'react';
import { Fan, Check, Thermometer, Clock } from '@phosphor-icons/react';
import ConfirmDialog from '../ui/ConfirmDialog';

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
  vehicleName = 'Electric Vehicle',
  darkMode = true
}: ClimateConfirmModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      darkMode={darkMode}
      tone={isActive ? 'rose' : 'cyan'}
      icon={<Fan size={24} weight="duotone" className={isActive ? 'animate-spin' : ''} />}
      confirmIcon={<Check size={16} weight="bold" />}
      title={isActive ? 'Stop Preconditioning' : 'Start Preconditioning'}
      description={
        isActive
          ? `Vehicle cabin is currently preconditioning. Turn off remote climate for ${vehicleName}?`
          : `Start remote climate to condition the cabin to ${targetTemp}°C for 15 minutes before your drive.`
      }
      confirmLabel={isActive ? 'Stop Climate' : 'Start Climate'}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
          <Thermometer size={18} weight="duotone" className="text-cyan-400" />
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Target</span>
            <span className="text-sm font-bold font-mono">{targetTemp}°C</span>
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
          <Clock size={18} weight="duotone" className="text-amber-400" />
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Duration</span>
            <span className="text-sm font-bold font-mono">15 Minutes</span>
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}
