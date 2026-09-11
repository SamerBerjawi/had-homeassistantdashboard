/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IconPickerField Component
 * Reusable form control that integrates an icon preview, quick-pick presets,
 * and a trigger for the full Phosphor IconFinderModal.
 */

import React, { useState } from 'react';
import { MagnifyingGlass, Sparkle, ArrowCounterClockwise } from '@phosphor-icons/react';
import DynamicPhosphorIcon from './DynamicPhosphorIcon';
import IconFinderModal from './IconFinderModal';

export interface IconPickerFieldProps {
  label?: string;
  value?: string | null;
  defaultValue?: string;
  onChange: (iconName: string | null) => void;
  accentColor?: string;
  quickPresets?: string[];
  modalTitle?: string;
  modalSubtitle?: string;
  disabled?: boolean;
  onOpenPicker?: () => void;
}

export default function IconPickerField({
  label = 'Icon',
  value,
  defaultValue = 'Sparkle',
  onChange,
  accentColor = '#0ea5e9',
  quickPresets = [],
  modalTitle,
  modalSubtitle,
  disabled = false,
  onOpenPicker
}: IconPickerFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayIcon = value || defaultValue;
  const isCustomized = Boolean(value && value !== defaultValue);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {label}
          </label>
          {isCustomized && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] font-bold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset to default icon"
            >
              <ArrowCounterClockwise size={12} weight="bold" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}

      {/* Main trigger card */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => (onOpenPicker ? onOpenPicker() : setModalOpen(true))}
          className="flex-1 min-w-[200px] p-2.5 rounded-2xl bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 hover:border-sky-500/50 hover:bg-white/60 dark:hover:bg-black/40 backdrop-blur-md transition-all flex items-center justify-between gap-3 text-left cursor-pointer shadow-xs group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0 transition-transform group-hover:scale-105 bg-white/60 dark:bg-white/10 border-white/80 dark:border-white/15 text-slate-900 dark:text-white">
              <DynamicPhosphorIcon name={displayIcon} size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-white truncate block">
                {displayIcon}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold truncate block">
                {isCustomized ? 'Custom Phosphor Icon' : 'Default Icon'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white text-xs font-black shrink-0 transition-colors border border-white/70 dark:border-white/15 shadow-2xs">
            <MagnifyingGlass size={14} weight="bold" />
            <span>Browse (1,500+)</span>
          </div>
        </button>
      </div>

      {/* Optional Quick Presets row */}
      {quickPresets.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-400 block uppercase tracking-wider">
            Quick Suggestions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map(preset => {
              const isSelected = value === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  title={preset}
                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-500 text-sky-800 dark:text-sky-300 font-black shadow-xs ring-2 ring-sky-500/30'
                      : 'bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-black/40 hover:text-slate-950 dark:hover:text-white font-bold shadow-xs'
                  }`}
                >
                  <DynamicPhosphorIcon name={preset} size={16} weight="duotone" />
                  <span className="text-[11px] font-bold hidden sm:inline">{preset}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The Icon Finder Modal */}
      <IconFinderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentIcon={displayIcon}
        onSelectIcon={(newIcon) => onChange(newIcon)}
        title={modalTitle || `Select ${label}`}
        subtitle={modalSubtitle}
        accentColor={accentColor}
      />
    </div>
  );
}
