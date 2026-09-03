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
  disabled = false
}: IconPickerFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayIcon = value || defaultValue;
  const isCustomized = Boolean(value && value !== defaultValue);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          {isCustomized && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
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
          onClick={() => setModalOpen(true)}
          className="flex-1 min-w-[200px] p-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-sky-500/50 hover:bg-sky-50/50 dark:hover:bg-white/8 transition-all flex items-center justify-between gap-3 text-left cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `${accentColor}1a`,
                borderColor: `${accentColor}40`,
                color: accentColor
              }}
            >
              <DynamicPhosphorIcon name={displayIcon} size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                {displayIcon}
              </span>
              <span className="text-[11px] text-slate-400 truncate block">
                {isCustomized ? 'Custom Phosphor Icon' : 'Default Icon'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold shrink-0 transition-colors border border-sky-500/20">
            <MagnifyingGlass size={14} weight="bold" />
            <span>Browse (1,500+)</span>
          </div>
        </button>
      </div>

      {/* Optional Quick Presets row */}
      {quickPresets.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
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
                      ? 'bg-sky-500/20 border-sky-500 text-sky-600 dark:text-sky-300 font-bold shadow-2xs'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <DynamicPhosphorIcon name={preset} size={16} weight="duotone" />
                  <span className="text-[11px] font-medium hidden sm:inline">{preset}</span>
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
